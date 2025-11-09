import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  SafeAreaView
} from 'react-native-safe-area-context';


import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import "react-native-gesture-handler";
import { Card, Divider } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import { decryp, encryp } from '../inc/cryp.js';
import '../local/i18n.js';
const DB_NAME = 'firstNew.db';
const OldScreen = () => {

        const { t } = useTranslation();
  const [entries , setEntries] = useState([]);
  const [pdfView, setPdfView] = useState(false);  
  const [source, setSource] = useState({});
  const navigate = useNavigation();

  useEffect(() => {
    console.log('OldScreen mounted');
   getOld();
  }
  , []);
  const saveToStorage = async (entry) => {
    try {
      await EncryptedStorage.setItem("job", entry.job);
      await EncryptedStorage.setItem("text", entry.text);
      await EncryptedStorage.setItem("subject", entry.subject);
      router.push("/nameOld");
      console.log("Gespeichert:", { job: entry.job, text: entry.text });
    } catch (error) {
      console.log("Fehler beim Speichern:", error);
    }
  };
  
  const OldApp = async (entry) => {


    if (entry.link.length > 2) {
      console.log('link' + entry.link + '.pdf');
          await EncryptedStorage.setItem("merge", entry.link + '.pdf');
          console.log('link' + entry.link);
          router.push("/collect");
  }
  else {
    console.log('link' + entry.link);
  Alert.alert('Datei nicht gefunden', 'Die Datei ist nicht mehr vorhanden oder wurde gelöscht.', );

  };
  };

const deleteIt = async () => {
  setPdfView(false)
  const outputPath = `${RNFS.LibraryDirectoryPath}/Bewerbungsmappe_test.pdf`;
  await RNFS.unlink(outputPath)

}


const getOld = async () => {
  const regex = /([^\/]*)$/;

    const deviceId = await DeviceInfo.getUniqueId();
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    console.log('Database opened');
    db.transaction(tx => {
        console.log('Executing SQL query with WHERE clause');
        tx.executeSql(
          'SELECT old, mergePdf FROM files WHERE ident = ?;',
          [deviceId],
          async (_, { rows }) => {
            if (rows.length > 0) {
              console.log('Entry found for deviceId:', deviceId);
              const data = rows.item(0);
                console.log('data' + data.old);
                if (data.old.length < 1) {
                  Alert.alert(
                    "Keine Einträge vorhanden",
                    "",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          router.replace("/(tabs)");
                        },
                      },
                    ],
                    { cancelable: false }
                  );
                  return;
                }
                const encData = await decryp(data.old, await EncryptedStorage.getItem('key'));
              const oldFull = encData.split(";");
              const key = await EncryptedStorage.getItem('key');  
          console.log('Key:', key);
          const decData = await decryp(data.mergePdf, key);
          console.log('Decrypted data:', decData); 
      
              const newEntries = [];
              
              for (let i = oldFull.length - 1; i >= 0; i--) {
               
                const oldSplit = oldFull[i].split("#");
               
                const oldArray = decData.split(",");
              
             
             
               
                const output = oldArray[i]
               console.log('output' + output);
                if (oldSplit.length >= 3) {
                  console.log(oldSplit[0], oldSplit[1], oldSplit[2]);
                  newEntries.push({
                    job: oldSplit[0],
                    text: oldSplit[5],
                    myType: oldSplit[2] + ' / ' + oldSplit[3],
                    subject: oldSplit[4] || "Kein Betreff",
                    date: oldSplit[1],
                    link: output,
                  });
                }
              }
              setEntries(newEntries);
              console.log('Entries:', newEntries);
            }
          
            });
          });
        };
        const deleteEntry = async (indexToDelete) => {
          try {
            const newList = [...entries];
            const removed = newList.splice(indexToDelete, 1);
            setEntries(newList);
        
            // Bereite die neuen Strings für die DB vor
            const oldParts = newList.map(entry =>
              `${entry.job}#${entry.date}#${entry.myType.split(" / ")[0]}#${entry.myType.split(" / ")[1]}#${entry.subject}#${entry.text}`
            );
            const pdfLinks = newList.map(entry => entry.link);
        
            const key = await EncryptedStorage.getItem('key');
            const encOld = await encryp(oldParts.join(';'), key);
            const encPdf = await encryp(pdfLinks.join(','), key);
        
            // Update in SQLite
            const deviceId = await DeviceInfo.getUniqueId();
            const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
        if (entries.length > 1) {
            db.transaction(tx => {
             tx.executeSql(
                'UPDATE files SET old = ?, mergePdf = ? WHERE ident = ?;',
                [encOld, encPdf, deviceId],
                (_, result) => {
                  console.log("DB erfolgreich aktualisiert nach Löschung");
                },
                (_, error) => {
                  console.log("Fehler beim DB-Update:", error);
                }
              );
            });
          }
        else {
          db.transaction(tx => {
            const empty = '';
            tx.executeSql(
              'UPDATE files SET old = ?, mergePdf = ? WHERE ident = ?;',
              [empty, empty, deviceId],
              (_, result) => {
                console.log("DB erfolgreich aktualisiert nach Löschung");
              },
              (_, error) => {
                console.log("Fehler beim DB-Update:", error);
              }
            );
          });
        }
          } catch (error) {
            console.log("Fehler beim Löschen des Eintrags:", error);
          }
        };
   
         

  return (
<SafeAreaView style={styles.container}>
{pdfView && (
  <Modal visible={pdfView} transparent={true} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Pdf source={source} style={styles.pdf} />
        <TouchableOpacity onPress={deleteIt} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}
    
    <ScrollView style={styles.scrollView}>
    <Card style={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0, borderWidth:'none' }}>

      {entries.map((entry, index) => (
       <TouchableOpacity
       key={index}
       onPress={() => saveToStorage(entry)}
       onLongPress={() => OldApp(entry)} // <- hier ist die LongPress-Funktion
     >
       <View style={styles.entry}>
 <Card.Title
     titleNumberOfLines={0}   // 0 = unlimitiert

  title={entry.job}
  titleStyle={styles.job}/>
<Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '55%', alignSelf: 'center'  }}
/>
         <Text style={styles.name}>{entry.date}</Text>
<Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '55%', alignSelf: 'center'  }}
/>
         <Text style={styles.text}>{entry.myType}</Text>
         <TouchableOpacity
      onPress={() => deleteEntry(index)}
      style={styles.deleteButton}
    >
    <MaterialIcons name="cancel" size={35} color="#a7a7a7" />
    </TouchableOpacity>
       </View>
     </TouchableOpacity>
      ))}
    </Card>
    </ScrollView>
    
    </SafeAreaView>
  );
};
const { width } =  Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,// moderner, heller Hintergrund
  },
  scrollView: {
        paddingTop: 40,

  },
  deleteButton: {
position: 'absolute',
top: -16,
right: -12,
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
  entry: {
    alignSelf: "center",
    backgroundColor: colors.card3,
    padding: 15,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
width: width * 0.9
  },
  name: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#C8C8C8",
    marginBottom: 15,
  },
  job: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#E5E5E5",

  
  },
  text: {
    textAlign: "center",
    color: "#E5E5E5",
    fontSize:16,

  },
  user: {
    marginVertical: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 34, 1)",
  
    justifyContent: 'center',
    alignItems: 'center',
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
  pdf: {
    width: '100%',
    height: '100%',
    borderRadius: 10, // Optional für abgerundete Ecken
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
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },


});

export default OldScreen;
