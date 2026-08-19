import { router, useFocusEffect } from 'expo-router';
import { useCallback,useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { Card, Divider, Text } from 'react-native-paper';
import SQLite from 'react-native-sqlite-storage';
import useKeyboardAnimation from '../../inc/Keyboard.js';
import colors from '../../inc/colors.js';
import CompanySearchModal from '../../comp/name.js';

export default function StartApp() {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const [startVisible, setStartVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [popupVisible, setPopupVisible] = useState(true);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [isNewerPhone, setIsNewerPhone] = useState(false);

  // ── Modal-State
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [savedCompany, setSavedCompany] = useState({
    name: "",
    street: "",
    city: "",
  });

  const DB_NAME = "firstNew.db";
  const lastClickTime = useRef(0);
  const keyboardHeight = useKeyboardAnimation();
  const anim = useRef(new Animated.Value(0)).current;
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  // ← NEU: Animation für das Wegfahren der Karten
  const cardsSlide = useRef(new Animated.Value(0)).current;

  const animatedStyle = {
    transform: [
      {
        translateX: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [200, 0],
        }),
      },
    ],
    height: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 50],
    }),
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

 useFocusEffect(
  useCallback(() => {
    cardsSlide.setValue(0); // ← wichtig!
    (async () => {
      try {
        const result = await EncryptedStorage.getItem('result');
        setIsButtonVisible(Boolean(result));
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {};
  }, [cardsSlide])
);

  useEffect(() => {
    (async () => {
     const dbPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/firstNew.db`;
const exists = await RNFS.exists(dbPath);
if (!exists) router.dismissTo("/first");
    })();
  }, []);

  // ── Application-Logik (prüft DB wie vorher)
 const Application = async () => {
  try {
    const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    console.log('Database opened');

    const deviceId = await DeviceInfo.getUniqueId();
    console.log('Device ID:', deviceId);

    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM files WHERE ident = ?;',
        [deviceId],
        (_, { rows }) => {
          if (rows.length === 0) {
            Alert.alert("Kein Datensatz gefunden.", "Bitte legen Sie Ihr Profil an.");
            return;
          }

          const item = rows.item(0);

          if (!item.name) {
            Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
          } else if (!item.lebenslauf) {
            Alert.alert("Bitte laden Sie Ihren Lebenslauf hoch.");
            router.push("/uploadFirst");
          } else {
            animateCardsAndOpenModal();
          }
        },
        (_, error) => {
          console.error("SQL Error:", error);
          Alert.alert("Fehler", "Fehler beim Laden der Daten.");
          return false;
        }
      );
    });
  } catch (error) {
    console.error('Application Error:', error);
    
    // Error objects don't have .includes directly; check error.message
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('split')) {
      Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
    }
  }
};
  // ← NEU: Funktion, die die Karten nach links animiert und danach das Modal zeigt
  const animateCardsAndOpenModal = () => {
    setTimeout(() => {
      setShowCompanySearch(true);

    },60)
    Animated.timing(cardsSlide, {
      toValue: 1,
      duration: 300,          // Dauer der Animation (ms)
      useNativeDriver: true,  // transform kann native Driver nutzen
    }).start(() => {
      // Nach Abschluss der Animation Modal öffnen
    });
  };
  const animateCardsAndClosedModal = () => {
      setShowCompanySearch(false);

    setTimeout(() => {
  
    Animated.timing(cardsSlide, {
      toValue: 0,
      duration: 300,          // Dauer der Animation (ms)
      useNativeDriver: true,  // transform kann native Driver nutzen
    }).start(() => {
      // Nach Abschluss der Animation Modal öffnen
    });
      }, 100)
  };

  // Callback nach Speichern aus dem Modal
  const handleCompanySaved = async (name, street, city) => {
    console.log("Firma gespeichert aus Modal:", name, street, city);
    setSavedCompany({ name, street, city });

    // result setzen → "Fortsetzen"-Button erscheint
    await EncryptedStorage.setItem('result', 'application');
    setIsButtonVisible(true);

    // Weiter navigieren
    router.push("/application");
  };

  useEffect(() => {
    if (isButtonVisible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [isButtonVisible, anim]);

  useEffect(() => {
    const checkAppleIntelligenceSupport = async () => {
      const deviceId = DeviceInfo.getDeviceId();
      const systemVersion = await DeviceInfo.getSystemVersion();
      const supportedDeviceIds = [
        'iPhone15,4', 'iPhone15,5', 'iPhone16,1', 'iPhone16,2',
        'iPhone17,3', 'iPhone17,4', 'iPhone17,1', 'iPhone17,2', 'iPhone17,5',
      ].includes(deviceId);
      const isSupportedVersion = parseFloat(systemVersion) >= 18.0;
      return supportedDeviceIds && isSupportedVersion;
    };

    const func = async () => {
      const supported = await checkAppleIntelligenceSupport();
      setIsNewerPhone(false); // aktuell immer false
    };
    func();
  }, []);

  const OldApplication = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 1000) return;
    lastClickTime.current = now;
    router.push("/old");
  };

  const next = async () => {
    const now = Date.now();
    if (now - lastClickTime.current < 1000) return;
    lastClickTime.current = now;

    switch (await EncryptedStorage.getItem('result')) {
      case 'name':       router.push("/name"); break;
      case 'nameOld':    router.push("/nameOld"); break;
      case 'changeOld':  router.push("/changeOld"); break;
      case 'application': router.push("/application"); break;
      case 'change':     router.push("/change"); break;
      case 'collect':    router.push("/collect"); break;
      case 'email':      router.push("/email"); break;
      default: break;
    }
  };

  return (
    <View style={styles.container}>
      {/* ← NEU: Animated.View mit translateX-Animation */}
      <Animated.View
        style={[
          styles.inputsContainer,
          {
            transform: [
              {
                translateX: cardsSlide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width], // von 0 bis -Bildschirmbreite
                }),
              },
            ],
          },
        ]}
      >
        <Card style={{ backgroundColor: "transparent", padding: 10 }}>

          {/* Oberer Pressable: öffnet Modal */}
          <Pressable onPress={Application}>
            {({ pressed }) => (
              <View style={[
                styles.entry,
                pressed && styles.entryPress
              ]}>
                <Card.Title
                  title={t('BewerbungGenerieren')}
                  titleStyle={styles.job}
                />
                <Divider
                  color='gray'
                  style={{ justifyContent: "center", marginBottom: 15, width: '80%', alignSelf: "center" }}
                />
                <Text variant="bodyMedium" style={styles.name}>{t('BewerbungGenerierenText')}</Text>
              </View>
            )}
          </Pressable>

          {/* Zweiter Pressable: alt */}
          <Pressable onPress={OldApplication}>
            {({ pressed }) => (
              <View style={[
                styles.entry,
                pressed && styles.entryPress
              ]}>
                <Card.Title
                  title={t('BewerbungRecycel')}
                  titleStyle={styles.job}
                  titleNumberOfLines={0}
                />
                <Divider
                  color='gray'
                  style={{ justifyContent: "center", marginBottom: 15, width: '80%', alignSelf: "center" }}
                />
                <Text variant="bodyMedium" style={styles.name}>{t('BewerbungRecycelText')}</Text>
              </View>
            )}
          </Pressable>

          {isNewerPhone && (
            <Pressable onPress={() => {}}>
              {({ pressed }) => (
                <View style={[styles.entry, pressed && styles.entryPress]}>
                  <Card.Title title={t('offlineHeader')} titleStyle={styles.job} />
                  <Card.Divider color='gray' />
                  <Text style={styles.name}>{t('offlineMain')}</Text>
                </View>
              )}
            </Pressable>
          )}

          {isButtonVisible && (
            <AnimatedTouchable onPress={next} style={animatedStyle}>
              <Pressable onPress={next}>
                {({ pressed }) => (
                  <View style={[
                    styles.entryFort,
                    pressed && styles.entryPressFort
                  ]}>
                    <Card.Title title={t('Fortsetzen')} titleStyle={styles.job} />
                  </View>
                )}
              </Pressable>
            </AnimatedTouchable>
          )}
        </Card>
      </Animated.View>

      {/* CompanySearchModal */}
      <CompanySearchModal
        visible={showCompanySearch}
onClose={() => {
  animateCardsAndClosedModal();
 
}}        onSaved={handleCompanySaved}
        initialName={savedCompany.name}
        initialStreet={savedCompany.street}
        initialCity={savedCompany.city}
      />
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  entry: {
    flexDirection: "column",
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
    borderColor: 'gray',
    justifyContent: 'center',
    width: width * 0.9,
  },
  entryFort: {
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
    borderColor: 'gray',
    justifyContent: 'center',
    width: width * 0.9,
  },
  entryPressFort: {
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
  inputsContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
  name: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgb(179, 176, 184)",
    marginBottom: 10,
    maxWidth: '80%',
    lineHeight: 19,
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
  job: {
    justifyContent: 'center',
    textAlign: "center",
    alignSelf: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "rgb(232, 228, 238)",
  },
});