// CollectScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import React, { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import { SafeAreaView } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import SQLite from 'react-native-sqlite-storage';

import { sanitize } from '../inc/CutLine.js';
import colors from '../inc/colors.js';
import { decryptBase } from '../inc/cryp.js';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const { width, height } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

/* ── Wiederverwendbare Action-Kachel ────────────────────── */
const CollectActionCard = memo(({ title, description, iconName, onPress, isPrimary = false }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionCard,
      isPrimary && styles.primaryActionCard,
      pressed && styles.cardPressed,
    ]}
  >
    <View style={[styles.iconContainer, isPrimary && styles.primaryIconContainer]}>
      <MaterialIcons
        name={iconName}
        size={22}
        color={isPrimary ? '#FFFFFF' : '#60A5FA'}
      />
    </View>

    <View style={styles.cardTextContainer}>
      <Text style={[styles.cardTitle, isPrimary && styles.primaryCardTitle]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={22}
      color={isPrimary ? 'rgba(255,255,255,0.6)' : 'rgba(255, 255, 255, 0.3)'}
    />
  </Pressable>
));

const CollectScreen = () => {
  const { t } = useTranslation();

  /* ── States ──────────────────────────────────────────── */
  const [pdfView, setPdfView] = useState(false);
  const [source, setSource] = useState({});
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);

  const lastTimeClick = useRef(0);

  /* ── Navigation: E-Mail ───────────────────────────────── */
  const email = async () => {
    const now = Date.now();
    if (now - lastTimeClick.current < 1000) return;
    lastTimeClick.current = now;

    try {
      await EncryptedStorage.setItem('result', 'collect');
      router.push('/email');
    } catch (err) {
      console.error('Error saving state:', err);
    }
  };

  /* ── Navigation: Zurück zur Startseite ───────────────── */
  const toHome = async () => {
    try {
      if (await EncryptedStorage.getItem('result')) {
        await EncryptedStorage.removeItem('result');
      }
      if (await EncryptedStorage.getItem('merge')) {
        await EncryptedStorage.removeItem('merge');
      }
      router.dismissTo('(tabs)');
    } catch (err) {
      console.error('Error navigating home:', err);
    }
  };

  /* ── PDF Vorschau anzeigen ───────────────────────────── */
  const lookAtIt = async () => {
    const now = Date.now();
    if (now - lastTimeClick.current < 1000) return;
    lastTimeClick.current = now;

    setLoadingPdf(true);
    try {
      const myKey = await EncryptedStorage.getItem('key');
      const yourName = await EncryptedStorage.getItem('yourName');
      const mergeName = await EncryptedStorage.getItem('merge');

      const filename = mergeName || `${yourName}_Bewerbungsmappe.pdf`;
      const base = `${RNFS.LibraryDirectoryPath}/${filename}`;
      const base2 = `${base}_1`;
      const temp = `${RNFS.LibraryDirectoryPath}/${yourName}_Bewerbungsmappe_temp.pdf`;

      const encData = await RNFS.readFile(base, 'base64');
      const decrypted = await decryptBase(encData, myKey);
      const encData2 = await RNFS.readFile(base2, 'base64');
      const combined = decrypted + encData2;

      await RNFS.writeFile(temp, combined, 'base64');
      setSource({ uri: `file://${temp}` });
      setPdfView(true);

      await EncryptedStorage.setItem('result', 'collect');
    } catch (err) {
      console.error('Fehler beim Öffnen der PDF:', err);
      Alert.alert('Fehler', 'PDF-Vorschau konnte nicht geladen werden.');
    } finally {
      setLoadingPdf(false);
    }
  };

  /* ── PDF Vorschau schließen & Temp löschen ──────────── */
  const deleteIt = async () => {
    setPdfView(false);
    try {
      const name = await EncryptedStorage.getItem('yourName');
      const outputPath = `${RNFS.LibraryDirectoryPath}/${name}_Bewerbungsmappe_temp.pdf`;
      const exists = await RNFS.exists(outputPath);
      if (exists) {
        await RNFS.unlink(outputPath);
      }
    } catch (err) {
      console.error('Fehler beim Löschen der temporären PDF:', err);
    }
  };

  /* ── PDF Teilen & Herunterladen ──────────────────────── */
  const download = async () => {
    const now = Date.now();
    if (now - lastTimeClick.current < 1000) return;
    lastTimeClick.current = now;

    setSharing(true);
    try {
      const myKey = await EncryptedStorage.getItem('key');
      const mergeName = await EncryptedStorage.getItem('merge');
      let finalPath = '';

      if (mergeName) {
        const safeName = sanitize(mergeName);
        const dataPath = `${RNFS.LibraryDirectoryPath}/${mergeName}`;
        const outputPath = `${RNFS.LibraryDirectoryPath}/${safeName}_Bewerbungsmappe.pdf`;

        const encData = await RNFS.readFile(dataPath, 'base64');
        const decryptedData = await decryptBase(encData, myKey);
        const encData2 = await RNFS.readFile(dataPath + '_1', 'base64');
        const combinedData = decryptedData + encData2;

        await RNFS.writeFile(outputPath, combinedData, 'base64');
        finalPath = outputPath;
      } else {
        const name = await EncryptedStorage.getItem('yourName');
        const safeName2 = sanitize(name);
        const dataPath = `${RNFS.LibraryDirectoryPath}/${name}_Bewerbungsmappe.pdf`;
        const outputPath = `${RNFS.LibraryDirectoryPath}/${safeName2}_Bewerbung.pdf`;

        const encData = await RNFS.readFile(dataPath, 'base64');
        const decryptedData = await decryptBase(encData, myKey);
        const encData2 = await RNFS.readFile(dataPath + '_1', 'base64');
        const combinedData = decryptedData + encData2;

        await RNFS.writeFile(outputPath, combinedData, 'base64');
        finalPath = outputPath;
      }

      if (finalPath) {
        await Share.open({
          url: `file://${finalPath}`,
          type: 'application/pdf',
          saveToFiles: true,
        });
      }
    } catch (err) {
      if (err?.message && !err.message.includes('User did not share')) {
        console.error('Fehler beim Exportieren:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.successBadge}>
            <MaterialIcons name="check-circle" size={15} color="#10B981" />
            <Text style={styles.successBadgeText}>FERTIGGESTELLT</Text>
          </View>
          <Text style={styles.titleMain}>Bewerbungsmappe bereit!</Text>
          <Text style={styles.subtitleMain}>
            Dein Anschreiben und deine Anlagen wurden erfolgreich zu einer vollständigen PDF zusammengefügt.
          </Text>
        </View>

        {/* ── Action Cards ── */}
        <View style={styles.cardsWrapper}>
          <CollectActionCard
            title={t('viewApplication') || 'Vorschau ansehen'}
            description={t('viewApplicationDescription') || 'Überprüfe deine fertige Mappe vor dem Absenden.'}
            iconName="visibility"
            onPress={lookAtIt}
          />

          <CollectActionCard
            isPrimary={true}
            title={t('download.button') || 'Speichern & Teilen'}
            description={t('downloadDescription') || 'Als PDF exportieren, in Dateien sichern oder teilen.'}
            iconName="file-download"
            onPress={download}
          />

          <CollectActionCard
            title={t('sendEmail') || 'Direkt per E-Mail'}
            description={t('sendEmailDescription') || 'Mit deinen hinterlegten SMTP-Daten sofort versenden.'}
            iconName="send"
            onPress={email}
          />
        </View>

        {/* ── Footer Button ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={toHome}
            activeOpacity={0.75}
          >
            <MaterialIcons name="home" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <Text style={styles.homeButtonText}>{t('toHome') || 'Zurück zur Übersicht'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── PDF Preview Modal ── */}
      <Modal
        visible={pdfView}
        animationType="fade"
        transparent={true}
        onRequestClose={deleteIt}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <MaterialIcons name="picture-as-pdf" size={20} color="#60A5FA" />
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  Bewerbungsmappe.pdf
                </Text>
              </View>
              <TouchableOpacity
                onPress={deleteIt}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* PDF View Component */}
            <View style={styles.pdfWrapper}>
              <Pdf
                source={source}
                style={styles.pdf}
                activityIndicator={<ActivityIndicator size="large" color="#3B82F6" />}
                onError={(error) => {
                  console.error('PDF Render Error:', error);
                  Alert.alert('Fehler', 'PDF konnte nicht gerendert werden.');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },

  /* ── Header ── */
  header: {
    marginTop: 8,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 10,
    gap: 6,
  },
  successBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleMain: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitleMain: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13.5,
    marginTop: 6,
    lineHeight: 19,
  },

  /* ── Action Cards ── */
  cardsWrapper: {
    gap: 14,
    marginVertical: 'auto',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B26',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  primaryIconContainer: {
    backgroundColor: '#3B82F6',
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  primaryCardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12.5,
    lineHeight: 17,
  },

  /* ── Footer ── */
  footer: {
    marginTop: 10,
  },
  homeButton: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },

  /* ── PDF Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: width * 0.94,
    height: height * 0.88,
    backgroundColor: '#171B26',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  pdfWrapper: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default CollectScreen;