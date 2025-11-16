import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { Card, Divider } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { SafeAreaView } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import {
  decryptBase,
} from '../inc/cryp.js';
// Aktivieren des Debug-Modus (optional)
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DB_NAME = 'firstNew.db';

const CollectScreen = () => {

        const { t } = useTranslation();
  const [popupVisible, setPopupVisible] = useState(false);
  const [popup, setPopup] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [pdfView, setPdfView] = useState(false);
const [source, setSource] = useState({});
  useEffect(() => {
    console.log(fileUri)
    console.log(source)
  },
    [fileUri, source]);

  const email = async () => {
    console.log("email Funktion aufgerufen, Navigation zu Email-Screen");
    try {
      await EncryptedStorage.setItem("result", "collect") 
      router.push('/email');
    } catch (err) {
      console.error('Error opening database:', err);
    }
  };
  
  const toHome = async () => {
    console.log("toHome Funktion aufgerufen, Navigation zu Home-Screen");
    if (await EncryptedStorage.getItem('result')) {
    await EncryptedStorage.removeItem('result')
    }
    router.dismissTo('(tabs)');
    console.log("Navigation zu MainTabs abgeschlossen");
  }
  
  const lookAtIt = async () => {
    try {

      const name = await EncryptedStorage.getItem('yourName');
      const blue = `${(name)}_Bewerbungsmappe`;
      const myKey = await EncryptedStorage.getItem('key');
      const data = `${RNFS.LibraryDirectoryPath}/${blue}.pdf`;
      const temp = `${RNFS.LibraryDirectoryPath}/${blue}_temp.pdf`;
      const encData = await RNFS.readFile(data, 'base64');
      const decryptedData = await decryptBase(encData, myKey);
      const encData2 = await RNFS.readFile(data + '_1', 'base64');
      const encData3 = decryptedData + encData2;
      await RNFS.writeFile(temp, encData3, 'base64');
      const exists = await RNFS.exists(temp);
      setSource({ uri: `file://${temp}` });
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
  const myKey = await EncryptedStorage.getItem('key');
const outputPath = `${RNFS.LibraryDirectoryPath}/${blue}_temp.pdf`;
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
   
 
      const myKey = await EncryptedStorage.getItem('key');
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
          
  <Modal
    visible={pdfView}
    animationType="fade"
    onRequestClose={deleteIt} // wichtig für Android Back-Button
  >
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Pdf
        
          source={source}
          style={styles.pdf}
        />

        <TouchableOpacity
          onPress={deleteIt}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>

  
      




<View style={styles.container2}>
 <Card style={{  backgroundColor: colors.background, shadowColor: 'transparent' }}>
<TouchableOpacity onPress={lookAtIt}>

<View style={styles.entry}>
     
 <Card.Title
                 title={t('viewApplication')}
                 titleStyle={styles.job}
               />
               <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
<Text style={styles.name}>{t('viewApplicationDescription')}</Text>


</View>

</TouchableOpacity>
<TouchableOpacity onPress={download}>
<View style={styles.entry}>
 <Card.Title
                 title={t('download.button')}
                 titleStyle={styles.job}
               />
                <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
<Text style={styles.name}>{t('downloadDescription')}</Text>
</View>
</TouchableOpacity>
<TouchableOpacity onPress={email}>
<View style={styles.entry}>
 <Card.Title
                 title={t('sendEmail')}
                 titleStyle={styles.job}
               />
               <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
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
   alignItems:'center',

    
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
    flex: 1,
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
 
  entry: {
    padding:15,
    backgroundColor: colors.card3,
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
    width:width * 0.9,


  }, 
  finishButton: {
    backgroundColor: colors.card3,
alignSelf: 'center',
    padding: 15,
    borderRadius: 10,
   width: width * 0.9,
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
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#E5E5E5",
  
  },
});
export default CollectScreen;
