import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import useKeyboardAnimation from '../inc/Keyboard.js';
import ClearButton from '../comp/clearButton.jsx'
import { useTranslation } from 'react-i18next';
import { useGoogleAutocomplete } from '@appandflow/react-native-google-autocomplete';
import '../local/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../inc/colors.js';
import { color } from '@rneui/base';
import { rgb } from 'pdf-lib';
const Name = () => {
  const [yourName, setYourName] = useState('');
  const [yourStreet, setYourStreet] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [finishMessage, setFinishMessage] = useState('');
  const [inputState, setInputState] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [buttonManually, setButtonManually] = useState(true);
  const [showAddressSearch, setShowAddressSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const {keyboardHeight, reset} = useKeyboardAnimation();
  const { t, i18n } = useTranslation();
  const [googleApi, setGoogleApi] = useState('');
    const [results, setResults] = useState([]);
    const [address, setAddress] = useState('');
    const [term, setTerm] = useState('');
  useFocusEffect(
    useCallback(() => {
      const getTheme = async () => {
        const theme = await EncryptedStorage.getItem("theme");
        setIsDarkMode(theme === "false" ? true : false);
      }
      getTheme();
    }, [])
  );

  // Your API key



  

  const next = async () => {

      navigation.navigate('Application');
 
  };

  const handleSaveChanges = async (theName, theStreet, theCity) => {
    if (theName && theCity && theStreet) {
      try {
        await EncryptedStorage.setItem('yourName', theName);
        await EncryptedStorage.setItem('yourCity', theCity);
        await EncryptedStorage.setItem('yourStreet', theStreet);
setYourName(theName);
setYourCity(theCity);
setYourStreet(theStreet);  
setShowAddressSearch(false);
setButtonManually(true);    
setTerm('');  

      } catch (error) {
        console.error("Failed to access Keychain", error);
        Alert.alert(
          'Fehler',
          'Deine Daten konnten nicht gespeichert werden. Bitte versuche es erneut.',
          [{ text: 'OK' }]
        );
      }
    } else {
      setFinishMessage('Bitte alle drei Felder ausfüllen');
    }
  };
  const getDetail = async (item, other) => {
    console.log('item', item)
    console.log('other', other )
    const res = await fetchPlace(item); 
    const adr = other.split(',')
    console.log('red' + res)
    console.log('adr', adr)
    const new1 = adr[adr.length -2].trimStart();
    console.log('new1', new1)
    handleSaveChanges(res.name, adr[0], new1)
    }
  const inputStateNew = () => {
console.log('Manuell eingeben');
setShowAddressSearch(false);
setButtonManually(true);

  }
// Change input state after a small delay
useEffect(() => {
  const hallo = async () => {
    console.log('name', await EncryptedStorage.getItem('name'));
    console.log('city', await EncryptedStorage.getItem('city'));
    console.log('street', await EncryptedStorage.getItem('street'));
  }
hallo();
}, []);

  // For debugging
  useEffect(() => {
    const sub = addSearchListener(setResults);
    return () => sub.remove();
  }, []);

  return (

      <SafeAreaView style={styles.container}>
            <Animated.View
      style={[
        styles.innerContainer,
        { paddingBottom: keyboardHeight }
      ]}
    >
        {showAddressSearch ? (
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
             
          

            <TouchableOpacity
              style={styles.buttonNext}
              onPress={inputStateNew}
            >
              <Text style={styles.buttonText}>Manuell eingeben</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Name des Unternehmens"
              placeholderTextColor={isDarkMode}
              value={yourName.substring(0, 40) + "..."}
              onChangeText={setYourName}
            />
 {yourName.length > 0 && (
      <ClearButton value={yourName} setValue={setYourName} top={5} />
    )}
            {buttonManually && (
              <>
                <TextInput
                  style={styles.inputSecondary}
                  placeholder="Straße und Hausnummer" 
                  placeholderTextColor='gray'
                  value={yourStreet}
                  onChangeText={setYourStreet}
                />
                  {yourStreet.length > 0 && (
      <ClearButton value={yourStreet} setValue={setYourStreet} top={60 } />
    )}
                <TextInput
                  style={styles.inputSecondary}
                  placeholder="PLZ und Stadt"
                  placeholderTextColor='gray'
                  value={yourCity}
                  onChangeText={setYourCity}
                />
                 {yourCity.length > 0 && (
      <ClearButton value={yourCity} setValue={setYourCity} top={115} />
    )}
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
          </>
        )}
         </Animated.View>
      </SafeAreaView >
   
  );
};
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
    shadowColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    color: 'white',
  },
  loadingContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: 'white',
  },
  suggestionsContainerCity: {
    position: 'absolute',
    top: 50,
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
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'gray',
    zIndex: 1000,
    maxHeight: 200,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140, 140, 145, 0.42)",
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
    borderColor: 'gray',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    color: 'white',
  },
  buttonContainer: {},
  buttonNext: {
    width: '100%',
    backgroundColor: colors.card3,
    padding: 12,
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  finishMessage: {
    textAlign: 'center',
    marginTop: 50,
    color: 'white',
  },
  noResultsContainer: {
    padding: 12,
  },
});

export default Name;