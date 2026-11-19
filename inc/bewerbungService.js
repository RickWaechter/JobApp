import axios from 'axios';
import { sha512 } from 'js-sha512';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { thePrompt } from './ai.js';
import { decryp } from './cryp.js';
import { getDb, runQuery, withDbLock } from './db.js';
import { downloader } from './downloader.js';
import { getI18nCode } from './language.js';

export const DB_JOBS_NAME = 'jobs.db';

/* ── Jobs-DB herunterladen (falls nötig) & beide DBs öffnen ── */
export const initBewerbungDatabases = async () => {
  const folderPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;
  const dest = `${folderPath}/${DB_JOBS_NAME}`;

  if (!(await RNFS.exists(folderPath))) {
    await RNFS.mkdir(folderPath);
  }

  if (!(await RNFS.exists(dest))) {
    const res = await fetch(`https://api.jobapp2.de/get-secure-link/${DB_JOBS_NAME}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        const secureUrl = data.url.replace('http://', 'https://');
        await RNFS.downloadFile({ fromUrl: secureUrl, toFile: dest }).promise;
      }
    }
  }

  const [dbMain, dbJobs] = await Promise.all([getDb(), getDb(DB_JOBS_NAME)]);
  return { dbMain, dbJobs };
};

/* ── Skills & zuletzt gewählte Stationen laden ───────────── */
export const loadUserSkillsAndSelection = async () => {
  const key = await EncryptedStorage.getItem('key');
  const deviceId = await DeviceInfo.getUniqueId();
  const db = await getDb();

  const res = await runQuery(db, 'SELECT skills FROM files WHERE ident = ? LIMIT 1', [deviceId]);
  const raw = res?.rows?.raw()?.[0]?.skills;
  if (typeof raw !== 'string' || !raw.trim()) {
    return { skills: [], restoredSelected: [] };
  }

  const decSkills = await decryp(raw, key);
  if (!decSkills) return { skills: [], restoredSelected: [] };

  const parsed = JSON.parse(decSkills);
  if (!Array.isArray(parsed)) return { skills: [], restoredSelected: [] };

  let restoredSelected = [];
  const savedSelectedRaw = await EncryptedStorage.getItem('selected_skills');
  if (savedSelectedRaw) {
    const savedIds = JSON.parse(savedSelectedRaw);
    if (Array.isArray(savedIds) && savedIds.length > 0) {
      restoredSelected = parsed.filter((item) => {
        const itemKey = item?.id ?? (typeof item === 'string' ? item : item?.role);
        return savedIds.includes(itemKey);
      });
    }
  }

  return { skills: parsed, restoredSelected };
};

/* ── Volltext-Jobsuche & Speichern in jobs.db ────────────── */
export const searchJobsInDb = async (query) => {
  const dbJobs = await getDb(DB_JOBS_NAME);
  const res = await runQuery(
    dbJobs,
    'SELECT rowid, text FROM eintraege WHERE eintraege MATCH ? LIMIT 15',
    [`${query}*`]
  );
  return res.rows.raw();
};

export const saveJobTitleToDb = async (title) => {
  const dbJobs = await getDb(DB_JOBS_NAME);
  await dbJobs.executeSql('INSERT INTO eintraege (text) VALUES (?)', [title.trim()]);
};

export const appendCustomSkillToDb = (skillText) =>
  withDbLock(async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const dbMain = await getDb();
    await dbMain.executeSql(
      "UPDATE files SET skills = IFNULL(skills, '') || ? || '#' WHERE ident = ?",
      [skillText.trim(), deviceId]
    );
  });

/* ── Schriftarten prüfen & herunterladen ─────────────────── */
export const getDownloadedFontsMap = async (fontOptions) => {
  const candidatePaths = [
    `${RNFS.LibraryDirectoryPath}/fonts`,
    `${RNFS.DocumentDirectoryPath}/fonts`,
  ];

  const existingFiles = new Set();
  for (const dir of candidatePaths) {
    if (await RNFS.exists(dir)) {
      const files = await RNFS.readDir(dir);
      files.forEach((f) => existingFiles.add(f.name.toLowerCase()));
    }
  }

  const result = { Helvetica: true };
  fontOptions.forEach((f) => {
    const base = (f.fontName || f.value || '').replace(/\.ttf$/i, '').toLowerCase();
    const hasRegular = existingFiles.has(`${base}.ttf`);
    const hasBold =
      existingFiles.has(`${base}-bold.ttf`) || existingFiles.has(`${base}_bold.ttf`);
    if (hasRegular && hasBold) {
      result[f.value] = true;
    }
  });

  return result;
};

export const downloadFontAsset = async (fontName) => {
  if (typeof downloader !== 'function') {
    throw new Error('downloader Funktion nicht verfügbar.');
  }
  await downloader(fontName, 'fonts');
};

/* ── Bewerbungstext generieren & im Storage sichern ──────── */
export const generateApplicationText = async ({
  t,
  i18n,
  languageValue,
  fontValue,
  jobTitle,
  erfahrung,
  selectedSkills,
  selectedOption,
  selectedOption2,
  selectedOption3,
  selectedQuality,
  contactName,
  scrapedDescription,
}) => {
  const targetLng = getI18nCode(languageValue) || 'de';
  const closing = i18n.t('closing', { lng: targetLng, defaultValue: t('closing') });

  // Anrede bauen
  const opt3Lower = (selectedOption3 || '').toLowerCase();
  const isDamenUndHerren =
    opt3Lower.includes('damen') || selectedOption3 === t('anredeOptions.damenUndHerren');

  let anrede = '';
  if (!isDamenUndHerren && (opt3Lower.includes('herr') || selectedOption3 === t('anredeOptions.herr'))) {
    const prefix = i18n.t('salutation.herr', { lng: targetLng, defaultValue: t('salutation.herr') });
    anrede = `${prefix}${contactName.trim()},`;
  } else if (!isDamenUndHerren && (opt3Lower.includes('frau') || selectedOption3 === t('anredeOptions.frau'))) {
    const prefix = i18n.t('salutation.frau', { lng: targetLng, defaultValue: t('salutation.frau') });
    anrede = `${prefix}${contactName.trim()},`;
  } else {
    anrede = i18n.t('salutation.default', { lng: targetLng, defaultValue: t('salutation.default') });
  }

  // Betreff bauen
  const opt2Lower = (selectedOption2 || '').toLowerCase();
  let appTypeKey = 'default';
  if (opt2Lower.includes('initiativ') || selectedOption2 === t('applicationOptions.initiativ')) {
    appTypeKey = 'initiativ';
  } else if (opt2Lower.includes('praktik') || selectedOption2 === t('applicationOptions.praktikum')) {
    appTypeKey = 'praktikum';
  } else if (
    opt2Lower.includes('regulär') ||
    opt2Lower.includes('regular') ||
    selectedOption2 === t('applicationOptions.regulär')
  ) {
    appTypeKey = 'regulär';
  }

  const typePrefix = i18n.t(`applicationOptions2.${appTypeKey}`, {
    lng: targetLng,
    defaultValue: i18n.t('applicationOptions2.default', {
      lng: targetLng,
      defaultValue: t('applicationOptions2.default'),
    }),
  });

  const choicePart = selectedOption?.trim() ? ` (${selectedOption.trim()})` : '';
  const subject = `${typePrefix}${jobTitle.trim()}${choicePart}`;

  await Promise.all([
    EncryptedStorage.setItem('font', fontValue),
    EncryptedStorage.setItem('language', languageValue),
    EncryptedStorage.setItem('beruf', jobTitle),
    EncryptedStorage.setItem('erfahrung', erfahrung),
    EncryptedStorage.setItem('time', selectedOption),
    EncryptedStorage.setItem('type', selectedOption2),
    EncryptedStorage.setItem('subject', subject),
    EncryptedStorage.setItem('anrede', anrede),
    EncryptedStorage.setItem('closing', closing),
  ]);

  // Prompt zusammenbauen
  const detailedSkillsString =
    selectedSkills.length === 0
      ? erfahrung
      : selectedSkills
          .map((item, idx) => {
            if (typeof item === 'string') return `• ${item}`;
            const parts = [];
            if (item.role) parts.push(`${t('profil.labelRole')}: ${item.role}`);
            if (item.company) parts.push(`${t('profil.labelCompany')}: ${item.company}`);
            if (item.period) parts.push(`${t('profil.labelPeriod')}: ${item.period}`);
            if (item.tasks) parts.push(`${t('profil.labelTasks')}: ${item.tasks}`);
            return `[${t('profil.stationBadge', { index: idx + 1 })}]\n${parts.join('\n')}`;
          })
          .join('\n\n');

  let prompt1 = thePrompt(jobTitle, languageValue, detailedSkillsString);
  if (scrapedDescription?.trim()) {
    prompt1 += `\n\nNutze folgende Anforderungen der Stellenanzeige für passende Keywords:\n"${scrapedDescription}"`;
  }

  const deviceId = await DeviceInfo.getUniqueId();
  const key = sha512(deviceId);

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.post(
        'https://api.jobapp2.de/getText',
        { prompt1, key, modelIntens: selectedQuality },
        { timeout: 20000 }
      );
      const generatedText = response.data?.response;
      if (!generatedText || typeof generatedText !== 'string' || !generatedText.trim()) {
        throw new Error('Ungültige oder leere Server-Antwort');
      }

      const cleanSaved = generatedText
        .replace(/\*/g, '')
        .replace(/\u202F/g, ' ')
        .replace(/[\u2010-\u2015]/g, '-')
        .replace(/[\u201C\u201D\u201E]/g, '"')
        .replace(/\u00a0/g, ' ');

      await EncryptedStorage.setItem('text', cleanSaved);
      await EncryptedStorage.setItem('result', 'change');

      const check = await EncryptedStorage.getItem('text');
      if (!check) throw new Error('Text konnte nicht im Storage verifiziert werden');

      return;
    } catch (err) {
      lastError = err;
      console.warn(`Fehlversuch ${attempt}:`, err?.message || err);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Generierung nach mehreren Versuchen fehlgeschlagen');
};