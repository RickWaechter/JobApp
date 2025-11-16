import { router, useFocusEffect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
export default function StartApp() {
  const { t, i18n } = useTranslation();
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
height: anim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 50],   // 0 → 50
}),


 
  opacity: anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],   // 50px → 0
  }),
};
useFocusEffect(() =>  {
   const a = async  ()  => {
     if (await EncryptedStorage.getItem('result')) {
      setIsButtonVisible(true)
     }
   }
   a()
  }

);



useEffect(() => {
  (async () => {
const dbPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/firstNew.db`;

const exists = await RNFS.exists(dbPath);
console.log("Exists:", exists);
if (!exists) {
  router.dismissTo("/first")
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
        router.push("/uploadFirst");
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

  useEffect(() => {
    if (isButtonVisible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
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
<Pressable
                 onPress={next}        // Grund‑Style 
               >
               {({ pressed }) => (
                 <View style={[
                           styles.entryFort,                // Grund‑Layout
                           pressed && styles.entryPressFort // nur solange gedrückt
                         ]}>
                  <Card.Title
  title={t('Fortsetzen')}
  titleStyle={styles.job}
/>
                   
                 </View>
               )}
               </Pressable>
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
    wdith:width * 0.9,
  

  },
  name: {
        alignSelf: "center",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgb(179, 176, 184)",
    marginBottom: 10,
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
  

});