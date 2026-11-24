/* ═══════════════════════════════════════════════════════════════════════
- CompanySearchModal.js
- ───────────────────────────────────────────────────────────────────────
-  1. Imports
-  2. Tokens & Keyboard-Cache
-  3. Subkomponenten (Field)
-  4. Hauptkomponente (Layout ohne interne Animationen)
-  5. Themed Styles (createStyles)
- ═══════════════════════════════════════════════════════════════════════ */

import MaterialIcons from "@react-native-vector-icons/material-icons";
import { addSearchListener, fetchPlace, search } from "expo-mapkit";
import { searchGmbh } from "../inc/string.js";
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
import { darkColors, lightColors } from "../inc/colors.js";
import { useTheme } from "../comp/themeContext";
import { useThemedStyles } from "../comp/themeStyles";
import "../local/i18n.js";
import Info, { useInfoModal } from "../comp/info.js";

/* ── 2. Tokens & Keyboard-Cache ────────────────────────────────────────── */
const DEBOUNCE_MS = 250;
const DOUBLE_TAP_GUARD_MS = 1000;

const KB_HEIGHT_KEY = "cached_kb_height";
let cachedKbHeight = null;

// Einmalig beim Laden des Moduls vorab aus dem Storage in den RAM holen
EncryptedStorage.getItem(KB_HEIGHT_KEY)
  .then((val) => {
    const parsed = Number(val);
    if (parsed > 0) cachedKbHeight = parsed;
  })
  .catch(() => {});

const M = {
  panelPadH: 20,
  panelPadV: 18,
  panelRadius: 24,

  headerH: 46,
  headerGap: 14,

  inputH: 41,
  fieldGap: 12,

  listMin: 132,
  zoneGap: 10,

  btnPrimary: 48,
  btnSecondary: 46,
  btnGhost: 34,
  btnGap: 8,

  footGap: 12,
};

const FIELD_H_BARE = M.inputH;
const CHROME = M.panelPadV * 2 + M.headerH + M.headerGap;

const H_SEARCH =
  CHROME + FIELD_H_BARE + M.zoneGap + M.listMin + M.footGap + M.btnSecondary;

const H_MANUAL =
  CHROME +
  FIELD_H_BARE * 3 +
  M.fieldGap * 2 +
  M.footGap +
  M.btnPrimary +
  M.btnGap +
  M.btnGhost;

const PANEL = {
  widthRatio: 0.92,
  maxWidth: 480,
  minHeight: Math.max(H_SEARCH, H_MANUAL),
  idealHeight: Math.max(H_SEARCH, H_MANUAL) + 60,
  gutter: 12,
};

/* ── 3. Subkomponente: Eingabefeld ─────────────────────────────────────── */
const Field = memo(function Field({
  value,
  onChangeText,
  placeholder,
  error,
  iconName,
  iconColor,
  inputRef,
  returnKeyType = "next",
  onSubmitEditing,
  blurOnSubmit = false,
  onPressIcon,
  style,
  inputRowStyle,
  styles,
  c,
}) {
  const handleClear = useCallback(() => onChangeText(""), [onChangeText]);

  return (
    <View style={[styles.fieldWrap, style]}>
      <View
        style={[
          styles.inputRow,
          inputRowStyle,
          Boolean(error) && styles.inputRowError,
        ]}
      >
        {Boolean(iconName) && (
          <TouchableOpacity
            onPress={onPressIcon}
            disabled={!onPressIcon}
            activeOpacity={0.7}
            style={styles.iconHitArea}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={iconName}
              size={20}
              color={iconColor ?? c.iconLeading ?? c.titleMain}
              style={styles.leadingIcon}
            />
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          autoCapitalize="none"
          spellCheck={false}
          style={[styles.input, Boolean(iconName) && styles.inputWithIcon]}
          placeholder={placeholder}
          placeholderTextColor={c.textDim ?? c.subTitleMain}
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
            <MaterialIcons
              name="cancel"
              size={18}
              color={c.iconClear ?? "#F87171"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

/* ── 4. Hauptkomponente ────────────────────────────────────────────────── */
const CompanySearchModal = ({
  visible,
  onClose,
  onSaved,
  initialName = "",
  initialStreet = "",
  initialCity = "",
  style,
  manual = false,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { infoVisible, infoMessage, openInfo, closeInfo } = useInfoModal();

  const theme = useTheme();
  const c =
    theme?.colors ?? (theme?.mode === "dark" ? darkColors : lightColors);
  const styles = useThemedStyles(createStyles);

  /* ── State & Refs ── */
  const [yourName, setYourName] = useState(initialName);
  const [yourStreet, setYourStreet] = useState(initialStreet);
  const [yourCity, setYourCity] = useState(initialCity);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(manual);
  const [kbHeight, setKbHeight] = useState(() => {
    if (cachedKbHeight) return cachedKbHeight;
    return Platform.OS === "ios" ? (insets.bottom > 0 ? 291 : 216) : 280;
  });
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

  /* ── Event Handler: Query ── */
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

  /* ── Tastatur-Tracking mit 2-Stufen-Cache (RAM + EncryptedStorage) ── */
  useEffect(() => {
    if (!cachedKbHeight) {
      EncryptedStorage.getItem(KB_HEIGHT_KEY)
        .then((val) => {
          const parsed = Number(val);
          if (parsed > 0) {
            cachedKbHeight = parsed;
            setKbHeight((prev) => (prev === parsed ? prev : parsed));
          }
        })
        .catch(() => {});
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const onShow = (e) => {
      const h = Math.round(e?.endCoordinates?.height ?? 0);
      console.log("duration", e.duration);
      console.log("endCoordinates", e.endCoordinates);
      if (h > 0 && h !== cachedKbHeight) {
        cachedKbHeight = h;
        setKbHeight(h);
        EncryptedStorage.setItem(KB_HEIGHT_KEY, String(h)).catch(() => {});
      }
    };

    const sub = Keyboard.addListener(showEvent, onShow);
    return () => sub.remove();
  }, []);

  /* ── Auto-Focus & Auto-Search beim Einblenden ── */
  useEffect(() => {
    if (visible) {
      nameRef.current?.focus();

      const hasFullAddress = Boolean(
        initialCity?.trim() && initialStreet?.trim() && initialName?.trim()
      );

      if (hasFullAddress) {
        setYourCity(initialCity);
        setYourStreet(initialStreet);
        setYourName(initialName);
        setManualMode(true);
      } else {
        setManualMode(false);

        // Sofort fokussieren -> Tastatur & Modal fahren synchron ein
        searchRef.current?.focus();

        // MapKit-Suche erst nach der Slide-Animation starten (kein Re-Render im Flug)
        const searchTerm = searchGmbh(initialName);
        if (searchTerm) {
          focusTimer.current = setTimeout(() => {
            onChangeQuery(searchTerm);
          }, 350);
        }
      }
    }

    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, [visible, initialCity, initialStreet, initialName, onChangeQuery]);

  /* ── MapKit Search Listener ── */
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

  /* ── Layout-Berechnungen ── */
  const stageTop = useMemo(() => insets.top * 1.7, [insets.top]);
  const panelWidth = useMemo(
    () => Math.min(winW * PANEL.widthRatio, PANEL.maxWidth),
    [winW]
  );

  const panelHeight = useMemo(() => {
    const bottomSpace = kbHeight > 0 ? kbHeight : insets.bottom;
    const free = winH - stageTop - bottomSpace - PANEL.gutter;
    const needed = manualMode ? H_MANUAL : H_SEARCH;
    if (free <= needed) {
      return Math.round(Math.max(free, 240));
    }
    return Math.round(Math.min(needed + 60, free));
  }, [winH, stageTop, kbHeight, insets.bottom, manualMode]);

  /* ── Event Handler ── */
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

  const validateAndContinue = useCallback(() => {
    const next = { nameErr: "", streetErr: "", cityErr: "" };

    if (!yourName?.trim())
      next.nameErr =
        t("validation.nameCompany.required") || "Bitte Firmenname eingeben";
    if (!yourStreet?.trim())
      next.streetErr =
        t("validation.street.required") || "Bitte Straße eingeben";
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

    Promise.all([
      EncryptedStorage.setItem("yourName", payload.name),
      EncryptedStorage.setItem("yourStreet", payload.street),
      EncryptedStorage.setItem("yourCity", payload.city),
    ]).catch((err) => console.error("Storage background save error:", err));

    setErrors({ nameErr: "", streetErr: "", cityErr: "" });
    onSaved?.(payload.name, payload.street, payload.city);
  }, [yourName, yourStreet, yourCity, t, onSaved]);

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [styles]
  );

  const renderResultItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
        style={styles.suggestionItem}
      >
        <TouchableOpacity
          style={styles.resultIconWrapper}
          activeOpacity={0.7}
          onPress={() =>
            openInfo(
              t("info.companyLocation") ||
                "Gefundener Unternehmensstandort aus der Kartensuche."
            )
          }
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons
            name="location-on"
            size={20}
            color={c.iconPin ?? c.badgeText}
          />
        </TouchableOpacity>

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

        <MaterialIcons
          name="north-west"
          size={16}
          color={c.iconArrow ?? c.subTitleMain}
        />
      </TouchableOpacity>
    ),
    [handleSelect, openInfo, t, styles, c]
  );

  const keyExtractor = useCallback(
    (item, i) => item.identifier?.toString() ?? String(i),
    []
  );

  if (!visible) return null;

  return (
    <View style={[styles.root, style]}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Zentrierter Bereich zwischen Topbar und Tastatur */}
      <View
        pointerEvents="box-none"
        style={[styles.stage, { top: stageTop }]}
      >
        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              height: panelHeight,
            },
          ]}
        >
          {/* ══ ZONE 0 · Kopfzeile ════════════════════════════════════ */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <TouchableOpacity
                style={styles.badgeHub}
                activeOpacity={0.7}
                onPress={() =>
                  openInfo(
                    manualMode
                      ? t("info.manualMode") ||
                          "Manueller Eingabemodus für Adressdaten."
                      : t("info.searchMode") ||
                          "Automatische Standortsuche über MapKit."
                  )
                }
              >
                <View style={styles.statusDot} />
                <Text style={styles.badgeHubText}>
                  {manualMode
                    ? t("companySearchModal.badgeManual")
                    : t("companySearchModal.badgeAuto")}
                </Text>
              </TouchableOpacity>

              <Text style={styles.title} numberOfLines={1}>
                {manualMode
                  ? t("companySearchModal.titleManual")
                  : t("companySearchModal.titleAuto")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color={c.titleMain} />
            </TouchableOpacity>
          </View>

          {/* ══ MODUS A · SUCHE ══════════════════════════════════════ */}
          <View style={[styles.mode, manualMode && styles.modeHidden]}>
            <View style={styles.modeHead}>
              <Field
                styles={styles}
                c={c}
                value={query}
                inputRef={searchRef}
                iconName="search"
                onChangeText={onChangeQuery}
                placeholder={t("companySearchModal.searchPlaceholder")}
                returnKeyType="search"
                onSubmitEditing={goManual}
                onPressIcon={() =>
                  openInfo(
                    t("info.companySearch") ||
                      "Gib den Firmennamen oder Ort ein, um passende Standorte zu finden."
                  )
                }
              />
            </View>

            <View style={styles.modeBody}>
              <View style={styles.listCard}>
                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    extraData={c.mode}
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
                        color={c.iconLeading ?? c.titleMain}
                      />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          openInfo(
                            t("info.companySearchHint") ||
                              "Tippe einen Firmennamen ein oder wechsle zur manuellen Eingabe."
                          )
                        }
                      >
                        <MaterialIcons
                          name="travel-explore"
                          size={32}
                          color={c.iconEmpty ?? c.subTitleMain}
                        />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.placeholderText}>
                      {query.length === 0
                        ? t("companySearchModal.promptTypeSuggestions")
                        : searching
                        ? t("companySearchModal.searching")
                        : t("companySearchModal.noResults")}
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
                  color={c.iconLeading ?? c.titleMain}
                  style={styles.buttonIconLeft}
                />
                <Text style={styles.buttonSecondaryText}>
                  {t("companySearchModal.btnManual")}
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
                  styles={styles}
                  c={c}
                  style={styles.manualFieldFlex}
                  inputRowStyle={styles.manualInputRowFlex}
                  inputRef={nameRef}
                  iconName="business"
                  value={yourName}
                  onChangeText={(v) => {
                    setYourName(v);
                    if (errors.nameErr)
                      setErrors((p) => ({ ...p, nameErr: "" }));
                  }}
                  placeholder={t("companySearchModal.namePlaceholder")}
                  error={errors.nameErr}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => streetRef.current?.focus()}
                  onPressIcon={() =>
                    openInfo(
                      t("info.companyName") ||
                        "Der offizielle Name des Unternehmens für das Anschreiben."
                    )
                  }
                />

                <Field
                  styles={styles}
                  c={c}
                  style={styles.manualFieldFlex}
                  inputRowStyle={styles.manualInputRowFlex}
                  inputRef={streetRef}
                  iconName="add-road"
                  value={yourStreet}
                  onChangeText={(v) => {
                    setYourStreet(v);
                    if (errors.streetErr)
                      setErrors((p) => ({ ...p, streetErr: "" }));
                  }}
                  placeholder={t("companySearchModal.streetPlaceholder")}
                  error={errors.streetErr}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => cityRef.current?.focus()}
                  onPressIcon={() =>
                    openInfo(
                      t("info.companyStreet") ||
                        "Straße und Hausnummer des Unternehmens."
                    )
                  }
                />

                <Field
                  styles={styles}
                  c={c}
                  style={styles.manualFieldFlex}
                  inputRowStyle={styles.manualInputRowFlex}
                  inputRef={cityRef}
                  iconName="location-city"
                  value={yourCity}
                  onChangeText={(v) => {
                    setYourCity(v);
                    if (errors.cityErr)
                      setErrors((p) => ({ ...p, cityErr: "" }));
                  }}
                  placeholder={t("companySearchModal.cityPlaceholder")}
                  error={errors.cityErr}
                  returnKeyType="done"
                  onSubmitEditing={validateAndContinue}
                  blurOnSubmit={false}
                  onPressIcon={() =>
                    openInfo(
                      t("info.companyCity") ||
                        "Postleitzahl und Ort des Unternehmens."
                    )
                  }
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
                  {t("companySearchModal.btnContinue")}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={c.titleMain}
                  style={styles.buttonIconRight}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={backToSearch}
                activeOpacity={0.6}
              >
                <Text style={styles.buttonSecondaryText}>
                  {t("companySearchModal.btnBackToSearch")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <Info visible={infoVisible} onClose={closeInfo} message={infoMessage} />
    </View>
  );
};

/* ── 5. Themed Styles ──────────────────────────────────────────────────── */
const createStyles = (c) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 90,
      elevation: 15,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    stage: {
      position: "absolute",
      left: 0,
      right: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    panel: {
      backgroundColor: c.namePanel,
      borderRadius: M.panelRadius,
      paddingHorizontal: M.panelPadH,
      paddingTop: M.panelPadV,
      paddingBottom: M.panelPadV,
      borderWidth: 1,
      borderColor: c.actionCardBorder,
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
      alignItems: "center",
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
      backgroundColor: c.badge,
      paddingHorizontal: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.actionCardBorder,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.badgeDot,
      marginRight: 6,
    },
    badgeHubText: {
      color: c.badgeText,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
    title: {
      color: c.titleMain,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.actionCard,
      borderWidth: 1,
      borderColor: c.actionCardBorder,
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
      gap: M.fieldGap,
    },
    manualFieldFlex: {
      flex: 1,
      minHeight: M.inputH,
    },
    manualInputRowFlex: {
      flex: 1,
      height: "100%",
    },
    fieldWrap: {
      width: "100%",
    },
    inputRow: {
      height: M.inputH,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:'transparent',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.actionCardBorder,
    },
    inputRowError: {
      borderColor: c.errorBorder ?? "rgba(248, 113, 113, 0.65)",
      borderWidth: 1.5,
      backgroundColor: c.errorBg ?? "rgba(248, 113, 113, 0.12)",
    },
    iconHitArea: {
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 12,
    },
    leadingIcon: {
      marginRight: 0,
    },
    input: {
      flex: 1,
      height: "100%",
      paddingLeft: 14,
      paddingRight: 36,
      paddingVertical: 0,
      color: c.titleMain,
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

    /* ── Liste ── */
    listCard: {
      flex: 1,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.actionCardBorder,
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
      color: c.subTitleMain,
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
      backgroundColor: c.resultIconBg ?? "rgba(255, 255, 255, 0.08)",
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
      backgroundColor: c.actionCardBorder,
      marginHorizontal: 12,
    },
    suggestionTitle: {
      color: c.titleMain,
      fontSize: 14,
      fontWeight: "600",
    },
    suggestionSubtitle: {
      color: c.subTitleMain,
      fontSize: 11.5,
      marginTop: 1.5,
    },

    /* ── Buttons ── */
    buttonPrimary: {
      marginBottom: 10,
      width: "100%",
      height: 46,
      backgroundColor:"transparent",
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: c.buttonSearch ?? c.badge,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    buttonPrimaryText: {
      color: c.titleMain,
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    buttonSecondary: {
      width: "100%",
      height: 46,
      backgroundColor: "transparent",
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.actionCardBorder,
    },
    buttonSecondaryText: {
      color: c.titleMain,
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
      color: c.subTitleMain,
      fontSize: 12.5,
      fontWeight: "500",
    },
    buttonIconLeft: { marginRight: 8 },
    buttonIconRight: { marginLeft: 6 },
  });

export default CompanySearchModal;