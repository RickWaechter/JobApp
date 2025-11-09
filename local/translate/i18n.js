// i18n.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as RNLocalize from 'react-native-localize';
import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import fr from './fr.json';
import gr from './gr.json';
import it from './it.json';
import jp from './jp.json';
import nl from './nl.json';
import pl from './pl.json';
import ru from './ru.json';
import tr from './tr.json';
import ua from './ua.json';


const resources = { en: { translation: en },
 de: { translation: de },
  tr: { translation: tr },
  ar: { translation: ar },
  gr: { translation: gr },
  fr: { translation: fr },
  it: { translation: it },
  jp: { translation: jp },
  nl: { translation: nl },
  ua: { translation: ua },
  pl: { translation: pl },
  ru: { translation: ru },
};
const fallback  = 'en';
const deviceLng = RNLocalize.getLocales()[0]?.languageCode ?? fallback;

/** Promise, das aufgelöst wird, sobald i18n fertig ist */
export const i18nReady = (async () => {
  const storedLng = await EncryptedStorage.getItem('lang');     // z. B. "de" | null
  await i18next
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources,
      lng: storedLng || deviceLng,
      fallbackLng: fallback,
      interpolation: { escapeValue: false },
    });
  return i18next;
})();

export default i18next;