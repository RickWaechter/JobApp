import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dimensions, View, Keyboard, Text, Pressable, PanResponder, TextInput, TouchableWithoutFeedback, LayoutAnimation, Button, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Alert, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import SQLite from 'react-native-sqlite-storage';
import DeviceInfo from 'react-native-device-info';
import { encryp, decryp } from '../inc/cryp.js'
import EncryptedStorage from 'react-native-encrypted-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import CutLine from '../inc/CutLine.js'
import useKeyboardAnimation from '../inc/Keyboard.js'
import { ScrollView } from 'react-native-gesture-handler';
import DraggableFlatList from "react-native-draggable-flatlist";
import { Card } from '@rneui/themed';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import '../local/i18n';
import Modal from 'react-native-modal';
import dragDown from '../inc/pan.js';
import { color } from '@rneui/base';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../inc/colors.js';
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Setting = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const navigation = useNavigation();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [emailServer, setEmailServer] = useState("smtp.mail.de");

  const [isModalEmailVisible, setModalEmailVisible] = useState(false);
  const [db, setDb] = useState(null);
  const { keyboardHeight, reset } = useKeyboardAnimation();
  const DB_NAME = 'firstNew.db';
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState('');
  const { i18n } = useTranslation();
  const [isModalApiVisible, setModalApiVisible] = useState(false);
  const [myApiKey, setMyApiKey] = useState('');
  const [isModalGoogleApiVisible, setModalGoogleApiVisible] = useState(false);
  const [activateGoogle, setActivateGoogle] = useState(false);
  const [activate, setActivate] = useState(false);




  useEffect(() => {
    const Api = async () => {
      console.log(activateGoogle)
      const apiKey = await EncryptedStorage.getItem("api");
      const googleApiKey = await EncryptedStorage.getItem("googleApi");
      if (apiKey === "true") {
        setActivate(false);
        console.log("API Key is set " + apiKey);
      } else {
        setActivate(true);
        console.log("Else API Key is set " + apiKey);
      }
    }
    Api();
  }
    , [isDarkMode, activate, activateGoogle]);
  const items = [
    { label: 'English', value: 'en' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Turkish', value: 'tr' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Greek', value: 'gr' },
    { label: 'French', value: 'fr' },
    { label: 'Italian', value: 'it' },
    { label: 'Japanese', value: 'jp' },
    { label: 'Dutch', value: 'nl' },
    { label: 'Ukrainian', value: 'ua' },
    { label: 'Polish', value: 'pl' },
    {label: 'Romania', value: 'ru'},
  ];
  const itemsApi = [
    { label: 'OpenAI', value: 'openai' },

  ];

  const pan = useRef(new Animated.ValueXY()).current;


  const handleSaveChanges = async () => {
    if (!value) {
      Alert.alert(t('settings.languageError'));
      return;
    }
    EncryptedStorage.setItem("lang", value);
    Alert.alert(t('settings.languageSaved'));
    i18n.changeLanguage(value);
    setModalEmailVisible(false);
    setMyApiKey('');
  }

  const handleSaveApiChanges = async () => {
    console.log('handleSaveApiChanges started');
    console.log('Current value of myApiKey:', myApiKey);
    console.log('Current value of activate:', activate);

    await EncryptedStorage.setItem("api", 'true');
    console.log('api set to true');
    await EncryptedStorage.setItem("apiKey", myApiKey);
    console.log('apiKey set to ', myApiKey);
    setModalApiVisible(false); 
    setTimeout(() => {
      setActivate(false);
      console.log('activate set to false');
    }, 600);
    console.log('handleSaveApiChanges finished');
    console.log(await EncryptedStorage.getItem("api"));
    await EncryptedStorage.setItem("apiKey", myApiKey);

  }

  const handleSaveApiChangesNot = async () => {

    await EncryptedStorage.setItem("api", 'false');
    console.log(await EncryptedStorage.getItem("api"));

    setModalApiVisible(false);
    setTimeout(() => {
      setActivate(true);
      setMyApiKey('');
    }, 600);

  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputsContainer}>
        <Card containerStyle={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0, borderWidth: 'none' }}>
          <Pressable
  onPress={() => setModalEmailVisible(true)}        // Grund‑Style 
>
{({ pressed }) => (
  <View style={[
            styles.entry,                // Grund‑Layout
            pressed && styles.entryPress // nur solange gedrückt
          ]}>
    <Card.Title style={styles.job}>
      {t('settings.languageChange')}
    </Card.Title>
    <Card.Divider />
    <Text style={styles.name}>{t('settings.languageText')}</Text>
  </View>
)}
</Pressable>


           <Pressable
  onPress={() => setModalApiVisible(true)}        // Grund‑Style 
>
{({ pressed }) => (
  <View style={[
            styles.entry,                // Grund‑Layout
            pressed && styles.entryPress // nur solange gedrückt
          ]}>
    <Card.Title style={styles.job}>
      {t('settings.changeApiText')}
    </Card.Title>
    <Card.Divider />
    <Text style={styles.name}>{t('settings.apiText')}</Text>
  </View>
)}
</Pressable>


        </Card>
      </View>

      {/* Modal für persönliche Daten */}
      <Modal
        isVisible={isModalEmailVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setModalEmailVisible(false)}
        style={{ margin: 0,  width: width, justifyContent: 'center', alignSelf: 'center' }}
        swipeDirection={['down']}
        onSwipeComplete={() => setModalEmailVisible(false)}
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
      onPress={() => setModalEmailVisible(false)}
      style={styles.deleteButton}
    >
  
    </TouchableOpacity>

          <View style={{ zIndex: 3000 }}>
            <DropDownPicker
              open={open}
              value={value}
              items={items}
              setOpen={setOpen}
              setValue={setValue}
              placeholder={t('settings.language')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropDownContainer}
              textStyle={{ color: 'white' }}
            />
            <TouchableOpacity style={styles.buttonNew} onPress={() => handleSaveChanges()}>
              <Text style={styles.buttonText}>{t('saveAndClose')}</Text>
            </TouchableOpacity>
          </View>



        </Animated.View>

      </Modal>

      <Modal
        isVisible={isModalApiVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={475}
        animationOutTiming={475}
        onBackdropPress={() => setModalApiVisible(false)}
        style={{ margin: 0, borderRadius: 20,   width: width,  alignSelf: 'center', justifyContent: 'center' }}
        swipeDirection={['down']}
        onSwipeComplete={() => setModalApiVisible(false)}
        backdropOpacity={0.9}
        onModalWillShow={() => setIsAnimating(true)}
        onModalHide={() => { setIsAnimating(false) }}
        backdropTransitionOutTiming={1}
        useNativeDriver={false}
        transparent
      animationType="fade" 
      >

        <Animated.View
          style={[

            {
              
             padding: 15,
             height: 220,
             backgroundColor: "transparent", // Damit es sichtbar bleibt
              justifyContent: 'center',
              alignItems: 'center',
          
              transform: [{ translateY: Animated.multiply(keyboardHeight , -1)}],
              opacity: isAnimating ? 1 : 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,

            }
          ]}>
          {/* Your modal content */}

          <TouchableOpacity
      onPress={() => setModalApiVisible(false)}
      style={styles.deleteButton}
    >
    
    </TouchableOpacity>



          <View style={{ width: width * 0.8, alignSelf: "center" }}>
            <TextInput
              style={styles.input}
              placeholder={t('settings.apiKeyKey')}
              value={myApiKey}
              onChangeText={setMyApiKey}
              placeholderTextColor="gray"
            />
            {myApiKey.length > 0 && (
              <TouchableOpacity onPress={() => setMyApiKey('')} style={styles.clearButton}>
                <MaterialIcons name="cancel" size={25} color="gray" />
              </TouchableOpacity>
            )}
          </View>

          {activate && (<>
            <DropDownPicker
              open={open}
              value={value}
              items={itemsApi}
              setOpen={setOpen}
              setValue={setValue}
              placeholder={t('settings.pleaseApi')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropDownContainer}
              textStyle={{ color: 'white' }}
            />
            <TouchableOpacity style={styles.buttonNew} onPress={() => handleSaveApiChanges()}>
              <Text style={styles.buttonText}>{t('activateAndClose')}</Text>
            </TouchableOpacity>
          </>
          )}
          {!activate && (
            <>
              <TouchableOpacity style={styles.buttonNew} onPress={() => handleSaveApiChangesNot()}>
                <Text style={styles.buttonText}>{t('deactivateAndClose')}</Text>
              </TouchableOpacity>
            </>
          )}
        
        </Animated.View>

      </Modal>
      
      {/* Modal für E-Mail */}

    </SafeAreaView>
  );
};



const { height, width } = Dimensions.get("window");


const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    height: height,
    width: width,
  },
  deleteButton: {
    position: 'absolute',
    top: -16,
    right: '50%',
      },
  input: {
    borderRadius: 15,
    padding: 13,
    backgroundColor:colors.card3,
    height: 50,
    borderWidth: 1,
    borderColor: 'gray',
    color: 'white',
  },
  clearButton: {
    position: 'absolute',
    right: 17,
    top: 7,
    padding: 5,
  },
  dropDownContainer: {
    borderRadius: 15,
    borderColor: 'gray',
    width: width * 0.8,
    alignSelf: 'center',
    backgroundColor:colors.card3,

  },
  
  itemText: {
    color: 'gray---------------',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgb(8, 12, 32)",
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
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonTextShort: {
    color: 'white',
    fontSize: 8,
  },
  inputsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonNew: {
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  entry: {
    backgroundColor:colors.card3,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'gray',

  },
  entryPress: {
    backgroundColor:colors.card3,
    padding: 15,
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
  name: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "rgba(206, 208, 212, 1)",
    marginBottom: 5,
  },
  job: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",

  },
  text: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  user: {
    marginVertical: 10,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'white',
  },
  modalContainer: {
    width: width * 0.8,
    backgroundColor:colors.card3,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'gray',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2000,
    shadowColor: 'gray',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  modalButton: {
    backgroundColor: '#7D26CD',
    padding: 10,
    borderRadius: 10,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  dragArea: {
    flex: 1,
    padding: 20,
  },
});

export default Setting;
