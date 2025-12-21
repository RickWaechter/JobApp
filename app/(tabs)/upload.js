// Home.js

import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, Pressable, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DraggableFlatList from "react-native-draggable-flatlist";
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import * as Keychain from 'react-native-keychain';
import Modal from 'react-native-modal';
import { Card, Divider, Text } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import SQLite from 'react-native-sqlite-storage';
import { Portal, Dialog, Button } from 'react-native-paper';
import colors from '../../inc/colors.js';
import {
  decryp,
  decryptBase,
  encryp,
  encryptBase64,
  genIv,
} from '../../inc/cryp.js';
import useKeyboardAnimation from '../../inc/Keyboard.js';
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
  const fetchData = async () => {
  try {
    console.log("Opening database...");
    // Nutze 'database' als lokale Variable für den ganzen Block
    const database = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    setDb(database);
    console.log("Database opened.");

    console.log("Retrieving key...");
    const credentials = await Keychain.getGenericPassword();
    const myKey = credentials.password;
    console.log("Getting device ID...");
    const deviceId = await DeviceInfo.getUniqueId();

    console.log("Executing SQL query...");
    const res = await database.executeSql(
      "SELECT lebenslauf, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?",
      [deviceId]
    );

    const resultRows = res[0].rows.raw();
    
    // Sicherheitscheck: Gibt es überhaupt eine Zeile?
    if (resultRows.length === 0) {
      console.log("Keine Daten gefunden.");
      setData([]);
      return;
    }

    const row = resultRows[0];
    
    // 1. Daten auslesen und Null-Werte filtern
    const sortedArray = orderedKeys
      .map(key => ({ column: key, value: row[key] }))
      .filter(item => item.value !== null);

    // 2. Alles entschlüsseln
    console.log("Decrypting files...");
    const allDecryptedPaths = await Promise.all(
      sortedArray.map(async (item) => {
        return await decryp(item.value, myKey); // Gibt nur den String (Pfad) zurück
      })
    );

    // 3. Duplikate entfernen (Set erstellt Liste einzigartiger Pfade)
    const uniquePathsSet = new Set(allDecryptedPaths);
    const uniquePathsArray = [...uniquePathsSet]; // Das sind die sauberen, lesbaren Pfade
    
    console.log("Unique files (decrypted):", uniquePathsArray);


    // --- TEIL A: DATENBANK UPDATE (Verschlüsseln) ---

    // Wir verschlüsseln die saubere Liste neu für die Datenbank
    const encryptedForDb = await Promise.all(
      uniquePathsArray.map(async (path) => {
        return await encryp(path, myKey);
      })
    );

    // Wir mappen die verschlüsselten Werte auf die festen Spalten (orderedKeys)
    // Wenn wir weniger Dateien haben als Spalten, füllen wir mit null auf
    const updateValues = orderedKeys.map((_, index) => {
      return encryptedForDb[index] || null;
    });

    const queryParams = [...updateValues, deviceId];
    const updateQuery = `UPDATE files SET ${orderedKeys.map(key => `${key} = ?`).join(", ")} WHERE ident = ?`;

    console.log("Updating DB cleanup...");
    await database.executeSql(updateQuery, queryParams);
    console.log("Datenbank erfolgreich bereinigt.");


    // --- TEIL B: UI UPDATE (Lesbare Daten) ---
    
    // Hier nutzen wir 'uniquePathsArray' (die entschlüsselten), nicht die aus der DB!
    console.log("Building UI data...");
    
    const uiData = uniquePathsArray.map((filePath, index) => {
      // Dateinamen aus dem Pfad extrahieren (alles nach dem letzten /)
      const fileName = filePath.match(/[^/]+$/)?.[0] || "Unbekannte Datei";
      
      return {
        id: index.toString(),      // Eindeutige ID für FlatList
        name: fileName,            // Der Name, der angezeigt wird (z.B. cv.pdf)
        path: filePath,            // Der volle Pfad (für Logik)
        column: orderedKeys[index] // (Optional) In welcher Spalte es jetzt liegt
      };
    });

    setData(uiData);
    console.log("Data set successfully for UI.");

  } catch (err) {
    console.error("Error in fetchData:", err);
  }
};
  useFocusEffect(
    useCallback(() => {
      console.log("Drawer-Screen geöffnet oder erneut geöffnet!");


      fetchData();

      // Deine Funktion hier ausführen


      return () => {
        console.log("Drawer-Screen wird verlassen.");
      };
    }, [])
  );
  useEffect(() => {
console.log("useEffect triggered" + data.length);
console.log("buttonOne:" + buttonOne);
  }
    , [data, buttonOne, pdfView]);

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

  const deleteItem = async (itemToDelete) => {
  console.log("Starte Löschvorgang für:", itemToDelete.name);

  // 1. UI sofort aktualisieren (Optimistic Update)
  // Wir filtern das gelöschte Element aus der aktuellen Liste
  const newData = data.filter(item => item.id !== itemToDelete.id);
  setData(newData);

  try {
    // 2. Physische Dateien löschen (vom Gerätespeicher)
    console.log("Lösche physische Dateien...");
    await deleteFileIfExists(itemToDelete.name); // oder itemToDelete.path, je nach deiner Funktion
    await deleteFileIfExists(itemToDelete.name + '_1'); // Falls du Thumbnails/Kopien hast
    console.log("Physische Dateien gelöscht.");

    if (!db) return;

    // 3. Datenbank aktualisieren
    console.log("Bereite Datenbank-Update vor...");
    
    const deviceId = await DeviceInfo.getUniqueId();
    const credentials = await Keychain.getGenericPassword();
    const myKey = credentials.password; // oder await EncryptedStorage.getItem("key")

    // WICHTIG: Wir verschlüsseln die verbleibenden Daten neu.
    // Wir nehmen 'newData' (die Liste OHNE das gelöschte Item).
    // Dadurch rücken alle nachfolgenden Items automatisch eine Position nach oben.
    const encryptedValues = await Promise.all(
      newData.map(async (item) => {
        // Hier item.path (der volle Pfad) oder item.name verschlüsseln
        // Basierend auf deiner fetchData Funktion ist 'path' das, was in die DB gehört.
        const valueToSave = item.path || item.name; 
        return await encryp(valueToSave, myKey);
      })
    );

    // 4. Auf die Spalten verteilen (Auffüllen mit NULL)
    // orderedKeys ist z.B. ['lebenslauf', 'add1', 'add2', ...]
    const dbValues = orderedKeys.map((key, index) => {
      // Wenn wir noch verschlüsselte Werte haben, nimm sie. Sonst NULL.
      return encryptedValues[index] || null;
    });

    const updateQuery = `UPDATE files SET ${orderedKeys.map(key => `${key} = ?`).join(", ")} WHERE ident = ?`;
    const queryParams = [...dbValues, deviceId];

    console.log("Führe SQL Update aus...");
    await db.executeSql(updateQuery, queryParams);
    
    // Optional: fetchData aufrufen, um sicherzugehen, dass DB und UI synchron sind
    // fetchData(); 

    console.log("Datenbank erfolgreich aktualisiert. Lücke geschlossen.");

    // Modal schließen, wenn keine Dateien mehr da sind
    if (newData.length < 1) {
      setModalSortVisible(false);
    }

  } catch (error) {
    console.error("Fehler im deleteItem Prozess:", error);
    // Optional: Hier könntest du setData(data) aufrufen, um die Löschung in der UI rückgängig zu machen, falls der Server-Call fehlschlägt.
  }
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
if (results.assets.length > 11) {
     Alert.alert(t('profil.error'), t('upload.error'));
      return;
    }
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
              const theFilePath = await encryp(file.name, myKey);
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
                name: theFilePath,
                size: file.size,
                path: filePath,
                decrypName: file.name,
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
              [file.name, deviceId],
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
      Alert.alert(t('upload.title'), t('upload.info'),);
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

      setModalSortVisible(false);
      await EncryptedStorage.setItem("result", "collect");
      setTimeout(() => {
        setPdfView(true); 
      }, 300);



    } catch (err) {
      console.error('Fehler beim Teilen der Datei:', err);
    }
  }
const close = async () => {
  try {
    const temp = `${RNFS.TemporaryDirectoryPath}/temp.pdf`;
    console.log("PDF schließen. Temp path:", temp);


    const exists = await RNFS.exists(temp);

    if (exists) {
      await RNFS.unlink(temp);
      setPdfView(false);
      setTimeout(() => {
        setModalSortVisible(true)
      }, 300)
      console.log("Temp PDF gelöscht.");
    } else {
      console.log("Temp PDF existiert nicht, kein Löschen nötig.");
      setPdfView(false);
    }

  } catch (err) {
    console.log("Fehler beim Schließen:", err);
  }
};



  const addToDB = async () => {
    let error;
    if (files.length === 0) {
      setError('Keine Dateien ausgewählt.');
      return;
    }
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

    try {
      db.transaction(tx  =>  {
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
                console.log(`Spalte ${columnNames[columnIndex]} belegt.`);
              }

              // Falls alle Felder voll sind, nichts speichern
              if (columnIndex >= columnNames.length) {
                  console.log('Kein Platz für neue Dateien.');
                return;
              }

              files.forEach((file, index) => {
                if (columnIndex >= columnNames.length) return; // Falls alle Spalten voll sind

                const column = columnNames[columnIndex];
                console.log(`Speichere Datei in Spalte: ${column}`);
                columnIndex++;

                tx.executeSql(
                  `UPDATE files SET ${column} = ? WHERE ident = ?`,
                  [file.name, deviceId],
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
  
  const handleNewSort = async (data) => {
  console.log("Starte Neusortierung...", data.length, "Dateien");

  try {
    const deviceId = await DeviceInfo.getUniqueId();
    // Falls du Keychain nutzt, nimm das. Ansonsten EncryptedStorage wie in deinem Snippet:
    const myKey = await EncryptedStorage.getItem("key"); 

    // SCHRITT 1: Die sortierten Daten verschlüsseln
    // Wir gehen durch die 'data'-Liste (die bereits die neue Reihenfolge hat)
    const encryptedSortedFiles = await Promise.all(
      data.map(async (item) => {
        // WICHTIG: Wir müssen den Pfad (item.path) verschlüsseln, nicht den key!
        // item.path kommt aus deiner fetchData-Struktur.
        const valueToSave = item.path || item.name; 
        return await encryp(valueToSave, myKey);
      })
    );

    // SCHRITT 2: Werte auf die Datenbank-Spalten mappen
    // Wir nutzen 'orderedKeys' (['lebenslauf', 'add1', ...]), um sicherzustellen,
    // dass wir immer die richtige Anzahl an Argumenten für SQL haben.
    const dbValues = orderedKeys.map((key, index) => {
      // Existiert an Position 'index' eine Datei? Dann nimm sie.
      // Wenn nicht (weil wir weniger Dateien als Spalten haben), setze NULL.
      return encryptedSortedFiles[index] || null;
    });

    // SCHRITT 3: Ein einziges, effizientes SQL-Update
    const updateQuery = `UPDATE files SET ${orderedKeys.map(key => `${key} = ?`).join(", ")} WHERE ident = ?`;
    
    // Die Parameter für SQL: Erst die Werte für die Spalten, dann die ID für WHERE
    const queryParams = [...dbValues, deviceId];

    console.log("Führe SQL Update aus...");
    // console.log("Query:", updateQuery); // Zum Debuggen einkommentieren
    // console.log("Params:", queryParams); // Zum Debuggen einkommentieren

    await db.executeSql(updateQuery, queryParams);

    console.log('Reihenfolge erfolgreich in DB gespeichert.');
    
    // UI neu laden, um sicherzugehen, dass alles synchron ist
    fetchData();

  } catch (error) {
    console.error('Fehler beim Speichern der Sortierung:', error);
  }
};
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
          <Pressable
            onPress={() => {data.length > 0 ? setModalSortVisible(true) : Alert.alert(t('sortAttachments'), t('sortAttachmentsDescription'))}}        // Grund‑Style 
          >
            {({ pressed }) => (
              <View style={[
                styles.entry2,                // Grund‑Layout
                pressed && styles.entryPress // nur solange gedrückt
              ]}>
                 <Card.Title
                 title={t('sortAttachments')}
                 titleStyle={styles.job}
               />
                 <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
                <Text style={styles.name}>{t('sortAttachmentsDescription')}</Text>
              </View>
            )}
          </Pressable>
        </>
      )}

      {!buttonOne && (
        <>
          <TouchableOpacity
            onPress={addToDB}
            style={files.length > 0 ? {} : styles.buttonDisabled}
            disabled={files.length === 0}
          >
            <View style={styles.entry2}>
<Card.Title
                 title={t('addAttachment')}
                 titleStyle={styles.job}
               />              
               <Text style={styles.name}>{t('addAttachmentsToApplication')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveToDB}
            style={files.length > 0 ? {} : styles.buttonDisabled}
            disabled={files.length === 0}
          >
            <View style={styles.entry2}>
             <Card.Title
                 title={t('replaceOldFiles')}
                 titleStyle={styles.job}
               /> 
            
              <Text style={styles.name}>{t('replaceExistingAttachments')}</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {error !== '' && <Text style={styles.errorText}>{error}</Text>}
      <GestureHandlerRootView style={{position:"relative"}}>
      {files.length > 0 && (
        <View style={styles.fileList}>
          <Text style={styles.fileListTitle}>{t('selectedFiles')}:</Text>
      <ScrollView style={{maxHeight: 100}}>

          {files.map((file, index) => (

            <Text key={index} style={styles.fileName}>
              {file.decrypName} 
            </Text>
          ))}
             </ScrollView>

        </View>

      )}
     
      </GestureHandlerRootView>
      <Modal
        isVisible={isModalSortVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        onBackdropPress={() =>setModalSortVisible(false)}
        style={{
          justifyContent: 'center',
          margin: 0,
        }}
        onSwipeComplete={() =>setModalSortVisible(false)  }
        // Add these handlers:
        backdropTransitionOutTiming={1} 
        useNativeDriver={false}
          propagateSwipe={true}
      >
          <Animated.View
            style={[

              {
                height:  data.length < 8 ? 40 + (data.length / 1 * 80) : 40 + (8 * 80),
                backgroundColor: colors.background, // Damit es sichtbar bleibt
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '90%',
               paddingBottom: 0,
                opacity: 1,
               borderRadius:20,
                width: width * 0.9,
                alignSelf: 'center',
              }
            ]}>
            <View style={styles.listContainer}>
              <GestureHandlerRootView style={{ flex: 1 }}>
              <DraggableFlatList
                data={data}
                onDragEnd={({ data }) => {setData(data), handleNewSort(data)}}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index, drag, isActive }) => ( 
                  console.log("index:", item),
                  <View style={{
                    flexDirection: 'column',}}>
                      <View><Text style={{color: "white", alignSelf: "center", fontSize: 18,  justifyContent: 'center'}}>{item.id.split("")[0] === "0" ? 'Lebenslauf' : "Anlage " + item.id.split("")[0]}</Text></View>
                  <View style={[styles.card, isActive && styles.cardActive]}>
                       {/* Nummern oder Lebenslauf */}
                       
                    <TouchableOpacity onPress={() => handleItemClick(item)} style={[styles.dragArea, isActive && styles.dragActive]} onLongPress={drag}>
                      <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.name.length > 25 ? item.name.substring(0, 25) + '...': item.name}</Text>
                    </TouchableOpacity>
                  
                    <TouchableOpacity style={styles.deleteButton} 
                      delayLongPress={300}
                     onPress={() =>
                      Alert.alert(
      "Erfolg",
      "Ihre neuen Einstellungen wurden erfolgreich gespeichert",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => deleteItem(item),
        },
      ]
    )}
      onLongPress={() => {
    // LongPress IGNORIERT das Alert
    deleteItem(item)
  }}
    >
                      <Text style={styles.deleteButtonText}>X</Text>
                    </TouchableOpacity>
              </View>

                  </View>
                )}

              />
</GestureHandlerRootView>
              
            </View>
            {/* Drag Handle */}


          </Animated.View>
         

      </Modal>
      
         <Modal
      isVisible={pdfView}
      animationIn="zoomIn"
      animationOut="zoomOut">
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Pdf
          
            source={source}
            style={styles.pdf}
          />

          <TouchableOpacity
            onPress={close}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: colors.background,

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
    marginBottom: 40,
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
        alignSelf: "center",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgb(179, 176, 184)",
    marginBottom: 10,
    maxWidth: '80%',
    lineHeight:19,
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
    alignItems: 'center',
  },
  fileListTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: ',center',
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
    color: 'white'
  },
});
export default UploadScreen;
