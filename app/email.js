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
} from 'react-native';
import ClearButton from '../comp/clearButton.jsx';

import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { WebView } from 'react-native-webview';
import colors from '../inc/colors.js';
import { decryp, decryptBase, encryp } from '../inc/cryp.js';
import { selectDb } from '../inc/db.js';
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
  // To control the number of dots
  const DB_NAME = 'firstNew.db';

  useEffect(() => {
    console.log('Save Button Visible:', saveButtonVisible);
    console.log('Emails:', emails);
    console.log('Suggestions:', suggestions);
  }, [saveButtonVisible, emails, suggestions]);

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

      // Deine Funktion hier ausführen

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
            },
          },
        ]);

        console.log('handleSubmit: Alert shown');
        console.log('handleSu@@@@@@@@@@@@@@@@@@', formData.yourEmail);
      } else {
        console.log('handleSubmit: response not ok');
        const { message } = await response.json();
        console.log('handleSubmit: error message received');
        switch (message) {
          case 'Error sending mail or querying database':
            console.log(
              'handleSubmit: error sending mail or querying database',
            );
            Alert.alert(t('alerts.error.emailSettings'));
            router.dismissTo('/profil');
            break;
          default:
            console.log('handleSubmit: unknown error');
            Alert.alert(t('alerts.error.unknown'));
            break;
        }
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
    if (newOne.length === 0 || value === '') {
      setIsFlatListVisible(false);
    }
    setSaveButtonVisible(true);
  }
  else {
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
            console.log('saveButton: data:', data);
            const { emails } = data;
            console.log('saveButton: Retrieved emails:', emails);
            console.log('saveButton: emails:', emails);
            if (emails === null) {
              console.log('saveButton: emails is null');
              const newEmails = await encryp(decEmail, key);
              console.log('saveButton: newEmails:', newEmails);
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
            console.log('decMails:', decMails);
            const safeDecMails = decMails || ''; 

// Now perform your logic on the safe variable
const newEmails = safeDecMails.includes('#')
  ? safeDecMails.split('#')
  : [safeDecMails];
            console.log('newEmails:', newEmails);
            setEmails([...newEmails, decEmail]);
            console.log('newEmailsSugges:', suggestions);
            if (!newEmails.includes(decEmail)) {
              console.log('decEmail:', decEmail);
              newEmails.push(decEmail);
              console.log('New Emails:', newEmails);
              
              const updatedEmails = newEmails.join('#');
              console.log('updatedEmails:', updatedEmails);
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
         if (rows.length === 0) {
            console.log('saveButton: No entry found for deviceId:', deviceId);
          }
        },
      );
    });
    console.log('saveButton: end');
    setSaveButtonVisible(false);
  };

  const generatePDF = async () => {
    const choices = await EncryptedStorage.getItem('choices');
    const theName = await EncryptedStorage.getItem('anrede');
    const beruf = await EncryptedStorage.getItem('beruf');
    const prompt1 = `Schreibe einen kurzen Text für ${
      choices === 'Praktikum' ? 'Ein Praktikum' : ''
    } Email-Vorlage an ${
      theName
        ? theName + ' der ich meine Bewerbungsmappe zusende'
        : ' eine Firma der ich meine Bewerbungsmappe übersende'
    }. Lass den Betreff weg. Der Beruf ist ${
      beruf || ''
    }. Höre bei "mit freundlichen Grüßen auf" erwähne keinen Namen oder Wohnort oder ähnliches im Abschluss`;
    try {
      const response = await axios.post('https://api.jobapp2.de/getEmail', {
        prompt1: prompt1,
      });
      const myName = await EncryptedStorage.getItem('name');
      const data = response.data.response;
      const subject = (await EncryptedStorage.getItem('subject')) || '';

      const newData = data + '\n\n' + myName;

      // Update formData with the generated text
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
  };
  const deleteItem = async item => {
    let encMails;
    const deviceId = await DeviceInfo.getUniqueId();

    const db = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });
    const key = await EncryptedStorage.getItem('key');
    console.log('Decrypted mails:', emails);
    console.log('Item to delete:', item);
    const filteredEmails = emails.filter(email => email !== item && email !== "");
    console.log('Filtered mails:', filteredEmails);
    if (filteredEmails.length > 0) {
      const updatedEmails = filteredEmails.join('#');
      console.log('Updated mails string:', updatedEmails);
      encMails = await encryp(updatedEmails, key);
      console.log('Encrypted mails string:', encMails);

      db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET emails = ? WHERE ident = ?',
          [encMails, deviceId],
          (_, result) => {
            console.log('saveButton2: Update successful:', result);
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
            console.log('saveButton2: Update successful222:', result);
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
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <>
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
              </>
            )}
            keyboardShouldPersistTaps="handled"
            style={[
              styles.suggestionsList,
              { display: isFlatListVisible ? 'flex' : 'none' },
            ]}
          />
          {saveButtonVisible && decEmail.length > 0 && (
            <TouchableOpacity onPress={saveButton} style={styles.saveButton}>
              <MaterialIcons name="save" size={24} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>{t('email.sendButton')}</Text>
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
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fafafa',
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
    position: 'relative', // ← WICHTIG
    zIndex: 10,
    width: width * 0.95, // ← Damit es über allem liegt
  },
  emailInput: {
    flex: 1,
    borderColor: 'gray',
    border: 'none',
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
    border: 'none',
    width: width * 0.96,
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    textAlignVertical: 'top',
    color: 'white',
  },
  subject: {
    border: 'none',
    borderBottomWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    textAlignVertical: 'top',
    color: 'white',
  },
  messageTextarea: {
    height: height * 0.4,
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
