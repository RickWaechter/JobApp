// Home.js

import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, Pressable, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DraggableFlatList from "react-native-draggable-flatlist";
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Keychain from 'react-native-keychain';
import Modal from 'react-native-modal';
import { Card, Divider, Text } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import {
  decryp,
  decryptBase,
  encryp,
  encryptBase64,
  genIv,
} from '../inc/cryp.js';
import useKeyboardAnimation from '../inc/Keyboard.js';
// Aktivieren des Debug-Modus (optional)
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DB_NAME = 'firstNew.db';

const UploadScreen = ({ selectFilesText, addFilesText, replaceFilesText }) => {
  const { t, i18n } = useTranslation();
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [db, setDb] = useState(null);
  const [expand, setExpand] = useState(false);
  const [buttonOne, setButtonOne] = useState(true);
  const [buttonUpload, setButtonUpload] = useState(true);
  const keyboardHeight = useKeyboardAnimation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [source, setSource] = useState('');
  const [pdfView, setPdfView] = useState(false);
  const [pdfTab, setPdfTab] = useState(false);
  const [isModalSortVisible, setModalSortVisible] = useState(false);
  const orderedKeys = [
    "lebenslauf",
    "add1", "add2", "add3", "add4", "add5",
    "add6", "add7", "add8", "add9", "add10"
  ];
  const router = useRouter();
  const fetchData = async () => {
    try {
      console.log("Opening database...");
      const database = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      setDb(database);
      console.log("Database opened.");

      console.log("Retrieving key from EncryptedStorage...");
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;
      console.log("Key retrieved.", await EncryptedStorage.getItem("key"));

      console.log("Getting device ID...");
      const deviceId = await DeviceInfo.getUniqueId();
      console.log(`Device ID: ${deviceId}`);

      console.log("Executing SQL query...");
      const res = await database.executeSql(
        "SELECT lebenslauf, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?",
        [deviceId]
      );

      const hallo = res[0].rows.raw();
      console.log("Query result:", hallo);

      console.log("Decrypting values and removing nulls...");
      const sortedArray = orderedKeys
        .map((key) => hallo[0][key])
        .filter((value) => value !== null);

      console.log("Decrypting files...");
      const decryptedFiles = await Promise.all(
        sortedArray.map(async (frucht) => {
          const decrypted = await decryp(frucht, myKey);
          console.log(`Decrypted: ${decrypted}`);
          return { key: decrypted, name: decrypted.match(/[^/]+$/)?.[0] || "Unbekannte Datei" };
        })
      );

      console.log("Assigning unique IDs to each entry...");
      const dataWithIds = decryptedFiles.map((item, index) => ({
        ...item,
        id: `${index}-${item.key}`
      }));
      setData(dataWithIds);
      console.log("Data set successfully.");

    } catch (err) {
      console.error("Error in fetchData:", err);
    }
  };
   
  useEffect(() => {
console.log("useEffect triggered" + data.length);
console.log("buttonOne:" + buttonOne);
  }
    , [data, buttonOne]);

    const deleteFileIfExists = async (fileName) => {
      const filePath = `${RNFS.LibraryDirectoryPath}/${fileName}`;
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log(`Datei gelöscht: ${filePath}`);
      } else {
        console.log(`Datei existiert nicht: ${filePath}`);
      }
    };

  const deleteItem = async (idToDelete) => {

    console.log("deleteItem:", idToDelete);
    const newData = data.filter(item => item.id !== idToDelete.id);
    setData(newData);
    console.log("Trying to delete file:", idToDelete.name);
    try {
      await deleteFileIfExists(idToDelete.name);
      await deleteFileIfExists(idToDelete.name + '_1');
      console.log("File deleted successfully.");

      if (!db) return;
      console.log("Saving order...");
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        console.log("Device ID:", deviceId);
        const myKey = await EncryptedStorage.getItem("key");
        console.log("My Key:", myKey);
        const encryptedKeys = await Promise.all(newData.map(async (item) => await encryp(item.key, myKey)));
        console.log("Encrypted Keys:", encryptedKeys);
        const updateValues = orderedKeys.map((key, index) => encryptedKeys[index] || null);
        console.log("Update Values:", updateValues);
        const updateQuery = `UPDATE files SET ${orderedKeys.map((key) => `${key} = ?`).join(", ")} WHERE ident = ?`;
        console.log("Update Query:", updateQuery);
        const queryParams = [...updateValues, deviceId];
        console.log("Query Params:", queryParams);
  
        await db.executeSql(updateQuery, queryParams);
        console.log("Reihenfolge gespeichert mit NULL für leere Felder.");
        if (newData.length < 1) {
          setModalSortVisible(false);

        }
      } catch (error) {
        console.error("Fehler beim Speichern der Reihenfolge:", error);
      }


    } catch (err) {
      console.error("Error while deleting file:", err);
    }
    await saveOrder();

  };
  const sanitizeName = (name) => {
    return name
      .normalize('NFKD')              // strips diacritics so ü → u, etc.
      .replace(/\s+/g, '_')           // whitespace → _
      .replace(/[^\w.-]/g, '')        // keep only letters, numbers, _ . -
      .replace(/_{2,}/g, '_')          // collapse multiple _
      .replace(/^_+|_+$/g, '');        // trim leading/trailing _
  };
  // Löscht ein Element anhand seiner eindeutigen ID
  const handleDragEnd = useCallback(({ data }) => {

    setData(data);


    console.log(data);
  }, []);
 
  const handleFileChange = async () => {
    console.log('handleFileChange called');
    try {
      console.log('Picking files...');
      const results = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: "*/*",          // oder "image/*", "application/pdf"
      copyToCacheDirectory: true,
    });

    if (results.canceled) {
      console.log("❌ Abgebrochen");
      return;
    }

    console.log("✅ Ausgewählt:", results.assets);

    results.assets.forEach((file) => {
      console.log("📄 File:", {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });
    });

      if (results.assets && results.assets.length > 0) {
        console.log('Picked files:', results);
        const documentsDir = RNFS.LibraryDirectoryPath;
        console.log('Documents directory:', documentsDir);
        const processedFiles = await Promise.all(
          results.assets.map(async file => {
            try {
              console.log('Processing file:', file);
              const originalFilePath = decodeURI(file.uri);
              const filePath = `${documentsDir}/${file.name}`;
              console.log('Encrypting file to:', filePath);
              const credentials = await Keychain.getGenericPassword();
              const myKey = credentials.password;
              console.log('Using key:', myKey);
              const theFilePath = await encryp(filePath, myKey);
              console.log('Encrypted file path:', theFilePath);
              const base64String = await RNFS.readFile(
                originalFilePath,
                'base64',
              );
              console.log('Base64 string:', base64String);
              const base641 = base64String.slice(0, 16);
              console.log('Base64 string 1:', base641);
              const base642 = base64String.slice(16);
              console.log('Base64 string 2:', base642.substring(0, 100));
              const iv = await genIv();
              console.log('Generated IV:', iv);
              const encrypted = await encryptBase64(base641, iv, myKey);
              if (encrypted) {
                await RNFS.writeFile(filePath, encrypted, 'base64');
                await RNFS.writeFile(filePath + '_1', base642, 'base64');
                console.log('Encrypted file written to:', filePath);
              } else {
                console.error('Encryption failed: No data to write');
              }

              return {
                name: file.name,
                size: file.size,
                path: theFilePath,
              };
            } catch (err) {
              console.error(
                `Fehler beim Speichern der Datei ${file.name}:`,
                err,
              );
              throw new Error(`Fehler beim Speichern der Datei ${file.name}`);
            }
          }),
        );
        console.log('Processed files:', processedFiles);
        setButtonUpload(false)
        setButtonOne(false)
console.log("buttonOne:", buttonOne, "files:", files.length);
        setFiles(processedFiles);
        setError('');
      } else {
        console.log('No files selected');
        setError('Keine Dateien ausgewählt.');
      }
    } catch (err) {
      console.error('Error in handleFileChange:', err);
    }
  };

  const handleSaveToDB = async () => {
    if (files.length === 0) {
      setError('Keine Dateien ausgewählt.');
      return;
    }
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

    try {
      await Promise.all(
        files.map((file, index) => {
          const column = index === 0 ? 'lebenslauf' : `add${index}`;

          // Falls index > 10 ist, wird die Datei ignoriert
          if (index > 10) return Promise.resolve();

          return new Promise((resolve, reject) => {
            db.executeSql(
              `UPDATE files SET ${column} = ? WHERE ident = ?`,
              [file.path, deviceId],
              (_, result) => {
                console.log(`Updated ${column} with path: ${file.path}`);
                resolve(result);
              },
              error => reject(error),
            );
          });
        }),
      )
        .then(() => console.log('All files updated successfully'))
        .catch(error => console.error('Error updating files:', error));
      setFiles([])
      setButtonOne(true)
      setButtonUpload(true)
      fetchData();
      Alert.alert(
  t('upload.title'),
  t('upload.info'),
  [
    {
      text: "OK",
      onPress: () => router.push("(tabs)"),
    }
  ]
);

      console.log('Alle Dateien wurden aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Dateien:', error);
    }
    if (files.length < 10) {
      for (let i = files.length - 1; i < 10; i++) {
        db.executeSql(
          `UPDATE files SET add${i + 1} = NULL WHERE ident = ?`,
          [deviceId],
          (_, result) => console.log(`Updated add${i + 1} with NULL`),
          error => console.error('Fehler beim Aktualisieren:', error),
        );
      }

      return;
    }
    Alert.alert('Erfolg', 'Dateien wurden in der Datenbank gespeichert.');

  };

  const handleItemClick = async (item) => {
    try {
      const outputPath = `${item.name}`;
      const output = RNFS.LibraryDirectoryPath + '/' + outputPath;
      const temp = RNFS.TemporaryDirectoryPath + '/temp.pdf';

      const myKey = await EncryptedStorage.getItem("key");

      const encData = await RNFS.readFile(output, 'base64');

      const decryptedData = await decryptBase(encData, myKey);

      const encData2 = await RNFS.readFile(output + '_1', 'base64');

      const encData3 = decryptedData + encData2;
      await RNFS.writeFile(temp, encData3, 'base64');
      setSource({
        uri: `file://${temp}`,
        cache: true,
      });


      await EncryptedStorage.setItem("result", "collect");
      setTimeout(() => {
        setPdfView(true);
      }, 300);



    } catch (err) {
      console.error('Fehler beim Teilen der Datei:', err);
    }
  }
  const close = async () => {
    const temp = RNFS.TemporaryDirectoryPath + '/temp.pdf';
    setPdfView(false);
    await RNFS.unlink(temp)

  }

  const handlePdfLoadComplete = (numberOfPages, filePath) => {
    // Wird aufgerufen, wenn das PDF vollständig geladen wurde

    console.log('PDF vollständig geladen.' + filePath);
    console.log('Anzahl der Seiten:', numberOfPages);

  };
  const addToDB = async () => {
    if (files.length === 0) {
      setError('Keine Dateien ausgewählt.');
      return;
    }
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

    try {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT lebenslauf, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
          [deviceId],
          (_, result) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0);
              let columnIndex = 0;

              // Finde die erste freie Spalte
              const columnNames = ['lebenslauf', 'add1', 'add2', 'add3', 'add4', 'add5', 'add6', 'add7', 'add8', 'add9', 'add10'];
              while (columnIndex < columnNames.length && row[columnNames[columnIndex]]) {
                columnIndex++;
              }

              // Falls alle Felder voll sind, nichts speichern
              if (columnIndex >= columnNames.length) {
                console.log('Kein Platz für neue Dateien.');
                return;
              }

              files.forEach((file, index) => {
                if (columnIndex >= columnNames.length) return; // Falls alle Spalten voll sind

                const column = columnNames[columnIndex];
                columnIndex++;

                tx.executeSql(
                  `UPDATE files SET ${column} = ? WHERE ident = ?`,
                  [file.path, deviceId],
                  () => console.log(`Updated ${column} with path: ${file.path}`),
                  error => console.error('Fehler beim Aktualisieren:', error)
                );
              });
            }
          },
          error => console.error('Fehler beim Abrufen der Daten:', error)
        );
      });

      Alert.alert(t('upload.title'), t('upload.info'),);
      setFiles([])
      setButtonOne(true)
      setButtonUpload(true)
      fetchData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Dateien:', error);
    }
  };
  const cont = () => {
    router.push("(tabs)");
  }
  return (
    <View style={styles.container}>
      {buttonUpload && (
        <>
          <Pressable
            onPress={handleFileChange}        // Grund‑Style 
          >
            {({ pressed }) => (
              <View style={[
                styles.entry2,                // Grund‑Layout
                pressed && styles.entryPress // nur solange gedrückt
              ]}>
                <Card.Title
                 title={t('uploadFiles')}
                 titleStyle={styles.job}
               />
                  <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
                <Text style={styles.name}>{t('selectFilesToUpload')}</Text>
              </View>
            )}
          </Pressable>
          
        </>
      )}

      {!buttonOne && (
        <>
         

          <TouchableOpacity
            onPress={handleSaveToDB}
            style={files.length > 0 ? {} : styles.buttonDisabled}
            disabled={files.length === 0}
          >
            <View style={styles.entry2}>
             <Card.Title
                 title={t('saveFile')}
                 titleStyle={styles.job}
               /> 
           <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
              <Text style={styles.name}>{t('saveFileText')}</Text>
            </View>
          </TouchableOpacity>
        </>
      )} 
 <TouchableOpacity
                    onPress={cont}
                 
                  >
<View style={styles.entryFort}>
       <Card.Title
        title={t('Continue')}
        titleStyle={styles.job}>
       </Card.Title>
                  </View>
                  </TouchableOpacity>

      {error !== '' && <Text style={styles.errorText}>{error}</Text>}
      {files.length > 0 && (
        <View style={styles.fileList}>
          <Text style={styles.fileListTitle}>{t('selectedFiles')}:</Text>
          {files.map((file, index) => (
            <Text key={index} style={styles.fileName}>
              {file.name} ({(file.size / 1024).toFixed(0)} KByte)
            </Text>
          ))}
        </View>
      )}
      
      <Modal
        isVisible={isModalSortVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        onBackdropPress={() => { setModalSortVisible(false); setPdfView(false) }}
        style={{
          justifyContent: 'flex-end',
          margin: 0,
        }}
        swipeDirection={['down']}
        onSwipeComplete={() => { setModalSortVisible(false); setPdfView(false) }}
        // Add these handlers:
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => setIsAnimating(false)}
        backdropTransitionOutTiming={1}
        useNativeDriver={false}
      >
        <TouchableWithoutFeedback onPress={() => setModalSortVisible(false)}>
          <Animated.View
            style={[

              {
                height:  data.length < 8 ? 40 + (data.length * 80) : 40 + (8 * 80),
                paddingTop: 10,
                backgroundColor: colors.background, // Damit es sichtbar bleibt
                justifyContent: 'center',
                alignItems: 'center',
               paddingBottom: 0,
                opacity: isAnimating ? 1 : 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }
            ]}>
            <View style={styles.listContainer}>
              <GestureHandlerRootView style={{ flex: 1 }}>
              <DraggableFlatList
                data={data}
                onDragEnd={({ data }) => setData(data)}
                keyExtractor={(item) => item.id}
                renderItem={({ item, drag, isActive }) => (
                  <View style={[styles.card, isActive && styles.cardActive]}>
                    <TouchableOpacity onPress={() => handleItemClick(item)} style={[styles.dragArea, isActive && styles.dragActive]} onLongPress={drag}>
                      <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.name.length > 25 ? item.name.substring(0, 25) + '...': item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() =>
                      Alert.alert(
                        "Erfolg",
                        "Ihre neuen Einstellungen wurden erfolgreich gespeichert",
                        [
                          {
                            text: "OK",
                            onPress: () => {
                              deleteItem(item);

                            },
                          },
                        ]
                      )}>
                      <Text style={styles.deleteButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                )}

              />
</GestureHandlerRootView>
              
              {pdfView && (
                <Modal visible={pdfView} transparent={true} animationType="fade">
                  <View style={styles.overlay}>
                    <View style={styles.popup}>

                      <Pdf source={source} style={styles.pdf}
                        onLoadComplete={handlePdfLoadComplete} />

                      <TouchableOpacity onPress={close} style={styles.closeButton}>
                        <Text style={styles.closeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
            {/* Drag Handle */}



          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',

  },
  overlay: {
    flex: 1,
    backgroundColor: colors.card,

    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextActive: {
    color: "rgb(203, 196, 196)",
  },

  cardActive: {
    borderWidth: 1,
    borderColor: 'gray',

  },
  entryPress: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',


  },
   entryFort: {
      flexDirection: "column",
    backgroundColor: colors.card3,
    paddingTop: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth:1,
    borderColor:'gray',
justifyContent:'center',
width:width * 0.9,

  },
  popup: {


    width: '90%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10, // Schatten für Android
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#E74C3C',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  pdf: {
    width: '100%',
    height: '100%',
    borderRadius: 10, // Optional für abgerundete Ecken
  },
  button: {
    backgroundColor: colors.card3,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    // Schatten (funktioniert auf Android und iOS)
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    maxHeight: '90%',
    width: width * 0.80,
 marginTop: 5,
    borderRadius: 15,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
    position: 'absolute',
    right: 10

  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card3,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    // Schatten für iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dragArea: {
    flex: 1,
    backgroundColor: colors.card3,
    color: colors.card,

    padding: 10,

  },

  itemText: {
    color: "rgb(232, 225, 247)",
  },
  entry: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',
    maxWidth: width * 0.90,

  },
  entry2: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',
    width: width * 0.90,

  },
  name: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "#C8C8C8",
    marginBottom: 10,
    minWidth: width * 0.80,
  },
  job: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#E5E5E5",

  },



  buttonDisabled: {
    opacity: 0.6,
  },

  errorText: {
    color: 'red',
    marginTop: 12,
  },
  fileList: {
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'left',
  },
  fileListTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'left',
    color: 'white'
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },

  fileName: {
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
  },
});
export default UploadScreen;
