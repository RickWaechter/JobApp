// StartApp.js
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import EncryptedStorage from "react-native-encrypted-storage";
import RNFS from "react-native-fs";
import { SafeAreaView } from "react-native-safe-area-context";
import SQLite from "react-native-sqlite-storage";
import { PrimaryActionCard, SecondaryActionCard } from "../../comp/actionCard";
import KeyboardDummy from "../../comp/keyboardDummy.jsx";
import Info, { useInfoModal } from "../../comp/info.js";
import CompanySearchModal from "../../comp/name.js";
import { runQuery, getOld } from "../../inc/db.js";
import Bewerbung from "../application.js";
import ChangeScreen from "../change.js";
import ChangeScreenOld from "../changeOld.js";
import { useTheme } from "../../comp/themeContext";
import { useThemedStyles } from "../../comp/themeStyles";

const { width, height } = Dimensions.get("window");
const DB_NAME = "firstNew.db";
const LOCK_TIME_MS = 1500; // 1.5 Sekunden Klick-Sperre

/* ══════════════════════════════════════════════════════════════════
   EINHEITLICHES TIMING – identisch zu CompanySearch
   → Nur hier ändern, dann ändern sich ALLE Animationen gleich
══════════════════════════════════════════════════════════════════ */
const ANIM_DURATION = 323;
const ANIM_EASING = Easing.inOut(Easing.ease); // Standard-Easing von Animated.timing

const tween = (value, toValue) =>
  Animated.timing(value, {
    toValue,
    duration: ANIM_DURATION,
    easing: ANIM_EASING,
    useNativeDriver: true,
  });

// Einheitlicher Ablauf: 1 Frame warten → neu gemountete Views & Refs sind bereit
const nextFrame = (fn) => requestAnimationFrame(() => fn());
const afterMount = (fn) =>
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fn());
  });
const ROUTE_MAP = {
  name: "/name",
  nameOld: "/nameOld",
  changeOld: "/changeOld",
  application: "/application",
  change: "/change",
  collect: "/collect",
  email: "/email",
};

export default function StartApp() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [isLoadingOld, setIsLoadingOld] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);

  /* ── Globaler Klick-Lock ── */
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);

  const acquireLock = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setIsLocked(true);
    setTimeout(() => {
      lockRef.current = false;
      setIsLocked(false);
    }, LOCK_TIME_MS);
    return true;
  }, []);

  /* ── Subscreen Visibility ── */
  const [screen, setScreen] = useState(false);
  const [screenApp, setScreenApp] = useState(false);
  const [screenChange, setScreenChange] = useState(false);
  const [changeOldScreen, setChangeOldScreen] = useState(false);
  const [savedCompany, setSavedCompany] = useState({ name: "", street: "", city: "" });

  const bewerbungRef = useRef(null);
  const changeScreenRef = useRef(null);
  const changeOldRef = useRef(null);
  const focusTimeoutRef = useRef(null);
  const { infoVisible, infoMessage, openInfo, closeInfo } = useInfoModal();

  /* ══════════════════════════════════════════════════════════════════
     ANIMATION REFS
  ══════════════════════════════════════════════════════════════════ */
  const animHomeOpacity = useRef(new Animated.Value(1)).current;
  const animResumeBanner = useRef(new Animated.Value(0)).current;

  const animNameModalX = useRef(new Animated.Value(0)).current;
  const animNameModalY = useRef(new Animated.Value(1)).current;
  const animNameModalOpacity = useRef(new Animated.Value(0)).current;

  const animOverlayWrapperX = useRef(new Animated.Value(0)).current;
  const animOverlayWrapperY = useRef(new Animated.Value(0)).current;
  const animBackdropOpacity = useRef(new Animated.Value(0)).current;

  const animBewerbungOpacity = useRef(new Animated.Value(0)).current;

  const animChangeScreenX = useRef(new Animated.Value(0)).current;
  const animChangeScreenY = useRef(new Animated.Value(0)).current;
  const animChangeScreenOpacity = useRef(new Animated.Value(0)).current;

  const animChangeOldOpacity = useRef(new Animated.Value(0)).current;

  const kbListenerRef = useRef(null);
  const kbFallbackRef = useRef(null);

  /* ══════════════════════════════════════════════════════════════════
     HELPER
  ══════════════════════════════════════════════════════════════════ */
  const clearKeyboardListeners = useCallback(() => {
    if (kbFallbackRef.current) {
      clearTimeout(kbFallbackRef.current);
      kbFallbackRef.current = null;
    }
    if (kbListenerRef.current) {
      kbListenerRef.current.remove();
      kbListenerRef.current = null;
    }
  }, []);

  // Animated.Values aus useRef(...).current sind stabil → leere Deps ok
  const resetOverlayValues = useCallback(() => {
    animOverlayWrapperX.setValue(0);
    animOverlayWrapperY.setValue(0);
    animBackdropOpacity.setValue(0);
    animBewerbungOpacity.setValue(0);
    animChangeScreenX.setValue(0);
    animChangeScreenY.setValue(0);
    animChangeScreenOpacity.setValue(0);
    animChangeOldOpacity.setValue(0);
  }, []);

  const resetNameValues = useCallback(() => {
    animNameModalX.setValue(0);
    animNameModalY.setValue(1);
    animNameModalOpacity.setValue(0);
  }, []);

  const resetAllFlags = useCallback(() => {
    setScreen(false);
    setScreenApp(false);
    setScreenChange(false);
    setChangeOldScreen(false);
    setShowCompanySearch(false);
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     COMPANY SEARCH
  ══════════════════════════════════════════════════════════════════ */
  const openName = useCallback(() => {
    clearKeyboardListeners();
    resetNameValues();
    setShowCompanySearch(true);

    nextFrame(() => {
      Animated.parallel([
        tween(animNameModalX, 1),
        tween(animNameModalOpacity, 1),
        tween(animHomeOpacity, 0),
      ]).start();
    });
  }, [clearKeyboardListeners, resetNameValues]);

  const closeName = useCallback(() => {
    Keyboard.dismiss();
    clearKeyboardListeners();

    Animated.parallel([
      tween(animNameModalY, 2),
      tween(animNameModalOpacity, 0),
      tween(animHomeOpacity, 1),
    ]).start(({ finished }) => {
      if (!finished) return;
      setShowCompanySearch(false);
      resetNameValues();
    });
  }, [clearKeyboardListeners, resetNameValues]);

  /* ══════════════════════════════════════════════════════════════════
     OVERLAY SCHLIESSEN
  ══════════════════════════════════════════════════════════════════ */
  const closeAllOverlays = useCallback(() => {
    Keyboard.dismiss();

    Animated.parallel([
      tween(animOverlayWrapperY, 1),
      tween(animBackdropOpacity, 0),
      tween(animHomeOpacity, 1),
    ]).start(() => {
      resetAllFlags();
      resetOverlayValues();
      resetNameValues();
    });
  }, [resetAllFlags, resetOverlayValues, resetNameValues]);

  /* ══════════════════════════════════════════════════════════════════
     OVERLAY ÖFFNEN
     Immer gleicher Ablauf: Reset → State → nextFrame → Animation + Fokus
     Nur der Wrapper fährt von rechts ein (keine doppelte Bewegung)
  ══════════════════════════════════════════════════════════════════ */
  const openBewerbung = useCallback(() => {
    resetOverlayValues();
    setScreenApp(true);
    setScreenChange(false);
    setChangeOldScreen(false);
    setScreen(true);

    nextFrame(() => {
      Animated.parallel([
        tween(animOverlayWrapperX, 1),
        tween(animBewerbungOpacity, 1),
        tween(animBackdropOpacity, 1),
      ]).start();
      bewerbungRef.current?.focusJob?.();
    });
  }, [resetOverlayValues]);

  const openChange = useCallback(() => {
    resetOverlayValues();
    animChangeScreenX.setValue(1); // steht bereits an Position → nur Wrapper bewegt sich
    setScreenApp(false);
    setChangeOldScreen(false);
    setScreenChange(true);
    setScreen(true);

    nextFrame(() => {
      Animated.parallel([
        tween(animOverlayWrapperX, 1),
        tween(animChangeScreenOpacity, 1),
        tween(animBackdropOpacity, 1),
      ]).start();
      changeScreenRef.current?.focus?.();
    });
  }, [resetOverlayValues]);

  const openChangeOld = useCallback(() => {
    resetOverlayValues();
    setScreenApp(false);
    setScreenChange(false);
    setChangeOldScreen(true);
    setScreen(true);

    nextFrame(() => {
      Animated.parallel([
        tween(animOverlayWrapperX, 1),
        tween(animChangeOldOpacity, 1),
        tween(animBackdropOpacity, 1),
      ]).start();
      changeOldRef.current?.focus?.();
    });
  }, [resetOverlayValues]);

  /* ══════════════════════════════════════════════════════════════════
     BEWERBUNG → CHANGE
  ══════════════════════════════════════════════════════════════════ */
  const navigateToChange = useCallback(() => {
    animChangeScreenX.setValue(0);
    animChangeScreenY.setValue(0);
    animChangeScreenOpacity.setValue(0);

    setScreenChange(true);
    setScreen(true);

    
      changeScreenRef.current?.focus?.();


    nextFrame(() => {
      Animated.parallel([
        tween(animChangeScreenX, 1),
        tween(animChangeScreenOpacity, 1),
      ]).start();
    });
  }, []);

  const backToBewerbung = useCallback(() => {
    setScreenApp(true); // sonst ist Bewerbung danach nicht mehr bedienbar (pointerEvents)

    Animated.parallel([
      tween(animChangeScreenX, 0),
      tween(animChangeScreenOpacity, 0),
    ]).start(() => {
      setScreenChange(false);
    });
  }, []);

  const closeChange = useCallback(() => {
    Keyboard.dismiss();

    // Fall 1: ChangeScreen ohne Bewerbung darunter → komplettes Overlay schließen
    if (!screenApp) {
      closeAllOverlays();
      return;
    }

    // Fall 2: ChangeScreen liegt über Bewerbung → nach oben wegfahren
    Animated.parallel([
      tween(animChangeScreenY, 1),
      tween(animChangeScreenOpacity, 0),
      tween(animHomeOpacity, 1),
    ]).start(() => {
      resetAllFlags();
      resetOverlayValues();
    });
  }, [screenApp, closeAllOverlays, resetAllFlags, resetOverlayValues]);

  /* ══════════════════════════════════════════════════════════════════
     FIRMA GESPEICHERT → BEWERBUNG
  ══════════════════════════════════════════════════════════════════ */
  const handleCompanySaved = useCallback(
    (name, street, city) => {
      setSavedCompany({ name, street, city });
      EncryptedStorage.setItem("result", "application").catch((err) =>
        console.error("Storage Error:", err)
      );
      setIsButtonVisible(true);

      resetOverlayValues();
      animBackdropOpacity.setValue(1);

      setScreenApp(true);
      setScreenChange(false);
      setChangeOldScreen(false);
      setScreen(true);

      nextFrame(() => {
        bewerbungRef.current?.focusSkill?.();

        Animated.parallel([
          
          tween(animNameModalX, 2),
          tween(animNameModalOpacity, 0),
          tween(animOverlayWrapperX, 1),
          tween(animBewerbungOpacity, 1),
        ]).start(({ finished }) => {
          if (!finished) return;
          setShowCompanySearch(false);
          resetNameValues();
        });
      });
    },
    [resetOverlayValues, resetNameValues]
  );

  /* ── Hardware Back-Button ── */
  useEffect(() => {
    const onBackPress = () => {
      if (showCompanySearch) {
        closeName();
        return true;
      }
      if (changeOldScreen) {
        closeAllOverlays();
        return true;
      }
      if (screenChange) {
        backToBewerbung();
        return true;
      }
      if (screenApp) {
        closeAllOverlays();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [
    showCompanySearch,
    changeOldScreen,
    screenChange,
    screenApp,
    closeName,
    closeAllOverlays,
    backToBewerbung,
  ]);

  /* ── Cross-Platform DB Check ── */
  useEffect(() => {
    const verifyDatabase = async () => {
      try {
        const dbDir =
          Platform.OS === "ios"
            ? `${RNFS.LibraryDirectoryPath}/LocalDatabase`
            : `${RNFS.DocumentDirectoryPath}/databases`;

        const exists = await RNFS.exists(`${dbDir}/${DB_NAME}`);
        if (!exists && Platform.OS === "ios") {
          router.dismissTo("/first");
        }
      } catch (err) {
        console.error("DB Path Check Error:", err);
      }
    };
    verifyDatabase();

    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      if (kbFallbackRef.current) clearTimeout(kbFallbackRef.current);
      if (kbListenerRef.current) kbListenerRef.current.remove();
    };
  }, []);

  /* ── Sync Storage Status & Lock Reset bei Screen-Rückkehr ── */
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      lockRef.current = false;
      setIsLocked(false);

      (async () => {
        try {
          const result = await EncryptedStorage.getItem("result");
          if (isMounted) setIsButtonVisible(Boolean(result));
        } catch (error) {
          console.error("Storage Error:", error);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  /* ── Resume Banner Animation ── */
  useEffect(() => {
    if (isButtonVisible) {
      Animated.spring(animResumeBanner, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      animResumeBanner.setValue(0);
    }
  }, [isButtonVisible, animResumeBanner]);

  /* ══════════════════════════════════════════════════════════════════
     HANDLER
  ══════════════════════════════════════════════════════════════════ */
  const handleNewApplication = async () => {
    if (!acquireLock()) return;

    try {
      const db = await SQLite.openDatabase({ name: DB_NAME, location: "default" });
      const deviceId = await DeviceInfo.getUniqueId();

      const result = await runQuery(db, "SELECT * FROM files WHERE ident = ?;", [
        deviceId,
      ]);
      const rows = result?.rows?.raw() ?? [];

      if (rows.length === 0) {
        Alert.alert(
          t("startApp.alertMissingProfileTitle") || "Profil fehlt",
          t("startApp.alertMissingProfileMsg") || "Bitte lege zuerst dein Profil an."
        );
        return;
      }

      const item = rows[0];
      if (!item.name) {
        Alert.alert(
          t("startApp.alertIncompleteProfileTitle") || "Profil unvollständig",
          t("startApp.alertIncompleteProfileMsg") ||
            "Bitte trage deine Adresse im Profil ein."
        );
      } else if (!item.lebenslauf) {
        Alert.alert(
          t("startApp.alertMissingCvTitle") || "Lebenslauf fehlt",
          t("startApp.alertMissingCvMsg") ||
            "Bitte lade zuerst deinen Lebenslauf hoch."
        );
        router.push("/uploadFirst");
      } else {
        openName();
      }
    } catch (error) {
      console.error("Application Validation Error:", error);
      Alert.alert(
        t("startApp.alertErrorTitle") || "Fehler",
        t("startApp.alertDbConnectionError") || "Datenbankverbindung fehlgeschlagen."
      );
    }
  };

  const handleOldApplication = async () => {
    if (isLoadingOld || !acquireLock()) return;

    setIsLoadingOld(true);
    try {
      const entries = await getOld();
      router.push({
        pathname: "/old",
        params: { items: JSON.stringify(entries) },
      });
    } catch (error) {
      console.error("Fehler beim Laden alter Bewerbungen:", error);
    } finally {
      setIsLoadingOld(false);
    }
  };

  const handleResume = async () => {
    if (!acquireLock()) return;

    try {
      const lastStep = await EncryptedStorage.getItem("result");
      const targetRoute = ROUTE_MAP[lastStep];
      if (!targetRoute) return;

      if (targetRoute === "/application") {
        openBewerbung();
      } else if (targetRoute === "/change") {
        openChange();
      } else if (targetRoute === "/collect") {
        router.push("/collect");
      } else if (targetRoute === "/changeOld") {
        openChangeOld();
      }
    } catch (e) {
      console.error("Routing error:", e);
    }
  };

  const handleOpenInfo = useCallback(
    (type) => {
      if (!acquireLock()) return;
      openInfo(type);
    },
    [acquireLock, openInfo]
  );

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
      <ImageBackground source={{uri: 'https://www1.xup.in/exec/ximg.php?fid=96261766'}} resizeMode="cover" style={{flex:1, justifyContent:"center"}}>
    
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.contentWrapper, { opacity: animHomeOpacity }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeHub}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeHubText}>
              {t("startApp.badgeHub") || "BEWERBUNGS-ASSISTENT"}
            </Text>
          </View>
          <Text style={styles.titleMain}>
            {t("startApp.titleMain") || "Wie möchtest du starten?"}
          </Text>
        </View>

        {/* Aktionskarten */}
        <View style={styles.actionContainer}>
          <PrimaryActionCard
            title={t("BewerbungGenerieren") || "Neue Bewerbung"}
            description={
              t("BewerbungGenerierenText") ||
              "Erstelle ein maßgeschneidertes Anschreiben passend zu deiner Wunschstelle."
            }
            badgeText={t("startApp.badgeRecommended") || "EMPFOHLEN"}
            footerText={t("startApp.primaryFooter") || "Jetzt starten"}
            disabled={isLocked}
            onPress={handleNewApplication}
            onIconPress={() => handleOpenInfo("new")}
          />

          <SecondaryActionCard
            title={t("BewerbungRecycel") || "Bewerbung recyclen"}
            description={
              t("BewerbungRecycelText") ||
              "Verwende gespeicherte Daten oder ändere ein früheres Dokument ab."
            }
            isLoading={isLoadingOld}
            disabled={isLocked}
            onPress={handleOldApplication}
            onIconPress={() => handleOpenInfo("old")}
          />
        </View>

        {/* Quick-Resume Bar */}
        {isButtonVisible && (
          <Animated.View
            style={[
              styles.resumeWrapper,
              {
                opacity: animResumeBanner,
                transform: [
                  {
                    translateY: animResumeBanner.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: animResumeBanner.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleResume}
              disabled={isLocked}
              activeOpacity={0.82}
              style={[styles.resumeBar, isLocked && { opacity: 0.7 }]}
            >
              <View style={styles.resumeLeft}>
                <View style={styles.resumePlayIcon}>
                  <Pressable
                    disabled={isLocked}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      handleOpenInfo("resume");
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View>
                  <Text style={styles.resumeTitle}>
                    {t("Fortsetzen") || "Zuletzt bearbeitet"}
                  </Text>
                  <Text style={styles.resumeSubtitle}>
                    {t("startApp.resumeSubtitle") || "Klicke hier, um fortzufahren"}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={14}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* ══ CompanySearch Modal Overlay ══ */}
      {showCompanySearch && (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Animated.View
            renderToHardwareTextureAndroid={true}
            shouldRasterizeIOS={true}
            style={[
              styles.cardAnimatedWrap,
              {
                opacity: animNameModalOpacity,
                zIndex:100,
                transform: [
                  {
                    translateX: animNameModalX.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [width, 0, -width * 0.65],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    translateY: animNameModalY.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [height, 0, -height],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <CompanySearchModal
              visible={showCompanySearch}
              onClose={closeName}
              onSaved={handleCompanySaved}
              initialName={savedCompany.name}
              initialStreet={savedCompany.street}
              initialCity={savedCompany.city}
            />
          </Animated.View>
        </View>
      )}

      {/* ══ Multi-Step Overlay (Bewerbung, ChangeScreen, ChangeScreenOld) ══ */}
      {screen && (
        <View style={styles.bewerbungOverlay}>
          <Animated.View style={[styles.backdrop, { opacity: animBackdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeAllOverlays} />
          </Animated.View>

          <Animated.View
            renderToHardwareTextureAndroid={true}
            style={[
              styles.cardAnimatedWrap,
              {
                transform: [
                  {
                    translateX: animOverlayWrapperX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [width, 0],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    translateY: animOverlayWrapperY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -height],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            {/* ── FLOW 1: NEUE BEWERBUNG (Bewerbung -> ChangeScreen) ── */}
            {!changeOldScreen && (
              <>
                {/* Step 1: Bewerbung */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { opacity: animBewerbungOpacity },
                  ]}
                  pointerEvents={screenApp && !screenChange ? "auto" : "none"}
                >
                  <Bewerbung
                    changeScreen={navigateToChange}
                    visibleApp={screenApp}
                    isNextStep={screenChange}
                    ref={bewerbungRef}
                    onClose={closeAllOverlays}
                  />
                </Animated.View>

                {/* Step 2: ChangeScreen */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      opacity: animChangeScreenOpacity,
                      transform: [
                        {
                          translateX: animChangeScreenX.interpolate({
                            inputRange: [0, 1],
                            outputRange: [width, 0],
                            extrapolate: "clamp",
                          }),
                        },
                        {
                          translateY: animChangeScreenY.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -height],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents={screenChange ? "auto" : "none"}
                >
                  <ChangeScreen
                    visible={screenChange}
                    onClose={closeChange}
                    ref={changeScreenRef}
                  />
                </Animated.View>
              </>
            )}

            {/* ── FLOW 2: ALTE BEWERBUNG (ChangeScreenOld isoliert) ── */}
            {changeOldScreen && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  { opacity: animChangeOldOpacity },
                ]}
                pointerEvents="auto"
              >
                <ChangeScreenOld
                  visible={changeOldScreen}
                  ref={changeOldRef}
                  onClose={closeAllOverlays}
                  paddingFactor={0.9}
                />
              </Animated.View>
            )}
          </Animated.View>
        </View>
      )}

      <KeyboardDummy />
      <Info visible={infoVisible} onClose={closeInfo} message={infoMessage} />
    </SafeAreaView>
    </ImageBackground>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════ */
const createStyles = (colors) => ({
  container: {
    flex: 1,
    marginBottom:52,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "space-between",
    paddingTop: 24,
    paddingBottom: 28,
  },
  header: {
    marginTop: 8,
  },
  badgeHub: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.badge,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.badgeDot,
    marginRight: 6,
  },
  badgeHubText: {
    color: colors.badgeText,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  titleMain: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actionContainer: {
    gap: 16,
    marginVertical: "auto",
  },
  primaryCard: {
    position: "relative",
    backgroundColor: colors.actionCard,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  primaryGlowEffect: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  primaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  primaryIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  badgePrimary: {
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgePrimaryText: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardContent: {
    marginBottom: 16,
  },
  primaryCardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  primaryCardDescription: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13.5,
    lineHeight: 19,
  },
  primaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  primaryFooterText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.actionCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  secondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  secondaryTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  secondaryCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  secondaryCardDescription: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 12.5,
    lineHeight: 17,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  resumeWrapper: {
    marginTop: 10,
  },
  resumeBar: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resumeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resumePlayIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#43b121d0",
    justifyContent: "center",
    alignItems: "center",
  },
  resumeTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  resumeSubtitle: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 11.5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 110,
    elevation: 25,
  },
  bewerbungOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 12, 18, 0.82)",
  },
  cardAnimatedWrap: {
    flex: 1,
  },
});