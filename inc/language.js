// inc/languages.js

export const itemsLang = [
  { label: '🇩🇪 Deutsch', value: 'Deutsch' },
  { label: '🇬🇧 English', value: 'English' },
  { label: '🇬🇷 Ελληνικά', value: 'Ελληνικά' },
  { label: '🇹🇷 Türkçe', value: 'Türkçe' },
  { label: '🇸🇦 العربية', value: 'العربية' },
  { label: '🇫🇷 Français', value: 'Français' },
  { label: '🇮🇹 Italiano', value: 'Italiano' },
  { label: '🇪🇸 Español', value: 'Español' },
  { label: '🇳🇱 Nederlands', value: 'Nederlands' },
  { label: '🇵🇱 Polski', value: 'Polski' },
  { label: '🇷🇴 Română', value: 'Română' },
  { label: '🇷🇺 Русский', value: 'Русский' },
  { label: '🇺🇦 Українська', value: 'Українська' },
  { label: '🇭🇷 Bosanski / Hrvatski / Srpski', value: 'Bosanski / Hrvatski / Srpski' },
  { label: '🇮🇷 فارسی / دری', value: 'فارسی / دری' },
  { label: '🇯🇵 日本語', value: '日本語' },
];
// inc/languages.js
// inc/languages.js

export const getLocaleCode = (val) => {
  switch (val) {
    case 'Deutsch':
    case 'de':
      return 'de-DE';
    case 'English':
    case 'en':
      return 'en-US';
    case 'Ελληνικά':
    case 'el':
      return 'el-GR';
    case 'Türkçe':
    case 'tr':
      return 'tr-TR';
    case 'العربية':
    case 'ar':
      return 'ar-SA';
    case 'Français':
    case 'fr':
      return 'fr-FR';
    case 'Italiano':
    case 'it':
      return 'it-IT';
    case 'Español':
    case 'es':
      return 'es-ES';
    case 'Nederlands':
    case 'nl':
      return 'nl-NL';
    case 'Polski':
    case 'pl':
      return 'pl-PL';
    case 'Română':
    case 'ro':
      return 'ro-RO';
    case 'Русский':
    case 'ru':
      return 'ru-RU';
    case 'Українська':
    case 'ua':
    case 'uk':
      return 'uk-UA';
    case 'Bosanski / Hrvatski / Srpski':
    case 'bks':
      return 'bs-BA';
    case 'فارسی / دری':
    case 'fa':
      return 'fa-IR';
    case '日本語':
    case 'jp':
    case 'ja':
      return 'ja-JP';
    default:
      return 'de-DE';
  }
};
export const getI18nCode = (val) => {
  switch (val) {
    case 'Deutsch':
      return 'de';
    case 'English':
      return 'en';
    case 'Ελληνικά':
      return 'el';
    case 'Türkçe':
      return 'tr';
    case 'العربية':
      return 'ar';
    case 'Français':
      return 'fr';
    case 'Italiano':
      return 'it';
    case 'Español':
      return 'es';
    case 'Nederlands':
      return 'nl';
    case 'Polski':
      return 'pl';
    case 'Română':
      return 'ro';
    case 'Русский':
      return 'ru';
    case 'Українська':
      return 'ua';
    case 'Bosanski / Hrvatski / Srpski':
      return 'bks';
    case 'فارسی / دری':
      return 'fa';
    case '日本語':
      return 'jp';
    default:
      // Falls bereits ein 2-stelliger Code oder ein unbekannter Wert übergeben wird
      return val && val.length === 2 ? val.toLowerCase() : 'de';
  }
};
// DropDownPicker akzeptiert itemsLang direkt
export const languageOptions = itemsLang;

// Verknüpfung: Value -> i18n-Code (für JSON-Dateien) & Prompt-Bezeichnung
export const LANG_CONFIG = {
  Deutsch: { code: 'de', promptName: 'Deutsch' },
  English: { code: 'en', promptName: 'Englisch' },
  Ελληνικά: { code: 'el', promptName: 'Griechisch' },
  Türkçe: { code: 'tr', promptName: 'Türkisch' },
  العربية: { code: 'ar', promptName: 'Arabisch' },
  Français: { code: 'fr', promptName: 'Französisch' },
  Italiano: { code: 'it', promptName: 'Italienisch' },
  Español: { code: 'es', promptName: 'Spanisch' },
  Nederlands: { code: 'nl', promptName: 'Niederländisch' },
  Polski: { code: 'pl', promptName: 'Polnisch' },
  Română: { code: 'ro', promptName: 'Rumänisch' },
  Русский: { code: 'ru', promptName: 'Russisch' },
  Українська: { code: 'uk', promptName: 'Ukrainisch' },
  'Bosanski / Hrvatski / Srpski': { code: 'bks', promptName: 'Bosnisch/Kroatisch/Serbisch' },
  'فارسی / دری': { code: 'fa', promptName: 'Persisch (Farsi/Dari)' },
  日本語: { code: 'jp', promptName: 'Japanisch' },
};

export const getPromptLang = (val) => LANG_CONFIG[val]?.promptName || 'Deutsch';