import CryptoJS from 'crypto-js';

import crypto from 'crypto';
async function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
export async function decryp(cipher, key) {

const [ivStr, cipherText] = cipher.split(':');

const iv = CryptoJS.enc.Hex.parse(ivStr);
const parsedKey = CryptoJS.enc.Hex.parse(key);

const decrypted = CryptoJS.AES.decrypt(cipherText, parsedKey, {
  iv: iv,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7
});

const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
return plaintext;

  }



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
      
      console.log('Erfolg')
      return decryptedString;
    } catch (error) {
      console.error("Fehler bei der Entschlüsselung:", error);
      return null;
    }
  };
