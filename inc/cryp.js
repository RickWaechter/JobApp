import AES from "react-native-aes-crypto";
import CryptoJS from "react-native-crypto-js";
import { sha256 } from "react-native-sha256";
import EncryptedStorage from "react-native-encrypted-storage";

// ==========================================
// Normale Strings (Nutzt react-native-aes-crypto)
// ==========================================
export async function decryp(cipher, key) {
  try {
    // 1. Grundlegende Validierung auf String & Inhalt
    if (!cipher || typeof cipher !== "string" || !key || typeof key !== "string") {
      console.warn("decryp: Ungültige Parameter übergeben.");
      return "";
    }

    // 2. Format prüfen: Muss zwingend "iv:ciphertext" sein
    if (!cipher.includes(":")) {
      console.warn("decryp: Ungültiges Cipher-Format (kein Doppelpunkt vorhanden).");
      return "";
    }

    const cipherArray = cipher.split(":");
    const iv = cipherArray[0]?.trim();
    const cipher1 = cipherArray[1]?.trim();

    // 3. Verhindert, dass cipher1 = undefined/nil an Objective-C übergeben wird
    if (!iv || !cipher1) {
      console.warn("decryp: IV oder Ciphertext ist leer.");
      return "";
    }

    // 4. Native Entschlüsselung
    const ret = await AES.decrypt(cipher1, key, iv, "aes-256-cbc");
    return ret || "";
  } catch (error) {
    console.error("decryp: Fehler beim Entschlüsseln:", error);
    return "";
  }
}

export async function encryp(text, key) {
  try {
    if (!text || typeof text !== "string" || !key || typeof key !== "string") {
      console.warn("encryp: Ungültiger Text oder Key.");
      return "";
    }

    const iv = await AES.randomKey(16);
    const cipher = await AES.encrypt(text, key, iv, "aes-256-cbc");
    return `${iv}:${cipher}`;
  } catch (error) {
    console.error("encryp: Fehler beim Verschlüsseln:", error);
    return "";
  }
}

export const genIv = () => {
  const randomBytes = CryptoJS.lib.WordArray.random(16); // 16 Bytes = 128 Bits
  return randomBytes.toString(CryptoJS.enc.Hex);
};

export async function decryptAndStore(itemValue, storageKey, myKey) {
  try {
    const decryptedValue = await decryp(itemValue, myKey);
    if (!decryptedValue) {
      console.warn(`decryptAndStore: Konnte ${storageKey} nicht entschlüsseln.`);
      return;
    }
    await EncryptedStorage.setItem(storageKey, decryptedValue);
  } catch (error) {
    console.error(`decryptAndStore Error (${storageKey}):`, error);
  }
}

// ==========================================
// Base64 PDFs (Nutzt CryptoJS)
// ==========================================
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

    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    const keyString = await sha256(encryptionKey);
    const keyWordArray = CryptoJS.enc.Hex.parse(keyString);

    const encrypted = CryptoJS.AES.encrypt(base64String, keyWordArray, {
      iv: ivWordArray,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });

    const encryptedBase64 = encrypted.toString();
    return `${iv}${encryptedBase64}`;
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

    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    const keyString = await sha256(encryptionKey);
    const keyWordArray = CryptoJS.enc.Hex.parse(keyString);

    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, keyWordArray, {
      iv: ivWordArray,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error("Entschlüsselung fehlgeschlagen (falscher Key oder altes Format).");
    }

    return decryptedString;
  } catch (error) {
    console.error("Fehler bei der Entschlüsselung:", error);
    return null;
  }
};