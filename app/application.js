// Bewerbung.js
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {thePrompt} from '../inc/ai.js'
import axios from 'axios';
import { InteractionManager } from 'react-native';
import {  getI18nCode, itemsLang } from '../inc/language.js';
import { sha512 } from 'js-sha512';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import { WebView } from 'react-native-webview';

import { decryp } from '../inc/cryp.js';
import Info from '../comp/info.js';
import colors from '../inc/colors.js';
import { runQuery } from '../inc/db.js';
import { getKeyboardHeight } from '../inc/keyboardStorage.js';
import {
  agenturScript,
  extractScript,
  jobvectorScript,
  meinestadtScript,
  stepstoneScript,
} from '../inc/scrapper.js';

// Falls downloader aus einem anderen Modul bezogen wird, Pfad hier anpassen:
import { downloader } from '../inc/downloader.js';

const { width, height } = Dimensions.get('window');
const DB_MAIN_NAME = 'firstNew.db';
const DB_JOBS_NAME = 'jobs.db';

const WARM = {
  bg: colors.background || '#171412',
  backdrop: 'rgba(18, 13, 10, 0.85)',
  surface: 'rgba(255, 240, 225, 0.05)',
  surfaceBorder: 'rgba(255, 220, 190, 0.14)',
  surfaceBorderSubtle: 'rgba(255, 220, 190, 0.07)',
  primary: '#E06D28',
  primaryGlow: 'rgba(224, 109, 40, 0.35)',
  accentBadgeBg: 'rgba(245, 158, 11, 0.15)',
  accentBadgeBorder: 'rgba(245, 158, 11, 0.3)',
  iconLeading: '#F59E0B',
  iconClear: '#F87171',
  iconPin: '#FB923C',
  iconArrow: '#FBBF24',
  iconEmpty: '#F59E0B',
  iconClose: '#FFF7ED',
  textMain: '#FFF9F2',
  textMuted: 'rgba(255, 240, 225, 0.65)',
  textDim: 'rgba(255, 235, 220, 0.38)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.08)',
  errorBorder: 'rgba(248, 113, 113, 0.45)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.35)',
};

const PLATFORMS = [
  { domain: 'meinestadt.de', name: 'meinestadt', script: meinestadtScript },
  { domain: 'arbeitsagentur.de', name: 'arbeitsagentur', script: agenturScript },
  { domain: 'jobvector.de', name: 'jobvector', script: jobvectorScript },
  { domain: 'indeed.com', name: 'indeed', script: extractScript },
  { domain: 'stepstone.de', name: 'stepstone', script: stepstoneScript },
];

/* ── Subkomponenten ─────────────────────────────────────── */
const CardHeader = memo(({ icon, title, rightElement }) => (
  <View style={styles.cardHeaderRow}>
    <View style={styles.headerLeft}>
      <View style={styles.iconBadge}>
        <MaterialIcons name={icon} size={18} color={WARM.iconLeading} />
      </View>
      <Text style={styles.fieldLabel}>{title}</Text>
    </View>
    {rightElement}
  </View>
));

const SegmentedPills = memo(({ options, selected, onSelect, labels }) => (
  <View style={styles.pillContainer}>
    {options.map((opt) => {
      const isSelected = selected === opt;
      return (
        <TouchableOpacity
          key={opt}
          activeOpacity={0.75}
          onPress={() => onSelect(opt)}
          style={[styles.pillButton, isSelected && styles.pillButtonActive]}
        >
          <Text style={[styles.pillText, isSelected && styles.pillTextActive]} numberOfLines={1}>
            {labels?.[opt] || opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
));

const SuggestionDropdown = memo(
  ({ data, onSelect, onToggleSelect, selectedItems = [], isSkill = false, theMaxHeight = height * 0.16 }) => (
    <View style={[styles.suggestionsCard, { maxHeight: theMaxHeight }]}>
      <FlatList
        data={data}
        keyExtractor={(item, index) =>
          item?.rowid ? String(item.rowid) : item?.id ? String(item.id) : String(index)
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const text =
            typeof item === 'string'
              ? item
              : isSkill
              ? item?.role ?? item?.text ?? item?.name ?? ''
              : item?.text ?? item?.role ?? item?.name ?? item?.id ?? '';
          const rawText = text.length > 25 ? text.substring(0, 27) + '...' : text;
          const itemKey = item?.rowid ?? item?.id ?? text;
          const isSelected = selectedItems.some((s) => {
            const sKey = s?.rowid ?? s?.id ?? (typeof s === 'string' ? s : s?.role ?? s?.text);
            return sKey === itemKey;
          });

          return (
            <View style={[styles.suggestionRow, isSkill && isSelected && styles.suggestionRowSelected]}>
              <TouchableOpacity
                style={styles.suggestionTextArea}
                onPress={() => (isSkill && onToggleSelect ? onToggleSelect(item) : onSelect(item))}
                activeOpacity={0.7}
              >
                <View style={styles.resultIconWrapper}>
                  <MaterialIcons
                    name={isSkill ? 'psychology' : 'work-outline'}
                    size={16}
                    color={WARM.iconPin}
                  />
                </View>
                <Text
                  style={[styles.suggestionText, isSkill && isSelected && styles.suggestionTextSelected]}
                  numberOfLines={1}
                >
                  {String(rawText)}
                </Text>
              </TouchableOpacity>

              {isSkill && onToggleSelect ? (
                <TouchableOpacity
                  style={styles.selectSuggestionBtn}
                  onPress={() => onToggleSelect(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={isSelected ? WARM.primary : WARM.textDim}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  )
);

const useDatabase = () => {
  const dbMainRef = useRef(null);
  const dbJobsRef = useRef(null);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const interactionHandle = InteractionManager.runAfterInteractions(async () => {
      try {
        const folderPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;
        const dest = `${folderPath}/${DB_JOBS_NAME}`;

        if (!(await RNFS.exists(folderPath))) {
          await RNFS.mkdir(folderPath);
        }

        if (!(await RNFS.exists(dest))) {
          const res = await fetch(`https://api.jobapp2.de/get-secure-link/${DB_JOBS_NAME}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.url) {
              const secureUrl = data.url.replace('http://', 'https://');
              await RNFS.downloadFile({ fromUrl: secureUrl, toFile: dest }).promise;
            }
          }
        }

        if (isMounted) {
          dbJobsRef.current = await SQLite.openDatabase({ name: DB_JOBS_NAME, location: 'default' });
          dbMainRef.current = await SQLite.openDatabase({ name: DB_MAIN_NAME, location: 'default' });
          setIsDbReady(true);
        }
      } catch (err) {
        console.error('Database Init Error:', err);
      }
    });

    return () => {
      isMounted = false;
      interactionHandle.cancel();
    };
  }, []);

  return { dbMainRef, dbJobsRef, isDbReady };
};

const useWebExtractor = ({ onExtractSuccess }) => {
  const { t } = useTranslation();
  const [isExtracting, setIsExtracting] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const webViewRef = useRef(null);
  const activeScriptRef = useRef(extractScript);

  useEffect(() => {
    if (!isExtracting) return;
    const timer = setTimeout(() => {
      if (isExtracting) {
        setIsExtracting(false);
        setWebViewUrl('');
        Alert.alert(
          t('bewerbung.timeoutTitle') || 'Timeout',
          t('bewerbung.timeoutMsg') || 'Stellenanzeige hat zu lange geladen. Bitte prüfe die URL.'
        );
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [isExtracting, t]);

  const startExtraction = useCallback(
    (inputValue) => {
      Keyboard.dismiss();

      const text = inputValue?.trim() || '';
      let url = '';

      const match = text.match(/(https?:\/\/[^\s]+)/);
      if (match) {
        url = match[0];
      } else {
        const words = text.split(/\s+/);
        const found = PLATFORMS.find((p) => words.some((w) => w.toLowerCase().includes(p.domain)));

        if (found) {
          const linkWord = words.find((w) => w.toLowerCase().includes(found.domain));
          url = `https://${linkWord}`;
        }
      }

      if (!url) {
        Alert.alert(
          t('bewerbung.invalidLinkTitle') || 'Ungültiger Link',
          t('bewerbung.invalidLinkMsg') || 'Bitte füge einen vollständigen Link ein.'
        );
        return;
      }

      const matchedPlatform = PLATFORMS.find((p) => url.toLowerCase().includes(p.domain));
      activeScriptRef.current = matchedPlatform ? matchedPlatform.script : extractScript;

      setWebViewUrl(url);
      setIsExtracting(true);
    },
    [t]
  );

  const cancelExtraction = useCallback(() => {
    setIsExtracting(false);
    setWebViewUrl('');
  }, []);

  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.status === 'success') {
          const cleanTitle = data.title?.split('(')[0]?.trim();
          onExtractSuccess?.(cleanTitle, data.description);
          Alert.alert(
            t('bewerbung.extractSuccessTitle') || 'Erfolg!',
            t('bewerbung.extractSuccessMsg') || 'Stellenanzeige wurde analysiert.'
          );
        } else {
          Alert.alert(
            t('bewerbung.extractHintTitle') || 'Hinweis',
            data.message || t('bewerbung.extractDefaultError') || 'Konnte keine Daten extrahieren.'
          );
        }
      } catch (e) {
        console.error('JSON Parsing Error:', e);
      } finally {
        cancelExtraction();
      }
    },
    [onExtractSuccess, cancelExtraction, t]
  );

  const injectScript = useCallback(() => {
    webViewRef.current?.injectJavaScript(activeScriptRef.current);
  }, []);

  return {
    isExtracting,
    webViewUrl,
    webViewRef,
    startExtraction,
    cancelExtraction,
    onMessage,
    injectScript,
  };
};

/* ── Hauptkomponente ────────────────────────────────────── */
const Bewerbung = forwardRef(({ visibleApp, changeScreen, isNextStep = false, onClose }, ref) => {
  const { t, i18n } = useTranslation(); // <-- i18n ergänzt
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { dbMainRef, dbJobsRef, isDbReady } = useDatabase();

  const [inputValue, setInputValue] = useState('');
  const [scrapedDescription, setScrapedDescription] = useState('');
  const [name, setName] = useState('');
  const [erfahrung, setErfahrung] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('light');

  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillsFiltered, setSkillsFiltered] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);

  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [saveJobVisible, setSaveJobVisible] = useState(false);
  const [saveSkillVisible, setSaveSkillVisible] = useState(false);

  const [accordionOpen, setAccordionOpen] = useState(false);

  /* Schriftart & Sprache DropDowns */
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontValue, setFontValue] = useState('Helvetica');
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [languageValue, setLanguageValue] = useState('de');

  /* Font Download Management */
  const [downloadingFonts, setDownloadingFonts] = useState({});
  const [downloadedFonts, setDownloadedFonts] = useState({});

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', job: '', skill: '', anrede: '' });
  const [kbHeight, setKbHeight] = useState(0);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef(null);
  const jobRef = useRef(null);
  const jobRef2 = useRef(null);
  const searchTimeout = useRef(null);

  /* ── Horizontale Ausfahr-Animation ── */
  const animCardX = useRef(new Animated.Value(0)).current;
  const animOptionsX = useRef(new Animated.Value(width)).current;

  /* ── Tastatur-Höhe ── */
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = async (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      try {
        const stored = await getKeyboardHeight();
        if (h > 0 && h !== stored) {
          setKbHeight(h);
        } else {
          setKbHeight(stored || h);
        }
      } catch {
        setKbHeight(h);
      }
    };

    const onHide = () => setKbHeight(0);

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  const stageTop = Math.max(insets.top + 10, insets.top * 1.5);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animCardX, {
        toValue: accordionOpen ? -winW : 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(animOptionsX, {
        toValue: accordionOpen ? 0 : winW,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [accordionOpen, animCardX, animOptionsX, winW]);

  useEffect(() => {
    Animated.timing(animCardX, {
      toValue: isNextStep ? -winW * 0.25 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(opacityAnim, {
      toValue: isNextStep ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isNextStep, animCardX, opacityAnim, winW]);

  useImperativeHandle(ref, () => ({
    focusJob: () => jobRef.current?.focus(),
    focusName: () => jobRef2.current?.focus(),
    focusSkill: () => inputRef.current?.focus(),
  }));

  /* ── Schriftarten-Definition ── */
  const fontOptions = useMemo(
    () => [
      { label: 'Inter', value: 'Inter', fontName: 'Inter' },
      { label: 'Roboto', value: 'Roboto', fontName: 'Roboto' },
      { label: 'Lato', value: 'Lato', fontName: 'Lato' },
      { label: 'Source Sans 3', value: 'SourceSans3', fontName: 'SourceSans3' },
      { label: 'Carlito', value: 'Carlito', fontName: 'Carlito' },
      { label: 'Arimo', value: 'Arimo', fontName: 'Arimo' },
      { label: 'Public Sans', value: 'PublicSans', fontName: 'PublicSans' },
      { label: 'Merriweather', value: 'Merriweather', fontName: 'Merriweather' },
      { label: 'EB Garamond', value: 'EBGaramond', fontName: 'EBGaramond' },
      { label: 'Tinos', value: 'Tinos', fontName: 'Tinos' },
      { label: t('bewerbung.fonts.helvetica') || 'Helvetica (Standard)', value: 'Helvetica', fontName: 'Helvetica' },
      { label: t('bewerbung.fonts.timesRoman') || 'Times Roman (Serif)', value: 'TimesRoman', fontName: 'TimesRoman' },
      { label: t('bewerbung.fonts.courier') || 'Courier (Monospace)', value: 'Courier', fontName: 'Courier' },
    ],
    [t]
  );

  /* Prüfen, welche Schriften bereits lokal vorhanden sind */
useEffect(() => {
  let isMounted = true;

  const checkExistingFonts = async () => {
    try {
      const candidatePaths = [
        `${RNFS.LibraryDirectoryPath}/fonts`,
        `${RNFS.DocumentDirectoryPath}/fonts`,
      ];

      const existingFiles = new Set();

      // 1. Alle vorhandenen Dateien aus beiden Pfaden sammeln
      for (const dir of candidatePaths) {
        if (await RNFS.exists(dir)) {
          const files = await RNFS.readDir(dir);
          files.forEach((f) => existingFiles.add(f.name.toLowerCase()));
        }
      }

      const alreadyDownloaded = {};

      // 2. Exakt prüfen, ob [name].ttf UND [name]-Bold.ttf existieren
      fontOptions.forEach((f) => {
        const rawName = f.fontName || f.value || '';
        const base = rawName.replace(/\.ttf$/i, '').toLowerCase();

        const hasRegular = existingFiles.has(`${base}.ttf`);
        const hasBold =
          existingFiles.has(`${base}-bold.ttf`) ||
          existingFiles.has(`${base}_bold.ttf`);

        // Nur als geladen markieren, wenn BEIDE Schnitte da sind
        if (hasRegular && hasBold) {
          alreadyDownloaded[f.value] = true;
        }
      });

      if (isMounted) {
        setDownloadedFonts((prev) => ({ ...prev, ...alreadyDownloaded }));
      }
    } catch (err) {
      console.warn('Font-Check Warnung:', err);
    }
  };

  checkExistingFonts();

  return () => {
    isMounted = false;
  };
}, [fontOptions]);
  /* Font-Download ausführen */
  const handleDownloadFont = useCallback(
    async (item) => {
      const fontName = item.fontName || item.value;
      if (downloadingFonts[fontName]) return;

      setDownloadingFonts((prev) => ({ ...prev, [fontName]: true }));
      try {
        if (typeof downloader === 'function') {
          await downloader(fontName, 'fonts');
        } else {
          console.warn('downloader Funktion nicht verfügbar.');
        }

        setDownloadedFonts((prev) => ({ ...prev, [item.value]: true }));
        Alert.alert(
          t('bewerbung.fontDownloadSuccessTitle') || 'Erfolg',
          `Schriftart "${item.label}" wurde heruntergeladen.`
        );
      } catch (err) {
        console.error('Fehler beim Download der Schriftart:', fontName, err);
        Alert.alert(
          t('bewerbung.fontDownloadErrorTitle') || 'Fehler',
          `Schriftart "${item.label}" konnte nicht heruntergeladen werden.`
        );
      } finally {
        setDownloadingFonts((prev) => ({ ...prev, [fontName]: false }));
      }
    },
    [downloadingFonts, t]
  );

  /* Render-Komponente für jedes Dropdown-Item */
  const renderFontItem = useCallback(
    ({ item }) => {
      const fontName = item.fontName || item.value;
      console.log('niuiu', fontName)
      const isDownloading = Boolean(downloadingFonts[fontName]);
      const isDownloaded = Boolean(downloadedFonts[item.value]);
      const isSelected = fontValue === item.value;
      const handleSelect =async  () => {
      setFontValue(item.value);     // 1. Value im State setzen
      setFontPickerOpen(false);     // 2. Dropdown schließen
      console.log('niuiu', item.value)
      await EncryptedStorage.setItem('font', item.value);

    };
      return (
        <View style={[styles.fontItemContainer, isSelected && styles.fontItemSelected]}>
          <TouchableOpacity
            style={styles.fontSelectArea}
            onPress={handleSelect}
            activeOpacity={0.7}
          >
            <Text style={[styles.fontLabelText, isSelected && styles.fontLabelTextSelected]} numberOfLines={1}>
              {item.label}
            </Text>
            {isSelected && (
              <MaterialIcons name="check" size={16} color={WARM.primary} style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fontDownloadActionBtn,
              isDownloaded && styles.fontDownloadActionBtnDownloaded,
            ]}
            onPress={() => handleDownloadFont(item)}
            disabled={isDownloading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={WARM.primary} />
            ) : isDownloaded ? (
              <MaterialIcons name="cloud-done" size={18} color={WARM.success} />
            ) : (
              <MaterialIcons name="cloud-download" size={18} color={WARM.iconArrow} />
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [downloadingFonts, downloadedFonts, handleDownloadFont]
  );

 

  const employmentOptions = useMemo(
    () => [
      t('employmentOptions.vollzeit') || 'Vollzeit',
      t('employmentOptions.teilzeit') || 'Teilzeit',
      t('employmentOptions.minijob') || 'Minijob',
    ],
    [t]
  );

  const applicationOptions = useMemo(
    () => [
      t('applicationOptions.regulär') || 'Regulär',
      t('applicationOptions.initiativ') || 'Initiativ',
      t('applicationOptions.praktikum') || 'Praktikum',
    ],
    [t]
  );

  const qualityKeys = ['best', 'medium', 'light'];
  const qualityLabels = useMemo(
    () => ({
      medium: t('Schnell') || 'Sehr gut',
      best: t('Medium') || 'Am besten',
      light: t('Sehr schnell') || 'Gut',
    }),
    [t]
  );

  const anredeOptions = useMemo(
    () => [
      t('anredeOptions.herr') || 'Herr',
      t('anredeOptions.damenUndHerren') || 'Damen und Herren',
      t('anredeOptions.frau') || 'Frau',
    ],
    [t]
  );

  const closeOptions = useCallback(() => {
    Keyboard.dismiss();
    setFontPickerOpen(false);
    setLanguagePickerOpen(false);
    setAccordionOpen(false);
  }, []);

  const onExtractSuccess = useCallback((jobTitle, jobDesc) => {
    setInputValue(jobTitle);
    setScrapedDescription(jobDesc);
    setSaveJobVisible(false);
  }, []);

  const {
    isExtracting,
    webViewUrl,
    webViewRef,
    startExtraction,
    cancelExtraction,
    onMessage,
    injectScript,
  } = useWebExtractor({ onExtractSuccess });

  /* ── Skills Laden wenn DB bereit ── */
  /* ── Skills & zuvor gespeicherte Auswahl laden ── */
useEffect(() => {
  if (!isDbReady || !dbMainRef.current) return;
  let active = true;

  const task = InteractionManager.runAfterInteractions(async () => {
    try {
      const key = await EncryptedStorage.getItem('key');
      const deviceId = await DeviceInfo.getUniqueId();
      if (!active || !dbMainRef.current) return;

      const res = await runQuery(
        dbMainRef.current,
        'SELECT skills FROM files WHERE ident = ? LIMIT 1',
        [deviceId]
      );
      if (!active) return;

      const raw = res?.rows?.raw()?.[0]?.skills;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        try {
          const decSkills = await decryp(raw, key);
          if (!active || !decSkills) return;
          const parsed = JSON.parse(decSkills);

          if (Array.isArray(parsed)) {
            setSkills(parsed);
            setSkillsFiltered(parsed);

            // Zuvor gespeicherte Auswahl aus EncryptedStorage laden
            const savedSelectedRaw = await EncryptedStorage.getItem('selected_skills');
            if (savedSelectedRaw && active) {
              const savedIds = JSON.parse(savedSelectedRaw);
              if (Array.isArray(savedIds) && savedIds.length > 0) {
                const restored = parsed.filter((item) => {
                  const itemKey = item?.id ?? (typeof item === 'string' ? item : item?.role);
                  return savedIds.includes(itemKey);
                });

                if (restored.length > 0) {
                  setSelectedSkills(restored);
                  const labels = restored
                    .map((s) => (typeof s === 'string' ? s : s.role || ''))
                    .filter(Boolean);
                  setErfahrung(labels.join(', '));
                }
              }
            }
          }
        } catch (err) {
          console.error('Decryption/Parsing failed:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load user skills:', err);
    }
  });

  return () => {
    active = false;
    task?.cancel?.();
  };
}, [isDbReady]);

  const buildSelectedSkillsString = useCallback(() => {
    if (selectedSkills.length === 0) return erfahrung;
    return selectedSkills
      .map((item, idx) => {
        if (typeof item === 'string') return `• ${item}`;
        const parts = [];
        if (item.role) parts.push(`Rolle: ${item.role}`);
        if (item.company) parts.push(`Unternehmen: ${item.company}`);
        if (item.period) parts.push(`Zeitraum: ${item.period}`);
        if (item.tasks) parts.push(`Aufgaben: ${item.tasks}`);
        return `[Qualifikation/Station ${idx + 1}]\n${parts.join('\n')}`;
      })
      .join('\n\n');
  }, [selectedSkills, erfahrung]);

const handleToggleSelectSkill = useCallback((skillItem) => {
  const itemKey = skillItem?.id ?? (typeof skillItem === 'string' ? skillItem : skillItem?.role);

  setSelectedSkills((prev) => {
    const exists = prev.some(
      (s) => (s?.id ?? (typeof s === 'string' ? s : s?.role)) === itemKey
    );
    let updated;
    if (exists) {
      updated = prev.filter(
        (s) => (s?.id ?? (typeof s === 'string' ? s : s?.role)) !== itemKey
      );
    } else {
      updated = [...prev, skillItem];
    }

    const labels = updated
      .map((s) => (typeof s === 'string' ? s : s.role || ''))
      .filter(Boolean);
    setErfahrung(labels.join(', '));

    // IDs / Keys in EncryptedStorage persistieren
    const keysToSave = updated.map(
      (s) => s?.id ?? (typeof s === 'string' ? s : s?.role)
    );
    EncryptedStorage.setItem('selected_skills', JSON.stringify(keysToSave)).catch((err) =>
      console.error('Fehler beim Speichern der ausgewählten Skills:', err)
    );

    return updated;
  });
}, []);

  const toggleAccordion = useCallback((val) => {
    if (val) {
      setAccordionOpen((prev) => !prev);
    } else {
      setFontPickerOpen(false);
      setLanguagePickerOpen(false);
      setAccordionOpen(false);
    }
  }, []);

  const handleJobChange = useCallback(
    (val) => {
      setInputValue(val);
      if (errors.job) setErrors((p) => ({ ...p, job: '' }));
      if (searchTimeout.current) clearTimeout(searchTimeout.current);

      if (!val || /[\/"() &$-:]/.test(val)) {
        setShowJobDropdown(false);
        setJobs([]);
        return;
      }

      searchTimeout.current = setTimeout(async () => {
        if (!dbJobsRef.current || val.length < 1) return;
        try {
          const res = await runQuery(
            dbJobsRef.current,
            'SELECT rowid, text FROM eintraege WHERE eintraege MATCH ? LIMIT 15',
            [`${val}*`]
          );
          setJobs(res.rows.raw());
          setShowJobDropdown(true);
          setSaveJobVisible(true);
        } catch (err) {
          console.warn('Job Search Error:', err);
        }
      }, 280);
    },
    [errors.job, dbJobsRef]
  );

  const handleErfahrungChange = useCallback(
    (val) => {
      const textValue = typeof val === 'string' ? val : val?.role || '';
      setErfahrung(textValue);

      if (!Array.isArray(skills) || skills.length === 0) {
        setSkillsFiltered([]);
        setShowSkillDropdown(false);
        return;
      }

      const query = textValue.trim().toLowerCase();
      if (!query) {
        setSkillsFiltered(skills);
        setShowSkillDropdown(true);
        return;
      }

      const skillsFilter = skills.filter((skill) => {
        const roleText = typeof skill === 'string' ? skill : skill?.role;
        return roleText ? roleText.toLowerCase().includes(query) : false;
      });

      setShowSkillDropdown(true);
      setSkillsFiltered(skillsFilter);
    },
    [skills]
  );

  const handleAnredeChange = useCallback(
    (val) => {
      setSelectedOption3((prev) => (prev === val ? '' : val));
      if (errors.anrede) setErrors((p) => ({ ...p, anrede: '' }));
      if (val === 'Herr' || val === 'Frau') {
        jobRef2.current?.focus();
      } else {
        jobRef.current?.focus();
      }
    },
    [errors.anrede]
  );

  const handleSaveJob = useCallback(async () => {
    if (!dbJobsRef.current || !inputValue.trim()) return;
    try {
      await dbJobsRef.current.executeSql(`INSERT INTO eintraege (text) VALUES (?)`, [
        inputValue.trim(),
      ]);
      setSaveJobVisible(false);
      setShowJobDropdown(false);
      Alert.alert(
        t('bewerbung.savedTitle') || 'Gespeichert',
        t('bewerbung.jobSavedMsg') || 'Berufsbezeichnung gemerkt.'
      );
    } catch (err) {
      console.error(err);
    }
  }, [dbJobsRef, inputValue, t]);

  const handleSaveSkill = useCallback(async () => {
    if (!dbMainRef.current || !erfahrung.trim()) return;
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      await dbMainRef.current.executeSql(
        `UPDATE files SET skills = IFNULL(skills, '') || ? || '#' WHERE ident = ?`,
        [erfahrung.trim(), deviceId]
      );
      setSaveSkillVisible(false);
      setShowSkillDropdown(false);
      Alert.alert(
        t('bewerbung.savedTitle') || 'Gespeichert',
        t('bewerbung.skillSavedMsg') || 'Kenntnis gemerkt.'
      );
    } catch (err) {
      console.error(err);
    }
  }, [dbMainRef, erfahrung, t]);

  const handleDeleteJob = useCallback(
    async (job) => {
      if (!dbJobsRef.current) return;
      try {
        await dbJobsRef.current.executeSql('DELETE FROM eintraege WHERE rowid = ?', [job.rowid]);
        setJobs((prev) => prev.filter((j) => j.rowid !== job.rowid));
      } catch (err) {
        console.error(err);
      }
    },
    [dbJobsRef]
  );

  const handleGeneratePDF = async () => {
    setShowJobDropdown(false);
    setShowSkillDropdown(false);

    const nextErrors = {};
    const isDamenUndHerrenCheck =
      selectedOption3 === (t('anredeOptions.damenUndHerren') || 'Damen und Herren');

    if (!selectedOption3) {
      nextErrors.anrede = t('validation.salutation.required') || 'Bitte Anrede wählen';
    } else if (!isDamenUndHerrenCheck && !name.trim()) {
      nextErrors.anrede = t('validation.salutation.contactRequired') || 'Bitte Ansprechpartner eintragen';
    }

    if (!inputValue.trim()) {
      nextErrors.job = t('validation.job.required') || 'Bitte Beruf eingeben';
    }

    if (!erfahrung.trim()) {
      nextErrors.skill = t('validation.skill.required') || 'Bitte Erfahrung angeben';
    }

    if (Object.keys(nextErrors).length > 0) {
      toggleAccordion(false);
      setErrors(nextErrors);
      if (!isDamenUndHerrenCheck && !name.trim()) {
        jobRef2.current?.focus();
      } else if (!inputValue.trim()) {
        jobRef.current?.focus();
      } else if (!erfahrung.trim()) {
        inputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const timepart = selectedOption2
        ? `${selectedOption2}e Bewerbung als `
        : 'Bewerbung als ';
    // ── 1. Zielsprache festlegen ─────────────────────────────
const targetLng = getI18nCode(languageValue) || 'de';
console.log('targetLng', targetLng);
const closing = i18n.t('closing', { lng: targetLng, defaultValue: 'Mit freundlichen Grüßen,' });

// ── 2. Anrede anhand der gewählten Option auflösen ───────
// ── 2. Anrede anhand der gewählten Option auflösen ───────
let salutationKey = 'default';
const opt3Lower = (selectedOption3 || '').toLowerCase();

const isDamenUndHerrenSelected =
  opt3Lower.includes('damen') ||
  selectedOption3 === (t('anredeOptions.damenUndHerren') || 'Damen und Herren');

if (isDamenUndHerrenSelected) {
  salutationKey = 'default';
} else if (opt3Lower.includes('frau') || selectedOption3 === t('anredeOptions.frau')) {
  salutationKey = 'frau';
} else if (opt3Lower.includes('herr') || selectedOption3 === t('anredeOptions.herr')) {
  salutationKey = 'herr';
}
let anrede = '';
if (salutationKey === 'herr') {
  const prefix = i18n.t('salutation.herr', {
    lng: targetLng,
    defaultValue: 'Sehr geehrter Herr ',
  });
  anrede = `${prefix}${name.trim()},`;
} else if (salutationKey === 'frau') {
  const prefix = i18n.t('salutation.frau', {
    lng: targetLng,
    defaultValue: 'Sehr geehrte Frau ',
  });
  anrede = `${prefix}${name.trim()},`;
} else {
  anrede = i18n.t('salutation.default', {
    lng: targetLng,
    defaultValue: 'Sehr geehrte Damen und Herren,',
  });
}

console.log('anrede', anrede);
// ── 3. Betreff / Bewerbungstyp auflösen ───────────────────
let appTypeKey = 'default';
const opt2Lower = (selectedOption2 || '').toLowerCase();

if (opt2Lower.includes('initiativ') || selectedOption2 === t('applicationOptions.initiativ')) {
  appTypeKey = 'initiativ';
} else if (opt2Lower.includes('praktik') || selectedOption2 === t('applicationOptions.praktikum')) {
  appTypeKey = 'praktikum';
} else if (
  opt2Lower.includes('regulär') ||
  opt2Lower.includes('regular') ||
  selectedOption2 === t('applicationOptions.regulär')
) {
  appTypeKey = 'regulär';
}

const typePrefix = i18n.t(`applicationOptions2.${appTypeKey}`, {
  lng: targetLng,
  defaultValue: i18n.t('applicationOptions2.default', {
    lng: targetLng,
    defaultValue: 'Bewerbung als ',
  }),
});

const choicePart = selectedOption?.trim() ? ` (${selectedOption.trim()})` : '';
const subject = `${typePrefix}${inputValue.trim()}${choicePart}`;
console.log('subject', subject);
console.log('cp', choicePart);
// ── 4. Im EncryptedStorage speichern ────────────────────
await Promise.all([
  EncryptedStorage.setItem('font', fontValue),
  EncryptedStorage.setItem('language', languageValue),
  EncryptedStorage.setItem('beruf', inputValue),
  EncryptedStorage.setItem('erfahrung', erfahrung),
  EncryptedStorage.setItem('time', selectedOption),
  EncryptedStorage.setItem('type', selectedOption2),
  EncryptedStorage.setItem('subject', subject),
  EncryptedStorage.setItem('anrede', anrede),
  EncryptedStorage.setItem('closing', closing),
]);
      const detailedSkillsString = buildSelectedSkillsString();

      let prompt1 = thePrompt(inputValue, languageValue, detailedSkillsString);
      if (scrapedDescription?.trim()) {
        prompt1 += `\n\nNutze folgende Anforderungen der Stellenanzeige für passende Keywords:\n"${scrapedDescription}"`;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = sha512(deviceId);
      const quality = selectedQuality;

      const maxAttempts = 3;
      let success = false;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await axios.post(
            'https://api.jobapp2.de/getText',
            { prompt1, key, modelIntens: quality },
            { timeout: 20000 }
          );

          const generatedText = response.data?.response;
          if (!generatedText || typeof generatedText !== 'string' || !generatedText.trim()) {
            throw new Error('Ungültige oder leere Server-Antwort');
          }

          const cleanSaved = generatedText
            .replace(/\*/g, '')
            .replace(/\u202F/g, ' ')
            .replace(/[\u2010-\u2015]/g, '-')
            .replace(/[\u201C\u201D\u201E]/g, '"')
            .replace(/\u00a0/g, ' ');

          await EncryptedStorage.setItem('text', cleanSaved);
          await EncryptedStorage.setItem('result', 'change');

          const check = await EncryptedStorage.getItem('text');
          if (!check) {
            throw new Error('Text konnte nicht im Storage verifiziert werden');
          }

          success = true;
          setLoading(false);
          changeScreen();
          break;
        } catch (attemptErr) {
          lastError = attemptErr;
          console.warn(`Fehlversuch ${attempt}:`, attemptErr?.message || attemptErr);
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!success) {
        throw lastError || new Error('Generierung nach mehreren Versuchen fehlgeschlagen');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error during PDF generation:', error);
      Alert.alert(
        t('bewerbung.errorTitle') || 'Fehler',
        error.response?.data?.error ||
          t('bewerbung.networkError') ||
          'Netzwerk- oder Übertragungsfehler. Bitte versuche es erneut.'
      );
    }
  };

  const isDamenUndHerren =
    selectedOption3 === (t('anredeOptions.damenUndHerren') || 'Damen und Herren');
  const isUrlInput = useMemo(
    () => ['http://', 'https://', 'www.'].some((proto) => inputValue.includes(proto)),
    [inputValue]
  );

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        setShowSkillDropdown(false);
        if (accordionOpen) {
          Keyboard.dismiss();
        } else {
          inputRef.current?.focus();
        }
      }}
      accessible={false}
    >
      <View style={styles.root}>
        <Info
          visible={infoModalVisible}
          onClose={() => setInfoModalVisible(false)}
          message={
            t('bewerbung.infoModalMessage') ||
            'Kopiere einfach den Link einer Stellenanzeige in das Berufsfeld – wir ziehen die Anforderungen automatisch heraus!'
          }
        />

        {/* ══ MAIN CARD ══ */}
        <Animated.View
          pointerEvents={accordionOpen ? 'none' : 'auto'}
          style={[
            styles.stage,
            {
              top: stageTop,
              opacity: opacityAnim,
              transform: [{ translateX: animCardX }],
            },
          ]}
        >
          <ScrollView
            style={styles.stageScroll}
            contentContainerStyle={styles.stageScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            bounces={false}
          >
            <View style={styles.responsiveContent}>
              <View style={styles.sectionCard}>
                <CardHeader
                  icon="person"
                  title={t('bewerbung.sectionSalutation') || 'ANREDE & ANSPRECHPARTNER'}
                  rightElement={
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={onClose}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="close" size={18} color={WARM.iconClose} />
                    </TouchableOpacity>
                  }
                />

                <SegmentedPills
                  options={anredeOptions}
                  selected={selectedOption3}
                  onSelect={handleAnredeChange}
                />

                <View style={styles.suggestionsField}>
                  <View
                    style={[
                      styles.inputWrapper,
                      isDamenUndHerren && styles.textInputDisabled,
                      Boolean(errors.anrede) && styles.inputWrapperError,
                      { marginTop: 12 },
                    ]}
                  >
                    <MaterialIcons
                      name="badge"
                      size={20}
                      color={isDamenUndHerren ? WARM.textDim : WARM.iconLeading}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={jobRef2}
                      editable={!isDamenUndHerren}
                      style={[styles.textInput, isDamenUndHerren && { color: WARM.textDim }]}
                      blurOnSubmit={false}
                      placeholder={
                        t('bewerbung.placeholderSalutation') || 'Nachname Ansprechpartner'
                      }
                      placeholderTextColor={WARM.textDim}
                      value={name}
                      onChangeText={(txt) => setName(txt.charAt(0).toUpperCase() + txt.slice(1))}
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => handleNextStep('ansprechpartner')}
                    />
                  </View>
                </View>

                {/* BERUF */}
                <View style={styles.suggestionField}>
                  <View
                    style={[
                      styles.inputWrapper,
                      { marginBottom: 0 },
                      Boolean(errors.job) && styles.inputWrapperError,
                    ]}
                  >
                    <MaterialIcons
                      name={isUrlInput ? 'link' : 'work-outline'}
                      size={20}
                      color={WARM.iconLeading}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={jobRef}
                      style={styles.textInput}
                      placeholder={t('bewerbung.placeholderJob') || 'Berufsbezeichnung oder Link...'}
                      placeholderTextColor={WARM.textDim}
                      value={inputValue}
                      blurOnSubmit={false}
                      onBlur={() => setTimeout(() => setShowJobDropdown(false), 220)}
                      onChangeText={handleJobChange}
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => handleNextStep('job')}
                    />

                    {isUrlInput ? (
                      <TouchableOpacity
                        onPress={() => startExtraction(inputValue)}
                        style={styles.extractBtn}
                        disabled={isExtracting}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                        <Text style={styles.extractBtnText}>
                          {t('bewerbung.btnAnalyze') || 'Analysieren'}
                        </Text>
                      </TouchableOpacity>
                    ) : saveJobVisible && inputValue.length > 0 ? (
                      <TouchableOpacity onPress={handleSaveJob} style={styles.iconBtn}>
                        <MaterialIcons name="bookmark-add" size={20} color={WARM.iconLeading} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {inputValue.length > 0 && showJobDropdown && jobs.length > 0 && (
                    <SuggestionDropdown
                      data={jobs}
                      onSelect={(suggestion) => {
                        setInputValue(suggestion.text);
                        setJobs([]);
                        setShowJobDropdown(false);
                        setSaveJobVisible(false);
                        setTimeout (() => {
                        inputRef.current?.focus();
                          
                        },150)
                      }}
                      onDelete={handleDeleteJob}
                    />
                  )}
                </View>

                {/* KENNTNISSE & SKILLS */}
                <View style={styles.suggestionFieldSkill}>
                  <View
                    style={[
                      styles.inputWrapper,
                      { marginBottom: 0 },
                      Boolean(errors.skill) && styles.inputWrapperError,
                    ]}
                  >
                    <MaterialIcons
                      name="stars"
                      size={20}
                      color={WARM.iconLeading}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={inputRef}
                      style={styles.textInput}
                      placeholder={
                        selectedSkills.length > 0
                          ? `${selectedSkills.length} Fähigkeiten gewählt`
                          : t('bewerbung.placeholderSkills') || 'z.B. 3 Jahre React Native...'
                      }
                      placeholderTextColor={WARM.textDim}
                      value={erfahrung}
                      onFocus={() => {
                        if (skills.length > 0) {
                          setSkillsFiltered(skills);
                          setShowSkillDropdown(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSkillDropdown(false), 250)}
                      onChangeText={handleErfahrungChange}
                      blurOnSubmit={false}
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => handleNextStep('skill')}
                    />

                    {saveSkillVisible && (
                      <TouchableOpacity onPress={handleSaveSkill} style={styles.iconBtn}>
                        <MaterialIcons name="bookmark-add" size={20} color={WARM.iconLeading} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {showSkillDropdown && skillsFiltered.length > 0 && (
                    <SuggestionDropdown
                      data={skillsFiltered}
                      onSelect={handleToggleSelectSkill}
                      onToggleSelect={handleToggleSelectSkill}
                      selectedItems={selectedSkills}
                      theMaxHeight={height * 0.10}
                      isSkill={true}
                    />
                  )}
                </View>

                {/* BOTTOM ACTIONS */}
                <View style={styles.bottomActionRow}>
                  <TouchableOpacity
                    style={[styles.settingsButton, accordionOpen && styles.settingsButtonActive]}
                    onPress={() => toggleAccordion(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="tune" size={18} color={WARM.iconLeading} />
                    <Text style={styles.settingsButtonText} numberOfLines={1}>
                      {t('Optionen') || 'Optionen'}
                    </Text>
                    <MaterialIcons
                      name={accordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color={WARM.iconArrow}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGeneratePDF}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator style={{ marginRight: 2 }} size="small" color="#FFFFFF" />
                        <Text style={[styles.generateBtnText, { fontSize: 13 }]} numberOfLines={1}>
                          {` Bitte warten`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <MaterialIcons
                          name="auto-awesome"
                          size={18}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.generateBtnText}>{t('Starten') || 'Starten'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* ══ OPTIONEN SCREEN ══ */}
        <Animated.View
          pointerEvents={accordionOpen ? 'auto' : 'none'}
          style={[
            styles.optionsStage,
            {
              top: stageTop,
              bottom: Math.max(insets.bottom, 12) + 10,
              transform: [{ translateX: animOptionsX }],
            },
          ]}
        >
          <View style={styles.responsiveContentOptions}>
            <View style={styles.accordionPanel}>
              <View style={styles.optionsHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconBadge}>
                    <MaterialIcons name="tune" size={18} color={WARM.iconLeading} />
                  </View>
                  <Text style={styles.fieldLabel}>{t('Optionen') || 'OPTIONEN'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeOptions}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={18} color={WARM.iconClose} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.optionsScrollArea}
                contentContainerStyle={styles.optionsScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
                <Text style={styles.subFieldLabel}>
                  {t('bewerbung.labelEmployment') || 'ANSTELLUNGSART'}
                </Text>
                <SegmentedPills
                  options={employmentOptions}
                  selected={selectedOption}
                  onSelect={(opt) => setSelectedOption((p) => (p === opt ? '' : opt))}
                />

                <Text style={[styles.subFieldLabel, { marginTop: 8 }]}>
                  {t('bewerbung.labelAppType') || 'BEWERBUNGSTYP'}
                </Text>
                <SegmentedPills
                  options={applicationOptions}
                  selected={selectedOption2}
                  onSelect={(opt) => setSelectedOption2((p) => (p === opt ? '' : opt))}
                />

                <Text style={[styles.subFieldLabel, { marginTop: 8 }]}>
                  {t('QUALITÄT') || 'Qualität'}
                </Text>
                <SegmentedPills
                  options={qualityKeys}
                  selected={selectedQuality}
                  onSelect={(val) => {setSelectedQuality(val); console.log(val)}}
                  labels={qualityLabels}
                />

                {/* 1. DROP-DOWN: SCHRIFTART MIT DOWNLOAD-BUTTONS */}
                <Text style={[styles.subFieldLabel, { marginTop: 8 }]}>
                  {t('bewerbung.labelFont') || 'SCHRIFTART IM PDF'}
                </Text>
                <View style={{ zIndex: 3000, marginTop: 4, marginBottom: 8 }}>
                  <DropDownPicker
                    open={fontPickerOpen}
                    value={fontValue}
                    items={fontOptions}
                    setOpen={setFontPickerOpen}
                    onOpen={() => setLanguagePickerOpen(false)}
                    placeholder={t('bewerbung.placeholderFont') || 'Schriftart wählen'}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownList}
                    textStyle={{
                      color: WARM.textMain,
                      fontSize: 13.5,
                      fontWeight: '500',
                    }}
                    arrowIconStyle={{ tintColor: WARM.iconArrow }}
                    dropDownDirection="TOP"
                    listMode="SCROLLVIEW"
                    renderListItem={renderFontItem}
                    
                  />
                </View>

                {/* 2. DROP-DOWN: SPRACHE */}
                <Text style={[styles.subFieldLabel, { marginTop: 8 }]}>
                  {t('bewerbung.labelLanguage') || 'SPRACHE DES ANSCHREIBENS'}
                </Text>
                <View style={{ zIndex: 4000, marginTop: 4, marginBottom: 12 }}>
                  <DropDownPicker
                    open={languagePickerOpen}
                    value={languageValue}
                    items={itemsLang}
                    setOpen={setLanguagePickerOpen}
                    setValue={setLanguageValue}
                    onOpen={() => setFontPickerOpen(false)}
                    placeholder={itemsLang[0].label}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownList}
                    textStyle={{
                      color: WARM.textMain,
                      fontSize: 13.5,
                      fontWeight: '500',
                    }}
                    arrowIconStyle={{ tintColor: WARM.iconArrow }}
                    dropDownDirection="TOP"
                    listMode="SCROLLVIEW"
                  />
                </View>
              </ScrollView>

              <View style={styles.bottomActionRow}>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => toggleAccordion(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.settingsButtonText} numberOfLines={1}>
                    {t('Zurück') || 'Zurück'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGeneratePDF}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={[styles.generateBtnText, { marginLeft: 8, fontSize: 13 }]} numberOfLines={1}>
                        {` Bitte warten`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <MaterialIcons
                        name="auto-awesome"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.generateBtnText}>{t('Starten') || 'Starten'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* EXTRAKTIONS-OVERLAY */}
        {isExtracting && (
          <View style={styles.extractingOverlay}>
            {Boolean(webViewUrl) && (
              <WebView
                ref={webViewRef}
                source={{ uri: webViewUrl }}
                style={styles.hiddenWebView}
                onLoadEnd={injectScript}
                onMessage={onMessage}
                javaScriptEnabled
                onError={() => {
                  cancelExtraction();
                  Alert.alert(
                    t('bewerbung.errorTitle') || 'Fehler',
                    t('bewerbung.errorLoadJob') || 'Stellenanzeige konnte nicht geladen werden.'
                  );
                }}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
              />
            )}

            <View style={styles.extractCard}>
              <View style={styles.radarCircle}>
                <ActivityIndicator size="large" color={WARM.iconLeading} />
              </View>
              <Text style={styles.extractTitle}>
                {t('bewerbung.extractingTitle') || 'Stellenanzeige wird analysiert...'}
              </Text>
              <Text style={styles.extractSubtitle}>
                {t('bewerbung.extractingSubtitle') || 'Wir extrahieren Keywords & Aufgaben'}
              </Text>

              <TouchableOpacity style={styles.cancelExtractBtn} onPress={cancelExtraction}>
                <Text style={styles.cancelExtractText}>
                  {t('bewerbung.btnCancel') || 'Abbrechen'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
});

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  stage: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  optionsStage: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
  },
  responsiveContentOptions: {
    width: '100%',
    maxWidth: 600,
    flex: 1,
  },
  stageScroll: {
    flex: 1,
    width: '100%',
  },
  stageScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: 6,
  },
  responsiveContent: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: 16,
  },
  sectionCard: {
    backgroundColor: WARM.bg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  accordionPanel: {
    flex: 1,
    width: '100%',
    backgroundColor: WARM.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  optionsScrollArea: {
    flex: 1,
    width: '100%',
  },
  optionsScrollContent: {
    paddingBottom: 16,
    paddingTop: 4,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 240, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    color: WARM.textMain,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  subFieldLabel: {
    color: WARM.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  suggestionsField: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARM.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    height: 40,
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: WARM.errorBorder,
    backgroundColor: WARM.errorBg,
  },
  textInputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: WARM.surfaceBorderSubtle,
    opacity: 0.6,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: WARM.textMain,
    fontSize: 14.5,
    height: '80%',
    paddingVertical: 0,
  },
  iconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARM.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  extractBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: WARM.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: WARM.surfaceBorderSubtle,
    gap: 4,
  },
  pillButton: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  pillButtonActive: {
    backgroundColor: WARM.primary,
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    color: WARM.textMuted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  suggestionField: {
    position: 'relative',
    zIndex: 20,
    marginBottom: 12,
  },
  suggestionFieldSkill: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: WARM.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 9999,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WARM.surfaceBorderSubtle,
  },
  suggestionRowSelected: {},
  resultIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 146, 60, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionTextArea: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 14,
  },
  suggestionText: {
    color: WARM.textMain,
    fontSize: 13.5,
    fontWeight: '500',
  },
  suggestionTextSelected: {
    color: WARM.iconArrow,
    fontWeight: '700',
  },
  selectSuggestionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── DropDownPicker Styles ── */
  dropdown: {
    backgroundColor: WARM.surface,
    borderRadius: 14,
    borderColor: WARM.surfaceBorder,
    height: 48,
  },
  dropdownList: {
    backgroundColor: WARM.bg,
    borderColor: WARM.surfaceBorder,
    borderRadius: 14,
    maxHeight: 280,
  },

  /* ── Spezifische Zeile für Schriften mit Download-Button ── */
  fontItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WARM.surfaceBorderSubtle,
  },
  fontItemSelected: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
  },
  fontSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fontLabelText: {
    color: WARM.textMain,
    fontSize: 13.5,
    fontWeight: '500',
  },
  fontLabelTextSelected: {
    color: WARM.primary,
    fontWeight: '700',
  },
  fontDownloadActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  fontDownloadActionBtnDownloaded: {
    backgroundColor: WARM.successBg,
    borderColor: WARM.successBorder,
  },

  bottomActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    backgroundColor: WARM.surface,
    paddingHorizontal: 10,
  },
  settingsButtonActive: {
    borderColor: WARM.accentBadgeBorder,
    backgroundColor: WARM.accentBadgeBg,
  },
  settingsButtonText: {
    flexShrink: 1,
    color: WARM.textMuted,
    fontSize: 15.5,
    fontWeight: '700',
  },
  generateButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    backgroundColor: WARM.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  extractingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WARM.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 99999,
  },
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  extractCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WARM.bg,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  radarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: WARM.accentBadgeBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  extractTitle: {
    color: WARM.textMain,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  extractSubtitle: {
    color: WARM.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  cancelExtractBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelExtractText: {
    color: WARM.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(Bewerbung);