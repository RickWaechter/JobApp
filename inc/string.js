export const sanitizeForPdf = (str) => {
  if (!str) return '';
  return str
    // Geschützte Bindestriche & verschiedene Gedankenstriche (U+2010 bis U+2015) zu normalem Bindestrich
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    // Typografische Anführungszeichen („, “, ”, «, ») zu normalen Anführungszeichen
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    // Typografische einfache Anführungszeichen & Apostrophe (‘, ’, ‚)
    .replace(/[\u2018\u2019\u201A]/g, "'")
    // Geschützte Leerzeichen & schmale Leerzeichen zu regulärem Leerzeichen
    .replace(/[\u00A0\u202F\u2007\u2009]/g, ' ')
    // Horizontale Ellipse (…) zu drei Punkten
    .replace(/\u2026/g, '...')
    // Weiche Trennzeichen & Zero-Width Spaces komplett entfernen
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '');
};

export const searchGmbh = (text) => {
  const upperText = text.toUpperCase();
const index = upperText.indexOf("GMBH");
if (index !== -1) {
// Wenn "GMBH" gefunden wurde (index !== -1), bis inklusive "GmbH" (+ 4 Zeichen) ausschneiden
const ergebnis = index !== -1 
  ? text.slice(0, index + 4).trim() 
  : text;
return ergebnis;
} else 
{return text}
console.log(ergebnis);
}
export const sanitizeFileName = (rawName) => {
  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Falls kein gültiges URI-Encoding vorliegt, Original verwenden
  }

  return decoded
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
};