import EncryptedStorage from "react-native-encrypted-storage";

const KEYBOARD_HEIGHT_KEY = "keyboardHeight";

/**
 * Speichert die aktuelle Keyboard-Höhe nur,
 * wenn sie sich gegenüber dem gespeicherten Wert geändert hat.
 *
 * @param {number} height - aktuelle Keyboard-Höhe
 * @returns {Promise<number>} gespeicherte Höhe
 */
export const saveKeyboardHeight = async (height) => {
  try {
    if (!height || height <= 0) {
      return null;
    }

    const currentHeight = Math.round(height);

    const storedHeight = await EncryptedStorage.getItem(
      KEYBOARD_HEIGHT_KEY
    );

    const previousHeight = storedHeight
      ? Number(storedHeight)
      : null;

    // Nichts tun, wenn sich die Höhe nicht geändert hat
    if (previousHeight === currentHeight) {
      return currentHeight;
    }

    // Neue Höhe speichern
    await EncryptedStorage.setItem(
      KEYBOARD_HEIGHT_KEY,
      String(currentHeight)
    );

    console.log(
      `[Keyboard] Höhe aktualisiert: ${previousHeight ?? "keine"} → ${currentHeight}`
    );

    return currentHeight;
  } catch (error) {
    console.warn(
      "[Keyboard] Fehler beim Speichern der Tastaturhöhe:",
      error
    );

    return null;
  }
};

/**
 * Liest die zuletzt gespeicherte Keyboard-Höhe.
 */
export const getKeyboardHeight = async () => {
  try {
    const storedHeight = await EncryptedStorage.getItem(
      KEYBOARD_HEIGHT_KEY
    );

    if (!storedHeight) {
      return null;
    }

    const height = Number(storedHeight);

    return Number.isFinite(height) && height > 0
      ? height
      : null;
  } catch (error) {
    console.warn(
      "[Keyboard] Fehler beim Lesen der Tastaturhöhe:",
      error
    );

    return null;
  }
};