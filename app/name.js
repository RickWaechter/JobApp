import { useNavigation } from "@react-navigation/native";
import { addSearchListener, fetchPlace, search } from "expo-mapkit";
import { router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import ClearButton from "../comp/clearButton.jsx";
import colors from "../inc/colors.js";
import useKeyboardAnimation from "../inc/Keyboard.js";
import "../local/i18n.js";
const Name = () => {
  const [yourName, setYourName] = useState("");
  const [yourStreet, setYourStreet] = useState("");
  const [yourCity, setYourCity] = useState("");
  const [finishMessage, setFinishMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [buttonManually, setButtonManually] = useState(true);
  const [showAddressSearch, setShowAddressSearch] = useState(true);
  const navigation = useNavigation();
  const { keyboardHeight, reset } = useKeyboardAnimation();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [address, setAddress] = useState("");
  const lastTimeClick = useRef(0)
  const [term, setTerm] = useState("");
  const [details, setDetails] = useState(null);
  const companyRef = useRef(null);
  const [errors, setErrors] = useState({
    nameErr: "",
    cityErr: "",
    streetErr: "",
  });

  // Your API key
  useEffect(() => {
    // Listener registrieren
    const listener = addSearchListener((items) => {
      setResults(items);
    });

    return () => {
      // Listener aufräumen
      listener.remove();
    };
  }, []);
useEffect(() => {
  console.log(yourName, yourCity, yourStreet);

}, [yourName, yourCity, yourStreet,errors]);
  const onChange = (text) => {
    setQuery(text);
    search(text);
  };

  const handleSelect = async (item) => {
    try {
      const info = await fetchPlace(item.identifier);
      setDetails(info);
      console.log("Fetched place details:", info);
      console.log("Identifier:", item);
      if (item.subtitle) {
        const name = item.title;
        const street = item.subtitle.split(",")[0];

        let city = item.subtitle.split(", ")[1];
        if (city.includes(" ")) {
          city = item.subtitle.split(", ")[1];
          console.log("1")
        }
          else {
            console.log("2")
            city = item.subtitle.split(", ")[2];
          }
      
        console.log("Name:", name);
        console.log("Street:", street);
        console.log("City:", city); 
        await handleSaveChanges(name, street, city);
      }
    } catch (e) {
      console.warn("fetchPlace error:", e);
    }
  };

  const next = async () => {
     console.log('Navigating to application screen', errors);

 if (
      yourName.length < 1 &&
     yourCity.length < 1 &&
     yourStreet.length < 1
     
    ) {
      setErrors({
        nameErr: t('validation.nameCompany.required'),
        cityErr: t('validation.city.required'),
        streetErr: t('validation.street.required'),
      });
      return;
    }
    if (yourName.length < 1 && yourStreet.length < 1) {
      setErrors({
        nameErr: t('validation.nameCompany.required'),
        streetErr: t('validation.street.required'),
      });
      return;
    }
    if (yourName.length < 1 && yourCity.length < 1) {
      setErrors({
        nameErr: t('validation.nameCompany.required'),
        cityErr: t('validation.city.required'),
      });
      return;
    }
    if (yourCity.length < 1 && yourStreet.length < 1) {
      setErrors({
        cityErr: t('validation.city.required'),
        streetErr: t('validation.street.required'),
        
      });
      return;
    }
    if (yourCity.length < 1) {
      setErrors({
        cityErr: t('validation.city.required'),
        
      });
      return;
    }
    if (yourStreet.length < 1) {
      setErrors({
        streetErr: t('validation.street.required'),
      });
      return;
    }
    if (yourName.length < 1) {
      setErrors({
        nameErr: t('validation.nameCompany.required'),
      });
      return;
    }

     const now = Date.now();
      if (now - lastTimeClick.current < 1000) {
        console.log('Zu schnell! Doppelklick verhindert.');
        return;
      }
      lastTimeClick.current = now;

   
 await EncryptedStorage.setItem('result', 'application');
    if (yourName && yourCity && yourStreet) {
      await EncryptedStorage.setItem("yourName", yourName);
      await EncryptedStorage.setItem("yourCity", yourCity);
      await EncryptedStorage.setItem("yourStreet", yourStreet);
       setErrors({});
    }
      router.push('application');
  };
  const handleSaveChanges = async (theName, theStreet, theCity) => {
    if (theName && theCity && theStreet) {
      try {
        await EncryptedStorage.setItem("yourName", theName);
        await EncryptedStorage.setItem("yourCity", theCity);
        await EncryptedStorage.setItem("yourStreet", theStreet);
        setYourName(theName);
        setYourCity(theCity);
        setYourStreet(theStreet);
        setShowAddressSearch(false);
        setButtonManually(true);
        setQuery("");
        console.log("Saved:", theName, theStreet, theCity);
      } catch (error) {
        console.error("Failed to access Keychain", error);
        Alert.alert(
          "Fehler",
          "Deine Daten konnten nicht gespeichert werden. Bitte versuche es erneut.",
          [{ text: "OK" }]
        );
      }
    } else {
      setYourName(theName || "");
      setYourStreet(theStreet || "");
      setYourCity(theCity || "");
 setShowAddressSearch(false);
        setButtonManually(true);
        setQuery("");
    }
  };

  // Change input state after a small delay
  const inputStateNew = () => {
    companyRef.current?.focus();
    console.log("Manuell eingeben");
    setShowAddressSearch(false);
    setButtonManually(true);
    setYourName(query);
  };

  // For debugging

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[styles.innerContainer, { paddingBottom: keyboardHeight }]}
      >
        {showAddressSearch ? (
          <>
            <TextInput
              style={styles.textInput}
              placeholder={t("searchCompany")}
              placeholderTextColor="gray"
              value={query}
              onChangeText={onChange}
              ref={companyRef}

            />

            {/* Suggestions container */}
            {query.length > 0 && results.length > 0 && (
              <View style={styles.suggestionsContainerCity}>
                <FlatList
                                keyboardShouldPersistTaps="handled"

                  data={results}
                  keyExtractor={(item) => item.identifier}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelect(item)}
                      style={styles.suggestionItem}
                    >
                      <Text style={styles.suggestionText}>{item.title}</Text>
                      <Text style={styles.suggestionText}>{item.subtitle}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            <TouchableOpacity style={styles.buttonNext} onPress={inputStateNew}>
              <Text style={styles.buttonText}>{t("enterManually")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              placeholder={t('companyName')}
              placeholderTextColor={isDarkMode}
              value={yourName}
              onChangeText={setYourName}
              
            />
              {errors.nameErr ? (
                              <Text style={styles.error}>{errors.nameErr}</Text>
                            ) : null}
            {yourName.length > 0 && (
              <ClearButton value={yourName} setValue={setYourName} top={5} right={10} />
            )}
            {buttonManually && (
              <>
                <TextInput
                  style={styles.inputSecondary}
                  placeholder={t('companyStreet')}
                  placeholderTextColor="gray"
                  value={yourStreet}
                  onChangeText={setYourStreet}
                />
                  {errors.streetErr ? (
                              <Text style={styles.error}>{errors.streetErr}</Text>
                            ) : null}
                {yourStreet.length > 0 && (
                  <ClearButton
                    value={yourStreet}
                    setValue={setYourStreet}
                    top={60}
                    right={10}
                  />
                )}
                <TextInput
                  style={styles.inputSecondary}
                  placeholder={t('companyCity')}
                  placeholderTextColor="gray"
                  value={yourCity}
                  onChangeText={setYourCity}
                />
                  {errors.cityErr ? (
                              <Text style={styles.error}>{errors.cityErr}</Text>
                            ) : null}
                {yourCity.length > 0 && (
                  <ClearButton
                    value={yourCity}
                    setValue={setYourCity}
                  right={10}
                    top={115}
                  />
                )}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.buttonNext} onPress={next}>
                    <Text style={styles.buttonText}>{t('continue')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  innerContainer: {
    width: "80%",
  },
  textInput: {
    borderRadius: 15,
    padding: 13,
    backgroundColor: colors.card3,
    borderColor: "gray",
    borderWidth: 1,
    shadowColor: "gray",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    color: "white",
  },
    error: {
    color: 'red',
    fontSize: 12,
    position: 'abosulte',
    top: '2%',
    left: '1%',
  },
  suggestionsContainerCity: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "gray",
    zIndex: 1000,
    maxHeight: 200,
    overflow: "hidden",
  },
  suggestionsContainer: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "gray",
    zIndex: 1000,
    maxHeight: 200,
    minHeight: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140, 140, 145, 0.42)",
  },
  suggestionText: {
    color: "white",
    fontSize: 14,
  },
  inputSecondary: {
    marginTop: 10,
    backgroundColor: colors.card3,
    borderRadius: 15,
    padding: 13,
    borderColor: "gray",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    color: "white",
  },
  buttonContainer: {},
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
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});

export default Name;
