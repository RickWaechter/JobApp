// i18n.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import EncryptedStorage from 'react-native-encrypted-storage';
import en from './translate/en.json';
import de from './translate/de.json';
import tr from './translate/tr.json';
import ar from './translate/ar.json';
import gr from './translate/gr.json';
import fr from './translate/fr.json';
import it from './translate/it.json';
import jp from './translate/jp.json';
import nl from './translate/nl.json';
import ua from './translate/ua.json';
import pl from './translate/pl.json';
import ru from './translate/ru.json';


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