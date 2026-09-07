// ChangeScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { Buffer } from 'buffer';
import { router } from 'expo-router';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
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
import { runQuery } from '../inc/db.js';

const { width } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const ChangeScreen = ({ visible, onClose }) => {
  const { t } = useTranslation();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [subject, setSubject] = useState('');

  const currentTextRef = useRef('');
  currentTextRef.current = text;

  /* ── Lokale Slide-In Animation ── */
  const animCardX = useRef(new Animated.Value(width)).current;

  /* ── Dynamische Anpassung an die Tastaturhöhe ── */
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event) => {
      Animated.timing(keyboardPadding, {
        toValue: event.endCoordinates.height * 0.9,
        duration: Platform.OS === 'ios' ? event.duration || 250 : 180,
        useNativeDriver: false, // Layout-Padding benötigt false
      }).start();
    };

    const onKeyboardHide = (event) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event?.duration || 250 : 180,
        useNativeDriver: false,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvent, onKeyboardShow);
    const subHide = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [keyboardPadding]);

  useEffect(() => {
    Animated.timing(animCardX, {
      toValue: visible ? 0 : width,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [visible, animCardX]);

  /* ── Text laden & Persistenz ── */
  useEffect(() => {
    const loadText = async () => {
      try {
        const [anrede, name, subj, savedEditedText, myText] = await Promise.all([
          EncryptedStorage.getItem('anrede'),
          EncryptedStorage.getItem('name'),
          EncryptedStorage.getItem('subject'),
          EncryptedStorage.getItem('editedCoverLetter'),
          EncryptedStorage.getItem('text'),
        ]);

        if (subj) setSubject(subj);

        if (savedEditedText) {
          setText(savedEditedText);
          currentTextRef.current = savedEditedText;
        } else if (myText) {
          const composed = `${anrede || ''}\n\n${myText}\n\n${name || ''}`.trim();
          setText(composed);
          currentTextRef.current = composed;
          await EncryptedStorage.setItem('editedCoverLetter', composed);
        }
      } catch (error) {
        console.error('Error loading text:', error);
      }
    };

    if (visible) {
      loadText();
    }

    return () => {
      if (currentTextRef.current) {
        EncryptedStorage.setItem('editedCoverLetter', currentTextRef.current).catch(() => {});
      }
    };
  }, [visible]);

  const handleTextChange = useCallback((newText) => {
    setText(newText);
    currentTextRef.current = newText;
    EncryptedStorage.setItem('editedCoverLetter', newText).catch(() => {});
  }, []);

  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);

  const saveText = async () => {
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
    }
  };

  const mergeFilesFromDB = async () => {
    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, 200);

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

      await saveText();
      clearInterval(interval);
      setDots('');
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
    } finally {
      clearInterval(interval);
      setDots('');
      setLoading(false);
    }
  };

  const splitTextIntoLinesWithoutFont = (textBlock, maxChars) => {
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

  const generate = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const pdfDoc1 = await PDFDocument.create();
      const helvetica = await pdfDoc1.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc1.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc1.addPage([600, 800]);
      const { height: pageH } = page.getSize();

      const fontSize = 11;
      const leftMargin = 60;
      const maxChars = 90;
      const lineHeight = fontSize + 4;
      let currentY = pageH - 60;
      const textWidth = 450;

      const [myName, myStreet, myCity, yourCompany, yourStreet, yourCity, objectSubject, myKey] =
        await Promise.all([
          EncryptedStorage.getItem('name'),
          EncryptedStorage.getItem('street'),
          EncryptedStorage.getItem('city'),
          EncryptedStorage.getItem('yourName'),
          EncryptedStorage.getItem('yourStreet'),
          EncryptedStorage.getItem('yourCity'),
          EncryptedStorage.getItem('subject'),
          EncryptedStorage.getItem('key'),
        ]);

      const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // Absender
      page.drawText(myName || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(myStreet || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(myCity || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= 4 * lineHeight;

      // Empfänger
      page.drawText(yourCompany || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(yourStreet || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= lineHeight;
      page.drawText(yourCity || '', { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
      currentY -= 2 * lineHeight;

      // Datum
      const dateX = leftMargin + textWidth - 50;
      page.drawText(today, { x: dateX, y: currentY, size: fontSize, font: helvetica });
      currentY -= 2 * lineHeight;

      // Betreff
      const subjectLines = splitTextIntoLinesWithoutFont(objectSubject || '', 70);
      subjectLines.forEach((line) => {
        page.drawText(line, { x: leftMargin, y: currentY, size: fontSize + 2, font: helveticaBold });
        currentY -= lineHeight;
      });
      currentY -= 1 * lineHeight;

      // Haupttext
      const paragraphs = text.split('\n\n');
      paragraphs.forEach((paragraph) => {
        const lines = splitTextIntoLinesWithoutFont(paragraph, maxChars);
        lines.forEach((line) => {
          page.drawText(line, { x: leftMargin, y: currentY, size: fontSize, font: helvetica });
          currentY -= lineHeight;
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

      await mergeFilesFromDB();
    } catch (error) {
      console.error('Error during PDF generation:', error);
      setLoading(false);
      Alert.alert('Fehler', 'PDF konnte nicht generiert werden.');
    }
  };

 return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        
        {/* 1. ÄUßERER CONTAINER: Nur Native Driver (Slide-In X) */}
        <Animated.View
          style={[
            styles.nativeWrap,
            { transform: [{ translateX: animCardX }] },
          ]}
        >
          {/* 2. INNERER CONTAINER: Nur JS Driver (Tastatur PaddingBottom) */}
          <Animated.View
            style={[
              styles.container,
              {
                paddingBottom: Animated.add(
                  keyboardPadding,
                  Platform.OS === 'ios' ? 16 : 22
                ),
              },
            ]}
          >
            <View style={styles.editorCard}>
              <View style={styles.editorHeader}>
                <View style={styles.editorHeaderLeft}>
                  <MaterialIcons name="edit-note" size={20} color="#60A5FA" />
                  <Text style={styles.editorHeaderText}>Text-Editor</Text>
                </View>

                <View style={styles.editorHeaderRight}>
                  <View style={styles.wordBadge}>
                    <Text style={styles.wordBadgeText}>{wordCount} Wörter</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={17} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.textArea}
                value={text}
                onChangeText={handleTextChange}
                placeholder={t('placeholderText') || 'Hier Text eingeben...'}
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                multiline={true}
                textAlignVertical="top"
                showsVerticalScrollIndicator={true}
              />
            </View>

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.generateButton}
                disabled={loading}
                onPress={generate}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.generateBtnText}>
                      {`Bewerbungsmappe wird erstellt`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <MaterialIcons
                      name="picture-as-pdf"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.generateBtnText}>
                      {t('saveCoverLetter') || 'Mappe generieren & fortsetzen'}
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>

      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};
/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
 safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  nativeWrap: {
    flex: 1, // Füllt den gesamten Screen aus für das Slide-In
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  editorCard: {
    flex: 1,
    backgroundColor: '#171B26',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  editorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editorHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  wordBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  wordBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    flex: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  actionContainer: {
    marginTop: 6,
  },
  generateButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ChangeScreen;