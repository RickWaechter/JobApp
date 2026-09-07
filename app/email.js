// ContactForm.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { router } from 'expo-router';
import forge from 'node-forge';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { WebView } from 'react-native-webview';

import colors from '../inc/colors.js';
import { crawlEmails } from '../inc/craw.js';
import { decryp, decryptBase, encryp } from '../inc/cryp.js';
import { newLineComma } from '../inc/CutLine.js';
import { selectDb } from '../inc/db.js';

const { width, height } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const ContactForm = () => {
  const { t } = useTranslation();
  const route = useRoute();

  /* ── States ──────────────────────────────────────────── */
  const [formData, setFormData] = useState({
    message: 'Bitte warten, Ihre Vorlage wird generiert.',
    subject: '',
  });
  const [triggerGeneratePDF, setTriggerGeneratePDF] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [decEmail, setDecEmail] = useState('');
  const [emails, setEmails] = useState([]);
  const [saveButtonVisible, setSaveButtonVisible] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [isFlatListVisible, setIsFlatListVisible] = useState(false);

  /* ── Crawler States ──────────────────────────────────── */
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatusText, setCrawlStatusText] = useState('');
  const [crawlDots, setCrawlDots] = useState('');

  const lastTimeClick = useRef(0);

  /* ── Crawler Dots Animation ──────────────────────────── */
  useEffect(() => {
    let interval;
    if (isCrawling) {
      interval = setInterval(() => {
        setCrawlDots((prev) => {
          if (prev === '...') return '';
          if (prev === '..') return '...';
          if (prev === '.') return '..';
          return '.';
        });
      }, 500);
    } else {
      setCrawlDots('');
    }
    return () => clearInterval(interval);
  }, [isCrawling]);

  /* ── Form Initialisierung ────────────────────────────── */
  useFocusEffect(
    useCallback(() => {
      const initializeForm = async () => {
        const splits = await selectDb();
        setEmails(splits);

        const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqKkQnDPIazdOj1PXol7M
fSBIvT6cw79qlTXHBLVWdHLwL3S/2A2jgQbgwT9ZgWZeHAUxCX/vzhV3KSM8nDpi
Jpeut3tqpiXCUvqdfvT7oaeALBdGhf+UWN0JLkQGx3UgDOhkSaIZ14hUYBMwvho4
/K4GW7iCMt+qlikdtNXh84gHbPzcqBApQ2AX/aZ4YDeFSBftq5Jn3TDgAPtAxEZ9
p5k9Hy+YZmqkx0plkY6jbUAxNa4OBnEsyVwj8GXTJTDumc4X7NbgcnpjSgVBEgVf
LPGYqYu0+MSuRO6/ufuHOWiNWYotcV3P89ESWh7KiDrP+xEp/Q3Q9v454FSlxfbz
XwIDAQAB
-----END PUBLIC KEY-----`;

        try {
          const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
          const key = await EncryptedStorage.getItem('key');
          const encryptedData = publicKey.encrypt(key, 'RSA-OAEP');
          const encryptedDataBase64 = forge.util.encode64(encryptedData);
          const subject = await EncryptedStorage.getItem('subject');

          const db = await SQLite.openDatabase({
            name: DB_NAME,
            location: 'default',
          });

          const deviceId = await DeviceInfo.getUniqueId();

          db.transaction((tx) => {
            tx.executeSql(
              'SELECT * FROM files WHERE ident = ?;',
              [deviceId],
              async (_, { rows }) => {
                if (rows.length > 0) {
                  const data = rows.item(0);
                  const {
                    name,
                    city,
                    street,
                    email,
                    emailPassword,
                    emailServer,
                  } = data;

                  setFormData((prevData) => ({
                    ...prevData,
                    name,
                    city,
                    street,
                    email,
                    emailPassword,
                    emailServer,
                    subject,
                    key: encryptedDataBase64,
                  }));
                }
              }
            );
          });

          // PDF-Anhänge laden und entschlüsseln
          const mergeName = await EncryptedStorage.getItem('merge');
          let dataPath = '';

          if (mergeName) {
            dataPath = `${RNFS.LibraryDirectoryPath}/${mergeName}`;
          } else {
            const userName = await EncryptedStorage.getItem('yourName');
            dataPath = `${RNFS.LibraryDirectoryPath}/${userName}_Bewerbungsmappe.pdf`;
          }

          const base64String = await RNFS.readFile(dataPath, 'base64');
          const decryptedBase = await decryptBase(base64String, key);
          const base64String2 = await RNFS.readFile(`${dataPath}_1`, 'base64');

          if (dataPath) {
            setFormData((prevData) => ({
              ...prevData,
              base64String: decryptedBase,
              base64String2,
            }));
          }
        } catch (error) {
          console.error('Error in initializeForm:', error);
        }
      };

      initializeForm();
    }, [])
  );

  useEffect(() => {
    generateEmailTemplate();
  }, [formData.emailPassword, route.params, triggerGeneratePDF]);

  /* ── Verschlüsselte Empfänger-Mail synchronisieren ────── */
  useEffect(() => {
    (async () => {
      const key = await EncryptedStorage.getItem('key');
      const encMail = await encryp(decEmail, key);
      setFormData((prevData) => ({
        ...prevData,
        yourEmail: encMail,
      }));
    })();
  }, [decEmail]);

  const handleChange = (name, value) => {
    const updatedValue = value.replace(/\(at\)/gi, '@');
    setFormData((prevData) => ({
      ...prevData,
      [name]: updatedValue,
    }));
  };

  /* ── E-Mail versenden (API Call) ─────────────────────── */
  const handleSubmit = async () => {
    const now = Date.now();
    if (now - lastTimeClick.current < 1000) return;
    lastTimeClick.current = now;

    try {
      if (decEmail.trim().length === 0) {
        Alert.alert(
          t('validation.email.required') || 'E-Mail erforderlich',
          'Bitte trage die Empfänger-E-Mail-Adresse ein.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsLoaded(true);
      const response = await fetch('https://api.jobapp2.de/emailNativ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        if (await EncryptedStorage.getItem('merge')) {
          await EncryptedStorage.removeItem('merge');
        }

        Alert.alert(
          t('success.title') || 'Erfolg',
          t('emailSent.success') || 'Deine Bewerbung wurde erfolgreich per E-Mail versendet!',
          [
            {
              text: 'OK',
              onPress: async () => {
                if (await EncryptedStorage.getItem('result')) {
                  await EncryptedStorage.removeItem('result');
                }
                if (await EncryptedStorage.getItem('merge')) {
                  await EncryptedStorage.removeItem('merge');
                }
                router.dismissTo('(tabs)');
                setIsLoaded(false);
              },
            },
          ]
        );
      } else {
        const errorData = await response.json();
        if (errorData.code === 'SMTP_SEND_FAILED') {
          Alert.alert(
            'Fehler beim Senden',
            'Benutzername, Passwort oder E-Mail-Server stimmen nicht. Bitte überprüfe deine Angaben im Profil.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Fehler', errorData.message || 'E-Mail konnte nicht versendet werden.');
        }
        setIsLoaded(false);
      }
    } catch (error) {
      setIsLoaded(false);
      Alert.alert('Netzwerkfehler', error.message || 'Verbindung fehlgeschlagen.');
    }
  };

  /* ── Mail-Eingabe & Vorschläge ───────────────────────── */
  const handleMail = (value) => {
    setDecEmail(value);
    if (emails !== null && emails.length > 0) {
      const filtered = emails.filter((mail) =>
        mail.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setIsFlatListVisible(filtered.length > 0 && value.trim().length > 0);
      setSaveButtonVisible(true);
    } else {
      setIsFlatListVisible(false);
    }
  };

  /* ── E-Mail in DB merken ─────────────────────────────── */
  /* ── E-Mail in DB merken ─────────────────────────────── */
  const saveButton = async () => {
    try {
      const key = await EncryptedStorage.getItem('key');
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      // 1. Emails synchron/gekapselt auslesen
      let rawEmails = null;
      let recordExists = false;

      await new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            'SELECT emails FROM files WHERE ident = ?',
            [deviceId],
            (_, { rows }) => {
              if (rows.length > 0) {
                recordExists = true;
                rawEmails = rows.item(0).emails;
              }
              resolve();
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });

      if (!recordExists) return;

      // 2. Asynchrone Krypto-Operationen AUSSERHALB der Transaktion durchführen
      let emailArray = [];
      let encEmails = '';

      if (rawEmails === null) {
        encEmails = await encryp(decEmail.trim(), key);
        emailArray = [decEmail.trim()];
      } else {
        const decMails = await decryp(rawEmails, key);
        const safeDecMails = decMails || '';
        emailArray = safeDecMails.includes('#')
          ? safeDecMails.split('#')
          : [safeDecMails];

        if (!emailArray.includes(decEmail.trim())) {
          emailArray.push(decEmail.trim());
          const updatedString = emailArray.join('#');
          encEmails = await encryp(updatedString, key);
        } else {
          setSaveButtonVisible(false);
          return;
        }
      }

      // 3. Update in einer frischen, sauberen Transaktion speichern
      await new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            'UPDATE files SET emails = ? WHERE ident = ?',
            [encEmails, deviceId],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });

      setEmails(emailArray);
      setSaveButtonVisible(false);
      Alert.alert('Gespeichert', 'E-Mail-Adresse für spätere Vorschläge gemerkt.');
    } catch (e) {
      console.error('Fehler beim Speichern der Mail:', e);
    }
  };

  /* ── Crawler für E-Mails ─────────────────────────────── */
  const crawTheMails = async () => {
    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlStatusText('Suche nach Kontakten');

    try {
      const companyName = await EncryptedStorage.getItem('yourName');
      const results = await crawlEmails(companyName, (status, found) => {
        setCrawlStatusText(t('emailSearch') );
        setCrawlProgress((prev) => Math.min(prev + 5, 100));
      });

      if (results && results.length > 0) {
        setCrawlProgress(100);
        setSuggestions(results);
        setIsFlatListVisible(true);
        setCrawlStatusText('E-Mails gefunden!');
      } else {
        setCrawlStatusText('Keine Kontakte gefunden');
      }
    } catch (error) {
      console.error('Crawler Error:', error);
      setCrawlStatusText('Fehler bei der Suche');
    } finally {
      setTimeout(() => {
        setIsCrawling(false);
        setCrawlStatusText('');
        setCrawlProgress(0);
      }, 3000);
    }
  };

  /* ── KI-Vorlage für E-Mail-Text ──────────────────────── */
  const generateEmailTemplate = async () => {
    try {
      const choices = await EncryptedStorage.getItem('choices');
      const theName = await EncryptedStorage.getItem('anrede');
      const beruf = await EncryptedStorage.getItem('beruf');

      const prompt1 = `Schreibe genau zwei kurze Absätze für eine E-Mail-Vorlage ${
        choices === 'Praktikum' ? 'für ein Praktikum' : ''
      } an ${
        theName
          ? `${theName}, an die ich meine Bewerbungsmappe sende`
          : 'eine Firma, an die ich meine Bewerbungsmappe sende'
      }.

Vorgaben:
- Lass den Betreff komplett weg.
- Der Beruf ist: ${beruf || ''}.
- Erwähne am Ende keinen Namen, keinen Wohnort und keine Platzhalter.
- Beende den Text direkt nach dem letzten Satz des zweiten Absatzes. Schreibe KEINE Grußformel (kein "Mit freundlichen Grüßen", "Viele Grüße" o.ä.) und keine Verabschiedung am Ende.`;

      const response = await axios.post('https://api.jobapp2.de/getEmail', {
        prompt1,
      });

      const myName = await EncryptedStorage.getItem('name');
      const data = newLineComma(response.data.response);
      const subject = (await EncryptedStorage.getItem('subject')) || '';

      const fullMessage = `${data}\n\nMit freundlichen Grüßen\n\n${myName || ''}`;

      setFormData((prevData) => ({
        ...prevData,
        message: fullMessage,
        subject: subject || '',
      }));
    } catch (error) {
      console.error('Error generating email template:', error);
    } finally {
      setTriggerGeneratePDF(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setDecEmail(suggestion);
    setIsFlatListVisible(false);
    setSaveButtonVisible(false);

    if (emails && !emails.includes(suggestion)) {
      setSaveButtonVisible(true);
    }
  };

  const deleteItem = async (item) => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      const key = await EncryptedStorage.getItem('key');
      const filteredEmails = emails.filter((email) => email !== item && email !== '');

      if (filteredEmails.length > 0) {
        const updatedString = filteredEmails.join('#');
        const encMails = await encryp(updatedString, key);

        db.transaction((tx) => {
          tx.executeSql(
            'UPDATE files SET emails = ? WHERE ident = ?',
            [encMails, deviceId],
            () => {
              setSuggestions(filteredEmails);
            }
          );
        });
        setEmails(filteredEmails);
      } else {
        db.transaction((tx) => {
          tx.executeSql(
            'UPDATE files SET emails = ? WHERE ident = ?',
            [null, deviceId],
            () => {
              setSuggestions([]);
              setEmails(null);
              setIsFlatListVisible(false);
            }
          );
        });
      }
    } catch (e) {
      console.error('Fehler beim Löschen des Kontakts:', e);
    }
  };

return (
  <SafeAreaView style={styles.safeArea}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.container}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.badgeHub}>
              <View style={styles.statusDot} />
              <Text style={styles.badgeHubText}>DIREKTER VERSAND</Text>
            </View>
            <Text style={styles.titleMain}>Bewerbung versenden</Text>
            <Text style={styles.subtitleMain}>
              Überprüfe Empfänger, Betreff und Begleitschreiben vor dem Absenden.
            </Text>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 1. Empfänger-Feld mit Vorschlägen ── */}
            <View style={styles.emailFieldContainer}>
              <Text style={styles.fieldLabel}>EMPFÄNGER E-MAIL</Text>

              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="alternate-email"
                  size={18}
                  color="rgba(255, 255, 255, 0.4)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('email.placeholder') || 'personal@unternehmen.de'}
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={decEmail}
                  onChangeText={handleMail}
                />

                {saveButtonVisible && decEmail.length > 0 ? (
                  <TouchableOpacity
                    onPress={saveButton}
                    style={styles.iconActionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="bookmark-border" size={18} color="#60A5FA" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={crawTheMails}
                    style={styles.iconActionBtn}
                    disabled={isCrawling}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons
                      name="travel-explore"
                      size={18}
                      color={isCrawling ? '#3B82F6' : 'rgba(255, 255, 255, 0.5)'}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Crawler Status */}
              {isCrawling && (
                <View style={styles.crawlingStatusContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.crawlingStatusText}>
                    ({crawlProgress}%) {crawlStatusText}{crawlDots}
                  </Text>
                </View>
              )}

              {/* Suggestions Dropdown */}
              {!isCrawling && isFlatListVisible && suggestions.length > 0 && (
                <View style={styles.suggestionsCard}>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => index.toString()}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <View style={styles.suggestionRow}>
                        <TouchableOpacity
                          onPress={() => handleSuggestionClick(item)}
                          style={styles.suggestionTextArea}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="history"
                            size={15}
                            color="rgba(255,255,255,0.4)"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.suggestionText} numberOfLines={1}>
                            {item}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => deleteItem(item)}
                          style={styles.deleteSuggestionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="close" size={15} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}
            </View>

            {/* ── 2. Betreff ── */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>BETREFF</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="title"
                  size={18}
                  color="rgba(255, 255, 255, 0.4)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('subject.placeholder') || 'Betreff eingeben...'}
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={formData.subject}
                  onChangeText={(value) => handleChange('subject', value)}
                />
              </View>
            </View>

            {/* ── 3. Nachricht ── */}
            <View style={styles.messageFieldContainer}>
              <Text style={styles.fieldLabel}>BEGLEITSCHREIBEN</Text>
              <TextInput
                style={styles.messageTextarea}
                multiline={true}
                scrollEnabled={true}
                textAlignVertical="top"
                placeholder={t('message.placeholder') || 'Sehr geehrte Damen und Herren...'}
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={formData.message}
                onChangeText={(value) => handleChange('message', value)}
              />
            </View>
          </ScrollView>

          {/* ── Sende-CTA ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSubmit}
              disabled={isLoaded}
              activeOpacity={0.85}
            >
              {isLoaded ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>
                    {t('pleaseWait') || 'Wird gesendet...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <MaterialIcons
                    name="send"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.sendButtonText}>
                    {t('email.sendButton') || 'E-Mail jetzt senden'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>

    {/* ── Natives WebView Modal ── */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      statusBarTranslucent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <MaterialIcons name="language" size={20} color="#60A5FA" />
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                Web-Vorschau
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.webviewWrapper}>
            <WebView source={{ uri: webUrl }} style={styles.webview} />
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
}
export default ContactForm;

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    justifyContent: 'space-between',
  },

  /* ── Header ── */
  header: {
    marginBottom: 8,
  },
  badgeHub: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
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
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  titleMain: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleMain: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },

  /* ── Form Areas ── */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 8,
    paddingVertical: 2,
  },
  emailFieldContainer: {
    position: 'relative',
    zIndex: 100, // Garantiert, dass die Suggestion-Liste über den unteren Feldern liegt
  },
  fieldContainer: {
    position: 'relative',
    zIndex: 1,
  },
  messageFieldContainer: {
    flex: 1,
    minHeight: 120,
  },
  fieldLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    height: '100%',
  },
  iconActionBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Crawler Status & Suggestions ── */
  crawlingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  crawlingStatusText: {
    color: '#60A5FA',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 64, // Positioniert sich direkt unter dem E-Mail-Input
    left: 0,
    right: 0,
    maxHeight: 145,
    backgroundColor: '#1E2433',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 9999,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionTextArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
  },
  deleteSuggestionBtn: {
    padding: 4,
    marginLeft: 6,
  },

  /* ── Textarea ── */
  messageTextarea: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 110,
  },

  /* ── Footer ── */
  footer: {
    marginTop: 8,
  },
  sendButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── Modal ── */
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
  modalContainer: {
    width: '94%',
    height: '86%',
    backgroundColor: '#171B26',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
  },
});