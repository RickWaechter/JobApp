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
      const rawData = result[0]?.rows?.raw()?.[0];

      if (!rawData) {
        console.error("Fehler: Kein gültiges Datenobjekt gefunden");
        return;
      }

      const emailClient = rawData.emails;
      const key = await EncryptedStorage.getItem('key');
      if (typeof emailClient === "string" && emailClient.length > 0) {
        const decryptedEmailClient = await decryp(emailClient, key);
 
        const split = decryptedEmailClient.split("#")
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

  
    try {
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      const deviceId = await DeviceInfo.getUniqueId();
  
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM files WHERE ident = ?;',
          [deviceId],
          async (_, { rows }) => {
            const credentials = await Keychain.getGenericPassword();
            const myKey = credentials.password;
           await EncryptedStorage.setItem('key', myKey);

           
  
            await Promise.all(
              Array.from({ length: rows.length }, async (_, i) => {
                const item = rows.item(i);
             
                if (!item.first || item.first === false) {
                  return
                }
                try {
                  await Promise.all([
                    decryptAndStore(item.name, "name", myKey),
                    decryptAndStore(item.street, "street", myKey),
                    decryptAndStore(item.city, "city", myKey),
                  ]);
  
                  if (item.lebenslauf) {
                    await decryptAndStore(item.lebenslauf, "lebenslauf", myKey);
                  } else if (item.email && item.emailPassword && item.emailServer) {
                    await Promise.all([
                      decryptAndStore(item.email, "email", myKey),
                      decryptAndStore(item.emailPassword, "emailPassword", myKey),
                      decryptAndStore(item.emailServer, "emailServer", myKey),
                    ]);
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
      
   
    } catch (error) {
      console.error('Error removing key from EncryptedStorage:', error);
    }
  };

  export const checkIfFirst = async () => {
    try {
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
      const deviceId = await DeviceInfo.getUniqueId();
  
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
