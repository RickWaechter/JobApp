import { Buffer } from 'buffer';
import { router } from 'expo-router';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { Card } from 'react-native-paper';

import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import {
  decryp,
  decryptBase,
  encryp,
  encryptBase64,
  genIv,
} from '../inc/cryp.js';
import { getCurrentDateTime } from '../inc/date.js';
import useKeyboardAnimation from '../inc/Keyboard.js';
const ChangeScreen = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [pdfUri, setPdfUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collectTag, setCollectTag] = useState(false);
  const [firstView, setFirstView] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popup, setPopup] = useState('');
  const {keyboardHeight, reset} = useKeyboardAnimation();
const [subject, setSubject] = useState('');
  const DB_NAME = 'firstNew.db';
  useEffect(() => {
    
    const loadText = async () => {
       const anrede = await EncryptedStorage.getItem('anrede');
           const name = await EncryptedStorage.getItem('name');
           setSubject(await EncryptedStorage.getItem('subject'));
           let myText = await EncryptedStorage.getItem('text');
           myText = myText.replace(/^.*?\n/, anrede + '\n');
         

         
      if (myText) {
        setText(myText);
      }
    };
    loadText();
  }, [ pdfUri]);


const saveText = async () => {
  const date = getCurrentDateTime();
  console.log(date)
  const time = await EncryptedStorage.getItem('time')
  const myType = await EncryptedStorage.getItem('type')
  const text = await EncryptedStorage.getItem('text');
  const subject = await EncryptedStorage.getItem('subject');
  const yourName = await EncryptedStorage.getItem('yourName');
  const job = await EncryptedStorage.getItem('beruf');
  const deviceId = await DeviceInfo.getUniqueId();
  
  }



  const mergeFilesFromDB = async () => {
    try {
      console.log('Starting to merge files from database');
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      const deviceId = await DeviceInfo.getUniqueId();
      console.log('Device ID:', deviceId);

      const result = await db.executeSql(
        'SELECT lebenslauf, anschreiben, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
        [deviceId],
      );

      const files = result[0].rows.raw();

      if (files.length < 1) {
        console.log('⚠️ No files found in the database');
        return;
      }

      const firstFile = files[0];

      const myKey = await EncryptedStorage.getItem('key');
      const credentials = await Keychain.getGenericPassword();
      const lebenslaufPath = await decryp(firstFile.lebenslauf, myKey);

      const anschreibenPath = await decryp(firstFile.anschreiben, myKey);

      const filePaths = [anschreibenPath, lebenslaufPath];

      for (let i = 1; i <= 10; i++) {
        const addField = firstFile[`add${i}`];
        if (addField) {
          const addPath = await decryp(addField, myKey);
          filePaths.push(addPath);
        }
      }

      console.log('List of files to merge:', filePaths);

      const pdfDocs = await Promise.all(
        filePaths.map(async (filePath, index) => {
          const buffer = await RNFS.readFile(filePath, 'base64');
          const buffer2 = await RNFS.readFile(filePath + '_1', 'base64');
          const decoded = await decryptBase(buffer, myKey);
          const together = decoded + buffer2;
          return PDFDocument.load(Buffer.from(together, 'base64'), {
            ignoreEncryption: true,
          });
        }),
      );

      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfDocs.length; i++) {
        const doc = pdfDocs[i];
        const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }


      const mergedPdfBytes = await mergedPdf.save();

      const name = await EncryptedStorage.getItem('yourName');
      console.log('Name:', name);
      const blue = `${(name)}_Bewerbungsmappe`;


      const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');
      const merge1 = mergedPdfBase64.slice(0, 16);
      const merge2 = mergedPdfBase64.slice(16);

      const outputPath = `${RNFS.LibraryDirectoryPath}/${blue}.pdf`;

      const iv = await genIv();

      const encrypFile = await encryptBase64(merge1, iv, myKey);
      await RNFS.writeFile(outputPath, encrypFile, 'base64');
      await RNFS.writeFile(outputPath + '_1', merge2, 'base64');

      await EncryptedStorage.setItem('merge', outputPath);

      console.log('Merged PDF saved to:', outputPath);
      await saveText();
      setPopupVisible(false);
      setFirstView(true);
      toCollect();
    } catch (err) {
      console.log('Error while merging files:', err);
      if (err.message.includes("ENOENT")) {
              setPopupVisible(false);
              Alert.alert(
                t('alerts.error.title'),
                t('alerts.error.attachments'),
              );
            }
            return;
          }

  };
  const toCollect = () => {
    router.push('collect');
  };
  const splitTextIntoLinesWithoutFont = (text2, maxChars) => {
    const words = text2.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      // Prüfe, ob das Hinzufügen des nächsten Wortes die maxChars überschreitet
      if ((currentLine + ' ' + word).trim().length > maxChars) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    });

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }
    return lines;
  };

  const generate = async () => {

    setPopup('Ihre Bewerbungsmappe wird nun zusammengestellt.');
    setPopupVisible(true);
    const pdfDoc1 = await PDFDocument.create();
    const helvetica = await pdfDoc1.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc1.embedFont(StandardFonts.HelveticaBold);
    // 2️⃣ Eine Seite hinzufügen
    const page = pdfDoc1.addPage([600, 800]);
    const { height } = page.getSize();

    // 3️⃣ Grundeinstellungen
    const fontSize = 11;
    const leftMargin = 60;
    const maxChars = 100; // Maximale Zeichenanzahl pro Zeile (als grobe Schätzung)
    const lineHeight = fontSize + 4;
    let currentY = height - 60;
    const textWidth = 450; // Hier definieren wir textWidth

    // Persönliche und Empfänger-Daten
    const myName = await EncryptedStorage.getItem('name');
    const myStreet = await EncryptedStorage.getItem('street');
    const myCity = await EncryptedStorage.getItem('city');
    const yourCompany = await EncryptedStorage.getItem('yourName');
    const yourStreet = await EncryptedStorage.getItem('yourStreet');
    const yourCity = await EncryptedStorage.getItem('yourCity');
    const today = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const date = today;
    const objectSubject = await EncryptedStorage.getItem('subject');
      const anrede = await EncryptedStorage.getItem('anrede');
    page.drawText(myName, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
    currentY -= lineHeight;
    page.drawText(myStreet, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
    currentY -= lineHeight;
    page.drawText(myCity, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });

    // Zwei Zeilen Abstand
    currentY -= 4 * lineHeight;

    // Empfänger-Daten

    page.drawText(yourCompany, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
    currentY -= lineHeight;
    page.drawText(yourStreet, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
    currentY -= lineHeight;
    page.drawText(yourCity, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });

    // Zwei Zeilen Abstand
    currentY -= 2 * lineHeight;

    // Datum rechtsbündig positionieren
    const dateX = leftMargin + textWidth - 50;
    page.drawText(date, { x: dateX, y: currentY, size: fontSize, font: helvetica });

    // Eine Zeile Abstand
    currentY -= 3 * lineHeight;



    const line1 = splitTextIntoLinesWithoutFont(objectSubject, 95);
    line1.forEach(line1 => {
      page.drawText(line1, { x: leftMargin, y: currentY, size: fontSize, font: helveticaBold });
      currentY -= lineHeight;
    });
    currentY -= 3 * lineHeight;



    // 4️⃣ Absätze anhand von "\n" aufteilen und jeweils umbrechen
    const paragraphs = text.split('\n\n');
    paragraphs.forEach(paragraph => {
      const lines = splitTextIntoLinesWithoutFont(paragraph, maxChars);
      lines.forEach(line => {
        page.drawText(line, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
        currentY -= lineHeight;
      });
      // Zusätzlicher Abstand zwischen den Absätzen
      currentY -= lineHeight;
    });

    // 5️⃣ PDF als Byte-Array speichern
    const myKey = await EncryptedStorage.getItem('key');
    const pdfBase641 = await pdfDoc1.saveAsBase64();

    const iv = await genIv();

    const Base64Part1 = pdfBase641.slice(0, 16);
    const Base64Part2 = pdfBase641.slice(16);
    const encrypted = await encryptBase64(Base64Part1, iv, myKey);

    const outputPath = `${RNFS.LibraryDirectoryPath}/anschreiben.pdf`;

    const outputPathNew = await encryp(outputPath, myKey);

    await EncryptedStorage.setItem('text', text);
    await RNFS.writeFile(outputPath, encrypted, 'base64');
    await RNFS.writeFile(outputPath + '_1', Base64Part2, 'base64');

    try {
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      // Führe PRAGMA table_info aus, um die Spalten zu überprüfen

      // Wenn die Spalte nicht existiert, füge sie hinzu
      try {
        const deviceId = await DeviceInfo.getUniqueId();

        await db.executeSql(
          'UPDATE files SET anschreiben = ? WHERE ident = ?',
          [outputPathNew, deviceId],
        );

        mergeFilesFromDB();
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Dateien:', error);
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf die Datenbank:', error);
    }
  }

  return (

    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
<SafeAreaView style={styles.innerContainer}>

<Animated.View style={{  height: height * 0.85 -  keyboardHeight * 1.03 }} >
    <TextInput
      style={styles.textArea}
      value={text}
      onChangeText={setText}
      placeholder={t('placeholderText')}
      multiline={true}
      numberOfLines={30}
    />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  <Pressable
  disabled={loading}
  onPress={generate}
>
  {({ pressed }) => (
    <View
      style={[
        styles.entryFort,
        pressed && !loading && styles.entryPressFort, // nur wenn nicht loading
      ]}
    >
      <Card.Title
        title={
          loading
            ? `Bitte warten${dots}`   // 👈 animierter Text
            : t('saveCoverLetter')
        }
        titleStyle={styles.job}
      />

     

      {/* Optional: du kannst Loading hier auch zentriert anzeigen */}
    </View>
  )}
</Pressable>





  </Animated.View>
</SafeAreaView>
</TouchableWithoutFeedback>
  );
};
const { height, width } = Dimensions.get('window');
const styles = StyleSheet.create({
  innerContainer: {
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
    
  },
 entryFort: {
      flexDirection: "column",
    backgroundColor: colors.card3,
    paddingTop: 5,
    marginTop:10,
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
    job: {
    justifyContent:'center',

  textAlign: "center",
    alignSelf: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "rgb(232, 228, 238)",
  },
  entryPressFort: {
          flexDirection: "column",

    backgroundColor: colors.card3,
    paddingTop: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
    wdith:width * 0.9,
  justifyContent:'center',

  },
  textArea: {
    borderRadius: 10,
    borderColor: 'gray',
    borderWidth: 1,
    padding: 15,
    textAlignVertical: 'top',
    marginBottom: 2,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    color: 'white',
  },
  button: {
    backgroundColor:colors.card,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  message: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ChangeScreen;
