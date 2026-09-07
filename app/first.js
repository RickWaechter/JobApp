// StartScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import * as Keychain from 'react-native-keychain';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sha256 } from 'react-native-sha256';
import SQLite from 'react-native-sqlite-storage';

import colors from '../inc/colors.js';
import { encryp } from '../inc/cryp.js';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const { width } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

const StartScreen = () => {
  const { t, i18n } = useTranslation();

  /* ── States ──────────────────────────────────────────── */
  const [name, setName] = useState('');
  const [yourStreet, setYourStreet] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [value, setValue] = useState('de');
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ── Refs ────────────────────────────────────────────── */
  const nameRef = useRef(null);
  const streetRef = useRef(null);
  const cityRef = useRef(null);

  const items = [
    { label: 'Deutsch', value: 'de' },
    { label: 'English', value: 'en' },
    { label: 'Türkçe', value: 'tr' },
    { label: 'Français', value: 'fr' },
    { label: 'Italiano', value: 'it' },
    { label: 'Polski', value: 'pl' },
    { label: 'Nederlands', value: 'nl' },
    { label: 'Română', value: 'ru' },
    { label: 'Українська', value: 'ua' },
    { label: 'العربية', value: 'ar' },
    { label: 'Ελληνικά', value: 'gr' },
    { label: '日本語', value: 'jp' },
  ];

  /* ── Jobs-DB Download im Hintergrund ─────────────────── */
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        const DB_DIR = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;
        const dest = `${DB_DIR}/jobs.db`;

        const folderExists = await RNFS.exists(DB_DIR);
        if (!folderExists) {
          await RNFS.mkdir(DB_DIR);
        }

        const dbExists = await RNFS.exists(dest);
        if (!dbExists) {
          const getUrl = `https://api.jobapp2.de/get-secure-link/jobs.db`;
          const response = await fetch(getUrl);
          const data = await response.json();
          if (data?.url) {
            const secureUrl = data.url.replace('http://', 'https://');
            await RNFS.downloadFile({
              fromUrl: secureUrl,
              toFile: dest,
            }).promise;
          }
        }
      } catch (e) {
        console.warn('Jobs DB download error:', e);
      }
    };

    setupDatabase();
  }, []);

  /* ── Musterdaten einfügen ────────────────────────────── */
  const handleFillSampleData = () => {
    setName('Max Mustermann');
    setYourStreet('Musterstraße 12');
    setYourCity('10115 Berlin');
    setValue('de');
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
  const init = async () => {
    if (!name.trim() || !yourStreet.trim() || !yourCity.trim()) {
      Alert.alert(
        t('first.error') || 'Angaben unvollständig',
        'Bitte fülle deinen Namen, deine Straße und deinen Wohnort aus.'
      );
      return;
    }

    setIsSaving(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

      // Tabelle erstellen, falls noch nicht vorhanden
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

      // Basis-Eintrag für dieses Gerät sicherstellen
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
      setIsSaving(false);
      console.error('Error opening/creating database:', err);
      Alert.alert('Fehler', 'Datenbank konnte nicht initialisiert werden.');
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

      // Keychain Schlüssel generieren
      const password = await sha256(deviceId);
      await Keychain.setGenericPassword(deviceId, password);

      const credentials = await Keychain.getGenericPassword();
      const myKey = credentials.password;
      await EncryptedStorage.setItem('key', myKey);

      // Verschlüsselt in SQLite speichern
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
      Alert.alert('Fehler', 'Daten konnten nicht sicher verschlüsselt werden.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <View style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.badgeHub}>
                <View style={styles.statusDot} />
                <Text style={styles.badgeHubText}>ERSTEINRICHTUNG</Text>
              </View>
              <Text style={styles.titleMain}>
                {t('first.heading') || 'Profil einrichten'}
              </Text>
              <Text style={styles.subtitleMain}>
                Trage deine Kontaktdaten ein, damit Anschreiben und Dokumente automatisch personalisiert werden.
              </Text>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Button für Musterdaten ── */}
              <TouchableOpacity
                style={styles.sampleDataBtn}
                onPress={handleFillSampleData}
                activeOpacity={0.75}
              >
                <MaterialIcons name="auto-fix-high" size={18} color="#60A5FA" />
                <Text style={styles.sampleDataBtnText}>Musterdaten einfügen</Text>
              </TouchableOpacity>

              {/* ── Eingabekarte ── */}
              <View style={styles.formCard}>
                {/* 1. Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>VOLLSTÄNDIGER NAME</Text>
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
                      placeholder={t('ownName') || 'z.B. Max Mustermann'}
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
                  <Text style={styles.fieldLabel}>STRASSE & HAUSNUMMER</Text>
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
                      placeholder={t('ownStreet') || 'z.B. Musterstraße 12'}
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
                  <Text style={styles.fieldLabel}>PLZ & WOHNORT</Text>
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
                      placeholder={t('ownCity') || 'z.B. 10115 Berlin'}
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
                <View style={[styles.fieldGroup, { zIndex: 3000, marginTop: 4 }]}>
                  <Text style={styles.fieldLabel}>SPRACHE</Text>
                  <DropDownPicker
                    open={open}
                    value={value}
                    items={items}
                    setOpen={setOpen}
                    setValue={setValue}
                    placeholder={t('settings.language') || 'Sprache wählen'}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropDownContainer}
                    textStyle={{ color: '#FFFFFF', fontSize: 14 }}
                    arrowIconStyle={{ tintColor: '#FFFFFF' }}
                    dropDownDirection="BOTTOM"
                    listMode="SCROLLVIEW"
                  />
                </View>
              </View>

              <Text style={styles.infoHintText}>
                {t('first.theDrop') || 'Deine Daten werden ausschließlich lokal und sicher verschlüsselt auf diesem Gerät gespeichert.'}
              </Text>
            </ScrollView>

            {/* ── Primary CTA Button ── */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={init}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Wird gespeichert...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Text style={styles.primaryButtonText}>
                      {t('save') || 'Profil speichern & weiter'}
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    justifyContent: 'space-between',
  },

  /* ── Header ── */
  header: {
    marginBottom: 12,
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
    marginBottom: 6,
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

  /* ── Scroll Area & Form Card ── */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 6,
    gap: 12,
  },
  sampleDataBtn: {
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
  dropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 48,
  },
  dropDownContainer: {
    backgroundColor: '#1E2433',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
  },
  infoHintText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    marginTop: 4,
  },

  /* ── Footer Button ── */
  footer: {
    marginTop: 8,
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
});

export default StartScreen;