/* ═══════════════════════════════════════════════════════════════════════
 * CompanySearchModal.js
 * ───────────────────────────────────────────────────────────────────────
 *  1. Imports
 *  2. Tokens
 *  3. Subkomponenten (Field)
 *  4. Hauptkomponente (Slide von oben + Zentrierung über Tastatur)
 *  5. Styles
 * ═══════════════════════════════════════════════════════════════════════ */

import MaterialIcons from "@react-native-vector-icons/material-icons";
import { addSearchListener, fetchPlace, search } from "expo-mapkit";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../inc/colors.js";
import "../local/i18n.js";

/* ── 2. Tokens ─────────────────────────────────────────────────────────── */
const DEBOUNCE_MS = 250;
const DOUBLE_TAP_GUARD_MS = 1000;

const M = {
  panelPadH: 20,
  panelPadV: 18,
  panelRadius: 24,

  headerH: 46,
  headerGap: 14,

  inputH: 48,
  errorH: 16,

  listMin: 132,
  zoneGap: 10,

  btnPrimary: 48,
  btnSecondary: 46,
  btnGhost: 34,
  btnGap: 8,

  footGap: 12,
};

const FIELD_H = M.inputH + M.errorH;
const FIELD_H_BARE = M.inputH;
const CHROME = M.panelPadV * 2 + M.headerH + M.headerGap;

const H_SEARCH =
  CHROME + FIELD_H_BARE + M.zoneGap + M.listMin + M.footGap + M.btnSecondary;

const H_MANUAL =
  CHROME + FIELD_H * 3 + M.footGap + M.btnPrimary + M.btnGap + M.btnGhost;

const PANEL = {
  widthRatio: 0.92,
  maxWidth: 480,
  minHeight: Math.max(H_SEARCH, H_MANUAL),
  idealHeight: Math.max(H_SEARCH, H_MANUAL) + 60,
  gutter: 12,
};

/* ── Farbpalette ── */
const WARM = {
  bg: colors.background || "#171412",
  backdrop: "rgba(18, 13, 10, 0.8)",
  surface: "rgba(255, 240, 225, 0.05)",
  surfaceBorder: "rgba(255, 220, 190, 0.14)",
  surfaceBorderSubtle: "rgba(255, 220, 190, 0.07)",

  primary: "#E06D28",
  accentBadgeBg: "rgba(245, 158, 11, 0.15)",
  accentBadgeBorder: "rgba(245, 158, 11, 0.3)",

  iconLeading: "#F59E0B",
  iconClear: "#F87171",
  iconPin: "#FB923C",
  iconArrow: "#FBBF24",
  iconEmpty: "#F59E0B",
  iconClose: "#FFF7ED",

  textMain: "#FFF9F2",
  textMuted: "rgba(255, 240, 225, 0.65)",
  textDim: "rgba(255, 235, 220, 0.38)",

  error: "#F87171",
  errorBg: "rgba(248, 113, 113, 0.08)",
  errorBorder: "rgba(248, 113, 113, 0.45)",
};

/* ── 3. Subkomponente: Eingabefeld ─────────────────────────────────────── */
const Field = memo(function Field({
  value,
  onChangeText,
  placeholder,
  error,
  iconName,
  iconColor = WARM.iconLeading,
  inputRef,
  showError = true,
  returnKeyType = "next",
  onSubmitEditing,
  blurOnSubmit = false,
}) {
  const handleClear = useCallback(() => onChangeText(""), [onChangeText]);

  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.inputRow, Boolean(error) && styles.inputRowError]}>
        {Boolean(iconName) && (
          <MaterialIcons
            name={iconName}
            size={20}
            color={iconColor}
            style={styles.leadingIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, Boolean(iconName) && styles.inputWithIcon]}
          placeholder={placeholder}
          placeholderTextColor={WARM.textDim}
          value={value}
          onChangeText={onChangeText}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          autoCorrect={false}
          underlineColorAndroid="transparent"
        />

        {Boolean(value?.length) && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="cancel" size={18} color={WARM.iconClear} />
          </TouchableOpacity>
        )}
      </View>

      {showError && (
        <Text
          style={[styles.errorText, !error && styles.errorHidden]}
          numberOfLines={1}
        >
          {error || " "}
        </Text>
      )}
    </View>
  );
});

/* ── 4. Hauptkomponente ────────────────────────────────────────────────── */
const CompanySearchModal = ({
  visible,
  nextScreen,
  onClose,
  onSaved,
  initialName = "",
  initialStreet = "",
  initialCity = "",
  topBarHeight = 0,
  durationIn = 350,
  durationOut = 350,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  /* ── State & Refs ── */
  const [isMounted, setIsMounted] = useState(false);
  const [yourName, setYourName] = useState(initialName);
  const [yourStreet, setYourStreet] = useState(initialStreet);
  const [yourCity, setYourCity] = useState(initialCity);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [errors, setErrors] = useState({
    nameErr: "",
    streetErr: "",
    cityErr: "",
  });

  const searchRef = useRef(null);
  const nameRef = useRef(null);
  const streetRef = useRef(null);
  const cityRef = useRef(null);
  const lastClick = useRef(0);
  const debounceTimer = useRef(null);
  const focusTimer = useRef(null);
  const manualModeRef = useRef(false);

  manualModeRef.current = manualMode;

  /* ── Animierte Werte ── */
  const animY = useRef(new Animated.Value(-winH)).current;
  const animNameX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const isExitingLeft = useRef(false);

  /* ── Tastatur-Höhe synchronisieren ── */
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setKbHeight(h);
      Animated.timing(keyboardHeightAnim, {
        toValue: h,
        duration: Platform.OS === "ios" ? e?.duration || 550 : 700,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e) => {
      setKbHeight(e.endCoordinates.height ?? 0);
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e?.duration || 500 : 200,
        useNativeDriver: false,
      }).start();
    };

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [keyboardHeightAnim]);

  /* ── Layout-Berechnungen ── */
  const stageTop = insets.top * 1.7;
  const panelWidth = Math.min(winW * PANEL.widthRatio, PANEL.maxWidth);

  const panelHeight = useMemo(() => {
    if (kbHeight > 0) {
    const bottomSpace = kbHeight > 0 ? kbHeight : insets.bottom;
    const free = winH - stageTop - bottomSpace - PANEL.gutter;
    if (free <= PANEL.minHeight) return Math.round(Math.max(free, 240));
    return Math.round(Math.min(free, PANEL.idealHeight));
    }
  }, [winH, stageTop, kbHeight, insets.bottom]);

  useEffect(() => {
    if (!nextScreen) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: durationOut,
        useNativeDriver: true,
      }).start(({ finished }) => {
        setIsMounted(false);
        if (finished) onClose(); 
      });
    }
    }, [nextScreen]);
  /* ── Ein- und Ausflug von oben nach unten ── */
  useEffect(() => {
    if (visible) {
      isExitingLeft.current = false;
      setIsMounted(true);
      animY.setValue(-winH);
      animNameX.setValue(0);
      fadeAnim.setValue(0);

      focusTimer.current = setTimeout(() => {
        if (manualModeRef.current) nameRef.current?.focus();
        else searchRef.current?.focus();
      }, 240);

      Animated.parallel([
        Animated.timing(animY, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Wenn bereits nach links geschoben wurde, nicht nach oben animieren
      if (isExitingLeft.current) return;

      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(animY, {
          toValue: -winH,
          duration: durationOut,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: durationOut,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }

    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, [visible, durationIn, durationOut, winH, animY, animNameX, fadeAnim]);

  useEffect(() => {
    if (!visible) return;
  }, [visible, initialName, initialStreet, initialCity]);

  useEffect(() => {
    const listener = addSearchListener((items) => {
      setResults(items ?? []);
      setSearching(false);
    });
    return () => {
      listener.remove();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  /* ── Event Handler ── */
  const onChangeQuery = useCallback((text) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(() => search(text), DEBOUNCE_MS);
  }, []);

  const handleSelect = useCallback(async (item) => {
    try {
      const info = await fetchPlace(item.identifier).catch(() => null);

      const name = item.title ?? "";
      let street = "";
      let city = "";

      if (item.subtitle) {
        const parts = item.subtitle.split(",").map((p) => p.trim());
        street = parts[0] ?? "";

        if (!/\d/.test(street) && info?.address) {
          street = info.address.split(",").map((p) => p.trim())[0] ?? street;
        }

        const cityWithZip = parts.find((p) => /^\d{4,}/.test(p));

        if (cityWithZip) {
          city = cityWithZip;
        } else if (info?.address) {
          const ap = info.address.split(",").map((p) => p.trim());
          city = ap[2] ?? (parts.length > 2 ? parts[2] : parts[1] ?? "");
        } else {
          city = parts.length > 2 ? parts[2] : parts[1] ?? "";
        }
      }

      const nameLower = name.trim().toLowerCase();
      const streetLower = street.trim().toLowerCase();
      const isSameStart =
        nameLower &&
        streetLower &&
        (nameLower.startsWith(streetLower) || streetLower.startsWith(nameLower));

      const finalName = isSameStart ? "" : name;

      setYourName(finalName);
      setYourStreet(street);
      setYourCity(city);
      setErrors({ nameErr: "", streetErr: "", cityErr: "" });
      setResults([]);
      setQuery("");
      setManualMode(true);

      setTimeout(() => {
        if (!finalName.trim()) nameRef.current?.focus();
        else if (!street.trim()) streetRef.current?.focus();
        else cityRef.current?.focus();
      }, 50);
    } catch (e) {
      console.warn("fetchPlace error:", e);
    }
  }, []);

  const goManual = useCallback(() => {
    setYourName(query);
    setResults([]);
    setManualMode(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [query]);

  const backToSearch = useCallback(() => {
    setManualMode(false);
    setQuery("");
    setResults([]);
    setErrors({ nameErr: "", streetErr: "", cityErr: "" });
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const validateAndContinue = useCallback(async () => {
    const next = { nameErr: "", streetErr: "", cityErr: "" };

    if (!yourName?.trim())
      next.nameErr =
        t("validation.nameCompany.required") || "Bitte Firmenname eingeben";
    if (!yourStreet?.trim())
      next.streetErr = t("validation.street.required") || "Bitte Straße eingeben";
    if (!yourCity?.trim())
      next.cityErr = t("validation.city.required") || "Bitte Ort eingeben";

    if (next.nameErr || next.streetErr || next.cityErr) {
      setErrors(next);
      if (next.nameErr) nameRef.current?.focus();
      else if (next.streetErr) streetRef.current?.focus();
      else cityRef.current?.focus();
      return;
    }

    const now = Date.now();
    if (now - lastClick.current < DOUBLE_TAP_GUARD_MS) return;
    lastClick.current = now;

    const payload = {
      name: yourName.trim(),
      street: yourStreet.trim(),
      city: yourCity.trim(),
    };

  try {
      await Promise.all([
        EncryptedStorage.setItem("yourName", payload.name),
        EncryptedStorage.setItem("yourStreet", payload.street),
        EncryptedStorage.setItem("yourCity", payload.city),
      ]);

      setErrors({ nameErr: "", streetErr: "", cityErr: "" });

      isExitingLeft.current = true;

      // 1. SOFORT an StartApp melden, damit beide Animationen im selben Frame starten!
      onSaved?.(payload.name, payload.street, payload.city);

      // 2. Karte nach links schieben (Backdrop NICHT faden, damit nichts blitzt)
     // CompanySearchModal.js -> validateAndContinue
Animated.timing(animNameX, {
  toValue: -winW,
  duration: 350,
  useNativeDriver: true,
}).start(({ finished }) => {
  if (finished) {
    // Backdrop & Modal sauber entladen
    fadeAnim.setValue(0);
    setIsMounted(false);
    isExitingLeft.current = false;
  }
      });
    } catch (error) {
      console.error("Failed to access Keychain", error);
      Alert.alert(
        t("companySearchModal.errorTitle") || "Fehler",
        t("companySearchModal.saveErrorMsg") ||
          "Deine Daten konnten nicht gespeichert werden.",
        [{ text: t("companySearchModal.btnOk") || "OK" }]
      );
    }
  }, [yourName, yourStreet, yourCity, t, onSaved, animNameX, fadeAnim, winW, durationOut]);

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderResultItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
        style={styles.suggestionItem}
      >
        <View style={styles.resultIconWrapper}>
          <MaterialIcons name="location-on" size={20} color={WARM.iconPin} />
        </View>

        <View style={styles.resultTextContainer}>
          <Text style={styles.suggestionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {Boolean(item.subtitle) && (
            <Text style={styles.suggestionSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>

        <MaterialIcons name="north-west" size={16} color={WARM.iconArrow} />
      </TouchableOpacity>
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback(
    (item, i) => item.identifier?.toString() ?? String(i),
    []
  );

  if (!isMounted) return null;

  return (
    <View style={styles.root}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Zentrierter Bereich zwischen Topbar und Tastatur */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stage,
          {
            top: stageTop,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              height: panelHeight,
              opacity: fadeAnim,
              transform: [
                { translateY: animY },
                { translateX: animNameX },
              ],
            },
          ]}
        >
          {/* ══ ZONE 0 · Kopfzeile ════════════════════════════════════ */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.badgeHub}>
                <View style={styles.statusDot} />
                <Text style={styles.badgeHubText}>
                  {manualMode
                    ? t("companySearchModal.badgeManual") || "ADRESSE PRÜFEN"
                    : t("companySearchModal.badgeAuto") || "AUTO-SUCHE"}
                </Text>
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {manualMode
                  ? t("companySearchModal.titleManual") || "Firmendaten"
                  : t("companySearchModal.titleAuto") || "Unternehmen finden"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color={WARM.iconClose} />
            </TouchableOpacity>
          </View>

          {/* ══ MODUS A · SUCHE ══════════════════════════════════════ */}
          <View style={[styles.mode, manualMode && styles.modeHidden]}>
            <View style={styles.modeHead}>
              <Field
                value={query}
                inputRef={searchRef}
                iconName="search"
                showError={false}
                onChangeText={onChangeQuery}
                placeholder={
                  t("companySearchModal.searchPlaceholder") ||
                  "Firmenname oder Ort eingeben..."
                }
                returnKeyType="search"
                onSubmitEditing={goManual}
              />
            </View>

            <View style={styles.modeBody}>
              <View style={styles.listCard}>
                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={keyExtractor}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="none"
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={renderSeparator}
                    renderItem={renderResultItem}
                    contentContainerStyle={styles.listContent}
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    {searching ? (
                      <ActivityIndicator
                        size="small"
                        color={WARM.iconLeading}
                      />
                    ) : (
                      <MaterialIcons
                        name="travel-explore"
                        size={32}
                        color={WARM.iconEmpty}
                      />
                    )}
                    <Text style={styles.placeholderText}>
                      {query.length === 0
                        ? t("companySearchModal.promptTypeSuggestions") ||
                          "Tippe, um Vorschläge anzuzeigen"
                        : searching
                        ? t("companySearchModal.searching") ||
                          "Suche nach Orten..."
                        : t("companySearchModal.noResults") ||
                          "Keine Treffer gefunden"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modeFoot}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={goManual}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name="edit-note"
                  size={22}
                  color={WARM.iconLeading}
                  style={styles.buttonIconLeft}
                />
                <Text style={styles.buttonSecondaryText}>
                  {t("companySearchModal.btnManual") || "Manuell eingeben"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ══ MODUS B · MANUELL ════════════════════════════════════ */}
          <View style={[styles.mode, !manualMode && styles.modeHidden]}>
            <View style={styles.modeBodyScrollable}>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Field
                  inputRef={nameRef}
                  iconName="business"
                  value={yourName}
                  onChangeText={(v) => {
                    setYourName(v);
                    if (errors.nameErr)
                      setErrors((p) => ({ ...p, nameErr: "" }));
                  }}
                  placeholder={
                    t("companySearchModal.namePlaceholder") || "Firmenname"
                  }
                  error={errors.nameErr}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => streetRef.current?.focus()}
                />

                <Field
                  inputRef={streetRef}
                  iconName="add-road"
                  value={yourStreet}
                  onChangeText={(v) => {
                    setYourStreet(v);
                    if (errors.streetErr)
                      setErrors((p) => ({ ...p, streetErr: "" }));
                  }}
                  placeholder={
                    t("companySearchModal.streetPlaceholder") ||
                    "Straße & Hausnummer"
                  }
                  error={errors.streetErr}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => cityRef.current?.focus()}
                />

                <Field
                  inputRef={cityRef}
                  iconName="location-city"
                  value={yourCity}
                  onChangeText={(v) => {
                    setYourCity(v);
                    if (errors.cityErr)
                      setErrors((p) => ({ ...p, cityErr: "" }));
                  }}
                  placeholder={
                    t("companySearchModal.cityPlaceholder") || "PLZ & Ort"
                  }
                  error={errors.cityErr}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={validateAndContinue}
                />
              </ScrollView>
            </View>

            <View style={styles.modeFoot}>
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={validateAndContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonPrimaryText}>
                  {t("companySearchModal.btnContinue") || "Übernehmen"}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                  style={styles.buttonIconRight}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonGhost}
                onPress={backToSearch}
                activeOpacity={0.6}
              >
                <Text style={styles.buttonGhostText}>
                  {t("companySearchModal.btnBackToSearch") ||
                    "Zurück zur Suche"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/* ── 5. Styles ─────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    elevation: 15,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WARM.backdrop,
  },
  stage: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    backgroundColor: WARM.bg,
    borderRadius: PANEL.panelRadius ?? M.panelRadius,
    paddingHorizontal: M.panelPadH,
    paddingTop: M.panelPadV,
    paddingBottom: M.panelPadV,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
    overflow: "hidden",
  },

  /* ── Zonen ── */
  mode: {
    flex: 1,
    minHeight: 0,
    marginVertical: -9,
  },
  modeHidden: {
    display: "none",
  },
  modeHead: {
    flexShrink: 0,
  },
  modeBody: {
    flex: 1,
    minHeight: 0,
    marginTop: M.zoneGap,
  },
  modeBodyScrollable: {
    flex: 1,
    minHeight: 0,
  },
  modeFoot: {
    flexShrink: 0,
    paddingTop: M.footGap,
  },

  /* ── Header ── */
  header: {
    height: M.headerH,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: M.headerGap,
    flexShrink: 0,
  },
  headerTitleWrap: {
    flex: 1,
    justifyContent: "space-between",
    height: "100%",
  },
  badgeHub: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 20,
    backgroundColor: WARM.accentBadgeBg,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARM.accentBadgeBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARM.iconLeading,
    marginRight: 6,
  },
  badgeHubText: {
    color: WARM.iconArrow,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  title: {
    color: WARM.textMain,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 240, 225, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  /* ── Inputs ── */
  formScroll: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  fieldWrap: {
    width: "100%",
  },
  inputRow: {
    height: M.inputH,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WARM.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
  },
  inputRowError: {
    borderColor: WARM.errorBorder,
    backgroundColor: WARM.errorBg,
  },
  leadingIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 14,
    paddingRight: 36,
    paddingVertical: 0,
    color: WARM.textMain,
    fontSize: 14.5,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  errorText: {
    height: M.errorH,
    lineHeight: M.errorH,
    color: WARM.error,
    fontSize: 11,
    paddingLeft: 6,
    fontWeight: "500",
  },
  errorHidden: {
    opacity: 0,
  },

  /* ── Liste ── */
  listCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255, 240, 225, 0.02)",
    borderWidth: 1,
    borderColor: WARM.surfaceBorderSubtle,
  },
  listContent: {
    paddingVertical: 4,
  },
  placeholderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    color: WARM.textMuted,
    fontSize: 12.5,
    marginTop: 8,
    textAlign: "center",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(251, 146, 60, 0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  resultTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: WARM.surfaceBorderSubtle,
    marginHorizontal: 12,
  },
  suggestionTitle: {
    color: WARM.textMain,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionSubtitle: {
    color: WARM.textMuted,
    fontSize: 11.5,
    marginTop: 1.5,
  },

  /* ── Buttons ── */
  buttonPrimary: {
    width: "100%",
    height: M.btnPrimary,
    backgroundColor: WARM.primary,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonSecondary: {
    width: "100%",
    height: M.btnSecondary,
    backgroundColor: WARM.surface,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
  },
  buttonSecondaryText: {
    color: WARM.textMain,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGhost: {
    width: "100%",
    height: M.btnGhost,
    justifyContent: "center",
    alignItems: "center",
    marginTop: M.btnGap,
  },
  buttonGhostText: {
    color: WARM.textMuted,
    fontSize: 12.5,
    fontWeight: "500",
  },
  buttonIconLeft: { marginRight: 8 },
  buttonIconRight: { marginLeft: 6 },
});

export default CompanySearchModal;