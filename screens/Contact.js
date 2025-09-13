// ContactForm.js
import React, { useState, useEffect, useCallback, UseRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import EncryptedStorage from 'react-native-encrypted-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import SQLite from 'react-native-sqlite-storage';
import forge from 'node-forge';
import axios from 'axios';
import { decryp, encryp, decryptBase } from '../inc/cryp.js';
import Animated from 'react-native-reanimated';
import useKeyboardAnimation from '../inc/Keyboard.js'
import colors from '../inc/colors.js';
const Contact = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [formData, setFormData] = useState({message: ''});
  const [triggerGeneratePDF, setTriggerGeneratePDF] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [finishMessage, setFinishMessage] = useState('');
  const [decEmail, setDecEmail] = useState('');
  const [dotCount, setDotCount] = useState(0); // To control the number of dots
  const DB_NAME = 'firstNew.db';
  const keyboardHeight = useKeyboardAnimation();



  

  useEffect(() => {
    // Loggt den aktualisierten Zustand
  }, [formData.emailPassword]);

  const handleChange = (name, value) => {
    const updatedValue = value.replace(/\(at\)/gi, '@');
    setFormData(prevData => ({
      ...prevData,
      [name]: updatedValue,
    }));
  };

  const handleSubmit = async () => {
    try {
  
      const response = await fetch('http://178.254.6.218:3001/api/emailNativ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
       Alert.alert(
              "Erfolg",
              "Ihre Bewerbungsmappe wurde erfolgreich gesendet",
              [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.navigate('MainTabs')
                  },
                },
              ]
            );
      
      } else {
        const { message } = await response.json();
        switch (message) {
          case 'Error sending mail or querying database':
            Alert.alert('Bitte prüfen Sie Ihre Email Einstellungen.');
            break;
          default:
            Alert.alert('Unbekannter Fehler');
            break;

        }
      }
    } catch (error) {
      Alert.alert('Netzwerkfehler: ' + error.message);
    }
  };

  const handleButtonRight = async () => {
    const yourName =
      (await EncryptedStorage.getItem('yourName')) || 'defaultName'; // Fallback-Wert
    const yourCity =
      (await EncryptedStorage.getItem('yourCity')) || 'defaultCity'; // Fallback-Wert
    const url = `https://www.google.com/search?q=${yourName}, ${yourCity}, bewerbung+mail`;
    setWebUrl(url); // URL setzen
    setModalVisible(true); // Modal öffnen
  };





  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Kontakt</Text>

         
          <TextInput
            style={styles.input}
            placeholder="E‑Mail"
            keyboardType="email-address"
            placeholderTextColor="#8A8A8E"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={value => handleChange('email', value)}
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Nachricht"
            placeholderTextColor="#8A8A8E"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={formData.message}
            onChangeText={value => handleChange('message', value)}
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Senden</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Contact;

const primaryColor = '#28a745';
const backgroundColor = '#121212';
const surfaceColor = '#1E1E1E';
const borderColor = '#2C2C2E';
const textColor = '#FFFFFF';
const {width} = Dimensions.get('window');
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 24,
    alignItems: 'center',
   
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: textColor,
    marginBottom: 24,
    fontFamily: 'Helvetica-Bold',
  },
  input: {
    width: width * 0.9,
    backgroundColor: colors.card,
    borderColor: borderColor,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: textColor,
    marginBottom: 16,
    
  },
  textarea: {
    height: 160,
  },
  button: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: width * 0.9,
borderWidth: 1,
    borderColor:'#2C2C2E',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
