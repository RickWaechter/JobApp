import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Dimensions,
  Platform,
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
import { cvView } from '../inc/cvView.js';
import WebView from 'react-native-webview';
import DropDownPicker from 'react-native-dropdown-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  startCvScan,
  resumePollingIfNeeded,
  stopCvPolling,
} from '../inc/cvScan.js';
import { getDatabaseConnection } from '../inc/db.js';

export default function CoverScreen() {
  const { width: winW } = Dimensions.get('window');
  const isDark = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState('edit');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showPersonal, setShowPersonal] = useState(true);
  const [showExperience, setShowExperience] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  const [isScanningCv, setIsScanningCv] = useState(false);
  const dbMainRef = useRef(null);
  const t = (key) => key;

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

  // WebView-, Seitenmodus- und Export-Status
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    name: 'Rick Denis Wächter',
    title: 'Anwendungsentwickler',
    email: 'Rickwaechter@mail.de',
    phone: '0151 / 414 - 00730',
    location: 'Stuttgart, Deutschland',
    summary: 'Entwicklung robuster Mobile- und Backend-Lösungen.',
  });

  const [experiences, setExperiences] = useState([
    {
      id: '1',
      role: 'Mobile App Developer',
      company: 'TechSolutions GmbH',
      period: '2023 – Heute',
      description: '- Entwicklung und Wartung von iOS- und Android-Apps mit React Native.',
    },
  ]);

  const [educations, setEducations] = useState([
    {
      id: '1',
      degree: 'B.Sc. Informatik',
      school: 'Universität Stuttgart',
      period: '2019 – 2023',
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

  const persistCvData = async (dataToSave = personal) => {
    try {
      const db = await getDatabaseConnection('firstNew.db');
      const data = {
        [dataToSave.name || 'Unbenannt']: {
          personal: dataToSave,
          experiences,
          educations,
          skills,
        },
      };
      const jsonString = JSON.stringify(data);
      await db.executeSql('UPDATE files SET cv = ?', [jsonString]);
      Alert.alert('Erfolg', 'Lebenslauf wurde erfolgreich gespeichert.');
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      Alert.alert('Fehler', 'Der Lebenslauf konnte nicht gespeichert werden.');
      return false;
    }
  };

  const saveCv = () => {
    Alert.alert(
      'Lebenslauf speichern',
      `Möchtest du deinen Lebenslauf als „${personal.name || 'Ohne Namen'}“ sichern?\n\nDeine Daten werden ausschließlich lokal auf deinem Gerät gespeichert.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Speichern',
          onPress: () => persistCvData(personal),
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

  useEffect(() => {
    const get = async () => {
      const db = await getDatabaseConnection('firstNew.db');
      const resSelect = await db.executeSql('SELECT cv FROM files', []);
      const item = resSelect[0].rows.item(0);
      if (!item?.cv) return;
      const jsonCv = JSON.parse(item.cv);
      setSavedCv(jsonCv);
      const a = Object.keys(jsonCv);
      const b = a.map((key) => ({ label: key, value: key }));
      setSavedCvName(b);
    };
    get();
  }, []);

  const renderExperienceItem = useCallback(
    ({ item, drag, isActive, getIndex }) => {
      const index = getIndex();
      return (
        <ScaleDecorator activeScale={1.0}>
          <View
            style={[
              styles.entryCard,
              {
                backgroundColor: theme.card,
                borderColor: isActive ? theme.primary : theme.border,
              },
              isActive && styles.entryCardActive,
            ]}
          >
            <View style={styles.entryCardHeader}>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                style={styles.dragHandle}
                activeOpacity={0.7}
              >
                <View style={[styles.dragGripIconWrap, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.dragGripIcon, { color: theme.primary }]}>☰</Text>
                </View>
                <View>
                  <Text style={[styles.entryCardBadgeText, { color: theme.text }]}>
                    Position #{index !== undefined ? index + 1 : ''}
                  </Text>
                  <Text style={[styles.dragHintText, { color: theme.subtext }]}>
                    Halten & Ziehen
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => removeExperience(item.id)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>✕ Löschen</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Rolle / Jobtitel</Text>
            <TextInput
              value={item.role}
              onChangeText={(t) => updateExperience(item.id, 'role', t)}
              placeholder="z.B. Mobile App Developer"
              placeholderTextColor={theme.subtext}
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, color: theme.text },
              ]}
            />

            <View style={styles.row}>
              <View style={[styles.flex1, styles.mr8]}>
                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Firma</Text>
                <TextInput
                  value={item.company}
                  onChangeText={(t) => updateExperience(item.id, 'company', t)}
                  placeholder="Unternehmen"
                  placeholderTextColor={theme.subtext}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, color: theme.text },
                  ]}
                />
              </View>

              <View style={styles.periodInputWrap}>
                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Zeitraum</Text>
                <TextInput
                  value={item.period}
                  onChangeText={(t) => updateExperience(item.id, 'period', t)}
                  placeholder="MM/JJ – Heute"
                  placeholderTextColor={theme.subtext}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, color: theme.text },
                  ]}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Aufgaben & Erfolge</Text>
            <TextInput
              value={item.description}
              onChangeText={(t) => updateExperience(item.id, 'description', t)}
              placeholder="- Stichpunkte eingeben..."
              placeholderTextColor={theme.subtext}
              multiline
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.inputBg, color: theme.text },
              ]}
            />
          </View>
        </ScaleDecorator>
      );
    },
    [theme, experiences]
  );

  const renderEducationItem = useCallback(
    ({ item, drag, isActive, getIndex }) => {
      const index = getIndex();
      return (
        <ScaleDecorator activeScale={1.02}>
          <View
            style={[
              styles.entryCard,
              {
                backgroundColor: theme.card,
                borderColor: isActive ? theme.primary : theme.border,
              },
              isActive && styles.entryCardActive,
            ]}
          >
            <View style={styles.entryCardHeader}>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                style={styles.dragHandle}
                activeOpacity={0.7}
              >
                <View style={[styles.dragGripIconWrap, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.dragGripIcon, { color: theme.primary }]}>☰</Text>
                </View>
                <View>
                  <Text style={[styles.entryCardBadgeText, { color: theme.text }]}>
                    Abschluss #{index !== undefined ? index + 1 : ''}
                  </Text>
                  <Text style={[styles.dragHintText, { color: theme.subtext }]}>
                    Halten & Ziehen
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => removeEducation(item.id)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>✕ Löschen</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Abschluss / Zertifikat</Text>
            <TextInput
              value={item.degree}
              onChangeText={(t) => updateEducation(item.id, 'degree', t)}
              placeholder="z.B. B.Sc. Informatik"
              placeholderTextColor={theme.subtext}
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, color: theme.text },
              ]}
            />

            <View style={styles.row}>
              <View style={[styles.flex1, styles.mr8]}>
                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Schule / Universität</Text>
                <TextInput
                  value={item.school}
                  onChangeText={(t) => updateEducation(item.id, 'school', t)}
                  placeholder="Einrichtung"
                  placeholderTextColor={theme.subtext}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, color: theme.text },
                  ]}
                />
              </View>

              <View style={styles.periodInputWrap}>
                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Zeitraum</Text>
                <TextInput
                  value={item.period}
                  onChangeText={(t) => updateEducation(item.id, 'period', t)}
                  placeholder="JJJJ – JJJJ"
                  placeholderTextColor={theme.subtext}
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, color: theme.text },
                  ]}
                />
              </View>
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [theme, educations]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View
          onLayout={(event) => {
            setHeaderHeight(event.nativeEvent.layout.height);
          }}
          style={[
            styles.header,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              zIndex: Platform.OS === 'ios' ? 5000 : undefined,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            {/* Oben Links: Neu erstellen */}
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
              ]}
              onPress={handleCreateNew}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerActionBtnText, { color: theme.primary }]}>
                ✨
              </Text>
            </TouchableOpacity>

            {/* Mitte: Vorlagen Dropdown */}
            <View style={styles.dropdownContainer}>
              <DropDownPicker
                open={openDropdown}
                value={selectedLayout}
                items={savedCvName}
                setOpen={setOpenDropdown}
                setValue={setSelectedLayout}
                setItems={setSavedCvName}
                onSelectItem={(item) => handleSelectLayout(item.value)}
                placeholder="Vorlage"
                style={[
                  styles.dropdownPicker,
                  { backgroundColor: theme.inputBg, borderColor: theme.border },
                ]}
                textStyle={[styles.dropdownText, { color: theme.text }]}
                dropDownContainerStyle={[
                  styles.dropdownList,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                arrowIconStyle={{ tintColor: theme.subtext }}
                tickIconStyle={{ tintColor: theme.primary }}
                theme={isDark ? 'DARK' : 'LIGHT'}
              />
            </View>

            {/* Oben Rechts: Speichern Button */}
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={saveCv}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerActionBtnText, { color: '#ffffff' }]}>
                💾
              </Text>
            </TouchableOpacity>
              {/* Oben Rechts: Speichern Button 
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={startCvScan}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerActionBtnText, { color: '#ffffff' }]}>
                
              </Text>
            </TouchableOpacity>
            */}
          </View>
        </View>

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

        {/* Kreisrunder Papier-Button (60px) unten rechts */}
        <TouchableOpacity
          style={[
            styles.floatingPreviewBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => setWebViewVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.floatingPreviewIcon}>📄</Text>
        </TouchableOpacity>

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
        {webViewVisible && (
          <View style={styles.overlayBackdrop}>
            <View style={styles.webviewCard}>
              <View style={styles.webviewTopBar}>
                {/* 1-Pager / 2-Pager Umschalter */}
                <View style={styles.pageToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.pageToggleBtn,
                      !isTwoPage && styles.pageToggleBtnActive,
                    ]}
                    onPress={() => setIsTwoPage(false)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pageToggleText,
                        !isTwoPage && styles.pageToggleTextActive,
                      ]}
                    >
                      1-Pager
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pageToggleBtn,
                      isTwoPage && styles.pageToggleBtnActive,
                    ]}
                    onPress={() => setIsTwoPage(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pageToggleText,
                        isTwoPage && styles.pageToggleTextActive,
                      ]}
                    >
                      2-Pager
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Rechte Aktionsgruppe: Download/Share + Close */}
                <View style={styles.topBarRightGroup}>
                  <TouchableOpacity
                    onPress={handleSharePdf}
                    style={styles.sharePdfBtn}
                    disabled={isExporting}
                    activeOpacity={0.7}
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.sharePdfBtnIcon}>📥</Text>
                        <Text style={styles.sharePdfBtnText}>PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setWebViewVisible(false)}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <WebView
                originWhitelist={['*']}
                source={{ html: htmlLayout }}
                style={styles.webview}
                scalesPageToFit={false}
                opaque={false}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
    position: 'absolute',
    bottom: 90,
    right: 25,
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
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
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
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    zIndex: 9999,
    elevation: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  webviewCard: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
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