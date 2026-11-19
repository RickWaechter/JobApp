import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { encryp, encryptBase64, genIv } from './cryp.js';
import { getDb, upsertFilesRow, withDbLock } from './db.js';

const TEMP_CV_KEY = 'tempCv';

/* ── Autosave (EncryptedStorage) ─────────────────────────── */
export const loadTempCv = async () => {
  const raw = await EncryptedStorage.getItem(TEMP_CV_KEY);
  return raw ? { raw, parsed: JSON.parse(raw) } : null;
};

export const saveTempCv = (payload) => EncryptedStorage.setItem(TEMP_CV_KEY, payload);

export const clearTempCv = async () => {
  if (await EncryptedStorage.getItem(TEMP_CV_KEY)) {
    await EncryptedStorage.removeItem(TEMP_CV_KEY);
  }
};

/* ── Gespeicherte CV-Stände in SQLite ────────────────────── */
export const loadSavedCvsMap = async () => {
  const deviceId = await DeviceInfo.getUniqueId();
  const db = await getDb();
  const [res] = await db.executeSql('SELECT cv FROM files WHERE ident = ? LIMIT 1', [deviceId]);
  const raw = res?.rows?.item(0)?.cv;
  if (!raw) return {};

  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

export const saveCvSnapshot = (keyName, cvPayload) =>
  withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await getDb();
    const existing = await loadSavedCvsMap();
    const updated = { ...existing, [keyName]: cvPayload };

    await upsertFilesRow(db, deviceId, { cv: JSON.stringify(updated) });
    await clearTempCv();
    return updated;
  });

export const deleteCvSnapshot = (keyToDelete) =>
  withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await getDb();
    const existing = await loadSavedCvsMap();
    delete existing[keyToDelete];

    await upsertFilesRow(db, deviceId, { cv: JSON.stringify(existing) });
    return existing;
  });

/* ── PDF als verschlüsselten Lebenslauf in App-DB sichern ── */
export const saveCvPdfEncrypted = (htmlLayout) =>
  withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const credentials = await Keychain.getGenericPassword();
    if (!credentials?.password) {
      throw new Error('Keine Keychain Credentials gefunden!');
    }
    const myKey = credentials.password;

    const { uri, base64 } = await Print.printToFileAsync({
      html: htmlLayout,
      width: 595,
      height: 842,
      base64: true,
    });

    if (!base64) {
      throw new Error('Base64-String konnte nicht generiert werden.');
    }

    const documentsDir = RNFS.LibraryDirectoryPath;
    const fileName = decodeURI(uri).split('/').pop() || `cv_${Date.now()}.pdf`;
    const filePath = `${documentsDir}/${fileName}`;

    const base641 = base64.slice(0, 16);
    const base642 = base64.slice(16);
    const iv = await genIv();
    const encrypted = await encryptBase64(base641, iv, myKey);
    const encryptedFileName = await encryp(fileName, myKey);

    if (encrypted) {
      await Promise.all([
        RNFS.writeFile(filePath, encrypted, 'base64'),
        RNFS.writeFile(`${filePath}_1`, base642, 'base64'),
      ]);
    }

    const db = await getDb();
    await upsertFilesRow(db, deviceId, { lebenslauf: encryptedFileName });
  });

/* ── PDF generieren & System-Share-Sheet öffnen ──────────── */
export const shareCvAsPdf = async (htmlLayout, personName) => {
  const { uri } = await Print.printToFileAsync({
    html: htmlLayout,
    width: 595,
    height: 842,
  });

  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: `${personName || 'Lebenslauf'} teilen`,
  });
  return true;
};