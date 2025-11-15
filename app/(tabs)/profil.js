import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { sha512 } from 'js-sha512';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import Modal from 'react-native-modal';
import { Card, Divider } from 'react-native-paper';
import SQLite from 'react-native-sqlite-storage';
import colors from '../../inc/colors.js';
import { decryp, encryp } from '../../inc/cryp.js';
import CutLine from '../../inc/CutLine.js';
import useKeyboardAnimation from '../../inc/Keyboard.js';
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ProfilScreen = () => {
    const { i18n } = useTranslation();

    const [openLang, setOpenLang] = useState(false);
  const [valueLang, setValueLang] = useState(null);
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [myName, setMyName] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [password, setPassword] = useState('');
  const [myStreet, setMyStreet] = useState('');
  const [langModal, setLangModal] = useState(false); 
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [emailServer, setEmailServer] = useState("smtp.mail.de");
  const [isModalAdVisible, setModalAdVisible] = useState(false);
  const [coins, setCoins] = useState('');
  const [isModalEmailVisible, setModalEmailVisible] = useState(false);
  const [db, setDb] = useState(null);
  const { keyboardHeight, animated, reset } = useKeyboardAnimation(300);
  const DB_NAME = 'firstNew.db';
  const [isAnimating, setIsAnimating] = useState(false);
  const [source, setSource] = useState('');
  const [pdfView, setPdfView] = useState(false);
  const [pdfTab, setPdfTab] = useState(false);


  const items = [
    { label: 'mail.de', value: 'smtp.mail.de' },
    { label: 'web.de', value: 'Smtp.web.de' },
    { label: 't-online.de', value: 'Securesmtp.t-online.de' },
    { label: 'gmail.com', value: 'Smtp.gmail.com' },
  ];

  const deleteItem = (idToDelete) => {
    setData(prevData => prevData.filter(item => item.id !== idToDelete));
  };
  const pan = useRef(new Animated.ValueXY()).current;


  useFocusEffect(
    useCallback(() => {
      console.log("Drawer-Screen geöffnet oder erneut geöffnet!");



      const fetchCoins = async () => {
        try {
          console.log("fetchCoins");
          const deviceId = await DeviceInfo.getUniqueId();
          const key = sha512(deviceId);
          const response = await axios.post('https://jobape.de/getCoins', {
            key: key
          });

          // Loggt die komplette Antwort
          console.log("Antwort vom Server:", response.data);

          // Greift auf das erwartete Feld zu
          const coins = response.data.response;

          // Loggt die extrahierten Coins
          console.log("Coins:", coins);

          // Coins ins State setzen
          setCoins(coins);
        } catch (error) {
          console.error("Fehler beim Abrufen der Coins:", error);
        }
      };
      setTimeout(() => {
        fetchCoins();
      }, 800);
      // Deine Funktion hier ausführen


      return () => {
        console.log("Drawer-Screen wird verlassen.");
      };
    }, [])
  );
useEffect(() => {
  const load = async () => {
    const get = async (amount) => {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = sha512(deviceId);
      const response = await axios.post('http://178.254.6.218:3001/api/addCoins', {
        key: key,
        coin: amount
      })
      setCoins(prevCoins => prevCoins + amount);
    }

  }
   

 




  load();
}, []);




  useEffect(() => {
    const handleLogin = async () => {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
      try {
        const db = await SQLite.openDatabase({
          name: 'firstNew.db',
          location: 'default',
        });
        const result = await db.executeSql(
          'SELECT * FROM files WHERE ident = ?',
          [deviceId],
        );
        const files = result[0].rows.raw();
        if (files.length === 0) {
          console.log('No files found');
          return;
        }
        const file = files[0];
        setMyName(await decryp(file.name, key));
        setMyCity(await decryp(file.city, key));
        setMyStreet(await decryp(file.street, key));
        if (file.email && file.emailPassword) {
          setEmail(await decryp(file.email, key));
          setPassword(await decryp(file.emailPassword, key));
          setValue(await decryp(file.emailServer, key))
        }

      } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        setMessage('Login failed: ' + (error.response ? error.response.data.error : error.message));
      }
    };

    setTimeout(() => {
      handleLogin();

    }
      , 800);
  }, [pdfView]);

  const handleEmail = (value) => {
    setEmail(value);
  }
  const showAd = () => {
    if (loaded) {
      Alert.alert(
        t('profil.coinTitle'),
        t('profil.coinText'),
        [
          {
            text: "OK",
            onPress: () => {
              rewardedAd.show();
              setLoaded(false);
            },

          },
          {
            text: "Abbrechen",
            style: "cancel",
            onPress: () => {
              console.log("Werbung abgebrochen");
            },
          },

        ]
      );

    } else {
      console.log('Ad noch nicht geladen');
    }
  };
  const handlePassword = (value) => {
    setPassword(value);
  }

  const handleEmailServer = (value) => {
    setEmailServer(value);
    console.log(emailServer)
  }

  const handleSaveChangesEmail = async () => {
    try {
      if (!value) {
        Alert.alert(
          "Fehler",
          "Bitte wählen Sie einen E-Mail-Server ausder schließen Sie das Fenster.",
        );
        return;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
      const myEmailEnc = await encryp(email, key)
      const myEmailPassword = await encryp(password, key)
      const emailServer = await encryp(value, key)
      const db = await SQLite.openDatabase({
        name: 'firstNew.db',
        location: 'default',
      });
      await db.executeSql(
        'UPDATE files SET email = ?, emailPassword = ?, emailServer = ? WHERE ident = ?',
        [myEmailEnc, myEmailPassword, emailServer, deviceId],
      );
      Alert.alert(
        "Erfolg",
        "Ihre neuen Einstellungen wurden erfolgreich gespeichert",
        [
          {
            text: "OK",
            onPress: () => {

              setModalEmailVisible(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      setFinishMessage('Fehler beim Speichern');
    }
  };
  const itemsLang = [
    { label: 'English', value: 'en' },
    { label: 'French', value: 'fr' },

    { label: 'Deutsch', value: 'de' },
    { label: 'Turkish', value: 'tr' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Greek', value: 'gr' },
    { label: 'Italian', value: 'it' },
    { label: 'Japanese', value: 'jp' },
    { label: 'Dutch', value: 'nl' },
    { label: 'Ukrainian', value: 'ua' },
    { label: 'Polish', value: 'pl' },
    {label: 'Romania', value: 'ru'},
  ];
  const handleSaveChangesName = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
      await EncryptedStorage.setItem('name', myName.trimStart());
      await EncryptedStorage.setItem('city', myCity.trimStart());
      await EncryptedStorage.setItem('street', myStreet.trimStart());
      const myNameEnc = await encryp(myName.trimStart(), key)
      const myCityEnc = await encryp(myCity.trimStart(), key)
      const myStreetEnc = await encryp(myStreet.trimStart(), key)

      const db = await SQLite.openDatabase({
        name: 'firstNew.db',
        location: 'default',
      });
      await db.executeSql(
        'UPDATE files SET name = ?, city = ?, street = ?  WHERE ident = ?',
        [myNameEnc, myCityEnc, myStreetEnc, deviceId],
      );
      Alert.alert(
        "Erfolg",
        "Ihre neuen Einstellungen wurden erfolgreich gespeichertName",
        [
          {
            text: "OK",
            onPress: () => {
              setModalAdVisible(false);

            },
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      setFinishMessage('Fehler beim Speichern');
    }
  };
 const handleSaveChanges = async () => {
    if (!valueLang) {
      Alert.alert(t('settings.languageError'));
      return;
    }
    EncryptedStorage.setItem("lang", valueLang);
    Alert.alert(t('settings.languageSaved'));
    i18n.changeLanguage(valueLang);
    setModalEmailVisible(false);
  }
  return (
    <View style={styles.container}>


      <View style={styles.inputsContainer}>
        <View style={styles.headerOut}>
          <View style={styles.header}>
            <Text style={styles.name2}>{myName != null ? 'Hey, ' + myName : "Kein Name"}</Text>
            <TouchableOpacity onPress={showAd} >
            <Text style={styles.coins}>
  {coins != null ? (
    <>
      <Text style={styles.plus}>+</Text>{` ${coins} Coins`}
    </>
  ) : (
    'Coins nicht verfügbar'
  )}
</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Card style={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0, borderWidth: 'none' }}>
          <Pressable
            onPress={() => setModalAdVisible(true)}        // Grund‑Style 
          >
          {({ pressed }) => (
            <View style={[
                      styles.entry,                // Grund‑Layout
                      pressed && styles.entryPress // nur solange gedrückt
                    ]}>
              <Card.Title
               title={t('personalData')}
               titleStyle={styles.job}/>
                 <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
              <Text style={styles.name}>{t('personalDataDescription')}</Text>
            </View>
          )}
          </Pressable>

                    <Pressable
            onPress={() => setModalEmailVisible(true)}        // Grund‑Style 
          >
          {({ pressed }) => (
            <View style={[
                      styles.entry,                // Grund‑Layout
                      pressed && styles.entryPress // nur solange gedrückt
                    ]}>
              <Card.Title
               title={t('configureEmail')}
               titleStyle={styles.job}/>
                 <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
              <Text style={styles.name}>{t('configureEmailDescription')}</Text>
            </View>
          )}
          </Pressable>
           <Pressable
            onPress={() => setLangModal(true)}        // Grund‑Style 
          >
          {({ pressed }) => (
           <View style={[
                      styles.entryNew,                // Grund‑Layout
                      pressed && styles.entryPressNew // nur solange gedrückt
                    ]}>
               <Card.Title
                            title={t('settings.languageChange')}
                            titleStyle={styles.job}/>
                    </View>
          )}
          </Pressable>



        </Card>

      </View>



      {/* Modal für persönliche Daten */}
      <Modal
        isVisible={isModalAdVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setModalAdVisible(false)}
        style={{ margin: 0, justifyContent: 'center' }}
        swipeDirection={['down']}
        onSwipeComplete={() => setModalAdVisible(false)}
        // Add these handlers:
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => setIsAnimating(false)}
        backdropTransitionOutTiming={1}
        useNativeDriver={false}
        backdropOpacity={0.9}
      >
        <TouchableWithoutFeedback onPress={() => setModalAdVisible(false)}>
          <Animated.View
            style={[

              {
                height: 300,
                backgroundColor: "transparent", // Damit es sichtbar bleibt
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ translateY: Animated.multiply(keyboardHeight / 3, -1) }],
                opacity: isAnimating ? 1 : 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }
            ]}>
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <TextInput
                  style={styles.input}
                  value={myName}
                  onChangeText={setMyName}
                  placeholder={t('placeholderName')}
                  placeholderTextColor="gray"
                />
                {myName.length > 0 && (
                  <TouchableOpacity onPress={() => setMyName('')} style={styles.clearButton}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <CutLine />
                <TextInput style={styles.input} value={myStreet} onChangeText={setMyStreet} placeholder={t('placeholderStreet')} placeholderTextColor="gray" />
                {myStreet.length > 0 && (
                  <TouchableOpacity onPress={() => setMyStreet('')} style={styles.clearButton2}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <CutLine />
                <TextInput style={styles.input} value={myCity} onChangeText={setMyCity} placeholder={t('placeholderZip')} placeholderTextColor="gray" />
                {myCity.length > 0 && (
                  <TouchableOpacity onPress={() => setMyCity('')} style={styles.clearButton3}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.buttonNew} onPress={() => handleSaveChangesName()}>
                <Text style={styles.buttonText}>{t('saveAndClose')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal für E-Mail */}
      <Modal
        isVisible={isModalEmailVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setModalEmailVisible(false)}
        style={{ margin: 0, justifyContent: 'center' }}
        swipeDirection={['down']}
        onSwipeComplete={() => setModalEmailVisible(false)}
        // Add these handlers:
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => setIsAnimating(false)}
        backdropTransitionOutTiming={1}
        useNativeDriver={false}
        backdropOpacity={0.9}
      >
        <TouchableWithoutFeedback onPress={() => setModalEmailVisible(false)}>
          <Animated.View
            style={[

              {

                height: 320,
                backgroundColor: "transparent", // Damit es sichtbar bleibt
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ translateY: Animated.multiply(keyboardHeight / 3, -1) }],
                opacity: isAnimating ? 1 : 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }

            ]}>
            <View style={styles.modalBackground}>
              <View style={[styles.modalContainer, { zIndex: 2000 }]}>
                <TextInput style={styles.input} placeholder={t('placeholderEmail')} value={email} onChangeText={setEmail} placeholderTextColor="gray" />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail('')} style={styles.clearButton}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <CutLine />
                <TextInput style={styles.input} placeholder={t('placeholderPassword')} value={password} onChangeText={setPassword} placeholderTextColor="gray" />

                <CutLine />
                {password.length > 0 && (
                  <TouchableOpacity onPress={() => setPassword('')} style={styles.clearButton2}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <View style={{ zIndex: 3000, width: "100%" }}>
                  <DropDownPicker
                    open={open}
                    value={value}
                    items={items}
                    setOpen={setOpen}
                    setValue={setValue}
                    hideSelectedItemIcon={true}
                    showArrowIcon={false}
                    showTickIcon={false}
                    placeholder={t('placeholderEmailServer')}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropDownContainer}
                    textStyle={{ color: "white", fontSize: 20, textAlign: 'center' }}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.buttonNew} onPress={() => handleSaveChangesEmail()}>
                <Text style={styles.buttonText}>{t('saveAndClose')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Modal für Anlagen sortieren */}
 <Modal
        isVisible={langModal}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setLangModal(false)}
        style={{ margin: 0,  width: width, justifyContent: 'center', alignSelf: 'center' }}
        onSwipeComplete={() => setLangModal(false)}
        // Add these handlers:
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => setIsAnimating(false)}
   hardwareAccelerated={true}
        backdropTransitionOutTiming={1}
transparent
      animationType="fade"
      >

        <Animated.View
          style={[

            {
                height: 150,
              padding:20,
              backgroundColor: "transparent", // Damit es sichtbar bleibt
              justifyContent: 'center',
              selfAlign: 'center',
        
       
              opacity: isAnimating ? 1 : 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              
            }
          ]}>
          {/* Your modal content */}

          <TouchableOpacity
      onPress={() => setLangModal(false)}
      style={styles.deleteButtonLang}
    >
  
    </TouchableOpacity>

          <View style={{ zIndex: 3000 }}>
            <DropDownPicker
              open={openLang}
              value={valueLang}
              items={itemsLang}
              setOpen={setOpenLang}
              setValue={setValueLang}
              placeholder={t('settings.language')}
              style={styles.dropdownLang}
              dropDownContainerStyle={styles.dropDownContainerLang}
              textStyle={{ color: 'white' }}
            />
            <TouchableOpacity style={styles.buttonNewLang} onPress={() => handleSaveChanges()}>
              <Text style={styles.buttonTextLang}>{t('saveAndClose')}</Text>
            </TouchableOpacity>
          </View>



        </Animated.View>

      </Modal>


    </View>
  );
};










const { height, width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
 
    justifyContent: 'center',
    alignItems: 'center',
   

  },
  plus: {
   
   marginBottom:10,          // 1 px nach oben schieben

  },
    dropDownContainerLang: {
      borderRadius: 15,
    borderColor: 'gray',
    width: width * 0.8,
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor:colors.card3,

  },

    dropdownLang: {
    alignSelf: 'center',
    height: 50,
    backgroundColor:colors.card3,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    color: 'white',
    elevation: 2,
    zIndex: 3000,
    borderColor: 'gray',
    width: width * 0.8,
    marginTop: 10,
  },
    deleteButtonLang: {
    position: 'absolute',
    top: -16,
    right: '50%',
      },
  entry: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "gray",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',
width:width * 0.9,


  },
    buttonNewLang: {
    width: width * 0.8,
    backgroundColor:colors.card3,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'gray',
    borderWidth: 1,
    borderColor: 'gray',
    alignSelf: 'center',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonTextLang: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
    entryNew: {
    backgroundColor: colors.card3,
    paddingTop: 5,
    borderRadius: 10,
    shadowColor: "gray",
   
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',
width:width * 0.9,


  },
  entryPress: {
    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
  

  },
   entryPressNew: {
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
  

  },
  header: {
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",   // verteilt Name links / Coins rechts
    backgroundColor: colors.card3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "white",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "gray",
    width: width * 0.85,                // 80 % der Screen‑Breite
    padding: 15,
    alignSelf: "flex-end", 
    width: width * 0.9,                 // Container selbst an den rechten Rand
  },

  name2: {
    // nimmt den freien Platz links ein
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  coins: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "right",
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 18,
    padding: 5,
  },
  clearButton2: {
    position: 'absolute',
    right: 12,
    top: 76,
    padding: 5,
  },
  clearButton3: {
    position: 'absolute',
    right: 12,
    top: 135,
    padding: 5,
  },

  dropDownContainer: {
    borderColor: 'gray',
    textAlign: 'center',
    backgroundColor: colors.card3,
    borderRadius: 10,
    width: "100%",

  },



  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
    position: 'absolute',
    right: 10

  },
  inputsContainer: {
    flex: 1,
   
    justifyContent: "center",
    alignItems: "center", // fügt horizontale Zentrierung hinzu
  },
  input: {
    height: 35,
    backgroundColor: colors.card3,
    fontSize: 18,
    color: "white",
    width: '80%',
    textAlign: 'center',

  },
  button: {
    width: "100%",
    backgroundColor: colors.card3,
    padding: 15,

    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "gray",
    shadowOffset: {
      width: 0,
      height: 1,
    },


    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5, // Für Android-Schatten
  },
  buttonNew: {
    width: width * 0.8,
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5, // Für Android-Schatten
  },
  buttonText: {
    color: "#C8C8C8",
    fontSize: 16,
    fontWeight: "600"
  },

  name: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "#C8C8C8",
    marginBottom: 10,
  },
  job: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "rgb(220, 221, 232)",

  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent" // Dunkler Hintergrund


  },

  modalContainer: {
    width: width * 0.8,
    backgroundColor: colors.card3,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'gray',
    alignItems: "center",
    position: "relative",
    zIndex: 2000,
    shadowColor: 'gray',
    shadowOffset: { width: 0, height: 2 },
    shadowOffset: {
      width: 0,
      height: 1,
    },
  },
  dropdown: {
    height: 40,
    backgroundColor: colors.card3,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 19,
    color: "#C8C8C8",
    elevation: 2,
    zIndex: 3000,
    borderWidth: 'none',
    textAlign: 'center',

  },



});

export default ProfilScreen;
