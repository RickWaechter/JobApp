  import React, { useState, useRef, useEffect, useMemo } from 'react';
  import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Linking,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
    ScrollView,
    BackHandler,
    AppState,
    Keyboard,
  } from 'react-native';
  import MaterialIcons from '@react-native-vector-icons/material-icons';
  import { WebView } from 'react-native-webview';
  import axios from 'axios';
  import JobWebView from '../../comp/jobWebView';
  import Clipboard from '@react-native-clipboard/clipboard';
  import EncryptedStorage from 'react-native-encrypted-storage';
  import JobSearch from '../../comp/jobSearch';
  import CompanySearchModal from '../../comp/name';
  import Bewerbung from '../application';
  import ChangeScreen from '../change';
  import {getDatabaseConnection, runQuery} from '../../inc/db'
  import {toBase64} from '../../inc/cryp';
  import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";

  // LayoutAnimation für Android aktivieren
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const { width, height } = Dimensions.get('window');

  const CAPTCHA_UNLOCK_KEY = 'ba_captcha_unlocked_key';
  let didResetStorageOnAppBoot = false;

  // Hilfsfunktion: Base64-Encoding für referenznummer -> encryptedJobCode


  // Dauerhaft gemountetes WebView-Overlay (fährt von rechts ein & aus, ohne zu unmounten)

  const ProfilScreen = () => {
    const [jobs, setJobs] = useState([]);
    const [jobsApply, setJobsApply] = useState([])
    const [totalJobs, setTotalJobs] = useState(0);
    const [loading, setLoading] = useState(false);
    const [copiedRefNr, setCopiedRefNr] = useState(null);
    const [inject, setInject] = useState(false)
    const insets = useSafeAreaInsets();
    // EncryptedStorage Key-Status: solange true, bleibt das WebView-Animated.View versteckt
    const [hasCaptchaKey, setHasCaptchaKey] = useState(false);
const [activeTab, setActiveTab] = useState('left'); // 'left' | 'right'
const [leftMounted, setLeftMounted] = useState(true);
const [rightMounted, setRightMounted] = useState(false);


const isSwitchingTabRef = useRef(false);
    // Accordion-States: welche Karte ist ausgeklappt + Cache der geladenen Details
    const [expandedJobId, setExpandedJobId] = useState(null);
    const [detailsCache, setDetailsCache] = useState({});
    const [loadingDetailsId, setLoadingDetailsId] = useState(null);

    // State für das Captcha-WebView-Overlay
    const [captchaRefNr, setCaptchaRefNr] = useState(null);
const [expandedDescriptionRefNr, setExpandedDescriptionRefNr] = useState(null);
    // States für CompanySearchModal, Bewerbung & ChangeScreen
    const [nameVisible, setNameVisible] = useState(false);
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [name, setName] = useState('');
    const [job, setJob] = useState('');
    const [description, setDescription] = useState('');
    const [bewerbungVisible, setBewerbungVisible] = useState(false);
    const [screenChange, setScreenChange] = useState(false);
    const [changeVisible, setChangeVisible] = useState(false);
    const refNum = useRef("")
    // Refs
    const bewerbungsRef = useRef(null);
    const changeScreenRef = useRef(null);

    // Animations-Werte
  const nameAnim = useRef(new Animated.Value(-width)).current;
    const nameAnimY = useRef(new Animated.Value(-height)).current;
    const bewerbungAnim = useRef(new Animated.Value(width)).current;
    const bewerbungAnimY = useRef(new Animated.Value(-height)).current;
    const changeAnim = useRef(new Animated.Value(width)).current;
    const changeAnimY = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
const leftAnim = useRef(new Animated.Value(0)).current;
const rightAnim = useRef(new Animated.Value(width)).current;
    const createCaptchaKey = async () => {
      try {
        const payload = JSON.stringify({
          unlocked: true,
          createdAt: Date.now(),
        });
        await EncryptedStorage.setItem(CAPTCHA_UNLOCK_KEY, payload);
        setHasCaptchaKey(true);
      } catch (error) {
        console.warn('Fehler beim Erstellen des EncryptedStorage-Keys:', error);
      }
    };

    const deleteCaptchaKey = async () => {
      try {
        await EncryptedStorage.removeItem(CAPTCHA_UNLOCK_KEY);
      } catch (error) {
        console.warn('Fehler beim Löschen des EncryptedStorage-Keys:', error);
      } finally {
        setHasCaptchaKey(false);
      }
    };

    // Beim App-Start alten Storage bereinigen & beim Schließen der App wieder löschen
    useEffect(() => {
      const setupStorage = async () => {
        if (!didResetStorageOnAppBoot) {
          didResetStorageOnAppBoot = true;
          await deleteCaptchaKey();
        } else {
          try {
            const existing = await EncryptedStorage.getItem(CAPTCHA_UNLOCK_KEY);
            setHasCaptchaKey(Boolean(existing));
          } catch (e) {
            setHasCaptchaKey(false);
          }
        }
      };

      setupStorage();

      const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'background') {
          deleteCaptchaKey();
        }
      });

      return () => {
        appStateSubscription.remove();
      };
    }, []);

    useEffect(() => {
      console.log('Übergebene Adressdaten:', { name, street, city });
    }, [street, city, name]);
  const stageTop = useMemo(() => insets.top * 1.7, [insets.top]);




    const handleCopyEmail = (email, refNr) => {
      if (!email) return;
      Clipboard.setString(email);
      setCopiedRefNr(refNr);
      setTimeout(() => {
        setCopiedRefNr((prev) => (prev === refNr ? null : prev));
      }, 2000);
    };
const switchToRightTab = () => {
  if (activeTab === 'right' || isSwitchingTabRef.current) return;

  isSwitchingTabRef.current = true;
  setActiveTab('right');

  // Sicherstellen, dass beide Views gemountet sind und Rechts rechts startet
  setLeftMounted(true);
  leftAnim.setValue(0);

  rightAnim.setValue(width);
  setRightMounted(true);

  requestAnimationFrame(() => {
    Animated.parallel([
      Animated.timing(leftAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      isSwitchingTabRef.current = false;
      if (finished) {
        // Ausgefahrene linke Animated.View unmounten
        setLeftMounted(false);
      }
    });
  });
};

const switchToLeftTab = () => {
  if (activeTab === 'left' || isSwitchingTabRef.current) return;

  isSwitchingTabRef.current = true;
  setActiveTab('left');

  // Sicherstellen, dass beide Views gemountet sind und Links links startet
  setRightMounted(true);
  rightAnim.setValue(0);

  leftAnim.setValue(-width);
  setLeftMounted(true);

  requestAnimationFrame(() => {
    Animated.parallel([
      Animated.timing(rightAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(leftAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      isSwitchingTabRef.current = false;
      if (finished) {
        // Ausgefahrene rechte Animated.View unmounten
        setRightMounted(false);
      }
    });
  });
};
    // Job-Liste laden (v6) & nach Entfernung sortieren
    const fetchJobs = async ({ was = '', wo = '', umkreis = 25 } = {}) => {
      let  applyArray = []
      let Array =[]
      const db = await getDatabaseConnection()
      const response = await runQuery(db, "SELECT apply from files")
      const responseNext = response.rows.raw()[0].apply
      const applys = responseNext?.split(",")
      const applyJobs = new Set(applys)
      console.log(applyJobs)
      setLoading(true);
      setExpandedJobId(null);
      try {
        const params = {
          size: 25,
          ...(was.trim() && { was: was.trim() }),
          ...(wo.trim() && { wo: wo.trim(), umkreis }),
        };

        const response = await axios.get(
          'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs',
          {
            headers: {
              'X-API-Key': 'jobboerse-jobsuche',
            },
            params,
          }
        );
        const theJobs = (response.data?.ergebnisliste || [])
          .map((item) => ({
            ...item,
            entfernung: item.entfernung != null ? Number(item.entfernung) : null,
          }))
          .sort((a, b) => (a.entfernung ?? 9999) - (b.entfernung ?? 9999));
          console.log("jobs", theJobs[0].referenznummer)
          for (let i = 0; i < theJobs.length; i++ )
          {
            const jobObject = theJobs[i]
            const ref = typeof jobObject?.referenznummer === 'string' ? jobObject.referenznummer.trim() : '';
            if (ref && applyJobs.has(ref)) {
              applyArray.push(theJobs[i])
              console.log("apply", i)
            }
            else {
              Array.push(theJobs[i])
              console.log("nonApply", i)
            }
          }
        setJobs(Array); 
        setJobsApply(applyArray)
        setTotalJobs(response.data?.maxErgebnisse || theJobs.length);
      } catch (error) {
        console.error('Fehler beim Laden der Jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    // Sichere PLZ-Abfrage über OpenPLZ
    const fetchPlzByCity = async (rawCity) => {
      try {
        const cleanCity = rawCity
          .split(',')[0]
          .split('(')[0]
          .split('-')[0]
          .trim();

        if (!cleanCity) return '';

        const response = await fetch(
          `https://openplzapi.org/de/Localities?name=${encodeURIComponent(cleanCity)}`
        );
        if (!response.ok) return '';

        const data = await response.json();
        return Array.isArray(data) && data.length > 0 ? data[0].postalCode || '' : '';
      } catch (err) {
        console.warn('OpenPLZ Fehler:', err);
        return '';
      }
    };

    // Karte aus-/einklappen & Details per GET /pc/v4/jobdetails/{encryptedJobCode} laden
    const handleToggleCard = async (item) => {
      const refNr = item.referenznummer;
      refNum.current = item.referenznummer
      console.log(refNum.current)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (expandedJobId === refNr) {
        setExpandedJobId(null);
        return;
      }

      setExpandedJobId(refNr);

      // Wenn Details schon im Cache liegen, States trotzdem für diese Karte aktualisieren
      if (detailsCache[refNr]) {
        setJob(detailsCache[refNr].jobTitel || item.stellenangebotsTitel || '');
        setDescription(detailsCache[refNr].beschreibung || '');
        return;
      }

      setLoadingDetailsId(refNr);
      try {
        const encryptedJobCode = item.hashId || toBase64(refNr);

        const response = await axios.get(
          `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/${encryptedJobCode}`,
          {
            headers: {
              'X-API-Key': 'jobboerse-jobsuche',
            },
          }
        );

        const detailData = response.data || {};
        console.log('Detaildaten:', detailData);
        const adresse =
          detailData.stellenlokationen?.[0]?.adresse ||
          item.stellenlokationen?.[0]?.adresse ||
          {};

        const ort = adresse.ort?.split(',')[0]?.trim() || '';
        let plz = adresse.plz || '';

        if (!plz && ort) {
          plz = await fetchPlzByCity(ort);
        }

        const hauptberuf = detailData.stellenangebotsTitel || item.stellenangebotsTitel || '';
        const cleanBeschreibung = (detailData.stellenangebotsBeschreibung || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // E-Mail direkt aus dem Beschreibungstext extrahieren, falls dort angegeben
        const emailMatch = cleanBeschreibung.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );

        setJob(hauptberuf);
        setDescription(cleanBeschreibung);

        const strasse = adresse.strasse || '';
        const hausnummer = adresse.hausnummer || '';
        const resolvedCompany =
          detailData.firma ||
          detailData.arbeitgeber ||
          detailData.allianzpartnerName ||
          item.firma ||
          '';

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDetailsCache((prev) => ({
          ...prev,
          [refNr]: {
            raw: detailData,
            jobTitel: hauptberuf,
            resolvedCompany,
            resolvedStreet: `${strasse} ${hausnummer}`.trim(),
            resolvedCity: `${plz} ${ort}`.trim(),
            externeURL: detailData.externeURL || '',
            email: detailData.kontakt?.email || (emailMatch ? emailMatch[0] : ''),
            telefon: detailData.kontakt?.telefon || detailData.kontakt?.mobiltelefon || '',
            ansprechpartner: [
              detailData.kontakt?.anrede,
              detailData.kontakt?.vorname,
              detailData.kontakt?.nachname,
            ]
              .filter(Boolean)
              .join(' '),
            beschreibung: cleanBeschreibung,
          },
        }));
      } catch (error) {
        console.error('Fehler beim Laden der Jobdetails:', error.response?.data || error.message);
      } finally {
        setLoadingDetailsId(null);
      }
    };

    // Daten der ausgeklappten Karte an CompanySearchModal & Bewerbung übergeben
  
    const openJobInBrowser = (refNr, externeURL) => {
      const url = externeURL || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
      Linking.openURL(url);
    };

  const handleNameSave = () => {
    bewerbungAnim.setValue(width);
    bewerbungAnimY.setValue(0);
    setScreenChange(false);
    setBewerbungVisible(true);

  setTimeout(() => {
      bewerbungsRef.current?.focusSkill();
    }, 50);
    Animated.parallel([
      Animated.timing(nameAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bewerbungAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Erst unmounten, wenn die Animation fertig ist und der Fokus längst drüben liegt
      setNameVisible(false);
    });
  };

  // 1. Öffnen: CompanySearchModal + Backdrop einblenden
 // Oben bei den Refs ergänzen:
  const isClosingNameRef = useRef(false);

  // 1. Öffnen: CompanySearchModal + Backdrop einblenden
  const openCompanyModalWithDetails = (item, cachedDetails) => {
    isClosingNameRef.current = false;
    backdropAnim.stopAnimation();
    nameAnim.stopAnimation();
    nameAnimY.stopAnimation();

    const fallbackOrt = item.stellenlokationen?.[0]?.adresse?.ort || '';
    const fallbackPlz = item.stellenlokationen?.[0]?.adresse?.plz || '';

    setName(cachedDetails?.resolvedCompany || item.firma || '');
    setStreet(cachedDetails?.resolvedStreet || '');
    setCity(cachedDetails?.resolvedCity || `${fallbackPlz} ${fallbackOrt}`.trim());
    setJob(cachedDetails?.jobTitel || item.stellenangebotsTitel || '');
    setDescription(cachedDetails?.beschreibung || '');

    nameAnim.setValue(width);
    nameAnimY.setValue(0);
    backdropAnim.setValue(0);
    setNameVisible(true);

    Animated.parallel([
      Animated.timing(nameAnim, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0.9,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 2. Schließen von Name-Modal: nach oben raus + Backdrop auf 0
  const closeName = () => {
    if (isClosingNameRef.current) return;
    isClosingNameRef.current = true;

    backdropAnim.stopAnimation();
    nameAnim.stopAnimation();
    nameAnimY.stopAnimation();

    Animated.parallel([
      Animated.timing(nameAnimY, {
        toValue: -height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        isClosingNameRef.current = false;
        return;
      }
      // JS- und Native-Wert hart auf 0 setzen, BEVOR setNameVisible den Re-Render triggert
      backdropAnim.setValue(0);
      nameAnim.setValue(-width);
      nameAnimY.setValue(-height);
      setNameVisible(false);
      isClosingNameRef.current = false;
    });
    Keyboard.dismiss();

  };

  // 3. Schließen von Bewerbung: nach oben raus + Backdrop auf 0
  const closeBewerbung = () => {
    backdropAnim.stopAnimation();
    bewerbungAnim.stopAnimation();
    bewerbungAnimY.stopAnimation();

    Animated.parallel([
      Animated.timing(bewerbungAnimY, {
        toValue: -height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      backdropAnim.setValue(0);
      bewerbungAnim.setValue(width);
      bewerbungAnimY.setValue(-height);
      setBewerbungVisible(false);
    });
    Keyboard.dismiss();

  };
    const openChangeScreen = () => {
      setScreenChange(true);
      setChangeVisible(true);
      changeAnim.setValue(width);
      changeAnimY.setValue(0);

      Animated.timing(changeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    const closeChangeScreen = () => {
       backdropAnim.stopAnimation();
    bewerbungAnim.stopAnimation();
    bewerbungAnimY.stopAnimation();

      Animated.timing(changeAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setChangeVisible(false);
        setScreenChange(false);
        changeAnim.setValue(width);
      });
    };

    const renderJobCard = ({ item }) => {
      const ort = item.stellenlokationen?.[0]?.adresse?.ort || 'Ort unbekannt';
      const plz = item.stellenlokationen?.[0]?.adresse?.plz || '';
      const isExpanded = expandedJobId === item.referenznummer;
      const isFetchingThis = loadingDetailsId === item.referenznummer;
      const isFetchingEmailHidden = captchaRefNr === item.referenznummer && hasCaptchaKey;
      const details = detailsCache[item.referenznummer];

      return (
        <View style={[styles.card, isExpanded && styles.cardExpanded]}>
          {/* Klickbarer Kopfbereich der Karte */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleToggleCard(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={isExpanded ? 4 : 3}>
                {item.stellenangebotsTitel}
              </Text>

              <View style={styles.headerRight}>
                {item.entfernung != null && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.entfernung} km</Text>
                  </View>
                )}
                <MaterialIcons
                  name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.company}>{item.firma}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {plz} {ort}
              </Text>
              {item.datumErsteVeroeffentlichung && (
                <Text style={styles.metaText}>
                  Ab: {item.datumErsteVeroeffentlichung}
                </Text>
              )}
            </View>

            <View style={styles.tagContainer}>
              {item.arbeitszeitVollzeit && (
                <Text style={styles.tag}>Vollzeit</Text>
              )}
              {item.istArbeitnehmerUeberlassung && (
                <Text style={styles.tag}>Zeitarbeit</Text>
              )}
              {item.vertragsdauer && item.vertragsdauer !== 'KEINE_ANGABE' && (
                <Text style={styles.tag}>{item.vertragsdauer}</Text>
              )}
              {item.festgehalt && (
                <Text style={styles.tag}>
                  {item.festgehalt} € ({item.verguetungsangabe})
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Ausgefahrener Detailbereich (Accordion) */}
          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={styles.divider} />

              {isFetchingThis ? (
                <View style={styles.inlineLoader}>
                  <ActivityIndicator size="small" color="#38bdf8" />
                  <Text style={styles.loaderText}>Lade Stellen-Details...</Text>
                </View>
              ) : details ? (
                <View style={styles.detailsContent}>
                  {/* Adresse */}
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Adresse</Text>
                    <Text style={styles.infoValue}>
                      {details.resolvedCompany}
                    </Text>
                    {Boolean(details.resolvedStreet) && (
                      <Text style={styles.infoValue}>{details.resolvedStreet}</Text>
                    )}
                    <Text style={styles.infoValue}>
                      {details.resolvedCity || `${plz} ${ort}`.trim()}
                    </Text>
                  </View>

                  {/* Kontakt (oder Button zum Freischalten per WebView-Captcha) */}
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Kontakt</Text>
                    {Boolean(details.ansprechpartner) && (
                      <Text style={styles.infoValue}>{details.ansprechpartner}</Text>
                    )}
                    {Boolean(details.email) ? (
                      <View style={styles.emailRow}>
                        <Text style={styles.infoValueAccent} selectable>
                          {details.email}
                        </Text>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          activeOpacity={0.75}
                          hitSlop={8}
                          onPress={() => handleCopyEmail(details.email, item.referenznummer)}
                        >
                          <MaterialIcons
                            name={copiedRefNr === item.referenznummer ? 'check' : 'content-copy'}
                            size={16}
                            color={copiedRefNr === item.referenznummer ? '#4ade80' : '#38bdf8'}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.unlockEmailBtn}
                        activeOpacity={0.8}
                        disabled={isFetchingEmailHidden}
                        onPress={() => {setCaptchaRefNr(item.referenznummer); setInject(true)}}
                      >
                        {isFetchingEmailHidden ? (
                          <>
                            <ActivityIndicator size="small" color="#38bdf8" />
                            <Text style={styles.unlockEmailText}>
                              E-Mail wird abgerufen...
                            </Text>
                          </>
                        ) : (
                          <>
                            <MaterialIcons name="lock-open" size={16} color="#38bdf8" />
                            <Text style={styles.unlockEmailText}>
                              E-Mail über Arbeitsagentur freischalten
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {Boolean(details.telefon) && (
                      <Text style={styles.infoValue}>{details.telefon}</Text>
                    )}
                  </View>

              

                  {/* Aktions-Buttons */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.applyButton}
                      activeOpacity={0.8}
                      onPress={() => openCompanyModalWithDetails(item, details)}
                    >
                      <MaterialIcons name="edit-document" size={18} color="#ffffff" />
                      <Text style={styles.applyButtonText}>
                        Bewerbung erstellen
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.browserButton}
                      activeOpacity={0.8}
                        onPress={() => {setCaptchaRefNr(item.referenznummer); setInject(false)}}
                    >
                      <MaterialIcons name="open-in-new" size={18} color="#38bdf8" />
                      <Text style={styles.browserButtonText}>Im Browser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.errorText}>
                  Keine weiteren Details verfügbar.
                </Text>
              )}
            </View>
          )}
        </View>
      );
    };

    return (
      
      <SafeAreaView style={styles.container}>
          <JobSearch onSearch={fetchJobs} loading={loading} />
       <Text style={styles.headerTitle}>
  Gefundene Jobs ({jobs.length}
  {totalJobs > jobs.length ? ` von ${totalJobs.toLocaleString('de-DE')}` : ''})
</Text>

{/* 2 Buttons: Links und Rechts */}
<View style={styles.tabRow}>
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={switchToLeftTab}
    style={[
      styles.tabButton,
      activeTab === 'left' && styles.tabButtonActive,
    ]}
  >
    <Text
      style={[
        styles.tabButtonText,
        activeTab === 'left' && styles.tabButtonTextActive,
      ]}
    >
     Neu
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    activeOpacity={0.8}
    onPress={switchToRightTab}
    style={[
      styles.tabButton,
      activeTab === 'right' && styles.tabButtonActive,
    ]}
  >
    <Text
      style={[
        styles.tabButtonText,
        activeTab === 'right' && styles.tabButtonTextActive,
      ]}
    >
      Beworben
    </Text>
  </TouchableOpacity>
</View>

{/* Bühne für beide Animated.View-Seiten */}
<View style={styles.tabContentStage}>
  {leftMounted && (
    <Animated.View
      pointerEvents={activeTab === 'left' ? 'auto' : 'none'}
      style={[
        styles.animatedPane,
        {
          transform: [{ translateX: leftAnim }],
        },
      ]}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          extraData={{
  expandedJobId,
  loadingDetailsId,
  detailsCache,
  copiedRefNr,
  captchaRefNr,
  hasCaptchaKey,
  expandedDescriptionRefNr,
}}
          keyExtractor={(item) => item.referenznummer}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Gib oben einen Jobtitel oder Ort ein, um Stellenangebote zu suchen.
            </Text>
          }
        />
      )}
    </Animated.View>
  )}

  {rightMounted && (
    <Animated.View
      pointerEvents={activeTab === 'right' ? 'auto' : 'none'}
      style={[
        styles.animatedPane,
        {
          transform: [{ translateX: rightAnim }],
        },
      ]}
    >
        <FlatList
          data={jobsApply}
          extraData={{
            expandedJobId,
            loadingDetailsId,
            detailsCache,
            copiedRefNr,
            captchaRefNr,
            hasCaptchaKey,
          }}
          keyExtractor={(item) => item.referenznummer}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Gib oben einen Jobtitel oder Ort ein, um Stellenangebote zu suchen.
            </Text>
          }
        />
    </Animated.View>
  )}

</View>

        {/* Persistentes WebView-Overlay (fährt von rechts ein & bleibt bei vorhandenem Key versteckt) */}
        <JobWebView
          visible={Boolean(captchaRefNr)}
          hideView={hasCaptchaKey}
          refNr={captchaRefNr}
          extractEmail={inject}
          onClose={() => setCaptchaRefNr(null)}
          onCaptchaRequired={() => {
            // Falls doch ein neues Captcha auftaucht, Key löschen -> Animated.View fährt ein
            deleteCaptchaKey();
          }}
          onEmailFound={async (targetRefNr, foundEmail) => {
            if (!targetRefNr) return;
            console.log('Gefundene E-Mail aus WebView:', foundEmail);

            // Beim ersten erfolgreichen Freischalten Key in EncryptedStorage speichern
            if (!hasCaptchaKey) {
              await createCaptchaKey();
            }

            setDetailsCache((prev) => ({
              ...prev,
              [targetRefNr]: {
                ...(prev[targetRefNr] || {}),
                email: foundEmail,
              },
            }));
          }}
        />

        {/* Dunkler Hintergrund-Backdrop für CompanySearchModal & Bewerbung */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 85,
              backgroundColor: '#000000',
              opacity: backdropAnim,
            },
          ]}
        />

        {/* Firmensuche / Adress-Modal */}
        <Animated.View
          pointerEvents={nameVisible ? 'auto' : 'none'}
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 90,
              transform: [
                { translateX: nameAnim },
                { translateY: nameAnimY }],
            },
          ]}
        >
          <CompanySearchModal
            visible={nameVisible}
            initialName={name}
            initialStreet={street}
            initialCity={city}
            onSaved={handleNameSave}
            manual={true}
            onClose={() => closeName()}
          />
        </Animated.View>

        {/* Bewerbungs-Generator */}
        <Animated.View
          pointerEvents={bewerbungVisible ? 'auto' : 'none'}
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 95,
              transform: [
                { translateX: bewerbungAnim },
                { translateY: bewerbungAnimY },
              ],
            },
          ]}
        >
          <Bewerbung
            visibleApp={bewerbungVisible}
            isNextStep={screenChange}
            changeScreen={openChangeScreen}
            onClose={closeBewerbung}
            ref={bewerbungsRef}
            initialJob={job}
            initialDescription={description}
          />
        </Animated.View>

        {/* ChangeScreen Overlay */}
        <Animated.View
          pointerEvents={changeVisible ? 'auto' : 'none'}
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 100,
              transform: [
                { translateX: changeAnim },
                { translateY: changeAnimY },
              ],
            },
          ]}
        >
          <ChangeScreen
            visible={changeVisible}
            onClose={closeChangeScreen}
            ref={changeScreenRef}
            refNumber={refNum.current}
          />
        </Animated.View>
      </SafeAreaView>
    );
  };

  const webViewStyles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 80,
      backgroundColor: '#0f172a',
    },
    container: {
      flex: 1,
      backgroundColor: '#0f172a',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
      gap: 12,
    },
    headerTextBox: {
      flex: 1,
    },
    headerTitle: {
      color: '#f8fafc',
      fontSize: 16,
      fontWeight: '700',
    },
    headerSub: {
      color: '#94a3b8',
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      backgroundColor: '#1e293b',
      padding: 8,
      borderRadius: 8,
    },
    webviewWrapper: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    loaderOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#0f172a',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      gap: 10,
    },
    loaderText: {
      color: '#94a3b8',
      fontSize: 13,
    },
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0f172a',
    },
    safeArea: {
      flex: 1,
    },

    tabRow: {
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  marginBottom: 10,
},
tabButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  backgroundColor: '#1e293b',
  borderWidth: 1,
  borderColor: '#334155',
  alignItems: 'center',
  justifyContent: 'center',
},
tabButtonActive: {
  backgroundColor: '#0284c7',
  borderColor: '#38bdf8',
},
tabButtonText: {
  color: '#94a3b8',
  fontSize: 14,
  fontWeight: '600',
},
tabButtonTextActive: {
  color: '#ffffff',
  fontWeight: '700',
},
tabContentStage: {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
},
animatedPane: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#0f172a',
},
rightInnerCard: {
  marginHorizontal: 16,
  backgroundColor: '#1e293b',
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: '#334155',
  gap: 8,
},
rightTitle: {
  color: '#f8fafc',
  fontSize: 16,
  fontWeight: '700',
},
rightSub: {
  color: '#94a3b8',
  fontSize: 13,
  lineHeight: 19,
},
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#f8fafc',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: '#1e293b',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#334155',
      overflow: 'hidden',
    },
    cardExpanded: {
      borderColor: '#0284c7',
      backgroundColor: '#1e293b',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: '#f8fafc',
      flex: 1,
    },
    badge: {
      backgroundColor: '#0284c7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    company: {
      fontSize: 14,
      color: '#38bdf8',
      marginTop: 4,
      fontWeight: '500',
    },
    descriptionScrollView: {
  maxHeight: 220,
  borderRadius: 6,
},
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    metaText: {
      fontSize: 13,
      color: '#94a3b8',
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    tag: {
      backgroundColor: '#334155',
      color: '#e2e8f0',
      fontSize: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: 'hidden',
    },
    expandedSection: {
      marginTop: 12,
    },
    divider: {
      height: 1,
      backgroundColor: '#334155',
      marginBottom: 12,
    },
    inlineLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    loaderText: {
      color: '#94a3b8',
      fontSize: 13,
    },
    detailsContent: {
      gap: 12,
    },
    infoBlock: {
      backgroundColor: '#0f172a',
      padding: 12,
      borderRadius: 8,
      gap: 3,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    infoLabelRight: {
       fontSize: 10,
      color: '#526d79',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 13.5,
      color: '#e2e8f0',
      lineHeight: 19,
    },
    infoValueAccent: {
      fontSize: 13.5,
      color: '#38bdf8',
      fontWeight: '600',
      flexShrink: 1,
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 2,
    },
    copyBtn: {
      backgroundColor: '#1e293b',
      borderWidth: 1,
      borderColor: '#334155',
      padding: 6,
      borderRadius: 6,
    },
    unlockEmailBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#1e293b',
      borderWidth: 1,
      borderColor: '#38bdf8',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      marginTop: 4,
      gap: 6,
    },
    unlockEmailText: {
      color: '#38bdf8',
      fontSize: 12.5,
      fontWeight: '600',
    },
    descriptionText: {
      fontSize: 14,
      color: '#cbd5e1',
      lineHeight: 19,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    applyButton: {
      flex: 2,
      flexDirection: 'row',
      backgroundColor: '#0284c7',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    applyButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13.5,
    },
    browserButton: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#334155',
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: '#38bdf8',
    },
    browserButtonText: {
      color: '#38bdf8',
      fontWeight: '600',
      fontSize: 13,
    },
    errorText: {
      color: '#f87171',
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 8,
    },
    emptyText: {
      color: '#94a3b8',
      textAlign: 'center',
      marginTop: 40,
      fontSize: 16,
    },
  });

  export default ProfilScreen;