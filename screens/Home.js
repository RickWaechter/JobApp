import React, { useState, useEffect , useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  ImageBackground
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation } from '@react-navigation/native';
import colors from '../inc/colors.js';
export default function Home() {
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [startVisible, setStartVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [popupVisible, setPopupVisible] = useState(true);


  return (
    
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.buttonStart}
        onPress={() => {
          navigation.navigate('Start');
        }}>
        <Text style={styles.buttonText}>Einrichten</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonStart}
        onPress={() => {
          navigation.navigate('EmailStart');
        }}>
        <Text style={styles.buttonText}>Email Konfigurieren</Text>
      </TouchableOpacity>
      
     

      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  buttonStart: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonNext: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  messageContainer: {
    marginTop: 20,
  },
  messageText: {
    fontSize: 16,
  },
});
