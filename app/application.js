import MaterialIcons from '@react-native-vector-icons/material-icons';
import axios from 'axios';

import { router } from 'expo-router';
import { sha512 } from 'js-sha512';
import { use, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import { runQuery } from '../inc/db.js';
import useKeyboardAnimation from '../inc/Keyboard.js';
const Bewerbung = () => {
  const { t } = useTranslation();
  const DB_NAME = 'firstNew.db';
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('helvetica');
  const [optionenView, setOptionenView] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [skillsNew, setSkillsNew] = useState([]);
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [name, setName] = useState('');
  const [erfahrung, setErfahrung] = useState('');
  const [triggerGeneratePDF, setTriggerGeneratePDF] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');
  const [popup, setPopup] = useState('');
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [seeFlatList, setSeeFlatList] = useState(false);
  const [seeFlatListErfahrung, setSeeFlatListErfahrung] = useState(false);
  const [isFlatListVisible, setIsFlatListVisible] = useState(false);
  const [isFlatListVisibleSkills, setIsFlatListVisibleSkills] = useState(false);
  const [userSelectedSuggestion, setUserSelectedSuggestion] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const inputRef = useRef(null);
  const jobRef = useRef(null);
  const dbRef = useRef(null);
  const dbRefJobs = useRef(null);
  const jobRef2 = useRef(null);
  const timeoutRef = useRef(null);
  const [jobsDbExist, setJobsDbExist] = useState(false);
  const [saveButton, setSaveButton] = useState(false);
  const [skillButton, setSkillButton] = useState(false);
  const animView = useRef(new Animated.Value(0)).current; // bleibt Animated

  const employmentOptions = [
    t('employmentOptions.vollzeit'),
    t('employmentOptions.teilzeit'),
    t('employmentOptions.minijob'),
  ];

  const applicationOptions = [
    t('applicationOptions.initiativ'),
    t('applicationOptions.regulär'),
    t('applicationOptions.praktikum'),
  ];

  const anredeOptions = [
    t('anredeOptions.herr'),
    t('anredeOptions.damenUndHerren'),
    t('anredeOptions.frau'),
  ];
  const [errors, setErrors] = useState({
    name: '',
    job: '',
    skill: '',
    anrede: '',
  });
  const { keyboardHeight, reset } = useKeyboardAnimation();

  const items = [
    { label: 'Courier', value: 'Courier' },
    { label: 'CourierOblique', value: 'CourierOblique' },
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'HelveticaOblique', value: 'HelveticaOblique' },
    { label: 'TimesRoman', value: 'TimesRoman' },
    { label: 'TimesRomanItalic', value: 'TimesRomanItalic' },
  ];
  useEffect(() => {
    const checkDbExists = async () => {
      const jobsDb = await RNFS.exists(
        `${RNFS.LibraryDirectoryPath}/LocalDatabase/jobs.db`,
      );

      if (jobsDb) {
        console.log('DB exists');
        setJobsDbExist(true);
        console.log('cityDb', jobsDbExist);
      }
     else {
        const dest = `${RNFS.LibraryDirectoryPath}/LocalDatabase/jobs.db`;
        const url = `https://api.jobapp2.de/download?file=jobs.db`;
            const res = await RNFS.downloadFile({ fromUrl: url, toFile: dest }).promise;
          if (res.statusCode !== 200) throw new Error("Download failed");
    console.log('download function called');
            setJobsDbExist(true);

  };
      }
    
    const setDb = async () => {
      if (jobsDbExist) {
        const db1 = await SQLite.openDatabase({
          name: 'jobs.db',
          location: 'default',
          readOnly: false,
        });
        dbRefJobs.current = db1;
      }
    };

    checkDbExists();
    setDb();
  }, [jobsDbExist, inputValue]);

  useEffect(() => {
    const selectDb = async () => {
      const deviceId = await DeviceInfo.getUniqueId();
      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });
        const result = await runQuery(
          db,
          'SELECT skills FROM files WHERE ident = ?',
          [deviceId],
        );
        const rawData = result?.rows?.raw()?.[0];
        console.log('rawData', rawData);

        if (!rawData) {
          console.error('Fehler: Kein gültiges Datenobjekt gefunden');
          return;
        }

        const files = rawData.skills;

        if (typeof files === 'string' && files.length > 0) {
           
          const array = files.split('#');
if (array[array.length - 1] === '') {
      array.pop();
      setSkills(array);
    }
        } else {
          setSkills([]); // Falls keine Daten vorhanden sind, leere Liste setzen
        }
      } catch (err) {
        console.error('Error combining files:', err);
      }
    };
    selectDb();
  }, [erfahrung]);

  useEffect(() => {
    console.log('skills', skills);
  }, [skills]); 
  const toChange = async text => {
    await EncryptedStorage.setItem('result', 'change');
    router.replace('change');
  };

  const handleChange = async value => {
    const regexMuster = /[\/"() &$-:]/;

    if (value.length === 0) {
      value = '';
      setInputValue(value);
      return;
    }
    if (regexMuster.test(value)) {
      setInputValue(value);
          setIsFlatListVisible(false);
    setSeeFlatList(false);
      return;
    }
    try {
      if (!dbRefJobs.current) {
        console.log('dbRef.current is null');
        setInputValue(value);
        return;
      }
      setInputValue(value);
      const res = await runQuery(
        dbRefJobs.current,
        'SELECT rowid, text FROM eintraege WHERE eintraege MATCH ? LIMIT 20',
        [`${value}*`],
      );

      console.log('res', res);
      const names = res.rows.raw();
      console.log('names', names);
      setJobs(names);
    } catch (err) {
      console.warn('Search error', err);
    }

    setUserSelectedSuggestion(false);
    setIsFlatListVisible(true);
    setSeeFlatList(true);
    setSaveButton(true);
  };

  const handleErfahrung = value => {
    if (value.length > 0) {
      setSkillButton(true);
    } else {
      setSkillButton(false);
    }
    setErfahrung(value);
    const newOne = skills.filter(skill =>
      skill.toLowerCase().includes(value.toLowerCase()),
    );
    setSkillsNew(newOne);
    if (skills.length < 1) {
      setSeeFlatList(false);
      setIsFlatListVisibleSkills(false);

      return;
    }
    setIsFlatListVisibleSkills(true);
    setUserSelectedSuggestion(false);
  };

  // Wenn ein Vorschlag angeklickt wird
  const handleSuggestionClick = suggestion => {
    setInputValue(suggestion.text);
    setJobs([]);
    setIsFlatListVisible(false);
    setSaveButton(false);
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i] === suggestion) {
        setSaveButton(false);
        console.log('job', jobs[i]);
        console.log('suggestion', suggestion);
      }
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  const handleSuggestionClickSkill = suggestion => {
    setErfahrung(suggestion);
    setSuggestions([]);
    setIsFlatListVisibleSkills(false);
    for (let i = 0; i < skills.length; i++) {
      if (skills[i] === suggestion) {
        setSkillButton(false);
        console.log('skill', skills[i]);
        console.log('suggestion', suggestion);
      }
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Namensänderung (erster Buchstabe groß)
  const handleNameChange = text => {
    setName(text.charAt(0).toUpperCase() + text.slice(1));
  };

  // Handler für die Radiobutton-Optionen
  const handleOptionChange = value => {
    setSelectedOption(prev => (prev === value ? '' : value));
  };

  const handleOptionChange2 = value => {
    setSelectedOption2(prev => (prev === value ? '' : value));
  };

  const handleOptionChange3 = value => {
    setSelectedOption3(prev => (prev === value ? '' : value));
    switch (value) {
      case 'Herr':
        if (jobRef2.current) jobRef2.current.focus();
        break;
      case 'Damen und Herren':
        if (jobRef.current) jobRef.current.focus();
        break;
      case 'Frau':
        if (jobRef2.current) jobRef2.current.focus();
        break;
      default:
        break;
    }
  };

  const handleGeneratePDF = async () => {
    setIsFlatListVisible(false);
    setIsFlatListVisibleSkills(false);
    let count = 0;
    setLoading(true);
    const interval = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, 500);
    await EncryptedStorage.setItem('font', value);
    console.log('Application:' + (await EncryptedStorage.getItem('font')));
    setSeeFlatList(false);
    let timepart, choice, anrede;
    const words = selectedOption3.trim().split(' '); // Aufteilen der Anrede nach Leerzeichen

    if (
      inputValue.length < 1 &&
      !erfahrung.trim() &&
      words.length < 2 &&
      name.length < 1
    ) {
      setErrors({
        job: t('validation.job.required'),
        skill: t('validation.skill.required'),
        anrede: t('validation.name.required'),
      });
      return;
    }
    if (!inputValue.trim() && !erfahrung.trim()) {
      setErrors({
        job: t('validation.job.required'),
        skill: t('validation.skill.required'),
      });
      return;
    }
    if (!erfahrung.trim() && words.length < 2 && name.length < 1) {
      setErrors({
        skill: t('validation.skill.required'),
        anrede: t('validation.name.required'),
      });
      return;
    }
    if (!inputValue.trim() && words.length < 2 && name.length < 1) {
      setErrors({
        job: t('validation.job.required'),
        anrede: t('validation.name.required'),
      });
      return;
    }
    if (!inputValue.trim() && !erfahrung.trim()) {
      setErrors({
        job: t('validation.job.required'),
        skill: t('validation.skill.required'),
      });
      return;
    }
    if (!erfahrung.trim()) {
      setErrors({
        skill: t('validation.skill.required'),
      });
      return;
    }
    if (!words.length < 2 && name.length < 1 && !selectedOption3) {
      setErrors({
        anrede: t('validation.name.required'),
      });
      return;
    }

    if (!inputValue.trim()) {
      setErrors({
        job: t('validation.job.required'),
      });
      return;
    }
    if (words.length < 1) {
      setErrors({
        anrede: t('validation.name.minWords'),
      });
      return;
    }

    setErrors({});
    setPopup(t('validation.generating'));
    setPopupVisible(true);
    setTriggerGeneratePDF(true);

    try {
      let language;
      // Speichern der Daten mit react-native-keychain
      await EncryptedStorage.setItem('beruf', inputValue);
      await EncryptedStorage.setItem('erfahrung', erfahrung);
      await EncryptedStorage.setItem('time', selectedOption);
      await EncryptedStorage.setItem('type', selectedOption2);
      const lang = await EncryptedStorage.getItem('lang');
      switch (lang) {
        case 'de':
          language = 'auf Deutsch';
          break;
        case 'en':
          language = 'in English';
          break;
        default:
          await EncryptedStorage.setItem('lang', 'de');
      }
      const myName = name;

      switch (selectedOption) {
        case t('employmentOptions.vollzeit'):
          choice = t('employmentChoice.fulltime', { lng: 'de' });
          break;
        case t('employmentOptions.teilzeit'):
          choice = t('employmentChoice.parttime', { lng: 'de' });
          break;
        case t('employmentOptions.minijob'):
          choice = t('employmentChoice.minijob', { lng: 'de' });
          break;
        default:
          choice = t('employmentChoice.default', { lng: 'de' });
      }
      console.log('choice', choice);
      switch (selectedOption2) {
        case t('applicationOptions.initiativ'):
          timepart = t(
            'applicationOptions2.initiativ',
            { lng: 'de' },
            inputValue,
          );
          break;
        case t('applicationOptions.regulär'):
          timepart = t(
            'applicationOptions2.regulär',
            { lng: 'de' },
            inputValue,
          );
          break;
        case t('applicationOptions.praktikum'):
          timepart = t(
            'applicationOptions2.praktikum',
            { lng: 'de' },
            inputValue,
          );
          break;
        default:
          timepart = t(
            'applicationOptions2.default',
            { lng: 'de' },
            inputValue,
          );
      }
      console.log('timepart', timepart);
      const subject = timepart + '' + inputValue + ' ' + choice;

      // Speichern des Betreffs
      await EncryptedStorage.setItem('subject', subject);
      console.log('subject           ' + subject);

      switch (selectedOption3) {
        case t('anredeOptions.herr'):
          anrede = 'Sehr geehrter Herr ' + '' + name + ',';
          break;
        case t('anredeOptions.damenUndHerren'):
          anrede = 'Sehr geehrte Damen und Herren,';
          break;
        case t('anredeOptions.frau'):
          anrede = 'Sehr geehrte Frau ' + '' + name + ',';
          break;
        default:
          anrede = t('salutation.default');
      }
      await EncryptedStorage.setItem('anrede', anrede);
      console.log('anrede           ' + anrede);

      const prompt1 = `Schreibe eine ${
        selectedOption2 === 'Initiativ'
          ? 'Initiativbewerbung'
          : selectedOption2 === 'Regulär'
          ? 'Reguläre Bewerbung'
          : selectedOption2 === 'Praktikum'
          ? 'Bewerbung für ein Praktikum'
          : 'Bewerbung'
      } Verfasse ein Bewerbungsschreiben für die Position als ${inputValue}. Ich habe ${erfahrung} Erfahrung.
	•	Keine Firmennamen oder spezifische Unternehmen nennen.
	•	Die Anrede komplett weglassen und direkt mit dem Bewerbungstext beginnen. Keine "Sehr geehrte Damen und Herren"
	•	Der Text darf maximal 300 Wörter umfassen.
	•	Beende das Schreiben mit “Mit freundlichen Grüßen”, aber ohne einen Namen.
 `;

      try {
        await EncryptedStorage.setItem('choices', selectedOption2);
        const deviceId = await DeviceInfo.getUniqueId();
        const key = sha512(deviceId);

        const response = await axios.post('https://api.jobapp2.de/getText', {
          prompt1: prompt1,
          key: key,
        });
        const text = response.data.response;
        console.log(response);
        await EncryptedStorage.setItem('text', text);
        toChange();
        setPopupVisible(false);
        console.log(text);
        setDots('');
        clearInterval(interval);
      } catch (error) {
        setPopupVisible(false);
        if (error.response) {
          const errorMessage = error.response.data.error;
          Alert.alert('Fehler', errorMessage);
        }
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Daten:', error);
    }
  };
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      console.log('keyboardHeight'),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      changeView(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const isDisabled = selectedOption3 === t('anredeOptions.damenUndHerren');

  const handleSave = async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    try {
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      db.executeSql(
        `UPDATE files SET skills = IFNULL(skills, '') || ? || '#' WHERE ident = ?`,
        [erfahrung, deviceId],
      );
      setSkillButton(false);
      setSeeFlatList(false);
    } catch (err) {
      console.error('Error combining files:', err);
    }
  };
  const handleSaveJob = async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    try {
      if (!dbRefJobs.current) {
        console.log('dbRef.current is null');
        return;
      }

      dbRefJobs.current.executeSql(`INSERT INTO eintraege (text) VALUES (?)`, [
        inputValue,
        deviceId,
      ]);

      setSaveButton(false);
      setSeeFlatList(false);
    } catch (err) {
      console.error('Error combining files:', err);
    }
  };
  const changeView = wert => {
    console.log('wert', wert);
    Animated.timing(animView, {
      toValue: wert,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

const delteSkill = async skill => {
    const deviceId = await DeviceInfo.getUniqueId();
 const key = await EncryptedStorage.getItem('key');
const db = await SQLite.openDatabase({
  name: DB_NAME,
  location: 'default',
});
    try {
    const filteredEmails = skills.filter(item => item !== skill);
    console.log('Filtered mails:', filteredEmails);
    if (filteredEmails[filteredEmails.length - 1] === '') {
      filteredEmails.pop();
    }
    if (filteredEmails.length > 0) {
      const updatedEmails = filteredEmails.join('#');
      console.log('Updated mails string:', updatedEmails);
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET skills = ? WHERE ident = ?',
          [updatedEmails, deviceId],
        )
    });
      setSkills(filteredEmails);
      console.log('Skills after deletion:', skills);  
    }
    else {
    
       db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET skills = ? WHERE ident = ?',
          [null, deviceId],
        )
    });
      setSkills([]);
      console.log('Skills after deletion:', skills);  
    }
    } catch (err) {
      console.error('Error combining files:', err);
    }
  }
    
  const deleteJob = async job => {
    const deviceId = await DeviceInfo.getUniqueId();
 const key = await EncryptedStorage.getItem('key');
const db = await SQLite.openDatabase({
  name: DB_NAME,
  location: 'default',
});
    try {
    const filteredJobs = jobs.filter(item => item !== job);
    console.log('Filtered mails:', filteredJobs);
    if (filteredJobs[filteredJobs.length - 1] === '') {
      filteredJobs.pop();
    }
    if (filteredJobs.length > 0) {
      const updatedJobs = filteredJobs.join('#');
      console.log('Updated mails string:', updatedJobs);
       dbRefJobs.current.transaction(tx => {
        tx.executeSql(
'DELETE FROM eintraege WHERE rowid = ?',
          [job.rowid],
        )
    });
      setJobs(filteredJobs);
      console.log('Skills after deletion:', jobs);  
    }
    else {
    
       db.transaction(tx => {
        tx.executeSql(
          'UPDATE files SET jobs = ? WHERE ident = ?',
          [null, deviceId],
        )
    });
      setJobs([]);
      console.log('Skills after deletion:', jobs);  
    }
    } catch (err) {
      console.error('Error combining files:', err);
    }
  }
    

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.container}>
        <Animated.View
          style={[
            { transform: [{ translateY: animView }] }, // Diese Zeile fügt die dynamische Anpassung hinzu
          ]}
        >
          <View style={styles.section}>
            <View style={styles.radioContainer}>
              {anredeOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleOptionChange3(option)}
                  style={[
                    styles.radioOption,
                    selectedOption3 === option && styles.radioOptionSelected,
                  ]}
                >
                  <Text
                    style={
                      selectedOption3 === option
                        ? styles.radioOptionTextSelected
                        : styles.radioOptionText
                    }
                  >
                    {t(option)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TextInput
              ref={jobRef2}
              style={[styles.input, isDisabled && styles.disabledInput]}
              placeholder={t('nameAnsprechpartner')}
              placeholderTextColor={'gray'}
              value={name}
              onChangeText={handleNameChange}
              editable={!isDisabled}
              selectTextOnFocus={!isDisabled}
              autoCorrect={false}
              onFocus={() => {
                changeView(-50);
              }}
            />
            {errors.anrede ? (
              <Text style={styles.error}>{errors.anrede}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <TextInput
              ref={jobRef}
              style={styles.input}
              placeholder={t('beruf')}
              placeholderTextColor={'gray'}
              value={inputValue}
              onBlur={() => setSeeFlatList(false)}
              onFocus={() => {
                changeView(-100);
              }}
              onChangeText={handleChange}
              autoCorrect={false}
            />
            {errors.job ? (
              <Text style={styles.error1}>{errors.job}</Text>
            ) : null}

            {saveButton && inputValue.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={handleSaveJob}
                  style={styles.saveButton}
                >
                  <MaterialIcons name="save" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}

            {inputValue.length > 0 && seeFlatList && jobs.length > 0 && (
              <FlatList
                data={jobs}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, index) => index}
                renderItem={({ item }) => (
                   <View style={{position:'relative'}}>
                     <TouchableOpacity
                                        onPress={() => {deleteJob(item); console.log('item', item);}}
                                        
                                        style={styles.suggestionItemContainerDelete}
                                      >
                                        <Text style={styles.suggestionItemDelete}>X</Text>
                                      </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSuggestionClick(item)}
                    style={styles.suggestionItemContainer}
                  >
                    <Text style={styles.suggestionItem}>{item.text}</Text>
                  </TouchableOpacity>
                  </View>
                )}
                style={[
                  styles.suggestionsList,
                  { display: isFlatListVisible ? 'flex' : 'none' },
                ]}
              />
            )}

            <View style={styles.section}>
              <View style={styles.skillInputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder={t('skillsErfahrung')}
                  placeholderTextColor={'gray'}
                  value={erfahrung}
                  onChangeText={handleErfahrung}
                  onBlur={() => setIsFlatListVisibleSkills(false)}

                  onFocus={() => {
                    changeView(-125);
                  }}
                  autoCorrect={false}
                />
                {errors.skill ? (
                  <Text style={styles.error}>{errors.skill}</Text>
                ) : null}
                {skillButton && (
                  <>
                    <TouchableOpacity
                      onPress={handleSave}
                      style={styles.saveButton}
                    >
                      <MaterialIcons name="save" size={24} color="white" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
              {erfahrung.length > 0 && isFlatListVisibleSkills && skills.length > 0 && (
                <FlatList
                  data={skills}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View style={{position:'relative'}}>
                     <TouchableOpacity
                                        onPress={() => delteSkill(item)}
                                        style={styles.suggestionItemContainerDelete}
                                      >
                                        <Text style={styles.suggestionItemDelete}>X</Text>
                                      </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSuggestionClickSkill(item)}
                      style={styles.suggestionItemContainer}
                    >
                      <Text style={styles.suggestionItem}>{item}</Text>
                    </TouchableOpacity>
                    </View>
                  )}
                  keyboardShouldPersistTaps="handled"
                  style={[
                    styles.suggestionsListSkill,
                    { display: isFlatListVisibleSkills ? 'flex' : 'none' },
                  ]}
                />
              )}
              {optionenView && (
                <>
                  <View style={styles.section}>
                    <View style={styles.radioContainer}>
                      {employmentOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            handleOptionChange(option);
                            Keyboard.dismiss();
                          }}
                          style={[
                            styles.radioButton,
                            selectedOption === option &&
                              styles.radioOptionSelected,
                          ]}
                        >
                          <Text
                            style={
                              selectedOption === option
                                ? styles.radioOptionTextSelected
                                : styles.radioOptionText
                            }
                          >
                            {t(option)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.section2}>
                    <View style={styles.radioContainer}>
                      {applicationOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            handleOptionChange2(option);
                            Keyboard.dismiss();
                          }}
                          style={[
                            styles.radioButton,
                            selectedOption2 === option &&
                              styles.radioOptionSelected,
                          ]}
                        >
                          <Text
                            style={
                              selectedOption2 === option
                                ? styles.radioOptionTextSelected
                                : styles.radioOptionText
                            }
                          >
                            {t(option)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ width: '100%', marginTop: 20, marginBottom: 10 }}>
                    <DropDownPicker
                      open={open}
                      value={value}
                      items={items}
                      setOpen={setOpen}
                      setValue={setValue}
                      placeholder={t('fontPlaceholder')}
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropDownContainer}
                      textStyle={{ color: '#C9C1C1', fontSize: 16 }}
                      dropDownDirection="TOP"
                    />
                  </View>
                </>
              )}
                   
              <View style={styles.sectionButton}>
         
                <TouchableOpacity
                  style={[
                    styles.button,
                    // optional: visuelles Feedback
                  ]}
                  onPress={handleGeneratePDF}
                  disabled={loading && Object.values(errors).length === 0} // 👈 Button ist deaktiviert!
                >
                  <Text style={styles.buttonText}>
                    {loading && Object.values(errors).length === 0
                      ? `${t('pleaseWait')}${dots}`
                      : t('generateCoverLetter')}
                  </Text>
                </TouchableOpacity>
                 <TouchableOpacity
                  style={{  marginTop: 15 }}
                  onPress={() => {
                    setOptionenView(!optionenView);
                    Keyboard.dismiss();
                  }}><Text style={{alignSelf: 'center',justifyContent: 'center', color: 'white', fontSize: 16 }}>
                    Optionen
                      
                      
                  </Text>
                    </TouchableOpacity>  
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  error: {
    color: 'red',
    fontSize: 12,
    position: 'abosulte',
    top: '7%',
    left: '1%',
  },
    suggestionItemContainerDelete: {
    padding: 10,
    backgroundColor: colors.card3,
    right: 0,
    position: 'absolute',
    zIndex: 20,
  },
  error1: {
    color: 'red',
    fontSize: 12,
    position: 'abosulte',
    top: '1%',
    left: '1%',
  },
    suggestionItemDelete: {
    fontSize: 16,
    color: 'white',
  },
  section: {
    position: 'relative',
    marginBottom: 20,
  },
  sectionButton: {
    position: 'relative',
  },
  section2: {
    position: 'relative',
  },

  container: {
    width: width,
    height: height,
    backgroundColor: 'rgb(8, 12, 32)',
    padding: 20,
    justifyContent: 'center',
  },

  input: {
    width: '100%',
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    backgroundColor: colors.card3,
    color: 'white',
  },
  skillInputContainer: {
    position: 'relative',
    marginTop: 20,
    marginBottom: 20,
  },
  disabledInput: {
    backgroundColor: 'rgb(16, 27, 43)',
    opacity: 0.4,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'gray',

    borderRadius: 10,
    paddingVertical: 3,
  },
  radioOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 5,
    marginRight: 5,
    borderRadius: 10,

    borderWidth: 1,
    borderColor: 'gray',
  },
  dropdown: {
    height: 50,
    backgroundColor: colors.card3,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 12,
    color: 'gray',
    elevation: 2,
    borderColor: 'gray',

    marginBottom: 10,
  },
  dropDownContainer: {
    position: 'absolute',
    marginBottom: 11,
    color: 'white',
    backgroundColor: colors.card3,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
  },
  radioOptionSelected: {
    borderColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#f7fbf5',
  },
  radioOptionText: {
    fontSize: 16,
    color: 'gray',
  },
  radioOptionTextSelected: {
    fontSize: 16,
    color: 'white',
  },
  suggestionsList: {
    position: 'absolute',
    top: 50,
    width: '100%',
    marginTop: 10,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 9999, // Für iOS - sehr hoch setzen
    backgroundColor: colors.card3, // ganze Fläche blickdicht
    elevation: 10, // für Android Touch / Zeichnen
    overflow: 'hidden',
  },
  suggestionsListSkill: {
    position: 'absolute',
    top: 70,
    width: '100%',
    marginTop: 10,
    maxHeight: height * 0.14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 9999, // Für iOS - sehr hoch setzen
    backgroundColor: colors.card3, // ganze Fläche blickdicht
    elevation: 10, // für Android Touch / Zeichnen
    overflow: 'hidden',
  },
  suggestionItemContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.card3,
    borderWidth: 0,
    borderColor: 'gray',
    borderBottomWidth: 1,
  },
  suggestionItem: {
    fontSize: 16,
    color: 'white',
  },

  saveButton: {
    position: 'absolute',
    top: 10,
    right: 15,

    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },
  button: {
    width: '100%',
    backgroundColor: colors.card3,
    padding: 15,

    borderRadius: 12,
    alignItems: 'center',
    shadowColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5, // Für Android-Schatten
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
  },
});

export default Bewerbung;
