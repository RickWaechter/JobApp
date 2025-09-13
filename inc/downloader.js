import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet, Text, Platform } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { useTranslation } from 'react-i18next';

import BottomPopupDownload from './popupDownload.js';
import colors from './colors.js';

SQLite.enablePromise(true);

/**
 * Reusable component that ensures a bundled SQLite DB is present on the device.
 * - Shows a download button when the DB file is missing
 * - Handles progressive download with pause/resume support
 * - Streams progress into the supplied <BottomPopupDownload /> component
 * - Once the file is present, opens it read‑only and returns the db instance via onReady()
 *
 * Props
 * ──────
 * @param {string}  downloadUrl   — public URL of the DB file
 * @param {string}  dbName        — filename (default: 'firmen.db')
 * @param {func}    onReady       — callback(db) when DB is available & open
 * @param {object}  buttonStyle   — optional style override for the icon button
 * @param {string}  iconColor     — MaterialIcon color (default: 'white')
 */
export default function DatabaseDownloader({
  downloadUrl,
  dbName ,
  onReady = () => {},
  buttonStyle,
  iconColor = 'white',
  alertTitle,
  alertText,
  top
}) {
  const { t } = useTranslation();
  const [dbExists, setDbExists] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resume, setResume] = useState(false);
  const [progress, setProgress] = useState('');
  const jobIdRef = useRef(null);
  const cancelRef = useRef(null);
  const dbRef = useRef(null);

  /* --------------------------------------- */
  /* Helpers                                 */
  /* --------------------------------------- */
  const dbDir = Platform.OS === 'ios'
    ? `${RNFS.LibraryDirectoryPath}/LocalDatabase`
    : RNFS.DocumentDirectoryPath;
  const dbPath = `${dbDir}/${dbName}`;

  const checkDbExists = useCallback(async () => {
    const exists = await RNFS.exists(dbPath);
    setDbExists(exists);
    return exists;
  }, [dbPath]);

  const openDatabase = useCallback(async () => {
    if (dbRef.current) return dbRef.current;
    const db = await SQLite.openDatabase({ name: dbName, location: 'default', readOnly: true });
    dbRef.current = db;
    return db;
  }, [dbName]);

  /* --------------------------------------- */
  /* Download logic                          */
  /* --------------------------------------- */
  const downloadDb = useCallback(async (url, onProgress = () => {}) => {
    if (!(await RNFS.exists(dbDir))) await RNFS.mkdir(dbDir);

    const tmpPath = `${dbPath}.download`;
    let totalBytes = 0;
    const task = RNFS.downloadFile({
      fromUrl: url,
      toFile: tmpPath,
      progressDivider: 1,
      begin: res => { totalBytes = res.contentLength || 0; },
      progress: res => {
        const pct = totalBytes ? Math.round((res.bytesWritten / totalBytes) * 100) : -1;
        onProgress({
          pct,
          bytesWritten: (res.bytesWritten / 1024 / 1024).toFixed(2),
          totalBytes: (totalBytes / 1024 / 1024).toFixed(2),
          jobId: task.jobId,
        });
      },
    });

    const { statusCode } = await task.promise;
    if (statusCode !== 200) throw new Error(`Download error ${statusCode}`);

    await RNFS.moveFile(tmpPath, dbPath);
    const db = await openDatabase();

    return {
      db,
      jobId: task.jobId,
      cancel: () => RNFS.stopDownload(task.jobId),
    };
  }, [dbDir, dbPath, openDatabase]);

  const startDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const { jobId, cancel, db } = await downloadDb(downloadUrl, info => {
        setProgress(`${info.bytesWritten} / ${info.totalBytes} MB (${info.pct}%)`);
        if (!jobIdRef.current) jobIdRef.current = info.jobId;
      });
      cancelRef.current = cancel;
      jobIdRef.current = jobId;
      setResume(false);
      await checkDbExists();
      onReady(db);
    } catch (err) {
      console.warn('Download error', err);
    } finally {
      setDownloading(false);
    }
  }, [downloadDb, downloadUrl, checkDbExists, onReady]);

  const resumeDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const id = jobIdRef.current;
      if (id && await RNFS.isResumable(id)) {
        RNFS.resumeDownload(id);
      }
    } catch (err) {
      console.warn('Resume error', err);
    } 
  }, []);

  const stopDownload = useCallback(() => {
    if (jobIdRef.current) {
      RNFS.stopDownload(jobIdRef.current);
      setResume(true);
      setDownloading(false);
    }
  }, []);

  const askDownload = useCallback(() => {
    Alert.alert(alertTitle, alertText, [
      { text: t('common.cancel', 'Abbrechen'), style: 'cancel' },
      { text: t('common.ok', 'OK'), onPress: startDownload },
    ]);
  }, [startDownload, t]);

  /* --------------------------------------- */
  /* Init: check if DB already present       */
  /* --------------------------------------- */
  useEffect(() => {
    (async () => {
      if (await checkDbExists()) {
        const db = await openDatabase();
        onReady(db);
      }
    })();
    // close DB on unmount
    
  }, [checkDbExists, openDatabase, onReady]);
  
  useEffect(() => {
    (async () => {
      const exists = await RNFS.exists(dbPath); // ← hier wird geprüft
      console.log('DB existiert bereits?', exists);
      setDbExists(exists);
  
      if (exists) {
        const db = await openDatabase();
        onReady(db); // ← wird hier direkt aufgerufen
      }
    })();
  }, []);
  /* --------------------------------------- */
  /* Render                                  */
  /* --------------------------------------- */
  if (dbExists) return null; // nothing to show once DB is on device

  return (
    <View>
      {/* Download & Resume buttons */}
      {!downloading && !resume && (
        <TouchableOpacity onPress={askDownload} style={{    
          position: 'absolute',
          top,
          right: 12,
          backgroundColor: 'transparent',
          padding: 6,
          borderRadius: 20,
          zIndex: 100,}}>
          <MaterialIcons name="download" size={26} color={iconColor} />
        </TouchableOpacity>
      )}
      {resume && !downloading && (
        <TouchableOpacity onPress={resumeDownload} style={{    
          position: 'absolute',
          top,
          right: 12,
          backgroundColor: 'transparent',
          padding: 6,
          borderRadius: 20,
          zIndex: 100,}}>
          <MaterialIcons name="play-circle" size={26} color={iconColor} />
        </TouchableOpacity>
      )}

      {/* Progress overlay */}
      {downloading && (
        <BottomPopupDownload
          visible={downloading}
          message={progress}
          onClose={stopDownload}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({

});
