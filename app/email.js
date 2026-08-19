// ContactForm.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { router } from 'expo-router';
import forge from 'node-forge';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { crawlEmails } from '../inc/craw.js';
import ClearButton from '../comp/clearButton.jsx';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { WebView } from 'react-native-webview';
import colors from '../inc/colors.js';
import { decryp, decryptBase, encryp } from '../inc/cryp.js';
import { selectDb } from '../inc/db.js';
import { newLineComma } from '../inc/CutLine.js';
const ContactForm = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const [formData, setFormData] = useState({
    message: 'Bitte warten, Ihre Vorlage wird generiert.',
  });
  const [triggerGeneratePDF, setTriggerGeneratePDF] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [finishMessage, setFinishMessage] = useState('');
  const [decEmail, setDecEmail] = useState('');
  const [dotCount, setDotCount] = useState(0);
  const [emails, setEmails] = useState([]);
  const [saveButtonVisible, setSaveButtonVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const lastTimeClick = useRef(0);
  const [isFlatListVisible, setIsFlatListVisible] = useState(false);
  const DB_NAME = 'firstNew.db';
const [crawlProgress, setCrawlProgress] = useState(0); // <-- Neu
  // States für den Mail-Crawler
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatusText, setCrawlStatusText] = useState('');
  const [crawlDots, setCrawlDots] = useState('');

  useEffect(() => {
    console.log('Save Button Visible:', saveButtonVisible);
    console.log('Emails:', emails);
    console.log('Suggestions:', suggestions);
  }, [saveButtonVisible, emails, suggestions]);

  // Effekt für das rhythmische Blinken der drei Punkte
  useEffect(() => {
    let interval;
    if (isCrawling) {
      interval = setInterval(() => {
        setCrawlDots(prev => {
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

  useFocusEffect(
    useCallback(() => {
      const initializeForm = async () => {
        const splits = await selectDb();
        console.log('Splits:', splits);
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
          console.log('Key     ' + key);
          const encryptedData = publicKey.encrypt(key, 'RSA-OAEP');
          const encryptedDataBase64 = forge.util.encode64(encryptedData);
          const subject = await EncryptedStorage.getItem('subject');
          const db = await SQLite.openDatabase({
            name: DB_NAME,
            location: 'default',
          });

          const deviceId = await DeviceInfo.getUniqueId();

          db.transaction(tx => {
            console.log('Executing SQL query with WHERE clause');
            tx.executeSql(
              'SELECT * FROM files WHERE ident = ?;',
              [deviceId],
              async (_, { rows }) => {
                if (rows.length > 0) {
                  console.log('Entry found for deviceId:', deviceId);
                  const data = rows.item(0);
                  const {
                    name,
                    city,
                    street,
                    email,
                    emailPassword,
                    emailServer,
                  } = data;

                  setFormData(prevData => ({
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
                  console.log('Form data updated with database entry');
                } else {
                  console.log('No entry found for deviceId:', deviceId);
                }
              },
            );
          });
          if (await EncryptedStorage.getItem('merge')) {
            const mergeName = await EncryptedStorage.getItem('merge');
            const data = `${RNFS.LibraryDirectoryPath}/${mergeName}`;
            const base64String = await RNFS.readFile(data, 'base64');
            const abc = await decryptBase(base64String, key);
            const base64String2 = await RNFS.readFile(data + '_1', 'base64');
            Object.keys(formData).forEach(key => {
              console.log(key, formData[key]);
            });
            if (data) {
              setFormData(prevData => ({
                ...prevData,
                base64String,
                base64String2,
              }));
              console.log('Form data updated with base64 string');
            }
          } else {
            const name = await EncryptedStorage.getItem('yourName');
            const data = `${RNFS.LibraryDirectoryPath}/${name}_Bewerbungsmappe.pdf`;
            const base64String = await RNFS.readFile(data, 'base64');
            const abc = await decryptBase(base64String, key);
            const base64String2 = await RNFS.readFile(data + '_1', 'base64');
            
            Object.keys(formData).forEach(key => {
              console.log(key, formData[key]);
            });

            if (data) {
              setFormData(prevData => ({
                ...prevData,
                base64String,
                base64String2,
              }));
              console.log('Form data updated with base64 string');
            }
          }
        } catch (error) {
          console.error('Error in initializeForm:', error);
        }
      };

      initializeForm();

      return () => {
        console.log('Drawer-Screen wird verlassen.');
      };
    }, []),
  );

  useEffect(() => {
    generatePDF();
  }, [formData.emailPassword, route.params, triggerGeneratePDF]);

  useEffect(() => {
    (async () => {
      console.log('decEmail changed:', decEmail);
      
      const key = await EncryptedStorage.getItem('key');
      const encMail = await encryp(decEmail, key);

      setFormData(prevData => ({
        ...prevData,
        yourEmail: encMail,
      }));
    })();
  }, [decEmail]);

  const handleChange = (name, value) => {
    const updatedValue = value.replace(/\(at\)/gi, '@');
    setFormData(prevData => ({
      ...prevData,
      [name]: updatedValue,
    }));
  };

  const handleSubmit = async () => {
    const now = Date.now();
    if (now - lastTimeClick.current < 1000) {
      console.log('Zu schnell! Doppelklick verhindert.');
      return;
    }
    lastTimeClick.current = now;
    try {
      if (decEmail.length === 0) {
        Alert.alert(
          t('validation.email.required'),
          t('validation.email.required'),
          [{ text: t('common.ok') }],
        );
        return;
      }
      setIsLoaded(true);
      console.log('handleSubmit: start');
      const response = await fetch('https://api.jobapp2.de/emailNativ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      console.log('handleSubmit: response received');
      if (response.ok) {
        if (await EncryptedStorage.getItem('merge')) {
          await EncryptedStorage.removeItem('merge');
        }
        console.log('handleSubmit: response ok');
        Alert.alert(t('success.title'), t('emailSent.success'), [
          {
            text: t('common.ok'),
            onPress: async () => {
              if (await EncryptedStorage.getItem('result')) {
                await EncryptedStorage.removeItem('result');
              }
              if (await EncryptedStorage.getItem('merge')) {
                await EncryptedStorage.removeItem('merge');
              }
              console.log('handleSubmit: navigation reset');

              router.dismissTo('(tabs)');
              setIsLoaded(false);
            },
          },
        ]);

        console.log('handleSubmit: Alert shown');
        console.log('handleSu@@@@@@@@@@@@@@@@@@', formData.yourEmail);
      } else {
        console.log('handleSubmit: response not ok');
        const errorData = await response.json();
        console.log('handleSubmit: error data received', errorData);
        switch(errorData.code) {
          case "SMTP_SEND_FAILED":
Alert.alert(
  "Fehler beim Senden",
  "Benutzername, Passwort oder E-Mail-Server stimmen nicht. Bitte überprüfe deine Angaben.",
  [{ text: "OK" }]
);        }
      }
    } catch (error) {
      console.log('handleSubmit: error caught');
      Alert.alert('Netzwerkfehler: ' + error.message);
    }
  };

  const handleMail = value => {
    setDecEmail(value);
    if (emails !== null) {
      const newOne = emails.filter(job =>
        job.toLowerCase().includes(value.toLowerCase()),
      );
      setSuggestions(newOne);
      setIsFlatListVisible(true);
      if (newOne.length === 0 || value === '' ) {
        setIsFlatListVisible(false);
      }
      setSaveButtonVisible(true);
    } else {
      setDecEmail(value);
    }
  };

  const saveButton = async () => {
    console.log('saveButton: start');
    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    const db = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });

    db.transaction(tx => {
      tx.executeSql(
        'SELECT emails FROM files WHERE ident = ?',
        [deviceId],
        async (_, { rows }) => {
          console.log('saveButton: SELECT query executed');
          if (rows.length > 0) {
            console.log('saveButton: Entry found for deviceId:', rows.length);
            const data = rows.item(0);
            const { emails } = data;
            if (emails === null) {
              const newEmails = await encryp(decEmail, key);
              db.transaction(tx => {
                tx.executeSql(
                  'UPDATE files SET emails = ? WHERE ident = ?',
                  [newEmails, deviceId],
                  (_, result) => {
                    console.log('saveButton1: Update successful:', result);
                    return;
                  },
                  error => {
                    console.error('saveButton: Error updating data:', error);
                  },
                );
              });
            }

            let decMails;
            if (emails !== null) {
              decMails = await decryp(emails, key);
            }
            const safeDecMails = decMails || ''; 

            const newEmails = safeDecMails.includes('#')
              ? safeDecMails.split('#')
              : [safeDecMails];
            
            setEmails([...newEmails, decEmail]);
            if (!newEmails.includes(decEmail)) {
              newEmails.push(decEmail);
              const updatedEmails = newEmails.join('#');
              const encEmails = await encryp(updatedEmails, key);
              db.transaction(tx => {
                tx.executeSql(
                  'UPDATE files SET emails = ? WHERE ident = ?',
                  [encEmails, deviceId],
                  (_, result) => {
                    console.log('saveButton2: Update successful:', result);
                  },
                  error => {
                    console.error('saveButton: Error updating data:', error);
                  },
                );
              });
            }
          }
        },
      );
    });
    setSaveButtonVisible(false);
  };

  const crawTheMails = async () => {
  setIsCrawling(true);
  setCrawlProgress(0); // Reset auf 0%
  setCrawlStatusText('Bitte warten');

  try {
    const beruf = await EncryptedStorage.getItem("yourName");
    console.log(beruf);

    const ergebnisse = await crawlEmails(beruf, (status, found) => {
      console.log(status); 
      console.log(found)
      setCrawlStatusText('Bitte warten');
      
      // Pro Log/Callback um 4 % erhöhen (maximal bis 100 %)
      setCrawlProgress(prev => Math.min(prev + 5, 100));
    });

    console.log('Crawler-Ergebnis:', ergebnisse);

    if (ergebnisse && ergebnisse.length > 0) {
      setCrawlProgress(100); // Auf 100% setzen, wenn fertig
      setSuggestions(ergebnisse);
      setIsFlatListVisible(true);
      setCrawlStatusText('E-Mails gefunden!');
      setIsCrawling(false);
      setCrawlStatusText('');
    } else {
      setCrawlStatusText('Keine vorhanden');
    }
  } catch (error) {
    console.error(error);
    setCrawlStatusText('Fehler bei der Suche');
  } finally {
    setTimeout(() => {
      setIsCrawling(false);
      setCrawlStatusText('');
      setCrawlProgress(0);
    }, 3000);
  }
};

  const generatePDF = async () => {
    const choices = await EncryptedStorage.getItem('choices');
    const theName = await EncryptedStorage.getItem('anrede');
    const beruf = await EncryptedStorage.getItem('beruf');
    const prompt1 = `Schreibe genau zwei kurze Absätze für eine E-Mail-Vorlage ${
      choices === 'Praktikum' ? 'für ein Praktikum' : ''
    } an ${
      theName
        ? theName + ', an die ich meine Bewerbungsmappe sende'
        : 'eine Firma, an die ich meine Bewerbungsmappe sende'
    }.

Vorgaben:
- Lass den Betreff komplett weg.
- Der Beruf ist: ${beruf || ''}.
- Erwähne am Ende keinen Namen, keinen Wohnort und keine Platzhalter.
- Beende den Text direkt nach dem letzten Satz des zweiten Absatzes. Schreibe KEINE Grußformel (kein "Mit freundlichen Grüßen", "Viele Grüße" o.ä.) und keine Verabschiedung am Ende.`;
    try {
      const response = await axios.post('https://api.jobapp2.de/getEmail', {
        prompt1: prompt1,
      });
      const myName = await EncryptedStorage.getItem('name');
      const data = newLineComma(response.data.response);
      const subject = (await EncryptedStorage.getItem('subject')) || '';

      const newData = data + '\n\n' + "Mit freundlichen Grüßen" + '\n\n' + myName;

      setFormData(prevData => ({
        ...prevData,
        message: newData,
        subject: subject || '',
      }));

      setFinishMessage('Die Vorlage kann nun bearbeitet werden.');
    } catch (error) {
      console.error(error);
      setFinishMessage('Es gab ein Problem bei der Erstellung der Vorlage.');
    } finally {
      setTriggerGeneratePDF(false);
    }
  };

  const handleSuggestionClick = suggestion => {
    setDecEmail(suggestion);
    setIsFlatListVisible(false);
    setSaveButtonVisible(false);
      const newOne = emails.filter(job =>
        job.toLowerCase().includes(suggestion.toLowerCase()),
      );
      if (!newOne.includes(suggestion)) {
        setSaveButtonVisible(true)
      }
    
  };

  const deleteItem = async item => {
    let encMails;
    const deviceId = await DeviceInfo.getUniqueId();

    const db = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });
    const key = await EncryptedStorage.getItem('key');
    const filteredEmails = emails.filter(email => email !== item && email !== "");
    if (filteredEmails.length > 0) {
      const updatedEmails = filteredEmails.join('#');
      encMails = await encryp(updatedEmails, key);

      db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET emails = ? WHERE ident = ?',
          [encMails, deviceId],
          (_, result) => {
            setSuggestions(filteredEmails);
          },
          error => {
            console.error('saveButton: Error updating data:', error);
          },
        );
      });
      setEmails(filteredEmails);
    } else {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET emails = ? WHERE ident = ?',
          [null, deviceId],
          (_, result) => {
            setSuggestions([]);
            setEmails(null);
            setIsFlatListVisible(false);
          },
          error => {
            console.error('saveButton: Error updating data:', error);
          },
        );
      });
    }
  };

  const { width, height } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.containerTwo}>
        {/* Email Input + Button */}
        <View style={styles.emailContainer}>
          <TextInput
            style={styles.emailInput}
            keyboardType="email-address"
            name="email1"
            placeholder={t('email.placeholder')}
            placeholderTextColor="gray"
            value={decEmail}
            onChangeText={handleMail}
          />
          
          {/* LADEANZEIGE IM MATCHENDEN DESIGN ODER VORSCHLÄGE */}
       {isCrawling ? (
  <View style={[styles.suggestionsList, styles.crawlingStatusContainer]}>
    <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
    <Text style={styles.crawlingStatusText}>
      ({crawlProgress}%) {crawlStatusText}{crawlDots}
    </Text>
  </View>
) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    onPress={() => deleteItem(item)}
                    style={styles.suggestionItemContainerDelete}
                  >
                    <Text style={styles.suggestionItemDelete}>X</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSuggestionClick(item)}
                    style={styles.suggestionItemContainer}
                  >
                    <Text style={styles.suggestionItem}>{item}</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyboardShouldPersistTaps="handled"
              style={[
                styles.suggestionsList,
                { display: isFlatListVisible ? 'flex' : 'none' },
              ]}
            />
          )}

          {saveButtonVisible && decEmail.length > 0 ? (
            <TouchableOpacity onPress={saveButton} style={styles.saveButton}>
              <MaterialIcons name="save" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={crawTheMails} style={styles.saveButton}>
              <MaterialIcons name="search" size={24} color="gray" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoaded}>
            <Text style={styles.buttonText}>{isLoaded ? t('pleaseWait') : t('email.sendButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <TextInput
            style={styles.subject}
            multiline
            numberOfLines={4}
            name="subject"
            placeholder={t('subject.placeholder')}
            placeholderTextColor="gray"
            value={formData.subject}
            onChangeText={value => handleChange('subject', value)}
          />

          <TextInput
            style={[styles.textarea, styles.messageTextarea]}
            multiline
            numberOfLines={30}
            scrollEnabled={true}
            name="message"
            placeholder={t('message.placeholder')}
            placeholderTextColor="gray"
            value={formData.message}
            onChangeText={value => handleChange('message', value)}
          />
        </View>
      </View>
      
      {/* Modal with WebView */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.webviewWrapper}>
            <WebView
              source={{ uri: webUrl }}
              onNavigationStateChange={navState => console.log(navState)}
              style={styles.webview}
            />
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ContactForm;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    width: '100%',
    backgroundColor: colors.background,
  },
  suggestionsList: {
    position: 'absolute',
    top: 35,
    width: '100%',
    zIndex: 1,
    marginTop: 10,
    maxHeight: 160,
    borderRadius: 8,
    backgroundColor: colors.card3, 
    overflow: 'hidden',
    borderWidth:1,
    borderColor: "#eee"
  },
  crawlingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 12,
  },
  crawlingStatusText: {
    color: 'white',
    fontSize: 16,
  },
  suggestionItemContainer: {
    padding: 10,
    backgroundColor: colors.card3,
  },
  suggestionItemContainerDelete: {
    padding: 10,
    backgroundColor: colors.card3,
    right: 0,
    position: 'absolute',
    zIndex: 20,
  },
  suggestionItemDelete: {
    fontSize: 16,
    color: 'white',
  },
  suggestionItem: {
    fontSize: 16,
    color: 'white',
  },
  containerTwo: {
    marginTop: height * 0.01,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    position: 'relative', 
    zIndex: 10,
    width: width * 0.95, 
  },
  emailInput: {
    flex: 1,
    borderColor: 'gray',
    borderBottomWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    color: 'white',
  },
  button: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
  },
  saveButton: {
    position: 'relative',
    right: 3,
    backgroundColor: 'transparent',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
  },
  textarea: {
    width: width * 0.96,
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    textAlignVertical: 'top',
    color: 'white',
  },
  subject: {
    borderBottomWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    textAlignVertical: 'top',
    color: 'white',
  },
  messageTextarea: {
    height: height * 0.6,
    paddingBottom:height*0.22
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewWrapper: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ff3333',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});