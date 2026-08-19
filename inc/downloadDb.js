import RNFS   from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';
import { Alert } from 'react-native';

SQLite.enablePromise(true);

export async function downloadDb(url, onProgress = () => {}) {
  const dbDir  = Platform.OS === 'ios'
    ? `${RNFS.LibraryDirectoryPath}/LocalDatabase`
    : RNFS.DocumentDirectoryPath;

  const dbPath = `${dbDir}/firmen.db`;
  if (await RNFS.exists(dbPath)) return SQLite.openDatabase({ name: 'firmen.db', location: 'default' });

  if (!(await RNFS.exists(dbDir))) await RNFS.mkdir(dbDir);
  const tmpPath = `${dbPath}.download`;

  /** -------- BEGIN‑Callback holt die Dateigröße -------- */
  let totalBytes = 0;
  const task = RNFS.downloadFile({
    fromUrl: url,
    toFile : tmpPath,
    progressDivider: 1,          // iOS & Android: jede Änderung
    begin: res => {
      totalBytes = res.contentLength || 0;   // hier kommt die Größe rein
      console.log('Download‑Size:', totalBytes);
    },
    progress: res => {
      if (totalBytes > 0) {
        const pct = Math.round((res.bytesWritten / totalBytes) * 100);
        const bytesWrittenMB = (res.bytesWritten / 1024 / 1024).toFixed(2);
        const jobID = res.jobId;
        const totalBytesMB   = (totalBytes / 1024 / 1024).toFixed(2);
        console.log(`Download: ${bytesWrittenMB} / ${totalBytesMB} MB (${pct}%) from JobID: ${jobID}`);
        onProgress({
          pct:pct,
          bytesWritten:bytesWrittenMB,
          totalBytes:totalBytesMB,
          jobId: task.jobId                         // <‑‑ jobId mitgeben!
        });
      } else {
        // Fallback: nur Spinner, weil Größe unbekannt
        onProgress(-1);                         // -1 = unbekannt
      }
    }
  });

  const { statusCode } = await task.promise;
  if (statusCode !== 200) throw new Error(`Download‑Fehler ${statusCode}`);

  await RNFS.moveFile(tmpPath, dbPath);
  const db = await SQLite.openDatabase({ name: 'firmen.db', location: 'default' });

  /* ───── Rückgabe‑Objekt ───── */
  return {
    db,
    jobId : task.jobId,
    cancel: () => RNFS.stopDownload(task.jobId)   // Download abbrechen
  };
}