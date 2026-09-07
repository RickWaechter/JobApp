// Home.js / UploadScreen.js
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import DeviceInfo from 'react-native-device-info';
import DraggableFlatList from 'react-native-draggable-flatlist';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Keychain from 'react-native-keychain';
import Pdf from 'react-native-pdf';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';

import colors from '../../inc/colors.js';
import {
  decryp,
  decryptBase,
  encryp,
  encryptBase64,
  genIv,
} from '../../inc/cryp.js';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const { width, height } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const orderedKeys = [
  'lebenslauf',
  'add1', 'add2', 'add3', 'add4', 'add5',
  'add6', 'add7', 'add8', 'add9', 'add10',
];

/* ── Wiederverwendbare Dashboard Card ───────────────────── */
const DocumentActionCard = memo(({ title, description, iconName, onPress, isPrimary = false, badgeText }) => (
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
      <View style={styles.cardTitleRow}>
        <Text style={[styles.cardTitle, isPrimary && styles.primaryCardTitle]} numberOfLines={1}>
          {title}
        </Text>
        {Boolean(badgeText) && (
          <View style={styles.inlineBadge}>
            <Text style={styles.inlineBadgeText}>{badgeText}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={22}
      color={isPrimary ? 'rgba(255,255,255,0.7)' : 'rgba(255, 255, 255, 0.3)'}
    />
  </Pressable>
));

const UploadScreen = () => {
  const { t } = useTranslation();

  /* ── States ──────────────────────────────────────────── */
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);
  const [db, setDb] = useState(null);
  const [source, setSource] = useState({});
  const [pdfView, setPdfView] = useState(false);
  const [isModalSortVisible, setModalSortVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ── Fetch Data from DB ──────────────────────────────── */
  const fetchData = async () => {
    try {
      const database = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      setDb(database);

      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;
      const deviceId = await DeviceInfo.getUniqueId();

      const res = await database.executeSql(
        'SELECT lebenslauf, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
        [deviceId]
      );

      const resultRows = res[0].rows.raw();
      if (resultRows.length === 0) {
        setData([]);
        return;
      }

      const row = resultRows[0];
      const sortedArray = orderedKeys
        .map((key) => ({ column: key, value: row[key] }))
        .filter((item) => item.value !== null);

      const allDecryptedPaths = await Promise.all(
        sortedArray.map(async (item) => await decryp(item.value, myKey))
      );

      const uniquePathsArray = [...new Set(allDecryptedPaths)];

      // Bereinigung in DB falls Duplikate vorhanden sind
      const encryptedForDb = await Promise.all(
        uniquePathsArray.map(async (path) => await encryp(path, myKey))
      );

      const updateValues = orderedKeys.map((_, index) => encryptedForDb[index] || null);
      const queryParams = [...updateValues, deviceId];
      const updateQuery = `UPDATE files SET ${orderedKeys.map((key) => `${key} = ?`).join(', ')} WHERE ident = ?`;
      await database.executeSql(updateQuery, queryParams);

      // UI Liste generieren
      const uiData = uniquePathsArray.map((filePath, index) => {
        const fileName = filePath.match(/[^/]+$/)?.[0] || 'Unbekannte Datei';
        return {
          id: index.toString(),
          name: fileName,
          path: filePath,
          column: orderedKeys[index],
        };
      });

      setData(uiData);
    } catch (err) {
      console.error('Error in fetchData:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  /* ── File Deletion ───────────────────────────────────── */
  const deleteFileIfExists = async (fileName) => {
    const filePath = `${RNFS.LibraryDirectoryPath}/${fileName}`;
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
  };

  const deleteItem = async (itemToDelete) => {
    const newData = data.filter((item) => item.id !== itemToDelete.id);
    setData(newData);

    try {
      await deleteFileIfExists(itemToDelete.name);
      await deleteFileIfExists(`${itemToDelete.name}_1`);

      if (!db) return;

      const deviceId = await DeviceInfo.getUniqueId();
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;

      const encryptedValues = await Promise.all(
        newData.map(async (item) => {
          const valueToSave = item.path || item.name;
          return await encryp(valueToSave, myKey);
        })
      );

      const dbValues = orderedKeys.map((key, index) => encryptedValues[index] || null);
      const updateQuery = `UPDATE files SET ${orderedKeys.map((key) => `${key} = ?`).join(', ')} WHERE ident = ?`;
      await db.executeSql(updateQuery, [...dbValues, deviceId]);

      if (newData.length < 1) {
        setModalSortVisible(false);
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

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
        Alert.alert(t('profil.error') || 'Fehler', t('upload.error') || 'Maximal 11 Dateien erlaubt.');
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
              decrypName: file.name,
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

  /* ── Speichern: Alle bestehenden ersetzen ─────────────── */
  const handleSaveToDB = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const database = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

      await Promise.all(
        files.map((file, index) => {
          const column = index === 0 ? 'lebenslauf' : `add${index}`;
          if (index > 10) return Promise.resolve();

          return new Promise((resolve, reject) => {
            database.executeSql(
              `UPDATE files SET ${column} = ? WHERE ident = ?`,
              [file.name, deviceId],
              (_, res) => resolve(res),
              (err) => reject(err)
            );
          });
        })
      );

      if (files.length < 10) {
        for (let i = files.length - 1; i < 10; i++) {
          await database.executeSql(
            `UPDATE files SET add${i + 1} = NULL WHERE ident = ?`,
            [deviceId]
          );
        }
      }

      setFiles([]);
      fetchData();
      Alert.alert(t('upload.title') || 'Erfolg', t('upload.info') || 'Dateien wurden aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Ersetzen:', error);
      Alert.alert('Fehler', 'Dateien konnten nicht gespeichert werden.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Speichern: Zu bestehenden hinzufügen ─────────────── */
  const addToDB = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const database = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

      database.transaction((tx) => {
        tx.executeSql(
          'SELECT lebenslauf, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
          [deviceId],
          (_, result) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0);
              let columnIndex = 0;
              const columnNames = ['lebenslauf', 'add1', 'add2', 'add3', 'add4', 'add5', 'add6', 'add7', 'add8', 'add9', 'add10'];

              while (columnIndex < columnNames.length && row[columnNames[columnIndex]]) {
                columnIndex++;
              }

              if (columnIndex >= columnNames.length) {
                Alert.alert('Speicher voll', 'Es können maximal 11 Anlagen hinterlegt werden.');
                return;
              }

              files.forEach((file) => {
                if (columnIndex >= columnNames.length) return;
                const column = columnNames[columnIndex];
                columnIndex++;

                tx.executeSql(
                  `UPDATE files SET ${column} = ? WHERE ident = ?`,
                  [file.name, deviceId]
                );
              });
            }
          }
        );
      });

      setFiles([]);
      fetchData();
      Alert.alert(t('upload.title') || 'Erfolg', t('upload.info') || 'Anlagen erfolgreich hinzugefügt.');
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      Alert.alert('Fehler', 'Dateien konnten nicht angehängt werden.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Sortierung persistieren ─────────────────────────── */
  const handleNewSort = async (reorderedData) => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;

      const encryptedSortedFiles = await Promise.all(
        reorderedData.map(async (item) => {
          const valueToSave = item.path || item.name;
          return await encryp(valueToSave, myKey);
        })
      );

      const dbValues = orderedKeys.map((key, index) => encryptedSortedFiles[index] || null);
      const updateQuery = `UPDATE files SET ${orderedKeys.map((key) => `${key} = ?`).join(', ')} WHERE ident = ?`;

      await db.executeSql(updateQuery, [...dbValues, deviceId]);
      fetchData();
    } catch (error) {
      console.error('Fehler beim Speichern der Sortierung:', error);
    }
  };

  /* ── PDF Vorschau ────────────────────────────────────── */
  const handleItemClick = async (item) => {
    try {
      const output = `${RNFS.LibraryDirectoryPath}/${item.name}`;
      const temp = `${RNFS.TemporaryDirectoryPath}/temp.pdf`;
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;

      const encData = await RNFS.readFile(output, 'base64');
      const decryptedData = await decryptBase(encData, myKey);
      const encData2 = await RNFS.readFile(`${output}_1`, 'base64');

      const encData3 = decryptedData + encData2;
      await RNFS.writeFile(temp, encData3, 'base64');

      setSource({ uri: `file://${temp}`, cache: true });
      setModalSortVisible(false);
      setTimeout(() => setPdfView(true), 450);
    } catch (err) {
      console.error('Fehler beim Laden der Vorschau:', err);
    }
  };

  const closePdf = async () => {
    try {
      const temp = `${RNFS.TemporaryDirectoryPath}/temp.pdf`;
      const exists = await RNFS.exists(temp);
      if (exists) await RNFS.unlink(temp);
      setPdfView(false);
      setTimeout(() => setModalSortVisible(true), 450);
    } catch (err) {
      setPdfView(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.badgeHub}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeHubText}>DOKUMENTE & ANLAGEN</Text>
          </View>
          <Text style={styles.titleMain}>Unterlagen verwalten</Text>
          <Text style={styles.subtitleMain}>
            Lade deinen Lebenslauf und Zeugnisse hoch oder passe die Reihenfolge deiner Mappe an.
          </Text>
        </View>

        {/* ── Normaler Modus ── */}
        {files.length === 0 ? (
          <View style={styles.cardsWrapper}>
            <DocumentActionCard
              isPrimary={true}
              iconName="upload-file"
              title={t('uploadFiles') || 'Dateien auswählen'}
              description={t('selectFilesToUpload') || 'PDFs oder Bilder von deinem Gerät auswählen.'}
              onPress={handleFileChange}
            />

            <DocumentActionCard
              iconName="reorder"
              title={t('sortAttachments') || 'Anlagen sortieren'}
              description={t('sortAttachmentsDescription') || 'Reihenfolge ändern, löschen oder Vorschau öffnen.'}
              badgeText={`${data.length} Datei${data.length === 1 ? '' : 'en'}`}
              onPress={() => {
                if (data.length > 0) setModalSortVisible(true);
                else Alert.alert('Keine Anlagen', 'Bitte lade zuerst Unterlagen hoch.');
              }}
            />
          </View>
        ) : (
          /* ── Staging Modus ── */
          <View style={styles.stagedContainer}>
            <View style={styles.stagedCard}>
              <View style={styles.stagedHeader}>
                <View style={styles.stagedHeaderLeft}>
                  <MaterialIcons name="inventory-2" size={20} color="#60A5FA" />
                  <Text style={styles.stagedTitle}>
                    {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} ausgewählt
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFiles([])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cancelText}>Verwerfen</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.stagedList} showsVerticalScrollIndicator={false}>
                {files.map((file, index) => (
                  <View key={index} style={styles.stagedItem}>
                    <MaterialIcons name="picture-as-pdf" size={18} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.stagedFileName} numberOfLines={1}>
                      {file.decrypName}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Staging Buttons */}
            <View style={styles.stagedActionGroup}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={addToDB}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnPrimaryText}>Zu bestehenden hinzufügen</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={handleSaveToDB}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <MaterialIcons name="sync" size={18} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Alle alten Dateien ersetzen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Sortier-Modal (Native React Native Modal) ── */}
      <Modal
  isVisible={isModalSortVisible}
  animationIn="zoomIn"
  animationOut="zoomOut"
  animationInTiming={260}
  animationOutTiming={400}
  backdropTransitionInTiming={260}
  backdropTransitionOutTiming={400}
  backdropOpacity={0.7}
  hideModalContentWhileAnimating={true}
  useNativeDriver={true}
  useNativeDriverForBackdrop={true}
  statusBarTranslucent={true}
  onBackdropPress={() => setModalSortVisible(false)}
  onBackButtonPress={() => setModalSortVisible(false)}
  style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
>
  {/* Dein Modal Inhalt */}

        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalSortVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.sortModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('sortAttachments') || 'Anlagen sortieren'}</Text>
                <Text style={styles.modalSubtitle}>Gedrückt halten & ziehen, um zu ordnen</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalSortVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <GestureHandlerRootView style={styles.listWrapper}>
              <DraggableFlatList
                data={data}
                onDragEnd={({ data: reorderedData }) => {
                  setData(reorderedData);
                  handleNewSort(reorderedData);
                }}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, getIndex, drag, isActive }) => {
                  const currentIndex = getIndex?.() ?? 0;
                  const isFirst = currentIndex === 0;

                  return (
                    <View style={[styles.sortCard, isActive && styles.sortCardActive]}>
                      <View style={[styles.badge, isFirst && styles.badgeCv]}>
                        <Text style={styles.badgeText}>{isFirst ? 'CV' : `${currentIndex}`}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleItemClick(item)}
                        onLongPress={drag}
                        delayLongPress={150}
                        style={styles.fileInfoArea}
                      >
                        <MaterialIcons
                          name="picture-as-pdf"
                          size={20}
                          color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sortFileName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.sortFileRole}>
                            {isFirst ? 'Hauptdokument (Lebenslauf)' : `Anhang ${currentIndex}`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() =>
                            Alert.alert('Anhang löschen', `Möchtest du "${item.name}" wirklich entfernen?`, [
                              { text: 'Abbrechen', style: 'cancel' },
                              { text: 'Löschen', style: 'destructive', onPress: () => deleteItem(item) },
                            ])
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onLongPress={drag}
                          delayLongPress={100}
                          style={styles.dragHandle}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialIcons
                            name="drag-indicator"
                            size={22}
                            color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            </GestureHandlerRootView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setModalSortVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>Fertig</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PDF Preview Modal (Native React Native Modal) ── */}
      <Modal
       isVisible={pdfView}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={300}
        animationOutTiming={300}
        backdropTransitionInTiming={300}
        backdropTransitionOutTiming={300}
        backdropOpacity={0.7}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closePdf}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.pdfModalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.pdfHeaderTitleWrap}>
                <MaterialIcons name="picture-as-pdf" size={20} color="#60A5FA" />
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Dokumentenvorschau
                </Text>
              </View>
              <TouchableOpacity
                onPress={closePdf}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfWrapper}>
              <Pdf source={source} style={styles.pdf} />
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

  /* ── Action Cards ── */
  cardsWrapper: {
    gap: 16,
    marginVertical: 'auto',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 18,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryCardTitle: {
    fontWeight: '800',
  },
  inlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  inlineBadgeText: {
    color: '#60A5FA',
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12.5,
    lineHeight: 17,
  },

  /* ── Staging Modus ── */
  stagedContainer: {
    flex: 1,
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  stagedCard: {
    backgroundColor: '#171B26',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: height * 0.45,
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
    fontSize: 14,
    fontWeight: '700',
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '600',
  },
  stagedList: {
    marginTop: 8,
  },
  stagedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  stagedFileName: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    flex: 1,
  },
  stagedActionGroup: {
    gap: 10,
    marginTop: 14,
  },
  btnPrimary: {
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  btnSecondary: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },

  /* ── Native Modal Wrappers ── */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 12, 0.8)',
  },
  sortModalContainer: {
    width: width * 0.92,
    maxHeight: '82%',
    backgroundColor: '#171B26',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11.5,
    marginTop: 2,
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
  listWrapper: {
    maxHeight: 380,
    marginVertical: 10,
  },
  sortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortCardActive: {
    borderColor: 'rgba(59, 130, 246, 0.6)',
    backgroundColor: '#1E2433',
    transform: [{ scale: 1.02 }],
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeCv: {
    backgroundColor: '#3B82F6',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  fileInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortFileName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  sortFileRole: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trashBtn: {
    padding: 6,
    marginRight: 2,
  },
  dragHandle: {
    padding: 6,
  },
  modalDoneBtn: {
    width: '100%',
    height: 46,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },

  /* ── PDF Preview Modal Container ── */
  pdfModalContainer: {
    width: width * 0.94,
    height: height * 0.88,
    backgroundColor: '#171B26',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    padding: 14,
  },
  pdfHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pdfWrapper: {
    flex: 1,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F1117',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default UploadScreen;