// Bewerbung.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
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
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CardHeader,
  ExtractionOverlay,
  OptionsPanel,
  SegmentedPills,
  SuggestionDropdown,
  WARM,
} from '../comp/bewerbungParts.js';
import Info, { useInfoModal } from '../comp/info.js';
import {
  downloadFontAsset,
  generateApplicationText,
  getDownloadedFontsMap,
  initBewerbungDatabases,
  loadUserSkillsAndSelection,
  saveJobTitleToDb,
  searchJobsInDb,
} from '../inc/bewerbungService.js';
import { checkFontLanguage } from '../inc/language.js';
import {
  agenturScript,
  extractScript,
  jobvectorScript,
  meinestadtScript,
  stepstoneScript,
} from '../inc/scrapper.js';

const { width, height } = Dimensions.get('window');

const PLATFORMS = [
  { domain: 'meinestadt.de', script: meinestadtScript },
  { domain: 'arbeitsagentur.de', script: agenturScript },
  { domain: 'jobvector.de', script: jobvectorScript },
  { domain: 'indeed.com', script: extractScript },
  { domain: 'stepstone.de', script: stepstoneScript },
];

const useWebExtractor = ({ onExtractSuccess }) => {
  const { t } = useTranslation();
  const [isExtracting, setIsExtracting] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const webViewRef = useRef(null);
  const activeScriptRef = useRef(extractScript);

  useEffect(() => {
    if (!isExtracting) return;
    const timer = setTimeout(() => {
      setIsExtracting(false);
      setWebViewUrl('');
      Alert.alert(t('bewerbung.timeoutTitle'), t('bewerbung.timeoutMsg'));
    }, 20000);
    return () => clearTimeout(timer);
  }, [isExtracting, t]);

  const startExtraction = useCallback(
    (inputValue) => {
      Keyboard.dismiss();
      const text = inputValue?.trim() || '';
      let url = text.match(/(https?:\/\/[^\s]+)/)?.[0] || '';

      if (!url) {
        const words = text.split(/\s+/);
        const found = PLATFORMS.find((p) => words.some((w) => w.toLowerCase().includes(p.domain)));
        if (found) {
          const linkWord = words.find((w) => w.toLowerCase().includes(found.domain));
          url = `https://${linkWord}`;
        }
      }

      if (!url) {
        Alert.alert(t('bewerbung.invalidLinkTitle'), t('bewerbung.invalidLinkMsg'));
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
          Alert.alert(t('bewerbung.extractSuccessTitle'), t('bewerbung.extractSuccessMsg'));
        } else {
          Alert.alert(
            t('bewerbung.extractHintTitle'),
            data.message || t('bewerbung.extractDefaultError')
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
const Bewerbung = forwardRef(
  ({ changeScreen, isNextStep = false, onClose, initialJob, initialDescription }, ref) => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const { width: winW } = useWindowDimensions();
    const { infoVisible, infoMessage, openInfo, closeInfo } = useInfoModal();

    const [isDbReady, setIsDbReady] = useState(false);
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
    const [accordionOpen, setAccordionOpen] = useState(false);

    const [fontValue, setFontValue] = useState('Helvetica');
    const [languageValue, setLanguageValue] = useState('de');
    const [downloadingFonts, setDownloadingFonts] = useState({});
    const [downloadedFonts, setDownloadedFonts] = useState({ Helvetica: true });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ name: '', job: '', skill: '', anrede: '' });

    const opacityAnim = useRef(new Animated.Value(1)).current;
    const animCardX = useRef(new Animated.Value(0)).current;
    const animOptionsX = useRef(new Animated.Value(width)).current;
    const inputRef = useRef(null);
    const jobRef = useRef(null);
    const jobRef2 = useRef(null);
    const searchTimeout = useRef(null);
    const skillBlurTimeout = useRef(null);

    const stageTop = Math.max(insets.top + 10, insets.top * 1.5);

    /* ── Datenbank-Init ───────────────────────────────────── */
    useEffect(() => {
      let isMounted = true;
      const handle = InteractionManager.runAfterInteractions(async () => {
        try {
          await initBewerbungDatabases();
          if (isMounted) setIsDbReady(true);
        } catch (err) {
          console.error('Database Init Error:', err);
        }
      });
      return () => {
        isMounted = false;
        handle.cancel();
      };
    }, []);

    /* ── Animationen ──────────────────────────────────────── */
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
      Animated.parallel([
        Animated.timing(animCardX, {
          toValue: isNextStep ? -winW * 0.25 : 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: isNextStep ? 0 : 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, [isNextStep, animCardX, opacityAnim, winW]);

    useImperativeHandle(ref, () => ({
      focusJob: () => jobRef.current?.focus(),
      focusName: () => jobRef2.current?.focus(),
      focusSkill: () => inputRef.current?.focus(),
    }));

    /* ── Optionen & Schriften ─────────────────────────────── */
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
        { label: t('bewerbung.fonts.helvetica'), value: 'Helvetica', fontName: 'Helvetica' },
        { label: t('bewerbung.fonts.timesRoman'), value: 'TimesRoman', fontName: 'TimesRoman' },
        { label: t('bewerbung.fonts.courier'), value: 'Courier', fontName: 'Courier' },
      ],
      [t]
    );

    const employmentOptions = useMemo(
      () => [
        t('employmentOptions.vollzeit'),
        t('employmentOptions.teilzeit'),
        t('employmentOptions.minijob'),
      ],
      [t]
    );

    const applicationOptions = useMemo(
      () => [
        t('applicationOptions.regulär'),
        t('applicationOptions.initiativ'),
        t('applicationOptions.praktikum'),
      ],
      [t]
    );

    const qualityKeys = ['best', 'medium', 'light'];
    const qualityLabels = useMemo(
      () => ({
        best: t('bewerbung.quality.best'),
        medium: t('bewerbung.quality.medium'),
        light: t('bewerbung.quality.light'),
      }),
      [t]
    );

    const anredeOptions = useMemo(
      () => [
        t('anredeOptions.herr'),
        t('anredeOptions.damenUndHerren'),
        t('anredeOptions.frau'),
      ],
      [t]
    );

    useEffect(() => {
      let isMounted = true;
      getDownloadedFontsMap(fontOptions)
        .then((map) => isMounted && setDownloadedFonts((prev) => ({ ...prev, ...map })))
        .catch((err) => console.warn('Font-Check Warnung:', err));
      return () => {
        isMounted = false;
      };
    }, [fontOptions]);

    useEffect(() => {
      if (initialJob) setInputValue(initialJob);
      if (initialDescription) setScrapedDescription(initialDescription);
    }, [initialJob, initialDescription]);

    const handleDownloadFont = useCallback(
      async (item) => {
        const fontName = item.fontName || item.value;
        if (downloadingFonts[fontName]) return;

        setDownloadingFonts((prev) => ({ ...prev, [fontName]: true }));
        try {
          await downloadFontAsset(fontName);
          setDownloadedFonts((prev) => ({ ...prev, [item.value]: true }));
        } catch (err) {
          console.error('Fehler beim Download der Schriftart:', fontName, err);
          Alert.alert(
            t('bewerbung.fontDownloadErrorTitle'),
            `${t('bewerbung.fonts.labelPrefix', { defaultValue: 'Schriftart' })} "${item.label}"`
          );
        } finally {
          setDownloadingFonts((prev) => ({ ...prev, [fontName]: false }));
        }
      },
      [downloadingFonts, t]
    );

    /* ── Skills & Auswahl aus DB laden ────────────────────── */
    useEffect(() => {
      if (!isDbReady) return;
      let active = true;

      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          const { skills: loadedSkills, restoredSelected } = await loadUserSkillsAndSelection();
          if (!active) return;

          setSkills(loadedSkills);
          setSkillsFiltered(loadedSkills);

          if (restoredSelected.length > 0) {
            setSelectedSkills(restoredSelected);
            const labels = restoredSelected
              .map((s) => (typeof s === 'string' ? s : s.role || ''))
              .filter(Boolean);
            setErfahrung(labels.join(', '));
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

    /* ── Interaktions-Handler ─────────────────────────────── */
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

    const handleToggleSkillDropdown = useCallback(() => {
      if (skillBlurTimeout.current) {
        clearTimeout(skillBlurTimeout.current);
        skillBlurTimeout.current = null;
      }
      setShowSkillDropdown((prev) => {
        const next = !prev;
        if (next) {
          const query = erfahrung.trim().toLowerCase();
          if (query && skills.length > 0) {
            const filtered = skills.filter((s) => {
              const roleText = typeof s === 'string' ? s : s?.role;
              return roleText ? roleText.toLowerCase().includes(query) : false;
            });
            setSkillsFiltered(filtered.length > 0 ? filtered : skills);
          } else {
            setSkillsFiltered(skills);
          }
        }
        return next;
      });
    }, [erfahrung, skills]);

    const handleToggleSelectSkill = useCallback((skillItem) => {
      const getKey = (s) => s?.id ?? (typeof s === 'string' ? s : s?.role);
      const itemKey = getKey(skillItem);

      setSelectedSkills((prev) => {
        const exists = prev.some((s) => getKey(s) === itemKey);
        const updated = exists ? prev.filter((s) => getKey(s) !== itemKey) : [...prev, skillItem];

        const labels = updated
          .map((s) => (typeof s === 'string' ? s : s.role || ''))
          .filter(Boolean);
        setErfahrung(labels.join(', '));

        EncryptedStorage.setItem('selected_skills', JSON.stringify(updated.map(getKey))).catch(
          (err) => console.error('Fehler beim Speichern der ausgewählten Skills:', err)
        );

        return updated;
      });
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
          if (!isDbReady || val.length < 1) return;
          try {
            const rows = await searchJobsInDb(val);
            setJobs(rows);
            setShowJobDropdown(true);
            setSaveJobVisible(true);
          } catch (err) {
            console.warn('Job Search Error:', err);
          }
        }, 280);
      },
      [errors.job, isDbReady]
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

        const rawQuery = textValue.includes(',') ? textValue.split(',').pop() : textValue;
        const query = rawQuery.trim().toLowerCase();

        if (!query) {
          setSkillsFiltered(skills);
          setShowSkillDropdown(true);
          return;
        }

        const wordBoundaryRegex = new RegExp(`\\b${query}`, 'i');
        const getMatchScore = (item) => {
          const role = (typeof item === 'string' ? item : item?.role || '').toLowerCase();
          const company = (typeof item === 'object' ? item?.company || '' : '').toLowerCase();
          const tasks = (typeof item === 'object' ? item?.tasks || '' : '').toLowerCase();

          if (role.startsWith(query)) return 100;
          if (wordBoundaryRegex.test(role)) return 80;
          if (role.includes(query)) return 60;
          if (company.startsWith(query)) return 40;
          if (company.includes(query)) return 30;
          if (tasks.includes(query)) return 20;
          return 0;
        };

        setSkillsFiltered([...skills].sort((a, b) => getMatchScore(b) - getMatchScore(a)));
        setShowSkillDropdown(true);
      },
      [skills]
    );

    const handleAnredeChange = useCallback(
      (val) => {
        setSelectedOption3((prev) => (prev === val ? '' : val));
        if (errors.anrede) setErrors((p) => ({ ...p, anrede: '' }));
        if (val === t('anredeOptions.herr') || val === t('anredeOptions.frau')) {
          jobRef2.current?.focus();
        } else {
          jobRef.current?.focus();
        }
      },
      [errors.anrede, t]
    );

    const handleSaveJob = useCallback(async () => {
      if (!isDbReady || !inputValue.trim()) return;
      try {
        await saveJobTitleToDb(inputValue);
        setSaveJobVisible(false);
        setShowJobDropdown(false);
        Alert.alert(t('bewerbung.savedTitle'), t('bewerbung.jobSavedMsg'));
      } catch (err) {
        console.error(err);
      }
    }, [isDbReady, inputValue, t]);

    const handleLanguageChange = useCallback(
      (langVal) => {
        const newLang = typeof langVal === 'function' ? langVal(languageValue) : langVal;
        setLanguageValue(newLang);

        if (checkFontLanguage(newLang) && fontValue === 'Helvetica') {
          if (!downloadedFonts['Roboto']) {
            Alert.alert(t('bewerbung.robotoNoticeTitle'), t('bewerbung.robotoNoticeMsg'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.download'),
                onPress: () => {
                  const robotoItem = fontOptions.find((f) => f.value === 'Roboto');
                  if (robotoItem) {
                    handleDownloadFont(robotoItem);
                    setFontValue('Roboto');
                  }
                },
              },
            ]);
          } else {
            setFontValue('Roboto');
          }
        }
      },
      [languageValue, fontValue, downloadedFonts, fontOptions, handleDownloadFont, t]
    );

    const handleGeneratePDF = async () => {
      setAccordionOpen(false);
      setShowJobDropdown(false);
      setShowSkillDropdown(false);

      const downloadedCount = Object.values(downloadedFonts).filter(Boolean).length;
      if (checkFontLanguage(languageValue) && (!downloadedFonts['Roboto'] || fontValue === 'Helvetica')) {
        if (downloadedCount > 1) {
          Alert.alert(t('bewerbung.robotoChengeFont'), t('bewerbung.robotChangeFontMsg'));
          setAccordionOpen(true);
        } else {
          Alert.alert(t('bewerbung.robotoMissingTitle'), t('bewerbung.robotoMissingMsg'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.download'),
              onPress: () => {
                const robotoItem = fontOptions.find((f) => f.value === 'Roboto');
                if (robotoItem) {
                  handleDownloadFont(robotoItem);
                  setFontValue('Roboto');
                }
              },
            },
          ]);
        }
        return;
      }

      const isDamenUndHerrenCheck = selectedOption3 === t('anredeOptions.damenUndHerren');
      const nextErrors = {};

      if (!selectedOption3) {
        nextErrors.anrede = t('validation.salutation.required');
      } else if (!isDamenUndHerrenCheck && !name.trim()) {
        nextErrors.anrede = t('validation.salutation.contactRequired');
      }
      if (!inputValue.trim()) nextErrors.job = t('validation.job.required');
      if (!erfahrung.trim()) nextErrors.skill = t('validation.skill.required');

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        if (!isDamenUndHerrenCheck && !name.trim()) jobRef2.current?.focus();
        else if (!inputValue.trim()) jobRef.current?.focus();
        else if (!erfahrung.trim()) inputRef.current?.focus();
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        await generateApplicationText({
          t,
          i18n,
          languageValue,
          fontValue,
          jobTitle: inputValue,
          erfahrung,
          selectedSkills,
          selectedOption,
          selectedOption2,
          selectedOption3,
          selectedQuality,
          contactName: name,
          scrapedDescription,
        });
        setLoading(false);
        changeScreen();
      } catch (error) {
        setLoading(false);
        console.error('Error during PDF generation:', error);
        Alert.alert(
          t('bewerbung.errorTitle'),
          error?.response?.data?.error || t('bewerbung.networkError')
        );
      }
    };

    const isDamenUndHerren = selectedOption3 === t('anredeOptions.damenUndHerren');
    const isUrlInput = useMemo(
      () => ['http://', 'https://', 'www.'].some((proto) => inputValue.includes(proto)),
      [inputValue]
    );

    return (
      <TouchableWithoutFeedback
        onPress={() => {
          setShowSkillDropdown(false);
          if (accordionOpen) Keyboard.dismiss();
          else inputRef.current?.focus();
        }}
        accessible={false}
      >
        <View style={styles.root}>
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
                    title={t('bewerbung.sectionSalutation')?.slice(0, 25)}
                    onInfo={() => openInfo(t('info.sectionSalutation'))}
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
                      <TouchableOpacity
                        onPress={() => openInfo(t('info.name'))}
                        style={styles.infoIconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name="badge"
                          size={20}
                          color={isDamenUndHerren ? WARM.textDim : WARM.iconLeading}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>

                      <TextInput
                        ref={jobRef2}
                        editable={!isDamenUndHerren}
                        spellCheck={false}
                        style={[styles.textInput, isDamenUndHerren && { color: WARM.textDim }]}
                        blurOnSubmit={false}
                        placeholder={t('bewerbung.placeholderSalutation')}
                        placeholderTextColor={WARM.textDim}
                        value={name}
                        onChangeText={(txt) => setName(txt.charAt(0).toUpperCase() + txt.slice(1))}
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => jobRef.current?.focus()}
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
                      <TouchableOpacity
                        onPress={() => openInfo(t('info.work'))}
                        style={styles.infoIconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={isUrlInput ? 'link' : 'work-outline'}
                          size={20}
                          color={WARM.iconLeading}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>
                      <TextInput
                        ref={jobRef}
                        style={styles.textInput}
                        placeholder={t('bewerbung.placeholderJob')}
                        placeholderTextColor={WARM.textDim}
                        value={inputValue}
                        blurOnSubmit={false}
                        onBlur={() => setTimeout(() => setShowJobDropdown(false), 220)}
                        onChangeText={handleJobChange}
                        autoCorrect={false}
                        spellCheck={false}
                        returnKeyType="next"
                        onSubmitEditing={() => inputRef.current?.focus()}
                      />

                      {isUrlInput ? (
                        <TouchableOpacity
                          onPress={() => startExtraction(inputValue)}
                          style={styles.extractBtn}
                          disabled={isExtracting}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                          <Text style={styles.extractBtnText}>{t('bewerbung.btnAnalyze')}</Text>
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
                          setTimeout(() => inputRef.current?.focus(), 150);
                        }}
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
                      <TouchableOpacity
                        onPress={() => openInfo(t('info.skill'))}
                        style={styles.infoIconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name="stars"
                          size={20}
                          color={WARM.iconLeading}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>
                      <TextInput
                        ref={inputRef}
                        style={styles.textInput}
                        placeholder={
                          selectedSkills.length > 0
                            ? t('bewerbung.skillsSelectedCount', { count: selectedSkills.length })
                            : t('bewerbung.placeholderSkills')
                        }
                        placeholderTextColor={WARM.textDim}
                        value={erfahrung}
                        onBlur={() => {
                          skillBlurTimeout.current = setTimeout(() => setShowSkillDropdown(false), 220);
                        }}
                        onChangeText={handleErfahrungChange}
                        blurOnSubmit={false}
                        autoCorrect={false}
                        returnKeyType="done"
                        spellCheck={false}
                      />

                      <TouchableOpacity
                        onPress={handleToggleSkillDropdown}
                        style={styles.iconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={showSkillDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={22}
                          color={WARM.iconLeading}
                        />
                      </TouchableOpacity>
                    </View>

                    {showSkillDropdown && skillsFiltered.length > 0 && (
                      <SuggestionDropdown
                        data={skillsFiltered}
                        onSelect={handleToggleSelectSkill}
                        onToggleSelect={handleToggleSelectSkill}
                        selectedItems={selectedSkills}
                        theMaxHeight={height * 0.1}
                        isSkill={true}
                      />
                    )}
                  </View>

                  {/* BOTTOM ACTIONS */}
                  <View style={styles.bottomActionRow}>
                    <TouchableOpacity
                      style={[styles.settingsButton, accordionOpen && styles.settingsButtonActive]}
                      onPress={() => setAccordionOpen((p) => !p)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="tune" size={18} color={WARM.iconLeading} />
                      <Text style={styles.settingsButtonText} numberOfLines={1}>
                        {t('bewerbung.options')}
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
                            {` ${t('pleaseWait')}`}
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
                          <Text style={styles.generateBtnText}>{t('bewerbung.btnStart')}</Text>
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
              <OptionsPanel
                t={t}
                openInfo={openInfo}
                onClose={() => {
                  Keyboard.dismiss();
                  setAccordionOpen(false);
                }}
                onBack={() => setAccordionOpen(false)}
                onGenerate={handleGeneratePDF}
                loading={loading}
                employmentOptions={employmentOptions}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
                applicationOptions={applicationOptions}
                selectedOption2={selectedOption2}
                setSelectedOption2={setSelectedOption2}
                qualityKeys={qualityKeys}
                qualityLabels={qualityLabels}
                selectedQuality={selectedQuality}
                setSelectedQuality={setSelectedQuality}
                fontOptions={fontOptions}
                fontValue={fontValue}
                setFontValue={setFontValue}
                downloadingFonts={downloadingFonts}
                downloadedFonts={downloadedFonts}
                onDownloadFont={handleDownloadFont}
                languageValue={languageValue}
                onLanguageChange={handleLanguageChange}
              />
            </View>
          </Animated.View>

          {isExtracting && (
            <ExtractionOverlay
              t={t}
              webViewUrl={webViewUrl}
              webViewRef={webViewRef}
              injectScript={injectScript}
              onMessage={onMessage}
              onError={() => {
                cancelExtraction();
                Alert.alert(t('bewerbung.errorTitle'), t('bewerbung.errorLoadJob'));
              }}
              onCancel={cancelExtraction}
            />
          )}

          <Info visible={infoVisible} onClose={closeInfo} message={infoMessage} />
        </View>
      </TouchableWithoutFeedback>
    );
  }
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    overflow: 'hidden',
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
  stageScroll: { flex: 1, width: '100%' },
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 240, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  suggestionsField: { width: '100%' },
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
  inputIcon: { marginRight: 10 },
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
  infoIconBtn: {
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
  suggestionField: {
    position: 'relative',
    zIndex: 20,
    marginBottom: 12,
  },
  suggestionFieldSkill: {
    position: 'relative',
    zIndex: 10,
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
});

export default memo(Bewerbung);