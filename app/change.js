import { useEffect, useState } from 'react';

import { Buffer } from 'buffer';
import { router } from 'expo-router';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
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
import BottomPopup from '../inc/popup.js';
import '../local/i18n.js';
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
      try {
        const anrede = await EncryptedStorage.getItem('anrede');
        console.log('Anrede:', anrede);
        
        const name = await EncryptedStorage.getItem('name');
        console.log('Name:', name);
        
        const subject = await EncryptedStorage.getItem('subject');
        console.log('Subject:', subject);
        setSubject(subject);
        
        let myText = await EncryptedStorage.getItem('text');
        console.log('Original Text:', myText);
        const theText2 = anrede + '\n\n' + myText + '\n\n' + name;
      

        if (myText) {
          setText(theText2);
        }
      } catch (error) {
        console.error('Error loading text:', error);
      }
    };
    loadText();
  }, [text, pdfUri]);


  const saveText = async () => {
    let encData = '';
    const db = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });
    const date = getCurrentDateTime();
    console.log('Current date:', date);
    const myKey = await EncryptedStorage.getItem('key');
    const time = await EncryptedStorage.getItem('time')
    const myType = await EncryptedStorage.getItem('type')
    const text = await EncryptedStorage.getItem('text');
    const subject = await EncryptedStorage.getItem('subject');
    const yourName = await EncryptedStorage.getItem('yourName');
    const job = await EncryptedStorage.getItem('beruf');
    const join = job + '#' + date + '#' + time + '#' + myType + '#' + subject + '#' + text + ';';
    console.log('Join:', join);
    const deviceId = await DeviceInfo.getUniqueId();
    db.transaction(tx => {
      console.log('Executing SQL query with WHERE clause');
      tx.executeSql(
        'SELECT old FROM files WHERE ident = ?;',
        [deviceId],
      async (_, { rows }) => {
        if (rows.length > 0) {
          console.log('hallo hasenfurz')
          const data = rows.item(0);
       
          if (data.old.length > 5) {
            
         
          const encData = await decryp(data.old, myKey);
          console.log('decrypted data:', encData);
          const newOld = encData + join;
          const encNewOld = await encryp(newOld, myKey);
        
          db.executeSql(
            'UPDATE files SET old = ? WHERE ident = ?',
            [encNewOld, deviceId],
          );
        }
        else {
          const encNewOld = await encryp(join, myKey);
          console.log('encrypted data:', encNewOld);
          db.executeSql(
            'UPDATE files SET old = ? WHERE ident = ?',
            [encNewOld, deviceId],
          );
        }
        } if (rows.length < 1) {
          console.log('else')
          const encNewOld = await encryp(join, myKey);
          console.log('encrypted data:', encNewOld);
          db.executeSql(
            'UPDATE files SET old = ? WHERE ident = ?',
            [encNewOld, deviceId],
          );
        }
      }
    )
  }
)
  }

  const mergeFilesFromDB = async () => {
    try {
      const regex = /([^\/]*)$/;
      console.log('Starting merging');
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      const deviceId = await DeviceInfo.getUniqueId();
      console.log('Device ID:', deviceId);

      const result = await db.executeSql(
        'SELECT mergePdf, lebenslauf, anschreiben, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
        [deviceId],
      );

      const files = result[0].rows.raw();

      if (files.length < 1) {
        console.log('No files found in the database');
        return;
      }

      const firstFile = files[0];

      const myKey = await EncryptedStorage.getItem('key');
   
      const lebenslaufDecryp = await decryp(firstFile.lebenslauf, myKey);
      console.log('Decrypted Lebenslauf:', lebenslaufDecryp);
      const extract = lebenslaufDecryp.match(regex);
      console.log('Extracted filename:', extract);
       const output = RNFS.LibraryDirectoryPath + '/' + extract[0];
       console.log('Output path:', output);
       console.log('Output path:', output);
      const name = await EncryptedStorage.getItem('yourName');
      const anschreibenPath = await decryp(firstFile.anschreiben, myKey);

      const filePaths = [anschreibenPath, output];

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
          console.log(`Reading file ${index + 1}`);
          const buffer = await RNFS.readFile(filePath, 'base64');
          const buffer2 = await RNFS.readFile(filePath + '_1', 'base64');
          const decoded = await decryptBase(buffer, myKey);
          const together = decoded + buffer2;
          return PDFDocument.load(Buffer.from(together, 'base64'), {
            ignoreEncryption: true,
          });
        }),
      );

      console.log('Merging files');

      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfDocs.length; i++) {
        console.log(`Adding page ${i + 1}`);
        const doc = pdfDocs[i];
        const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }

      console.log('Merging finished');

      const mergedPdfBytes = await mergedPdf.save();

      const blue = `${(name)}_Bewerbungsmappe`;


      const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');
      const merge1 = mergedPdfBase64.slice(0, 16);
      const merge2 = mergedPdfBase64.slice(16);

      const outputPath = `${RNFS.LibraryDirectoryPath}/${blue}.pdf`;

      const iv = await genIv();

      const encrypFile = await encryptBase64(merge1, iv, myKey);
      await RNFS.writeFile(outputPath, encrypFile, 'base64');
      await RNFS.writeFile(outputPath + '_1', merge2, 'base64');
     

      if (firstFile.mergePdf.length > 5) {
      console.log('Merging with existing file');
        const oldFilePath = await decryp(firstFile.mergePdf, myKey);
        const FilePath = oldFilePath + ',' + blue;
      
        console.log('FilePath:', FilePath);
        const encryptedFilePath = await encryp(FilePath, myKey);
        db.executeSql(
          'UPDATE files SET mergePdf = ? WHERE ident = ?',
          [encryptedFilePath, deviceId],
        );
      } else {
     console.log('No existing file, creating new entry');
      
       
        const encryptedFilePath = await encryp(blue, myKey);
        db.executeSql(
          'UPDATE files SET mergePdf = ? WHERE ident = ?',
          [encryptedFilePath, deviceId],
        );
      }
      console.log('Merged PDF saved to:', outputPath);
   
      await saveText();
      setPopupVisible(false);
      toCollect();
    } catch (err) {
      console.error('Error during merging:', err);
      if (err.message.includes("ENOENT")) {
        setPopupVisible(false);
        Alert.alert(
          'Fehler',
          'Es gab Probleme mit Ihren Anlagen, bitte laden Sie sie erneut hoch.',
        );
         router.push('upload');
      }
      return;
    }
  };
  const toCollect = async () => {
    router.replace('collect');
    await EncryptedStorage.setItem('result', 'collect');
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
    console.log('Starting PDF generation process');

    setPopup('Ihre Bewerbungsmappe wird nun zusammengestellt.');
    setPopupVisible(true);

    try {
      const pdfDoc1 = await PDFDocument.create();
      const helvetica = await pdfDoc1.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc1.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc1.addPage([600, 800]);
      const { height } = page.getSize();
      console.log('PDF page created with height:', height);

      const fontSize = 11;
      const leftMargin = 60;
      const maxChars = 100;
      const lineHeight = fontSize + 4;
      let currentY = height - 60;
      const textWidth = 450;
      console.log('Initialized PDF settings');

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
      console.log('Retrieved personal and recipient data');

      page.drawText(myName, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(myStreet, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(myCity, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= 4 * lineHeight;
      console.log('Added personal data to PDF');

      page.drawText(yourCompany, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(yourStreet, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(yourCity, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= 2 * lineHeight;
      console.log('Added recipient data to PDF');

      const dateX = leftMargin + textWidth - 50;
      page.drawText(date, { x: dateX, y: currentY, size: fontSize, font: helvetica });
      currentY -= 3 * lineHeight;
      console.log('Added date to PDF');

      const line1 = splitTextIntoLinesWithoutFont(objectSubject, 95);
      line1.forEach(line1 => {
        page.drawText(line1, { x: leftMargin, y: currentY, size: fontSize, font: helveticaBold });
        currentY -= lineHeight;
      });
      currentY -= 3 * lineHeight;
      console.log('Added subject to PDF');

      const paragraphs = text.split('\n\n');
      paragraphs.forEach(paragraph => {
        const lines = splitTextIntoLinesWithoutFont(paragraph, maxChars);
        lines.forEach(line => {
          page.drawText(line, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
          currentY -= lineHeight;
        });
        currentY -= lineHeight;
      });
      console.log('Added body text to PDF');

      const myKey = await EncryptedStorage.getItem('key');
      const pdfBase641 = await pdfDoc1.saveAsBase64();
      console.log('PDF saved as base64');

      const iv = await genIv();
      const Base64Part1 = pdfBase641.slice(0, 16);
      const Base64Part2 = pdfBase641.slice(16);
      const encrypted = await encryptBase64(Base64Part1, iv, myKey);

      const outputPath = `${RNFS.LibraryDirectoryPath}/anschreiben.pdf`;
      const outputPathNew = await encryp(outputPath, myKey);

      await EncryptedStorage.setItem('text', text);
      await RNFS.writeFile(outputPath, encrypted, 'base64');
      await RNFS.writeFile(outputPath + '_1', Base64Part2, 'base64');
      console.log('PDF written to file system');

      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      console.log('Database opened');

      const deviceId = await DeviceInfo.getUniqueId();
      await db.executeSql(
        'UPDATE files SET anschreiben = ? WHERE ident = ?',
        [outputPathNew, deviceId],
      );
      console.log('Database updated with new PDF path');

      mergeFilesFromDB();
    } catch (error) {
      console.error('Error during PDF generation:', error);
    }
  }
const {height} = Dimensions.get('window');
  return (

    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
<SafeAreaView style={styles.innerContainer}>

<Animated.View style={{  height: height * 1 -  keyboardHeight * 1.45 }} >
    <TextInput
      style={styles.textArea}
      value={text}
      onChangeText={setText}
      placeholder={t('placeholderText')}
      multiline={true}
      numberOfLines={30}
    />
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <TouchableOpacity
      style={styles.button}
      onPress={async () => {
        generate();
      }}
    >
      <Text style={styles.buttonText}>{t('saveCoverLetter')}</Text>
    </TouchableOpacity>

  </Animated.View>
    <BottomPopup
    visible={popupVisible}
    message={popup}
    onClose={() => setPopupVisible(false)}
  />
</SafeAreaView>
</TouchableWithoutFeedback>
  );
};
const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  innerContainer: {
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
    
  },
  subjectInput: {
    borderRadius: 10,
    justifyContent: 'center',
 backgroundColor: colors.card,
    borderColor: 'gray',
    borderWidth: 1,
    paddingLeft: 15,
    paddingRight: 15,
    textAlignVertical: 'center',
    marginBottom: 2,
    color: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
 height: height * 0.067,
 marginBottom: 10,
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
  buttonNew: {
    opacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  pdfContainer: {
    flex: 1,
  },
  pdfLabel: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
    height: 500,
  },
  message: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ChangeScreen;
