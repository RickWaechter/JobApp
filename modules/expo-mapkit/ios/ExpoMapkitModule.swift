import ExpoModulesCore
import MapKit
import CoreLocation
import Combine

public class ExpoMapkitModule: Module {
  private let service = LocationSearchService()
  private var cancellable: AnyCancellable?

  public func definition() -> ModuleDefinition {
    Name("ExpoMapkit")

    Events("onSearchResults", "onSearchError")

    // Listener registrieren
    OnStartObserving {
      self.cancellable = self.service.$searchResults
        .dropFirst()
        .receive(on: DispatchQueue.main)
        .sink { results in
          let payload = results.map { c in
            [
              "identifier": "\(c.title)|\(c.subtitle)",
              "title": c.title,
              "subtitle": c.subtitle
            ]
          }

          self.sendEvent("onSearchResults", ["results": payload])
        }
    }

    OnStopObserving {
      self.cancellable?.cancel()
      self.cancellable = nil
    }

    // ✅ Autocomplete (viele Treffer)
    Function("search") { (query: String) in
      let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)

      if trimmed.isEmpty {
        self.service.clearResults()
        self.sendEvent("onSearchResults", ["results": []])
        return
      }

      self.service.updateSearch(query: trimmed)
    }

    Function("clearResults") {
      self.service.clearResults()
      self.sendEvent("onSearchResults", ["results": []])
    }

    // ✅ Detaildaten zu einem suggestions-Eintrag
    AsyncFunction("fetchPlace") { (identifier: String) -> [String: Any]? in
      return try await self.fetchPlaceDetails(identifier: identifier)
    }

    // ✅ Standard MKLocalSearch (max. 10 Treffer)
    AsyncFunction("searchCompany") { (query: String) -> [[String: String]] in
      var results: [[String: String]] = []

      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query

      let manager = CLLocationManager()
      manager.requestWhenInUseAuthorization()

      if let loc = manager.location?.coordinate {
        request.region = MKCoordinateRegion(
          center: loc,
          span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
      }

      let search = MKLocalSearch(request: request)

      return try await withCheckedThrowingContinuation { continuation in
        search.start { response, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          guard let response = response else {
            continuation.resume(returning: [])
            return
          }

          for (index, item) in response.mapItems.prefix(10).enumerated() {
            let p = item.placemark

            let title = item.name ?? ""
            let subtitle = [
              p.thoroughfare ?? "",
              p.subThoroughfare ?? "",
              p.locality ?? ""
            ]
            .filter { !$0.isEmpty }
            .joined(separator: " ")

            let entry: [String: String] = [
              "identifier": "\(p.coordinate.latitude)_\(p.coordinate.longitude)_\(index)",
              "title": title,
              "subtitle": subtitle,
              "name": item.name ?? "",
              "street": p.thoroughfare ?? "",
              "houseNumber": p.subThoroughfare ?? "",
              "postalCode": p.postalCode ?? "",
              "city": p.locality ?? "",
              "country": p.country ?? ""
            ]

            results.append(entry)
          }

          continuation.resume(returning: results)
        }
      }
    }
  }
}


// MARK: - Detail-Helfer
extension ExpoMapkitModule {
  private func fetchPlaceDetails(identifier: String) async throws -> [String: Any]? {
    let parts = identifier.components(separatedBy: "|")
    guard parts.count == 2 else {
      throw NSError(
        domain: "ExpoMapkit",
        code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Invalid identifier"]
      )
    }

    guard let completion = service.searchResults.first(where: {
      "\($0.title)|\($0.subtitle)" == identifier
    }) else {
      throw NSError(
        domain: "ExpoMapkit",
        code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Completion not found"]
      )
    }

    return try await withCheckedThrowingContinuation { cont in
      let request = MKLocalSearch.Request(completion: completion)
      request.resultTypes = [.address, .pointOfInterest]

      let search = MKLocalSearch(request: request)

      search.start { response, error in
        if let error = error {
          cont.resume(throwing: error)
          return
        }

        guard let mapItem = response?.mapItems.first else {
          cont.resume(returning: nil)
          return
        }

        cont.resume(returning: self.makeDetailsDict(from: mapItem))
      }
    }
  }

  private func makeDetailsDict(from mapItem: MKMapItem) -> [String: Any] {
    let p = mapItem.placemark
    let coordinate = p.coordinate

    var components: [String] = []

    if let name = p.name { components.append(name) }

    if let t = p.thoroughfare {
      if let n = p.subThoroughfare {
        components.append("\(n) \(t)")
      } else {
        components.append(t)
      }
    }

    if let zip = p.postalCode, let city = p.locality {
      components.append("\(zip) \(city)")
    }

    if let admin = p.administrativeArea { components.append(admin) }
    if let country = p.country { components.append(country) }

    var result: [String: Any] = [
      "name": p.name ?? "Unknown",
      "address": components.joined(separator: ", "),
      "coordinates": [
        "latitude": coordinate.latitude,
        "longitude": coordinate.longitude
      ]
    ]

    if let phone = mapItem.phoneNumber {
      result["phoneNumber"] = phone
    }
    if let url = mapItem.url?.absoluteString {
      result["url"] = url
    }

    return result
  }
}



// MARK: - LocationSearchService (Autocomplete)
final class LocationSearchService: NSObject, ObservableObject {
  @Published var searchResults: [MKLocalSearchCompletion] = []
  private let completer = MKLocalSearchCompleter()
  private let querySubject = PassthroughSubject<String, Never>()
  private var cancellables = Set<AnyCancellable>()

  override init() {
    super.init()
    setupCompleter()

    querySubject
      .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
      .removeDuplicates()
      .sink { [weak self] q in
        self?.completer.queryFragment = q
      }
      .store(in: &cancellables)
  }

  private func setupCompleter() {
    completer.delegate = self
    completer.resultTypes = [.address, .pointOfInterest]
    completer.filterType = .locationsOnly
  }

  func updateSearch(query: String) {
    querySubject.send(query)
  }

  func clearResults() {
    DispatchQueue.main.async {
      self.searchResults = []
      self.completer.queryFragment = ""
    }
  }
}


// MARK: - MKLocalSearchCompleterDelegate
extension LocationSearchService: MKLocalSearchCompleterDelegate {
  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    let filtered = completer.results.filter {
      $0.subtitle.localizedCaseInsensitiveContains("Deutschland") ||
      $0.subtitle.localizedCaseInsensitiveContains("Germany")
    }

    DispatchQueue.main.async {
      self.searchResults = filtered
    }
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    DispatchQueue.main.async {
      self.searchResults = []
    }
  }
}
