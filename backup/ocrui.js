import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import Marked from 'react-native-marked';
import RamMonitor from '../../inc/raminfo'; 
import { useLocalOvis } from '../../inc/ocr'; 
import DocumentPickerButton from '../../inc/documentPicker';

export default function App() {
  // 1. Die neuen Progress-Variablen aus dem Hook holen
  const { 
    context, 
    status, 
    totalProgress, 
    modelProgress, 
    mmprojProgress, 
    isInitializing, 
    retrySetup 
  } = useLocalOvis();

  const [markdownText, setMarkdownText] = useState('');

  const handleStreamToken = (tokenText) => {
    setMarkdownText((prev) => prev + tokenText);
  };

  const isModelReady = Boolean(context);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* RAM Monitor oben einblenden */}
        <RamMonitor />

        {/* Status-Karte */}
        <View style={styles.card}>
          <Text style={styles.title}>GOT-OCR 2.0 Local Scanner</Text>
          <Text style={styles.statusText}>Status: {status}</Text>
          
          {/* 2. Anzeige des Gesamtforschritts */}
          {totalProgress > 0 && totalProgress < 1 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Gesamt: {(totalProgress * 100).toFixed(0)}%
              </Text>
              
              {/* Optional: Detaillierte Aufschlüsselung */}
              <Text style={styles.subProgressText}>
                Modell: {(modelProgress * 100).toFixed(0)}% | Projektor: {(mmprojProgress * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {/* Retry-Button: Wird angezeigt wenn Modell nicht bereit & nicht am Laden */}
          {!isModelReady && !isInitializing && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={retrySetup}
            >
              <Text style={styles.retryButtonText}>Modell neu laden (Retry)</Text>
            </TouchableOpacity>
          )}

          {isInitializing && (
            <ActivityIndicator style={{ marginTop: 10 }} size="small" color="#007AFF" />
          )}
        </View>

        {/* OCR Button Komponente */}
        <DocumentPickerButton
          llamaContext={context}
          disabled={!isModelReady}
          onStreamToken={handleStreamToken}
        />

        {/* Ausgabebereich */}
        <View style={styles.resultCard}>
          <ScrollView style={styles.scrollArea}>
            {markdownText ? (
              <Marked value={markdownText} />
            ) : (
              <Text style={styles.placeholderText}>
                {isModelReady 
                  ? 'Dokument auswählen, um lokalen OCR-Scan zu starten.' 
                  : 'Warte auf Initialisierung des KI-Modells...'}
              </Text>
            )}
          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F7' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, marginTop: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1D1D1F' },
  statusText: { fontSize: 14, color: '#86868B', marginTop: 6 },
  progressContainer: { marginTop: 8 },
  progressText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  subProgressText: { fontSize: 11, color: '#86868B', marginTop: 2 },
  retryButton: { 
    marginTop: 12, 
    backgroundColor: '#FF3B30', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    alignSelf: 'flex-start' 
  },
  retryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  resultCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20 },
  scrollArea: { flex: 1 },
  placeholderText: { color: '#A2A2A7', textAlign: 'center', marginTop: 40, fontSize: 14 }
});