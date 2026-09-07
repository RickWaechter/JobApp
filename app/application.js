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
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import axios from 'axios';

import { router } from 'expo-router';
import { sha512 } from 'js-sha512';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import { WebView } from 'react-native-webview';

import Info from '../comp/info.js';
import colors from '../inc/colors.js';
import { runQuery } from '../inc/db.js';
import {
  agenturScript,
  extractScript,
  jobvectorScript,
  meinestadtScript,
  stepstoneScript,
} from '../inc/scrapper.js';

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

const SuggestionDropdown = memo(({ data, onSelect, onDelete, isSkill = false, theMaxHeight = height * 0.16 }) => (
  <View style={[styles.suggestionsCard, { maxHeight: theMaxHeight }]}>
    <FlatList
      data={data}
      keyExtractor={(item, index) => (item.rowid ? String(item.rowid) : String(index))}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const text = isSkill ? item : item.text;
        return (
          <View style={styles.suggestionRow}>
            <TouchableOpacity
              style={styles.suggestionTextArea}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.resultIconWrapper}>
                <MaterialIcons
                  name={isSkill ? 'psychology' : 'location-on'}
                  size={16}
                  color={WARM.iconPin}
                />
              </View>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {text}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteSuggestionBtn}
              onPress={() => onDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={16} color={WARM.iconClear} />
            </TouchableOpacity>
          </View>
        );
      }}
    />
  </View>
));

const useDatabase = () => {
  const dbMainRef = useRef(null);
  const dbJobsRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
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
        }
      } catch (err) {
        console.error('Database Init Error:', err);
      }
    };

    init();
    return () => {
      isMounted = false;
      dbJobsRef.current?.close();
      dbMainRef.current?.close();
    };
  }, []);

  return { dbMainRef, dbJobsRef };
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
          t('bewerbung.timeoutMsg') || 'Stellenanzeige hat zu lange geladen. Bitte prüfe die URL.',
        );
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [isExtracting, t]);

  const startExtraction = useCallback(
    (inputValue) => {
      Keyboard.dismiss();
      const text = inputValue.trim();
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
          t('bewerbung.invalidLinkMsg') || 'Bitte füge einen vollständigen Link ein.',
        );
        return;
      }

      const matchedPlatform = PLATFORMS.find((p) => url.toLowerCase().includes(p.domain));
      activeScriptRef.current = matchedPlatform ? matchedPlatform.script : extractScript;
      setWebViewUrl(url);
      setIsExtracting(true);
    },
    [t],
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
          onExtractSuccess?.(data.title.split('(')[0].trim(), data.description);
          Alert.alert(
            t('bewerbung.extractSuccessTitle') || 'Erfolg!',
            t('bewerbung.extractSuccessMsg') || 'Stellenanzeige wurde analysiert.',
          );
        } else {
          Alert.alert(
            t('bewerbung.extractHintTitle') || 'Hinweis',
            data.message || t('bewerbung.extractDefaultError') || 'Konnte keine Daten extrahieren.',
          );
        }
      } catch (e) {
        console.warn('Extraction parsing error', e);
      } finally {
        cancelExtraction();
      }
    },
    [onExtractSuccess, cancelExtraction, t],
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
  const { t } = useTranslation();
  const { dbMainRef, dbJobsRef } = useDatabase();

  const [inputValue, setInputValue] = useState('');
  const [scrapedDescription, setScrapedDescription] = useState('');
  const [name, setName] = useState('');
  const [erfahrung, setErfahrung] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');

  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillsFiltered, setSkillsFiltered] = useState([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [saveJobVisible, setSaveJobVisible] = useState(false);
  const [saveSkillVisible, setSaveSkillVisible] = useState(false);

  const [accordionOpen, setAccordionOpen] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontValue, setFontValue] = useState('Helvetica');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [errors, setErrors] = useState({ name: '', job: '', skill: '', anrede: '' });

  const inputRef = useRef(null);
  const jobRef = useRef(null);
  const jobRef2 = useRef(null);
  const searchTimeout = useRef(null);

  /* ── Horizontale Ausfahr-Animation (fährt nach links raus) ── */
  const animCardX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animCardX, {
      toValue: isNextStep ? -width : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [isNextStep, animCardX]);

  useImperativeHandle(ref, () => ({
    focusJob: () => jobRef.current?.focus(),
    focusName: () => jobRef2.current?.focus(),
    focusSkill: () => inputRef.current?.focus(),
  }));

  const fontOptions = useMemo(
    () => [
      { label: t('bewerbung.fonts.helvetica') || 'Helvetica (Modern & Klar)', value: 'Helvetica' },
      { label: t('bewerbung.fonts.helveticaOblique') || 'Helvetica Oblique', value: 'HelveticaOblique' },
      { label: t('bewerbung.fonts.timesRoman') || 'Times Roman (Serif)', value: 'TimesRoman' },
      { label: t('bewerbung.fonts.timesRomanItalic') || 'Times Roman Italic', value: 'TimesRomanItalic' },
      { label: t('bewerbung.fonts.courier') || 'Courier (Monospace)', value: 'Courier' },
      { label: t('bewerbung.fonts.courierOblique') || 'Courier Oblique', value: 'CourierOblique' },
    ],
    [t],
  );

  const employmentOptions = useMemo(
    () => [
      t('employmentOptions.vollzeit') || 'Vollzeit',
      t('employmentOptions.teilzeit') || 'Teilzeit',
      t('employmentOptions.minijob') || 'Minijob',
    ],
    [t],
  );

  const applicationOptions = useMemo(
    () => [
      t('applicationOptions.regulär') || 'Regulär',
      t('applicationOptions.initiativ') || 'Initiativ',
      t('applicationOptions.praktikum') || 'Praktikum',
    ],
    [t],
  );

  const anredeOptions = useMemo(
    () => [
      t('anredeOptions.herr') || 'Herr',
      t('anredeOptions.damenUndHerren') || 'Damen und Herren',
      t('anredeOptions.frau') || 'Frau',
    ],
    [t],
  );

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

  useEffect(() => {
    let active = true;
    const fetchSkills = async () => {
      if (!dbMainRef.current) return;
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const res = await runQuery(dbMainRef.current, 'SELECT skills FROM files WHERE ident = ?', [
          deviceId,
        ]);
        const raw = res?.rows?.raw()?.[0]?.skills;
        if (active && typeof raw === 'string') {
          setSkills(raw.split('#').filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to load user skills:', err);
      }
    };

    const timer = setTimeout(fetchSkills, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dbMainRef, erfahrung]);

  const handleNextStep = useCallback((currentStep) => {
    if (currentStep === 'ansprechpartner') {
      jobRef.current?.focus();
    } else if (currentStep === 'job') {
      inputRef.current?.focus();
    } else if (currentStep === 'skill') {
    }
  }, []);

  const toggleAccordion = useCallback(() => {
    Keyboard.dismiss();
    setAccordionOpen((prev) => !prev);
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
            [`${val}*`],
          );
          setJobs(res.rows.raw());
          setShowJobDropdown(true);
          setSaveJobVisible(true);
        } catch (err) {
          console.warn('Job Search Error:', err);
        }
      }, 280);
    },
    [errors.job, dbJobsRef],
  );

  const handleErfahrungChange = useCallback(
    (val) => {
      setErfahrung(val);
      if (errors.skill) setErrors((p) => ({ ...p, skill: '' }));
      setSaveSkillVisible(val.length > 0);

      const matches = skills.filter((s) => s.toLowerCase().includes(val.toLowerCase()));
      setSkillsFiltered(matches);
      setShowSkillDropdown(matches.length > 0 && val.length > 0);
    },
    [errors.skill, skills],
  );

  const handleAnredeChange = useCallback(
    (val) => {
      setSelectedOption3((prev) => (prev === val ? '' : val));
      if (errors.anrede) setErrors((p) => ({ ...p, anrede: '' }));
      setTimeout(() => {
        if (val === 'Herr' || val === 'Frau') {
          jobRef2.current?.focus();
        } else {
          jobRef.current?.focus();
        }
      }, 100);
    },
    [errors.anrede],
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
        t('bewerbung.jobSavedMsg') || 'Berufsbezeichnung gemerkt.',
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
        [erfahrung.trim(), deviceId],
      );
      setSaveSkillVisible(false);
      setShowSkillDropdown(false);
      Alert.alert(
        t('bewerbung.savedTitle') || 'Gespeichert',
        t('bewerbung.skillSavedMsg') || 'Kenntnis gemerkt.',
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
    [dbJobsRef],
  );

  const handleDeleteSkill = useCallback(
    async (skill) => {
      if (!dbMainRef.current) return;
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const filtered = skills.filter((item) => item !== skill);
        const updated = filtered.length > 0 ? filtered.join('#') : null;
        await dbMainRef.current.executeSql('UPDATE files SET skills = ? WHERE ident = ?', [
          updated,
          deviceId,
        ]);
        setSkills(filtered);
        setSkillsFiltered(filtered);
      } catch (err) {
        console.error(err);
      }
    },
    [dbMainRef, skills],
  );

  /* ── Starten / Generieren ── */
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

    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, 450);

    try {
      await EncryptedStorage.setItem('font', fontValue);
      await EncryptedStorage.setItem('beruf', inputValue);
      await EncryptedStorage.setItem('erfahrung', erfahrung);
      await EncryptedStorage.setItem('time', selectedOption);
      await EncryptedStorage.setItem('type', selectedOption2);

      const choice = selectedOption || t('employmentOptions.vollzeit') || 'Vollzeit';
      const timepart = selectedOption2
        ? `${selectedOption2}${t('bewerbung.subjectCoverLetterFor') || 'e Bewerbung als '}`
        : t('bewerbung.subjectCoverLetter') || 'Bewerbung als ';
      await EncryptedStorage.setItem('subject', `${timepart}${inputValue} (${choice})`);

      let anrede = t('bewerbung.salutationDearAll') || 'Sehr geehrte Damen und Herren,';
      if (selectedOption3.includes('Herr')) {
        anrede = t('bewerbung.salutationDearMr', { name }) || `Sehr geehrter Herr ${name},`;
      } else if (selectedOption3.includes('Frau')) {
        anrede = t('bewerbung.salutationDearMrs', { name }) || `Sehr geehrte Frau ${name},`;
      }
      await EncryptedStorage.setItem('anrede', anrede);

      let prompt1 = `Schreibe eine ${selectedOption2 || 'professionelle'} Bewerbung für die Position als ${inputValue}. Ich habe ${erfahrung} Erfahrung.
- Keine Firmennamen oder spezifische Unternehmen nennen.
- Die Anrede komplett weglassen und direkt mit dem Text beginnen.
- Maximal 300 Wörter.
- Beende mit "Mit freundlichen Grüßen", ohne Namen.`;

      if (scrapedDescription?.trim()) {
        prompt1 += `\n\nNutze folgende Anforderungen der Stellenanzeige für passende Keywords:\n"${scrapedDescription}"`;
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const key = sha512(deviceId);

      const response = await axios.post(
        'https://api.jobapp2.de/getText',
        { prompt1, key },
        { timeout: 25000 },
      );

      clearInterval(interval);
      setLoading(false);

     if (response.data.response) {
        console.log('Received response:', response.data.response);
        await EncryptedStorage.setItem('text', response.data.response);
        await EncryptedStorage.setItem('result', 'change');
        changeScreen(); // Löst navigateToChange() in StartApp.js aus
      }
      // Der nachfolgende Animated.timing(animCardX, { toValue: -400 }) Block entfällt komplett!
    } catch (error) {
      clearInterval(interval);
      setLoading(false);
      console.log('Error during PDF generation:', error);
      Alert.alert(
        t('bewerbung.errorTitle') || 'Fehler',
        error.response?.data?.error || t('bewerbung.networkError') || 'Netzwerkfehler beim Erstellen des Textes.',
      );
    }
  };

  const isDamenUndHerren = selectedOption3 === (t('anredeOptions.damenUndHerren') || 'Damen und Herren');
  const isUrlInput = useMemo(
    () => ['http://', 'https://', 'www.'].some((proto) => inputValue.includes(proto)),
    [inputValue],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Info
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        message={
          t('bewerbung.infoModalMessage') ||
          'Kopiere einfach den Link einer Stellenanzeige in das Berufsfeld – wir ziehen die Anforderungen automatisch heraus!'
        }
      />

      {/* Die gesamte Ansicht fährt synchron nach links raus */}
      <Animated.View
        style={[
          styles.animatedScreenWrap,
          { transform: [{ translateX: animCardX }] },
        ]}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                      inputRef.current?.focus();
                    }}
                    onDelete={handleDeleteJob}
                  />
                )}
              </View>

              {/* KENNTNISSE */}
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
                    placeholder={t('bewerbung.placeholderSkills') || 'z.B. 3 Jahre React Native...'}
                    placeholderTextColor={WARM.textDim}
                    value={erfahrung}
                    onBlur={() => setTimeout(() => setShowSkillDropdown(false), 220)}
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

                {erfahrung.length > 0 && showSkillDropdown && skillsFiltered.length > 0 && (
                  <SuggestionDropdown
                    data={skillsFiltered}
                    onSelect={(suggestion) => {
                      setErfahrung(suggestion);
                      setShowSkillDropdown(false);
                      setSaveSkillVisible(false);
                    }}
                    theMaxHeight={height * 0.08}
                    onDelete={handleDeleteSkill}
                    isSkill
                  />
                )}
              </View>

              {/* BOTTOM ACTIONS */}
              <View style={styles.bottomActionRow}>
                <TouchableOpacity
                  style={[styles.settingsButton, accordionOpen && styles.settingsButtonActive]}
                  onPress={toggleAccordion}
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
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={[styles.generateBtnText, { marginLeft: 8, fontSize: 13 }]} numberOfLines={1}>
                        {` Bitte warten`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.generateBtnText}>{t('Starten') || 'Starten'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ERWEITERTE OPTIONEN */}
            {accordionOpen && (
              <View style={styles.accordionPanel}>
                <Text style={styles.subFieldLabel}>
                  {t('bewerbung.labelEmployment') || 'ANSTELLUNGSART'}
                </Text>
                <SegmentedPills
                  options={employmentOptions}
                  selected={selectedOption}
                  onSelect={(opt) => setSelectedOption((p) => (p === opt ? '' : opt))}
                />

                <Text style={[styles.subFieldLabel, { marginTop: 14 }]}>
                  {t('bewerbung.labelAppType') || 'BEWERBUNGSTYP'}
                </Text>
                <SegmentedPills
                  options={applicationOptions}
                  selected={selectedOption2}
                  onSelect={(opt) => setSelectedOption2((p) => (p === opt ? '' : opt))}
                />

                <Text style={[styles.subFieldLabel, { marginTop: 14 }]}>
                  {t('bewerbung.labelFont') || 'SCHRIFTART IM PDF'}
                </Text>
                <View style={{ zIndex: 1000, marginTop: 4 }}>
                  <DropDownPicker
                    open={fontPickerOpen}
                    value={fontValue}
                    items={fontOptions}
                    setOpen={setFontPickerOpen}
                    setValue={setFontValue}
                    placeholder={t('bewerbung.placeholderFont') || 'Schriftart wählen'}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownList}
                    textStyle={{ color: WARM.textMain, fontSize: 13.5, fontWeight: '500' }}
                    arrowIconStyle={{ tintColor: WARM.iconArrow }}
                    dropDownDirection="TOP"
                    listMode="SCROLLVIEW"
                  />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
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
                  t('bewerbung.errorLoadJob') || 'Stellenanzeige konnte nicht geladen werden.',
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
    </SafeAreaView>
  );
});

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedScreenWrap: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
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
    backgroundColor: "rgba(255, 240, 225, 0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    top: 52,
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
  deleteSuggestionBtn: {
    paddingHorizontal: 12,
    marginLeft: 6,
  },
  accordionPanel: {
    backgroundColor: WARM.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    padding: 16,
  },
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
    fontSize: 12.5,
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