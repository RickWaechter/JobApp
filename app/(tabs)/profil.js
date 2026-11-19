// ProfilScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useIAP } from 'expo-iap';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsCard } from '../../comp/actionCard.js';
import Info from '../../comp/info.js';
import {
  CoinsModal,
  EmailConfigModal,
  ExperienceModal,
  LanguageModal,
  PersonalDataModal,
} from '../../comp/profilModals.js';
import colors from '../../inc/colors.js';
import {
  resumePollingIfNeeded as resumeCvScanPolling,
  startCvScan,
} from '../../inc/cvScan.js';
import { getDb } from '../../inc/db.js';
import { itemsLangFlag } from '../../inc/language.js';
import {
  appendScannedExperiences,
  creditUserCoins,
  fetchUserCoins,
  getHashedDeviceId,
  loadExperiencesFromDb,
  loadProfileData,
  saveExperiencesToDb,
  savePersonalData,
  sendCoinsToUser,
  testAndSaveEmailConfig,
  verifyIapCoins,
} from '../../inc/profilService.js';
import '../../local/i18n.js';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const SCREEN_PADDING_H = 20;
const CONTENT_TOP_PAD = 20;
const CONTENT_W = width - SCREEN_PADDING_H * 2;
const MENU_OUT_X = -width;
const MENU_ANIM_MS = 380;
const APP_BG = colors.background || '#0F1117';

const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-1715349546414110/1930235080';
const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['fashion', 'clothing'],
  requestNonPersonalizedAdsOnly: true,
});

const INFO_KEYS = {
  lang: 'info.language',
  email: 'info.email',
  personal: 'info.personal',
  experience: 'info.experience',
  coins: 'info.coins',
};

const ProfilScreen = ({ route }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const where = route?.params?.where || 'profil';

  // Profil & Einstellungen
  const [myName, setMyName] = useState('');
  const [myStreet, setMyStreet] = useState('');
  const [myCity, setMyCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailServerValue, setEmailServerValue] = useState('smtp.mail.de');
  const [emailText, setEmailText] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Werdegang & CV-Scan
  const [isScanningCv, setIsScanningCv] = useState(false);
  const [experiences, setExperiences] = useState([
    {
      id: '1',
      role: 'Anwendungsentwickler',
      company: 'Musterfirma GmbH',
      period: '02/2024 – Heute',
      tasks: '• Entwicklung mobiler Komponenten\n• Anbindung der REST-Schnittstellen in Go',
    },
  ]);

  // Coins & Ads
  const [coins, setCoins] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState(false);
  const [adLoadedState, setAdLoadedState] = useState(false);
  const adLoaded = useRef(false);
  const [myUserId, setMyUserId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [sendCoinsAmount, setSendCoinsAmount] = useState('');
  const [isSendingCoins, setIsSendingCoins] = useState(false);

  // Modals & Info
  const [activeSlideModal, setActiveSlideModal] = useState(null); // 'data' | 'email' | 'lang' | null
  const [isModalPayVisible, setModalPayVisible] = useState(false);
  const [isModalCvVisible, setModalCvVisible] = useState(false);
  const [textInfo, setTextInfo] = useState('');
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Menü-Animation
  const menuRef = useRef(null);
  const menuTranslateXRef = useRef(0);
  const animationMenu = useRef(new Animated.Value(0)).current;
  const [menuBox, setMenuBox] = useState({
    x: SCREEN_PADDING_H,
    y: insets.top + CONTENT_TOP_PAD,
    w: CONTENT_W,
    h: 0,
  });

  const syncMenuBox = useCallback(() => {
    if (menuTranslateXRef.current !== 0) return;
    menuRef.current?.measureInWindow?.((x, y, w, h) => {
      if (!w || !h || x < 0) return;
      const safeX = Math.max(SCREEN_PADDING_H, x);
      setMenuBox((prev) =>
        Math.abs(prev.x - safeX) < 0.5 &&
        Math.abs(prev.y - y) < 0.5 &&
        Math.abs(prev.w - w) < 0.5 &&
        Math.abs(prev.h - h) < 0.5
          ? prev
          : { x: safeX, y, w, h }
      );
    });
  }, []);

  const animateMenuTo = useCallback(
    (toValue) => {
      menuTranslateXRef.current = toValue;
      Animated.timing(animationMenu, {
        toValue,
        duration: MENU_ANIM_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && toValue === 0) {
          menuTranslateXRef.current = 0;
          syncMenuBox();
        }
      });
    },
    [animationMenu, syncMenuBox]
  );

  const openSlideModal = useCallback(
    (modalKey) => {
      syncMenuBox();
      setActiveSlideModal(modalKey);
      animateMenuTo(MENU_OUT_X);
    },
    [animateMenuTo, syncMenuBox]
  );

  const closeSlideModal = useCallback(() => {
    Keyboard.dismiss();
    setActiveSlideModal(null);
    animateMenuTo(0);
  }, [animateMenuTo]);

  useEffect(() => {
    const id = setTimeout(syncMenuBox, 0);
    return () => clearTimeout(id);
  }, [syncMenuBox]);

  useFocusEffect(
    useCallback(() => {
      menuTranslateXRef.current = 0;
      syncMenuBox();
      return () => {
        menuTranslateXRef.current = 0;
        animationMenu.setValue(0);
      };
    }, [animationMenu, syncMenuBox])
  );

  /* ── Initiales Laden ────────────────────────────────────── */
  const refreshLocalData = useCallback(async () => {
    try {
      const profile = await loadProfileData();
      if (!profile) return;
      if (profile.name) setMyName(profile.name);
      if (profile.street) setMyStreet(profile.street);
      if (profile.city) setMyCity(profile.city);
      if (profile.fullEmail) {
        setEmailText(profile.fullEmail);
        setEmail(profile.emailUser);
      }
      if (profile.password) setPassword(profile.password);
      if (profile.server) setEmailServerValue(profile.server);
    } catch (err) {
      console.error('Fehler beim Laden lokaler Daten:', err);
    }
  }, []);

  const refreshExperiences = useCallback(async () => {
    try {
      const list = await loadExperiencesFromDb();
      if (list) setExperiences(list);
    } catch (err) {
      console.error('Fehler beim Laden der Erfahrungen:', err);
    }
  }, []);

  useEffect(() => {
    getHashedDeviceId().then(setMyUserId).catch(console.error);
    refreshLocalData();
    refreshExperiences();
  }, [refreshLocalData, refreshExperiences]);

  useFocusEffect(
    useCallback(() => {
      refreshExperiences();
      fetchUserCoins().then(setCoins).catch(console.error);
    }, [refreshExperiences])
  );

  /* ── CV-Scan & AppState ─────────────────────────────────── */
  const handleCvScanSuccess = useCallback(
    async (data) => {
      try {
        const rawList =
          data?.work_experience || data?.experiences || (Array.isArray(data) ? data : []);
        const { addedCount, merged } = await appendScannedExperiences(rawList);
        if (merged) setExperiences(merged);
        Alert.alert(
          t('profil.title') || 'Erfolg',
          `Lebenslauf erfolgreich analysiert (${addedCount} Stationen hinzugefügt).`
        );
      } catch (err) {
        Alert.alert(t('profil.error'), 'Speichern fehlgeschlagen: ' + (err?.message || 'Fehler'));
      }
    },
    [t]
  );

  const resumeProfilScanIfNeeded = useCallback(async () => {
    const db = await getDb();
    await resumeCvScanPolling({
      where,
      setIsScanningCv,
      setExperiences,
      setEducations: () => {},
      setSkills: () => {},
      setPersonal: () => {},
      dbInstance: db,
      skipDefaultApply: true,
      onSuccess: handleCvScanSuccess,
      t,
    });
  }, [handleCvScanSuccess, t, where]);

  useEffect(() => {
    resumeProfilScanIfNeeded();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        resumeProfilScanIfNeeded();
        refreshExperiences();
      }
    });
    return () => sub.remove();
  }, [resumeProfilScanIfNeeded, refreshExperiences]);

  const handleScan = async () => {
    if (isScanningCv) return;
    const db = await getDb();
    startCvScan({
      where,
      isScanningCv,
      setIsScanningCv,
      setExperiences,
      setEducations: () => {},
      setSkills: () => {},
      setPersonal: () => {},
      dbInstance: db,
      skipDefaultApply: true,
      onSuccess: handleCvScanSuccess,
      t,
    });
  };

  /* ── Speicher- & Aktions-Handler ────────────────────────── */
  const handleSavePersonal = async () => {
    if (!myName?.trim() || !myCity?.trim() || !myStreet?.trim()) {
      Alert.alert(t('profil.error'), t('profil.errorDataEmail'));
      return;
    }
    try {
      await savePersonalData({ name: myName, street: myStreet, city: myCity });
      Alert.alert(t('profil.title'), t('profil.infoData'), [
        { text: 'OK', onPress: closeSlideModal },
      ]);
    } catch (err) {
      console.error('Fehler beim Speichern der Stammdaten:', err);
      Alert.alert(t('profil.error'), 'Fehler beim Speichern');
    }
  };

  const handleSaveEmail = async () => {
    if (!emailServerValue || !email?.trim() || !password?.trim()) {
      Alert.alert(t('profil.error'), t('profil.errorDataEmail'));
      return;
    }
    setIsTesting(true);
    try {
      const res = await testAndSaveEmailConfig({ email, password, emailServerValue });
      if (!res.ok) {
        Alert.alert(res.title, res.message);
        return;
      }
      setEmailText(res.fullEmail);
      Alert.alert(t('profil.title'), t('profil.infoEmail'), [
        { text: 'OK', onPress: closeSlideModal },
      ]);
    } catch (err) {
      console.error('Fehler beim Prüfen/Speichern der Maildaten:', err);
      Alert.alert(t('profil.error'), err?.message || 'Fehler beim Verbindungsaufbau.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveExperiences = async () => {
    try {
      await saveExperiencesToDb(experiences);
      setModalCvVisible(false);
    } catch (err) {
      Alert.alert(t('profil.error'), 'Erfahrungen konnten nicht gespeichert werden: ' + err?.message);
    }
  };

  const handleChangeLanguage = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode);
      await EncryptedStorage.setItem('lang', langCode);
      closeSlideModal();
    } catch (err) {
      console.error('Sprachwechsel fehlgeschlagen:', err);
    }
  };

  const handleCopyId = async () => {
    if (!myUserId) return;
    if (Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(myUserId);
    } else {
      Clipboard.setString(myUserId);
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSendCoins = async () => {
    Keyboard.dismiss();
    const cleanReceiver = receiverId.trim();
    const amountNum = parseInt(sendCoinsAmount, 10);
    const currentCoins = Number(coins) || 0;

    if (!cleanReceiver) return Alert.alert(t('profil.error'), 'Bitte gib die Empfänger-ID ein.');
    if (cleanReceiver === myUserId) return Alert.alert(t('profil.error'), 'Du kannst dir nicht selbst Coins senden.');
    if (isNaN(amountNum) || amountNum <= 0) return Alert.alert(t('profil.error'), 'Bitte gib eine gültige Anzahl an Coins ein.');
    if (amountNum > currentCoins) return Alert.alert(t('profil.error'), `Du hast nur ${currentCoins} Coins zur Verfügung.`);

    setIsSendingCoins(true);
    try {
      const ok = await sendCoinsToUser({
        senderKey: myUserId,
        receiverKey: cleanReceiver,
        coins: amountNum,
      });
      if (ok) {
        setCoins((prev) => Math.max(0, (Number(prev) || 0) - amountNum));
        setReceiverId('');
        setSendCoinsAmount('');
        Alert.alert(t('profil.title') || 'Erfolg', `${amountNum} Coins wurden erfolgreich übertragen.`);
      } else {
        Alert.alert(t('profil.error'), 'Übertragung fehlgeschlagen.');
      }
    } catch (err) {
      Alert.alert(t('profil.error'), err?.response?.data?.error || 'Netzwerkfehler beim Übertragen der Coins.');
    } finally {
      setIsSendingCoins(false);
    }
  };

  /* ── IAP & Rewarded Ads ─────────────────────────────────── */
  const { requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setCoins((prev) => (Number(prev) || 0) + 40);
      setLoaded(false);
      if (await verifyIapCoins(purchase.productId)) {
        await finishTransaction({ purchase, isConsumable: true });
      }
    },
    onPurchaseError: () => {
      Alert.alert(t('profil.error'), t('profil.buyCancel'));
      setLoaded(false);
    },
  });

  const handlePurchase = async (productId) => {
    setLoaded(true);
    try {
      await requestPurchase({ request: { ios: { sku: productId } } });
    } catch {
      setLoaded(false);
    }
  };

  useEffect(() => {
    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      adLoaded.current = true;
      if (adLoadedState) {
        rewarded.show();
        setAdLoadedState(false);
        adLoaded.current = false;
      }
    });

    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      try {
        await creditUserCoins(4);
        setCoins((prev) => (Number(prev) || 0) + 4);
      } catch (err) {
        console.error('Fehler beim Gutschreiben der Coins:', err);
      } finally {
        setLoaded(false);
      }
    });

    rewarded.load();
    return () => {
      unsubLoaded();
      unsubEarned();
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

  const openInfo = (key) => {
    if (!INFO_KEYS[key]) return;
    setTextInfo(t(INFO_KEYS[key]));
    setInfoModalVisible(true);
  };

  const currentLangObj = itemsLangFlag.find((l) => l.value === i18n.language) || itemsLangFlag[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top + CONTENT_TOP_PAD }]}>
      <View style={styles.scrollContent}>
        {/* ── Profil-Header Card ── */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatarWrap}>
              <MaterialIcons name="person" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.nameWrap}>
              <Text style={styles.greetingLabel}>{t('profil.welcomeBack')}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {myName || '    '}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalPayVisible(true)}
            style={styles.coinBadge}
          >
            <MaterialIcons name="monetization-on" size={16} color="#F59E0B" />
            <Text style={styles.coinText}>
              {coins !== null ? `${coins} ` : t('profil.coinsCountLoading')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Settings Liste ── */}
        <Animated.View
          ref={menuRef}
          collapsable={false}
          onLayout={() => menuTranslateXRef.current === 0 && syncMenuBox()}
          style={[styles.sectionWrap, { transform: [{ translateX: animationMenu }] }]}
        >
          <View style={styles.cardGroup}>
            <SettingsCard
              onIconPress={() => openInfo('personal')}
              iconName="badge"
              title={t('personalData')}
              description={myName ? `${myStreet}, ${myCity}` : t('profil.defaultAddressDesc')}
              onPress={() => {
                refreshLocalData();
                openSlideModal('data');
              }}
            />
            <View style={styles.divider} />
            <SettingsCard
              onIconPress={() => openInfo('email')}
              iconName="alternate-email"
              title={t('configureEmail')}
              description={emailText || t('profil.defaultEmailDesc')}
              onPress={() => openSlideModal('email')}
            />
            <View style={styles.divider} />
            <SettingsCard
              onIconPress={() => openInfo('lang')}
              iconName="translate"
              title={t('settings.languageChange')}
              description={currentLangObj?.label || 'Deutsch'}
              badgeText={`${currentLangObj?.flag || '🇩🇪'} ${currentLangObj?.value?.toUpperCase()}`}
              onPress={() => openSlideModal('lang')}
            />
            <View style={styles.divider} />
            <SettingsCard
              onIconPress={() => openInfo('experience')}
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
                <TouchableOpacity activeOpacity={0.7} onPress={() => openInfo('coins')}>
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

      {/* ── Modals ── */}
      <PersonalDataModal
        isVisible={activeSlideModal === 'data'}
        menuBox={menuBox}
        t={t}
        myName={myName}
        setMyName={setMyName}
        myStreet={myStreet}
        setMyStreet={setMyStreet}
        myCity={myCity}
        setMyCity={setMyCity}
        onSave={handleSavePersonal}
        onClose={closeSlideModal}
        onModalHide={() => animateMenuTo(0)}
      />

      <EmailConfigModal
        isVisible={activeSlideModal === 'email'}
        menuBox={menuBox}
        t={t}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        emailServerValue={emailServerValue}
        setEmailServerValue={setEmailServerValue}
        isTesting={isTesting}
        onSave={handleSaveEmail}
        onClose={closeSlideModal}
        onModalHide={() => animateMenuTo(0)}
      />

      <LanguageModal
        isVisible={activeSlideModal === 'lang'}
        menuBox={menuBox}
        t={t}
        currentLanguage={i18n.language}
        onSelectLanguage={handleChangeLanguage}
        onClose={closeSlideModal}
        onModalHide={() => animateMenuTo(0)}
      />

      <CoinsModal
        isVisible={isModalPayVisible}
        t={t}
        coins={coins}
        myUserId={myUserId}
        copiedId={copiedId}
        onCopyId={handleCopyId}
        receiverId={receiverId}
        setReceiverId={setReceiverId}
        sendCoinsAmount={sendCoinsAmount}
        setSendCoinsAmount={setSendCoinsAmount}
        isSendingCoins={isSendingCoins}
        onSendCoins={handleSendCoins}
        loaded={loaded}
        onPurchase={handlePurchase}
        onShowRewarded={showRewarded}
        onClose={() => setModalPayVisible(false)}
      />

      <ExperienceModal
        isVisible={isModalCvVisible}
        t={t}
        isScanningCv={isScanningCv}
        onScan={handleScan}
        experiences={experiences}
        onAddExperience={() =>
          setExperiences((prev) => [
            { id: Date.now().toString(), role: '', company: '', period: '', tasks: '' },
            ...prev,
          ])
        }
        onUpdateExperience={(id, field, val) =>
          setExperiences((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)))
        }
        onDeleteExperience={(id) =>
          setExperiences((prev) => prev.filter((it) => it.id !== id))
        }
        onSave={handleSaveExperiences}
        onClose={() => setModalCvVisible(false)}
      />

      <Info message={textInfo} visible={infoModalVisible} onClose={() => setInfoModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_BG },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
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
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameWrap: { flex: 1 },
  greetingLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  userName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 1 },
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
  coinText: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  sectionWrap: { marginBottom: 24 },
  cardGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 68,
  },
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
  shopBannerContent: { flexDirection: 'row', alignItems: 'center' },
  shopIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopBannerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  shopBannerSubtitle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
});

export default ProfilScreen;