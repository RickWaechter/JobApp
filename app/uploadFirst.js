// UploadFirstScreen.js / Home.js
import MaterialIcons from "@react-native-vector-icons/material-icons";
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';

import colors from '../inc/colors.js';
import {
  decryp,
  encryp,
  encryptBase64,
  genIv,
} from '../inc/cryp.js';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const { width, height } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const orderedKeys = [
  'lebenslauf',
  'add1', 'add2', 'add3', 'add4', 'add5',
  'add6', 'add7', 'add8', 'add9', 'add10',
];

/* ── Wiederverwendbare Upload Card ──────────────────────── */
const UploadActionCard = memo(({ title, description, iconName, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionCard,
      pressed && styles.cardPressed,
    ]}
  >
    <View style={styles.iconContainer}>
      <MaterialIcons name={iconName} size={24} color="#FFFFFF" />
    </View>

    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={22}
      color="rgba(255, 255, 255, 0.3)"
    />
  </Pressable>
));

const UploadScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();

  /* ── States ──────────────────────────────────────────── */
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ── Document Picker ─────────────────────────────────── */
  const handleFileChange = async () => {
    try {
      const results = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (results.canceled || !results.assets || results.assets.length === 0) return;

      if (results.assets.length > 11) {
        Alert.alert(
          t('profil.error') || 'Hinweis',
          t('upload.error') || 'Du kannst maximal 11 Dokumente gleichzeitig hochladen.'
        );
        return;
      }

      setIsProcessing(true);
      const documentsDir = RNFS.LibraryDirectoryPath;
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;

      const processedFiles = await Promise.all(
        results.assets.map(async (file) => {
          try {
            const originalFilePath = decodeURI(file.uri);
            const filePath = `${documentsDir}/${file.name}`;
            const theFilePath = await encryp(file.name, myKey);

            const base64String = await RNFS.readFile(originalFilePath, 'base64');
            const base641 = base64String.slice(0, 16);
            const base642 = base64String.slice(16);
            const iv = await genIv();
            const encrypted = await encryptBase64(base641, iv, myKey);

            if (encrypted) {
              await RNFS.writeFile(filePath, encrypted, 'base64');
              await RNFS.writeFile(`${filePath}_1`, base642, 'base64');
            }

            return {
              name: theFilePath,
              size: file.size,
              path: filePath,
              filename: file.name,
            };
          } catch (err) {
            console.error(`Fehler bei ${file.name}:`, err);
            throw err;
          }
        })
      );

      setFiles(processedFiles);
    } catch (err) {
      console.error('Error picking files:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Speichern in SQLite & Weiterleitung ─────────────── */
  const handleSaveToDB = async () => {
    if (files.length === 0) return;
    setIsSaving(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

      await Promise.all(
        files.map((file, index) => {
          const column = index === 0 ? 'lebenslauf' : `add${index}`;
          if (index > 10) return Promise.resolve();

          return new Promise((resolve, reject) => {
            db.executeSql(
              `UPDATE files SET ${column} = ? WHERE ident = ?`,
              [file.name, deviceId],
              (_, result) => resolve(result),
              (error) => reject(error)
            );
          });
        })
      );

      if (files.length < 10) {
        for (let i = files.length - 1; i < 10; i++) {
          await db.executeSql(
            `UPDATE files SET add${i + 1} = NULL WHERE ident = ?`,
            [deviceId]
          );
        }
      }

      setIsSaving(false);
      Alert.alert(
        t('upload.title') || 'Erfolg',
        t('upload.info') || 'Deine Unterlagen wurden sicher verschlüsselt gespeichert.',
        [{ text: 'OK', onPress: () => router.dismissTo('(tabs)') }]
      );
    } catch (error) {
      setIsSaving(false);
      console.error('Fehler beim Speichern:', error);
      Alert.alert('Fehler', 'Dateien konnten nicht in der Datenbank gespeichert werden.');
    }
  };

  const handleSkipOrContinue = () => {
    router.dismissTo('(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.badgeHub}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeHubText}>SCHRITT 2 VON 2</Text>
          </View>
          <Text style={styles.titleMain}>Lebenslauf & Anlagen</Text>
          <Text style={styles.subtitleMain}>
            Lade deine Bewerbungsunterlagen (Lebenslauf, Zeugnisse, Zertifikate) als PDF oder Bild hoch.
          </Text>
        </View>

        {/* ── Modus 1: Keine Dateien ausgewählt ── */}
        {files.length === 0 ? (
          <View style={styles.centerContainer}>
            <UploadActionCard
              iconName="upload-file"
              title={t('uploadFiles') || 'Dateien auswählen'}
              description={t('selectFilesToUpload') || 'Erste Datei ist automatisch dein Hauptdokument (Lebenslauf).'}
              onPress={handleFileChange}
            />

            <View style={styles.infoBox}>
              <MaterialIcons name="lock-outline" size={18} color="#60A5FA" style={{ marginRight: 8 }} />
              <Text style={styles.infoBoxText}>
                Alle Dokumente werden Ende-zu-Ende verschlüsselt und ausschließlich lokal auf deinem Gerät gespeichert.
              </Text>
            </View>
          </View>
        ) : (
          /* ── Modus 2: Dateien in Staging-Ansicht ── */
          <View style={styles.stagedContainer}>
            <View style={styles.stagedCard}>
              <View style={styles.stagedHeader}>
                <View style={styles.stagedHeaderLeft}>
                  <MaterialIcons name="inventory-2" size={20} color="#60A5FA" />
                  <Text style={styles.stagedTitle}>
                    {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} bereit
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFiles([])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cancelText}>Neu wählen</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.stagedList} showsVerticalScrollIndicator={false}>
                {files.map((file, index) => (
                  <View key={index} style={styles.stagedItem}>
                    <View style={[styles.fileBadge, index === 0 && styles.fileBadgeCv]}>
                      <Text style={styles.fileBadgeText}>{index === 0 ? 'CV' : `${index}`}</Text>
                    </View>
                    <View style={styles.fileItemInfo}>
                      <Text style={styles.stagedFileName} numberOfLines={1}>
                        {file.filename}
                      </Text>
                      <Text style={styles.stagedFileSize}>
                        {index === 0 ? 'Hauptdokument' : `Anhang ${index}`} • {(file.size / 1024).toFixed(0)} KB
                      </Text>
                    </View>
                    <MaterialIcons name="check-circle" size={18} color="#10B981" />
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Speichern Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSaveToDB}
              disabled={isSaving || isProcessing}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Wird verschlüsselt & gespeichert...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.primaryBtnText}>Speichern & Starten</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Footer ── */}
        {files.length === 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleSkipOrContinue}
              activeOpacity={0.75}
            >
              <Text style={styles.ghostBtnText}>Später hinzufügen</Text>
              <MaterialIcons name="arrow-forward-ios" size={13} color="rgba(255,255,255,0.4)" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  badgeHub: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  badgeHubText: {
    color: '#60A5FA',
    fontSize: 10,
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  /* ── Center Container (Initial Upload) ── */
  centerContainer: {
    marginVertical: 'auto',
    gap: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12.5,
    lineHeight: 17,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoBoxText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    lineHeight: 16,
  },

  /* ── Staging Modus ── */
  stagedContainer: {
    flex: 1,
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  stagedCard: {
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: height * 0.52,
  },
  stagedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  stagedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stagedTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cancelText: {
    color: '#60A5FA',
    fontSize: 12.5,
    fontWeight: '600',
  },
  stagedList: {
    marginTop: 8,
  },
  stagedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  fileBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileBadgeCv: {
    backgroundColor: '#3B82F6',
  },
  fileBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  fileItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  stagedFileName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  stagedFileSize: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11.5,
    marginTop: 2,
  },

  /* ── Buttons ── */
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 8,
  },
  ghostBtn: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostBtnText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UploadScreen;