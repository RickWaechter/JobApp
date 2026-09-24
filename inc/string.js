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