import axios from 'axios';
import { sha512 } from 'js-sha512';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import { EMAIL_SERVERS_SHORT } from '../comp/documentPicker.js';
import { decryp, encryp } from './cryp.js';
import { getDb, runQuery, upsertFilesRow, withDbLock } from './db.js';

const API_BASE = 'https://api.jobapp2.de';

const safeDecrypt = async (val, key) => {
  if (!val) return null;
  try {
    return key ? await decryp(val, key) : val;
  } catch {
    return null;
  }
};

export const getHashedDeviceId = async () => {
  const deviceId = await DeviceInfo.getUniqueId();
  return sha512(deviceId);
};

/* ── Stammdaten & E-Mail laden ───────────────────────────── */
export const loadProfileData = async () => {
  const key = await EncryptedStorage.getItem('key');
  if (!key) return null;

  const deviceId = await DeviceInfo.getUniqueId();
  const db = await getDb();
  const result = await runQuery(db, 'SELECT * FROM files WHERE ident = ?', [deviceId]).catch(
    () => null
  );

  if (result?.rows?.length > 0) {
    const row = result.rows.raw()[0];
    const [name, street, city, fullEmail, password, server] = await Promise.all([
      safeDecrypt(row.name, key),
      safeDecrypt(row.street, key),
      safeDecrypt(row.city, key),
      safeDecrypt(row.email, key),
      safeDecrypt(row.emailPassword, key),
      safeDecrypt(row.emailServer, key),
    ]);

    return {
      name: name || '',
      street: street || '',
      city: city || '',
      fullEmail: fullEmail || '',
      emailUser: fullEmail ? fullEmail.split('@')[0] : '',
      password: password || '',
      server: server || 'smtp.mail.de',
    };
  }

  const [name, street, city, fullEmail, password, server] = await Promise.all([
    EncryptedStorage.getItem('name'),
    EncryptedStorage.getItem('street'),
    EncryptedStorage.getItem('city'),
    EncryptedStorage.getItem('email'),
    EncryptedStorage.getItem('emailPassword'),
    EncryptedStorage.getItem('emailServer'),
  ]);

  return {
    name: name || '',
    street: street || '',
    city: city || '',
    fullEmail: fullEmail || '',
    emailUser: fullEmail ? (fullEmail.includes('@') ? fullEmail.split('@')[0] : fullEmail) : '',
    password: password || '',
    server: server || 'smtp.mail.de',
  };
};

/* ── Persönliche Daten speichern ─────────────────────────── */
export const savePersonalData = ({ name, street, city }) =>
  withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const key = await EncryptedStorage.getItem('key');

    const trimmedName = name.trim();
    const trimmedStreet = street.trim();
    const trimmedCity = city.trim();

    await Promise.all([
      EncryptedStorage.setItem('name', trimmedName),
      EncryptedStorage.setItem('street', trimmedStreet),
      EncryptedStorage.setItem('city', trimmedCity),
    ]);

    const db = await getDb();
    await upsertFilesRow(db, deviceId, {
      name: key ? await encryp(trimmedName, key) : trimmedName,
      street: key ? await encryp(trimmedStreet, key) : trimmedStreet,
      city: key ? await encryp(trimmedCity, key) : trimmedCity,
    });
  });

/* ── E-Mail testen & speichern ───────────────────────────── */
export const testAndSaveEmailConfig = async ({ email, password, emailServerValue }) => {
  const provider = EMAIL_SERVERS_SHORT.find((s) => s.value === emailServerValue);
  const trimmedPw = password.trim();
  const trimmedEmail = email.trim() + (provider?.label || '');

  const testResponse = await fetch(`${API_BASE}/emailTest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmedEmail,
      emailPassword: trimmedPw,
      emailServer: emailServerValue,
    }),
  });

  const resData = await testResponse.json();
  if (!testResponse.ok || resData.code !== 'OK') {
    return {
      ok: false,
      title: 'Verbindung fehlgeschlagen',
      message: 'Benutzername, Passwort oder der Server stimmen nicht. Bitte überprüfe deine Angaben.',
    };
  }

  await withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const key = await EncryptedStorage.getItem('key');

    await Promise.all([
      EncryptedStorage.setItem('email', trimmedEmail),
      EncryptedStorage.setItem('emailPassword', trimmedPw),
      EncryptedStorage.setItem('emailServer', emailServerValue),
    ]);

    const db = await getDb();
    await upsertFilesRow(db, deviceId, {
      email: key ? await encryp(trimmedEmail, key) : trimmedEmail,
      emailPassword: key ? await encryp(trimmedPw, key) : trimmedPw,
      emailServer: key ? await encryp(emailServerValue, key) : emailServerValue,
    });
  });

  return { ok: true, fullEmail: trimmedEmail };
};

/* ── Berufserfahrungen (Skills-Spalte) ───────────────────── */
export const loadExperiencesFromDb = () =>
  withDbLock(async () => {
    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await getDb();

    const [results] = await db.executeSql('SELECT skills FROM files WHERE ident = ?', [deviceId]);
    const raw = results?.rows?.raw?.()?.[0]?.skills;
    if (!raw) return null;

    const decrypted = await safeDecrypt(raw, key);
    if (!decrypted || !decrypted.trim()) return null;

    const parsed = JSON.parse(decrypted);
    return Array.isArray(parsed) ? parsed : null;
  });

export const saveExperiencesToDb = (experiences) =>
  withDbLock(async () => {
    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await getDb();

    const jsonString = JSON.stringify(experiences);
    const valueToStore = key ? await encryp(jsonString, key) : jsonString;
    await upsertFilesRow(db, deviceId, { skills: valueToStore });
  });

export const appendScannedExperiences = (workExperience) =>
  withDbLock(async () => {
    const newItems = (workExperience || [])
      .filter((exp) => exp && (exp.company || exp.position || exp.role))
      .map((exp) => ({
        id: `${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
        company: exp.company || '',
        role: exp.position || exp.role || '',
        period: exp.period || '',
        tasks: Array.isArray(exp.tasks)
          ? exp.tasks.join('\n')
          : exp.tasks || exp.description || '',
      }));

    if (newItems.length === 0) return { addedCount: 0, merged: null };

    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await getDb();

    let existingList = [];
    const [results] = await db.executeSql('SELECT skills FROM files WHERE ident = ?', [deviceId]);
    const raw = results?.rows?.raw?.()?.[0]?.skills;

    if (raw) {
      const decrypted = await safeDecrypt(raw, key);
      if (decrypted && decrypted.trim()) {
        try {
          const parsed = JSON.parse(decrypted);
          if (Array.isArray(parsed)) existingList = parsed;
        } catch {}
      }
    }

    const merged = [...existingList, ...newItems];
    const jsonString = JSON.stringify(merged);
    const valueToStore = key ? await encryp(jsonString, key) : jsonString;
    await upsertFilesRow(db, deviceId, { skills: valueToStore });

    return { addedCount: newItems.length, merged };
  });

/* ── Coins & IAP ─────────────────────────────────────────── */
export const fetchUserCoins = async () => {
  const key = await getHashedDeviceId();
  const res = await axios.post(`${API_BASE}/getCoins`, { key });
  return res.data?.response ?? 0;
};

export const creditUserCoins = async (amount) => {
  const username = await getHashedDeviceId();
  await axios.post(`${API_BASE}/putCoins`, { username, coins: amount });
};

export const verifyIapCoins = async (productId) => {
  try {
    const username = await getHashedDeviceId();
    await axios.post(`${API_BASE}/putCoinsIAP`, { username, productId });
    return true;
  } catch (err) {
    console.error('Fehler beim Übermitteln des IAP:', err);
    return false;
  }
};

export const sendCoinsToUser = async ({ senderKey, receiverKey, coins }) => {
  const res = await axios.post(`${API_BASE}/sendCoins`, {
    senderKey,
    receiverKey,
    coins,
  });
  return res.data?.success || res.status === 200;
};