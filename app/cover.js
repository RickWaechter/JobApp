// CoverScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverFabMenu, CvPreviewOverlay } from '../comp/coverParts';
import { EducationCard } from '../comp/eduCard';
import { ExperienceCard } from '../comp/expCard';
import {
  deleteCvSnapshot,
  loadSavedCvsMap,
  loadTempCv,
  saveCvPdfEncrypted,
  saveCvSnapshot,
  saveTempCv,
  shareCvAsPdf,
} from '../inc/coverService.js';
import {
  resumePollingIfNeeded,
  startCvScan,
  stopCvPolling,
} from '../inc/cvScan.js';
import { cvView } from '../inc/cvView.js';
import { getDb } from '../inc/db.js';

const SECTION_BUTTONS = [
  { key: 'personal', label: 'Profil', icon: '👤' },
  { key: 'experience', label: 'Erfahrung', icon: '💼' },
  { key: 'education', label: 'Ausbildung', icon: '🎓' },
  { key: 'skills', label: 'Skills', icon: '⚡' },
];

export default function CoverScreen() {
  const { width: winW } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const t = useCallback((key) => key, []);

  // Formular-States
  const [personal, setPersonal] = useState({});
  const [experiences, setExperiences] = useState([{}]);
  const [educations, setEducations] = useState([{}]);
  const [skills, setSkills] = useState('React Native, TypeScript, JavaScript, Git, REST APIs');

  // Navigation & Animationen
  const [activeSection, setActiveSection] = useState('personal');
  const [exitingSection, setExitingSection] = useState(null);
  const [visibleSections, setVisibleSections] = useState({
    personal: true,
    experience: false,
    education: false,
    skills: false,
  });

  const animMap = useRef({
    personal: new Animated.Value(0),
    experience: new Animated.Value(winW),
    education: new Animated.Value(winW),
    skills: new Animated.Value(winW),
  }).current;
  const isAnimating = useRef(false);

  // Menü, Vorschau & Scan
  const [savedCv, setSavedCv] = useState({});
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isScanningCv, setIsScanningCv] = useState(false);

  // Autosave Refs
  const isLoadedRef = useRef(false);
  const lastSavedRef = useRef('');

  const theme = useMemo(
    () => ({
      bg: isDark ? '#000000' : '#f3f4f6',
      card: isDark ? '#18181b' : '#ffffff',
      cardElevated: isDark ? '#22252e' : '#f9fafb',
      text: isDark ? '#ffffff' : '#111827',
      subtext: isDark ? '#a1a1aa' : '#6b7280',
      inputBg: isDark ? '#27272a' : '#f3f4f6',
      border: isDark ? '#27272a' : '#e5e7eb',
      primary: isDark ? '#0b3b77' : '#2563eb',
      badgeBg: isDark ? '#27272a' : '#eff6ff',
    }),
    [isDark]
  );

  const htmlLayout = cvView(isTwoPage, personal, experiences, educations, skills);

  /* ── Initiales Laden & Autosave ─────────────────────────── */
  useEffect(() => {
    const init = async () => {
      try {
        const temp = await loadTempCv();
        if (temp) {
          const { parsed, raw } = temp;
          if (parsed.personal && Object.keys(parsed.personal).length > 0) setPersonal(parsed.personal);
          if (Array.isArray(parsed.experiences) && parsed.experiences.length > 0) setExperiences(parsed.experiences);
          if (Array.isArray(parsed.educations) && parsed.educations.length > 0) setEducations(parsed.educations);
          if (typeof parsed.skills === 'string') setSkills(parsed.skills);
          lastSavedRef.current = raw;
        }

        const storedCvs = await loadSavedCvsMap();
        setSavedCv(storedCvs);
      } catch (err) {
        console.error('Fehler beim Laden:', err);
      } finally {
        isLoadedRef.current = true;
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    const payload = JSON.stringify({ personal, experiences, educations, skills });
    if (payload === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      saveTempCv(payload)
        .then(() => {
          lastSavedRef.current = payload;
        })
        .catch((err) => console.error('Fehler beim Autosave:', err));
    }, 400);

    return () => clearTimeout(timer);
  }, [personal, experiences, educations, skills]);

  /* ── CV-Scan & Polling ──────────────────────────────────── */
  useEffect(() => {
    let active = true;

    const resumeScan = async () => {
      const db = await getDb();
      if (!active) return;
      resumePollingIfNeeded({
        where: 'cover',
        setIsScanningCv,
        setExperiences,
        setEducations,
        setSkills,
        setPersonal,
        dbInstance: db,
        t,
      });
    };

    resumeScan();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') resumeScan();
    });

    return () => {
      active = false;
      sub.remove();
      stopCvPolling();
    };
  }, [t]);

  const handleStartScan = async () => {
    if (isScanningCv) return;
    const db = await getDb();
    startCvScan({
      where: 'cover',
      isScanningCv,
      setIsScanningCv,
      setExperiences,
      setEducations,
      setSkills,
      setPersonal,
      dbInstance: db,
      t,
    });
  };

  /* ── Sektionswechsel-Animation ──────────────────────────── */
  const changeSection = useCallback(
    (nextKey) => {
      if (nextKey === activeSection || isAnimating.current) return;
      isAnimating.current = true;

      const currentKey = activeSection;
      const currentIdx = SECTION_BUTTONS.findIndex((b) => b.key === currentKey);
      const nextIdx = SECTION_BUTTONS.findIndex((b) => b.key === nextKey);
      const isForward = nextIdx > currentIdx;

      animMap[nextKey].setValue(isForward ? winW : -winW);
      setVisibleSections((prev) => ({ ...prev, [nextKey]: true }));
      setExitingSection(currentKey);
      setActiveSection(nextKey);

      Animated.parallel([
        Animated.timing(animMap[currentKey], {
          toValue: isForward ? -winW : winW,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(animMap[nextKey], {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleSections((prev) => ({ ...prev, [currentKey]: false }));
        setExitingSection(null);
        isAnimating.current = false;
      });
    },
    [activeSection, animMap, winW]
  );

  const toggleFab = useCallback(() => {
    setIsFabOpen((prev) => {
      const next = !prev;
      Animated.spring(fabAnim, {
        toValue: next ? 1 : 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
      return next;
    });
  }, [fabAnim]);

  /* ── Export & Stände-Aktionen ───────────────────────────── */
  const handleSaveBase64 = async () => {
    try {
      setIsExporting(true);
      await saveCvPdfEncrypted(htmlLayout);
      Alert.alert('Erfolg', 'Lebenslauf wurde verschlüsselt hinterlegt.');
    } catch (error) {
      console.error('Fehler in handleSaveBase64:', error);
      Alert.alert('Fehler', 'PDF konnte nicht als Lebenslauf gespeichert werden.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setIsExporting(true);
      const shared = await shareCvAsPdf(htmlLayout, personal.name);
      if (!shared) {
        Alert.alert('Hinweis', 'Teilen wird auf diesem Gerät nicht unterstützt.');
      }
    } catch (error) {
      console.error('Fehler beim PDF Export:', error);
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setIsExporting(false);
    }
  };

  const persistCvData = async (titleToUse) => {
    const rawTitle = typeof titleToUse === 'string' ? titleToUse.trim() : '';
    const chosenKey = rawTitle || personal.name?.trim() || 'Unbenannter Stand';

    try {
      const updated = await saveCvSnapshot(chosenKey, {
        personal,
        experiences,
        educations,
        skills,
      });
      setSavedCv(updated);
      Alert.alert('Erfolg', `Stand „${chosenKey}“ wurde gespeichert.`);
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      Alert.alert('Fehler', 'Der Lebenslauf konnte nicht gespeichert werden.');
      return false;
    }
  };

  const resetFormToEmpty = () => {
    setPersonal({ name: '', title: '', email: '', phone: '', location: '', summary: '' });
    setExperiences([]);
    setEducations([]);
    setSkills('');
    changeSection('personal');
  };

  const handleCreateNew = () => {
    Alert.alert(
      'Neuen Lebenslauf anlegen',
      'Möchtest du den aktuellen Stand vor dem Zurücksetzen speichern?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen & Neu', style: 'destructive', onPress: resetFormToEmpty },
        {
          text: 'Speichern & Neu',
          onPress: async () => {
            if (await persistCvData(personal.name)) resetFormToEmpty();
          },
        },
      ]
    );
  };

  const handleSelectSavedCv = (name) => {
    const entry = savedCv[name];
    if (!entry) return;
    setPersonal(entry.personal || {});
    setExperiences(entry.experiences || []);
    setEducations(entry.educations || []);
    setSkills(entry.skills || '');
  };

  const handleDeleteSavedCv = (keyToDelete) => {
    Alert.alert(
      'Stand löschen',
      `Möchtest du „${keyToDelete}“ wirklich unwiderruflich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteCvSnapshot(keyToDelete);
              setSavedCv(updated);
            } catch (err) {
              console.error('Fehler beim Löschen:', err);
              Alert.alert('Fehler', 'Der Stand konnte nicht gelöscht werden.');
            }
          },
        },
      ]
    );
  };

  /* ── Listen-Handler (Erfahrung & Ausbildung) ────────────── */
  const updateExperience = useCallback((id, field, value) => {
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const removeExperience = useCallback((id) => {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEducation = useCallback((id, field, value) => {
    setEducations((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const removeEducation = useCallback((id) => {
    setEducations((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const renderExperienceItem = useCallback(
    (props) => (
      <ExperienceCard
        {...props}
        theme={theme}
        onUpdate={updateExperience}
        onRemove={removeExperience}
      />
    ),
    [theme, updateExperience, removeExperience]
  );

  const renderEducationItem = useCallback(
    (props) => (
      <EducationCard
        {...props}
        theme={theme}
        onUpdate={updateEducation}
        onRemove={removeEducation}
      />
    ),
    [theme, updateEducation, removeEducation]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <NestableScrollContainer contentContainerStyle={styles.scrollContent}>
          <View style={styles.cardsContainer}>
            {/* 1. Persönliche Daten */}
            {visibleSections.personal && (
              <Animated.View
                style={[
                  styles.sectionWrapper,
                  { transform: [{ translateX: animMap.personal }] },
                  exitingSection === 'personal' && styles.exitingCard,
                ]}
              >
                <View style={[styles.singleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Persönliche Daten</Text>

                  <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Name</Text>
                  <TextInput
                    value={personal.name}
                    onChangeText={(val) => setPersonal({ ...personal, name: val })}
                    placeholder="Vollständiger Name"
                    placeholderTextColor={theme.subtext}
                    autoComplete="name"
                    autoCapitalize="words"
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Jobtitel</Text>
                  <TextInput
                    value={personal.title}
                    onChangeText={(val) => setPersonal({ ...personal, title: val })}
                    placeholder="z.B. Mobile Developer"
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Adresse</Text>
                  <TextInput
                    value={personal.location}
                    onChangeText={(val) => setPersonal({ ...personal, location: val })}
                    placeholder="Stadt, Land"
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                  />

                  <View style={styles.row}>
                    <View style={[styles.flex1, styles.mr8]}>
                      <Text style={[styles.fieldLabel, { color: theme.subtext }]}>E-Mail</Text>
                      <TextInput
                        value={personal.email}
                        onChangeText={(val) => setPersonal({ ...personal, email: val })}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        autoCapitalize="none"
                        placeholderTextColor={theme.subtext}
                        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Telefon</Text>
                      <TextInput
                        value={personal.phone}
                        onChangeText={(val) => setPersonal({ ...personal, phone: val })}
                        keyboardType="phone-pad"
                        textContentType="telephoneNumber"
                        placeholderTextColor={theme.subtext}
                        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                      />
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Kurzprofil</Text>
                  <TextInput
                    value={personal.summary}
                    onChangeText={(val) => setPersonal({ ...personal, summary: val })}
                    multiline
                    placeholder="Kurze Beschreibung..."
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text }]}
                  />
                </View>
              </Animated.View>
            )}

            {/* 2. Berufserfahrung */}
            {visibleSections.experience && (
              <Animated.View
                style={[
                  styles.sectionWrapper,
                  { transform: [{ translateX: animMap.experience }] },
                  exitingSection === 'experience' && styles.exitingCard,
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Berufserfahrung ({experiences.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setExperiences((prev) => [
                        { id: Date.now().toString(), role: '', company: '', period: '', description: '' },
                        ...prev,
                      ])
                    }
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>+ Neue Position</Text>
                  </TouchableOpacity>
                </View>

                <NestableDraggableFlatList
                  data={experiences}
                  onDragEnd={({ data }) => setExperiences(data)}
                  keyExtractor={(item) => item.id}
                  renderItem={renderExperienceItem}
                  scrollEnabled={false}
                />
              </Animated.View>
            )}

            {/* 3. Ausbildung */}
            {visibleSections.education && (
              <Animated.View
                style={[
                  styles.sectionWrapper,
                  { transform: [{ translateX: animMap.education }] },
                  exitingSection === 'education' && styles.exitingCard,
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Ausbildung ({educations.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setEducations((prev) => [
                        { id: Date.now().toString(), degree: '', school: '', period: '' },
                        ...prev,
                      ])
                    }
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>+ Neuer Abschluss</Text>
                  </TouchableOpacity>
                </View>

                <NestableDraggableFlatList
                  data={educations}
                  onDragEnd={({ data }) => setEducations(data)}
                  keyExtractor={(item) => item.id}
                  renderItem={renderEducationItem}
                  scrollEnabled={false}
                />
              </Animated.View>
            )}

            {/* 4. Skills */}
            {visibleSections.skills && (
              <Animated.View
                style={[
                  styles.sectionWrapper,
                  { transform: [{ translateX: animMap.skills }] },
                  exitingSection === 'skills' && styles.exitingCard,
                ]}
              >
                <View style={[styles.singleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Fähigkeiten & Kenntnisse
                  </Text>
                  <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
                    Kommagetrennt eingeben
                  </Text>
                  <TextInput
                    value={skills}
                    onChangeText={setSkills}
                    placeholder="React Native, TypeScript, Git..."
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                  />
                </View>
              </Animated.View>
            )}
          </View>
        </NestableScrollContainer>

        {/* FAB-Menü */}
        <CoverFabMenu
          isOpen={isFabOpen}
          fabAnim={fabAnim}
          isDark={isDark}
          theme={theme}
          isScanningCv={isScanningCv}
          savedCvKeys={Object.keys(savedCv)}
          currentPersonName={personal.name}
          onToggle={toggleFab}
          onCreateNew={handleCreateNew}
          onSaveEncryptedCv={handleSaveBase64}
          onOpenPreview={() => setWebViewVisible(true)}
          onSharePdf={handleSharePdf}
          onStartScan={handleStartScan}
          onSelectSavedCv={handleSelectSavedCv}
          onDeleteSavedCv={handleDeleteSavedCv}
          onSaveSnapshot={persistCvData}
        />

        {/* Untere Tab-Leiste */}
        <View style={styles.bottomNavContainer}>
          <View style={[styles.bottomTabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {SECTION_BUTTONS.map((btn) => {
              const isSelected = activeSection === btn.key;
              return (
                <TouchableOpacity
                  key={btn.key}
                  onPress={() => changeSection(btn.key)}
                  style={[
                    styles.bottomTabButton,
                    isSelected && {
                      backgroundColor: isDark
                        ? 'rgba(11, 59, 119, 0.35)'
                        : 'rgba(37, 99, 235, 0.12)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bottomTabIcon, isSelected && styles.bottomTabIconActive]}>
                    {btn.icon}
                  </Text>
                  <Text
                    style={[
                      styles.bottomTabLabel,
                      { color: isSelected ? theme.primary : theme.subtext },
                      isSelected && styles.bottomTabLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {btn.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.bottomTabActiveDot, { backgroundColor: theme.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Vollbild-Vorschau Overlay */}
        <CvPreviewOverlay
          visible={webViewVisible}
          htmlLayout={htmlLayout}
          isDark={isDark}
          theme={theme}
          isTwoPage={isTwoPage}
          setIsTwoPage={setIsTwoPage}
          isExporting={isExporting}
          onSharePdf={handleSharePdf}
          onClose={() => setWebViewVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  cardsContainer: { position: 'relative', width: '100%' },
  sectionWrapper: { width: '100%' },
  exitingCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  singleCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  addButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    fontSize: 13.5,
    marginBottom: 8,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  mr8: { marginRight: 8 },
  bottomNavContainer: {
    marginVertical: 12,
    paddingHorizontal: 12,
    zIndex: 100,
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 14,
    position: 'relative',
  },
  bottomTabIcon: { fontSize: 19, marginBottom: 2 },
  bottomTabIconActive: { transform: [{ scale: 1.08 }] },
  bottomTabLabel: { fontSize: 11, fontWeight: '600' },
  bottomTabLabelActive: { fontWeight: '800' },
  bottomTabActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});