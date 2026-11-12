import axios from 'axios';
import { Alert } from 'react-native';
export const thePrompt = (inputValue,  languageValue, detailedSkillsString) => {
    return `
    Du bist ein erfahrener Bewerbungsschreiber und Experte für professionelle, überzeugende Bewerbungsanschreiben.

Deine Aufgabe ist es, anhand der nachfolgenden Informationen ein individuelles und professionelles Bewerbungsanschreiben für die angegebene Position zu verfassen.

**ZIELPOSITION:**
${inputValue}

**GEWÜNSCHTER SCHREIBSTIL:**
'Professionell'

**AUSGABESPRACHE:**
${languageValue}

**MEIN BERUFLICHER HINTERGRUND:**
${detailedSkillsString}

### ANFORDERUNGEN

1. **Individueller Inhalt:** Verfasse ein überzeugendes Anschreiben, das meine tatsächlichen Erfahrungen, beruflichen Stationen und Fähigkeiten gezielt mit den Anforderungen und Aufgaben der Zielposition verbindet.

2. **Relevanz:** Verwende ausschließlich Informationen aus meinem beruflichen Hintergrund. Wähle die für die Zielposition relevantesten Erfahrungen und Fähigkeiten aus. Erwähne nicht wahllos sämtliche vorhandenen Kenntnisse.

3. **Glaubwürdigkeit:** Erfinde keine Berufserfahrungen, Qualifikationen, Projekte, Erfolge, Verantwortlichkeiten oder Kenntnisse. Stelle vorhandene Fähigkeiten nicht umfangreicher dar, als sie tatsächlich angegeben sind.

4. **Überzeugungskraft:** Zeige anhand konkreter Erfahrungen und Fähigkeiten, weshalb ich für die Position geeignet bin. Vermeide allgemeine Behauptungen und leere Formulierungen.

5. **Natürlichkeit:** Schreibe flüssig, authentisch und menschlich. Verwende abwechslungsreiche Satzanfänge und vermeide Wiederholungen, Standardfloskeln sowie unnötig komplizierte Formulierungen.

6. **Unternehmensneutralität:** Nenne weder konkrete Firmennamen noch spezifische Unternehmen. Verwende auch keine erfundenen Unternehmensinformationen.

7. **Direkter Einstieg:** Beginne unmittelbar mit dem eigentlichen Anschreibentext. Verwende keine Anrede, Begrüßung, Überschrift oder Einleitung außerhalb des Anschreibens.

8. **Abschluss:** Beende den Text mit einem passenden, professionellen Abschlusssatz, der mein Interesse an einem persönlichen Gespräch ausdrückt. Verwende anschließend KEINE Grußformel und KEINEN Namen.

### LÄNGE UND AUSGABEFORMAT

- Maximal 300 Wörter.
- Schreibe ausschließlich in der angegebenen Ausgabesprache.
- Verwende zusammenhängende, sinnvoll strukturierte Absätze.
- Gib ausschließlich das fertige Bewerbungsanschreiben aus.
- Keine Erklärungen, Kommentare, Alternativversionen oder Hinweise.

### PRIORITÄTEN

Bei widersprüchlichen Anforderungen gilt folgende Reihenfolge:
1. Keine Informationen erfinden.
2. Alle formalen Vorgaben einhalten.
3. Relevante Qualifikationen gezielt hervorheben.
4. Ein überzeugendes, natürliches Anschreiben formulieren.

Erstelle jetzt das fertige Bewerbungsanschreiben.
   `
}

export const getKeyword = async (id) => {


  try {
    console.log('Sending:', id);
    const response = await axios.post('https://api.jobapp2.de/getKeywords', {
      role: id.role,
      description: id.description ? id.description : "",
      modelIntens: "light",
    });
    if (response.data?.response) {
        console.log('Keywords:', response.data.response);
      const keywords = response.data.response;
      return keywords
    }
    
  } catch (error) {
    console.error('Fehler beim Senden:', error);
    Alert.alert('Fehler', 'Konnte nicht gesendet werden.');
  } finally {
}
}