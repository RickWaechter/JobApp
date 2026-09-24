import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Alert,
  View 
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import PdfThumbnail from 'react-native-pdf-thumbnail';

/**
 * Komponente für Dokumentenauswahl (PDF/Bild), PDF-Umwandlung und lokales OvisOCR2-Scanning.
 */
export default function DocumentPickerButton({ 
  llamaContext, 
  onScanComplete, 
  onStreamToken,
  disabled = false 
}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'converting' | 'scanning'

  const handleProcessDocument = async () => {
    if (!llamaContext) {
      Alert.alert('Modell nicht bereit', 'Das lokale OvisOCR2-Modell wird noch geladen...');
      return;
    }

    try {
      // 1. Datei über den nativen Dateimanager auswählen (PDF oder Bild)
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const file = result.assets[0];
      let imageUriToProcess = file.uri;

      // 2. Falls es eine PDF ist, Seite 1 in ein PNG umwandeln
      if (file.mimeType === 'application/pdf' || file.name?.endsWith('.pdf')) {
        setStatus('converting');
        const thumbnailResult = await PdfThumbnail.generate(file.uri, 0);
        imageUriToProcess = thumbnailResult.uri;
      }

      // 3. Lokale OvisOCR2-Inferenz via llama.rn starten
      setStatus('scanning');
      
      // Zurücksetzen des alten Textes in der UI
      if (onStreamToken) onStreamToken('');

      // WICHTIG: 'file://'-Präfix bereinigen, damit llama.cpp unter Android/iOS nicht abstürzt
      const cleanImagePath = imageUriToProcess.replace('file://', '');

      const prompt = "<image>\nExtrahiere den Text aus diesem Lebenslauf. Gib das Ergebnis direkt als strukturiertes Markdown aus. Halte dich an die logische Lesereihenfolge.";

      let fullMarkdown = '';

      await llamaContext.completion(
        {
          prompt: prompt,
          image: cleanImagePath,
          temperature: 0.1, // Niedrige Temperatur für exakte Fakten
          n_predict: 1024,   // Maximale Länge der Ausgabe
        },
        (token) => {
          fullMarkdown += token.text;
          if (onStreamToken) {
            onStreamToken(token.text); // Live-Updates an App.js senden
          }
        }
      );

      if (onScanComplete) {
        onScanComplete(fullMarkdown);
      }

    } catch (error) {
      console.error('Fehler beim OCR-Prozess:', error);
      Alert.alert('Fehler', 'Das Dokument konnte nicht verarbeitet werden.');
    } finally {
      setStatus('idle');
    }
  };

  const isProcessing = status !== 'idle';

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || isProcessing) && styles.disabledButton]}
      onPress={handleProcessDocument}
      disabled={disabled || isProcessing}
      activeOpacity={0.8}
    >
      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.buttonText}>
            {status === 'converting' ? ' Wandle PDF um...' : ' KI analysiert Dokument...'}
          </Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>Lebenslauf wählen & scannen</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#A2A2A7',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});