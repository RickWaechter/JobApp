// ProfilScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useIAP } from 'expo-iap';
import { sha512 } from 'js-sha512';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';

import colors from '../../inc/colors.js';
import { decryp, encryp } from '../../inc/cryp.js';
import { runQuery } from '../../inc/db.js';
import '../../local/i18n.js';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height, width } = Dimensions.get('window');

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-1715349546414110/1930235080';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['fashion', 'clothing'],
  requestNonPersonalizedAdsOnly: true,
});

const itemsLang = [
  { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
  { label: 'English', value: 'en', flag: '🇬🇧' },
  { label: 'Türkçe', value: 'tr', flag: '🇹🇷' },
  { label: 'العربية', value: 'ar', flag: '🇸🇦' },
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'Italiano', value: 'it', flag: '🇮🇹' },
  { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
  { label: 'Polski', value: 'pl', flag: '🇵🇱' },
  { label: 'Română', value: 'ro', flag: '🇷🇴' },
  { label: 'Українська', value: 'uk', flag: '🇺🇦' },
  { label: 'Ελληνικά', value: 'el', flag: '🇬🇷' },
  { label: '日本語', value: 'ja', flag: '🇯🇵' },
];

const emailServers = [
  { label: 'mail.de (smtp.mail.de)', value: 'smtp.mail.de' },
  { label: 'web.de (smtp.web.de)', value: 'Smtp.web.de' },
  { label: 't-online.de (securesmtp.t-online.de)', value: 'Securesmtp.t-online.de' },
  { label: 'gmail.com (smtp.gmail.com)', value: 'Smtp.gmail.com' },
];

/* ── Wiederverwendbare Einstellungs-Kachel ──────────────── */
const SettingsCard = memo(({ title, description, iconName, onPress, badgeText }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.settingsCard, pressed && styles.cardPressed]}
  >
    <View style={styles.settingsIconWrap}>
      <MaterialIcons name={iconName} size={22} color="#60A5FA" />
    </View>

    <View style={styles.settingsContent}>
      <View style={styles.settingsTitleRow}>
        <Text style={styles.settingsTitle} numberOfLines={1}>
          {title}
        </Text>
        {Boolean(badgeText) && (
          <View style={styles.inlineBadge}>
            <Text style={styles.inlineBadgeText}>{badgeText}</Text>
          </View>
        )}
      </View>
      {Boolean(description) && (
        <Text style={styles.settingsDescription} numberOfLines={1}>
          {description}
        </Text>
      )}
    </View>

    <MaterialIcons
      name="chevron-right"
      size={22}
      color="rgba(255, 255, 255, 0.3)"
    />
  </Pressable>
));

/* ── Memoisiertes Eingabefeld für Modals ────────────────── */
const ModalInput = memo(({ icon, placeholder, value, onChangeText, secureTextEntry = false }) => (
  <View style={styles.inputContainer}>
    <MaterialIcons name={icon} size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
    <TextInput
      style={styles.textInputField}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      secureTextEntry={secureTextEntry}
      autoCorrect={false}
    />
    {Boolean(value?.length) && (
      <TouchableOpacity
        onPress={() => onChangeText('')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>
    )}
  </View>
));

const ProfilScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  /* ── State: Profil & Daten ───────────────────────────── */
  const [myName, setMyName] = useState('');
  const [myStreet, setMyStreet] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailServerValue, setEmailServerValue] = useState('smtp.mail.de');
  const [openServerDropdown, setOpenServerDropdown] = useState(false);

  /* ── State: Coins & Ads ──────────────────────────────── */
  const [coins, setCoins] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState(false);
  const [adLoadedState, setAdLoadedState] = useState(false);
  const adLoaded = useRef(false);

  /* ── State: Modals ───────────────────────────────────── */
  const [isModalDataVisible, setModalDataVisible] = useState(false);
  const [isModalEmailVisible, setModalEmailVisible] = useState(false);
  const [isModalLangVisible, setModalLangVisible] = useState(false);
  const [isModalPayVisible, setModalPayVisible] = useState(false);

  /* ── In-App Purchases (IAP) ──────────────────────────── */
  const { requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setCoins((prev) => (Number(prev) || 0) + 40);
      setLoaded(false);
      const isValid = await putCoinsIAP(purchase.productId);
      if (isValid) {
        await finishTransaction({ purchase, isConsumable: true });
      }
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      Alert.alert(t('profil.error'), t('profil.buyCancel'));
      setLoaded(false);
    },
  });

  const putCoinsIAP = async (productId) => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = sha512(deviceId);
      await axios.post('https://api.jobapp2.de/putCoinsIAP', {
        username: key,
        productId: productId,
      });
      return true;
    } catch (error) {
      console.error('Fehler beim Übermitteln des IAP:', error);
      return false;
    }
  };

  const handlePurchase = async (productId) => {
    setLoaded(true);
    try {
      await requestPurchase({
        request: {
          ios: { sku: productId },
        },
      });
    } catch (error) {
      console.error('Purchase request failed:', error);
      setLoaded(false);
    }
  };

  /* ── Rewarded Ads ────────────────────────────────────── */
  useEffect(() => {
    const putCoins = async (amount) => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const key = sha512(deviceId);
        await axios.post('https://api.jobapp2.de/putCoins', {
          username: key,
          coins: amount,
        });
        setCoins((prev) => (Number(prev) || 0) + amount);
      } catch (error) {
        console.error('Fehler beim Gutschreiben der Coins:', error);
      }
    };

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      adLoaded.current = true;
      if (adLoadedState) {
        rewarded.show();
        setAdLoadedState(false);
        adLoaded.current = false;
      }
    });

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        putCoins(4);
        setLoaded(false);
      }
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, [source, adLoadedState]);

  const showRewarded = () => {
    setLoaded(true);
    if (!adLoaded.current) {
      setSource(!source);
      rewarded.load();
      setAdLoadedState(true);
      return;
    }
    rewarded.show();
    adLoaded.current = false;
  };

  /* ── Coins Laden ─────────────────────────────────────── */
  const fetchCoins = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const key = sha512(deviceId);
      const response = await axios.post('https://api.jobapp2.de/getCoins', { key });
      setCoins(response.data?.response ?? 0);
    } catch (error) {
      console.error('Fehler beim Abrufen der Coins:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCoins();
    }, [])
  );

  /* ── Daten initial aus DB / Storage synchronisieren ──── */
  const loadLocalData = async () => {
    try {
      const key = await EncryptedStorage.getItem('key');
      if (!key) return;

      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({
        name: 'firstNew.db',
        location: 'default',
      });

      const result = await runQuery(
        db,
        'SELECT * FROM files WHERE ident = ?',
        [deviceId]
      ).catch(() => null);

      if (result?.rows?.length > 0) {
        const row = result.rows.raw()[0];

        const safeDecrypt = async (val) => {
          if (!val) return null;
          try {
            return await decryp(val, key);
          } catch {
            return null;
          }
        };

        const decName = await safeDecrypt(row.name);
        const decStreet = await safeDecrypt(row.street);
        const decCity = await safeDecrypt(row.city);
        const decEmail = await safeDecrypt(row.email);
        const decPassword = await safeDecrypt(row.emailPassword);
        const decServer = await safeDecrypt(row.emailServer);

        if (decName) setMyName(decName);
        if (decStreet) setMyStreet(decStreet);
        if (decCity) setMyCity(decCity);
        if (decEmail) setEmail(decEmail);
        if (decPassword) setPassword(decPassword);
        if (decServer) setEmailServerValue(decServer);
      } else {
        const [n, s, c, em, pw, srv] = await Promise.all([
          EncryptedStorage.getItem('name'),
          EncryptedStorage.getItem('street'),
          EncryptedStorage.getItem('city'),
          EncryptedStorage.getItem('email'),
          EncryptedStorage.getItem('emailPassword'),
          EncryptedStorage.getItem('emailServer'),
        ]);

        if (n) setMyName(n);
        if (s) setMyStreet(s);
        if (c) setMyCity(c);
        if (em) setEmail(em);
        if (pw) setPassword(pw);
        if (srv) setEmailServerValue(srv);
      }
    } catch (err) {
      console.error('Fehler beim Laden lokaler Daten:', err);
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  /* ── Speichern: Persönliche Daten ────────────────────── */
  const handleSavePersonalData = async () => {
    try {
      if (!myName?.trim() || !myCity?.trim() || !myStreet?.trim()) {
        Alert.alert(t('profil.error'), t('profil.errorDataEmail'));
        return;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');

      const trimmedName = myName.trim();
      const trimmedStreet = myStreet.trim();
      const trimmedCity = myCity.trim();

      await EncryptedStorage.setItem('name', trimmedName);
      await EncryptedStorage.setItem('street', trimmedStreet);
      await EncryptedStorage.setItem('city', trimmedCity);

      const encName = await encryp(trimmedName, key);
      const encCity = await encryp(trimmedCity, key);
      const encStreet = await encryp(trimmedStreet, key);

      const db = await SQLite.openDatabase({
        name: 'firstNew.db',
        location: 'default',
      });
      await db.executeSql(
        'UPDATE files SET name = ?, city = ?, street = ? WHERE ident = ?',
        [encName, encCity, encStreet, deviceId]
      );

      Alert.alert(t('profil.title'), t('profil.infoData'), [
        { text: 'OK', onPress: () => setModalDataVisible(false) },
      ]);
    } catch (error) {
      console.error('Fehler beim Speichern der Stammdaten:', error);
      Alert.alert(t('profil.error'), 'Fehler beim Speichern');
    }
  };

  /* ── Speichern: E-Mail Konfiguration ─────────────────── */
  const handleSaveEmailConfig = async () => {
    try {
      if (!emailServerValue || !email?.trim() || !password?.trim()) {
        Alert.alert(t('profil.error'), t('profil.errorDataEmail'));
        return;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');

      const trimmedEmail = email.trim();
      const trimmedPw = password.trim();

      await EncryptedStorage.setItem('email', trimmedEmail);
      await EncryptedStorage.setItem('emailPassword', trimmedPw);
      await EncryptedStorage.setItem('emailServer', emailServerValue);

      const encEmail = await encryp(trimmedEmail, key);
      const encPw = await encryp(trimmedPw, key);
      const encServer = await encryp(emailServerValue, key);

      const db = await SQLite.openDatabase({
        name: 'firstNew.db',
        location: 'default',
      });
      await db.executeSql(
        'UPDATE files SET email = ?, emailPassword = ?, emailServer = ? WHERE ident = ?',
        [encEmail, encPw, encServer, deviceId]
      );

      Alert.alert(t('profil.title'), t('profil.infoEmail'), [
        { text: 'OK', onPress: () => setModalEmailVisible(false) },
      ]);
    } catch (error) {
      console.error('Fehler beim Speichern der Maildaten:', error);
      Alert.alert(t('profil.error'), 'Fehler beim Speichern');
    }
  };

  /* ── Speichern: Sprache ──────────────────────────────── */
  const handleChangeLanguage = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode);
      await EncryptedStorage.setItem('lang', langCode);
      setModalLangVisible(false);
    } catch (err) {
      console.error('Sprachwechsel fehlgeschlagen:', err);
    }
  };

  const currentLangObj = itemsLang.find((l) => l.value === i18n.language) || itemsLang[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profil-Header Card ── */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatarWrap}>
              <MaterialIcons name="person" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.nameWrap}>
              <Text style={styles.greetingLabel}>Willkommen zurück</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {myName ? myName : 'Mein Profil'}
              </Text>
            </View>
          </View>

          {/* Interaktives Coin-Badge */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalPayVisible(true)}
            style={styles.coinBadge}
          >
            <View style={styles.coinIconCircle}>
              <MaterialIcons name="monetization-on" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.coinText}>
              {coins !== null ? `${coins} Coins` : '… Coins'}
            </Text>
            <View style={styles.coinAddBtn}>
              <MaterialIcons name="add" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Settings Liste ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>EINSTELLUNGEN & DATEN</Text>

          <View style={styles.cardGroup}>
            <SettingsCard
              iconName="badge"
              title={t('personalData') || 'Persönliche Daten'}
              description={myName ? `${myStreet}, ${myCity}` : (t('personalDataDescription') || 'Adresse & Name hinterlegen')}
              onPress={() => {
                loadLocalData();
                setModalDataVisible(true);
              }}
            />

            <View style={styles.divider} />

            <SettingsCard
              iconName="alternate-email"
              title={t('configureEmail') || 'E-Mail Server'}
              description={email ? email : (t('configureEmailDescription') || 'SMTP-Daten für direkten Versand')}
              onPress={() => {
                loadLocalData();
                setModalEmailVisible(true);
              }}
            />

            <View style={styles.divider} />

            <SettingsCard
              iconName="translate"
              title={t('settings.languageChange') || 'Sprache'}
              description={currentLangObj?.label || 'Deutsch'}
              badgeText={`${currentLangObj?.flag || '🇩🇪'} ${currentLangObj?.value?.toUpperCase()}`}
              onPress={() => setModalLangVisible(true)}
            />
          </View>
        </View>

        {/* ── Coin Shop Banner ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>GUTHABEN AUFLADEN</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setModalPayVisible(true)}
            style={styles.shopBanner}
          >
            <View style={styles.shopBannerGlow} />
            <View style={styles.shopBannerContent}>
              <View style={styles.shopIconContainer}>
                <MaterialIcons name="stars" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.shopBannerTitle}>Coins verwalten</Text>
                <Text style={styles.shopBannerSubtitle}>
                  Erhalte neue Coins per Video oder Sofort-Aufladung
                </Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={14} color="rgba(255,255,255,0.4)" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Persönliche Daten
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalDataVisible}
   animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={260}
        animationOutTiming={400}
        backdropTransitionInTiming={260}
        backdropTransitionOutTiming={400}
        backdropOpacity={0.75}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        onBackdropPress={() => setModalDataVisible(false)}
        onBackButtonPress={() => setModalDataVisible(false)}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('personalData') || 'Persönliche Daten'}</Text>
              <Text style={styles.modalSubtitle}>Diese Daten werden im Anschreiben genutzt</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalDataVisible(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <ModalInput
              icon="person"
              placeholder={t('placeholderName') || 'Vollständiger Name'}
              value={myName}
              onChangeText={setMyName}
            />
            <ModalInput
              icon="home"
              placeholder={t('placeholderStreet') || 'Straße & Hausnummer'}
              value={myStreet}
              onChangeText={setMyStreet}
            />
            <ModalInput
              icon="location-city"
              placeholder={t('placeholderZip') || 'PLZ & Stadt'}
              value={myCity}
              onChangeText={setMyCity}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSavePersonalData}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('saveAndClose') || 'Speichern'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: E-Mail Konfiguration
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalEmailVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={260}
        animationOutTiming={400}
        backdropTransitionInTiming={260}
        backdropTransitionOutTiming={400}
        backdropOpacity={0.75}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        onBackdropPress={() => setModalEmailVisible(false)}
        onBackButtonPress={() => setModalEmailVisible(false)}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('configureEmail') || 'E-Mail Versand'}</Text>
              <Text style={styles.modalSubtitle}>Absenderdaten für automatische Bewerbungen</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalEmailVisible(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <ModalInput
              icon="mail"
              placeholder={t('placeholderEmail') || 'E-Mail Adresse'}
              value={email}
              onChangeText={setEmail}
            />

            <ModalInput
              icon="lock"
              placeholder={t('placeholderPassword') || 'App-Passwort / Kennwort'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />

            <View style={{ zIndex: 3000, marginTop: 4 }}>
              <DropDownPicker
                open={openServerDropdown}
                value={emailServerValue}
                items={emailServers}
                setOpen={setOpenServerDropdown}
                setValue={setEmailServerValue}
                placeholder={t('placeholderEmailServer') || 'SMTP Server auswählen'}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={{ color: '#FFFFFF', fontSize: 14 }}
                arrowIconStyle={{ tintColor: '#FFFFFF' }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={handleSaveEmailConfig}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('saveAndClose') || 'Speichern'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Sprachauswahl
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalLangVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={260}
        animationOutTiming={400}
        backdropTransitionInTiming={260}
        backdropTransitionOutTiming={400}
        backdropOpacity={0.75}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        onBackdropPress={() => setModalLangVisible(false)}
        onBackButtonPress={() => setModalLangVisible(false)}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalSheet, { maxHeight: height * 0.58 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('settings.languageChange') || 'Sprache wählen'}</Text>
              <Text style={styles.modalSubtitle}>Wähle deine bevorzugte Sprache</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalLangVisible(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.langList}
            showsVerticalScrollIndicator={false}
          >
            {itemsLang.map((item) => {
              const isSelected = i18n.language === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => handleChangeLanguage(item.value)}
                  style={[styles.langOption, isSelected && styles.langOptionActive]}
                  activeOpacity={0.7}
                >
                  <View style={styles.langOptionLeft}>
                    <Text style={styles.langFlag}>{item.flag}</Text>
                    <Text style={[styles.langText, isSelected && styles.langTextActive]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: Coins Shop & Video Belohnung
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalPayVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={260}
        animationOutTiming={400}
        backdropTransitionInTiming={260}
        backdropTransitionOutTiming={400}
        backdropOpacity={0.75}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        onBackdropPress={() => setModalPayVisible(false)}
        onBackButtonPress={() => setModalPayVisible(false)}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Coins aufladen</Text>
              <Text style={styles.modalSubtitle}>Nutze Coins für das Erstellen von Bewerbungen</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalPayVisible(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 12, marginVertical: 14 }}>
            {/* Option 1: In-App Purchase */}
            <TouchableOpacity
              onPress={() => handlePurchase('JA2C0002')}
              disabled={loaded}
              activeOpacity={0.8}
              style={styles.payOptionCard}
            >
              <View style={styles.payOptionIconWrap}>
                <MaterialIcons name="shopping-bag" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.payOptionTitle}>+40 Coins Paket</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueBadgeText}>BELIEBT</Text>
                  </View>
                </View>
                <Text style={styles.payOptionDesc}>Sofortige Freischaltung ohne Werbung</Text>
              </View>
              {loaded ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />
              )}
            </TouchableOpacity>

            {/* Option 2: Rewarded Video */}
            <TouchableOpacity
              onPress={showRewarded}
              disabled={loaded}
              activeOpacity={0.8}
              style={styles.adOptionCard}
            >
              <View style={styles.adOptionIconWrap}>
                <MaterialIcons name="play-circle-filled" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.payOptionTitle}>+4 Coins gratis</Text>
                <Text style={styles.payOptionDesc}>Kurzes Werbevideo ansehen</Text>
              </View>
              {loaded ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.4)" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* ── Profile Header Card ── */
  profileHeaderCard: {
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameWrap: {
    flex: 1,
  },
  greetingLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 6,
  },
  coinIconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
  },
  coinAddBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Sections & Cards ── */
  sectionWrap: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  cardGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsContent: {
    flex: 1,
    paddingRight: 8,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  inlineBadgeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsDescription: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 68,
  },

  /* ── Shop Banner ── */
  shopBanner: {
    position: 'relative',
    backgroundColor: '#151923',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    overflow: 'hidden',
  },
  shopBannerGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  shopBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  shopBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },

  /* ── Modals General (Symmetrisch & Flackerfrei) ── */
  modalBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    paddingHorizontal: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.background || '#121620',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalBody: {
    gap: 12,
    marginVertical: 14,
  },

  /* ── Inputs ── */
  inputContainer: {
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
    marginRight: 10,
  },
  textInputField: {
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
  dropdownContainer: {
    backgroundColor: '#1A1E29',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
  },

  /* ── Buttons ── */
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* ── Language List ── */
  langList: {
    marginTop: 12,
    marginBottom: 4,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  langOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 20,
  },
  langText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  langTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* ── Coin Shop Cards ── */
  payOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  payOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestValueBadge: {
    backgroundColor: '#3B82F6',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  bestValueBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  payOptionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  payOptionDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  adOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  adOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfilScreen;