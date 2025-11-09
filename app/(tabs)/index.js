import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { checkIfFirst } from '../../inc/db.js';
import '../../local/i18n.js';
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
 

  transform: [
    {
      translateX: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [200, 0],   // 50px → 0
      }),
    },
    
  ],
};


useEffect(() => {
  (async () => {
const dbPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/firstNew.db`;

const exists = await RNFS.exists(dbPath);
console.log("Exists:", exists);
if (!exists) {
  router.push("/first")
}
  })();
}, []);

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
       console.log(item.add1)
       if (!item.name ) {
        Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
      } else if (!item.lebenslauf ) {
        Alert.alert("Bitte laden Sie Ihren Lebenslauf hoch.");
        router.push("/first");
      } 
      else {
        router.push("/name");
        await EncryptedStorage.setItem('result', 'name');
      }
      

      })
    })
  }
  catch(error) {
    console.log(error)
    if (error.includes('split')) {
      Alert.alert("Bitte tragen Sie Ihre Adresse auf der Profilseite ein.");
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
   router.push("/old");
}
const nameOff = () => {
   
}

const next = async() => {

 switch (await EncryptedStorage.getItem('result')) {
    case 'name':
        router.push("/name");
      break;
      case 'application':
        router.push("/application");
      break;
      case 'change':
        router.push("/change");
        break;
      case 'collect':
        router.push("/collect");
      break;
      case 'email':
        router.push("/email");
        break;
    default:
      break;
  }
 
}

  return (
    <View style={styles.container}>
   

       <View style={styles.inputsContainer}>
 <Card  style={{
        backgroundColor: "transparent",
        padding: 10}}>
 
       
                    <Pressable
                      onPress={Application}        // Grund‑Style 
                    >
                    {({ pressed }) => (
                      <View style={[
                                styles.entry,                // Grund‑Layout
                                pressed && styles.entryPress // nur solange gedrückt
                              ]}>
          
 <Card.Title
  title={t('BewerbungGenerieren')}
  titleStyle={styles.job}
/>
<Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15 , width: '80%', alignSelf: 'center'  }}
/>
                   
      <Text variant="bodyMedium" style={styles.name}>{t('BewerbungGenerierenText')}</Text>
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
                       <Card.Title
  title={t('BewerbungRecycel')}
  titleStyle={styles.job}
    titleNumberOfLines={0}   // 0 = unlimitiert
/>

          <Divider
 color='gray'
 style={{ justifyContent: 'center', marginBottom: 15, width: '80%', alignSelf: 'center' }}
/>         
      <Text variant="bodyMedium" style={styles.name}>{t('BewerbungRecycelText')}</Text>
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
                  <Card.Title
  title={t('offlineHeader')}
  titleStyle={styles.job}
/>
                   <Card.Divider
                    color='gray'
                   />
                   <Text style={styles.name}>{t('offlineMain')}</Text>
                 </View>
               )}
               </Pressable>
              )}
       
         {isButtonVisible && (
          
            <AnimatedTouchable
              onPress={next}
              style={animatedStyle}          // ③  animierte Styles hier
           
            >
              <View style={styles.entryFort}>
 <Card.Title
  title={t('Fortsetzen')}
  titleStyle={styles.job}
/>              </View>
            </AnimatedTouchable>
            
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
    width: width * 0.9,

  },
  entry: {
      flexDirection: "column",
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth:1,
    borderColor:'gray',
justifyContent:'center',
width:width * 0.9,

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
    borderWidth:1,
    borderColor:'gray',
justifyContent:'center',
width:width * 0.9,

  },
  
  name: {
        alignSelf: "center",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgb(179, 176, 184)",
    marginBottom: 5,
  },
  entryPress: {
    backgroundColor: colors.card3,
    padding: 15,
    borderRadius: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'white',
    wdith:width * 0.9,
  

  },
  job: {
    justifyContent:'center',

  textAlign: "center",
    alignSelf: "center",
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