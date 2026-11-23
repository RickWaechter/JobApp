// ChangeScreen.js
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { router } from "expo-router";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
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
import { generate } from "../inc/generate.js";

/* ── Tokens & Keyboard-Cache ───────────────────────────────────────────── */
let cachedKbHeight = null;
const KB_HEIGHT_KEY = "cached_kb_height";

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
  footGap: 12,
};

const PANEL = {
  widthRatio: 0.92,
  maxWidth: 480,
  gutter: 12,
};

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
  iconArrow: "#FBBF24",
  iconClose: "#FFF7ED",

  textMain: "#FFF9F2",
  textDim: "rgba(255, 235, 220, 0.38)",
};

/* ── Hauptkomponente ───────────────────────────────────────────────────── */
const ChangeScreen = forwardRef(({ visible, refNumber, onClose, style }, ref) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbHeight, setKbHeight] = useState(() => {
    if (cachedKbHeight) return cachedKbHeight;
    return Platform.OS === "ios" ? (insets.bottom > 0 ? 291 : 216) : 280;
  });

  const inputRef = useRef(null);
  const currentTextRef = useRef("");
  currentTextRef.current = text;

  /* ── Ref nach außen bereitstellen ── */
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();

      inputRef.current?.setNativeProps({
        selection: { start: 0, end: 0 },
      });

      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: 0, end: 0 },
        });
      }, 60);
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

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
      if (h > 0 && h !== cachedKbHeight) {
        cachedKbHeight = h;
        setKbHeight(h);
        EncryptedStorage.setItem(KB_HEIGHT_KEY, String(h)).catch(() => {});
      }
    };

    const sub = Keyboard.addListener(showEvent, onShow);
    return () => sub.remove();
  }, []);

  /* ── Layout-Berechnungen (analog zu CompanySearchModal) ── */
  const stageTop = useMemo(() => insets.top * 1.7, [insets.top]);
  const panelWidth = useMemo(
    () => Math.min(winW * PANEL.widthRatio, PANEL.maxWidth),
    [winW]
  );

  const panelHeight = useMemo(() => {
    const bottomSpace = kbHeight > 0 ? kbHeight : insets.bottom;
    const free = winH - stageTop - bottomSpace - PANEL.gutter;
    return Math.round(Math.max(free, 240));
  }, [winH, stageTop, kbHeight, insets.bottom]);

  /* ── Text laden & Persistenz ── */
  useEffect(() => {
    console.log("refnummer", refNumber)
    const loadText = async () => {
      try {
        const [
          anredeRaw,
          nameRaw,
          myText,
          savedEditedText,
          closingRaw,
        ] = await Promise.all([
          EncryptedStorage.getItem("anrede"),
          EncryptedStorage.getItem("name"),
          EncryptedStorage.getItem("text"),
          EncryptedStorage.getItem("editedCoverLetter"),
          EncryptedStorage.getItem("closing"),
        ]);

        const anrede = anredeRaw || "";
        const name = nameRaw || "";
        const closing = closingRaw || "";

        if (myText) {
          const composed = `${anrede}\n\n${myText}\n\n${closing}\n\n${name}`.trim();
          setText(composed);
          currentTextRef.current = composed;
          await EncryptedStorage.setItem("editedCoverLetter", composed);
        } else if (savedEditedText) {
          setText(savedEditedText);
          currentTextRef.current = savedEditedText;
        }
      } catch (error) {
        console.error("Error loading text in ChangeScreen:", error);
      }
    };

    if (visible !== false) {
      loadText();
      inputRef.current?.focus()

    }

    return () => {
      if (currentTextRef.current) {
        EncryptedStorage.setItem(
          "editedCoverLetter",
          currentTextRef.current
        ).catch(() => {});
      }
    };
  }, [visible]);

  const handleTextChange = useCallback((newText) => {
    setText(newText);
    currentTextRef.current = newText;
    EncryptedStorage.setItem("editedCoverLetter", newText).catch(() => {});
  }, []);

  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);

  /* ── PDF Generierung & Weiterleitung ── */
  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await generate({ text, router, refNumber });
    } catch (err) {
      console.error("Generierungsfehler:", err);
    } finally {
      setLoading(false);
    }
  };


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
         

          {/* ══ ZONE 1 · Editor-Bereich ═══════════════════════════════ */}
          <View style={styles.modeBody}>
             <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color={WARM.iconClose} />
            </TouchableOpacity>
            <View style={styles.editorCard}>
              <TextInput
                ref={inputRef}
                style={styles.textArea}
                value={text}
                
                spellCheck={false}
                autoCorrect={false}
                onChangeText={handleTextChange}
                placeholder={t("editor.placeholder")}
                placeholderTextColor={WARM.textDim}
                multiline={true}
                textAlignVertical="top"
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </View>

          {/* ══ ZONE 2 · Footer / Action ══════════════════════════════ */}
          <View style={styles.modeFoot}>
            <TouchableOpacity
              style={styles.buttonPrimary}
              disabled={loading}
              onPress={handleGenerate}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    style={{ marginRight: 8 }}
                    size="small"
                    color="#FFFFFF"
                  />
                  <Text style={styles.buttonPrimaryText}>
                    {t("editor.creatingFolder")}
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <MaterialIcons
                    name="picture-as-pdf"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIconLeft}
                  />
                  <Text style={styles.buttonPrimaryText}>
                    {t("editor.generateButton")}
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                    style={styles.buttonIconRight}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

export default ChangeScreen;

/* ── Styles ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
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
    backgroundColor: WARM.bg,
    borderRadius: M.panelRadius,
    paddingHorizontal: 10,

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

  /* ── Header ── */
  header: {
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
    position:"absolute",
    zIndex:10,
    right:0,
    top:10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(95, 81, 81, 0.67)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  /* ── Zonen ── */
  modeBody: {
    flex: 1,
    minHeight: 0,
  },
  modeFoot: {
    flexShrink: 0,
  },

  /* ── Editor Card (analog zu listCard) ── */
  editorCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    paddingBottom:4,
    paddingTop:15,
    paddingHorizontal:5
  },
  textArea: {
    paddingBottom:3,
    color: WARM.textMain,
    fontSize: 14.5,
    lineHeight: 21,
  },

  /* ── Button ── */
  buttonPrimary: {
    width: "100%",
    height: 46,
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonIconLeft: { marginRight: 8 },
  buttonIconRight: { marginLeft: 6 },
});