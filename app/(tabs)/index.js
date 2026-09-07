// StartApp.js
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { router, useFocusEffect } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ActivityIndicator, // <-- Hinzufügen
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

import Bewerbung from "../application.js";
import ChangeScreen from "../change.js";
import CompanySearchModal from "../../comp/name.js";
import colors from "../../inc/colors.js";
import { decryp } from "../../inc/cryp.js";
import { runQuery } from "../../inc/db.js";

const { width, height } = Dimensions.get("window");
const DB_NAME = "firstNew.db";

const ROUTE_MAP = {
  name: "/name",
  nameOld: "/nameOld",
  changeOld: "/changeOld",
  application: "/application",
  change: "/change",
  collect: "/collect",
  email: "/email",
};

/* ── Hero Card (Hauptaktion) ────────────────────────────── */
const PrimaryActionCard = memo(({ title, description, badgeText, footerText, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.primaryCard, pressed && styles.cardPressed]}
  >
    <View style={styles.primaryGlowEffect} />

    <View style={styles.primaryTopRow}>
      <View style={styles.primaryIconContainer}>
        <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.badgePrimary}>
        <Text style={styles.badgePrimaryText}>{badgeText}</Text>
      </View>
    </View>

    <View style={styles.cardContent}>
      <Text style={styles.primaryCardTitle}>{title}</Text>
      <Text style={styles.primaryCardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <View style={styles.primaryFooter}>
      <Text style={styles.primaryFooterText}>{footerText}</Text>
      <View style={styles.arrowCircle}>
        <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
      </View>
    </View>
  </Pressable>
));

/* ── Secondary Card (Bewerbung recyclen) ────────────────── */
/* ── Secondary Card (Bewerbung recyclen) ────────────────── */
const SecondaryActionCard = memo(({ title, description, onPress, isLoading }) => (
  <Pressable
    onPress={onPress}
    disabled={isLoading}
    style={({ pressed }) => [
      styles.secondaryCard, 
      pressed && styles.cardPressed,
      isLoading && { opacity: 0.7 }
    ]}
  >
    <View style={styles.secondaryIconContainer}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <MaterialIcons name="history" size={24} color="rgba(255, 255, 255, 0.8)" />
      )}
    </View>

    <View style={styles.secondaryTextWrap}>
      <Text style={styles.secondaryCardTitle}>{title}</Text>
      <Text style={styles.secondaryCardDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <MaterialIcons name="chevron-right" size={22} color="rgba(255, 255, 255, 0.25)" />
  </Pressable>
));

export default function StartApp() {
  const { t } = useTranslation();
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [isLoadingOld, setIsLoadingOld] = useState(false); // <-- Neuer State
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [screenApp, setScreenApp] = useState(false);
  const [screenChange, setScreenChange] = useState(false);
  const [savedCompany, setSavedCompany] = useState({ name: "", street: "", city: "" });
const changeScreenRef = useRef(null);
  const lastClickTime = useRef(0);
  const bewerbungRef = useRef(null);
  const focusTimeoutRef = useRef(null);

  /* ── Animationen ── */
  const animResume = useRef(new Animated.Value(0)).current;
const animProgress = useRef(new Animated.Value(0)).current;   // Overlay Slide-In X (0 = draußen, 1 = sichtbar)
const animProgressY = useRef(new Animated.Value(0)).current;  // Slide-Down Y (0 = normal, 1 = nach unten weg)
const animStep = useRef(new Animated.Value(0)).current;
  
  

  /* ── Cross-Platform DB Check ── */
  useEffect(() => {
    const verifyDatabase = async () => {
      try {
        const dbDir =
          Platform.OS === "ios"
            ? `${RNFS.LibraryDirectoryPath}/LocalDatabase`
            : `${RNFS.DocumentDirectoryPath}/databases`;

        const exists = await RNFS.exists(`${dbDir}/${DB_NAME}`);
        // Fallback: Direkte Abfrage testen, falls Pfad abweicht
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
    };
  }, []);

  /* ── Sync Status ── */
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
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
      Animated.spring(animResume, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      animResume.setValue(0);
    }
  }, [isButtonVisible, animResume]);

  /* ── Modal & Overlay Steuerung ── */
  /* ── Modal & Overlay Steuerung ── */

// 1. Overlay von rechts öffnen
const openBewerbung = useCallback(() => {
  setScreenApp(true);
  setScreenChange(false);
  
  // Werte vor Start zurücksetzen
  animProgress.setValue(0);
  animProgressY.setValue(0);
  animStep.setValue(0);

  Animated.timing(animProgress, {
    toValue: 1,
    duration: 320,
    useNativeDriver: true,
  }).start(() => {
    bewerbungRef.current?.focusJob?.();
  });
}, [animProgress, animProgressY, animStep]);

// 2. Komplettes Overlay nach rechts schließen
const closeBewerbung = useCallback(() => {
  Keyboard.dismiss();
  Animated.timing(animProgressY, {
    toValue: 1,
    duration: 260,
    useNativeDriver: true,
  }).start(() => {
    setScreenApp(false);
    setScreenChange(false);
    animProgress.setValue(0);
    animProgressY.setValue(0);
    animStep.setValue(0);  
    });
}, [animProgress, animProgressY, animStep]);

// 3. Übergang zu Screen 2 (ChangeScreen)
const navigateToChange = useCallback(() => {
  setScreenChange(true);

  Animated.timing(animStep, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, [animStep]);

// 4. Zurück von Screen 2 zu Screen 1 (optional, falls ChangeScreen einen Zurück-Pfeil hat)
const backToBewerbung = useCallback(() => {
  Keyboard.dismiss();

  Animated.timing(animStep, {
    toValue: 0,
    duration: 280,
    useNativeDriver: true,
  }).start(() => {
    setScreenChange(false);
  });
}, [animStep]);

// 5. ChangeScreen nach unten wegschieben & schließen
const closeChange = useCallback(() => {
  Keyboard.dismiss();

  Animated.timing(animProgressY, {
    toValue: 1,
    duration: 260,
    useNativeDriver: true,
  }).start(() => {
    setScreenApp(false);
    setScreenChange(false);
    animProgress.setValue(0);
    animProgressY.setValue(0);
    animStep.setValue(0);
  });
}, [animProgress, animProgressY, animStep]);

/* ── Android Back-Handler Fix ── */
useEffect(() => {
  const onBackPress = () => {
    if (screenChange) {
      backToBewerbung(); // oder closeChange(), je nachdem ob Back abbrechen oder zurückspringen soll
      return true;
    }
    if (screenApp) {
      closeBewerbung();
      return true;
    }
    return false;
  };

  const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
  return () => sub.remove();
}, [screenApp, screenChange, closeBewerbung, backToBewerbung]);
  /* ── Saubere Historien-Abfrage ohne Nested Promises ── */
  const getOld = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const db = await SQLite.openDatabase({ name: DB_NAME, location: "default" });

      const result = await runQuery(
        db,
        "SELECT old, mergePdf FROM files WHERE ident = ?;",
        [deviceId]
      );

      const rows = result?.rows?.raw() ?? [];
      if (rows.length === 0 || !rows[0].old) return [];

      const key = await EncryptedStorage.getItem("key");
      const encData = await decryp(rows[0].old, key);
      const decMerge = rows[0].mergePdf ? await decryp(rows[0].mergePdf, key) : "";

      const oldFull = encData ? encData.split("&").filter(Boolean) : [];
      const oldArray = decMerge ? decMerge.split(",") : [];

      const newEntries = [];
      for (let i = oldFull.length - 1; i >= 0; i--) {
        const parts = oldFull[i].split("#");
        if (parts.length >= 3) {
          newEntries.push({
            job: parts[0],
            date: parts[1] || "",
            myType: `${parts[2] || ""} / ${parts[3] || ""}`,
            subject: parts[4] || "Kein Betreff",
            text: parts[5] || "",
            link: oldArray[i] || "",
          });
        }
      }
      return newEntries;
    } catch (error) {
      console.error("getOld Error:", error);
      return [];
    }
  };

  /* ── Validierung & Firmenauswahl ── */
  const handleNewApplication = async () => {
    try {
      const db = await SQLite.openDatabase({ name: DB_NAME, location: "default" });
      const deviceId = await DeviceInfo.getUniqueId();

      const result = await runQuery(db, "SELECT * FROM files WHERE ident = ?;", [deviceId]);
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
          t("startApp.alertIncompleteProfileMsg") || "Bitte trage deine Adresse im Profil ein."
        );
      } else if (!item.lebenslauf) {
        Alert.alert(
          t("startApp.alertMissingCvTitle") || "Lebenslauf fehlt",
          t("startApp.alertMissingCvMsg") || "Bitte lade zuerst deinen Lebenslauf hoch."
        );
        router.push("/uploadFirst");
      } else {
        setShowCompanySearch(true);
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
    const now = Date.now();
    if (now - lastClickTime.current < 800 || isLoadingOld) return;
    lastClickTime.current = now;

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

  const handleCompanySaved = async (name, street, city) => {
    setSavedCompany({ name, street, city });
    await EncryptedStorage.setItem("result", "application");
    setIsButtonVisible(true);
    setShowCompanySearch(false);
    openBewerbung();
  };

  const handleResume = async () => {
    const now = Date.now();
    if (now - lastClickTime.current < 800) return;
    lastClickTime.current = now;

    try {
      const lastStep = await EncryptedStorage.getItem("result");
      const targetRoute = ROUTE_MAP[lastStep];
      if (!targetRoute) return;

      if (targetRoute === "/application") {
        openBewerbung();
      } else {
        router.push(targetRoute);
      }
    } catch (e) {
      console.error("Routing error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
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
            onPress={handleNewApplication}
          />

       <SecondaryActionCard
  title={t("BewerbungRecycel") || "Bewerbung recyclen"}
  description={
    t("BewerbungRecycelText") ||
    "Verwende gespeicherte Daten oder ändere ein früheres Dokument ab."
  }
  isLoading={isLoadingOld}
  onPress={handleOldApplication}
/>
        </View>

        {/* Quick-Resume Bar */}
        {isButtonVisible && (
          <Animated.View
            style={[
              styles.resumeWrapper,
              {
                opacity: animResume,
                transform: [
                  {
                    translateY: animResume.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: animResume.interpolate({
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
              activeOpacity={0.82}
              style={styles.resumeBar}
            >
              <View style={styles.resumeLeft}>
                <View style={styles.resumePlayIcon}>
                  <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
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
              <MaterialIcons name="arrow-forward-ios" size={14} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <CompanySearchModal
        visible={showCompanySearch}
        onClose={() => setShowCompanySearch(false)}
        onSaved={handleCompanySaved}
        initialName={savedCompany.name}
        initialStreet={savedCompany.street}
        initialCity={savedCompany.city}
        nextScreen={screenChange}
      />

     {/* ══ Overlay & Slide-In Container ══ */}
{screenApp && (
  <View style={styles.bewerbungOverlay}>
    {/* Backdrop: Opacity rein über animProgress */}
    <Animated.View
      style={[
        styles.backdrop,
        {
          opacity: animProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolate: "clamp",
          }),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={closeBewerbung} />
    </Animated.View>

    {/* Slide-In Container: Transform + kontrollierte eigene Opacity */}
    <Animated.View
      style={[
        styles.cardAnimatedWrap,
        {
          opacity: animProgress.interpolate({
            inputRange: [0, 0.1, 1],
            outputRange: [0, 1, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateX: animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
                extrapolate: "clamp",
              }),
            },
            {
              translateY: animProgressY.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -height],
                extrapolate: "clamp",
              }),
            },
          ],
        },
      ]}
    >
      {/* Screen 1: Bewerbung */}
      <View style={StyleSheet.absoluteFillObject}>
        <Bewerbung
          changeScreen={() => {
            setScreenChange(true);
          }}
          visibleApp={screenApp}
          isNextStep={screenChange}
          ref={bewerbungRef}
          onClose={closeBewerbung}
        />
      </View>

      {/* Screen 2: ChangeScreen */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { pointerEvents: screenChange ? "auto" : "none" },
        ]}
      >
        <ChangeScreen visible={screenChange} onClose={closeChange} />
      </View>
    </Animated.View>
  </View>
)}    
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || "#0F1117",
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
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
  badgeHubText: {
    color: "rgba(255, 255, 255, 0.65)",
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
    backgroundColor: "#171B26",
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
    backgroundColor: "rgba(255, 255, 255, 0.03)",
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#10B981",
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
  innerScreenWrapper: {
    flex: 1,
  },
});