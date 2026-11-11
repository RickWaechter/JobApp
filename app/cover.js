import { useState, useRef, useEffect, useCallback } from 'react';
import {ExperienceCard} from '../comp/expCard';
import  {EducationCard} from '../comp/eduCard'; 
import {
  View,
  Text,
  TextInput,
  Dimensions,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
  Alert,
  StyleSheet,
  useColorScheme,
  AppState,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ScaleDecorator,
  NestableScrollContainer,
  NestableDraggableFlatList,
} from 'react-native-draggable-flatlist';
import {Image} from 'expo-image';
import { cvView } from '../inc/cvView.js';
import WebView from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  startCvScan,
  resumePollingIfNeeded,
  stopCvPolling,
} from '../inc/cvScan.js';
import { getDatabaseConnection } from '../inc/db.js';
import EncryptedStorage from 'react-native-encrypted-storage';
export default function CoverScreen() {
  const { width: winW } = Dimensions.get('window');
  const isDark = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState('edit');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showPersonal, setShowPersonal] = useState(true);
  const [showExperience, setShowExperience] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
const isLoadedRef = useRef(false);
const lastSavedRef = useRef('');
  const [isScanningCv, setIsScanningCv] = useState(false);
  const dbMainRef = useRef(null);
  const t = (key) => key;
const [saveCvTitle, setSaveCvTitle] = useState('');
  const [activeSection, setActiveSection] = useState('personal');
  const [exitingSection, setExitingSection] = useState(null);

  const animPersonal = useRef(new Animated.Value(0)).current;
  const animExperience = useRef(new Animated.Value(winW)).current;
  const animEducation = useRef(new Animated.Value(winW)).current;
  const animSkills = useRef(new Animated.Value(winW)).current;
  const animPreview = useRef(new Animated.Value(winW)).current;

  const isAnimating = useRef(false);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState('Modern');
  const [savedCvName, setSavedCvName] = useState([]);
  const [savedCv, setSavedCv] = useState([]);
const [isFabOpen, setIsFabOpen] = useState(false);
const fabAnim = useRef(new Animated.Value(0)).current;
  // WebView-, Seitenmodus- und Export-Status
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
const [showSavedCvsMenu, setShowSavedCvsMenu] = useState(false);
  const theme = {
    bg: isDark ? '#000000' : '#f3f4f6',
    card: isDark ? '#18181b' : '#ffffff',
    cardElevated: isDark ? '#22252e' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    subtext: isDark ? '#a1a1aa' : '#6b7280',
    inputBg: isDark ? '#27272a' : '#f3f4f6',
    border: isDark ? '#27272a' : '#e5e7eb',
    primary: isDark ? '#0b3b77' : '#2563eb',
    badgeBg: isDark ? '#27272a' : '#eff6ff',
  };

  const sectionButtons = [
    { key: 'personal', label: 'Profil', icon: '👤' },
    { key: 'experience', label: 'Erfahrung', icon: '💼' },
    { key: 'education', label: 'Ausbildung', icon: '🎓' },
    { key: 'skills', label: 'Skills', icon: '⚡' },
  ];

  const animMap = {
    personal: animPersonal,
    experience: animExperience,
    education: animEducation,
    skills: animSkills,
  };

  const visibilitySetters = {
    personal: setShowPersonal,
    experience: setShowExperience,
    education: setShowEducation,
    skills: setShowSkills,
  };

  const [personal, setPersonal] = useState({
  
  });

  const [experiences, setExperiences] = useState([
    {
    
    },
  ]);

  const [educations, setEducations] = useState([
    {
    
    },
  ]);

  const [skills, setSkills] = useState(
    'React Native, TypeScript, JavaScript, Git, REST APIs'
  );

  // Dynamisches HTML abhängig von 1-Pager / 2-Pager
  const htmlLayout = cvView(
    isTwoPage,
  
    personal,
    experiences,
    educations,

    skills
  );
// Vor dem return in CoverScreen:
const handleStartScan = () => {
  if (isScanningCv) return;
  startCvScan({
    isScanningCv,
    setIsScanningCv,
    setExperiences,
    setEducations,
    setSkills,
    setPersonal,
    dbInstance: dbMainRef.current,
    t,
  });
};
const renderExperienceItem = useCallback(
  (props) => (
    <ExperienceCard
      {...props}
      theme={theme}
      onUpdate={updateExperience}
      onRemove={removeExperience}
    />
  ),
  [theme]
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
  [theme]
);
const toggleFab = () => {
  const toValue = isFabOpen ? 0 : 1;
  Animated.spring(fabAnim, {
    toValue,
    useNativeDriver: true,
    tension: 65,
    friction: 9,
  }).start();
  setIsFabOpen(!isFabOpen);
};  
useEffect(() => {
  // Noch nicht fertig geladen? Auf keinen Fall speichern!
  if (!isLoadedRef.current) return;

  const tempObject = {
    personal,
    experiences,
    educations,
    skills,
  };

  const payload = JSON.stringify(tempObject);

  // Verhindert unnötiges Speichern, wenn der Inhalt identisch ist
  if (payload === lastSavedRef.current) return;

  // Debounce: 400ms warten (vermeidet Schreib-Overhead beim Tippen)
  const timer = setTimeout(async () => {
    try {
      await EncryptedStorage.setItem('tempCv', payload);
      lastSavedRef.current = payload;
      console.log('tempCv erfolgreich autosaved');
    } catch (err) {
      console.error('Fehler beim Autosave:', err);
    }
  }, 400);

  return () => clearTimeout(timer);
}, [personal, experiences, educations, skills]);
  // PDF erstellen und Share-Dialog öffnen
  const handleSharePdf = async () => {
    try {
      setIsExporting(true);
      const { uri } = await Print.printToFileAsync({
        html: htmlLayout,
        width: 595,  // DIN A4 Breite in Points (72 dpi)
        height: 842, // DIN A4 Höhe in Points (72 dpi)
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${personal.name || 'Lebenslauf'} teilen`,
        });
      } else {
        Alert.alert('Hinweis', 'Teilen wird auf diesem Gerät nicht unterstützt.');
      }
    } catch (error) {
      console.error('Fehler beim PDF Export:', error);
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setIsExporting(false);
    }
  };

  const changeSection = (nextKey) => {
    if (activeTab !== 'edit') setActiveTab('edit');
    if (nextKey === activeSection || isAnimating.current) return;
    isAnimating.current = true;

    const currentKey = activeSection;
    const currentIndex = sectionButtons.findIndex((btn) => btn.key === currentKey);
    const nextIndex = sectionButtons.findIndex((btn) => btn.key === nextKey);
    const isForward = nextIndex > currentIndex;

    const exitTarget = isForward ? -winW : winW;
    const enterStart = isForward ? winW : -winW;

    animMap[nextKey].setValue(enterStart);
    visibilitySetters[nextKey](true);

    setExitingSection(currentKey);
    setActiveSection(nextKey);

    Animated.parallel([
      Animated.timing(animMap[currentKey], {
        toValue: exitTarget,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animMap[nextKey], {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      visibilitySetters[currentKey](false);
      setExitingSection(null);
      isAnimating.current = false;
    });
  };

const persistCvData = async (titleToUse) => {
  const chosenKey = titleToUse?.trim() || personal.name?.trim() || 'Unbenannter Stand';

  try {
    const db = await getDatabaseConnection('firstNew.db');

    // 1. Bereits gespeicherte Stände laden
    const resSelect = await db.executeSql('SELECT cv FROM files', []);
    const item = resSelect[0]?.rows?.item(0);
    let existingData = {};

    if (item?.cv) {
      try {
        existingData = JSON.parse(item.cv) || {};
      } catch {
        existingData = {};
      }
    }

    // 2. Bestehende Stände behalten & neuen Key einfügen/überschreiben
    const updatedData = {
      ...existingData,
      [chosenKey]: {
        personal,
        experiences,
        educations,
        skills,
      },
    };

    // 3. Zurück in SQLite schreiben
    await db.executeSql('UPDATE files SET cv = ?', [JSON.stringify(updatedData)]);

    // 4. UI-States sofort aktualisieren
    setSavedCv(updatedData);
    setSavedCvName(Object.keys(updatedData).map((k) => ({ label: k, value: k })));

    // Eingabefeld leeren und Temp-Storage bereinigen
    setSaveCvTitle('');
    if (await EncryptedStorage.getItem('tempCv')) {
      await EncryptedStorage.removeItem('tempCv');
    }

    Alert.alert('Erfolg', `Stand „${chosenKey}“ wurde gespeichert.`);
    setShowSavedCvsMenu(false);
    toggleFab();
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    Alert.alert('Fehler', 'Der Lebenslauf konnte nicht gespeichert werden.');
    return false;
  }
};

  const saveCv = async () => {
    Alert.alert(
      'Lebenslauf speichern',
      `Möchtest du deinen Lebenslauf als „${personal.name || 'Ohne Namen'}“ sichern?\n\nDeine Daten werden ausschließlich lokal auf deinem Gerät gespeichert.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Speichern',
          onPress:async () => {
            persistCvData(personal);
            if (await EncryptedStorage.getItem('tempCv'))
            {
             await EncryptedStorage.removeItem('tempCv');  
            }
             setShowSavedCvsMenu(false);
            toggleFab();},
        },
      ]
    );
  };

  const resetFormToEmpty = () => {
    setPersonal({
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
    });
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
        {
          text: 'Verwerfen & Neu',
          style: 'destructive',
          onPress: resetFormToEmpty,
        },
        {
          text: 'Speichern & Neu',
          onPress: async () => {
            const success = await persistCvData(personal);
            if (success) {
              resetFormToEmpty();
            }
          },
        },
      ]
    );
  };

  const handleSelectLayout = (name) => {
    if (!savedCv[name]) return;
    setPersonal(savedCv[name].personal || {});
    setExperiences(savedCv[name].experiences || []);
    setEducations(savedCv[name].educations || []);
    setSkills(savedCv[name].skills || '');
  };

  useEffect(() => {
    resumePollingIfNeeded({
      setIsScanningCv,
      setExperiences,
      setEducations,
      setSkills,
      setPersonal,
      dbInstance: dbMainRef.current,
      t,
    });

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        resumePollingIfNeeded({
          
          setIsScanningCv,
          setExperiences,
          setEducations,
          setSkills,
          setPersonal,
          dbInstance: dbMainRef.current,
          t,
        });
      }
    });

    return () => {
      sub.remove();
      stopCvPolling();
    };
  }, []);

  const addExperience = () => {
    setExperiences([
      { id: Date.now().toString(), role: '', company: '', period: '', description: '' },
      ...experiences,
    ]);
  };

  const updateExperience = (id, field, value) => {
    setExperiences(
      experiences.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExperience = (id) => {
    setExperiences(experiences.filter((exp) => exp.id !== id));
  };

  const addEducation = () => {
    setEducations([
      { id: Date.now().toString(), degree: '', school: '', period: '' },
      ...educations,
    ]);
  };

  const updateEducation = (id, field, value) => {
    setEducations(
      educations.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu))
    );
  };

  const removeEducation = (id) => {
    setEducations(educations.filter((edu) => edu.id !== id));
  };
const deleteSavedCv = (keyToDelete) => {
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
              const db = await getDatabaseConnection('firstNew.db');
              const resSelect = await db.executeSql('SELECT cv FROM files', []);
              const item = resSelect[0]?.rows?.item(0);

              let existingData = {};
              if (item?.cv) {
                try {
                  existingData = JSON.parse(item.cv) || {};
                } catch {
                  existingData = {};
                }
              }

              // Key aus dem Datenobjekt entfernen
              delete existingData[keyToDelete];

              // In SQLite zurückspeichern
              await db.executeSql('UPDATE files SET cv = ?', [
                JSON.stringify(existingData),
              ]);

              // UI-States aktualisieren
              setSavedCv(existingData);
              const keys = Object.keys(existingData);
              setSavedCvName(keys.map((k) => ({ label: k, value: k })));
            } catch (err) {
              console.error('Fehler beim Löschen:', err);
              Alert.alert('Fehler', 'Der Stand konnte nicht gelöscht werden.');
            }
          },
        },
      ]
    );
  };
useEffect(() => {
  const get = async () => {
    try {
      // 1. Prüfen, ob temporärer Entwurf existiert
      const tempCv = await EncryptedStorage.getItem('tempCv');
      
      if (tempCv) {
        const parsed = JSON.parse(tempCv);
        
        // State befüllen, falls Daten da sind
        if (parsed.personal && Object.keys(parsed.personal).length > 0) {
          setPersonal(parsed.personal);
        }
        if (Array.isArray(parsed.experiences) && parsed.experiences.length > 0) {
          setExperiences(parsed.experiences);
        }
        if (Array.isArray(parsed.educations) && parsed.educations.length > 0) {
          setEducations(parsed.educations);
        }
        if (typeof parsed.skills === 'string') {
          setSkills(parsed.skills);
        }

        // Stand festhalten, damit der State-Update kein Re-Save triggert
        lastSavedRef.current = tempCv;
      }

      // 2. Vorlagen aus SQLite laden (Dropdown)
      const db = await getDatabaseConnection('firstNew.db');
      const resSelect = await db.executeSql('SELECT cv FROM files', []);
      const item = resSelect[0]?.rows?.item(0);
      if (item?.cv) {
        const jsonCv = JSON.parse(item.cv);
        setSavedCv(jsonCv);
        const keys = Object.keys(jsonCv);
        setSavedCvName(keys.map((k) => ({ label: k, value: k })));

      }
    } catch (e) {
      console.error('Fehler beim Laden:', e);
    } finally {
      // WICHTIG: Erst JETZT das Speichern für zukünftige Änderungen freigeben
      isLoadedRef.current = true;
    }
  };

  get();
}, []);

 
const {width, height} = useWindowDimensions();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
      

            {/* Oben Rechts: Speichern Button */}
       
      
    
        <NestableScrollContainer contentContainerStyle={styles.scrollContent}>
          {activeTab === 'edit' ? (
            <View style={styles.cardsContainer}>
              {/* 1. Sektion: Persönliche Daten */}
              {showPersonal && (
                <Animated.View
                  style={[
                    styles.sectionWrapper,
                    { transform: [{ translateX: animPersonal }] },
                    exitingSection === 'personal' && styles.exitingCard,
                  ]}
                >
                  <View
                    style={[
                      styles.singleCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Persönliche Daten
                    </Text>

                    <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Name</Text>
                    <TextInput
                      value={personal.name}
                      onChangeText={(t) => setPersonal({ ...personal, name: t })}
                      placeholder="Vollständiger Name"
                      placeholderTextColor={theme.subtext}
                      autoComplete="name"
                      autoCapitalize="words"
                      style={[
                        styles.input,
                        { backgroundColor: theme.inputBg, color: theme.text },
                      ]}
                    />

                    <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Jobtitel</Text>
                    <TextInput
                      value={personal.title}
                      onChangeText={(t) => setPersonal({ ...personal, title: t })}
                      placeholder="z.B. Mobile Developer"
                      placeholderTextColor={theme.subtext}
                      style={[
                        styles.input,
                        { backgroundColor: theme.inputBg, color: theme.text },
                      ]}
                    />

                    <View style={styles.row}>
                      <View style={[styles.flex1, styles.mr8]}>
                        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>E-Mail</Text>
                        <TextInput
                          value={personal.email}
                          onChangeText={(t) => setPersonal({ ...personal, email: t })}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoComplete="email"
                          autoCapitalize="none"
                          placeholderTextColor={theme.subtext}
                          style={[
                            styles.input,
                            { backgroundColor: theme.inputBg, color: theme.text },
                          ]}
                        />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Telefon</Text>
                        <TextInput
                          value={personal.phone}
                          onChangeText={(t) => setPersonal({ ...personal, phone: t })}
                          keyboardType="phone-pad"
                          textContentType="telephoneNumber"
                          placeholderTextColor={theme.subtext}
                          style={[
                            styles.input,
                            { backgroundColor: theme.inputBg, color: theme.text },
                          ]}
                        />
                      </View>
                    </View>

                    <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Wohnort</Text>
                    <TextInput
                      value={personal.location}
                      onChangeText={(t) => setPersonal({ ...personal, location: t })}
                      placeholder="Stadt, Land"
                      placeholderTextColor={theme.subtext}
                      style={[
                        styles.input,
                        { backgroundColor: theme.inputBg, color: theme.text },
                      ]}
                    />

                    <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Kurzprofil</Text>
                    <TextInput
                      value={personal.summary}
                      onChangeText={(t) => setPersonal({ ...personal, summary: t })}
                      multiline
                      placeholder="Kurze Beschreibung..."
                      placeholderTextColor={theme.subtext}
                      style={[
                        styles.input,
                        styles.textArea,
                        { backgroundColor: theme.inputBg, color: theme.text },
                      ]}
                    />
                  </View>
                </Animated.View>
              )}

              {/* 2. Sektion: Berufserfahrung */}
              {showExperience && (
                <Animated.View
                  style={[
                    styles.sectionWrapper,
                    { transform: [{ translateX: animExperience }] },
                    exitingSection === 'experience' && styles.exitingCard,
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Berufserfahrung ({experiences.length})
                    </Text>
                    <TouchableOpacity
                      onPress={addExperience}
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

              {/* 3. Sektion: Ausbildung */}
              {showEducation && (
                <Animated.View
                  style={[
                    styles.sectionWrapper,
                    { transform: [{ translateX: animEducation }] },
                    exitingSection === 'education' && styles.exitingCard,
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Ausbildung ({educations.length})
                    </Text>
                    <TouchableOpacity
                      onPress={addEducation}
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

              {/* 4. Sektion: Skills */}
              {showSkills && (
                <Animated.View
                  style={[
                    styles.sectionWrapper,
                    { transform: [{ translateX: animSkills }] },
                    exitingSection === 'skills' && styles.exitingCard,
                  ]}
                >
                  <View
                    style={[
                      styles.singleCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
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
                      style={[
                        styles.input,
                        { backgroundColor: theme.inputBg, color: theme.text },
                      ]}
                    />
                  </View>
                </Animated.View>
              )}
            </View>
          ) : (
            <Animated.View
              style={[
                styles.singleCard,
                styles.previewCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  transform: [{ translateX: animPreview }],
                },
              ]}
            >
              <View style={[styles.previewHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.previewName, { color: theme.text }]}>
                  {personal.name || 'Dein Name'}
                </Text>
                <Text style={[styles.previewTitle, { color: theme.primary }]}>
                  {personal.title || 'Dein Jobtitel'}
                </Text>
              </View>
            </Animated.View>
          )}
        </NestableScrollContainer>
{/* Floating Action Menu (fährt nach oben aus) */}
{/* Floating Action Menu (fährt nach oben aus) */}
<View style={styles.fabContainer} pointerEvents="box-none">
  {/* 4. Action: HTML / Preview (oben) */}
  <Animated.View
    pointerEvents={isFabOpen ? 'auto' : 'none'}
    style={[
      styles.fabItem,
      {
        opacity: fabAnim,
        transform: [
          {
            translateY: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -70],
            }),
          },
          { scale: fabAnim },
        ],
      },
    ]}
  ><TouchableOpacity
      style={[
        styles.floatingPreviewBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => {
        setShowSavedCvsMenu(false);
        toggleFab();
        setWebViewVisible(true);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.floatingPreviewIcon}>📄</Text>
    </TouchableOpacity>
  </Animated.View>

  {/* 3. Action: Gespeicherte Lebensläufe / Vorlagen */}
{/* 3. Action: Gespeicherte Lebensläufe / Vorlagen */}
  <Animated.View
    pointerEvents={isFabOpen ? 'auto' : 'none'}
    style={[
      styles.fabItem,
      {
        opacity: fabAnim,
        transform: [
          {
            translateY: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -140],
            }),
          },
          { scale: fabAnim },
        ],
      },
    ]}
  >
    {/* Popout-View links daneben: 50% größer, Titel zentriert & Speichern-Button */}
 {showSavedCvsMenu && (
  <View
    style={[
      styles.cvListFlyout,
      {
        backgroundColor: theme.card,
        borderColor: theme.border,
      },
    ]}
  >
    <Text style={[styles.cvListFlyoutTitle, { color: theme.text }]}>
      Gespeicherte Stände
    </Text>

    {/* Scrollbare Liste der vorhandenen Stände */}
 {/* Scrollbare Liste der bisherigen Lebensläufe */}
        <View style={styles.cvListContentWrap}>
          {savedCvName && savedCvName.length > 0 ? (
            savedCvName.map((cvItem) => {
              console.log("cvItem", cvItem);
              const isCurrent = personal.name === cvItem.value;
              return (
                <View key={cvItem.value} style={styles.cvListItemRow}>
                  {/* Stand auswählen & laden */}
                  <TouchableOpacity
                    style={[
                      styles.cvListItemBtn,
                      { backgroundColor: theme.inputBg },
                      isCurrent && {
                        borderColor: theme.primary,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => {
                      handleSelectLayout(cvItem.value);
                      setShowSavedCvsMenu(false);
                      toggleFab();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cvListItemText,
                        { color: theme.text },
                        isCurrent && styles.cvListItemTextBold,
                      ]}
                      numberOfLines={1}
                    >
                      📄 {cvItem.label}
                    </Text>
                  </TouchableOpacity>

                  {/* Stand löschen */}
                  <TouchableOpacity
                    style={styles.cvItemDeleteBtn}
                    onPress={() => deleteSavedCv(cvItem.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cvItemDeleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <Text style={[styles.cvListEmptyText, { color: theme.subtext }]}>
              Keine Stände vorhanden
            </Text>
          )}
        </View>{/* Scrollbare Liste der bisherigen Lebensläufe */}
  

    {/* Eingabefeld für den neuen Namen */}
    <TextInput
      value={saveCvTitle}
      onChangeText={setSaveCvTitle}
      placeholder="Name (z.B. Go Backend)"
      placeholderTextColor={theme.subtext}
      style={[
        styles.flyoutInput,
        { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
      ]}
    />

    {/* Speichern Button */}
    <TouchableOpacity
      style={[styles.cvSaveCurrentBtn, { backgroundColor: theme.primary }]}
      onPress={() => persistCvData(saveCvTitle)}
      activeOpacity={0.8}
    >
      <Text style={styles.cvSaveCurrentBtnIcon}>💾</Text>
      <Text style={styles.cvSaveCurrentBtnText}>Speichern</Text>
    </TouchableOpacity>
  </View>
)}

    {/* Runder Trigger-Button */}
    <TouchableOpacity
      style={[
        styles.floatingPreviewBtn,
        {
          backgroundColor: showSavedCvsMenu ? theme.primary : theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={() => setShowSavedCvsMenu(!showSavedCvsMenu)}
      activeOpacity={0.7}
    >
      <Image
        style={[
          styles.image,
        ]}
        source="https://img.icons8.com/?size=100&id=DM2tYcMgDzyn&format=png&color=000000"
        contentFit="cover"
        transition={1000}
      />
    </TouchableOpacity>
  </Animated.View>

  {/* 2. Action: CV Scan */}
  <Animated.View
    pointerEvents={isFabOpen ? 'auto' : 'none'}
    style={[
      styles.fabItem,
      {
        opacity: fabAnim,
        transform: [
          {
            translateY: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -210],
            }),
          },
          { scale: fabAnim },
        ],
      },
    ]}
  >
    <TouchableOpacity
      style={[
        styles.floatingPreviewBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => {
        setShowSavedCvsMenu(false);
        toggleFab();
        handleStartScan();
      }}
      activeOpacity={0.7}
    >
      <Image
        style={styles.image}
        source="https://img.icons8.com/?size=100&id=zceGtdSd7VGT&format=png&color=000000"
        contentFit="cover"
        transition={1000}
      />
    </TouchableOpacity>
  </Animated.View>

  {/* 1. Action: Neu / Reset */}
  <Animated.View
    pointerEvents={isFabOpen ? 'auto' : 'none'}
    style={[
      styles.fabItem,
      {
        opacity: fabAnim,
        transform: [
          {
            translateY: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -280],
            }),
          },
          { scale: fabAnim },
        ],
      },
    ]}
  >
    <TouchableOpacity
      style={[
        styles.floatingPreviewBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => {
        setShowSavedCvsMenu(false);
        toggleFab();
        handleCreateNew();
      }}
      activeOpacity={0.7}
    >
      <Image
        style={styles.image}
        source="https://img.icons8.com/?size=100&id=DanTQOnC4W9c&format=png&color=000000"
        contentFit="cover"
        transition={1000}
      />
    </TouchableOpacity>
  </Animated.View>

  {/* Haupt-Menü-Trigger (3 Streifen / Burger-Icon) */}
  <TouchableOpacity
    style={[
      styles.floatingPreviewBtn,
      styles.mainFabBtn,
      {
        backgroundColor: theme.primary,
        borderColor: theme.border,
      },
    ]}
    onPress={() => {
      setShowSavedCvsMenu(false);
      toggleFab();
    }}
    activeOpacity={0.8}
  >
    <Animated.Text
      style={[
        styles.mainFabIcon,
        {
          transform: [
            {
              rotate: fabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '90deg'],
              }),
            },
          ],
        },
      ]}
    >
      {isFabOpen ? '✕' : '☰'}
    </Animated.Text>
  </TouchableOpacity>
</View>
        {/* Untere Leiste mit den 4 Sektion-Buttons */}
        {activeTab === 'edit' && (
          <View style={styles.bottomNavContainer}>
            <View
              style={[
                styles.bottomTabBar,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {sectionButtons.map((btn) => {
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
                    <Text
                      style={[
                        styles.bottomTabIcon,
                        isSelected && styles.bottomTabIconActive,
                      ]}
                    >
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
                      <View
                        style={[
                          styles.bottomTabActiveDot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* WebView Modal Overlay mit 1-Pager/2-Pager Toggle & Download/Share */}
{/* WebView Modal Overlay mit modernem Floating Footer */}
{/* WebView Modal Overlay mit modernem Floating Footer */}
{webViewVisible && (
  <View style={styles.overlayBackdrop}>
    <View style={styles.webviewCard}>
      {/* 1. Vorschau nimmt den vollen Viewport ein */}
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlLayout }}
        style={styles.webview}
        scalesPageToFit={false}
        opaque={false}
      />

      {/* 2. Schwebende Steuerungsleiste unten */}
      <View style={styles.webviewFooterWrapper} pointerEvents="box-none">
        <View
          style={[
            styles.webviewFooterBar,
            {
              backgroundColor: isDark ? '#1F1A16' : '#ffffff',
              borderColor: isDark ? 'rgba(255, 220, 190, 0.16)' : '#e5e7eb',
            },
          ]}
        >
          {/* Schließen Button (Links) */}
          <TouchableOpacity
            onPress={() => setWebViewVisible(false)}
            style={[
              styles.footerCloseBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 240, 225, 0.08)' : '#f3f4f6',
                borderColor: isDark ? 'rgba(255, 220, 190, 0.12)' : '#e5e7eb',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerCloseBtnText, { color: theme.text }]}>✕</Text>
          </TouchableOpacity>

          {/* 1-Pager / 2-Pager Segmented Switch (Mitte) */}
          <View
            style={[
              styles.footerToggleContainer,
              {
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : '#f3f4f6',
                borderColor: isDark ? 'rgba(255, 220, 190, 0.08)' : '#e5e7eb',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.footerToggleBtn,
                !isTwoPage && [styles.footerToggleBtnActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setIsTwoPage(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.footerToggleText,
                  { color: !isTwoPage ? '#ffffff' : theme.subtext },
                  !isTwoPage && styles.footerToggleTextActive,
                ]}
              >
                1-Pager
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerToggleBtn,
                isTwoPage && [styles.footerToggleBtnActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setIsTwoPage(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.footerToggleText,
                  { color: isTwoPage ? '#ffffff' : theme.subtext },
                  isTwoPage && styles.footerToggleTextActive,
                ]}
              >
                2-Pager
              </Text>
            </TouchableOpacity>
          </View>

          {/* PDF Teilen Button (Rechts) */}
          <TouchableOpacity
            onPress={handleSharePdf}
            style={[styles.footerShareBtn, { backgroundColor: theme.primary }]}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.footerShareBtnIcon}>📥</Text>
                <Text style={styles.footerShareBtnText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
)}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  /* Flyout-Menü links neben dem FAB-Button */
/* Flyout-Menü links neben dem FAB (50% vergrößert) */
/* Flyout-Breite leicht anpassen, damit Button und Name sauber Platz haben */
  cvListFlyout: {
    position: 'absolute',
    right: 76,
    bottom: -20,
    width: 250,              // Etwas breiter (vorher 215) für den Lösch-Button
    maxHeight: 350,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 1000,
  },
  cvListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    gap: 6,
  },
  cvListItemBtn: {
    flex: 1,                 // Nimmt den restlichen Platz links ein
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  cvItemDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvItemDeleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  flyoutInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 8,
  },
  cvListFlyoutTitle: {
    fontSize: 16,            // Vorher 10.5 -> 50% größer
    fontWeight: '800',
    textAlign: 'center',     // Zentrierter Titel
    letterSpacing: 0.4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.35)',
    marginBottom: 8,
  },
  cvListContentWrap: {
    maxHeight: 180,
  },
  cvListItemBtn: {
    paddingVertical: 12,     // Vorher 7
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 4,
    justifyContent: 'center',
  },
  cvListItemText: {
    fontSize: 15,            // Vorher 12.5 -> deutlich lesbarer
    fontWeight: '500',
  },
  cvListItemTextBold: {
    fontWeight: '700',
  },
  cvListEmptyText: {
    fontSize: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  /* Speichern-Button darunter */
  cvSaveCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cvSaveCurrentBtnIcon: {
    fontSize: 16,
  },
  cvSaveCurrentBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  header: {
    
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5000,
    elevation: 10,
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerActionBtnText: {
    fontSize: 17.5,
    fontWeight: '700',
  },
  dropdownContainer: {
    flex: 1,
    maxWidth: 140,
    zIndex: 6000,
    elevation: 10,
  },
  dropdownPicker: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 7000,
    elevation: 12,
  },
  /* FAB Container & Items */
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 85, // Sitzt direkt über der Footer-Navigationsleiste
    zIndex: 900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabItem: {
    position: 'absolute',
    bottom: 0,
    zIndex: 890,
  },
  mainFabBtn: {
    borderWidth: 0,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  mainFabIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  floatingPreviewBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  image: {
     width:33,
    height:33
  },
  cardsContainer: {
    position: 'relative',
    width: '100%',
  },
  sectionWrapper: {
    width: '100%',
  },
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
  entryCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  entryCardActive: {
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragGripIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragGripIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  entryCardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  mr8: {
    marginRight: 8,
  },
  periodInputWrap: {
    width: '38%',
  },
  previewCard: {
    padding: 20,
  },
  previewHeader: {
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 14,
  },
  previewName: {
    fontSize: 22,
    fontWeight: '800',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Schwebender Papier-Kreis-Button */
  floatingPreviewBtn: {
   
    width: 60,
    height: 60,
    borderRadius: 50,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 110,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  floatingPreviewIcon: {
    fontSize: 22,
  },

  bottomNavContainer: {
    marginVertical: 12,
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
  bottomTabIcon: {
    fontSize: 19,
    marginBottom: 2,
  },
  bottomTabIconActive: {
    transform: [{ scale: 1.08 }],
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomTabLabelActive: {
    fontWeight: '800',
  },
  bottomTabActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  /* WebView Overlay Styles */
 /* WebView Overlay Styles */
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 13, 10, 0.88)',
    zIndex: 9999,
    elevation: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
  },
  webviewCard: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* Schwebender Dock-Footer */
  webviewFooterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16, // Platz für Home-Indicator
    paddingTop: 8,
  },
  webviewFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 16,
    gap: 8,
  },
  footerCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  footerToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  footerToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerToggleTextActive: {
    fontWeight: '700',
  },
  footerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    gap: 5,
    minWidth: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  footerShareBtnIcon: {
    fontSize: 15,
  },
  footerShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  webviewFooterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16, // Platz für Home-Indicator
    paddingTop: 8,
  },
  webviewFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 16,
    gap: 8,
  },
  footerCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  footerToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  footerToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerToggleTextActive: {
    fontWeight: '700',
  },
  footerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    gap: 5,
    minWidth: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  footerShareBtnIcon: {
    fontSize: 15,
  },
  footerShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  webviewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  pageToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    padding: 3,
  },
  pageToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pageToggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  pageToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  pageToggleTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 5,
  },
  sharePdfBtnIcon: {
    fontSize: 14,
  },
  sharePdfBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});