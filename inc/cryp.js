import AES from "react-native-aes-crypto";
import CryptoJS from "react-native-crypto-js";
import { sha256, sha256Bytes } from 'react-native-sha256';
import EncryptedStorage from 'react-native-encrypted-storage';
export async function decryp(cipher, key){
const cipherArray = cipher.split(':')
const iv = cipherArray[0]
const cipher1 = cipherArray[1]
 const ret = await AES.decrypt(cipher1, key, iv, "aes-256-cbc");
 return ret;
}

export async function encryp(text, key) {
const iv = await AES.randomKey(16);
const cipher = await AES.encrypt(text, key, iv, "aes-256-cbc");
const cipherIv = iv + ':' + cipher
return cipherIv;
} 

export const genIv = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(16); // 16 Bytes = 128 Bits
    const newIv = randomBytes.toString(CryptoJS.enc.Hex);
    return newIv;
  };

  export async function decryptAndStore(itemValue, storageKey, myKey) {
    const decryptedValue = await decryp(itemValue, myKey);
    console.log("itemValue", decryptedValue);  
    return EncryptedStorage.setItem(storageKey, decryptedValue);
  }


  
  export const encryptBase64 = async (base64String, iv, encryptionKey) => {
    try {
      if (!base64String || !base64String.trim()) {
        console.error("Base64-String ist leer oder ungültig.");
        return null;
      }
      if (!encryptionKey || !encryptionKey.trim()) {
        console.error("Verschlüsselungsschlüssel ist leer oder ungültig.");
        return null;
      }
      if (!iv || !iv.trim()) {
        console.error("IV ist leer oder ungültig.");
        return null;
      }
      
      
      // IV als WordArray
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      
      // Schlüssel als WordArray (mit SHA-256 Hash für konsistente Länge)
      const keyWordArray = await sha256(encryptionKey);
      
      // AES-Verschlüsselung mit CryptoJS und IV
      const encrypted = CryptoJS.AES.encrypt(base64String, keyWordArray, {
        iv: ivWordArray,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      });
      
      // Als Base64 ausgeben, nicht als UTF-8
      const encryptedBase64 = encrypted.toString();
      
      const combined = `${iv}${encryptedBase64}`;
      return combined;
    } catch (error) {
      console.error("Fehler bei der Verschlüsselung:", error);
      return null;
    }
  };
  
  export const decryptBase = async (combinedString, encryptionKey) => {
    try {
      if (!combinedString || combinedString.length <= 32) {
        console.error("Verschlüsselter String ist ungültig.");
        return null;
      }
      
      const iv = combinedString.slice(0, 32);
      const encryptedBase64 = combinedString.slice(32);
      
      
      // IV als WordArray
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      
      // Schlüssel als WordArray (mit SHA-256 Hash für konsistente Länge)
      // wichtig: gleiche Verarbeitung wie in encryptBase64
      const keyWordArray = await sha256(encryptionKey);
      
      // AES-Entschlüsselung mit CryptoJS und IV
      const decrypted = CryptoJS.AES.decrypt(encryptedBase64, keyWordArray, {
        iv: ivWordArray,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      
      // Konvertierung zu UTF-8
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      return decryptedString;
    } catch (error) {
      console.error("Fehler bei der Entschlüsselung:", error);
      return null;
    }
  };