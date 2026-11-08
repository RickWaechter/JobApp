import axios from 'axios';
import { Platform, Alert } from 'react-native';
import { isCancel, pick, types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import SQLite from 'react-native-sqlite-storage';
import { decryp, encryp } from '../inc/cryp.js';

const DB_MAIN_NAME = 'firstNew.db';
const PENDING_JOB_KEY = 'pending_cv_job_id';
const SCAN_API_URL = 'https://api.jobapp2.de/scan-cv';
const STATUS_API_URL = 'https://api.jobapp2.de/scan-cv-status';

let isPickingActive = false;
let pollTimer = null;

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
  if (isPickingActive) return null;
  isPickingActive = true;

  try {
    const result = await pick({
      type: [types.pdf, types.images],
      copyTo: 'cachesDirectory',
    });
    return result[0];
  } catch (err) {
    if (isCancel(err)) return null;
    throw err;
  } finally {
    isPickingActive = false;
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
  if (!data) return;

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
      console.log('Formatted Experiences:', formattedExp);
    }

    // Optional im Hintergrund in SQLite sichern
    (async () => {
      try {
        const key = await EncryptedStorage.getItem('key');
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
      } catch (e) {
        // Ignorieren falls DB auf diesem Screen nicht verwendet wird
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
    if (Array.isArray(data.skills)) {
      skillList = data.skills;
    }
    if (Array.isArray(data.hobbies)) {
      skillList = [...skillList, ...data.hobbies];
    }

    if (skillList.length > 0) {
      setSkills(skillList.join(', '));
    }
  }

  // 4. Persönliche Daten (personal_info) -> personal
  if (data.personal_info && setPersonal) {
    console.log('Scanned Personal Info:', data.personal_info);
    setPersonal((prev) => ({
      ...prev,
      name: data.personal_info.name || prev.name,
      email: data.personal_info.email || prev.email,
      phone: data.personal_info.phone || prev.phone,
      location: data.personal_info.address || prev.location,
      title:
        data.work_experience?.[0]?.position ||
        prev.title ||
        'Fachkraft',
    }));
  }
};

export const scanCv = async () => {
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
      } catch {
        // Einseitiges PDF
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
    console.error('[OCR] Scan Error:', error.message);
    throw error;
  } finally {
    if (tempThumbnailPaths.length > 0) {
      await Promise.all(
        tempThumbnailPaths.map((p) => RNFS.unlink(p).catch(() => {}))
      );
    }
  }
};

export const stopCvPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

export const pollCvStatus = async ({
  jobId,
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  t = (k) => k,
}) => {
  if (!jobId) return;

  try {
    const res = await axios.get(
      `${STATUS_API_URL}?jobId=${encodeURIComponent(jobId)}`
    );
    const { status, data, error } = res.data || {};

    if (status === 'done') {
      stopCvPolling();
      await EncryptedStorage.removeItem(PENDING_JOB_KEY).catch(() => {});
      setIsScanningCv?.(false);

      await applyAllScannedData({
        data,
        setExperiences,
        setEducations,
        setSkills,
        setPersonal,
        dbInstance,
      });

      onSuccess?.(data);
      Alert.alert(t('profil.title') || 'Erfolg', 'Lebenslauf wurde vollständig importiert!');
    } else if (status === 'error' || status === 'not_found') {
      stopCvPolling();
      await EncryptedStorage.removeItem(PENDING_JOB_KEY).catch(() => {});
      setIsScanningCv?.(false);
      Alert.alert(t('profil.error') || 'Fehler', error || 'Scan fehlgeschlagen.');
    }
  } catch (err) {
    if (err?.response?.status === 404) {
      stopCvPolling();
      await EncryptedStorage.removeItem(PENDING_JOB_KEY).catch(() => {});
      setIsScanningCv?.(false);
    }
  }
};

export const resumePollingIfNeeded = async ({
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  t,
}) => {
  const savedJobId = await EncryptedStorage.getItem(PENDING_JOB_KEY).catch(() => null);
  if (!savedJobId) return;

  setIsScanningCv?.(true);
  await pollCvStatus({
    jobId: savedJobId,
    setIsScanningCv,
    setExperiences,
    setEducations,
    setSkills,
    setPersonal,
    dbInstance,
    onSuccess,
    t,
  });

  stopCvPolling();
  pollTimer = setInterval(() => {
    pollCvStatus({
      jobId: savedJobId,
      setIsScanningCv,
      setExperiences,
      setEducations,
      setSkills,
      setPersonal,
      dbInstance,
      onSuccess,
      t,
    });
  }, 3000);
};

export const startCvScan = async ({
  isScanningCv,
  setIsScanningCv,
  setExperiences,
  setEducations,
  setSkills,
  setPersonal,
  dbInstance = null,
  onSuccess = null,
  t,
}) => {
  if (isScanningCv) return;

  try {
    const response = await scanCv();
    if (!response) return;

    if (response.jobId) {
      setIsScanningCv?.(true);
      await EncryptedStorage.setItem(PENDING_JOB_KEY, response.jobId);
      await resumePollingIfNeeded({
        setIsScanningCv,
        setExperiences,
        setEducations,
        setSkills,
        setPersonal,
        dbInstance,
        onSuccess,
        t,
      });
      return;
    }

    // Direkte synchrone Antwort der OCR API
    await applyAllScannedData({
      data: response,
      setExperiences,
      setEducations,
      setSkills,
      setPersonal,
      dbInstance,
    });

    onSuccess?.(response);
    Alert.alert('Erfolg', 'Lebenslauf wurde vollständig importiert!');
  } catch (error) {
    console.error('[OCR] Scan Start fehlgeschlagen:', error);
    setIsScanningCv?.(false);
  }
};