import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../inc/colors.js'; // Nutze deine bestehenden Farben
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import { sha512 } from 'js-sha512';
const JobCrawlerScreen = () => {
  const webViewRef = useRef(null);
  const [extractedJob, setExtractedJob] = useState('');
  const sendPrompt = async (prompt) => {
     const prompt1 = `Schreibe eine ${
        "Reguläre Bewerbung"
      } Verfasse ein Bewerbungsschreiben für die Position als ${prompt.title}. Ich habe keine Erfahrung.
	•	Keine Firmennamen oder spezifische Unternehmen nennen.
	•	Die Anrede komplett weglassen und direkt mit dem Bewerbungstext beginnen. Keine "Sehr geehrte Damen und Herren"
	•	Der Text darf maximal 400 Wörter umfassen.
	•	Beende das Schreiben mit “Mit freundlichen Grüßen”, aber ohne einen Namen.
      Hier sind noch wichtige informationen aus der Stellenanzeige, die du unbedingt in das Anschreiben einbauen solltest:
    ${prompt.description}
 `;
console.log('Prompt zum Senden:', prompt1);
      try {
   const deviceId = await DeviceInfo.getUniqueId();
        const key = sha512(deviceId);
        const response = await axios.post('https://api.jobapp2.de/getText', {
      prompt1: prompt1,
      key: key,
    }, { timeout: 15000 }); // Timeout hinzufügen!
        const text = response.data.response;
        console.log(text);
} catch (error) {
    
} 
  }

  // Dieses JavaScript wird in der Webseite ausgeführt, wenn wir den Button drücken.
const extractScript = `
(function() {
  try {
    // 1. TITEL-SUCHE (Priorität auf stabilen Daten-Attributen)
    const titleSelectors = [
      '[data-at="header-job-title"]',
      'h1[class*="job-ad-display"]',
      'h1'
    ];

    let jobTitle = 'Unbekannter Job';
    for (let tSel of titleSelectors) {
      let el = document.querySelector(tSel);
      if (el && el.textContent.trim()) {
        jobTitle = el.textContent.trim();
        break;
      }
    }

    // 2. BESCHREIBUNG-SUCHE
    // Wir suchen nach dem Attribut "section-text-description-content"
    // oder nach Klassen, die mit "job-ad-display" beginnen.
    const descSelectors = [
      '[data-at="section-text-description-content"]',
      '[class*="job-ad-display-"][class*="description"]',
      '#jobDescriptionText',
      '.listingContentBrandingColor' // Speziell für Stepstone
    ];

    let jobContainer = null;
    for (let selector of descSelectors) {
      jobContainer = document.querySelector(selector);
      if (jobContainer && jobContainer.textContent.trim().length > 30) {
        break; 
      }
    }

    // 3. DATEN EXTRAHIEREN
    if (jobContainer) {
      let extractedLists = [];
      // Wir suchen alle Listen im Container
      jobContainer.querySelectorAll('ul').forEach(ul => {
        let items = Array.from(ul.querySelectorAll('li'))
                         .map(li => li.textContent.replace(/\\s+/g, ' ').trim())
                         .filter(text => text.length > 0);
        if (items.length > 0) extractedLists.push(items);
      });

      // Text-Reinigung für das Anschreiben
      let cleanText = jobContainer.innerText || jobContainer.textContent;
      cleanText = cleanText.replace(/\\n{3,}/g, "\\n\\n").trim();

      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: 'success',
        title: jobTitle,
        description: cleanText,
        lists: extractedLists
      }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: 'error',
        message: 'Konnte die Stellenbeschreibung nicht finden.'
      }));
    }
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      status: 'error',
      message: 'JS Fehler: ' + e.toString()
    }));
  }
})();
true;
`;

  // Diese Funktion wird aufgerufen, wenn der Button in der App gedrückt wird
  const handleExtractPress = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(extractScript);
    }
  };

  // Diese Funktion empfängt die Daten aus der Webseite
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        setExtractedJob(data.description);
        Alert.alert(
          "Erfolg!", 
          `Job "${data.title}" wurde erfolgreich übernommen.`
        );
        console.log('Extrahierter Job:', data.description);
        // Hier könntest du die Daten nun im EncryptedStorage speichern
        // oder den Nutzer zurück zum ChangeScreen navigieren
            sendPrompt({ title: data.title, description: data.description }); // Prompt senden
            console.log('Prompt gesendet:', { title: data.title, description: data.description });
      } else {
        Alert.alert("Hinweis", data.message);
      }
    } catch (e) {
      console.error('Fehler beim Parsen der WebView-Nachricht:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Der In-App Browser */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.stepstone.de/stellenangebote--Kfz-Mechatroniker-Kfz-Monteur-w-m-d-Fahrzeugglas-in-Braunschweig-auch-als-Quereinstieg-554-DE-Germany-Braunschweig-Carglass-GmbH--13869335-inline.html?rltr=1_1_25_seorl_m_0_0_0_0_0_0' }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled={true}
        // User-Agent anpassen macht es noch unauffälliger für Bot-Blocker
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      />

      {/* Die App-Steuerung am unteren Rand */}
      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={handleExtractPress}>
          <Text style={styles.buttonText}>Daten für Anschreiben übernehmen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  footer: {
    padding: 15,
    backgroundColor: colors.background || '#1e1e1e', // Fallback-Farbe
    borderTopWidth: 1,
    borderColor: 'gray',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default JobCrawlerScreen;