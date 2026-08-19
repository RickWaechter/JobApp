import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { sha512 } from 'js-sha512';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, Platform, Pressable,ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import Modal from 'react-native-modal';
import { Card, Divider } from 'react-native-paper';
import SQLite from 'react-native-sqlite-storage';
import colors from '../../inc/colors.js';
import { decryp, encryp } from '../../inc/cryp.js';
import CutLine from '../../inc/CutTheLine.js';
import { runQuery } from '../../inc/db.js';
import useKeyboardAnimation from '../../inc/Keyboard.js';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import '../../local/i18n.js';
import {useIAP} from 'expo-iap';
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-1715349546414110/1930235080';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['fashion', 'clothing'],
    requestNonPersonalizedAdsOnly: true,
});
const ProfilScreen = () => {
    const { i18n } = useTranslation();
const adLoaded = useRef(false);
  const [payModal, setPayModal] = useState(false);
    const [openLang, setOpenLang] = useState(false);
  const [valueLang, setValueLang] = useState(null);
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const navigation = useNavigation();
  const [myName, setMyName] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [dots, setDots] = useState('');
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
  const { keyboardHeight, reset } = useKeyboardAnimation(300);
  const DB_NAME = 'firstNew.db';
  const [isAnimating, setIsAnimating] = useState(false);
  const [source, setSource] = useState(false);
const [loadedAd, setLoadedAd] = useState(false);
const [adDisabled, setAdDisabled] = useState(false);
const [adLoadedState, setAdLoadedState] = useState(false);
  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('Purchase successful:', purchase.productId);
     setCoins(coins => coins + 40); 
     setLoaded(false);
      // IMPORTANT: Verify receipt on your backend before finishing transaction
      const isValid = await putCoinsIAP(purchase.productId);
      console.log('isValid:');

      if (isValid) {
        await finishTransaction({purchase, isConsumable: true});
      }
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      Alert.alert(t('profil.error'), t('profil.buyCancel'));
      setLoaded(false);
    },
  });

  const productIds = 'JA2C0002';
  const putCoinsIAP = async productId => {
      try{
       const deviceId = await DeviceInfo.getUniqueId();
          const key = sha512(deviceId);
          const response = await axios.post('https://api.jobapp2.de/putCoinsIAP', {
            username: key,
            productId: productId
          });
          console.log(response.data);
          // Loggt die komplette Antwort
          console.log("Antwort vom Server:", response.data);
          
        return true}
      catch (error) {
        console.error("Fehler beim Abrufen der Coins:", error);
      }
    }
  useEffect(() => {
    const putCoins = async coins => {
      try{
       const deviceId = await DeviceInfo.getUniqueId();
          const key = sha512(deviceId);
          const response = await axios.post('https://api.jobapp2.de/putCoins', {
            username: key,
            coins:coins
          });

          // Loggt die komplette Antwort
          console.log("Antwort vom Server:", response.data);
          setCoins(coins => coins +4); }
      catch (error) {
        console.error("Fehler beim Abrufen der Coins:", error);
      }
    }
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('Rewarded ad is loaded');
          console.log(adLoadedState)
        adLoaded.current = true;  
        console.log(adLoaded.current)
      if (adLoadedState) {
      rewarded.show();
      console.log("super") 
        setAdLoadedState(false);
        console.log("super1")
        adLoaded.current = false;
        console.log("2")
        setAdDisabled(false);
      }
       
    });
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        console.log('User earned reward of ', reward);
        putCoins(4)
        setLoadedAd(false); 
        setLoaded(false);

      },  
    );

    // Start loading the rewarded ad straight away
    rewarded.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, [source]);
useEffect(() => {
  console.log(adLoadedState)
}, [adLoadedState])
  const items = [
    { label: 'mail.de', value: 'smtp.mail.de' },
    { label: 'web.de', value: 'Smtp.web.de' },
    { label: 't-online.de', value: 'Securesmtp.t-online.de' },
    { label: 'gmail.com', value: 'Smtp.gmail.com' },
  ];
const handlePurchase = async (productId) => {
  setLoaded(true);
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
        },
      },
    });
  } catch (error) {
    console.error('Purchase failed:', error);
    setLoaded(false);
  }
};
  const deleteItem = (idToDelete) => {
    setData(prevData => prevData.filter(item => item.id !== idToDelete));
  };
  const pan = useRef(new Animated.ValueXY()).current;

 const showRewarded = () => {
  setLoaded(true);
  if (!adLoaded.current) {
    setAdDisabled(true);
setSource(!source);
rewarded.load();  
          setAdLoadedState(true);

    console.log("Ad ist noch nicht geladen");
    return;
  }
  rewarded.show();
      adLoaded.current = false;
      setAdDisabled(false);

};


  useFocusEffect(
    useCallback(() => {
      console.log("Drawer-Screen geöffnet oder erneut geöffnet!");


      const fetchCoins = async () => {
        try {
          console.log("fetchCoins");
          const deviceId = await DeviceInfo.getUniqueId();
          const key = sha512(deviceId);
          console.log("key", key)
          const response = await axios.post('https://api.jobapp2.de/getCoins', {
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
     
        fetchCoins();
    
      // Deine Funktion hier ausführen


      return () => {
        console.log("Drawer-Screen wird verlassen.");
      };
    }, [])
  );


useEffect(() => {
  const load = async () => {
    try {
      console.log("⏳ Lade Daten…");

      let email = null;
      let emailPassword = null;
      let emailServer = null;

      // 1) Key
      const key = await EncryptedStorage.getItem("key");
      if (!key) {
        console.log("⚠️ Kein Key gefunden");
        return;
      }

      // 2) Device ID
      const deviceId = await DeviceInfo.getUniqueId();

      // 3) DB öffnen
      const db = await SQLite.openDatabase({
        name: "firstNew.db",
        location: "default",
      });

      // 4) Query
      const result = await runQuery(
        db,
        "SELECT * FROM files WHERE ident = ?",
        [deviceId]
      ).catch((e) => {
        console.log("❌ SQL Fehler:", e);
        return null;
      });

      // Wenn keine DB-Daten → danach load2()
      if (!result || !result.rows || result.rows.length === 0) {
        console.log("⚠️ Kein DB-Eintrag gefunden → Lade aus Storage");
        load2();
        return;
      }

      const row = result.rows.raw()[0];

      // Helper: safeDecrypt
      const safeDecrypt = async (value) => {
        try {
          if (!value) return null;
          return await decryp(value, key);
        } catch {
          return null;
        }
      };

      // 5) Basisdaten
      const name = await safeDecrypt(row.name);
      const street = await safeDecrypt(row.street);
      const city = await safeDecrypt(row.city);

      if (name && street && city) {
        await EncryptedStorage.setItem("name", name);
        await EncryptedStorage.setItem("street", street);
        await EncryptedStorage.setItem("city", city);

        setMyName(name);
        setMyCity(city);
        setMyStreet(street);
      }

      console.log("☀️ Basisdaten:", { name, street, city });

      // 6) Email-Daten
      if (row.email && row.emailPassword && row.emailServer) {
        email = await safeDecrypt(row.email);
        emailPassword = await safeDecrypt(row.emailPassword);
        emailServer = await safeDecrypt(row.emailServer);

        console.log("☀️ E-Mail Daten:", {
          email,
          emailPassword,
          emailServer,
        });

        if (email && emailPassword && emailServer) {
          await EncryptedStorage.setItem("email", email);
          await EncryptedStorage.setItem("emailPassword", emailPassword);
          await EncryptedStorage.setItem("emailServer", emailServer);

          setEmail(email);
          setPassword(emailPassword);
          setValue(emailServer);
        }
      }
    } catch (err) {
      console.log("❌ Fehler in load():", err);
    }
  };

  const load2 = async () => {
    console.log("📦 Lade E-Mail aus Storage…");

    const email = await EncryptedStorage.getItem("email");
    const password = await EncryptedStorage.getItem("emailPassword");
    const emailServer = await EncryptedStorage.getItem("emailServer");

    if (email && password && emailServer) {
      setEmail(email);
      setPassword(password);
      setValue(emailServer);

      console.log("☀️ E-Mail Daten aus Storage:", {
        email,
        password,
        emailServer,
      });
    } else {
      console.log("⚠️ Keine E-Mail Daten in Storage gefunden");
    }
  };

  load();
  load2()
}, []);







 

  const handleEmail = (value) => {
    setEmail(value);
  }

  const handlePassword = (value) => {
    setPassword(value);
  }

  const handleEmailServer = (value) => {
    setEmailServer(value);
    console.log(emailServer)
  }

  const handleSaveChangesEmail = async () => {
    try {
      if (!value || !email  || !password) {
        Alert.alert(
           t("profil.error"),
          t("profil.errorDataEmail"),
        );
        return;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
      await EncryptedStorage.setItem('email', email);
      await EncryptedStorage.setItem('emailPassword', password);
      await EncryptedStorage.setItem('emailServer', value);
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
        t("profil.title"),
        t("profil.infoEmail"),
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
  { label: 'English',    value: 'en', flag: '🇬🇧' },
  { label: 'Deutsch',    value: 'de', flag: '🇩🇪' },
  { label: 'Turkish',    value: 'tr', flag: '🇹🇷' },
  { label: 'Arabic',     value: 'ar', flag: '🇸🇦' },
  { label: 'Greek',      value: 'el', flag: '🇬🇷' },
  { label: 'French',     value: 'fr', flag: '🇫🇷' },
  { label: 'Italian',    value: 'it', flag: '🇮🇹' },
  { label: 'Japanese',   value: 'ja', flag: '🇯🇵' },
  { label: 'Dutch',      value: 'nl', flag: '🇳🇱' },
  { label: 'Ukrainian',  value: 'uk', flag: '🇺🇦' },
  { label: 'Polish',     value: 'pl', flag: '🇵🇱' },
  { label: 'Romania',    value: 'ro', flag: '🇷🇴' },
];
  const handleSaveChangesName = async () => {
    try {
       if (!myName || !myCity || !myStreet) {
        Alert.alert(
           t("profil.error"),
          t("profil.errorDataEmail"),
        );
        return;
      }
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
        t("profil.title"),
        t("profil.infoData"),
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
const handleSaveChanges = async (lang) => {
  try {
    await i18n.changeLanguage(lang);
    await EncryptedStorage.setItem("lang", lang);

    Alert.alert(
      i18n.t('profil.title'),
      i18n.t('profil.languageSaved'),
      [{ text: 'OK', onPress: () => setLangModal(false) }],
      { cancelable: false }
    );
  } catch (err) {
    console.error('Sprachwechsel fehlgeschlagen:', err);
  }
};

  const loadThings = async() => {
 try {
    // Wir holen uns alle Daten parallel (effizienter)
    const [name, city, street, emailNew, passwordNew, server] = await Promise.all([
      EncryptedStorage.getItem('name'),
      EncryptedStorage.getItem('city'),
      EncryptedStorage.getItem('street'),
      EncryptedStorage.getItem('email'),
      EncryptedStorage.getItem('emailPassword'),
      EncryptedStorage.getItem('emailServer')
    ]);

    // Nur setzen, wenn der Wert nicht null oder undefined ist
    if (name !== null) setMyName(name);
    if (city !== null) setMyCity(city);
    if (street !== null) setMyStreet(street);
if (emailNew !== null) setEmail(emailNew);
if (passwordNew !== null) setPassword(passwordNew);
if (server !== null) setValue(server);
    console.log("Daten erfolgreich geladen");
  } catch (error) {
    console.error("Fehler beim Laden aus dem EncryptedStorage:", error);
    // Optional: Benutzer informieren, dass Daten nicht geladen werden konnten
  }
  }
  return (
    <View style={styles.container}>


      <View style={styles.inputsContainer}>
        <View style={styles.headerOut}>
          <View style={styles.header}>
            <Text style={styles.name2}>{myName != null ? 'Hey, ' + myName : "Kein Name"}</Text>
            <TouchableOpacity onPress={() => setPayModal(true)} >
            <Text style={styles.coins}>
  {coins != null ? (
    <>
      <Text style={styles.plus}>+</Text>{` ${coins || 0 } Coins`}
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
            onPress={() => {setModalAdVisible(true); loadThings()}}        // Grund‑Style 
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
            onPress={() => {setModalEmailVisible(true); loadThings()}}        // Grund‑Style 
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
        onModalShow={() => loadThings()}

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
// Ändere dies im Style deiner Modals:
transform: [{ 
  translateY: Animated.multiply(
    Animated.divide(keyboardHeight, 3), // Korrekte Division für Animated Nodes
    -1
  ) 
}],                opacity: isAnimating ? 1 : 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }
            ]}>
            <View style={styles.modalBackground} onStartShouldSetResponder={() => true} >
              <View style={styles.modalContainer}>
                <TextInput
                  style={styles.input}
                  value={myName}
                  onChangeText={setMyName}
                  placeholder={t('placeholderName')}
                  placeholderTextColor="gray"
                />
                {(myName?.length ?? 0) > 0 && (
                  <TouchableOpacity onPress={() => setMyName('')} style={styles.clearButton}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <CutLine />
                <TextInput style={styles.input} value={myStreet} onChangeText={setMyStreet} placeholder={t('placeholderStreet')} placeholderTextColor="gray" />
                {(myStreet.length ?? 0) > 0 && (
                  <TouchableOpacity onPress={() => setMyStreet('')} style={styles.clearButton2}>
                    <MaterialIcons name="cancel" size={25} color="gray" />
                  </TouchableOpacity>
                )}
                <CutLine />
                <TextInput style={styles.input} value={myCity} onChangeText={setMyCity} placeholder={t('placeholderZip')} placeholderTextColor="gray" />
                {(myCity.length ?? 0) > 0 && (
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
        onModalShow={() => loadThings()}

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
// Ändere dies im Style deiner Modals:
transform: [{ 
  translateY: Animated.multiply(
    Animated.divide(keyboardHeight, 3), // Korrekte Division für Animated Nodes
    -1
  ) 
}],                opacity: isAnimating ? 1 : 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }

            ]}>
            <View style={styles.modalBackground} onStartShouldSetResponder={() => true} >
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
        propagateSwipe={true}            // ← MUSS für Scroll
      >
  <Animated.View
    style={[
      {
        // 50 % der Bildschirmhöhe
        height: height * 0.5,
        maxHeight: height * 0.5,
        width: width * 0.85,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignSelf: 'center',
        opacity: isAnimating ? 1 : 0,
      },
    ]}
  >
    <View style={styles.modalContainerLang}>
      {/* Titel */}
      <Text style={styles.langTitle}>{t('settings.languageChange')}</Text>

      {/* Scrollbare Sprachliste */}
      <ScrollView
        style={styles.languageList}
        contentContainerStyle={styles.languageListContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {itemsLang.map((item) => {
          const isActive = valueLang === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => {setValueLang(item.value); handleSaveChanges(item.value)}}
              style={[
                styles.languageOption,
                isActive && styles.languageOptionActive,
              ]}
            >
              <View style={styles.languageOptionLeft}>
                <Text style={styles.languageFlag}>{item.flag}</Text>
                <Text style={styles.languageOptionText}>{item.label}</Text>
              </View>
              {isActive && (
                <MaterialIcons name="check" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Speichern-Button */}
     
    </View>
  </Animated.View>

      </Modal>

<Modal
        isVisible={payModal}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setPayModal(false)}
        style={{ margin: 0,  width: width, justifyContent: 'center', alignSelf: 'center' }}
        onSwipeComplete={() => setPayModal(false)}
        // Add these handlers:
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => setIsAnimating(false)}
   hardwareAccelerated={true}
        backdropTransitionOutTiming={1}
transparent
      animationType="fade"
        propagateSwipe={true}            // ← MUSS für Scroll
      >
<View style={{backgroundColor: "transparent", justifyContent: 'center', alignItems: 'center', opacity: isAnimating ? 1 : 0, borderTopLeftRadius: 20, borderTopRightRadius: 20,}}>
        




                 <Pressable
            onPress={() => handlePurchase('JA2C0002')} 
            disabled={loaded}       // Grund‑Style 
          >
          {({ pressed }) => (
           <View style={[
                      styles.entryAd,                // Grund‑Layout
                      pressed && styles.entryPressAd // nur solange gedrückt
                    ]}>
               <Card.Title
                            title={loaded ? `${t('pleaseWait')}${dots}` : t('buy1')}
                            titleStyle={styles.job}/>
                    </View>
          )}
          </Pressable>

                 <Pressable
            onPress={() => showRewarded()} 
            disabled={loaded}       // Grund‑Style 
          >
          {({ pressed }) => (
           <View style={[
                      styles.entryAd,                // Grund‑Layout
                      pressed && styles.entryPressAd // nur solange gedrückt
                    ]}>
               <Card.Title
                            title={loaded ? `${t('pleaseWait')}${dots}` : t('ad')}
                            titleStyle={styles.job}/>
                    </View>
          )}
          </Pressable>

</View>
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
    marginBottom: 10,
  },
  modalContainerLang: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'gray',
    maxHeight: height * 0.5,
  },
  langTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  languageList: {
    flex: 1,
    marginBottom: 10,
  },
  languageListContent: {
    paddingVertical: 4,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  languageOptionActive: {
    backgroundColor: '#4a6fa5',
    borderWidth: 1,
    borderColor: '#ffffff44',
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  languageOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonNewLang: {
    width: width * 0.8,
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'gray',
    shadowColor: 'gray',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonTextLang: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dropDownContainerLang: {
    borderRadius: 15,
    borderColor: 'gray',
    width: width * 0.8,
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: colors.card3,
  },
  dropdownLang: {
    alignSelf: 'center',
    height: 50,
    backgroundColor: colors.card3,
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: 'gray',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'gray',
    width: width * 0.9,
  },
  entryNew: {
    backgroundColor: colors.card3,
    paddingTop: 5,
    borderRadius: 10,
    shadowColor: 'gray',
    borderWidth: 1,
    borderColor: 'gray',
    width: width * 0.9,
  },
  entryPress: {
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
  },
  entryPressAd: {
    backgroundColor: colors.card3,
    paddingTop: 5,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
  },
  entryAd: {
    backgroundColor: colors.card3,
    paddingTop: 5,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: 'gray',
    borderWidth: 1,
    borderColor: 'gray',
    width: width * 0.7,
  },
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: 'white',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'gray',
    padding: 15,
    alignSelf: 'flex-end',
    width: width * 0.9,
  },
  name2: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  coins: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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
  clearText: {
    color: 'gray',
    fontSize: 16,
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
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdf: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
  buttonContainer: {
    marginBottom: height * 0.05,
    width: width * 0.8,
  },
  dropDownContainer: {
    borderColor: 'gray',
    textAlign: 'center',
    backgroundColor: colors.card3,
    borderRadius: 10,
    width: '100%',
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    maxHeight: '75%',
    width: width * 0.8,
    height: 50,
    borderRadius: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card3,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  CardContainer: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
    position: 'absolute',
    right: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 35,
    backgroundColor: colors.card3,
    fontSize: 18,
    color: 'white',
    width: '80%',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  job2: {
    width: '100%',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonNew: {
    width: width * 0.8,
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'gray',
    borderWidth: 1,
    borderColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#C8C8C8',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: 'rgb(179, 176, 184)',
    marginBottom: 5,
    lineHeight: 19,
  },
  job: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgb(220, 221, 232)',
  },
  text: {
    textAlign: 'center',
    color: '#C8C8C8',
    marginBottom: 5,
  },
  user: {
    marginVertical: 10,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalContainer: {
    width: width * 0.8,
    backgroundColor: colors.card3,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'gray',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2000,
    shadowColor: 'gray',
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
    color: '#C8C8C8',
    elevation: 2,
    zIndex: 3000,
    borderWidth: 0,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#7D26CD',
    padding: 10,
    borderRadius: 10,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
});

export default ProfilScreen;