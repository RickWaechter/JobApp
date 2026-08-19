// -----------------------------------------------------------------------------
//  cryptoUtils.js  –  React‑Native Helferfunktionen (ChaCha20‑Poly1305)
//  ---------------------------------------------------------------------------
//  Ersetzt die bisherigen AES‑CBC Routinen durch ChaCha20‑Poly1305, behält aber
//  die *gleichen Funktionsnamen* (decryp, encryp, encryptBase64, decryptBase,
//  decryptAndStore, genIv).  Alle Funktionen arbeiten jetzt mit einem
//  256‑Bit‑Schlüssel, 12‑Byte‑Nonce (IETF) und integrierter Authentifizierung.
// -----------------------------------------------------------------------------

import 'react-native-get-random-values';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes }      from '@noble/hashes/utils';
import { sha256, sha256Bytes } from 'react-native-sha256';

import { Buffer }           from 'buffer';
import CryptoJS             from 'react-native-crypto-js';
import EncryptedStorage     from 'react-native-encrypted-storage';

// -----------------------------------------------------------------------------
//  Hilfs‑Encoder / Decoder
// -----------------------------------------------------------------------------
const utf8      = (txt)   => new TextEncoder().encode(txt);
const toUtf8    = (buf)   => new TextDecoder().decode(buf);
const toHex     = (buf)   => Buffer.from(buf).toString('hex');
const fromHex   = (hex)   => Uint8Array.from(Buffer.from(hex, 'hex'));
const toB64     = (buf)   => Buffer.from(buf).toString('base64');
const fromB64   = (b64)   => Uint8Array.from(Buffer.from(b64, 'base64'));

// -----------------------------------------------------------------------------
//  Key‑Ableitung (32‑Byte SHA‑256 aus beliebigem String)
// -----------------------------------------------------------------------------
const deriveKey = (keyString) => sha256(utf8(keyString));

// -----------------------------------------------------------------------------
//  1) Einfacher Klartext  ⇄  cipher  (Format: nonceHex:cipherB64)
// -----------------------------------------------------------------------------
export async function encryp(text, key) {
  const nonce  = randomBytes(12);                // 12‑Byte IETF‑Nonce
  const cipher = chacha20poly1305(deriveKey(key)).encrypt(nonce, utf8(text));
  return `${toHex(nonce)}:${toB64(cipher)}`;     // nonceHex:cipherTagB64
}

export async function decryp(cipherPayload, key) {
  const [nonceHex, cipherB64] = cipherPayload.split(':');
  if (!nonceHex || !cipherB64) throw new Error('Ungültiges Cipher‑Format');
  const nonce   = fromHex(nonceHex);
  const cipher  = fromB64(cipherB64);
  const plain   = chacha20poly1305(deriveKey(key)).decrypt(nonce, cipher);
  return toUtf8(plain);
}

// -----------------------------------------------------------------------------
//  2) Base64‑Strings verschlüsseln (kompatibel zu alten Signaturen)
// -----------------------------------------------------------------------------
//  encryptBase64 gibt  <nonceHex><cipherTagB64>  OHNE Doppelpunkt zurück, damit
//  die bisherige Slice‑Logik ("iv + cipher") weiter funktioniert – wir ändern
//  nur die Länge des Prefixes auf 24 Hex‑Zeichen (12‑Byte‑Nonce).
// -----------------------------------------------------------------------------
export const encryptBase64 = async (base64String, _ivUnused, encryptionKey) => {
  if (!base64String?.trim()) return null;
  const nonce  = randomBytes(12);                                   // 24 Hex‑Zeichen
  const cipher = chacha20poly1305(deriveKey(encryptionKey))
                  .encrypt(nonce, fromB64(base64String));
  return `${toHex(nonce)}${toB64(cipher)}`;                          // concat
};

export const decryptBase = async (combinedString, encryptionKey) => {
  if (!combinedString || combinedString.length <= 24) return null;
  const nonceHex     = combinedString.slice(0, 24);                 // 12‑Byte‑Nonce hex
  const cipherB64    = combinedString.slice(24);
  const plainBytes   = chacha20poly1305(deriveKey(encryptionKey))
                        .decrypt(fromHex(nonceHex), fromB64(cipherB64));
  return toUtf8(plainBytes);
};

// -----------------------------------------------------------------------------
//  3) Wrapper: entschlüsseln & sicher speichern
// -----------------------------------------------------------------------------
export async function decryptAndStore(itemValue, storageKey, myKey) {
  const decryptedValue = await decryp(itemValue, myKey);
  return EncryptedStorage.setItem(storageKey, decryptedValue);
}

// -----------------------------------------------------------------------------
//  4) IV‑Generator bleibt erhalten (für Legacy‑Funktionen)
// -----------------------------------------------------------------------------
export const genIv = () => {
  const randomWord = CryptoJS.lib.WordArray.random(12);  // 12 Byte = 24 Hex‑Zeichen
  return randomWord.toString(CryptoJS.enc.Hex);
};

// -----------------------------------------------------------------------------
//  Fertig – alle öffentlichen Funktionsnamen bleiben gleich, arbeiten jetzt
//  aber mit ChaCha20‑Poly1305 (schneller & AEAD‑sicher).
// -----------------------------------------------------------------------------
