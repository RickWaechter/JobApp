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
import {scanCv} from '../../inc/cvScan.js';
import colors from '../../inc/colors.js';
import { decryp, encryp } from '../../inc/cryp.js';
import { runQuery } from '../../inc/db.js';
import '../../local/i18n.js';
import { enc } from 'react-native-crypto-js';
import Info from '../../comp/info.js';
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
  { label: 'Español', value: 'es', flag: '🇪🇸' },
  { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
  { label: 'Polski', value: 'pl', flag: '🇵🇱' },
  { label: 'Română', value: 'ro', flag: '🇷🇴' },
  { label: 'Русский', value: 'ru', flag: '🇷🇺' },
  { label: 'Українська', value: 'uk', flag: '🇺🇦' },
  { label: 'Bosanski / Hrvatski / Srpski', value: 'bks', flag: '🇭🇷'}, 
  { label: 'فارسی / دری', value: 'fa', flag: '🇮🇷' },
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
const SettingsCard = memo(({onIconPress, title, description, iconName, onPress, badgeText }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.settingsCard, pressed && styles.cardPressed]}
  >
 <TouchableOpacity 
      activeOpacity={0.7}
      onPress={(e) => {
        // Verhindert, dass das äußere Pressable mitauslöst
        e?.stopPropagation?.();
        onIconPress?.();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
    <View style={styles.settingsIconWrap}>
      <MaterialIcons name={iconName} size={22} color="#60A5FA" />
    </View>
</TouchableOpacity>
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
const DB_MAIN_NAME = 'firstNew.db';
const [textInfo, setTextInfo] = useState('fdfdsfds');
  /* ── State: Profil & Daten ───────────────────────────── */
  const [myName, setMyName] = useState('');
  const [myStreet, setMyStreet] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailServerValue, setEmailServerValue] = useState('smtp.mail.de');
  const [openServerDropdown, setOpenServerDropdown] = useState(false);
const [infoModalVisible, setInfoModalVisible] = useState(false);
  /* ── State: Coins & Ads ──────────────────────────────── */
  const [coins, setCoins] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState(false);
  const [adLoadedState, setAdLoadedState] = useState(false);
  const adLoaded = useRef(false);
const dbMainRef = useRef(null);
  /* ── State: Modals ───────────────────────────────────── */
  const [isModalDataVisible, setModalDataVisible] = useState(false);
  const [isModalEmailVisible, setModalEmailVisible] = useState(false);
  const [isModalLangVisible, setModalLangVisible] = useState(false);
  const [isModalPayVisible, setModalPayVisible] = useState(false);
const [isModalCvVisible, setModalCvVisible] = useState(false);
const [experiences, setExperiences] = useState([
  { 
    id: '1', 
    role: 'Anwendungsentwickler', 
    company: 'Musterfirma GmbH', 
    period: '02/2024 – Heute',
    tasks: '• Entwicklung mobiler Komponenten\n• Anbindung der REST-Schnittstellen in Go',
  },
]);

const saveExperiences = async () => {
  // 1. Früher Abbruch, falls die Referenz nicht existiert
  if (!dbMainRef.current) {
    console.warn('Datenbankverbindung ist nicht bereit oder geschlossen.');
    return;
  }

  try {
    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    const string = JSON.stringify(experiences);
    const encString = await encryp(string, key);

    // Nochmalige Prüfung vor dem eigentlichen Ausführen
    if (!dbMainRef.current) return;

    await dbMainRef.current.executeSql(
      `UPDATE files SET skills = ? WHERE ident = ?`,
      [encString, deviceId]
    );

    console.log('Experiences saved successfully');
    setModalCvVisible(false);
  } catch (error) {
    console.error('Fehler beim Speichern der Erfahrungen:', error);
  }
};
const handleAddExperience = () => {
  setExperiences((prev) => [
    ...prev,
    { id: Date.now().toString(), role: '', company: '', period: '', tasks: '' },
  ]);
};

const handleUpdateExperience = (id, field, value) => {
  setExperiences((prev) =>
    prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
  );
};

const handleDeleteExperience = (id) => {
  setExperiences((prev) => prev.filter((item) => item.id !== id));
};

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
useEffect(() => {
  const initDB = async () => {
    try {
      dbMainRef.current = await SQLite.openDatabase({ 
        name: DB_MAIN_NAME, 
        location: 'default' 
      });
      console.log('Datenbank erfolgreich geöffnet');
    } catch (error) {
      console.error('Fehler beim Öffnen der DB:', error);
    }
  };

  initDB(); // <-- Funktion MUSS aufgerufen werden!
}, []); // Leeres Array, damit es einmal beim Laden ausgeführt wird
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
useEffect(() => {
  let isMounted = true;

  const loadFileData = async () => {
    // Sicherstellen, dass DB-Referenz und deviceId existieren
    const key = await EncryptedStorage.getItem('key');
    const deviceId = await DeviceInfo.getUniqueId();
    if (!dbMainRef.current || !deviceId) return;

    try {
      // executeSql liefert ein Array mit [results] zurück
      const [results] = await dbMainRef.current.executeSql(
        'SELECT skills FROM files WHERE ident = ?',
        [deviceId]
      );

      // In react-native-sqlite-storage: results.rows.raw() liefert das echte JS-Array
      const data = results?.rows?.raw() || [];

      if (isMounted) {
        console.log('Geladene Daten:', data);
        const decSkills = await decryp(data[0]?.skills, key);
        console.log('Entschlüsselte Daten:', decSkills);
        const jsonSkills = JSON.parse(decSkills);
        setExperiences(jsonSkills);
        // setMyDataState(data);
      }
    } catch (err) {
      console.error('SQL Fehler:', err);
    }
  };

  loadFileData();

  return () => {
    isMounted = false; // Verhindert State-Updates nach Unmount
  };
}, [dbMainRef.current]); // Feuert nur, wenn deviceId oder DB bereit sind
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
useEffect(() => {
  console.log("experience",experiences);

}, [experiences])
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

 const handleScan = async () => {
  try {
    const text = await scanCv();
    console.log('Scanned text:', text);

    const workExperience = text?.work_experience || [];

    // Map all experiences into a single list of objects
    const newExperiences = workExperience
      .filter((exp) => exp.company)
      .map((exp) => ({
         id: `${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
        company: exp.company,
        role: exp.position,
        period: exp.period,
        // If tasks is an array of strings, join them; otherwise keep as-is or fallback to empty string
        tasks: Array.isArray(exp.tasks) ? exp.tasks.join('\n') : (exp.tasks || ''),
      }));

    // Perform a single state update
    setExperiences((prev) => [...prev, ...newExperiences]);
  } catch (error) {
    console.error('Failed to scan CV:', error);
  }
};
  const currentLangObj = itemsLang.find((l) => l.value === i18n.language) || itemsLang[0];
const handleInfo = (val) => {
  switch (val) {
    case 'lang':
     setInfoModalVisible(true);
     setTextInfo(t("info.language"));
      break;
    case 'email':
      setInfoModalVisible(true);
      setTextInfo(t("info.email"));
      break;
      case 'personal':
      setInfoModalVisible(true);
      setTextInfo(t("info.personal"));
      break;
      case'experience':
      setInfoModalVisible(true);
      setTextInfo(t("info.experience"));
      break;
      case 'coins':
      setInfoModalVisible(true);
      setTextInfo(t("info.coins"));
      break;
    default:
      break;
  }
}
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
              <Text style={styles.greetingLabel}>{t('profil.welcomeBack')}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {myName ? myName : t('profil.defaultProfileName')}
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
              {coins !== null 
                ? t('profil.coinsCount', { count: coins }) 
                : t('profil.coinsCountLoading')}
            </Text>
            <View style={styles.coinAddBtn}>
              <MaterialIcons name="add" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Settings Liste ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('profil.sectionSettings')}</Text>

          <View style={styles.cardGroup}>
            <SettingsCard
              onIconPress={() => handleInfo('personal')}
              iconName="badge"
              title={t('personalData')}
              description={myName ? `${myStreet}, ${myCity}` : t('profil.defaultAddressDesc')}
              onPress={() => {
                loadLocalData();
                setModalDataVisible(true);
              }}
            />

            <View style={styles.divider} />

            <SettingsCard
              onIconPress={() => handleInfo('email')}
              iconName="alternate-email"
              title={t('configureEmail')}
              description={email ? email : t('profil.defaultEmailDesc')}
              onPress={() => {
                loadLocalData();
                setModalEmailVisible(true);
              }}
            />

            <View style={styles.divider} />

            <SettingsCard
              onIconPress={() => handleInfo('lang')}
              iconName="translate"
              title={t('settings.languageChange')}
              description={currentLangObj?.label || 'Deutsch'}
              badgeText={`${currentLangObj?.flag || '🇩🇪'} ${currentLangObj?.value?.toUpperCase()}`}
              onPress={() => setModalLangVisible(true)}
            />

            <View style={styles.divider} />

            <SettingsCard
              onIconPress={() => handleInfo('experience')}
              iconName="work-outline"
              title={t('profil.experienceTitle')}
              description={t('profil.experienceDesc', { count: experiences.length })}
              onPress={() => setModalCvVisible(true)}
            />
          </View>
        </View>

        {/* ── Coin Shop Banner ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('profil.sectionTopUp')}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setModalPayVisible(true)}
            style={styles.shopBanner}
          >
            <View style={styles.shopBannerGlow} />
            <View style={styles.shopBannerContent}>
              <View style={styles.shopIconContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleInfo('coins')}
                >
                  <MaterialIcons name="stars" size={24} color="#F59E0B" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.shopBannerTitle}>{t('profil.coinsVerwalten')}</Text>
                <Text style={styles.shopBannerSubtitle}>
                  {t('profil.coinsText')}
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
              <Text style={styles.modalTitle}>{t('personalData')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalDataSubtitle')}</Text>
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
              placeholder={t('placeholderName')}
              value={myName}
              onChangeText={setMyName}
            />
            <ModalInput
              icon="home"
              placeholder={t('placeholderStreet')}
              value={myStreet}
              onChangeText={setMyStreet}
            />
            <ModalInput
              icon="location-city"
              placeholder={t('placeholderZip')}
              value={myCity}
              onChangeText={setMyCity}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSavePersonalData}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('saveAndClose')}</Text>
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
              <Text style={styles.modalTitle}>{t('profil.modalEmailTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalEmailSubtitle')}</Text>
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
              placeholder={t('placeholderEmail')}
              value={email}
              onChangeText={setEmail}
            />

            <ModalInput
              icon="lock"
              placeholder={t('placeholderPassword')}
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
                placeholder={t('placeholderEmailServer')}
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
            <Text style={styles.primaryButtonText}>{t('saveAndClose')}</Text>
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
              <Text style={styles.modalTitle}>{t('profil.modalLangTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalLangSubtitle')}</Text>
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
              <Text style={styles.modalTitle}>{t('profil.modalCoinsTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalCoinsSubtitle')}</Text>
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
                  <Text style={styles.payOptionTitle}>{t('profil.packTitle')}</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueBadgeText}>{t('profil.packBadge')}</Text>
                  </View>
                </View>
                <Text style={styles.payOptionDesc}>{t('profil.packDesc')}</Text>
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
                <Text style={styles.payOptionTitle}>{t('profil.adTitle')}</Text>
                <Text style={styles.payOptionDesc}>{t('profil.adDesc')}</Text>
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

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 5: Werdegang & CV Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalCvVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={260}
        animationOutTiming={300}
        backdropTransitionInTiming={260}
        backdropTransitionOutTiming={300}
        backdropOpacity={0.75}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        onBackdropPress={() => setModalCvVisible(false)}
        onBackButtonPress={() => setModalCvVisible(false)}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          {/* ── 1. FEST: Header ── */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('profil.cvModalTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.cvModalSubtitle')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalCvVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ── 2. FEST: OCR Scan Button ── */}
          <TouchableOpacity
            onPress={handleScan}
            activeOpacity={0.82}
            style={styles.scanActionCard}
          >
            <View style={styles.scanIconWrap}>
              <MaterialIcons name="document-scanner" size={22} color="#60A5FA" />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.scanCardTitle}>{t('profil.scanTitle')}</Text>
                <View style={styles.badgeAi}>
                  <Text style={styles.badgeAiText}>{t('profil.scanBadge')}</Text>
                </View>
              </View>
              <Text style={styles.scanCardDesc}>
                {t('profil.scanDesc')}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />
          </TouchableOpacity>

          {/* ── 3. FEST: Sektions-Leiste ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {t('profil.sectionExperience', { count: experiences.length })}
            </Text>
            <TouchableOpacity
              onPress={handleAddExperience}
              style={styles.addBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={16} color="#60A5FA" />
              <Text style={styles.addBtnText}>{t('profil.btnAdd')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── 4. SCROLLBAR: Nur dieser Container scrollt ── */}
          <ScrollView
            style={styles.experienceScrollArea}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {experiences.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="work-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>
                  {t('profil.emptyExperience')}
                </Text>
              </View>
            ) : (
              experiences.map((exp, index) => (
                <View key={exp.id || index} style={styles.experienceCard}>
                  <View style={styles.expCardHeader}>
                    <View style={styles.expBadge}>
                      <Text style={styles.expBadgeText}>
                        {t('profil.stationBadge', { index: index + 1 })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteExperience(exp.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="delete-outline" size={19} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Position */}
                  <Text style={styles.inputLabel}>{t('profil.labelRole')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={exp.role}
                    onChangeText={(val) => handleUpdateExperience(exp.id, 'role', val)}
                    placeholder={t('profil.placeholderRole')}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />

                  {/* Firma & Zeitraum */}
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.inputLabel}>{t('profil.labelCompany')}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.company}
                        onChangeText={(val) => handleUpdateExperience(exp.id, 'company', val)}
                        placeholder={t('profil.placeholderCompany')}
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>{t('profil.labelPeriod')}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.period}
                        onChangeText={(val) => handleUpdateExperience(exp.id, 'period', val)}
                        placeholder={t('profil.placeholderPeriod')}
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>
                  </View>

                  {/* Aufgaben & Stichpunkte */}
                  <Text style={styles.inputLabel}>{t('profil.labelTasks')}</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={exp.tasks}
                    onChangeText={(val) => handleUpdateExperience(exp.id, 'tasks', val)}
                    placeholder={t('profil.placeholderTasks')}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    multiline={true}
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                </View>
              ))
            )}
          </ScrollView>

          {/* ── 5. FEST: Footer Button ── */}
          <TouchableOpacity
            style={styles.saveModalBtn}
            onPress={() => saveExperiences()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveModalBtnText}>{t('saveAndClose')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Info message={textInfo} visible={infoModalVisible} onClose={() => setInfoModalVisible(false)} />
    </SafeAreaView>
  );
}
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
modalScrollArea: {
  marginBottom: 12,
},
scanActionCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(59, 130, 246, 0.08)',
  borderWidth: 1,
  borderColor: 'rgba(59, 130, 246, 0.3)',
  borderRadius: 16,
  padding: 14,
  marginBottom: 18,
},
scanIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  justifyContent: 'center',
  alignItems: 'center',
},
scanCardTitle: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
},
experienceScrollArea: {
  maxHeight: height * 0.4,
},
badgeAi: {
  backgroundColor: '#3B82F6',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 6,
},
badgeAiText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '800',
},
scanCardDesc: {
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: 12,
  marginTop: 2,
},
sectionHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
  marginTop: 4,
},
sectionTitle: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
},
addBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingVertical: 4,
  paddingHorizontal: 8,
  backgroundColor: 'rgba(59, 130, 246, 0.12)',
  borderRadius: 8,
},
addBtnText: {
  color: '#60A5FA',
  fontSize: 12,
  fontWeight: '600',
},
experienceCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.07)',
  borderRadius: 14,
  padding: 12,
  marginBottom: 10,
},
expCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
expBadge: {
  backgroundColor: 'rgba(255, 255, 255, 0.07)',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
},
expBadgeText: {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: 11,
  fontWeight: '600',
},
inputLabel: {
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: 11,
  marginBottom: 4,
  marginTop: 4,
},
textInput: {
  backgroundColor: '#12151D',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.09)',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  color: '#FFFFFF',
  fontSize: 13,
},
inputRow: {
  flexDirection: 'row',
  gap: 8,
},
emptyContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 28,
  paddingHorizontal: 20,
},
emptyText: {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: 13,
  textAlign: 'center',
  marginTop: 10,
  lineHeight: 18,
},
saveModalBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#3B82F6',
  borderRadius: 14,
  height: 46,
  marginTop: 8,
},
saveModalBtnText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
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