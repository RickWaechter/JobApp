// ProfilScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useIAP } from 'expo-iap';
import { sha512 } from 'js-sha512';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Animated,
  Easing,
  Pressable,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  Keyboard,
  View,
  LayoutAnimation, // <-- HIER HINZUFÜGEN
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DocPicker, {EMAIL_SERVERS_SHORT} from '../../comp/documentPicker.js';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import { scanCv } from '../../inc/cvScan.js';
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

/* ══════════════════════════════════════════════════════════
   EINE Geometrie-Quelle für Menü + alle "exact"-Modals
   (Modal 1 Persönliche Daten, Modal 2 E-Mail, Modal 3 Sprache)
   SCREEN_PADDING_H muss zu styles.scrollContent.paddingHorizontal passen
   CONTENT_TOP_PAD  muss zu styles.scrollContent.paddingTop passen
   (nur Fallback-Werte, echte Werte kommen aus measureInWindow)
══════════════════════════════════════════════════════════ */
const SCREEN_PADDING_H = 20;
const CONTENT_TOP_PAD = 16;
const CONTENT_W = width - SCREEN_PADDING_H * 2;
const MENU_OUT_X = -width; // Menü komplett aus dem Screen
const MENU_ANIM_MS = 380;  // gemeinsame Dauer für Menü + Modal
const APP_BG = colors.background || '#0F1117';
const MENU_SURFACE = '#16181E'; // = APP_BG + 3 % Weiß

/* Menü-Rahmen (cardGroup) – für identische Optik im Modal */
const MENU_BORDER = 'rgba(255, 255, 255, 0.08)';

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
  { label: 'Ελληνικά', value: 'el', flag: '🇬🇷' },
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
  { label: 'Bosanski / Hrvatski / Srpski', value: 'bks', flag: '🇭🇷' },
  { label: 'فارسی / دری', value: 'fa', flag: '🇮🇷' },
  { label: '日本語', value: 'jp', flag: '🇯🇵' },
];

/* ── Wiederverwendbare Einstellungs-Kachel ──────────────── */
const SettingsCard = memo(({ onIconPress, title, description, iconName, onPress, badgeText }) => (
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

    <MaterialIcons name="chevron-right" size={22} color="rgba(255, 255, 255, 0.3)" />
  </Pressable>
));

/* ── Memoisiertes Eingabefeld für Modals ────────────────── */
/* ── Basis-Eingabefeld (optional mit Suffix rechts) ─────── */
const ModalInput = memo(
  ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    suffix = null,
    containerStyle,
  }) => (
    <View style={[styles.inputShell, containerStyle]}>
      <MaterialIcons
        name={icon}
        size={20}
        color="rgba(255,255,255,0.4)"
        style={styles.inputIcon}
      />

      <TextInput
        style={styles.textInputField}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.35)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCapitalize="none"
        smartInsertDelete={false}
      />


      {suffix ? (
        <>
          <View style={styles.inputSuffixDivider} />
          <View style={styles.inputSuffixSlot}>{suffix}</View>
        </>
      ) : null}

      {Boolean(value?.length) && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
        >
          <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      )}
    </View>
  )
);
const ModalInputEmail = memo(({ icon, placeholder, value, onChangeText, secureTextEntry = false }) => (
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
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCapitalize="none"
        smartInsertDelete={false}

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
  const [isScanningCv, setIsScanningCv] = useState(false); // <-- NEU: Zeigt Lade-Status im Modal & Menü
  const pollTimerRef = useRef(null);                       // <-- NEU: Hält den Polling-Intervall-Timer

  
  /* ── State: Profil & Daten ───────────────────────────── */
  const [myName, setMyName] = useState('');
  const [myStreet, setMyStreet] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailServerValue, setEmailServerValue] = useState('smtp.mail.de');
  const [openServerDropdown, setOpenServerDropdown] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [emailText, setEmailText] = useState('');
  /* ── State: Coins & Ads ──────────────────────────────── */
  const [coins, setCoins] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState(false);
  const [adLoadedState, setAdLoadedState] = useState(false);
  const adLoaded = useRef(false);
  const insets = useSafeAreaInsets();
  const dbMainRef = useRef(null);
  const animationMenu = useRef(new Animated.Value(0)).current;

  /* ── State: Modals ───────────────────────────────────── */
  const [isModalDataVisible, setModalDataVisible] = useState(false);
  const [isModalEmailVisible, setModalEmailVisible] = useState(false);
  const [isModalLangVisible, setModalLangVisible] = useState(false);
  const [isModalPayVisible, setModalPayVisible] = useState(false);
  const [isSendExpanded, setIsSendExpanded] = useState(false); // <-- NEU: Zustand für Aufklappen
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
/* ── State: Eigene ID & Coins Senden ─────────────────── */
  const [myUserId, setMyUserId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [sendCoinsAmount, setSendCoinsAmount] = useState('');
  const [isSendingCoins, setIsSendingCoins] = useState(false);
const toggleSendExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSendExpanded((prev) => !prev);
  };
  // Eigene ID einmalig beim Start generieren / laden
  useEffect(() => {
    const loadMyId = async () => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const key = sha512(deviceId);
        setMyUserId(key);
      } catch (err) {
        console.error('Fehler beim Laden der ID:', err);
      }
    };
    loadMyId();
  }, []);

  // Eigene ID in die Zwischenablage kopieren
  const handleCopyId = () => {
    if (!myUserId) return;
    try {
      Clipboard.setString(myUserId);
      // Falls expo-clipboard: Clipboard.setStringAsync(myUserId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
    }
  };

  // Coins an anderen Nutzer übermitteln
  const handleSendCoins = async () => {
    Keyboard.dismiss();
    const cleanReceiver = receiverId.trim();
    const amountNum = parseInt(sendCoinsAmount, 10);

    if (!cleanReceiver) {
      Alert.alert(t('profil.error') || 'Fehler', 'Bitte gib die Empfänger-ID ein.');
      return;
    }

    if (cleanReceiver === myUserId) {
      Alert.alert(t('profil.error') || 'Fehler', 'Du kannst dir nicht selbst Coins senden.');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(t('profil.error') || 'Fehler', 'Bitte gib eine gültige Anzahl an Coins ein.');
      return;
    }

    const currentCoins = Number(coins) || 0;
    if (amountNum > currentCoins) {
      Alert.alert(t('profil.error') || 'Fehler', `Du hast nur ${currentCoins} Coins zur Verfügung.`);
      return;
    }

    setIsSendingCoins(true);
    try {
      // Go-Backend Endpoint anpassen falls nötig (z.B. /sendCoins oder /transferCoins)
      const res = await axios.post('https://api.jobapp2.de/sendCoins', {
        senderKey: myUserId,
        receiverKey: cleanReceiver,
        coins: amountNum,
      });

      if (res.data?.success || res.status === 200) {
        setCoins((prev) => Math.max(0, (Number(prev) || 0) - amountNum));
        setReceiverId('');
        setSendCoinsAmount('');
        Alert.alert(t('profil.title') || 'Erfolg', `${amountNum} Coins wurden erfolgreich übertragen.`);
      } else {
        Alert.alert(t('profil.error') || 'Fehler', res.data?.message || 'Übertragung fehlgeschlagen.');
      }
    } catch (err) {
      console.error('Fehler beim Senden der Coins:', err);
      Alert.alert(
        t('profil.error') || 'Fehler',
        err?.response?.data?.error || 'Netzwerkfehler beim Übertragen der Coins.'
      );
    } finally {
      setIsSendingCoins(false);
    }
  };
  /* ══════════════════════════════════════════════════════
     Geometrie des Menüs = Geometrie der "exact"-Modals
     (1: Persönliche Daten · 2: E-Mail · 3: Sprache)
  ══════════════════════════════════════════════════════ */
  const menuRef = useRef(null);
  const [menuBox, setMenuBox] = useState({
    x: SCREEN_PADDING_H,
    y: insets.top + CONTENT_TOP_PAD,
    w: CONTENT_W,
    h: 0,
  });

  /* Menü-Rechteck in Fenster-Koordinaten messen.
     WICHTIG: nur messen, solange translateX === 0 ist. */
  const syncMenuBox = useCallback(() => {
    menuRef.current?.measureInWindow?.((x, y, w, h) => {
      if (!w || !h) return;
      setMenuBox((prev) =>
        Math.abs(prev.x - x) < 0.5 &&
        Math.abs(prev.y - y) < 0.5 &&
        Math.abs(prev.w - w) < 0.5 &&
        Math.abs(prev.h - h) < 0.5
          ? prev
          : { x, y, w, h }
      );
    });
  }, []);

  const animateMenuTo = useCallback(
    (toValue) => {
      Animated.timing(animationMenu, {
        toValue,
        duration: MENU_ANIM_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [animationMenu]
  );

  /* Generisch: Menü fährt links raus, Sheet fährt von rechts ins GLEICHE Rechteck */
  const openExactModal = useCallback(
    (setVisible) => {
      syncMenuBox();            // frische Maße, solange Menü noch bei 0 steht
      setVisible(true);
      animateMenuTo(MENU_OUT_X);
    },
    [animateMenuTo, syncMenuBox]
  );

  /* Generisch: Sheet fährt rechts raus, Menü kommt zurück */
  const closeExactModal = useCallback(
    (setVisible) => {
      Keyboard.dismiss();

      setVisible(false);
      animateMenuTo(0);
    },
    [animateMenuTo]
  );

  /* Benannte Wrapper – ALLE Schließ-Pfade müssen hierüber laufen */
  const openDataModal = useCallback(
    () => openExactModal(setModalDataVisible),
    [openExactModal]
  );
  const closeDataModal = useCallback(
    () => closeExactModal(setModalDataVisible),
    [closeExactModal]
  );

  const openEmailModal = useCallback(
    () => openExactModal(setModalEmailVisible),
    [openExactModal]
  );
  const closeEmailModal = useCallback(
    () => closeExactModal(setModalEmailVisible),
    [closeExactModal]
  );

  const openLangModal = useCallback(
    () => openExactModal(setModalLangVisible),
    [openExactModal]
  );
  const closeLangModal = useCallback(
    () => closeExactModal(setModalLangVisible),
    [closeExactModal]
  );

  /* Messen nach Mount (Layout steht) + Reset beim Verlassen */
  useEffect(() => {
    const id = setTimeout(syncMenuBox, 0);
    return () => clearTimeout(id);
  }, [syncMenuBox]);

  useFocusEffect(
    useCallback(() => {
      syncMenuBox();
      return () => {
        animationMenu.setValue(0);
      };
    }, [animationMenu, syncMenuBox])
  );

  const saveExperiences = async () => {
    if (!dbMainRef.current) {
      console.warn('Datenbankverbindung ist nicht bereit oder geschlossen.');
      return;
    }

    try {
      const key = await EncryptedStorage.getItem('key');
      const deviceId = await DeviceInfo.getUniqueId();
      const string = JSON.stringify(experiences);
      const encString = await encryp(string, key);

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

  /* ── Hilfsfunktion: Neue CV-Stationen direkt in SQLite + State sichern ── */
  const appendAndSaveExperiencesToDb = useCallback(async (workExperience) => {
    const newExperiences = (workExperience || [])
      .filter((exp) => exp.company)
      .map((exp) => ({
        id: `${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
        company: exp.company,
        role: exp.position,
        period: exp.period,
        tasks: Array.isArray(exp.tasks) ? exp.tasks.join('\n') : (exp.tasks || ''),
      }));

    if (newExperiences.length === 0) return 0;

    try {
      const key = await EncryptedStorage.getItem('key');
      const deviceId = await DeviceInfo.getUniqueId();
      const db =
        dbMainRef.current ||
        (await SQLite.openDatabase({ name: DB_MAIN_NAME, location: 'default' }));

      // Aktuellen Stand aus der DB lesen, damit nichts überschrieben wird
      let existingList = [];
      const [results] = await db.executeSql(
        'SELECT skills FROM files WHERE ident = ?',
        [deviceId]
      );
      const rows = results?.rows?.raw?.() || [];
      if (rows[0]?.skills && key) {
        try {
          const dec = await decryp(rows[0].skills, key);
          if (dec && dec.trim().length > 0) {
            existingList = JSON.parse(dec);
          }
        } catch (e) {
          console.warn('Konnte bestehende Skills nicht entschlüsseln:', e);
        }
      }

      const merged = [...existingList, ...newExperiences];
      setExperiences(merged);

      if (key && deviceId) {
        const encString = await encryp(JSON.stringify(merged), key);
        await db.executeSql(
          'UPDATE files SET skills = ? WHERE ident = ?',
          [encString, deviceId]
        );
      }
    } catch (err) {
      console.error('Fehler beim Speichern des Hintergrund-Scans in SQLite:', err);
    }

    return newExperiences.length;
  }, []);

  /* ── Pollt den Go-Endpoint /scan-cv-status?jobId=... ── */
  const pollCvStatus = useCallback(
    async (jobId) => {
      if (!jobId) return;
          const pending = await EncryptedStorage.getItem('pending_cv_job_id');

      try {
        const res = await axios.get(
          `https://api.jobapp2.de/scan-cv-status?jobId=${encodeURIComponent(jobId)}`
        );
        const { status, data, error } = res.data || {};

        if (status === 'done') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          if (pending) await EncryptedStorage.removeItem('pending_cv_job_id');
          setIsScanningCv(false);

          const addedCount = await appendAndSaveExperiencesToDb(data?.work_experience);
          Alert.alert(
            t('profil.title'),
            `Lebenslauf erfolgreich analysiert (${addedCount} Stationen hinzugefügt).`
          );
        } else if (status === 'error' || status === 'not_found') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          if (pending) await EncryptedStorage.removeItem('pending_cv_job_id');
          setIsScanningCv(false);
          Alert.alert(t('profil.error'), error || 'Scan fehlgeschlagen.');
        }
        // Bei status === 'processing' (oder 'praocessing') läuft das Intervall einfach weiter
      } catch (err) {
        // 404 vom Backend -> Job abgelaufen oder existiert nicht mehr
        if (err?.response?.status === 404) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          if (pending) await EncryptedStorage.removeItem('pending_cv_job_id');
          setIsScanningCv(false);
        }
        console.log('Warte auf Hintergrund-Scan...', err?.message);
      }
    },
    [appendAndSaveExperiencesToDb, t]
  );

  /* ── Startet oder nimmt das Polling für eine gespeicherte jobId wieder auf ── */
  const resumePollingIfNeeded = useCallback(async () => {
    const savedJobId = await EncryptedStorage.getItem('pending_cv_job_id');
    if (!savedJobId) return;

    setIsScanningCv(true);
    // Sofort einmal prüfen (wichtig wenn der User aus dem Hintergrund zurückkommt!)
    await pollCvStatus(savedJobId);

    // Falls noch nicht fertig, alle 3 Sekunden weiterfragen
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      pollCvStatus(savedJobId);
    }, 3000);
  }, [pollCvStatus]);

  /* ── AppState Listener: Prüft sofort den Status, wenn die App wieder geöffnet wird ── */
  useEffect(() => {
    resumePollingIfNeeded();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        resumePollingIfNeeded();
      }
    });

    return () => {
      sub.remove();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [resumePollingIfNeeded]);

  /* ── Neuer handleScan: Startet Upload, speichert jobId und pollt im Hintergrund ── */
  const handleScan = async () => {
    if (isScanningCv) return;

    try {
      const response = await scanCv();
      if (!response) return; // User hat DocumentPicker abgebrochen

      // Fall A: Dein neuer Go-Server liefert { status: "processing", jobId: "..." }
      if (response.jobId) {
        setIsScanningCv(true);
        await EncryptedStorage.setItem('pending_cv_job_id', response.jobId);
        await resumePollingIfNeeded();
        return;
      }

      // Fall B: Fallback, falls direkt work_experience zurückkam
      if (response.work_experience) {
        await appendAndSaveExperiencesToDb(response.work_experience);
      }
    } catch (error) {
      console.error('Failed to start CV scan:', error);
      setIsScanningCv(false);
    }
  };
  const handleAddExperience = () => {
    setExperiences((prev) => [
     
      { id: Date.now().toString(), role: '', company: '', period: '', tasks: '' },
       ...prev,
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
          location: 'default',
        });
        console.log('Datenbank erfolgreich geöffnet');
      } catch (error) {
        console.error('Fehler beim Öffnen der DB:', error);
      }
    };

    initDB();
  }, []);
// ── Test: Lebenslauf direkt mit OvisOCR3 analysieren ──

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
      const key = await EncryptedStorage.getItem('key');
      const deviceId = await DeviceInfo.getUniqueId();
      if (!dbMainRef.current || !deviceId) return;

      try {
        const [results] = await dbMainRef.current.executeSql(
          'SELECT skills FROM files WHERE ident = ?',
          [deviceId]
        );

        const data = results?.rows?.raw() || [];

        if (isMounted) {
          console.log('Geladene Daten:', data);
          const decSkills = await decryp(data[0]?.skills, key);
          console.log('Entschlüsselte Daten:', decSkills);
          if (!decSkills || decSkills.trim().length === 0) return;
          const jsonSkills = JSON.parse(decSkills);
          setExperiences(jsonSkills);
        }
      } catch (err) {
        console.error('SQL Fehler:', err);
      }
    };

    loadFileData();

    return () => {
      isMounted = false;
    };
  }, [dbMainRef.current]);

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
        if (decEmail) setEmailText(decEmail);
        if (decEmail) setEmail(decEmail.split('@')[0]);
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
    console.log('experience', experiences);
  }, [experiences]);

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
        { text: 'OK', onPress: closeDataModal }, // <-- Menü kommt zurück
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
   let newEmail, newProvider
   for (let i = 0; i < EMAIL_SERVERS_SHORT.length; i++) {
    if (EMAIL_SERVERS_SHORT[i].value === emailServerValue) {
      newEmail = EMAIL_SERVERS_SHORT[i].value
      newProvider = EMAIL_SERVERS_SHORT[i].label
    }
    
  }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');

      const trimmedPw = password.trim();
      console.log("emaidsal", newEmail);
      console.log("email", email);
      console.log("trimmedEmail", newProvider);
      const trimmedEmail = email.trim() + newProvider;
      console.log("trimmedEmail", trimmedEmail);
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
        { text: 'OK', onPress: closeEmailModal },
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
      closeLangModal(); // <-- Menü kommt zurück
    } catch (err) {
      console.error('Sprachwechsel fehlgeschlagen:', err);
    }
  };



  const currentLangObj = itemsLang.find((l) => l.value === i18n.language) || itemsLang[0];

  const handleInfo = (val) => {
    switch (val) {
      case 'lang':
        setInfoModalVisible(true);
        setTextInfo(t('info.language'));
        break;
      case 'email':
        setInfoModalVisible(true);
        setTextInfo(t('info.email'));
        break;
      case 'personal':
        setInfoModalVisible(true);
        setTextInfo(t('info.personal'));
        break;
      case 'experience':
        setInfoModalVisible(true);
        setTextInfo(t('info.experience'));
        break;
      case 'coins':
        setInfoModalVisible(true);
        setTextInfo(t('info.coins'));
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              {coins !== null ? `${coins} ` : t('profil.coinsCountLoading')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Settings Liste (wird gemessen – Quelle der Modal-Geometrie) ── */}
        <Animated.View
          ref={menuRef}
          collapsable={false}
          onLayout={syncMenuBox}
          style={[styles.sectionWrap, { transform: [{ translateX: animationMenu }] }]}
        >

          <View style={styles.cardGroup}>
            <SettingsCard
              onIconPress={() => handleInfo('personal')}
              iconName="badge"
              title={t('personalData')}
              description={myName ? `${myStreet}, ${myCity}` : t('profil.defaultAddressDesc')}
              onPress={() => {
                loadLocalData();
                openDataModal();
              }}
            />

            <View style={styles.divider} />

            <SettingsCard
              onIconPress={() => handleInfo('email')}
              iconName="alternate-email"
              title={t('configureEmail')}
              description={emailText ? emailText  : t('profil.defaultEmailDesc')}
              onPress={openEmailModal}
            />

            <View style={styles.divider} />

            <SettingsCard
              onIconPress={() => handleInfo('lang')}
              iconName="translate"
              title={t('settings.languageChange')}
              description={currentLangObj?.label || 'Deutsch'}
              badgeText={`${currentLangObj?.flag || '🇩🇪'} ${currentLangObj?.value?.toUpperCase()}`}
              onPress={openLangModal}
            />

            <View style={styles.divider} />

        <SettingsCard
              onIconPress={() => handleInfo('experience')}
              iconName="work-outline"
              title={t('profil.experienceTitle')}
              description={
                isScanningCv
                  ? 'Wird im Hintergrund ausgewertet…'
                  : t('profil.experienceDesc', { count: experiences.length })
              }
              badgeText={isScanningCv ? 'SCAN…' : undefined}
              onPress={() => setModalCvVisible(true)}
            />
          </View>
        </Animated.View>

        {/* ── Coin Shop Banner ── */}
        <View style={styles.sectionWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setModalPayVisible(true)}
            style={styles.shopBanner}
          >
            <View style={styles.shopBannerGlow} />
            <View style={styles.shopBannerContent}>
              <View style={styles.shopIconContainer}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleInfo('coins')}>
                  <MaterialIcons name="stars" size={24} color="#F59E0B" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.shopBannerTitle}>{t('profil.coinsVerwalten')}</Text>
                <Text style={styles.shopBannerSubtitle}>{t('profil.coinsText')}</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={14} color="rgba(255,255,255,0.4)" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Persönliche Daten
          → gleiche Fläche wie das Menü (x / y / w / h aus menuBox)
          → Menü fährt links raus, Sheet fährt von rechts rein
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isVisible={isModalDataVisible}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        animationInTiming={MENU_ANIM_MS}
        animationOutTiming={MENU_ANIM_MS}
        backdropTransitionInTiming={200}
        backdropTransitionOutTiming={MENU_ANIM_MS}
        backdropOpacity={0}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        statusBarTranslucent={true}
        onBackdropPress={closeDataModal}
        onBackButtonPress={closeDataModal}
        onModalHide={() => animateMenuTo(0)}
        style={styles.modalBackdropExact}
      >
        <View
          style={[
            styles.modalSheetFrame,
            menuBox.h > 0 && { height: menuBox.h },
            {
              marginLeft: menuBox.x,
              marginTop: menuBox.y,
              width: menuBox.w,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t('personalData')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalDataSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={closeDataModal} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 14, gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 8 }]}
            onPress={handleSavePersonalData}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('saveAndClose')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: E-Mail Konfiguration
          → exakt gleiche Fläche wie das Menü (x / y / w / h aus menuBox)
          → fährt von rechts rein, während das Menü links rausfährt
      ═══════════════════════════════════════════════════════════════ */}
     <Modal
        isVisible={isModalEmailVisible}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        animationInTiming={MENU_ANIM_MS}
        animationOutTiming={MENU_ANIM_MS}
        backdropTransitionInTiming={200}
        backdropTransitionOutTiming={MENU_ANIM_MS}
        backdropOpacity={0}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        statusBarTranslucent={true}
        onBackdropPress={() => {
          setOpenServerDropdown(false);
          closeEmailModal();
        }}
        onBackButtonPress={() => {
          setOpenServerDropdown(false);
          closeEmailModal();
        }}
        onModalHide={() => {
          setOpenServerDropdown(false);
          animateMenuTo(0);
        }}
        style={styles.modalBackdropExact}
      >
        <View
          style={[
            styles.modalSheetFrame,
            menuBox.h > 0 && { height: menuBox.h },
            {
              marginLeft: menuBox.x,
              marginTop: menuBox.y,
              width: menuBox.w,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t('profil.modalEmailTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalEmailSubtitle')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setOpenServerDropdown(false);
                closeEmailModal();
              }}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View
            style={{ flex: 1, overflow: 'visible', gap: 12, paddingVertical: 8 }}
          >
            <ModalInput
              icon="mail"
              placeholder={t('placeholderEmail')}
              value={email}
              onChangeText={setEmail}
              // Hebt die E-Mail-Zeile in der Z-Achse über das Passwort-Feld darunter
              containerStyle={{ zIndex: openServerDropdown ? 5000 : 10, elevation: openServerDropdown ? 10 : 0 }}
              suffix={
                <DocPicker
                  open={openServerDropdown}
                  setOpen={setOpenServerDropdown}
                  value={emailServerValue}
                  setValue={setEmailServerValue}
                />
              }
            />

            <ModalInput
              icon="lock"
              placeholder={t('placeholderPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              containerStyle={{ zIndex: 1 }}
            />
              <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 8, zIndex: 1 }]}
            onPress={handleSaveEmailConfig}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('saveAndClose')}</Text>
          </TouchableOpacity>
          </View>

        
        </View></Modal>

     
      <Modal
        isVisible={isModalLangVisible}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        animationInTiming={MENU_ANIM_MS}
        animationOutTiming={MENU_ANIM_MS}
        backdropTransitionInTiming={200}
        backdropTransitionOutTiming={MENU_ANIM_MS}
        backdropOpacity={0}
        hideModalContentWhileAnimating={true}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        statusBarTranslucent={true}
        onBackdropPress={closeLangModal}
        onBackButtonPress={closeLangModal}
        onModalHide={() => animateMenuTo(0)}
        style={styles.modalBackdropExact}
      >
        <View
          style={[
            styles.modalSheetFrame,
            menuBox.h > 0 && { height: menuBox.h },
            {
              marginLeft: menuBox.x,
              marginTop: menuBox.y,
              width: menuBox.w,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t('profil.modalLangTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalLangSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={closeLangModal} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1, marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
{/* ═══════════════════════════════════════════════════════════════
          MODAL 4: Coins Shop, Eigene ID & Coins Senden
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
        onBackdropPress={() => {
          Keyboard.dismiss();
          setModalPayVisible(false);
        }}
        onBackButtonPress={() => {
          Keyboard.dismiss();
          setModalPayVisible(false);
        }}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('profil.modalCoinsTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('profil.modalCoinsSubtitle')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setModalPayVisible(false);
              }}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ScrollView verhindert das Abschneiden bei geöffneter Tastatur */}
          {/* ScrollView verhindert das Abschneiden bei geöffneter Tastatur */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 14, gap: 12 }}
            style={{ maxHeight: height * 0.72 }}
          >
            {/* ── 1. PERSÖNLICHE ID MIT KOPIER-FUNKTION ── */}
            <View style={styles.myIdCard}>
              <View style={styles.myIdHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="fingerprint" size={16} color="#60A5FA" />
                  <Text style={styles.myIdLabel}>Deine persönliche ID</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyId}
                  style={[styles.copyPillBtn, copiedId && styles.copyPillBtnActive]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={copiedId ? 'check' : 'content-copy'}
                    size={13}
                    color={copiedId ? '#10B981' : '#60A5FA'}
                  />
                  <Text style={[styles.copyPillText, copiedId && { color: '#10B981' }]}>
                    {copiedId ? 'Kopiert!' : 'Kopieren'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.myIdValue} numberOfLines={1} ellipsizeMode="middle">
                {myUserId || 'Wird geladen…'}
              </Text>
              <Text style={styles.myIdHelpText}>
                Gib diese ID anderen, damit sie dir direkt Coins überweisen können.
              </Text>
            </View>
<View
              style={[
                styles.sendAccordionCard,
                isSendExpanded && styles.sendAccordionCardActive,
              ]}
            >
              {/* Klickbarer Header – gleiche Maße wie Option 1 & 2 */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={toggleSendExpanded}
                style={styles.sendOptionHeader}
              >
                <View style={styles.sendOptionIconWrap}>
                  <MaterialIcons name="send" size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text style={styles.payOptionTitle}>Coins an Freund senden</Text>
                  <Text style={styles.payOptionDesc}>
                    {isSendExpanded ? 'Empfänger und Anzahl festlegen' : 'Guthaben per ID übertragen'}
                  </Text>
                </View>
                <MaterialIcons
                  name={isSendExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={isSendExpanded ? '#60A5FA' : 'rgba(255,255,255,0.4)'}
                />
              </TouchableOpacity>

              {/* Ausklappbarer Bereich mit Inputs & Send-Button */}
              {isSendExpanded && (
                <View style={styles.sendAccordionBody}>
                  <View style={styles.sendDivider} />

                  {/* Empfänger-ID Input */}
                  <View style={styles.sendInputWrap}>
                    <MaterialIcons
                      name="badge"
                      size={18}
                      color="rgba(255,255,255,0.4)"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.sendTextInput}
                      placeholder="Empfänger-ID einfügen"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={receiverId}
                      onChangeText={setReceiverId}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                    />
                    {Boolean(receiverId.length) && (
                      <TouchableOpacity
                        onPress={() => setReceiverId('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="cancel" size={16} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Anzahl Coins Input + Max Button */}
                  <View style={styles.sendInputWrap}>
                    <MaterialIcons
                      name="monetization-on"
                      size={18}
                      color="#F59E0B"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.sendTextInput}
                      placeholder="Anzahl Coins (z.B. 10)"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="numeric"
                      value={sendCoinsAmount}
                      onChangeText={(val) => setSendCoinsAmount(val.replace(/[^0-9]/g, ''))}
                    />
                    <TouchableOpacity
                      onPress={() => setSendCoinsAmount(String(coins || 0))}
                      style={styles.sendMaxBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sendMaxBtnText}>MAX</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Send Button */}
                  <TouchableOpacity
                    onPress={handleSendCoins}
                    disabled={isSendingCoins || !receiverId.trim() || !sendCoinsAmount}
                    activeOpacity={0.85}
                    style={[
                      styles.sendSubmitBtn,
                      (!receiverId.trim() || !sendCoinsAmount || isSendingCoins) && { opacity: 0.5 },
                    ]}
                  >
                    {isSendingCoins ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="arrow-upward" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.sendSubmitBtnText}>Jetzt senden</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {/* ── 2. AUFLADE-OPTION 1: In-App Purchase ── */}
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
                <Text style={styles.payOptionTitle}>{t('profil.packTitle')}</Text>
                <Text style={styles.payOptionDesc}>{t('profil.packDesc')}</Text>
              </View>
              {loaded ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />
              )}
            </TouchableOpacity>

            {/* ── 3. AUFLADE-OPTION 2: Rewarded Video ── */}
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
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              )}
            </TouchableOpacity>

            {/* ── 4. AUFKLAPPBARE KACHEL: Coins an Freund senden ── */}
            
          </ScrollView>
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
     {/* ── 2. FEST: OCR Scan Button ── */}
          <TouchableOpacity
            onPress={handleScan}
            disabled={isScanningCv}
            activeOpacity={0.82}
            style={[
              styles.scanActionCard,
              isScanningCv && { borderColor: '#F59E0B', opacity: 0.85 },
            ]}
          >
            <View style={styles.scanIconWrap}>
              {isScanningCv ? (
                <ActivityIndicator size="small" color="#60A5FA" />
              ) : (
                <MaterialIcons name="document-scanner" size={22} color="#60A5FA" />
              )}
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.scanCardTitle}>
                  {isScanningCv ? 'Analyse läuft im Hintergrund…' : t('profil.scanTitle')}
                </Text>
                <View style={styles.badgeAi}>
                  <Text style={styles.badgeAiText}>{t('profil.scanBadge')}</Text>
                </View>
              </View>
              <Text style={styles.scanCardDesc}>
                {isScanningCv
                  ? 'Du kannst dieses Fenster schließen oder die App verlassen.'
                  : t('profil.scanDesc')}
              </Text>
            </View>
            {!isScanningCv && (
              <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />
            )}
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
                <MaterialIcons
                  name="work-outline"
                  size={32}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.emptyText}>{t('profil.emptyExperience')}</Text>
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
                        onChangeText={(val) =>
                          handleUpdateExperience(exp.id, 'company', val)
                        }
                        placeholder={t('profil.placeholderCompany')}
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>{t('profil.labelPeriod')}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={exp.period}
                        onChangeText={(val) =>
                          handleUpdateExperience(exp.id, 'period', val)
                        }
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
            <MaterialIcons
              name="check"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.saveModalBtnText}>{t('saveAndClose')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Info
        message={textInfo}
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
      />
    </View>
  );
};

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
  /* ── Aufklappbare Accordion-Kachel für Coins Senden ── */
  sendAccordionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  sendAccordionCardActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  sendOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sendOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendAccordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  sendDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  sendInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12151D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  sendTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  sendMaxBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sendMaxBtnText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '800',
  },
  sendSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 42,
    marginTop: 2,
  },
  sendSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
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
  inputShell: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  paddingLeft: 12,
  paddingRight: 6,
  minHeight: 48,          // statt height: 48 → Picker kann nicht gequetscht werden
},
inputIcon: {
  marginRight: 10,
},
textInputField: {
  flex: 1,
  minWidth: 0,            // wichtig auf Android, sonst sprengt Text die Zeile
  color: '#FFFFFF',
  fontSize: 14.5,
  paddingVertical: 12,
},
clearBtn: {
  flexShrink: 0,
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

  /* ── Sections & Cards ── */
  sectionWrap: {
    marginBottom: 24,
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

  /* ── Modals General (zentriert) – nur noch Modal 4 & 5 ── */
  modalBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    paddingHorizontal: 16,
  },
modalSheet: {
  width: '100%',
  maxWidth: 460,
  backgroundColor: MENU_SURFACE,            // ← wie Menü
  borderRadius: 22,
  padding: 20,
  borderWidth: 1,
  borderColor: MENU_BORDER,                 // ← wie cardGroup
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 16,
},


  /* ── "exact"-Modals (1, 2, 3): identische Fläche wie das Menü ── */
  modalBackdropExact: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    margin: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  modalSheetFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
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
  /* ── My Personal ID Card ── */
  myIdCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 16,
    padding: 12,
  },
  myIdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myIdLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myIdValue: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0F1117',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  myIdHelpText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10.5,
    marginTop: 6,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  copyPillBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  copyPillText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },

  /* ── Coins Senden Bereich ── */
  sendInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12151D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  sendTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  sendMaxBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sendMaxBtnText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '800',
  },
  sendSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 42,
    marginTop: 4,
  },
  sendSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default ProfilScreen;