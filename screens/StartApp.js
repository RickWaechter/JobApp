import React, { useState, useEffect , useRef,   useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  ImageBackground,
  Alert,
  Dimensions,
  Animated,
  Pressable


} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import { Card } from '@rneui/themed';
import { checkIfFirst } from '../inc/db.js';
import SQLite from 'react-native-sqlite-storage';
import LinearGradient from 'react-native-linear-gradient';
import Header from '../inc/header.js';
import { useTranslation } from 'react-i18next';
import '../local/i18n'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import useKeyboardAnimation from '../inc/Keyboard.js';
import colors  from '../inc/colors.js';
export default function StartApp() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [startVisible, setStartVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [popupVisible, setPopupVisible] = useState(true);
  const [isButtonVisible,setIsButtonVisible] = useState(false);
  const [isNewerPhone, setIsNewerPhone] = useState(false);
  const DB_NAME = "firstNew.db";
  const keyboardHeight = useKeyboardAnimation();
  const anim = useRef(new Animated.Value(0)).current;
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
  const animatedStyle = {
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };
const first = async () => {
  navigation.navigate("First");
}
   
const OfflineApplication = () => {
  navigation.navigate("Offline");
}

const Application = async () => {
  try{
const googleKey = await EncryptedStorage.getItem('googleApi');
  const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
  console.log('Database opened');
  const deviceId = await DeviceInfo.getUniqueId();
  console.log('Device ID:', deviceId);

  db.transaction((tx) => {
    tx.executeSql(
      'SELECT * FROM files WHERE ident = ?;',
      [deviceId],
      async (_, { rows }) => {
       const item = await rows.item(0)
       console.log(item)
       if (!item.name ) {
        Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
        navigation.navigate("Profil");
      } else if (!item.lebenslauf ) {
        Alert.alert("Bitte laden Sie Ihren Lebenslauf hoch.");
        navigation.navigate("Upload");
      } else if (googleKey){
        navigation.navigate("NameGoogle");
      }
      else {
        navigation.navigate("Name");
      }
      

      })
    })
  }
  catch(error) {
    console.log(error)
    if (error.includes('split')) {
      Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
      navigation.navigate("Profil");
    }
  }
            
}
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      console.log(keyboardHeight);
      const where = async () => {
        if (!isActive) return;
        const much = await EncryptedStorage.getItem('result');
        if (much) {
          console.log("API Key:", much);
          setIsButtonVisible(true);
        } else {
          console.log("No API Key found");
          setIsButtonVisible(false);
        }
      };

      const checkFirstRun = async () => {
        if (!isActive) return;
        const firstRun = await checkIfFirst();
        if (firstRun) {
          console.log("Not First run detected");
          console.log(firstRun);
        } else {
          console.log(firstRun);
          console.log("Not first run");
          navigation.replace("First");
        }
      };

      checkFirstRun();
      where();

      return () => {
        isActive = false;
      };
    }, [])
  );
  useEffect(() => {
    if (isButtonVisible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0); // zurücksetzen
    }
  }, [isButtonVisible, anim]);

useEffect(() => {
  const checkAppleIntelligenceSupport = async () => {
    const deviceId = DeviceInfo.getDeviceId();   // z. B. "iPhone16,1"
    const systemVersion = await DeviceInfo.getSystemVersion(); // z. B. "18.0"
  
    console.log("📱 Gerät:", deviceId);
    console.log("🧠 iOS-Version:", systemVersion);
  
    const supportedDeviceIds = [
      // iPhone 15 Serie
      'iPhone15,4',  // iPhone 15
      'iPhone15,5',  // iPhone 15 Plus
      'iPhone16,1',  // iPhone 15 Pro
      'iPhone16,2',  // iPhone 15 Pro Max
      
      // iPhone 16 Serie
      'iPhone17,3',  // iPhone 16
      'iPhone17,4',  // iPhone 16 Plus
      'iPhone17,1',  // iPhone 16 Pro
      'iPhone17,2',  // iPhone 16 Pro Max
      'iPhone17,5',  // iPhone 16e (das neue "SE")
    ].includes(deviceId);
  
    const isSupportedVersion = parseFloat(systemVersion) >= 18.0;
  
    return supportedDeviceIds && isSupportedVersion;
  };

  const func = async () => {
    const supported = await checkAppleIntelligenceSupport();
    if (supported) {
      setIsNewerPhone(false);
    } else {
      setIsNewerPhone(false);
    }
  }
func();
}, []);
const OldApplication = () => {
    navigation.navigate("Old")
   
}
const nameOff = () => {
    navigation.navigate("NameOff")
   
}

const next = async() => {

 switch (await EncryptedStorage.getItem('result')) {
    case 'name':
      navigation.navigate("Application");
      break;
      case 'application':
      navigation.navigate("Change");
      break;
      case 'change':
        navigation.navigate("Change");
        break;
      case 'collect':
      navigation.navigate("Collect");
      break;
      case 'email':
        navigation.navigate("Email");
        break;
    default:
      navigation.navigate("MainTabs");
      break;
  }
 
}

  return (
    <View style={styles.container}>
   

       <View style={styles.inputsContainer}>
 <Card containerStyle={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0, borderWidth:'none' }}>
 
       
                    <Pressable
                      onPress={Application}        // Grund‑Style 
                    >
                    {({ pressed }) => (
                      <View style={[
                                styles.entry,                // Grund‑Layout
                                pressed && styles.entryPress // nur solange gedrückt
                              ]}>
                        <Card.Title style={styles.job}>
                          {t('BewerbungGenerieren')}
                        </Card.Title>
                        <Card.Divider 
                        color='gray'
                        />
                        <Text style={styles.name}>{t('BewerbungGenerierenText')}</Text>
                      </View>
                    )}
                    </Pressable>
          <Pressable
                      onPress={OldApplication}        // Grund‑Style 
                    >
                    {({ pressed }) => (
                      <View style={[
                                styles.entry,                // Grund‑Layout
                                pressed && styles.entryPress // nur solange gedrückt
                              ]}>
                        <Card.Title style={styles.job}>
                          {t('BewerbungRecycel')}
                        </Card.Title>
                        <Card.Divider
                         color='gray'
                        />
                        <Text style={styles.name}>{t('BewerbungRecycelText')}</Text>
                      </View>
                    )}
                    </Pressable>
              {isNewerPhone && (
                 <Pressable
                 onPress={nameOff}        // Grund‑Style 
               >
               {({ pressed }) => (
                 <View style={[
                           styles.entry,                // Grund‑Layout
                           pressed && styles.entryPress // nur solange gedrückt
                         ]}>
                   <Card.Title style={styles.job}>
                     {t('offlineHeader')}
                   </Card.Title>
                   <Card.Divider
                    color='gray'
                   />
                   <Text style={styles.name}>{t('offlineMain')}</Text>
                 </View>
               )}
               </Pressable>
              )}
       
         {isButtonVisible && (
          <>
            <AnimatedTouchable
              onPress={next}
              style={animatedStyle}          // ③  animierte Styles hier
           
            >
              <View style={styles.entry}>
                <Card.Title style={styles.job2}>{t('Fortsetzen')}</Card.Title>
              </View>
            </AnimatedTouchable>
            </>
          )}
       
     </Card>
    </View>
    
    </View>
  );
}


const {width, height} = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  inputContainer: {
    width: width * 0.8,

  },
  entry: {
    backgroundColor: colors.card3,
    padding: 13,
    borderRadius: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth:1,
    borderColor:'gray',

  },
  
  name: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgb(179, 176, 184)",
    marginBottom: 5,
  },
  entryPress: {
    backgroundColor: colors.card3,
    padding: 13,
    borderRadius: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
  

  },
  job: {
    fontSize: 20,
    fontWeight: "bold",
    color: "rgb(232, 228, 238)",
  },
  job2: {
    fontSize: 20,
    fontWeight: "bold",
    color: "rgb(232, 228, 238)",
  marginBottom: 5,
  },
  text: {
    textAlign: "center",
    color: "#333",
    marginBottom: 5,
  },
  user: {
    marginVertical: 10,
  },
  user: {
    marginVertical: 10,
  },

  messageContainer: {
    marginTop: 20,
  },
  messageText: {
    fontSize: 16,
  },
});