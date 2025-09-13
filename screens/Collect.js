import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { useNavigation } from '@react-navigation/native';
import Share from 'react-native-share';
import Pdf from 'react-native-pdf';
import { Card } from '@rneui/themed';
import {

  decryptBase,
} from '../inc/cryp.js';
import EncryptedStorage from 'react-native-encrypted-storage';
import BottomPopup from '../inc/popup.js';
import { useTranslation } from 'react-i18next';
import '../local/i18n'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../inc/colors.js';
// Aktivieren des Debug-Modus (optional)
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DB_NAME = 'firstNew.db';

const CollectScreen = () => {

        const { t } = useTranslation();
  const navigation = useNavigation();
  const [popupVisible, setPopupVisible] = useState(false);
  const [popup, setPopup] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [pdfView, setPdfView] = useState(false);
const [source, setSource] = useState({});
  useEffect(() => {
    console.log(fileUri)
  },
    [fileUri]);

  const email = async () => {
    console.log("email Funktion aufgerufen, Navigation zu Email-Screen");
    try {
      await EncryptedStorage.setItem("result", "collect") 
      navigation.navigate('Email');
    } catch (err) {
      console.error('Error opening database:', err);
    }
  };
  
  const toHome = async () => {
    console.log("toHome Funktion aufgerufen, Navigation zu Home-Screen");
    if (await EncryptedStorage.getItem('result')) {
    await EncryptedStorage.removeItem('result')
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    console.log("Navigation zu MainTabs abgeschlossen");
  }
  
  const lookAtIt = async () => {
    console.log("lookAtIt Funktion aufgerufen");
    try {

      const name = await EncryptedStorage.getItem('yourName');
      console.log("Name aus EncryptedStorage gelesen:", name);
      const blue = `${(name)}_Bewerbungsmappe`;
      console.log("Dateiname erzeugt:", blue);
      const myKey = await EncryptedStorage.getItem('key');
      console.log("key aus EncryptedStorage gelesen:", myKey);
      const data = `${RNFS.LibraryDirectoryPath}/${blue}.pdf`;
      const temp = `${RNFS.LibraryDirectoryPath}/${blue}_temp.pdf`;
      console.log("Quell-Pfad:", data);
      const encData = await RNFS.readFile(data, 'base64');
      console.log("Verschlüsselte Daten gelesen");
      const decryptedData = await decryptBase(encData, myKey);
      console.log("Daten entschlüsselt");
      const encData2 = await RNFS.readFile(data + '_1', 'base64');
      console.log("Zusätzliche verschlüsselte Daten gelesen");
      const encData3 = decryptedData + encData2;
      console.log("Daten kombiniert");
      await RNFS.writeFile(temp, encData3, 'base64');
      console.log("Datei geschrieben:", temp);
      setSource({ uri:`file://${temp}` });
      setPdfView(true);
      await EncryptedStorage.setItem("result", "collect")
    



    } catch (err) {
      console.error('Fehler beim Teilen der Datei:', err);
    }
  };

const deleteIt = async () => {
  setPdfView(false)
  const name = await EncryptedStorage.getItem('yourName');
 
  const blue = `${(name)}_Bewerbungsmappe`;
  console.log("Dateiname erzeugt:", blue);
  const myKey = await EncryptedStorage.getItem('key');
  console.log("key aus EncryptedStorage gelesen:", myKey);
  const outputPath = `${RNFS.LibraryDirectoryPath}/${blue} + _temp.pdf`
RNFS.exists(outputPath)
    .then( (result) => {
        console.log("file exists: ", result);

        if(result){
          return RNFS.unlink(outputPath)
            .then(() => {
              console.log('FILE DELETED');
              setPopupVisible(false)
            })
            // `unlink` will throw an error, if the item to unlink does not exist
            .catch((err) => {
              console.log(err.message);
            });
        }

      })
      .catch((err) => {
        console.log(err.message);
      });
}

  const download = async () => {
    try {
      setPopup('Ihre Bewerbungsmappe wird im Download Ordner gespeichert');
      setPopupVisible(true);
      const name = await EncryptedStorage.getItem('yourName');
      console.log("Name aus EncryptedStorage gelesen:", name);
   
 
      const myKey = await EncryptedStorage.getItem('key');
      console.log("key aus EncryptedStorage gelesen:", myKey);
      const data = `${RNFS.LibraryDirectoryPath}/${(name)}_Bewerbungsmappe.pdf`;
      


      const datum = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  
      const outputPath = `${RNFS.LibraryDirectoryPath}/${name}_Bewerbung.pdf`;
      const encData = await RNFS.readFile(data, 'base64');
      const decryptedData = await decryptBase(encData, myKey);
      const encData2 = await RNFS.readFile(data + '_1', 'base64');
      const encData3 = decryptedData + encData2;

      await RNFS.writeFile(outputPath, encData3, 'base64');

      try {
        await Share.open({
          url: `file://${outputPath}`,
          saveToFiles: true, // Erzwingt Speichern in der "Dateien"-App
        });
      } catch (err) {
        console.error('Fehler beim Teilen der Datei:', err);
      }

      setPopupVisible(false);
      setFileUri(outputPath);

    } catch (err) {
      console.error('Fehler beim Kombinieren der Dateien:', err);
      console.log("Fehler beim Speichern der Datei:", err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1,  backgroundColor: "rgb(8, 12, 32)" }}>
            <View style={styles.container}>
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

      




<View style={styles.container2}>
 <Card containerStyle={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0, borderWidth: 'none' }}>
<TouchableOpacity onPress={lookAtIt}>
<View style={styles.entry}>
<Card.Title style={styles.job}>{t('viewApplication')}</Card.Title>
<Card.Divider />
<Text style={styles.name}>{t('viewApplicationDescription')}</Text>
</View>
</TouchableOpacity>
<TouchableOpacity onPress={download}>
<View style={styles.entry}>
<Card.Title style={styles.job}>{t('download.button')}</Card.Title>
<Card.Divider />
<Text style={styles.name}>{t('downloadDescription')}</Text>
</View>
</TouchableOpacity>
<TouchableOpacity onPress={email}>
<View style={styles.entry}>
<Card.Title style={styles.job}>{t('sendEmail')}</Card.Title>
<Card.Divider />
<Text style={styles.name}>{t('sendEmailDescription')}</Text>
</View>
</TouchableOpacity> 
<TouchableOpacity onPress={toHome}>
<View style={styles.finishButton}>

<Text style={styles.finishText}>{t('toHome')}</Text>
</View>
</TouchableOpacity>
</Card>
</View>
    </View>


</SafeAreaView>

  );
};
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
   
    padding: 16,

    
  },
  container2: {
    flex: 1,
    backgroundColor: colors.background,
   justifyContent:'center',
    padding: 16,

    
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
  
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  entry: {
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 10,
    marginBottom: height * 0.05,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: "gray",
    borderWidth:1,
    borderColor:'gray',

  }, 
  finishButton: {
    backgroundColor: colors.card3,
alignSelf: 'center',
    padding: 15,
    borderRadius: 10,
   width: width * 0.8,
    marginBottom: height * 0.05,

    
    shadowColor: "gray",
    borderWidth:1,
    borderColor:'gray',

  },
  name: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "#C8C8C8",
    marginBottom: 5,
  },
  finishText: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "bold",
    color: "#C8C8C8",
   
  },
  job: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E5E5E5",
  
  },
  text: {
    textAlign: "center",
    color: "#333",
    marginBottom: 5,
  },
  user: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#7D26CD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    zIndex: 100,
  },
  buttonDisabled: {
    backgroundColor: '#7D26CD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    alignSelf: 'center',
  },
  fileList: {
    marginTop: 20,
  },
  fileListTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  fileName: {
    fontSize: 16,
  },
});
export default CollectScreen;
