import axios from 'axios';
import { isCancel, pick, types } from 'react-native-document-picker';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import PdfThumbnail from 'react-native-pdf-thumbnail';

let isPickingActive = false;

const resolveLocalPath = async (uri) => {
  let path = uri.replace(/^file:\/\//, '');

  if (await RNFS.exists(path)) return path;

  path = decodeURI(path);
  if (await RNFS.exists(path)) return path;

  path = decodeURIComponent(path);
  if (await RNFS.exists(path)) return path;

  return path;
};

const pickFile = async () => {
  if (isPickingActive) {
    console.warn('[OCR] Picker bereits aktiv – doppelter Aufruf verhindert.');
    return null;
  }

  isPickingActive = true;
  console.log('[OCR] Dokumenten-Picker wird geöffnet...');

  try {
    const result = await pick({
      type: [types.pdf, types.images],
      copyTo: 'cachesDirectory',
    });

    const selectedFile = result[0];
    console.log('[OCR] Datei ausgewählt:', {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      uri: selectedFile.fileCopyUri || selectedFile.uri,
    });

    return selectedFile;
  } catch (err) {
    if (isCancel(err)) {
      console.log('[OCR] Dokumentenauswahl vom Benutzer abgebrochen.');
      return null;
    }
    console.error('[OCR] Picker Error:', err);
    throw err;
  } finally {
    isPickingActive = false;
  }
};

/**
 * Führt den Scan durch: Rendert bis zu 2 Seiten (PDF) bzw. das Bild & sendet diese per FormData an die API.
 */
export const scanCv = async () => {
  const tempThumbnailPaths = [];
  console.log('[OCR] Scan-Prozess gestartet.');

  try {
    const file = await pickFile();
    if (!file) {
      console.log('[OCR] Kein Dokument ausgewählt – Abbruch.');
      return null;
    }

    const targetImagePaths = [];
    const isPdf =
      file.type === 'application/pdf' ||
      file.name?.toLowerCase().endsWith('.pdf');

    console.log(`[OCR] Dateityp erkannt: ${isPdf ? 'PDF-Dokument' : 'Einzelbild'}`);

    if (isPdf) {
      console.log('[OCR] Rendere PDF Seite 1...');
      const page0 = await PdfThumbnail.generate(file.uri, 0, 100);
      const path0 = await resolveLocalPath(page0.uri);
      targetImagePaths.push(path0);
      tempThumbnailPaths.push(path0);
      console.log('[OCR] Seite 1 erfolgreich gerendert:', path0);

      console.log('[OCR] Prüfe auf Seite 2...');
      try {
        const page1 = await PdfThumbnail.generate(file.uri, 1, 100);
        const path1 = await resolveLocalPath(page1.uri);
        targetImagePaths.push(path1);
        tempThumbnailPaths.push(path1);
        console.log('[OCR] Seite 2 gefunden und erfolgreich gerendert:', path1);
      } catch {
        console.log('[OCR] Keine zweite Seite vorhanden (einseitiges PDF).');
      }
    } else {
      const singleImagePath = await resolveLocalPath(file.fileCopyUri || file.uri);
      targetImagePaths.push(singleImagePath);
      console.log('[OCR] Bildpfad aufgelöst:', singleImagePath);
    }

    const formData = new FormData();

    targetImagePaths.forEach((imagePath, index) => {
      const fileUri =
        Platform.OS === 'android' ? `file://${imagePath}` : imagePath;

      const fileName = `document_page_${index + 1}.jpg`;
      console.log(`[OCR] Hänge Datei ${index + 1} an FormData an (${fileName}):`, fileUri);

      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      });
    });

    const API_URL = 'https://api.jobapp2.de/scan-cv';
    console.log(`[OCR] Sende ${targetImagePaths.length} Bild(er) an API: ${API_URL}`);

    const startTime = Date.now();
    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000,
    });
    const duration = Date.now() - startTime;
    console.log("response", response.data);
    const extractedText = response.data|| '';
response.data.work_experience?.forEach((job, index) => {
  console.log("Tasks:", JSON.stringify(job.tasks, null, 2));
});

console.log("\n=== AUSBILDUNG & DETAILS ===");
response.data.education?.forEach((edu, index) => {
  console.log(`\n[${index + 1}] ${edu.institution} (${edu.period}):`);
  console.log("Details:", JSON.stringify(edu.details, null, 2));
});

console.log("\n=== SKILLS ===");
console.log(JSON.stringify(response.data.skills, null, 2));

console.log("\n=== HOBBIES ===");
console.log(JSON.stringify(response.data.hobbies, null, 2));
    return extractedText;
  } catch (error) {
    console.error('[OCR] Extraction Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  } finally {
    if (tempThumbnailPaths.length > 0) {
      console.log(`[OCR] Lösche ${tempThumbnailPaths.length} temporäre Thumbnail-Datei(en)...`);
      await Promise.all(
        tempThumbnailPaths.map((path) =>
          RNFS.unlink(path)
            .then(() => console.log(`[OCR] Gelöscht: ${path}`))
            .catch((err) => console.warn(`[OCR] Löschen fehlgeschlagen für ${path}:`, err.message))
        )
      );
    }
  }
};