// ChangeScreen.js
import { Buffer } from 'buffer';
import { router } from 'expo-router';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { loadCustomFonts } from '../inc/font.js';
import { Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getLocaleCode } from '../inc/language.js';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import {
  decryp,
  decryptBase,
  encryp,
  encryptBase64,
  genIv,
} from '../inc/cryp.js';
import { getCurrentDateTime } from '../inc/date.js';
import { runQuery } from '../inc/db.js';
import { sanitizeForPdf } from '../inc/string.js';

const DB_NAME = 'firstNew.db';

export const splitTextIntoLinesWithoutFont = (textBlock, maxChars) => {
  const words = textBlock.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
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

export const saveText = async (text) => {
  try {
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    const date = getCurrentDateTime();
    const deviceId = await DeviceInfo.getUniqueId();

    const [myKey, time, myType, storedSubject, job] = await Promise.all([
      EncryptedStorage.getItem('key'),
      EncryptedStorage.getItem('time'),
      EncryptedStorage.getItem('type'),
      EncryptedStorage.getItem('subject'),
      EncryptedStorage.getItem('beruf'),
    ]);

    const join = `${job}#${date}#${time}#${myType}#${storedSubject}#${text}&`;

    const oldData = await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT old FROM files WHERE ident = ?;',
          [deviceId],
          (_, res) => resolve(res.rows.length ? res.rows.item(0).old : null),
          (_, err) => reject(err),
        );
      });
    });

    let decrypted = '';
    if (oldData) {
      decrypted = await decryp(oldData, myKey);
    }
    const encryptedNew = await encryp(decrypted + join, myKey);

    db.transaction((tx) => {
      tx.executeSql('UPDATE files SET old = ? WHERE ident = ?;', [
        encryptedNew,
        deviceId,
      ]);
    });
  } catch (e) {
    console.error('SaveText Error:', e);
    throw e;
  }
};

export const mergeFilesFromDB = async ({ text, router }) => {
  try {
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    const deviceId = await DeviceInfo.getUniqueId();

    const result = await runQuery(
      db,
      'SELECT mergePdf, lebenslauf, anschreiben, add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 FROM files WHERE ident = ?',
      [deviceId],
    );

    const files = result?.rows?.raw() ?? [];
    if (files.length < 1) return;

    const firstFile = files[0];
    const myKey = await EncryptedStorage.getItem('key');
    const lebenslaufDecryp = await decryp(firstFile.lebenslauf, myKey);
    const output = `${RNFS.LibraryDirectoryPath}/${lebenslaufDecryp}`;

    const name = await EncryptedStorage.getItem('yourName');
    const anschreibenPath = await decryp(firstFile.anschreiben, myKey);

    const filePaths = [anschreibenPath, output];

    for (let i = 1; i <= 10; i++) {
      const addField = firstFile[`add${i}`];
      if (addField) {
        const addPath = await decryp(addField, myKey);
        filePaths.push(`${RNFS.LibraryDirectoryPath}/${addPath}`);
      }
    }

    const pdfDocs = await Promise.all(
      filePaths.map(async (filePath) => {
        const buffer = await RNFS.readFile(filePath, 'base64');
        const buffer2 = await RNFS.readFile(`${filePath}_1`, 'base64');
        const decoded = await decryptBase(buffer, myKey);
        const together = decoded + buffer2;
        return PDFDocument.load(Buffer.from(together, 'base64'), {
          ignoreEncryption: true,
        });
      }),
    );

    const mergedPdf = await PDFDocument.create();
    for (const doc of pdfDocs) {
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const blue = `${name || 'Bewerbung'}_Bewerbungsmappe`;
    const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');
    const merge1 = mergedPdfBase64.slice(0, 16);
    const merge2 = mergedPdfBase64.slice(16);
    const outputPath = `${RNFS.LibraryDirectoryPath}/${blue}.pdf`;

    const iv = await genIv();
    const encrypFile = await encryptBase64(merge1, iv, myKey);
    await RNFS.writeFile(outputPath, encrypFile, 'base64');
    await RNFS.writeFile(`${outputPath}_1`, merge2, 'base64');

    if (firstFile.mergePdf && firstFile.mergePdf.length > 5) {
      const oldFilePath = await decryp(firstFile.mergePdf, myKey);
      const FilePath = `${oldFilePath},${blue}`;
      const encryptedFilePath = await encryp(FilePath, myKey);
      await db.executeSql('UPDATE files SET mergePdf = ? WHERE ident = ?', [
        encryptedFilePath,
        deviceId,
      ]);
    } else {
      const encryptedFilePath = await encryp(blue, myKey);
      await db.executeSql('UPDATE files SET mergePdf = ? WHERE ident = ?', [
        encryptedFilePath,
        deviceId,
      ]);
    }

    await saveText(text);
    await EncryptedStorage.setItem('result', 'collect');
    router.replace('collect');
  } catch (err) {
    console.error('Error during merging:', err);
    if (err.message && err.message.includes('ENOENT')) {
      Alert.alert(
        'Anlagen-Fehler',
        'Es gab ein Problem beim Lesen der Anlagen. Bitte überprüfe deine Dokumente.',
        [{ text: 'OK', onPress: () => router.dismissTo('upload') }],
      );
    } else {
      Alert.alert('Fehler', 'Bewerbungsmappe konnte nicht zusammengefügt werden.');
    }
    throw err;
  }
};

export const generate = async ({ text, router }) => {
  const myFont = await EncryptedStorage.getItem('font');

  try {
    let regFont;
    let boldFont;
    let actualFontSize = 11; // Standard-Fallbackgröße

    console.log('myFont:', myFont);
    const pdfDoc1 = await PDFDocument.create();

    if (myFont === 'Helvetica') {
      regFont = await pdfDoc1.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc1.embedFont(StandardFonts.HelveticaBold);
      actualFontSize = 11;
    } else {
      const { font, fontBold, fontSize } = await loadCustomFonts(pdfDoc1, myFont);
      regFont = font;
      boldFont = fontBold;
      if (fontSize) actualFontSize = fontSize;
    }

    const page = pdfDoc1.addPage([600, 800]);
    const { height: pageH } = page.getSize();

    const leftMargin = 60;
    const maxChars = 90;
    const lineHeight = actualFontSize + 4;
    let currentY = pageH - 60;
    const textWidth = 450;

    const [myName, myStreet, myCity, yourCompany, yourStreet, yourCity, objectSubject, myKey, language] =
      await Promise.all([
        EncryptedStorage.getItem('name'),
        EncryptedStorage.getItem('street'),
        EncryptedStorage.getItem('city'),
        EncryptedStorage.getItem('yourName'),
        EncryptedStorage.getItem('yourStreet'),
        EncryptedStorage.getItem('yourCity'),
        EncryptedStorage.getItem('subject'),
        EncryptedStorage.getItem('key'),
        EncryptedStorage.getItem('language'),
      ]);

    const timeCode = getLocaleCode(language);
    const today = new Date().toLocaleDateString(timeCode, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Absenderdaten (Regular Font)
    page.drawText(sanitizeForPdf(myName || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= lineHeight;
    page.drawText(sanitizeForPdf(myStreet || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= lineHeight;
    page.drawText(sanitizeForPdf(myCity || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= 4 * lineHeight;

    // Empfängerdaten (Regular Font)
    page.drawText(sanitizeForPdf(yourCompany || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= lineHeight;
    page.drawText(sanitizeForPdf(yourStreet || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= lineHeight;
    page.drawText(sanitizeForPdf(yourCity || ''), { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
    currentY -= 2 * lineHeight;

    // Datum (Regular Font)
    const dateX = leftMargin + textWidth - 50;
    page.drawText(today, { x: dateX, y: currentY, size: actualFontSize, font: regFont });
    currentY -= 2 * lineHeight;

    // Betreffzeilen (Bold Font)
    const cleanSubject = sanitizeForPdf(objectSubject || '');
    const subjectLines = splitTextIntoLinesWithoutFont(cleanSubject, 70);
    subjectLines.forEach((line) => {
      page.drawText(line, { x: leftMargin, y: currentY, size: actualFontSize + 2, font: boldFont });
      currentY -= lineHeight;
    });
    currentY -= 1 * lineHeight;

    // Anschreiben-Fließtext (Regular Font)
    const cleanText = sanitizeForPdf(text);
    const paragraphs = cleanText.split('\n\n');

    paragraphs.forEach((paragraph) => {
      const newLines = paragraph.split('\n');
      newLines.forEach((newParagraph) => {
        const trimm = newParagraph.trim();
        if (!trimm) return;
        const lines = splitTextIntoLinesWithoutFont(trimm, maxChars);
        lines.forEach((line) => {
          page.drawText(line, { x: leftMargin, y: currentY, size: actualFontSize, font: regFont });
          currentY -= lineHeight;
        });
      });
      currentY -= lineHeight;
    });

    const pdfBase641 = await pdfDoc1.saveAsBase64();
    const iv = await genIv();
    const Base64Part1 = pdfBase641.slice(0, 16);
    const Base64Part2 = pdfBase641.slice(16);
    const encrypted = await encryptBase64(Base64Part1, iv, myKey);

    const outputPath = `${RNFS.LibraryDirectoryPath}/anschreiben.pdf`;
    const outputPathNew = await encryp(outputPath, myKey);

    await EncryptedStorage.setItem('text', text);
    await RNFS.writeFile(outputPath, encrypted, 'base64');
    await RNFS.writeFile(`${outputPath}_1`, Base64Part2, 'base64');

    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    const deviceId = await DeviceInfo.getUniqueId();
    await db.executeSql('UPDATE files SET anschreiben = ? WHERE ident = ?', [
      outputPathNew,
      deviceId,
    ]);

    await mergeFilesFromDB({ text, router });
  } catch (error) {
    console.error('Error during PDF generation:', error);
    Alert.alert('Fehler', 'PDF konnte nicht generiert werden.');
    throw error;
  }
};