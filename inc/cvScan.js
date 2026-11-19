import axios from 'axios';
import { Platform, Alert } from 'react-native';
import { isCancel, pick, types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import SQLite from 'react-native-sqlite-storage';
import { decryp, encryp } from '../inc/cryp.js';
import { sanitizeFileName } from './string.js';

const DB_MAIN_NAME = 'firstNew.db';
const PENDING_JOB_KEY = 'pending_cv_job_id';
const SCAN_API_URL = 'https://api.jobapp2.de/scan-cv';
const STATUS_API_URL = 'https://api.jobapp2.de/scan-cv-status';

let isPickingActive = false;

// Getrennte Poller-States pro "where"-Key ('profil', 'cover', etc.)
const pollersByWhere = new Map();

// In-Memory-Spiegel + FIFO-Queue zur Serialisierung aller EncryptedStorage-Zugriffe
const activeJobsMemory = new Map();
let storageQueue = Promise.resolve();

const getPollerState = (where = PENDING_JOB_KEY) => {
  if (!pollersByWhere.has(where)) {
    pollersByWhere.set(where, {
      timer: null,
      inFlight: false,
      generation: 0,
    });
  }
  return pollersByWhere.get(where);
};

const enqueueStorageOp = (operation) => {
  const next = storageQueue.then(() => operation());
  // Queue-Kette bei Einzelfehlern intakt halten
  storageQueue = next.catch(() => {});
  return next;
};

const safeStorageGet = (key) => {
  if (!key) return Promise.resolve(null);
  return enqueueStorageOp(async () => {
    try {
      return await EncryptedStorage.getItem(key);
    } catch (e) {
      console.warn(`[OCR:Storage] getItem("${key}") Fehler:`, e?.message || e);
      return null;
    }
  });
};

const safeStorageSet = (key, value) => {
  if (!key) return Promise.resolve();
  activeJobsMemory.set(key, value);
  return enqueueStorageOp(async () => {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[OCR:Storage] setItem("${key}") Fehler:`, e?.message || e);
    }
  });
};

const safeStorageRemove = (key) => {
  if (!key) return Promise.resolve();
  activeJobsMemory.delete(key);
  return enqueueStorageOp(async () => {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (e) {
      // Ignorieren, falls Key nativ bereits entfernt wurde
    }
  });
};

const clearPollInterval = (where = PENDING_JOB_KEY) => {
  const state = getPollerState(where);
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
};

const resolveLocalPath = async (uri) => {
  console.log('[OCR:resolveLocalPath] Start mit URI:', uri);
  let path = uri.replace(/^file:\/\//, '');
  if (await RNFS.exists(path)) {
    console.log('[OCR:resolveLocalPath] Pfad gefunden (direkt):', path);
    return path;
  }

  path = decodeURI(path);
  if (await RNFS.exists(path)) {
    console.log('[OCR:resolveLocalPath] Pfad gefunden (decodeURI):', path);
    return path;
  }

  path = decodeURIComponent(path);
  if (await RNFS.exists(path)) {
    console.log('[OCR:resolveLocalPath] Pfad gefunden (decodeURIComponent):', path);
    return path;
  }

  console.warn('[OCR:resolveLocalPath] Datei existiert unter keinem geprüften Pfad, gebe zurück:', path);
  return path;
};

const pickFile = async () => {
  console.log('[OCR:pickFile] Aufgerufen | isPickingActive:', isPickingActive);
  if (isPickingActive) {
    console.log('[OCR:pickFile] Abbruch, Picker bereits aktiv');
    return null;
  }
  isPickingActive = true;

  try {
    console.log('[OCR:pickFile] Öffne DocumentPicker...');
    const result = await pick({
      type: [types.pdf, types.images],
      copyTo: 'cachesDirectory',
    });

    if (!result || !result[0]) {
      console.log('[OCR:pickFile] Kein Ergebnis vom Picker erhalten');
      return null;
    }

    let selectedFile = { ...result[0] };
    console.log('[OCR:pickFile] Original-Datei ausgewählt:', selectedFile);

    const rawUri = selectedFile.fileCopyUri || selectedFile.uri || '';
    const uriParts = rawUri.split('/');
    const lastSegment = uriParts.pop() || selectedFile.name || 'document.pdf';

    const cleanFileName = sanitizeFileName(lastSegment);
    const cleanUri = [...uriParts, cleanFileName].join('/');

    console.log('[OCR:pickFile] Bereinigter Dateiname:', {
      alt: lastSegment,
      neu: cleanFileName,
      cleanUri,
    });

    const oldLocalPath = await resolveLocalPath(rawUri);
    const newLocalPath = cleanUri.replace(/^file:\/\//, '');

    if (oldLocalPath !== newLocalPath && (await RNFS.exists(oldLocalPath))) {
      await RNFS.moveFile(oldLocalPath, newLocalPath);
      console.log('[OCR:pickFile] Datei im Cache umbenannt nach:', newLocalPath);
    }

    selectedFile.name = cleanFileName;
    selectedFile.fileUri = cleanUri;
    if (selectedFile.fileCopyUri) {
      selectedFile.fileCopyUri = cleanUri;
    } else {
      selectedFile.uri = cleanUri;
    }

    console.log('[OCR:pickFile] Rückgabe-Objekt (bereinigt):', selectedFile);
    return selectedFile;
  } catch (err) {
    if (isCancel(err)) {
      console.log('[OCR:pickFile] Auswahl vom Nutzer abgebrochen');
      return null;
    }
    console.error('[OCR:pickFile] Fehler beim Auswählen:', err);
    throw err;
  } finally {
    isPickingActive = false;
    console.log('[OCR:pickFile] Beendet | isPickingActive zurückgesetzt auf false');
  }
};

/**
 * Mappt und setzt alle Daten aus dem OCR-Response direkt in die Screens-States
 */
export const applyAllScannedData = async ({
  data,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
}) => {
  console.log('[OCR:applyAllScannedData] Start | Rohdaten:', data);
  if (!data) {
    console.warn('[OCR:applyAllScannedData] Keine Daten vorhanden (data ist null/undefined)');
    return;
  }

  // 1. Berufserfahrung (work_experience) -> experiences
  if (Array.isArray(data.work_experience) && setExperiences) {
    const formattedExp = data.work_experience.map((exp, index) => {
      let desc = '';

      const formatTaskLine = (line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed) return '';
        return trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
      };

      if (Array.isArray(exp.tasks)) {
        desc = exp.tasks
          .map((item) => {
            const str =
              typeof item === 'object' && item !== null
                ? item.task || item.description || item.text || Object.values(item).join(' ')
                : item;
            return formatTaskLine(str);
          })
          .filter(Boolean)
          .join('\n');
      } else if (typeof exp.tasks === 'string') {
        desc = exp.tasks
          .split('\n')
          .map(formatTaskLine)
          .filter(Boolean)
          .join('\n');
      }

      return {
        id: `${Date.now()}_exp_${index}_${Math.random().toString(36).substr(2, 4)}`,
        role: exp.position || '',
        company: exp.company || exp.institution || '',
        period: exp.period || exp.dates || '',
        description: desc || '',
        tasks: desc || '',
      };
    });

    if (formattedExp.length > 0) {
      setExperiences(formattedExp);
    }

    // Über safeStorageGet serialisiert, damit kein paralleler Keychain-Zugriff entsteht
    (async () => {
      try {
        const key = await safeStorageGet('key');
        const deviceId = await DeviceInfo.getUniqueId();
        if (!key || !deviceId) return;

        const db =
          dbInstance ||
          (await SQLite.openDatabase({ name: DB_MAIN_NAME, location: 'default' }));

        const encString = await encryp(JSON.stringify(formattedExp), key);
        await db.executeSql(
          'UPDATE files SET skills = ? WHERE ident = ?',
          [encString, deviceId]
        );
        console.log('[OCR:applyAllScannedData:SQLite] UPDATE erfolgreich abgeschlossen');
      } catch (e) {
        console.log('[OCR:applyAllScannedData:SQLite] Übersprungen/Fehler:', e?.message || e);
      }
    })();
  }

  // 2. Ausbildung (education) -> educations
  if (Array.isArray(data.education) && setEducations) {
    const formattedEdu = data.education.map((edu, index) => {
      let degreeTitle = edu.institution || 'Abschluss';
      if (Array.isArray(edu.details) && edu.details.length > 0) {
        degreeTitle = edu.details.join(', ');
      }

      return {
        id: `${Date.now()}_edu_${index}_${Math.random().toString(36).substr(2, 4)}`,
        degree: degreeTitle,
        school: edu.institution || '',
        period: edu.period || edu.dates || '',
      };
    });

    if (formattedEdu.length > 0) {
      setEducations(formattedEdu);
    }
  }

  // 3. Fähigkeiten (skills) -> skills String
  if (setSkills) {
    let skillList = [];
    if (Array.isArray(data.skills)) skillList = data.skills;
    if (Array.isArray(data.hobbies)) skillList = [...skillList, ...data.hobbies];

    if (skillList.length > 0) {
      setSkills(skillList.join(', '));
    }
  }

  // 4. Persönliche Daten (personal_info) -> personal
  if (data.personal_info && setPersonal) {
    setPersonal((prev) => ({
      ...prev,
      name: data.personal_info.name || prev.name,
      email: data.personal_info.email || prev.email,
      phone: data.personal_info.phone || prev.phone,
      location: data.personal_info.address || prev.location,
      title: data.work_experience?.[0]?.position || prev.title || 'Fachkraft',
    }));
  }

  console.log('[OCR:applyAllScannedData] Komplett abgeschlossen');
};

export const scanCv = async () => {
  console.log('[OCR:scanCv] Start');
  const tempThumbnailPaths = [];
  try {
    const file = await pickFile();
    if (!file) return null;

    const targetImagePaths = [];
    const isPdf =
      file.type === 'application/pdf' ||
      file.name?.toLowerCase().endsWith('.pdf');

    const fileUri = file.fileCopyUri || file.uri;

    if (isPdf) {
      const page0 = await PdfThumbnail.generate(fileUri, 0, 100);
      const path0 = await resolveLocalPath(page0.uri);
      targetImagePaths.push(path0);
      tempThumbnailPaths.push(path0);

      try {
        const page1 = await PdfThumbnail.generate(fileUri, 1, 100);
        const path1 = await resolveLocalPath(page1.uri);
        targetImagePaths.push(path1);
        tempThumbnailPaths.push(path1);
      } catch (pdfErr) {
        console.log('[OCR:scanCv] Keine 2. Seite vorhanden:', pdfErr?.message);
      }
    } else {
      const singlePath = await resolveLocalPath(fileUri);
      targetImagePaths.push(singlePath);
    }

    const formData = new FormData();
    targetImagePaths.forEach((imagePath, index) => {
      const uri = Platform.OS === 'android' ? `file://${imagePath}` : imagePath;
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `document_page_${index + 1}.jpg`,
      });
    });

    const response = await axios.post(SCAN_API_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });

    return response.data || null;
  } catch (error) {
    console.error('[OCR:scanCv] Scan Error:', error.message, error.response?.data);
    throw error;
  } finally {
    if (tempThumbnailPaths.length > 0) {
      await Promise.all(
        tempThumbnailPaths.map((p) => RNFS.unlink(p).catch(() => {}))
      );
    }
  }
};

export const stopCvPolling = async (where = PENDING_JOB_KEY) => {
  console.log('[OCR:stopCvPolling] Stoppe Polling für Key:', where);
  const state = getPollerState(where);
  state.generation += 1;
  state.inFlight = false;
  clearPollInterval(where);
  await safeStorageRemove(where);
};

export const pollCvStatus = async ({
  where = PENDING_JOB_KEY,
  jobId,
  generation,
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  skipDefaultApply = false,
  t = (k) => k,
}) => {
  if (!jobId) return;

  const state = getPollerState(where);
  const activeGen = generation ?? state.generation;

  // Verhindert überlappende Requests für DIESEN where-Key
  if (state.inFlight) {
    console.log(`[OCR:pollCvStatus:${where}] Vorheriger Request läuft noch -> Tick übersprungen`);
    return;
  }

  state.inFlight = true;
  try {
    const url = `${STATUS_API_URL}?jobId=${encodeURIComponent(jobId)}`;
    const res = await axios.get(url);

    // Falls zwischenzeitlich gestoppt oder ein neuer Scan gestartet wurde: Antwort verwerfen
    if (activeGen !== state.generation) {
      console.log(`[OCR:pollCvStatus:${where}] Veraltete Generation -> Antwort verworfen`);
      return;
    }

    const { status, data, error } = res.data || {};
    console.log(`[OCR:pollCvStatus:${where}] Antwort:`, { jobId, status, hasData: Boolean(data), error });

    if (status === 'done') {
      await stopCvPolling(where);
      setIsScanningCv?.(false);

      if (!skipDefaultApply) {
        await applyAllScannedData({
          data,
          setExperiences,
          setEducations,
          setSkills,
          setPersonal,
          dbInstance,
        });
      }

      onSuccess?.(data);

      if (!skipDefaultApply) {
        Alert.alert(t('profil.title') || 'Erfolg', 'Lebenslauf wurde vollständig importiert!');
      }
    } else if (status === 'error' || status === 'not_found') {
      await stopCvPolling(where);
      setIsScanningCv?.(false);
      Alert.alert(t('profil.error') || 'Fehler', error || 'Scan fehlgeschlagen.');
    }
  } catch (err) {
    if (activeGen !== state.generation) return;
    console.error(`[OCR:pollCvStatus:${where}] Request-Fehler:`, err?.message, err?.response?.status);
    if (err?.response?.status === 404) {
      await stopCvPolling(where);
      setIsScanningCv?.(false);
    }
  } finally {
    state.inFlight = false;
  }
};

export const resumePollingIfNeeded = async ({
  where = PENDING_JOB_KEY,
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  skipDefaultApply = false,
  t,
}) => {
  // Laufenden Timer nur für DIESEN where-Key anhalten, OHNE den Key aus dem Storage zu löschen
  clearPollInterval(where);
  const state = getPollerState(where);
  const currentGeneration = ++state.generation;
  state.inFlight = false;

  // Erst In-Memory prüfen (vermeidet Race direkt nach safeStorageSet), sonst Storage
  const savedJobId = activeJobsMemory.get(where) || (await safeStorageGet(where));

  // Falls während des Async-Reads ein neuer Lauf für diesen Key gestartet wurde
  if (currentGeneration !== state.generation) return;

  if (!savedJobId) {
    console.log(`[OCR:resumePollingIfNeeded:${where}] Kein offener Job vorhanden`);
    setIsScanningCv?.(false);
    return;
  }

  activeJobsMemory.set(where, savedJobId);
  setIsScanningCv?.(true);

  await pollCvStatus({
    where,
    jobId: savedJobId,
    generation: currentGeneration,
    setIsScanningCv,
    setExperiences,
    setEducations,
    setSkills,
    setPersonal,
    dbInstance,
    onSuccess,
    skipDefaultApply,
    t,
  });

  // Wenn der Job beim ersten Check bereits fertig war, wurde state.generation erhöht -> keinen Timer mehr starten
  if (currentGeneration !== state.generation) return;

  console.log(`[OCR:resumePollingIfNeeded:${where}] Starte 3-Sekunden-Intervall für jobId:`, savedJobId);
  state.timer = setInterval(() => {
    pollCvStatus({
      where,
      jobId: savedJobId,
      generation: currentGeneration,
      setIsScanningCv,
      setExperiences,
      setEducations,
      setSkills,
      setPersonal,
      dbInstance,
      onSuccess,
      skipDefaultApply,
      t,
    });
  }, 3000);
};

export const startCvScan = async ({
  where = PENDING_JOB_KEY,
  isScanningCv,
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  skipDefaultApply = false,
  t,
}) => {
  if (isScanningCv) {
    console.log(`[OCR:startCvScan:${where}] Scan läuft bereits -> Abbruch`);
    return;
  }

  try {
    const file = await pickFile();
    if (!file) return;

    setIsScanningCv?.(true);

    const tempThumbnailPaths = [];
    let response = null;

    try {
      const targetImagePaths = [];
      const isPdf =
        file.type === 'application/pdf' ||
        file.name?.toLowerCase().endsWith('.pdf');

      const fileUri = file.fileCopyUri || file.uri;

      if (isPdf) {
        const page0 = await PdfThumbnail.generate(fileUri, 0, 100);
        const path0 = await resolveLocalPath(page0.uri);
        targetImagePaths.push(path0);
        tempThumbnailPaths.push(path0);

        try {
          const page1 = await PdfThumbnail.generate(fileUri, 1, 100);
          const path1 = await resolveLocalPath(page1.uri);
          targetImagePaths.push(path1);
          tempThumbnailPaths.push(path1);
        } catch (pdfErr) {
          console.log('[OCR:startCvScan] Einseitiges PDF:', pdfErr?.message);
        }
      } else {
        const singlePath = await resolveLocalPath(fileUri);
        targetImagePaths.push(singlePath);
      }

      const formData = new FormData();
      targetImagePaths.forEach((imagePath, index) => {
        const uri = Platform.OS === 'android' ? `file://${imagePath}` : imagePath;
        formData.append('file', {
          uri,
          type: 'image/jpeg',
          name: `document_page_${index + 1}.jpg`,
        });
      });

      const res = await axios.post(SCAN_API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      response = res.data || null;
    } finally {
      if (tempThumbnailPaths.length > 0) {
        await Promise.all(
          tempThumbnailPaths.map((p) => RNFS.unlink(p).catch(() => {}))
        );
      }
    }

    if (!response) {
      setIsScanningCv?.(false);
      return;
    }

    // Fall A: Asynchroner Hintergrund-Job mit Polling
    if (response.jobId) {
      console.log(`[OCR:startCvScan:${where}] Fall A (Asynchron): jobId erhalten:`, response.jobId);
      await safeStorageSet(where, String(response.jobId));
      await resumePollingIfNeeded({
        where,
        setIsScanningCv,
        setExperiences,
        setEducations,
        setSkills,
        setPersonal,
        dbInstance,
        onSuccess,
        skipDefaultApply,
        t,
      });
      return;
    }

    // Fall B: Synchrone Antwort der OCR API
    if (!skipDefaultApply) {
      await applyAllScannedData({
        data: response,
        setExperiences,
        setEducations,
        setSkills,
        setPersonal,
        dbInstance,
      });
    }

    setIsScanningCv?.(false);
    onSuccess?.(response);

    if (!skipDefaultApply) {
      Alert.alert('Erfolg', 'Lebenslauf wurde vollständig importiert!');
    }
  } catch (error) {
    console.error(`[OCR:startCvScan:${where}] Scan Start fehlgeschlagen:`, error?.message, error?.response?.data || error);
    setIsScanningCv?.(false);
    Alert.alert('Fehler', 'Scan konnte nicht gestartet werden.');
  }
};