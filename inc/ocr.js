import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { initLlama } from 'llama.rn';

const MODEL_URL = 'https://api.jobapp2.de/download?file=ocr.gguf';
const MMPROJ_URL = 'https://api.jobapp2.de/download?file=mmproj.gguf';

const modelPath = `${FileSystem.documentDirectory}ocr.gguf`;
const mmprojPath = `${FileSystem.documentDirectory}mmproj.gguf`;

export function useLocalOvis() {
  const [context, setContext] = useState(null);
  const [status, setStatus] = useState('Prüfe Modelldaten...');
  
  // Separate Progress States
  const [modelProgress, setModelProgress] = useState(0);
  const [mmprojProgress, setMmprojProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [markdownResult, setMarkdownResult] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const setupOvis = useCallback(async () => {
    setIsInitializing(true);
    setContext(null);
    setStatus('Prüfe Modelldaten...');
    setModelProgress(0);
    setMmprojProgress(0);
    setTotalProgress(0);

try {
  const modelInfo = await FileSystem.getInfoAsync(modelPath);
  const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);

  // 1. Sprachmodell herunterladen (70% Gewichtung)
  if (!modelInfo.exists) {
    setStatus('Lade Sprachmodell herunter...');
    
    const downloadModel = FileSystem.createDownloadResumable(
      MODEL_URL, 
      modelPath, 
      {}, 
      (p) => {
        if (p.totalBytesExpectedToWrite > 0) {
          const currentRatio = p.totalBytesWritten / p.totalBytesExpectedToWrite;
          setModelProgress(currentRatio);
          
          const mmprojWeight = mmprojInfo.exists ? 0.3 : 0;
          setTotalProgress(currentRatio * 0.7 + mmprojWeight);
        }
      }
    );
    await downloadModel.downloadAsync();
    setModelProgress(1);
  } else {
    setModelProgress(1);
  }

  // 2. Vision-Projektor herunterladen (30% Gewichtung)
  if (!mmprojInfo.exists) {
    setStatus('Lade Vision-Projektor herunter...');
    
    const downloadMMProj = FileSystem.createDownloadResumable(
      MMPROJ_URL, 
      mmprojPath, 
      {}, 
      (p) => {
        if (p.totalBytesExpectedToWrite > 0) {
          const currentRatio = p.totalBytesWritten / p.totalBytesExpectedToWrite;
          setMmprojProgress(currentRatio);
          setTotalProgress(0.7 + currentRatio * 0.3);
        }
      }
    );
    await downloadMMProj.downloadAsync();
    setMmprojProgress(1);
  } else {
    setMmprojProgress(1);
  }

  setTotalProgress(1);

  // 3. Llama-Kontext initialisieren
  setStatus('Initialisiere lokalen KI-Core...');
  const llamaContext = await initLlama({
    model: modelPath,
    model_mmproj: mmprojPath,
    embedding: true,
    n_threads: 2,
    n_ctx: 1024,
    n_gpu_layers: 99,
  });

  setContext(llamaContext);
  setStatus('Bereit für lokalen Scan');

} catch (error) {
  console.error('Setup Fehler Details:', error);

  // Detaillierte Fehleranalyse
  let userFriendlyError = 'Unbekannter Fehler aufgetreten.';
  
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('Network') || errorMessage.includes('Failed to connect') || errorMessage.includes('fetch')) {
    userFriendlyError = 'Netzwerkfehler: Bitte Internetverbindung prüfen.';
  } else if (errorMessage.includes('space') || errorMessage.includes('ENOSPC')) {
    userFriendlyError = 'Speicherplatz voll: Nicht genug Speicher für die Modelldateien.';
  } else if (errorMessage.includes('llama') || errorMessage.includes('init')) {
    userFriendlyError = `KI-Core Fehler: Modell konnte nicht geladen werden (${errorMessage})`;
  } else {
    // Standard-Fallback mit der echten Meldung
    userFriendlyError = `Fehler: ${errorMessage}`;
  }

  setStatus(userFriendlyError);
} finally {
  setIsInitializing(false);
}
  }, []);

  useEffect(() => {
    setupOvis();
  }, [setupOvis]);

  const scanDocument = async (imageLocalPath) => {
    if (!context) return;
    setLoading(true);
    setMarkdownResult('');

    try {
      const cleanImagePath = imageLocalPath.replace('file://', '');
      const prompt = "<image>\nExtrahiere den Text aus diesem Lebenslauf. Gib das Ergebnis direkt als strukturiertes Markdown aus. Halte dich an die logische Lesereihenfolge.";

      await context.completion(
        {
          prompt: prompt,
          image: cleanImagePath,
          temperature: 0.1,
          n_predict: 768,
        },
        (token) => {
          setMarkdownResult((prev) => prev + token.text);
        }
      );
    } catch (error) {
      console.error('OCR Inferenz Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    context, 
    status, 
    modelProgress,    // Einzelner Progress für Modell (0 - 1)
    mmprojProgress,   // Einzelner Progress für Projektor (0 - 1)
    totalProgress,    // Gesamtfortschritt zusammengerechnet (0 - 1)
    loading, 
    markdownResult, 
    scanDocument,
    isInitializing,
    retrySetup: setupOvis 
  };
}