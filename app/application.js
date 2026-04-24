import MaterialIcons from '@react-native-vector-icons/material-icons';
import axios from 'axios';
import { router } from 'expo-router';
import { sha512 } from 'js-sha512';
import { useEffect, useRef, useState } from 'react';
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
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  View,
} from 'react-native';
import { extractScript, meinestadtScript, agenturScript, jobvectorScript, stepstoneScript } from '../inc/scrapper.js';
import DeviceInfo from 'react-native-device-info';
import { WebView } from 'react-native-webview';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import RNFS from 'react-native-fs';
import Info from '../comp/info.js';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';
import colors from '../inc/colors.js';
import { runQuery } from '../inc/db.js';
import useKeyboardAnimation from '../inc/Keyboard.js';


const Bewerbung = () => {
  const { t } = useTranslation();
  const DB_NAME = 'firstNew.db';
const platformRef = useRef(''); // Ref, um die gefundene Plattform zu speichern
  // --- STATES ---
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [scrapedDescription, setScrapedDescription] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [value, setValue] = useState('helvetica');
  const [optionenView, setOptionenView] = useState(false);
  const [skillsNew, setSkillsNew] = useState([]);
  const [skills, setSkills] = useState([]);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [name, setName] = useState('');
  const [erfahrung, setErfahrung] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');
  const [infoState, setInfoState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [seeFlatList, setSeeFlatList] = useState(false);
  const [isFlatListVisible, setIsFlatListVisible] = useState(false);
  const [isFlatListVisibleSkills, setIsFlatListVisibleSkills] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [jobsDbExist, setJobsDbExist] = useState(false);
  const [saveButton, setSaveButton] = useState(false);
  const [skillButton, setSkillButton] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    job: '',
    skill: '',
    anrede: '',
  });

  // --- REFS ---
  const webViewRef = useRef(null);
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);
  const jobRef = useRef(null);
  const jobRef2 = useRef(null);
  const dbRef = useRef(null);       // Haupt-DB (firstNew.db)
  const dbRefJobs = useRef(null);   // Jobs-DB (jobs.db)
  const isMountedRef = useRef(true);
  const animView = useRef(new Animated.Value(0)).current;

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

  const items = [
    { label: 'Courier', value: 'Courier' },
    { label: 'CourierOblique', value: 'CourierOblique' },
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'HelveticaOblique', value: 'HelveticaOblique' },
    { label: 'TimesRoman', value: 'TimesRoman' },
    { label: 'TimesRomanItalic', value: 'TimesRomanItalic' },
  ];

  // ============================================
  // MOUNT / UNMOUNT FLAG
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);
useEffect(() => {
  if (!isExtracting) return;

  // Nach 20 Sekunden ohne Antwort: Abbrechen
  const timeout = setTimeout(() => {
    if (isMountedRef.current && isExtracting) {
      setIsExtracting(false);
      setWebViewUrl('');
      Alert.alert(
        'Timeout',
        'Die Seite hat zu lange gebraucht. Bitte erneut versuchen.',
      );
    }
  }, 20000);

  return () => clearTimeout(timeout);
}, [isExtracting]);
  // ============================================
  // INIT JOBS DB (einmalig)
  // ============================================
  useEffect(() => {
    const initDatabase = async () => {
      const folderPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase`;
      const dest = `${folderPath}/jobs.db`;

      try {
        const folderExists = await RNFS.exists(folderPath);
        if (!folderExists) {
          await RNFS.mkdir(folderPath);
        }

        const jobsDbExistsOnDisk = await RNFS.exists(dest);

        if (!jobsDbExistsOnDisk) {
          console.log('Starte Download...');
          const getUrl = `https://api.jobapp2.de/get-secure-link/jobs.db`;
          const response = await fetch(getUrl);
          const data = await response.json();
          const secureUrl = data.url.replace('http://', 'https://');

          const res = await RNFS.downloadFile({
            fromUrl: secureUrl,
            toFile: dest,
          }).promise;
          if (res.statusCode !== 200) throw new Error('Download failed');
          console.log('Download abgeschlossen');
        }

        if (!dbRefJobs.current) {
          const db1 = await SQLite.openDatabase({
            name: 'jobs.db',
            location: 'default',
          });
          if (!isMountedRef.current) {
            db1.close();
            return;
          }
          dbRefJobs.current = db1;
          setJobsDbExist(true);
          console.log('SQLite Datenbank bereit');
        }
      } catch (err) {
        console.error('Initialisierungsfehler:', err);
      }
    };

    initDatabase();

    return () => {
      if (dbRefJobs.current) {
        dbRefJobs.current.close();
        dbRefJobs.current = null;
      }
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, []);

  // ============================================
  // HAUPT-DB ÖFFNEN (einmalig)
  // ============================================
  useEffect(() => {
    const openMainDb = async () => {
      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });
        if (!isMountedRef.current) {
          db.close();
          return;
        }
        dbRef.current = db;
      } catch (err) {
        console.error('Main DB open error:', err);
      }
    };
    openMainDb();
  }, []);

  // ============================================
  // SKILLS LADEN
  // ============================================
  useEffect(() => {
    const selectDb = async () => {
      if (!dbRef.current) return;
      const deviceId = await DeviceInfo.getUniqueId();
      try {
        const result = await runQuery(
          dbRef.current,
          'SELECT skills FROM files WHERE ident = ?',
          [deviceId],
        );
        const rawData = result?.rows?.raw()?.[0];

        if (!rawData) {
          console.error('Fehler: Kein gültiges Datenobjekt gefunden');
          return;
        }

        const files = rawData.skills;

        if (typeof files === 'string' && files.length > 0) {
          const array = files.split('#');
          if (array[array.length - 1] === '') {
            array.pop();
          }
          setSkills(array);
        } else {
          setSkills([]);
        }
      } catch (err) {
        console.error('Error combining files:', err);
      }
    };
    // Kleiner Delay, damit dbRef sicher gesetzt ist
    const t = setTimeout(selectDb, 100);
    return () => clearTimeout(t);
  }, [erfahrung]);

  // ============================================
  // KEYBOARD LISTENERS
  // ============================================
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (!isMountedRef.current) return;
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      if (!isMountedRef.current) return;
      changeView(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  const toChange = async () => {
    await EncryptedStorage.setItem('result', 'change');
    router.replace('change');
  };

  const handleChange = (val) => {
    setInputValue(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    const regexMuster = /[\/"() &$-:]/;
    if (val.length === 0) {
      setJobs([]);
      return;
    }
    if (regexMuster.test(val)) {
      setIsFlatListVisible(false);
      setSeeFlatList(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      if (val.length < 1) {
        setJobs([]);
        return;
      }
      try {
        if (!dbRefJobs.current) {
          console.log('dbRefJobs.current is null');
          return;
        }
        const res = await runQuery(
          dbRefJobs.current,
          'SELECT rowid, text FROM eintraege WHERE eintraege MATCH ? LIMIT 20',
          [`${val}*`],
        );
        if (!isMountedRef.current) return;
        const names = res.rows.raw();
        setJobs(names);
      } catch (err) {
        console.warn('Search error', err);
      }

      if (!isMountedRef.current) return;
      setIsFlatListVisible(true);
      setSeeFlatList(true);
      setSaveButton(true);
    }, 300);
  };

  const handleErfahrung = (val) => {
    if (val.length > 0) {
      setSkillButton(true);
    } else {
      setSkillButton(false);
    }
    setErfahrung(val);
    const newOne = skills.filter((skill) =>
      skill.toLowerCase().includes(val.toLowerCase()),
    );
    setSkillsNew(newOne);
    if (newOne.length < 1) {
      setSeeFlatList(false);
      setIsFlatListVisibleSkills(false);
      return;
    }
    setIsFlatListVisibleSkills(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.text);
    setJobs([]);
    setIsFlatListVisible(false);
    setSaveButton(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSuggestionClickSkill = (suggestion) => {
    setErfahrung(suggestion);
    setIsFlatListVisibleSkills(false);
    setSkillButton(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleNameChange = (text) => {
    setName(text.charAt(0).toUpperCase() + text.slice(1));
  };

  const handleOptionChange = (val) => {
    setSelectedOption((prev) => (prev === val ? '' : val));
  };

  const handleOptionChange2 = (val) => {
    setSelectedOption2((prev) => (prev === val ? '' : val));
  };

  const handleOptionChange3 = (val) => {
    setSelectedOption3((prev) => (prev === val ? '' : val));
    switch (val) {
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

const startExtraction = () => {
  Keyboard.dismiss();
  
  const platforms = [
    { domain: 'meinestadt.de', name: 'meinestadt' },
    { domain: 'arbeitsagentur.de', name: 'arbeitsagentur' },
    { domain: 'jobvector.de', name: 'jobvector' },
    { domain: 'indeed.com', name: 'indeed' },
    { domain: 'stepstone.de', name: 'stepstone' }
  ];

  let url = '';
  const text = inputValue.trim();
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
console.log('Eingegebener Text:', text);
console.log('Gefundener Link mit Regex:', match ? match[0] : 'Kein Link gefunden');
  if (match) {
    url = match[0];
    console.log('Gefundener Link:', url);
  } else {
    // Verallgemeinerter Fallback für Links ohne https://
    const words = text.split(/\s+/);
    console.log('Gefundene Worte:', words);
    const foundPlatform = platforms.find(p => 
      words.some(w => w.toLowerCase().includes(p.domain))
    );

    if (foundPlatform) {
      const linkWord = words.find(w => w.toLowerCase().includes(foundPlatform.domain));
      url = 'https://' + linkWord;
      console.log('Gefundener Link aus Worten:', url);
    }
  }

  // Plattform im Ref speichern
  const matchedPlatform = platforms.find(p => url.toLowerCase().includes(p.domain));
  platformRef.current = matchedPlatform ? matchedPlatform.name : 'generic';
console.log('Gefundene Plattform:', platformRef.current); 
  if (!url) {
    Alert.alert('Hinweis', 'Es konnte kein gültiger Link gefunden werden.');
    return;
  }

  setIsExtracting(true);
  setWebViewUrl(url); 
  setSaveButton(true);
};
  const handleWebViewMessage = (event) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    
    if (data.status === 'success') {
      setInputValue(data.title.split("(")[0]);
      setScrapedDescription(data.description);
      // Falls du die Listen auch speichern willst:
      // setScrapedLists(data.lists); 
      
      setIsExtracting(false);
      setWebViewUrl('');
      Alert.alert('Erfolg!', `Stellenanzeige geladen.`);
      console.log('Extrahierte Listen:', data.lists); // Hier siehst du die extrahierten Listen im Log
      console.log('Extrahierter Titel:', data.title);
      console.log('Extrahierte Beschreibung:', data.description);
    } else {
      setIsExtracting(false);
      setWebViewUrl('');
      Alert.alert('Hinweis', data.message);
    }
  } catch (e) {
    setIsExtracting(false);
    setWebViewUrl('');
    console.error('Parsing Fehler:', e);
  }
};const injectPlatformScript = () => {
  let scriptToInject = '';
  
  switch (platformRef.current) {
    case 'meinestadt':
      scriptToInject = meinestadtScript;
      break;
    case 'arbeitsagentur':
      scriptToInject = agenturScript;
      break;
    case 'jobvector':
      scriptToInject = jobvectorScript;
      break;
      case 'indeed':
      scriptToInject = extractScript;
      break;
      case 'stepstone':
      scriptToInject = stepstoneScript;
      break;
    default:
      scriptToInject = extractScript; 
  }

  if (scriptToInject && webViewRef.current) {
    webViewRef.current.injectJavaScript(scriptToInject);
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
    setSeeFlatList(false);
    let timepart, choice, anrede;
    const words = selectedOption3.trim().split(' ');

    // Validierung
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
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (!inputValue.trim() && !erfahrung.trim()) {
      setErrors({
        job: t('validation.job.required'),
        skill: t('validation.skill.required'),
      });
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (!erfahrung.trim() && words.length < 2 && name.length < 1) {
      setErrors({
        skill: t('validation.skill.required'),
        anrede: t('validation.name.required'),
      });
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (!inputValue.trim() && words.length < 2 && name.length < 1) {
      setErrors({
        job: t('validation.job.required'),
        anrede: t('validation.name.required'),
      });
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (!erfahrung.trim()) {
      setErrors({ skill: t('validation.skill.required') });
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (!inputValue.trim()) {
      setErrors({ job: t('validation.job.required') });
      clearInterval(interval);
      setLoading(false);
      return;
    }
    if (words.length < 1) {
      setErrors({ anrede: t('validation.name.minWords') });
      clearInterval(interval);
      setLoading(false);
      return;
    }

    setErrors({});
    setPopupVisible(true);

    try {
      await EncryptedStorage.setItem('beruf', inputValue);
      await EncryptedStorage.setItem('erfahrung', erfahrung);
      await EncryptedStorage.setItem('time', selectedOption);
      await EncryptedStorage.setItem('type', selectedOption2);
      const lang = await EncryptedStorage.getItem('lang');
      if (!lang) {
        await EncryptedStorage.setItem('lang', 'de');
      }

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

      switch (selectedOption2) {
        case t('applicationOptions.initiativ'):
          timepart = t('applicationOptions2.initiativ', { lng: 'de' }, inputValue);
          break;
        case t('applicationOptions.regulär'):
          timepart = t('applicationOptions2.regulär', { lng: 'de' }, inputValue);
          break;
        case t('applicationOptions.praktikum'):
          timepart = t('applicationOptions2.praktikum', { lng: 'de' }, inputValue);
          break;
        default:
          timepart = t('applicationOptions2.default', { lng: 'de' }, inputValue);
      }

      const subject = timepart + '' + inputValue + ' ' + choice;
      await EncryptedStorage.setItem('subject', subject);

      switch (selectedOption3) {
        case t('anredeOptions.herr'):
          anrede = 'Sehr geehrter Herr ' + name + ',';
          break;
        case t('anredeOptions.damenUndHerren'):
          anrede = 'Sehr geehrte Damen und Herren,';
          break;
        case t('anredeOptions.frau'):
          anrede = 'Sehr geehrte Frau ' + name + ',';
          break;
        default:
          anrede = t('salutation.default');
      }
      await EncryptedStorage.setItem('anrede', anrede);

   let prompt1 = `Schreibe eine ${
        selectedOption2 === 'Initiativ'
          ? 'Initiativbewerbung'
          : selectedOption2 === 'Regulär'
          ? 'Reguläre Bewerbung'
          : selectedOption2 === 'Praktikum'
          ? 'Bewerbung für ein Praktikum'
          : 'Bewerbung'
      }. Verfasse ein Bewerbungsschreiben für die Position als ${inputValue}. Ich habe ${erfahrung} Erfahrung.
  - Keine Firmennamen oder spezifische Unternehmen nennen.
  - Die Anrede komplett weglassen und direkt mit dem Bewerbungstext beginnen. Keine "Sehr geehrte Damen und Herren"
  - Der Text darf maximal 300 Wörter umfassen.
  - Beende das Schreiben mit "Mit freundlichen Grüßen", aber ohne einen Namen.`;

      // --- NEU: INDEED-TEXT AN DIE KI ÜBERGEBEN ---
      if (scrapedDescription && scrapedDescription.trim().length > 0) {
        prompt1 += `\n\nNutze die folgende echte Stellenbeschreibung als Kontext, um die Argumentation perfekt auf die Anforderungen und Keywords des Jobs abzustimmen (erwähne aber weiterhin keine Firmennamen):\n\n"${scrapedDescription}"`;
      }

      try {
        await EncryptedStorage.setItem('choices', selectedOption2);
        const deviceId = await DeviceInfo.getUniqueId();
        const key = sha512(deviceId);

        const response = await axios.post(
          'https://api.jobapp2.de/getText',
          { prompt1, key },
          { timeout: 15000 },
        );
        const text = response.data.response;
        await EncryptedStorage.setItem('text', text);
        clearInterval(interval);
        setDots('');
        setLoading(false);
        setPopupVisible(false);
        toChange();
      } catch (error) {
        clearInterval(interval);
        setDots('');
        setLoading(false);
        setPopupVisible(false);
        if (error.response) {
          const errorMessage = error.response.data.error;
          Alert.alert('Fehler', errorMessage);
        } else {
          Alert.alert('Fehler', 'Netzwerkfehler');
        }
      }
    } catch (error) {
      clearInterval(interval);
      setLoading(false);
      console.error('Fehler beim Speichern der Daten:', error);
    }
  };

  const isDisabled = selectedOption3 === t('anredeOptions.damenUndHerren');

  const handleSave = async () => {
    if (!dbRef.current) return;
    const deviceId = await DeviceInfo.getUniqueId();
    try {
      dbRef.current.executeSql(
        `UPDATE files SET skills = IFNULL(skills, '') || ? || '#' WHERE ident = ?`,
        [erfahrung, deviceId],
      );
      setSkillButton(false);
      setSeeFlatList(false);
    } catch (err) {
      console.error('Error saving skill:', err);
    }
  };

  const handleSaveJob = async () => {
    try {
      if (!dbRefJobs.current) {
        console.log('dbRefJobs.current is null');
        return;
      }
      dbRefJobs.current.executeSql(
        `INSERT INTO eintraege (text) VALUES (?)`,
        [inputValue],
      );
      setSaveButton(false);
      setSeeFlatList(false);
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  const changeView = (wert) => {
    Animated.timing(animView, {
      toValue: wert,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const deleteSkill = async (skill) => {
    if (!dbRef.current) return;
    const deviceId = await DeviceInfo.getUniqueId();
    try {
      const filteredEmails = skills.filter((item) => item !== skill);
      if (filteredEmails[filteredEmails.length - 1] === '') {
        filteredEmails.pop();
      }
      if (filteredEmails.length > 0) {
        const updatedEmails = filteredEmails.join('#');
        dbRef.current.transaction((tx) => {
          tx.executeSql(
            'UPDATE files SET skills = ? WHERE ident = ?',
            [updatedEmails, deviceId],
          );
        });
        setSkills(filteredEmails);
        setSkillsNew(filteredEmails);
      } else {
        dbRef.current.transaction((tx) => {
          tx.executeSql(
            'UPDATE files SET skills = ? WHERE ident = ?',
            [null, deviceId],
          );
        });
        setSkills([]);
        setSkillsNew([]);
      }
    } catch (err) {
      console.error('Error deleting skill:', err);
    }
  };

  const deleteJob = async (job) => {
    if (!dbRefJobs.current) {
      console.warn('Datenbank nicht bereit');
      return;
    }

    const deviceId = await DeviceInfo.getUniqueId();

    Alert.alert(
      t('deleteTitle') || 'Löschen',
      t('deleteConfirm') || `Möchtest du "${job.text}" wirklich löschen?`,
      [
        { text: t('cancel') || 'Abbrechen', style: 'cancel' },
        {
          text: t('delete') || 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await new Promise((resolve, reject) => {
                dbRefJobs.current.transaction((tx) => {
                  tx.executeSql(
                    'DELETE FROM eintraege WHERE rowid = ?',
                    [job.rowid],
                    () => resolve(),
                    (_, err) => reject(err),
                  );
                });
              });

              const filteredJobs = jobs.filter(
                (item) => item.rowid !== job.rowid,
              );
              setJobs(filteredJobs);

              if (filteredJobs.length === 0 && dbRef.current) {
                await new Promise((resolve, reject) => {
                  dbRef.current.transaction((tx) => {
                    tx.executeSql(
                      'UPDATE files SET jobs = ? WHERE ident = ?',
                      [null, deviceId],
                      () => resolve(),
                      (_, err) => reject(err),
                    );
                  });
                });
              }
            } catch (err) {
              console.error('Fehler beim Löschen:', err);
              Alert.alert('Fehler', 'Eintrag konnte nicht gelöscht werden.');
            }
          },
        },
      ],
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <SafeAreaView style={styles.safeAreaView}>
      <Info visible={infoState} onClose={() => {setInfoState(false)}} message={"Erstellen Sie Ihre maßgeschneiderte Bewerbung in Sekunden. Kopieren Sie einfach den Link der Stellenausschreibung (von Indeed, Stepstone, Jobvector, der Arbeitsagentur oder meinestadt.de) hier hinein. \n\nAlternativ können Sie auch einfach Ihre Berufsbezeichnung angeben – wir generieren basierend darauf ein professionelles Anschreiben für Sie."} />
      <View style={styles.container}>
        <Animated.View style={[{ transform: [{ translateY: animView }] }]}>
          {/* Anrede */}
          <View style={styles.section}>
            <View style={styles.radioContainer}>
              {anredeOptions.map((option) => (
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

          {/* Name */}
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
              onFocus={() => changeView(-50)}
            />
            {errors.anrede ? (
              <Text style={styles.error}>{errors.anrede}</Text>
            ) : null}
          </View>

          {/* Beruf */}
          <View style={styles.section}>
            <TextInput
              ref={jobRef}
              style={[
                styles.input,
                { paddingRight: inputValue.includes('indeed.com') ? 50 : 15 },
              ]}
              placeholder={t('beruf')}
              placeholderTextColor={'gray'}
              value={inputValue}
              onBlur={() => setSeeFlatList(false)}
              onFocus={() => changeView(-100)}
              onChangeText={handleChange}
              autoCorrect={false}
            />

            {inputValue.includes('https://') && (
              <TouchableOpacity
                onPress={startExtraction}
                style={styles.extractButton}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Text style={{ color: 'white', fontSize: 12 }}>Läd...</Text>
                ) : (
                  <MaterialIcons
                    name="auto-fix-high"
                    size={24}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            )}

            {errors.job ? (
              <Text style={styles.error1}>{errors.job}</Text>
            ) : null}

            {saveButton &&
              inputValue.length > 0 &&
              !inputValue.includes('https://') && (
                <TouchableOpacity
                  onPress={handleSaveJob}
                  style={styles.saveButton}
                >
                  <MaterialIcons name="save" size={24} color="white" />
                </TouchableOpacity>
              )}
              {inputValue.length === 0  && (
                <TouchableOpacity
                  onPress={() => {setInfoState(true); Keyboard.dismiss();}}
                  style={styles.saveButton}
                >
                  <MaterialIcons name="info" size={24} color="white" />
                </TouchableOpacity>
              )}

            {inputValue.length > 0 && seeFlatList && jobs.length > 0 && (
              <FlatList
                data={jobs}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, index) =>
                  item.rowid ? String(item.rowid) : String(index)
                }
                renderItem={({ item }) => (
                  <View>
                    <TouchableOpacity
                      onPress={() => deleteJob(item)}
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

            {/* Skills */}
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
                  onFocus={() => changeView(-125)}
                  autoCorrect={false}
                />
                {errors.skill ? (
                  <Text style={styles.error}>{errors.skill}</Text>
                ) : null}
                {skillButton && (
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                  >
                    <MaterialIcons name="save" size={24} color="white" />
                  </TouchableOpacity>
                )}
              </View>
              {erfahrung.length > 0 &&
                isFlatListVisibleSkills &&
                skillsNew.length > 0 && (
                  <FlatList
                    data={skillsNew}
                    keyExtractor={(item, index) => String(index)}
                    renderItem={({ item }) => (
                      <View>
                        <TouchableOpacity
                          onPress={() => deleteSkill(item)}
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
                      {employmentOptions.map((option) => (
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
                      {applicationOptions.map((option) => (
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

                  <View
                    style={{
                      width: '100%',
                      marginTop: 20,
                      marginBottom: 10,
                    }}
                  >
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
                  style={[styles.button]}
                  onPress={handleGeneratePDF}
                  disabled={loading && Object.values(errors).length === 0}
                >
                  <Text style={styles.buttonText}>
                    {loading && Object.values(errors).length === 0
                      ? `${t('pleaseWait')}${dots}`
                      : t('generateCoverLetter')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 15 }}
                  onPress={() => {
                    setOptionenView(!optionenView);
                    Keyboard.dismiss();
                  }}
                >
                  <Text
                    style={{
                      alignSelf: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 16,
                    }}
                  >
                    Optionen
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* ===================================== */}
      {/* EXTRAKTIONS-MODAL (mit echtem Modal!) */}
      {/* ===================================== */}
     {isExtracting && (
  <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
    {/* WebView: sichtbar im Layout, aber vom Overlay verdeckt */}
    {!!webViewUrl && (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: width,
          height: height,
        }}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={{ flex: 1 }}
         
          onLoadEnd={injectPlatformScript}
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setIsExtracting(false);
            setWebViewUrl('');
            Alert.alert('Fehler', 'Seite konnte nicht geladen werden.');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView HTTP error: ', nativeEvent.statusCode);
          }}
                  javaScriptEnabled={true}

          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        />
      </View>
    )}

    {/* Overlay deckt WebView ab */}
    <View                                                                                     
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundColor: 'rgb(0, 0, 0)',
        justifyContent: 'center',
        alignItems: 'center',                                                                                       
      }}
    >
      <ActivityIndicator size="large" color="#ffffff" />
      <Text
        style={{
          color: 'white',
          fontSize: 18,
          marginTop: 20,
          fontWeight: 'bold',
        }}
      >
        Stellenanzeige wird analysiert...
      </Text>

      <TouchableOpacity
        style={{ marginTop: 30, padding: 10 }}
        onPress={() => {
          setIsExtracting(false);
          setWebViewUrl('');
        }}
      >
        <Text style={{ color: '#f76266', fontSize: 16 }}>Abbrechen</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: 'rgb(8, 12, 32)',
  },
  error: {
    color: 'red',
    fontSize: 12,
    position: 'absolute',
    top: '7%',
    left: '1%',
  },
  extractButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#2e3a81',
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 5,
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
    position: 'absolute',
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
    backgroundColor: colors.card3,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
  },
  radioOptionSelected: {
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
    zIndex: 9999,
    backgroundColor: colors.card3,
    elevation: 10,
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
    zIndex: 9999,
    backgroundColor: colors.card3,
    elevation: 10,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
  },
});

export default Bewerbung;