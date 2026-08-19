import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, FlatList,SafeAreaView } from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import { decryp } from './cryp.js';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const Header = ({ onPress }) => {
  const [myName, setMyName] = useState('Laden...');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownItems = ['Profil', 'Einstellungen', 'Abmelden'];

  useEffect(() => {
    const handleLogin = async () => {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
      try {
        const db = await SQLite.openDatabase({
          name: 'firstNew.db',
          location: 'default',
        });
        const result = await db.executeSql(
          'SELECT * FROM files WHERE ident = ?',
          [deviceId],
        );
        const files = result[0].rows.raw();
        if (files.length === 0) {
          console.log('No files found');
          return;
        }
        const file = files[0];
        setMyName(await decryp(file.name, key));
      } catch (error) {
        console.error('Login failed:', error.message);
      }
    };
    handleLogin();
  }, []);

  return (

    <Card containerStyle={styles.card}>
      <View style={styles.headerEntry}>
        <Text style={styles.job}>Willkommen, {myName}</Text>
        <TouchableOpacity onPress={() => setDropdownVisible(!isDropdownVisible)}>
          <MaterialIcons name="menu" size={30} color="white" style={{ marginLeft: 50 }} />
        </TouchableOpacity>
      </View>
      {isDropdownVisible && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={dropdownItems}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => {item}}>
                <Text style={styles.dropdownText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </Card>

  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 30,
    borderWidth: 0,
    shadowColor: 'transparent',
    width: width,
  },
  headerEntry: {
    backgroundColor: "rgba(27, 47, 75, 2)",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'gray',
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  job: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  dropdownContainer: {
    backgroundColor: 'white',
borderWidth:1,
borderColor:'gray',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
    width:'95%',
    position: 'absolute',
    top: 60,
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex:100000,
    backgroundColor: "rgba(27, 47, 75, 2)",
    
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: "rgba(27, 47, 75, 2)",

    

  },
  dropdownText: {
    fontSize: 16,
        color:'white'
  },
});

export default Header;
