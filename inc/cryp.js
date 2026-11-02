import AES from "react-native-aes-crypto";
import { sha256 } from "react-native-sha256";
import EncryptedStorage from "react-native-encrypted-storage";

// ==========================================
// 1. Hilfsfunktionen
// ==========================================

// 16 Bytes = 32 Hex-Zeichen IV generieren (nativ)
export const genIv = async () => {
  return await AES.randomKey(16);
};

// ==========================================
// 2. Normale Strings (react-native-aes-crypto)
// ==========================================

export async function decryp(cipher, key) {
  try {
    if (!cipher || typeof cipher !== "string" || !key || typeof key !== "string") {
      console.warn("decryp: Ungültige Parameter übergeben.");
      return "";
    }

    if (!cipher.includes(":")) {
      console.warn("decryp: Ungültiges Cipher-Format (kein Doppelpunkt vorhanden).");
      return "";
    }

    const cipherArray = cipher.split(":");
    const iv = cipherArray[0]?.trim();
    const cipher1 = cipherArray[1]?.trim();

    if (!iv || !cipher1) {
      console.warn("decryp: IV oder Ciphertext ist leer.");
      return "";
    }

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
// 3. Base64 PDFs (Jetzt ebenfalls nativ via AES)
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

    // 256-Bit Hex-Key ableiten
    const keyHex = await sha256(encryptionKey);

    // Nativer Aufruf statt JS-Loop
    const cipher = await AES.encrypt(base64String, keyHex, iv, "aes-256-cbc");
    return `${iv}${cipher}`;
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

    // Die ersten 32 Zeichen sind der IV (16 Bytes in Hex)
    const iv = combinedString.slice(0, 32);
    const encryptedBase64 = combinedString.slice(32);

    // 256-Bit Hex-Key ableiten
    const keyHex = await sha256(encryptionKey);

    // Nativer Aufruf: decrypt() liefert direkt den decodierten Base64-String zurück
    const decryptedString = await AES.decrypt(
      encryptedBase64,
      keyHex,
      iv,
      "aes-256-cbc"
    );

    if (!decryptedString) {
      throw new Error("Entschlüsselung fehlgeschlagen (falscher Key oder ungültige Daten).");
    }

    return decryptedString;
  } catch (error) {
    console.error("Fehler bei der Entschlüsselung:", error);
    return null;
  }
};