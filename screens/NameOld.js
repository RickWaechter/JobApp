import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as Keychain from 'react-native-keychain';
import useKeyboardAnimation from '../inc/Keyboard.js'
import { useTranslation } from 'react-i18next';
import '../local/i18n'; 
import ClearButton from '../comp/clearButton.jsx';
import colors from '../inc/colors.js';
import DatabaseDownloader from '../inc/downloader';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { search, fetchPlace, addSearchListener } from './LocationSearchNative';
const NameOld = () => {

        const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const anredeOptions = ['Herr', 'Damen und Herren', 'Frau'];
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yourName, setYourName] = useState('');
  const [yourStreet, setYourStreet] = useState('');
  const [yourCity, setYourCity] = useState('');
   const [buttonManually, setButtonManually] = useState(false);
    const [name, setName] = useState('');
  const [finishMessage, setFinishMessage] = useState('');
  const [inputState, setInputState] = useState(false);
  const navigation = useNavigation();
  const {keyboardHeight, reset} = useKeyboardAnimation();
  const [errors, setErrors] = useState({ name: '', job: '', skill: '', anrede: '' }); 
    const jobRef2 = useRef(null);
    const nameRef = useRef(null);
     const [results, setResults] = useState([]);
const [manual, setManual] = useState(false);
    const [selectedOption3, setSelectedOption3] = useState('');

    const [resultsStreet, setResultsStreet] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
   const [streetSuggestions, setStreetSuggestions] = useState([]);
const [cit, setCit] = useState(false);
   const [progress, setProgress] = useState(0);
   const [downloading, setDownloading] = useState(false);
   const cityRef = useRef(null);
   const [dbExists, setDbExists] = useState(false);
    const [job, setJob] = useState(0);
  const [term, setTerm] = useState('');
    const downloadCancelRef = useRef(null);
    const [resume, setResume] = useState(false);
    const jobIdRef = useRef(null);
    const dbRef = useRef(null);
    const dbRefCity = useRef(null);
    const debounceRef = useRef(null);
    const dbRefStreet = useRef(null);
    const streetRef = useRef(null);
  const [citySuggestion, setCitySuggestion] = useState([]);
    const [ad, setAd] = useState(false);
  const [streetDbExists, setStreetDbExists] = useState(false);
  const [cityDbExists, setCityDbExists] = useState(false);
  const [isExists, setIsExists] = useState(false);
  const [nameDbExist, setNameDbExist] = useState(false);
    useEffect(() => {
      console.log('useEffect called', yourName);
    
      if (debounceRef.current) clearTimeout(debounceRef.current);
  
      debounceRef.current = setTimeout(() => doSearch(yourName), 300);
  
    }, [yourName, dbExists, job]);
  
    useEffect(() => {
      console.log('useEffect called', yourName);
    
      if (debounceRef.current) clearTimeout(debounceRef.current);
  
      debounceRef.current = setTimeout(() => doStreet(yourStreet), 50);
  
    }, [yourStreet, job]);
    useEffect(() => {
      console.log('useEffect called', yourCity);
    
      if (debounceRef.current) clearTimeout(debounceRef.current);
  
      debounceRef.current = setTimeout(() => doCity(yourCity), 50);
  
    }, [yourCity]);
  
  

 
  const next = () => {
    navigation.replace('ChangeOld');
  }
  const handleSaveChanges = async (name1, street, city) => {
    console.log('handleSaveChanges called');
    let anrede;
    if (name1 && street && city ) {
      try {
        // Retrieve the credentials
        console.log('yourName', name1);
        console.log('yourCity', street);
        console.log('yourStreet', city);
        console.log('selectedOption3', selectedOption3);
        await EncryptedStorage.setItem('yourName', name1);
        await EncryptedStorage.setItem('yourCity', city);
        await EncryptedStorage.setItem('yourStreet', street);
        setYourName(name1);
        setYourCity(city);
        setYourStreet(street);  
       
        setButtonManually(true);    
        setTerm('');  
  
        switch (selectedOption3) {
          case t('anredeOptions.herr'):
            anrede = 'Sehr geehrter Herr ' + '' +  name + ',';
            break;
          case t('anredeOptions.damenUndHerren'):
            anrede = 'Sehr geehrte Damen und Herren,';
            break;
          case t('anredeOptions.frau'):
            anrede = 'Sehr geehrte Frau ' + '' + name + ',';
            break;
          default:
            anrede = t('salutation.default');
        }
        console.log('anrede', anrede);
        await EncryptedStorage.setItem('anrede', anrede);
        console.log('anrede in Keychain saved');
       
      } catch (error) {
        console.error("Failed to access Keychain", error);
      }
    } else {
      setFinishMessage('Bitte alle drei Felder ausfüllen');
    }
  };
  const handleNameChange = text => {
    
    setName(text.charAt(0).toUpperCase() + text.slice(1));

  };
  const doSearch = async (text) => {
    console.log('doSearch called', text);
    try {
      if (!dbRef.current) {
        console.log('dbRef.current is null');
        return;
      }
      const [res] = await dbRef.current.executeSql(
        'SELECT rowid AS id, name FROM firmen WHERE firmen MATCH ? LIMIT 20',
        [`${text}*`],
      );

      console.log('res', res);
      const names = res.rows.raw();
      console.log('names', names);
      setResults(names);
     
    } catch (err) {
      console.warn('Search error', err);
    }
  };
  const extractZahlen = (text) => {
    const gefunden = [...text.matchAll(/\b\d+\b/g)]
      .map(match => parseInt(match[0]))
      .filter(num => num >= 1 && num <= 500);

    return gefunden
  };
  const entferneZahlen = (text) => {
    const ohneZahlen = text.replace(/\d+/g, ''); // alle Ziffernfolgen durch '' ersetzen
    return ohneZahlen.trim(); // führende und nachfolgende Leerzeichen entfernen
  };
  const doStreet = async (text) => {
 
    text = entferneZahlen(text);
    console.log('doStreet called with text:', text);
    try {
      if (!dbRefStreet.current) {
        console.log('dbRefStreet.current is null');
        return;
      }
      console.log('Executing SQL query...');
      const [res] = await dbRefStreet.current.executeSql(
        'SELECT rowid AS id, street FROM streets WHERE streets MATCH ? LIMIT 20',
        [`${text}*`],
      );

      console.log('SQL query executed, result:', res);
      const names = res.rows.raw();
      console.log('Processed names:', names);
      setStreetSuggestions(names);
    
    } catch (err) {
      console.warn('Search error:', err);
    }
  };

  const doCity = async (text) => {

    console.log('doSearch called', text);
    try {
  
      const [res] = await dbRefCity.current.executeSql(
        'SELECT rowid AS id, city FROM citys WHERE city MATCH ? LIMIT 20',
        [`${text}*`],
      );

      console.log('res', res);
      const names = res.rows.raw();
      console.log('names', names);
      setCitySuggestion(names);
    
    } catch (err) {
      console.warn('Search error', err);
    }
  };
  const checkDbExists = async () => {
    const DB_NAME = 'firmen.db';
const firmaDb = await RNFS.exists(`${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`);
    const streetDb = await RNFS.exists(`${RNFS.LibraryDirectoryPath}/LocalDatabase/street.db`);
    const cityDb = await RNFS.exists(`${RNFS.LibraryDirectoryPath}/LocalDatabase/city.db`);
  if (streetDb) {
      console.log('DB exists');
      setStreetDbExists(true);
    }
    if (cityDb) {
      console.log('DB exists');
      setCityDbExists(true);
      console.log('cityDb', cityDb);
    } 
   if (firmaDb) {
      console.log('DB exists');
      setNameDbExist(true);
      console.log('firmaDb', firmaDb);
      console.log('Name exists' + nameDbExist);
    }
  };
    useEffect(() => {
      const sub = addSearchListener(setResults);
      return () => sub.remove();
    }, []);
useEffect(() => {
  checkDbExists();
}, []);
  const getDetail = async (item, other) => {
    console.log('item', item)
    console.log('other', other )
    const res = await fetchPlace(item); 
    const adr = other.split(',')
    console.log('red', res)
    console.log('adr', adr)
    handleSaveChanges(res.name, adr[0], adr[adr.length -2])
    }
  const inputStateNew = () => {
console.log('Manuell eingeben');
setShowAddressSearch(false);
setButtonManually(true);

  }
const selectLocation = (item) => {
  console.log('selectLocation called', item);
  const zahl = extractZahlen(yourStreet);
  setYourStreet(item.street + ' ' + zahl);
  setStreetSuggestions([]);
  setAd(false);
  cityRef.current.focus();
}
const selectLocationCity = (item) => {
  console.log('selectLocation called', item);

  setYourCity(item.city);
  setCitySuggestion([]);
  setCit(false);
}
  useEffect(() => {
  
  
    const openOnce = async () => {
      console.log('openOnce called');
  
        try {
          if (nameDbExist) {
          const db = await SQLite.openDatabase({
            name: 'firmen.db',  
            location: 'default',
            readOnly: true,
          });
          dbRef.current = db
          ;
          }
          if (streetDbExists) {
            const db2 = await SQLite.openDatabase({
              name: 'street.db',
              location: 'default',
              readOnly: true,
            });
            dbRefStreet.current = db2;
          }
          if (cityDbExists) {
            const db1 = await SQLite.openDatabase({
              name: 'city.db',
              location: 'default',
              readOnly: true,
            });
            dbRefCity.current = db1;
          }

   
         
          
          
          console.log('Database opened successfully');
        } catch (e) {
          console.warn('DB open error', e);
        }
      
    };
    openOnce();
  if (yourName.length < 1)
    setIsOpen(false);
  
   
  }, [yourName, yourCity, yourStreet]);
  const handleOptionChange3 = value => {
    setSelectedOption3(prev => (prev === value ? '' : value));
    switch (value) {
      case 'Herr':
        if (jobRef2.current) jobRef2.current.focus();
        break;
      case 'Damen und Herren':
        if (nameRef.current) nameRef.current.focus();
        break;
      case 'Frau':
        if (jobRef2.current) jobRef2.current.focus();
        break;
      default:
        break;
    }
  };

  
  const isDisabled = selectedOption3 === 'Damen und Herren';
 return (
     <View style={styles.container}>
       <Animated.View 
         style={[
           styles.innerContainer,
           { marginBottom: keyboardHeight } // Use marginBottom instead of paddingBottom
         ]}
       >
           <View style={styles.section}>
                    <View style={styles.radioContainer}>
                      {anredeOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleOptionChange3(option)}
                          style={[
                            styles.radioOption,
                            selectedOption3 === option && styles.radioOptionSelected
                          ]}
                        >
                          <Text style={selectedOption3 === option ? styles.radioOptionTextSelected : styles.radioOptionText}>
                            {t(option)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      
                    </View>
                  </View>
        
                  <View style={styles.section}>
                    <TextInput
                      ref={jobRef2}
                      style={[styles.input, isDisabled && styles.disabledInput]}
                      placeholder={t("nameAnsprechpartner")}
                      placeholderTextColor={"gray"}
                      value={name}
                      onChangeText={handleNameChange}
                      editable={!isDisabled}
                      selectTextOnFocus={!isDisabled}
                      autoCorrect={false}
                    />
                    {errors.anrede ? <Text style={styles.error}>{errors.anrede}</Text> : null}
                  </View>
  
         {/* Search Input Field */}
         
     
    { !buttonManually && (
      <>
    
       <TextInput
                    style={styles.textInput}
                    placeholder="Suche direkt nach der Firma"
                    placeholderTextColor="gray"
                    value={term}
                    onChangeText={t => { setTerm(t); search(t); console.log(t); }}
                   
                  />
      
                  {/* Suggestions container */}
         { term.length > 0 && results.length > 0 && (
                 <View style={styles.suggestionsContainerCity}>
                   <FlatList
                     data={results}
                     keyExtractor={(item) => item.identifier}
                     renderItem={({ item }) => (
                       <TouchableOpacity
                         onPress={() => getDetail(item.identifier, item.subtitle)}
                         style={styles.suggestionItem}>
                         <Text style={styles.suggestionText}>{item.title + ',\n' + item.subtitle.toString()}</Text>
                       </TouchableOpacity>
                     )}
                     keyboardShouldPersistTaps="handled"
                   />
    
         </View>
         )}
                </>
                    )}
            {buttonManually && (
              <>
              <TextInput
                            style={styles.textInput}
                            placeholder="Name des Unternehmens"

                            value={yourName}
                            onChangeText={setYourName}
                          />
                <TextInput
                  style={styles.inputSecondary}
                  placeholder="Straße und Hausnummer" 
                  placeholderTextColor='gray'
                  value={yourStreet}
                  onChangeText={setYourStreet}
                />
                 
                <TextInput
                  style={styles.inputSecondary}
                  placeholder="PLZ und Stadt"
                  placeholderTextColor='gray'
                  value={yourCity}
                  onChangeText={setYourCity}
                />

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.buttonNext}
                    onPress={next}
                  >
                    <Text style={styles.buttonText}>Weiter</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
        
         
        
       </Animated.View>
     </View>
   );
 };
 
 const { height, width } = Dimensions.get('window');
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
     color:'white',
   },
   loading: {
     marginTop: 10,
   },
   suggestionsContainerName: {
    position: 'absolute',
    top: 170,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'gray',
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsContainerCity: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'gray',
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 225,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'gray',
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
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
    backgroundColor: colors.card3,
    borderRadius: 15,
    padding: 13,
    borderColor: '#2C2C2E',
    borderWidth: 1,
    color: 'white',



   },

   buttonContainer: {
 
   },
   buttonNext: {
     width: "100%",
     backgroundColor: colors.card3,
     padding: 12,
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
     color: '#FFFFFF',
     fontSize: 16,
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
   safeContainer: {

    backgroundColor: colors.card3,
  },
  error: {
    color: 'red',
    fontSize: 12,
    position: 'abosulte',
    top: '7%',
    left: '1%'
  },


  section: {
    marginBottom: 15
  },
  input: {
    marginTop: 3,
    backgroundColor: colors.card3,
    borderRadius: 15,
    padding: 13,
    borderColor: '#2C2C2E',
    borderWidth: 1,
    color: 'white',
  
  },
  disabledInput: {
    backgroundColor: 'rgb(16, 27, 43)',
    opacity: 0.4
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'gray',

    borderRadius: 10,
    paddingVertical: 3
  },
  radioOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 5,
    marginRight: 5,
    borderRadius: 10,

    borderWidth: 1,
    borderColor: 'gray'

  },

  radioOptionSelected: {
   
    borderColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#f7fbf5' ,
   
  },
  radioOptionText: {
    fontSize: 16,
    color: "gray" ,
  },
  radioOptionTextSelected: {
    fontSize: 16,
    color: 'white' ,
  },



  saveButton: {
    position: 'absolute',
    top: 10,
    right: 15,

    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  button: {
    width: "100%",
    backgroundColor:"rgba(27, 47, 75, 2)" ,
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
  button1: {
    width: "100%",
    
    padding: 15,
color: 'gray',
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
  secondaryButton: {
    backgroundColor: '#34C759'
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20
  },
  buttonText1: {
    color: 'gray',
    textAlign: 'center',
    fontSize: 20
  }
 });
 
  
  export default NameOld;