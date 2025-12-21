import DeviceInfo from "react-native-device-info";
import EncryptedStorage from "react-native-encrypted-storage";
import * as Keychain from "react-native-keychain";
import SQLite from "react-native-sqlite-storage";
import { decryp, decryptAndStore } from "./cryp";
const DB_NAME = 'firstNew.db';

export const selectDb = async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    try {
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      const result = await db.executeSql(
        'SELECT emails FROM files WHERE ident = ?',
        [deviceId],
      );
      console.log('Database query result:', result);
      const rawData = result[0]?.rows?.raw()?.[0];
      console.log('Raw data from database:', rawData);

      if (!rawData) {
        console.error("Fehler: Kein gültiges Datenobjekt gefunden");
        return;
      }

      const emailClient = rawData.emails;
      console.log('Encrypted emailClient data:', emailClient);
      const key = await EncryptedStorage.getItem('key');
      if (typeof emailClient === "string" && emailClient.length > 0) {
        const decryptedEmailClient = await decryp(emailClient, key);
        console.log('Decrypted emailClient data:', decryptedEmailClient);
 
        const split = decryptedEmailClient.split("#")
        console.log('Split emailClient data:', split);
        console.log(split)
        return split
      
      } else {
        console.log('EmailClient data is empty or not a string');
       return []; // Falls der Wert leer ist, leere Liste zurückgeben
        // Falls keine Daten vorhanden sind, leere Liste setzen
      }
    }
    catch (error) {
      console.error('Error fetching data from database:', error);
    }
  }

export const runQuery = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};


  export const secureStore = async () => {

    console.log('Starting secureStore function');
  
    try {
      console.log('Opening database');
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      const deviceId = await DeviceInfo.getUniqueId();
      console.log('Obtained device ID:', deviceId);
  
      db.transaction((tx) => {
        console.log('Beginning database transaction');
        tx.executeSql(
          'SELECT * FROM files WHERE ident = ?;',
          [deviceId],
          async (_, { rows }) => {
            console.log('Query successful, number of rows:', rows.length);
            const credentials = await Keychain.getGenericPassword();
            const myKey = credentials.password;
            console.log('Obtained key from Keychain:', myKey);
           await EncryptedStorage.setItem('key', myKey);

           
            console.log('Stored key in EncryptedStorage');
  
            await Promise.all(
              Array.from({ length: rows.length }, async (_, i) => {
                const item = rows.item(i);
             
                if (!item.first || item.first === false) {
                 console.log('First is false, skipping row:');
                  return
                }
                try {
                  console.log('First is true,');
                  await Promise.all([
                    decryptAndStore(item.name, "name", myKey),
                    console.log('Decrypted and stored name' + item.name),
                    decryptAndStore(item.street, "street", myKey),
                    console.log('Decrypted and stored street'),
                    decryptAndStore(item.city, "city", myKey),
                    console.log('Decrypted and stored city', item.city),
                  ]);
                  console.log('Decrypted and stored name, street, and city');
  
                  if (item.lebenslauf) {
                    await decryptAndStore(item.lebenslauf, "lebenslauf", myKey);
                    console.log('Decrypted and stored lebenslauf');
                  } else if (item.email && item.emailPassword && item.emailServer) {
                    await Promise.all([
                      decryptAndStore(item.email, "email", myKey),
                      decryptAndStore(item.emailPassword, "emailPassword", myKey),
                      decryptAndStore(item.emailServer, "emailServer", myKey),
                    ]);
                    console.log('Decrypted and stored email, emailPassword, and emailServer');
                  }
                } catch (error) {
              
                }
              })
            );
            
          },
     
          (_, error) => console.error('Fehler beim Abrufens der Dateien:', error)
          
        );
     
      });
    } catch (error) {
      console.error('Fehler beim Öffnen der Datenbank:', error);
    }
  };

  export const removeStorage = async () => {
    try {
      await EncryptedStorage.clear();
      console.log('EncryptedStorage cleared');
      
   
    } catch (error) {
      console.error('Error removing key from EncryptedStorage:', error);
    }
  };

  export const checkIfFirst = async () => {
    console.log('Entering checkIfFirst function');
    try {
      console.log('Opening database');
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      const deviceId = await DeviceInfo.getUniqueId();
  
      console.log(`Checking if database is empty for device with id: ${deviceId}`);
      const res = await db.executeSql(
        "SELECT first FROM files WHERE ident = ?",
        [deviceId]
      );

      const hallo = await res[0].rows.raw()[0].first;
   if (hallo) {
    return true
   }  else {
    return false
   }
    
    
      
    } catch (error) {
      console.error('Fehler beim Öffnen der Datenbank:', error);
    
    }
  };
