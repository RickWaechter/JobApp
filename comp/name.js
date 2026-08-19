import MaterialIcons from "@react-native-vector-icons/material-icons";
import { addSearchListener, fetchPlace, search } from "expo-mapkit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";
import colors from "../inc/colors.js";
import keyboardHeight from "../comp/keyboardHeight.js";
import "../local/i18n.js";

const { height, width } = Dimensions.get("window");

/* ── Feste Maße ─────────────────────────────────────────── */
const PANEL_W = width * 0.9;
const PANEL_H = Math.min(height * 0.52, 460);

/* ── Wiederverwendbares Eingabefeld ────────────────────── */
const Field = ({
  value,
  onChangeText,
  placeholder,
  error,
  inputRef,
  autoFocus = false,
  returnKeyType = "next",
  onSubmitEditing,
}) => (
  <View style={styles.fieldWrap}>
    <View style={styles.inputRow}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="gray"
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCorrect={false}
      />
      {value?.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          style={styles.clearBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="cancel" size={20} color="gray" />
        </TouchableOpacity>
      )}
    </View>

    <Text
      style={[styles.error, !error && styles.errorHidden]}
      numberOfLines={1}
    >
      {error || " "}
    </Text>
  </View>
);

/**
 * Firmensuche & Adresseingabe – Slide-In von oben nach unten.
 */
const CompanySearchModal = ({
  visible,
  onClose,
  onSaved,
  initialName = "",
  initialStreet = "",
  initialCity = "",
}) => {
  const { t } = useTranslation();

  /* ── State ───────────────────────────────────────────── */
  const [yourName, setYourName] = useState(initialName);
  const [yourStreet, setYourStreet] = useState(initialStreet);
  const [yourCity, setYourCity] = useState(initialCity);
const searchRef = useRef(null)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [manualMode, setManualMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [errors, setErrors] = useState({
    nameErr: "",
    streetErr: "",
    cityErr: "",
  });

  const nameRef = useRef(null);
  const streetRef = useRef(null);
  const cityRef = useRef(null);
  const lastClick = useRef(0);

  /* Target Position leicht nach oben versetzt (-100) für optimale Sichtbarkeit über der Tastatur */
  const TARGET_Y = -100;

  /* ── Slide Animation (Von oben nach unten) ────────────── */
  const slideAnim = useRef(new Animated.Value(-height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: TARGET_Y,
          duration: 380,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100)
    } else {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -height,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => setIsMounted(false));
    }
  }, [visible]);

  /* ── Reset beim Öffnen ───────────────────────────────── */
  useEffect(() => {
    if (!visible) return;
    setYourName(initialName);
    setYourStreet(initialStreet);
    setYourCity(initialCity);
    setQuery("");
    setResults([]);
    setSearching(false);
    setManualMode(false);
    setErrors({ nameErr: "", streetErr: "", cityErr: "" });
  }, [visible, initialName, initialStreet, initialCity]);

  /* ── MapKit-Listener ─────────────────────────────────── */
  useEffect(() => {
    const listener = addSearchListener((items) => {
      setResults(items ?? []);
      setSearching(false);
    });
    return () => listener.remove();
  }, []);

  const onChangeQuery = (text) => {
    setQuery(text);
    if (text.trim().length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    search(text);
  };

  /* ── Auswahl aus der Liste ───────────────────────────── */
  const handleSelect = async (item) => {
    try {
      const info = await fetchPlace(item.identifier).catch(() => null);

      const name = item.title ?? "";
      let street = "";
      let city = "";

      if (item.subtitle) {
        const parts = item.subtitle.split(",").map((p) => p.trim());
        street = parts[0] ?? "";

        if (!/\d/.test(street) && info?.address) {
          const addressParts = info.address.split(",").map((p) => p.trim());
          street = addressParts[0] ?? street;
        }

        const cityWithZip = parts.find((p) => /^\d{4,}/.test(p));

        if (cityWithZip) {
          city = cityWithZip;
        } else if (info?.address) {
          const addressParts = info.address.split(",").map((p) => p.trim());
          city =
            addressParts[2] ?? (parts.length > 2 ? parts[2] : parts[1] ?? "");
        } else {
          city = parts.length > 2 ? parts[2] : parts[1] ?? "";
        }
      }

      const nameLower = name.trim().toLowerCase();
      const streetLower = street.trim().toLowerCase();
      const isSameStart =
        nameLower &&
        streetLower &&
        (nameLower.startsWith(streetLower) ||
          streetLower.startsWith(nameLower));

      const finalName = isSameStart ? "" : name;

      setYourName(finalName);
      setYourStreet(street);
      setYourCity(city);
      setErrors({ nameErr: "", streetErr: "", cityErr: "" });
      setResults([]);
      setQuery("");
      setManualMode(true);

      const allFilled = Boolean(
        finalName.trim() && street.trim() && city.trim()
      );

      if (!allFilled) {
        setTimeout(() => {
          nameRef.current?.focus();
        }, 100);
      }
    } catch (e) {
      console.warn("fetchPlace error:", e);
    }
  };

  /* ── Manuell eingeben ────────────────────────────────── */
  const goManual = () => {
    setYourName(query);
    setResults([]);
    setManualMode(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const backToSearch = () => {
    setManualMode(false);
    setQuery("");
    setResults([]);
    setErrors({ nameErr: "", streetErr: "", cityErr: "" });
  };

  /* ── Validieren + Speichern ──────────────────────────── */
  const validateAndContinue = async () => {
    const next = { nameErr: "", streetErr: "", cityErr: "" };
    if (!yourName?.trim()) next.nameErr = t("validation.nameCompany.required");
    if (!yourStreet?.trim()) next.streetErr = t("validation.street.required");
    if (!yourCity?.trim()) next.cityErr = t("validation.city.required");

    if (next.nameErr || next.streetErr || next.cityErr) {
      setErrors(next);
      return;
    }

    const now = Date.now();
    if (now - lastClick.current < 1000) return;
    lastClick.current = now;

    try {
      await EncryptedStorage.setItem("yourName", yourName.trim());
      await EncryptedStorage.setItem("yourStreet", yourStreet.trim());
      await EncryptedStorage.setItem("yourCity", yourCity.trim());

      setErrors({ nameErr: "", streetErr: "", cityErr: "" });
      Keyboard.dismiss();
      onSaved?.(yourName.trim(), yourStreet.trim(), yourCity.trim());
      setTimeout(() => {
        onClose?.();
      }, 300);
    } catch (error) {
      console.error("Failed to access Keychain", error);
      Alert.alert("Fehler", "Deine Daten konnten nicht gespeichert werden.", [
        { text: "OK" },
      ]);
    }
  };

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  const renderResultItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
        style={styles.suggestionItem}
      >
        <Text style={styles.suggestionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text style={styles.suggestionSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </TouchableOpacity>
    ),
    []
  );

  if (!isMounted) return null;

  /* ── Render ──────────────────────────────────────────── */
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Slide-In Y (von oben nach unten) */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.panel}>
          {/* Kopfzeile */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {manualMode ? t("companyName") : t("searchCompany")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* ══ SUCHMODUS ══ */}
          {!manualMode ? (
            <View style={styles.modeContainer}>
              <Field
                value={query}
                inputRef={searchRef}
                onChangeText={onChangeQuery}
                placeholder={t("searchCompany")}
                returnKeyType="search"
                
              />

              <View style={styles.slot}>
                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(item, i) =>
                      item.identifier?.toString() ?? String(i)
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={renderSeparator}
                    renderItem={renderResultItem}
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <MaterialIcons
                      name={searching ? "hourglass-empty" : "search"}
                      size={28}
                      color="rgba(255,255,255,0.25)"
                    />
                    <Text style={styles.placeholderText}>
                      {query.length === 0
                        ? t("searchResult")
                        : searching
                        ? "…"
                        : "—"}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={goManual}
                activeOpacity={0.75}
              >
                <Text style={styles.buttonText}>{t("enterManually")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ══ MANUELLE EINGABE ══ */
            <View style={styles.modeContainer}>
              <View style={styles.manualFields}>
                <Field
                  inputRef={nameRef}
                  value={yourName}
                  onChangeText={(v) => {
                    setYourName(v);
                    if (errors.nameErr)
                      setErrors((p) => ({ ...p, nameErr: "" }));
                  }}
                  placeholder={t("companyName")}
                  error={errors.nameErr}
                  returnKeyType="next"
                  onSubmitEditing={() => streetRef.current?.focus()}
                />

                <Field
                  inputRef={streetRef}
                  value={yourStreet}
                  onChangeText={(v) => {
                    setYourStreet(v);
                    if (errors.streetErr)
                      setErrors((p) => ({ ...p, streetErr: "" }));
                  }}
                  placeholder={t("companyStreet")}
                  error={errors.streetErr}
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                />

                <Field
                  inputRef={cityRef}
                  value={yourCity}
                  onChangeText={(v) => {
                    setYourCity(v);
                    if (errors.cityErr)
                      setErrors((p) => ({ ...p, cityErr: "" }));
                  }}
                  placeholder={t("companyCity")}
                  error={errors.cityErr}
                  returnKeyType="done"
                  onSubmitEditing={validateAndContinue}
                />
              </View>

              <View style={styles.manualActions}>
                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={validateAndContinue}
                  activeOpacity={0.75}
                >
                  <Text style={styles.buttonText}>{t("continue")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonGhost}
                  onPress={backToSearch}
                  activeOpacity={0.6}
                >
                  <Text style={styles.buttonGhostText}>
                    {t("searchCompany")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  panel: {
    width: PANEL_W,
    height: PANEL_H,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "gray",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modeContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  fieldWrap: {
    width: "100%",
  },
  inputRow: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 40,
    backgroundColor: colors.card3,
    borderColor: "gray",
    borderWidth: 1,
    color: "white",
    fontSize: 15,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
  },
  error: {
    color: "#ff6b6b",
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    marginTop: 2,
    marginLeft: 6,
  },
  errorHidden: {
    opacity: 0,
  },
  slot: {
    flex: 1,
    width: "100%",
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  placeholderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    marginTop: 6,
  },
  suggestionItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(140,140,145,0.30)",
    marginHorizontal: 10,
  },
  suggestionTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  suggestionSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12.5,
    marginTop: 2,
  },
  manualFields: {
    justifyContent: "flex-start",
  },
  manualActions: {
    marginTop: "auto",
  },
  buttonPrimary: {
    width: "100%",
    height: 48,
    backgroundColor: colors.card3,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "gray",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonGhost: {
    width: "100%",
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  buttonGhostText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },
});

export default CompanySearchModal;