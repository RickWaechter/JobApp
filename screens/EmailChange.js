import SQLite from 'react-native-sqlite-storage';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Keyboard } from 'react-native';
import React, {forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Picker } from '@react-native-picker/picker';
import DeviceInfo from 'react-native-device-info'
import { encryp, decryp } from '../inc/cryp.js'
import * as Keychain from 'react-native-keychain';
import DropDownPicker from 'react-native-dropdown-picker';
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DB_NAME = 'firstNew.db';
const EmailScreen = forwardRef((props, ref) => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailServer, setEmailServer] = useState("smtp.mail.de");
  const [finishMessage, setFinishMessage] = useState("");
  const jobRef = useRef(null);
  const jobRef2 = useRef(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);

  useEffect(() => {
    const get = async () => {
        const deviceId = await DeviceInfo.getUniqueId();
        const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
        const credentials = await Keychain.getGenericPassword();
        const myKey = credentials.password
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
                console.log(file)
                if (file.email && file.emailPassword)
                {
                setEmail(await decryp(file.email, myKey));
                setPassword(await decryp(file.emailPassword, myKey));
                }
                else {
                return 
            }
               
    }
    get();
  }, [email, password]);
  const items = [
    { label: 'mail.de', value: 'smtp.mail.de' },
    { label: 'gmail.com', value: 'gmail.com' },
  ];
  const navigation = useNavigation();
  const handleEmail = (value) => {
    setEmail(value);
  }
  const handlePassword = (value) => {
    setPassword(value);
  }
  const handleEmailServer = (value) => {
    setEmailServer(value);
    console.log(emailServer)
  }
  const make = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password
      const email1 = await encryp(email, myKey)
      const password1 = await encryp(password, myKey)
      const emailServer1 = await encryp(emailServer, myKey)



      // Datensatz mit der ident-Spalte (deviceId) einfügen
      await db.executeSql(
        `UPDATE files SET email = ?, emailPassword = ?, emailServer = ? WHERE ident = ?;`,
        [email1, password1, emailServer1, deviceId]
      );

      console.log('Datenbank initialisiert und Tabelle erstellt.');
      navigation.navigate('Upload');
    } catch (err) {
      console.error('Fehler bei der Datenbankinitialisierung:', err);
    }
  }


  return (
    <View style={styles.container}>
      {/* Eingabeformular */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={jobRef}
            style={styles.input}
            placeholder="Vor und Nachname"
            value={email}
            onChangeText={handleEmail}
          />
          <TextInput
            ref={jobRef2}
            style={styles.input}
            placeholder="Straße und Hausnummer"
            value={password}
            onChangeText={handlePassword}
          />
          <DropDownPicker
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            placeholder="Wählen Sie einen E-Mail-Server"
            style={styles.dropdown}
            dropDownStyle={styles.dropdownList}
            onPress={Keyboard.dismiss}
          />
        </View>
      </View>

      {/* Button-Bereich (unten angeordnet) */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => functionRef.current()}>
          <Text style={styles.buttonText}>Dateien speichern</Text>
        </TouchableOpacity>
        {finishMessage !== "" && (
          <Text style={styles.message}>{finishMessage}</Text>
        )}
      </View>
    </View>
  );
});
const {height, width} = Dimensions.get('window')
const styles = StyleSheet.create({
  container: {
 flex:1,
    
  },
  // Container, in dem das Formular mittig ausgerichtet wird
  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  inputContainer: {
    width:width * 0.8
  },

  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16,
    // Moderner Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  dropdown: {
    width: "100%",
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    paddingHorizontal: 10
  },
  dropdownList: {
    backgroundColor: "#fff"
  },
  // Bereich für den Button am unteren Rand
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 30
  },
  button: {
    width: "100%",
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    // Button-Shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  message: {
    marginTop: 15,
    fontSize: 14,
    color: "#333",
    textAlign: "center"
  }
});

export default EmailScreen;

