import { EventEmitter, requireNativeModule } from "expo-modules-core";

const Native = requireNativeModule("ExpoMapkit");
const emitter = new EventEmitter(Native);

export function search(query) {
  Native.search(query);
}

export function clearResults() {
  Native.clearResults();
}

export async function fetchPlace(identifier) {
  return await Native.fetchPlace(identifier);
}

export async function searchCompany(query) {
  return await Native.searchCompany(query);
}

export function addSearchListener(cb) {
  return emitter.addListener("onSearchResults", (payload) => {
    cb(payload.results);
  });
}
