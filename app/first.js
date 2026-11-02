// StartScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import * as Localization from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sha256 } from 'react-native-sha256';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import { encryp } from '../inc/cryp.js';
import { downloader } from '../inc/downloader.js';
import { saveKeyboardHeight } from '../inc/keyboardStorage.js';
import {getDatabaseConnection} from '../inc/db.js';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const { width } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const StartScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  /* ── States ──────────────────────────────────────────── */
  const [name, setName] = useState('');
  const [yourStreet, setYourStreet] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [value, setValue] = useState('de');
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  /* ── Refs ────────────────────────────────────────────── */
  const nameRef = useRef(null);
  const streetRef = useRef(null);
  const cityRef = useRef(null);
  const scrollRef = useRef(null);

  const items = [
    { label: 'Deutsch', value: 'de' },
    { label: 'English', value: 'en' },
    { label: 'Ελληνικά', value: 'el' },
    { label: 'Türkçe', value: 'tr' },
    { label: 'Français', value: 'fr' },
    { label: 'Italiano', value: 'it' },
    { label: 'Polski', value: 'pl' },
    { label: 'Nederlands', value: 'nl' },
    { label: 'Română', value: 'ro' },
    { label: 'Українська', value: 'ua' },
    { label: 'العربية', value: 'ar' },
    { label: '日本語', value: 'jp' },
    { label: 'Español', value: 'es' },
  ];

  /* ── Sprache erkennen & Tastatur-Handling ─────────────── */
  useEffect(() => {
    const rawLang = Localization.getLocales()[0]?.languageCode;
    let targetLang = 'de';

    switch (rawLang) {
      case 'de':
      case 'en':
      case 'tr':
      case 'ar':
      case 'fr':
      case 'it':
      case 'nl':
      case 'pl':
      case 'ro':
      case 'es':
        targetLang = rawLang;
        break;
      case 'el':
      case 'gr':
        targetLang = 'el';
        break;
      case 'ja':
      case 'jp':
        targetLang = 'jp';
        break;
      case 'uk':
      case 'ua':
        targetLang = 'ua';
        break;
      case 'bs':
      case 'hr':
      case 'sr':
      case 'bks':
        targetLang = 'bks';
        break;
      default:
        targetLang = 'de';
        break;
    }

    i18n.changeLanguage(targetLang);
    setValue(targetLang);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      const h = e?.endCoordinates?.height;
      if (h && h > 0) {
        saveKeyboardHeight(String(Math.round(h)));
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [i18n]);

  /* ── Jobs-DB Download im Hintergrund ─────────────────── */
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        downloader('jobs.db', 'LocalDatabase');
        console.log('DB Downloaded');
      } catch (err) {
        console.error('DB Download Error:', err);
      }
    };

    setupDatabase();
  }, []);

  /* ── Musterdaten einfügen ────────────────────────────── */
  const handleFillSampleData = () => {
    nameRef.current?.focus();
    setName('Max Mustermann');
    setYourStreet('Rosensteinstraße 21');
    setYourCity('70191 Stuttgart');
    setValue('de');
    i18n.changeLanguage('de');
  };

  /* ── Datenbanken löschen (jobs.db & firstNew.db) ────────── */
  const handleDeleteDatabases = () => {
    Alert.alert(
      'Datenbanken löschen',
      'Möchtest du "jobs.db" und "firstNew.db" wirklich unwiderruflich vom Gerät löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. SQLite-Datenbank firstNew.db schließen & löschen
              try {
                await SQLite.deleteDatabase({ name: DB_NAME, location: 'default' });
              } catch (e) {
                console.warn('SQLite.deleteDatabase firstNew.db:', e);
              }

              try {
                await SQLite.deleteDatabase({ name: 'jobs.db', location: 'default' });
              } catch (e) {
                console.warn('SQLite.deleteDatabase jobs.db:', e);
              }

              // 2. Physische Dateien via RNFS bereinigen
              const docDir = RNFS.DocumentDirectoryPath;
              const libraryDir = RNFS.LibraryDirectoryPath || docDir;

              const candidatePaths = [
                `${docDir}/firstNew.db`,
                `${docDir}/jobs.db`,
                `${libraryDir}/LocalDatabase/firstNew.db`,
                `${libraryDir}/LocalDatabase/jobs.db`,
                `${libraryDir}/firstNew.db`,
                `${libraryDir}/jobs.db`,
              ];

              for (const path of candidatePaths) {
                const exists = await RNFS.exists(path);
                if (exists) {
                  await RNFS.unlink(path);
                }
              }

              // Formular-State zurücksetzen
              setName('');
              setYourStreet('');
              setYourCity('');

              Alert.alert('Erfolg', 'Beide Datenbanken wurden erfolgreich gelöscht.');
            } catch (err) {
              console.error('Fehler beim Löschen der Datenbanken:', err);
              Alert.alert('Fehler', 'Datenbanken konnten nicht vollständig gelöscht werden.');
            }
          },
        },
      ]
    );
  };

  /* ── Straße & Stadt Parser (falls kombiniert eingefügt) ── */
  const handleMyStreet = (text) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      setYourStreet(parts[0].trim());
      if (parts[1]) {
        setYourCity(parts[1].trim());
      }
    } else {
      setYourStreet(text);
    }
  };

  /* ── Speichern & Datenbank initialisieren ────────────── */
/* ── Speichern & Datenbank initialisieren ────────────── */
  const init = async () => {
    if (!name.trim() || !yourStreet.trim() || !yourCity.trim()) {
      Alert.alert(
        t('first.errorMissingFieldsTitle'),
        t('first.errorMissingFieldsMsg')
      );
      return;
    }

    setIsSaving(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await getDatabaseConnection(DB_NAME);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ident VARCHAR(255) UNIQUE,
          name VARCHAR(255),
          street VARCHAR(255),
          city VARCHAR(255),
          lebenslauf VARCHAR(255),
          add1 VARCHAR(255),
          add2 VARCHAR(255),
          add3 VARCHAR(255),
          add4 VARCHAR(255),
          add5 VARCHAR(255),
          add6 VARCHAR(255),
          add7 VARCHAR(255),
          add8 VARCHAR(255),
          add9 VARCHAR(255),  
          add10 VARCHAR(255),
          anschreiben VARCHAR(255),
          email VARCHAR(255),
          emailPassword VARCHAR(255),
          emailServer VARCHAR(255),
          skills TEXT,
          old TEXT DEFAULT '',
          mergePdf TEXT DEFAULT '',
          first BOOLEAN DEFAULT false,
          jobs TEXT DEFAULT '',
          emails TEXT DEFAULT NULL
        );
      `);

      await db.executeSql(
        `INSERT OR IGNORE INTO files (ident) VALUES (?);`,
        [deviceId]
      );

      if (value) {
        await i18n.changeLanguage(value);
        await EncryptedStorage.setItem('lang', value);
      }

      await make(deviceId, db);
    } catch (err) {
      console.error('Error opening/creating database:', err);
      Alert.alert(t('common.error'), t('first.dbInitError'));
    } finally {
      setIsSaving(false); // Stoppt das Dauerladen unter allen Umständen
    }
  };
  const make = async (deviceId, db) => {
    try {
      const cleanName = name.trim();
      const cleanStreet = yourStreet.trim();
      const cleanCity = yourCity.trim();

      await EncryptedStorage.setItem('name', cleanName);
      await EncryptedStorage.setItem('street', cleanStreet);
      await EncryptedStorage.setItem('city', cleanCity);

      const password = await sha256(deviceId);
      await Keychain.setGenericPassword(deviceId, password);

      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;
      await EncryptedStorage.setItem('key', myKey);

      const nameCryp = await encryp(cleanName, myKey);
      const streetCryp = await encryp(cleanStreet, myKey);
      const cityCryp = await encryp(cleanCity, myKey);

      await db.executeSql(
        `UPDATE files 
         SET first = ?, name = ?, street = ?, city = ? 
         WHERE ident = ?;`,
        [true, nameCryp, streetCryp, cityCryp, deviceId]
      );

      setIsSaving(false);
      router.dismissTo('uploadFirst');
    } catch (err) {
      setIsSaving(false);
      console.error('Fehler bei der Verschlüsselung / Speicherung:', err);
      Alert.alert(t('common.error'), t('first.encryptionError'));
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            {/* ── Scrollbarer Bereich für Header & Formular ── */}
            <ScrollView
              ref={scrollRef}
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTopRow}>
                  <View style={styles.badgeHub}>
                    <View style={styles.statusDot} />
                    <Text style={styles.badgeHubText}>{t('first.badge')}</Text>
                  </View>

                  {/* DB Löschen Button im Header */}
                  <TouchableOpacity
                    style={styles.headerDeleteBtn}
                    onPress={handleDeleteDatabases}
                    activeOpacity={0.75}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="delete-forever" size={18} color="#F87171" />
                    <Text style={styles.headerDeleteBtnText}>DBs löschen</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.titleMain}>{t('first.heading')}</Text>
                <Text style={styles.subtitleMain}>{t('first.subtitle')}</Text>
              </View>

              {/* Aktionsleiste: Musterdaten */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.sampleDataBtn}
                  onPress={handleFillSampleData}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="auto-fix-high" size={18} color="#60A5FA" />
                  <Text style={styles.sampleDataBtnText}>{t('first.insertSampleData')}</Text>
                </TouchableOpacity>
              </View>

              {/* Formular-Karte */}
              <View style={styles.formCard}>
                {/* 1. Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('first.labelName')}</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color="rgba(255,255,255,0.4)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={nameRef}
                      style={styles.textInput}
                      placeholder={t('first.placeholderName')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={name}
                      onChangeText={setName}
                      autoComplete="name"
                      returnKeyType="next"
                      onSubmitEditing={() => streetRef.current?.focus()}
                      autoCorrect={false}
                    />
                    {name.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setName('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 2. Straße & Hausnummer */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('first.labelStreet')}</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="home"
                      size={20}
                      color="rgba(255,255,255,0.4)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={streetRef}
                      style={styles.textInput}
                      placeholder={t('first.placeholderStreet')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={yourStreet}
                      onChangeText={handleMyStreet}
                      autoComplete="street-address"
                      textContentType="fullStreetAddress"
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
                      autoCorrect={false}
                    />
                    {yourStreet.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setYourStreet('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 3. PLZ & Wohnort */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('first.labelCity')}</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="location-city"
                      size={20}
                      color="rgba(255,255,255,0.4)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={cityRef}
                      style={styles.textInput}
                      placeholder={t('first.placeholderCity')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={yourCity}
                      onChangeText={setYourCity}
                      autoComplete="postal-address"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      autoCorrect={false}
                    />
                    {yourCity.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setYourCity('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 4. Sprache */}
                <Text style={styles.fieldLabel}>{t('first.labelLanguage')}</Text>
                <View style={styles.languageScrollWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.languageScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {items.map((item) => {
                      const isSelected = value === item.value;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.langPill,
                            isSelected && styles.langPillActive,
                          ]}
                          onPress={() => {
                            setValue(item.value);
                            i18n.changeLanguage(item.value);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.langPillText,
                              isSelected && styles.langPillTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            {/* ── Footer: Sitzt direkt über der Tastatur ── */}
            <View
              style={[
                styles.footer,
                {
                  paddingBottom: isKeyboardVisible
                    ? 8
                    : Math.max(insets.bottom, 16),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={init}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('first.saving')}</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Text style={styles.primaryButtonText}>{t('first.saveBtn')}</Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                )}
              </TouchableOpacity>

              {!isKeyboardVisible && (
                <Text style={styles.infoHintText}>{t('first.privacyNotice')}</Text>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    marginTop: 6,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  headerDeleteBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeHub: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  badgeHubText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleMain: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitleMain: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sampleDataBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  sampleDataBtnText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  fieldGroup: {
    position: 'relative',
  },
  fieldLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14.5,
    height: '100%',
  },
  languageScrollWrapper: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  languageScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  langPillActive: {
    backgroundColor: '#3B82F6',
  },
  langPillText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  langPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: colors.background || '#0F1117',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoHintText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    marginTop: 8,
  },
});

export default StartScreen;