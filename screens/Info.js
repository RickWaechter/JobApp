import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  ImageBackground,
  Alert,
  Dimensions
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import { Card } from '@rneui/themed';
import SQLite from 'react-native-sqlite-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Privacy from './Privacy';
import { useTranslation } from 'react-i18next';
import colors from '../inc/colors.js';
import '../local/i18n';
export default function StartApp() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [startVisible, setStartVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [popupVisible, setPopupVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState('');

  const allSuggestions = [
    'Abfallberater', 'Abfallwirtschaftstechniker', 'Abbrucharbeiter', 'Abdichter', 'Abfallentsorger', 'Abfallwirtschaftsmeister',
    'Abkanter', 'Abrechner', 'Absolvent', 'Abteilungsleiter', 'Abwassermeister', 'Abwassertechniker', 'Agrarwissenschaftler',
    'Agrartechniker', 'Akademiker', 'Akquisiteur', 'Aktuar', 'Altenpfleger', 'Altenpflegehelfer', 'Altenpflegefachkraft',
    'Amtsarzt', 'Amtsleiter', 'Analyst', 'Anästhesietechnischer Assistent', 'Anlagenführer', 'Anlagenmechaniker',
    'Anlagenmonteur', 'Anlagentechniker', 'Anwendungsentwickler', 'App-Entwickler', 'Apotheker', 'Apothekerassistent',
    'Approbierter', 'Arbeitsvermittler', 'Architekt', 'Archäologe', 'Arzthelfer', 'Arzt', 'Arztsekretär', 'Asphaltbauer',
    'Assistent', 'Assistent der Geschäftsführung', 'Astrophysiker', 'Asylberater', 'Athletiktrainer', 'Atemtherapeut',
    'Atomphysiker', 'Audiologe', 'Aufnahmeleiter', 'Augenoptiker', 'Augenoptikermeister', 'Augenoptikertechniker',
    'Ausbilder', 'Ausbaufacharbeiter', 'Außendienstmitarbeiter', 'Automatisierungstechniker', 'Automobilkaufmann',
    'Automobilverkäufer', 'Automobiltechniker', 'Autoverkäufer', 'Automechaniker', 'Automechatroniker', 'Autotechniker',
    'Bauarbeiter', 'Bauingenieur', 'Bauleiter', 'Bauzeichner', 'Bauphysiker', 'Bankkaufmann', 'Bankangestellter',
    'Barkeeper', 'Bibliothekar', 'Biochemiker', 'Biologe', 'Biotechnologe', 'Bodenleger', 'Buchhalter', 'Buchhändler',
    'Buchbinder', 'Bürokaufmann', 'Büroangestellter', 'Büroassistent', 'Bürofachkraft', 'Busfahrer',
    'CAD-Zeichner', 'Chemielaborant', 'Chemieingenieur', 'Chemiker', 'Chirurg', 'Controller', 'Content-Manager',
    'Data-Scientist', 'Dachdecker', 'Designer', 'Diplomat', 'Dolmetscher', 'Dozent', 'Drahtzieher',
    'Dreher', 'Drucker', 'E-Commerce-Manager', 'Energieberater', 'Energieelektroniker', 'Entwickler',
    'Ergotherapeut', 'Ernährungsberater', 'Erzieher', 'Eventmanager', 'Fachinformatiker', 'Fachinformatiker für Anwendungsentwicklung', 'Fachlagerist',
    'Fachkraft für Lagerlogistik', 'Fachwirt', 'Fahrer', 'Fahrlehrer', 'Fallmanager', 'Feinmechaniker',
    'Fernsehredakteur', 'Fertigungstechniker', 'Filialleiter', 'Finanzberater', 'Fischer', 'Fleischer',
    'Florist', 'Förster', 'Fotograf', 'Friseur', 'Facharbeiter', 'Gärtner', 'Gebäudereiniger',
    'Gefäßchirurg', 'Geigenbauer', 'Geograf', 'Geoinformatiker', 'Geologe', 'Gesundheitsberater',
    'Geschäftsführer', 'Glaser', 'Grafikdesigner', 'Graveur', 'Großhandelskaufmann', 'Gärtner',
    'Gymnasiallehrer', 'Hebamme', 'Heilpraktiker', 'Hochbauingenieur', 'Hörakustiker', 'Hotelfachmann',
    'Hotelmanager', 'Immobilienkaufmann', 'Industriemechaniker', 'Industriekaufmann', 'Ingenieur',
    'Informatiker', 'Instandhalter', 'Installateur', 'Intensivpfleger', 'IT-Administrator',
    'IT-Consultant', 'IT-Projektleiter', 'Journalist', 'Jurist', 'Kameramann', 'Kardiologe',
    'Karosseriebauer', 'Kaufmann', 'Kaufmann für Bürokommunikation', 'Kaufmännischer Angestellter',
    'Kellner', 'Kinderpfleger', 'Kinderarzt', 'Koch', 'Konstrukteur', 'Kosmetiker',
    'Krankenpfleger', 'Krankenpflegehelfer', 'Krankenpflegefachkraft', 'Krankengymnast', 'Kraftfahrer',
    'Kraftfahrzeugmechaniker', 'Kranführer', 'Küchenchef', 'Kunsthistoriker', 'Kunststofftechniker',
    'Kurator', 'Laborant', 'Lackierer', 'Lagerist', 'Landschaftsarchitekt', 'Landwirt', 'Landmaschinenmechaniker',
    'Lebensmitteltechniker', 'Lektor', 'Lichttechniker', 'LKW-Fahrer', 'Logistiker', 'Lohnbuchhalter', 'Lokführer',
    'Lüftungsbauer', 'Manager', 'Marketingmanager', 'Marktforscher', 'Maschinenbauingenieur', 'Maschinenschlosser',
    'Mathematiker', 'Maurer', 'Mechaniker', 'Mechatroniker', 'Mediengestalter', 'Mediziner', 'Medizinischer Fachangestellter',
    'Metzger', 'Mikrotechnologe', 'Möbeltischler', 'Molkereifachmann', 'Montagearbeiter', 'Motorradmechaniker',
    'Musiklehrer', 'Musiker', 'Notar', 'Notfallsanitäter', 'Oberarzt', 'Obstbauer', 'Objektleiter',
    'Ökotrophologe', 'Orthopädiemechaniker', 'Pädagoge', 'Packmitteltechnologe', 'Paläontologe', 'Patentanwalt',
    'Personalberater', 'Personalleiter', 'Pfarrer', 'Pflegedienstleiter', 'Pflegefachkraft', 'Pharmazeut', 'Philosoph',
    'Physiotherapeut', 'Pilot', 'Polier', 'Polizist', 'Postbote', 'Produktdesigner', 'Produktmanager', 'Programmierer',
    'Projektleiter', 'Prozessmanager', 'Psychologe', 'Psychotherapeut', 'Qualitätsmanager', 'Raumausstatter', 'Rechtsanwalt',
    'Redakteur', 'Regisseur', 'Reinigungskraft', 'Reiseverkehrskaufmann', 'Rettungssanitäter', 'Sachbearbeiter',
    'Schädlingsbekämpfer', 'Schichtleiter', 'Schilder- und Lichtreklamehersteller', 'Schlosser', 'Schneider',
    'Schornsteinfeger', 'Schreiner', 'Schriftsteller', 'Schweißer', 'Softwareentwickler', 'Sozialarbeiter',
    'Sozialpädagoge', 'Speditionskaufmann', 'Sportlehrer', 'Steuerberater', 'Systemadministrator', 'Systemanalytiker',
    'Tänzer', 'Tagesmutter', 'Technischer Zeichner', 'Telekommunikationstechniker', 'Theologe', 'Tierarzt',
    'Tischler', 'Triebfahrzeugführer', 'Trockenbaumonteur', 'Übersetzer', 'Uhrmacher', 'Umweltingenieur',
    'Unternehmensberater', 'Veranstaltungstechniker', 'Verfahrensmechaniker', 'Verkäufer', 'Verlagskaufmann',
    'Versicherungsberater', 'Vertriebsingenieur', 'Vertriebsleiter', 'Verwaltungsfachangestellter', 'Volkswirt', 'Warenverärumer',
    'Webdesigner', 'Webentwickler', 'Werbefachmann', 'Werkzeugmacher', 'Wirtschaftsinformatiker', 'Wirtschaftsingenieur',
    'Wirtschaftsprüfer', 'Wissenschaftler', 'Zahnarzt', 'Zahntechniker', 'Zimmerer', 'Zimmermann', 'Zollbeamter', 'Zugführer',
    'Abfallbeauftragter', 'Abfallberater', 'Abfüller', 'Abwassermeister', 'Account-Manager', 'ADAS/AD Engineer', 'Ägyptologe', 'Änderungsschneider',
    'Aerobic-Trainer', 'Affiliate-Manager', 'Afrikanist', 'Agiler Coach / Scrum Master', 'Agrarbiologie', 'Agrarmanagement', 'Agrarmanagement', 'Agrarservicemeister/in',
    'Agrarwirtschaftlich-technische/r Assistent/in', 'Agrarwissenschaft', 'Agrarwissenschaft', 'Agrarwissenschaftler/in / Agrarökonom/in', 'Aktuar/in', 'Akustiker/in', 'Algesiologe/Algesiologin', 'Alleinsteuermann/-frau',
    'Allg. und vergleichende Kulturwissenschaft', 'Allg. und vergleichende Literaturwissenschaft', 'Allg. und vergleichende Sprachwissenschaft', 'Alte Musik', 'Altenpflegehelfer/in', 'Altenpfleger/in', 'Altentherapeut/in', 'Altertumswissenschaften',
    'Altertumswissenschaftler/in', 'Ambulante/r Pfleger/in', 'Amtliche/r Fachassistent/in', 'Amtsanwalt/-anwältin', 'Anästhesietechnische/r Assistent/in', 'Angewandte Naturwissenschaft', 'Anglist/in / Amerikanist/in', 'Anglistik, Amerikanistik',
    'Animateur/in - Freizeit', 'Animationskünstler/in', 'Ankleider/in / Garderobier/e', 'Anlageberater/in', 'Anlagenmechaniker/in', 'Anlagenmechaniker/in - Sanitär-, Heizungs- und Klimatechnik', 'Anschläger/in', 'Anzeigenverkäufer/in',
    'Apotheker/in', 'Application-Engineer/-Manager/in', 'Arabist/in', 'Arabistik', 'Arabistik', 'Arbeitsassistent/in', 'Arbeitserzieher/in', 'Arbeitsmarktmanagement',
    'Arbeitsmarktmanager/in', 'Arbeitsmarktorientierte Beratung', 'Arbeitsmarktorientierte/r Berater/in', 'Arbeitsmedizinische/r Assistent/in', 'Arbeitsplanungsingenieur/in', 'Arbeitsplatz-Auditor/in', 'Arbeitsvermittler/in', 'Arbeitsvorbereiter/in',
    'Arbeitswissenschaftler/in', 'Archäologe/Archäologin', 'Archäologie', 'Architekt/in', 'Architektur', 'Archivar/in', 'Archivwissenschaft', 'Arrangeur/in',
    'Art-Buyer', 'Art-Director', 'Artist/in', 'Arzt/Ärztin', 'Arztassistent/in / Physician Assistant', 'Arztsekretär/in', 'Asphaltbauer/in', 'Assistent/in - Controlling',
    'Assistent/in - Ernährung und Versorgung', 'Assistent/in - Filmgeschäftsführung', 'Assistent/in - Gesundheits- und Sozialwesen', 'Assistent/in - Gesundheitstourismus/-prophylaxe', 'Assistent/in - Hotelmanagement', 'Assistent/in - Informatik', 'Assistent/in - Innenarchitektur', 'Assistent/in - klinische Studien',
    'Assistent/in - Maschinenbautechnik', 'Assistent/in - Medientechnik', 'Assistent/in - Produktdesign', 'Assistent/in - Produktionsleitung', 'Assistent/in - Steuerberatung', 'Assistent/in - Technische Kommunikation', 'Assistent/in - Wirtschaftsprüfung', 'Assistent/in/Fachkraft - Rechnungswesen',
    'Astrologe/Astrologin', 'Astrophysik', 'Astrophysiker/in, Astronom/in', 'Atem-, Sprech- und Stimmlehrer/in', 'Atemtherapeut/in', 'Audio-, Sounddesign', 'Audio-Engineer', 'Audiodesigner/in - Musik',
    'Audiodeskriptor/in', 'Aufbereitungsmechaniker/in - Braunkohle', 'Aufbereitungsmechaniker/in - Feuerfeste/keramische Rohstoffe', 'Aufbereitungsmechaniker/in - Naturstein', 'Aufbereitungsmechaniker/in - Sand und Kies', 'Aufbereitungsmechaniker/in - Steinkohle', 'Aufnahmeleiter/in - Film und Fernsehen', 'Aufsichtsperson (Unfallversicherung)',
    'Auftragsleiter/in', 'Aufzugmonteur/in', 'Augenoptik, Optometrie', 'Augenoptiker/in', 'Augenoptikermeister/in', 'Auktionator/in, Versteiger(er/in)', 'Aus- und Weiterbildungspädagoge/-pädagogin', 'Ausbaufacharbeiter/in - Estricharbeiten',
    'Ausbaufacharbeiter/in - Fliesen-, Platten- u. Mosaikarbeiten', 'Ausbaufacharbeiter/in - Stuckateurarbeiten', 'Ausbaufacharbeiter/in - Trockenbauarbeiten', 'Ausbaufacharbeiter/in - Wärme-, Kälte- u. Schallschutzarb.', 'Ausbaufacharbeiter/in - Zimmerarbeiten', 'Ausbaumanager/in', 'Ausbilder/in - Anerkannte Ausbildungsberufe', 'Ausbilder/in - Erste Hilfe',
    'Ausbilder/in - Pharmareferenten/-innen', 'Ausbildungsberater/in', 'Ausstattungs-Assistent/in', 'Ausstattungsleiter/in - Bühne/Film/Fernsehen', 'Ausstellungsdesign', 'Ausstellungsdesigner/in', 'Autogenschweißer/in', 'Automatenfachmann/-frau - Automatendienstleistung',
    'Automatenfachmann/-frau - Automatenmechatronik', 'Automatisierungstechnik', 'Automatisierungstechnik', 'Automobil-Serviceberater/in', 'Automobilkaufmann/-frau', 'Automobilwirtschaft, Automotive Management', 'Automobilwirtschaft, Automotive Management', 'Außendienstleiter/in (Versicherung)',
    'Außendienstmitarbeiter/in', 'Außenhandelsassistent/in'


  ];
  const DB_NAME = "firstNew.db";


  useFocusEffect(
    useCallback(() => {
      const getTheme = async () => {
        const theme = await EncryptedStorage.getItem("theme");
        setIsDarkMode(theme === "false" ? true : false);
        console.log(isDarkMode)
      }
      getTheme();
    }
      , [])
  );
  const Application = async () => {
    navigation.navigate("AGB")

  }

  const OldApplication = () => {
    navigation.navigate("Old")
  }
  const Privacy = () => {
    navigation.navigate("Privacy")
  }
  const Impressum = () => {
    navigation.navigate("Impressum")
  }
  const FAQ = () => {
    navigation.navigate("Faq")

  }
  const Contact = () => {
    navigation.navigate("Contact")
  }
  const goSetting = () => {
    navigation.navigate("Setting")
  }



  return (
    <View style={styles.container}>
      <View style={styles.inputsContainer}>
        <Card containerStyle={styles.cardContainer}>
          <View style={styles.row}>
            <TouchableOpacity onPress={FAQ} style={styles.entry}>
              <Card.Title style={styles.job}>
              <MaterialIcons name="info" color="white" size={50} />
</Card.Title>
<Card.Divider />
<Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
  {t('navigation.faq')}
</Text>
</TouchableOpacity>
<TouchableOpacity onPress={Contact} style={styles.entry}>
  <Card.Title style={styles.job}>
    <MaterialIcons name="alternate-email" color="white" size={50} />
  </Card.Title>
  <Card.Divider />
  <Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
    {t('navigation.contact')}
  </Text>
</TouchableOpacity>
</View>
</Card>
<Card containerStyle={styles.cardContainer}>
  <View style={styles.row}>
    <TouchableOpacity onPress={Application} style={styles.entry}>
      <Card.Title style={styles.job}>
        <MaterialIcons name="gavel" color="white" size={50} />
      </Card.Title>
      <Card.Divider />
      <Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
        {t('navigation.agb')}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={Privacy} style={styles.entry}>
      <Card.Title style={styles.job}>
        <MaterialIcons name="lock" color="white" size={50} />
      </Card.Title>
      <Card.Divider />
      <Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
        {t('navigation.privacy')}
      </Text>
    </TouchableOpacity>
  </View>
</Card>
<Card containerStyle={styles.cardContainer}>
  <View style={styles.row}>
    <TouchableOpacity onPress={Impressum} style={styles.entry}>
      <Card.Title style={styles.job}>
        <MaterialIcons name="home" color="white" size={50} />
      </Card.Title>
              <Card.Divider />
              <Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
                {t('navigation.impressum')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goSetting} style={styles.entry}>
      <Card.Title style={styles.job}>
        <MaterialIcons name="settings" color="white" size={50} />
      </Card.Title>
              <Card.Divider />
              <Text style={[styles.name,  t('deactivateAndClose').length > 10 && styles.buttonTextShort]}>
                {t('settings.title')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </View>
  );
};


const { width, height } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },
  buttonTextShort: {
    fontSize: 14, // Kleinere Schriftgröße für kürzere Texte
  },
  inputsContainer: {
    width: width * 1.03,
  },
  cardContainer: {
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,

    
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",

   
  },
  entry: {

    backgroundColor: colors.card3,
    padding: 10,
    borderRadius: 10,
    width: width * 0.40,   // 40% der Bildschirmbreite
    height: 130, // 15% der Bildschirmhöhe
   
    borderRadius: width * 0.02,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: 'gray',
  },
  name: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "rgba(206, 208, 212, 1)",
    marginBottom: 5,
  },
  nameDS: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "rgba(206, 208, 212, 1)",
    marginBottom: 5,
  },
  job: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
   
  },
});
