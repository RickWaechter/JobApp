import { useNavigation } from '@react-navigation/native';
import { router } from "expo-router";
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';

import { sha256 } from 'react-native-sha256';
import SQLite from 'react-native-sqlite-storage';
import ClearButton from '../comp/clearButton.jsx';
import colors from '../inc/colors.js';
import { encryp } from '../inc/cryp.js';
import useKeyboardAnimation from '../inc/Keyboard.js';
SQLite.DEBUG(true);
SQLite.enablePromise(true);


const DB_NAME = 'firstNew.db';
const StartScreen = () => {
  const anredeOptions = ['Herr', 'Damen und Herren', 'Frau'];
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yourName, setYourName] = useState('');
  const [yourStreet, setYourStreet] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [name, setName] = useState('');
  const [finishMessage, setFinishMessage] = useState('');
  const [inputState, setInputState] = useState(false);
  const navigation = useNavigation();
  const [value, setValue] = useState(null);
  const { keyboardHeight, reset } = useKeyboardAnimation();
  const [errors, setErrors] = useState({ name: '', job: '', skill: '', anrede: '' });
  const jobRef2 = useRef(null);
  const nameRef = useRef(null);
  const [manual, setManual] = useState(false);
  const [selectedOption3, setSelectedOption3] = useState('');
  const [results, setResults] = useState([]);
  const [resultsStreet, setResultsStreet] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState([]);
  const [cit, setCit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const cityRef = useRef(null);
  const [dbExists, setDbExists] = useState(false);
  const [job, setJob] = useState(0);
 const [open, setOpen] = useState(false);
  const downloadCancelRef = useRef(null);
  const [resume, setResume] = useState(false);
  const [isFlatListVisible, setIsFlatListVisible] = useState(false);
  const streetRef = useRef(null);
  const [citySuggestion, setCitySuggestion] = useState([]);
  const [ad, setAd] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const jobRef = useRef(null);
  const jobRef3 = useRef(null);
  const { t, i18n } = useTranslation();
  const [suggestionsStreet, setSuggestionsStreet] = useState([]);
const [ suggestionsCity, setSuggestionsCity] = useState([]);
const [isFlatListVisible2, setIsFlatListVisible2] = useState(false);
  const items = [
    { label: 'English', value: 'en' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Turkish', value: 'tr' },
    { label: 'Greek', value: 'gr' },
    { label: 'French', value: 'fr' },
    { label: 'Italian', value: 'it' },
    {label: 'Romania', value: 'ru'},
    { label: 'Polish', value: 'pl' },
    { label: 'Dutch', value: 'nl' },
    { label: 'Ukrainian', value: 'ua' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Japanese', value: 'jp' },
  



  ];

const handleSuggestionClickCity = (suggestion) => {
  setYourCity(suggestion);
  setIsFlatListVisible2(false);
};

const handleSuggestionClickStreet = (suggestion) => {
  setYourStreet(suggestion);
  setIsFlatListVisible(false);
};
  const handleMyCity = async value => {
  
    try {
      const db = await SQLite.openDatabase({ name: 'city.db', location: 'default' });
      setYourCity(value);
      const [res] = await db.executeSql(
       'SELECT rowid, city FROM citys WHERE city MATCH ? LIMIT 20',
        [`${value}*`],
      );
  
      console.log('res', res);
      const names = res.rows.raw();
      console.log(names)
      
        const resultArray = names.map(row => row.city);
        setSuggestionsCity(resultArray);
   
      console.log('names', names[0].city);
      console.log(suggestions)
      setIsFlatListVisible2(true);
      setIsFlatListVisible(false)
     console.log('suggestions', suggestions);
    } catch (err) {
      console.warn('Search error', err);
    }
    

   


  };
  const handleMyStreet = async value => {
    try {
      const db = await SQLite.openDatabase({ name: 'street.db', location: 'default'  });
      setYourStreet(value);
      const [res] = await db.executeSql(
       'SELECT *FROM streets WHERE street MATCH ? LIMIT 20',
        [`${value}*`],
      );
  
      console.log('res', res);
      const names = res.rows.raw();
      console.log(names)
      
        const resultArray = names.map(row => row.street);
        setSuggestionsStreet(resultArray);
   
      console.log('names', names[0].city);
      console.log(suggestions)
      setIsFlatListVisible2(false);
      setIsFlatListVisible(true);
     console.log('suggestions', suggestions);
    } catch (err) {
      console.warn('Search error', err);
    }
    


  };


  useEffect(() => {
    
  const hallo = async () => {
    const DB_DIR = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;   // ✅
    const DB_NAMES = ["street.db", "city.db", "jobs.db"];


 async function dbExists(dbName) {
  const dbPath = `${DB_DIR}/${dbName}`;
  const exists = await RNFS.exists(dbPath);

  if (!exists) {
    console.log("❌ Missing:", dbName);
    return false;
  }

  const stat = await RNFS.stat(dbPath);
  console.log(`📦 ${dbName} -> ${stat.size} bytes`);
  return true;
}


    async function downloadDb(dbName) {
      const base = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;

if (!(await RNFS.exists(base))) {
  await RNFS.mkdir(base);
}
      const dest = `${DB_DIR}/${dbName}`;
      const url = `https://jobape.de/download?file=${dbName}`;

      console.log("[DB] 🚀 Download DB:", url);

      try {
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: dest,
        }).promise;

        if (result.statusCode === 200) {
          console.log("[DB] ✅ DB Downloaded →", dest);
          return dest;
        } else {
          throw new Error(`Status ${result.statusCode}`);
        }
      } catch (err) {
        console.log("[DB] ❌ Download error:", err);
        throw err;
      }
    }

    async function setupDatabases() {
      let missing = false;

      // 🔎 Check if any DB missing
      for (const dbName of DB_NAMES) {
        const exists = await dbExists(dbName);
        if (!exists) {
          missing = true;
          break;
        }
      }

      if (missing) {
        console.log("[DB] 🔄 Missing DBs → downloading...");
        for (const dbName of DB_NAMES) {
          await downloadDb(dbName);
        }
        console.log("[DB] ✅ All DBs downloaded");
      } else {
        console.log("[DB] ✅ All DBs exist");
      }
    }

    await setupDatabases();

    // ✅ CORRECT way to open DB from DocumentDirectory on iOS
    const openDb = async (dbName) => {
      try {
        const db = await SQLite.openDatabase({
  name: dbName,
location: 'default',
  // <<< WICHTIG
});
console.log('dbdbdbdbd' ,db)



        console.log("✅ Opened DB:", dbName);
        return db;
      } catch (err) {
        console.log("❌ Open error:", err);
        return null;
      }
    };

    // Example: open street.db
    const db = await openDb("street.db");
    if (!db) return;
const stat = await RNFS.stat(`${RNFS.LibraryDirectoryPath}/LocalDatabase/street.db`);
console.log("File size:", stat.size);
    // ✅ TEST
    
  }

  hallo();
}, []);



  const init = async () => {
    try {
      if (!name || !yourStreet || !yourCity) {
        Alert.alert('Bitte füllen Sie alle Felder aus.');
        return;
      }
      // Datenbank erstellen
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      console.log('Database opened');

      // Prüfen, ob die Tabelle existiert

      // Tabelle existiert nicht -> Erstellen
      await db.executeSql(`
    CREATE TABLE  IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ident VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    street VARCHAR(255),
    city VARCHAR(255),
    lebenslauf VARCHAR(255),
    add1 VARCHAR(255),
    add2 VARCHAR(255),
    add3 VARCHAR(255),
    add4 VARCHAR(255),
    add5 VARCHAR(255),
    add6 VARCHAR(255),
    add7 VARCHAR(255),
    add8 VARCHAR(255),
    add9 VARCHAR(255),  
    add10 VARCHAR(255),
    anschreiben VARCHAR(255),
    email VARCHAR(255),
    emailPassword VARCHAR(255),
    emailServer VARCHAR(255),
    skills TEXT,
    old TEXT DEFAULT '',
    mergePdf TEXT DEFAULT '',
    first BOOLEAN DEFAULT false,
    jobs TEXT DEFAULT '',
    emails TEXT DEFAULT NULL
);
           
            `).then(() => {
        db.executeSql(
          `INSERT INTO files (ident) VALUES (?);`,
          [deviceId]  // Werte sicher als Parameter übergeben
        );
      }, (error) => {
        console.error('Error creating table:', error);
      }
      );
      console.log('Table created');


      console.log('Key stored');
      i18n.changeLanguage(value);
      make();

    } catch (err) {
      console.error('Error opening database:', err);
    }
  };





  function capital(str) {
    return str
      .split(" ") // Satz in Wörter aufteilen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Erstes Zeichen groß machen
      .join(" "); // Wörter wieder zusammenfügen
  }

  const make = async () => {
    try {
      await EncryptedStorage.setItem('name', name);
      await EncryptedStorage.setItem('city', yourCity);
      await EncryptedStorage.setItem('street', yourStreet);
      const deviceId = await DeviceInfo.getUniqueId();
      console.log('Make function called');
      const password = await sha256(deviceId);
      console.log('Password generated:', password);
      await Keychain.setGenericPassword(deviceId, password);
      console.log('Key stored in Keychain');

      const credentials = await Keychain.getGenericPassword();

      const myKey = credentials.password;
      console.log('Obtained key from Keychain:', myKey);
      await EncryptedStorage.setItem('key', myKey);
      console.log('Key stored in EncryptedStorage:', myKey);
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'Documents' });



      console.log('Key stored');
      const nameCryp = await encryp(name.trimStart(), myKey)
      console.log('Key stored' + nameCryp);
      const streetCryp = await encryp(yourStreet.trimStart(), myKey)
      const cityCryp = await encryp(yourCity.trimStart(), myKey)
     

      

      console.log('String to be inserted:', String)

      // Datensatz mit der ident-Spalte (deviceId) einfügen
      await db.executeSql(
        `UPDATE files 
         SET  first = ?, name = ?, street = ?, city = ? 
         WHERE ident = ?;`,
        [ true, nameCryp, streetCryp, cityCryp, deviceId]
      );
      console.log('Data inserted');
    
      console.log('Datenbank initialisiert und Tabelle erstellt.');
      router.push('upload');

    } catch (err) {
      console.error('Fehler bei der Datenbankinitialisierung:', err);
    }
  }

  const image = { uri: 'https://legacy.reactjs.org/logo-og.png' };
  return (
    <SafeAreaView style={styles.container}>

      <Animated.View
        style={[
          { transform: [{ translateY: Animated.multiply(keyboardHeight / 3, -1) }] }, styles.innerContainer  // Diese Zeile fügt die dynamische Anpassung hinzu
        ]}
      >
        <Text style={styles.text1}>{t('first.heading')}</Text>
        <TextInput
          ref={jobRef}
          style={styles.inputSecondary}
          placeholder={t('ownName')}
          placeholderTextColor="gray"
          value={name}
          onChangeText={setName}
        autoComplete='name'
        />
        {name.length > 0 && (
          <ClearButton value={name} setValue={setName} top={59} />
        )}

       

        <TextInput
          value={yourStreet}
          onChangeText={handleMyStreet}
          onFocus={() => setAd(true)}
          onBlur={() => setAd(false)}
          placeholder={t('ownStreet')}
          placeholderTextColor="gray"
          autoComplete='street-address'
          textContentType='fullStreetAddress'
          style={styles.inputSecondary}
          autoCorrect={false}
          ref={streetRef}
        />
        {yourStreet.length > 0 && <ClearButton value={yourStreet} setValue={setYourStreet} top={114} />}
 {yourStreet.length > 0 && suggestionsStreet.length > 0 && (
    
               <FlatList
                data={suggestionsStreet}
                keyExtractor={(item, index) => index}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleSuggestionClickStreet(item)} style={styles.suggestionItemContainer}>
                    <Text style={styles.suggestionItem}>{item}</Text>
                  </TouchableOpacity>
                )} 
                keyboardShouldPersistTaps="handled"
                style={[styles.suggestionsList2, { display: isFlatListVisible ? 'flex' : 'none' }]}
              /> 
            )} 
<TextInput
          value={yourCity}
          onChangeText={handleMyCity}
          placeholder={t('ownCity')}
          placeholderTextColor="gray"
          onBlur={() => setCit(false)}
          ref={cityRef}
          style={styles.inputSecondary}
          autoCorrect={false}
          onFocus={() => setCit(true)}
        />
        {yourCity.length > 0 && (
          <ClearButton value={yourCity} setValue={setYourCity} top={169} />
        )}
        {yourCity.length > 0 && suggestionsCity.length > 0 && (
    
    <FlatList
     data={suggestionsCity}
     keyExtractor={(item, index) => index}
     renderItem={({ item }) => (
       <TouchableOpacity onPress={() => handleSuggestionClickCity(item)} style={styles.suggestionItemContainer}>
         <Text style={styles.suggestionItem}>{item}</Text>
       </TouchableOpacity>
     )} 
     keyboardShouldPersistTaps="handled"
     style={[styles.suggestionsList, { display: isFlatListVisible2 ? 'flex' : 'none' }]}
   /> 
 )}
<DropDownPicker
  open={open}
  value={value}
  items={items}
  setOpen={setOpen}
  setValue={setValue}
  placeholder={t('settings.language')}
  style={styles.dropdown}
  dropDownContainerStyle={styles.dropDownContainer}

  // Zentriert den Placeholder-Text
  placeholderStyle={{
    color: 'white',
    textAlign: 'center',
  }}

  // Zentriert den Text der ausgewählten Option
  textStyle={{
    color: 'white',
    textAlign: 'center',
  }}

  // Zentriert die Labels in der Dropdown-Liste
  labelStyle={{
    textAlign: 'center',
  }}
/>
        {/* Button zum Generieren der Bewerbung */}
        <TouchableOpacity style={styles.buttonNext} onPress={init}>
          <Text style={styles.buttonText}>Speichern</Text>
        </TouchableOpacity>
        <Text style={styles.text2}>{t('first.theDrop')}</Text>

        <Text>{finishMessage}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  innerContainer: {
    width: '80%',
  },
  textInput: {
    borderRadius: 15,
    padding: 13,
    backgroundColor: colors.card3,
    borderColor: 'gray',
    borderWidth: 1,
    shadowColor: "gray",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    color: 'white',
  },
  loading: {
    marginTop: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 115, // Position it below the input field
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'gray',
    zIndex: 1000, // Ensure it's above other elements
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Keep suggestions inside rounded container
  },
  text1: {
    fontSize: 28,
    color: colors.textColor,
    marginBottom: 10,
    textAlign: 'center',
   
  },
  text2: {
    fontSize: 12,
    color: colors.textColor,
    marginTop: 10,
    textAlign: 'center',


  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    color: 'white',
    fontSize: 14,
  },
  inputSecondary: {
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: colors.card3,
    borderRadius: 15,
    padding: 13,
    borderColor: 'gray',
    borderWidth: 1,
    fontSize: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    color: 'white',
  },
  buttonContainer: {

  },
  dropdown: {
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
  dropDownContainer: {
    borderRadius: 15,
    borderColor: 'gray',
    width: width * 0.8,
    alignSelf: 'center',
    backgroundColor:colors.card3,

  },
  suggestionsList: { 
    position: 'absolute',
    top: 205,
    width: '100%',
    zIndex: 10000,
    marginTop: 10,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fafafa'
  },
  suggestionsList2: { 
    position: 'absolute',
    top: 147,
    width: '100%',
    zIndex: 10000,
    marginTop: 10,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fafafa'
  },
  suggestionItemContainer: {
    padding: 10,
    backgroundColor: colors.card3,
  },
  suggestionItem: {
    fontSize: 16,
    color: 'white'
  },
  buttonNext: {
    width: "100%",
    backgroundColor: colors.card3,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "gray",
    fontFamily: 'Aleo-Bold',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonNextTrans: {
    width: "100%",
    backgroundColor: "transparent",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: colors.textColor,
    fontSize: 15,
  },
  buttonTextTrans: {
    color: 'transparent',
    fontSize: 16,
  },
  finishMessage: {
    textAlign: 'center',
    marginTop: 50,
    color: 'white',
  },
});

export default StartScreen;

