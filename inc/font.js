// inc/loadCustomFonts.js
import RNFS from 'react-native-fs';
import fontkit from '@pdf-lib/fontkit';

/**
 * Registriert fontkit auf dem übergebenen PDFDocument,
 * liest die TTF-Dateien ein und bettet sie ein.
 *
 * @param {PDFDocument} pdfDoc - Die mit PDFDocument.create() erstellte Instanz
 * @param {string} [folderName='fonts'] - Der Ordnername in LibraryDirectoryPath
 * @param {string} [regularFile='arimo.ttf'] - Dateiname für Regular-Font
 * @param {string} [boldFile='arimo-bold.ttf'] - Dateiname für Bold-Font (optional)
 * @returns {Promise<{ font: PDFFont, fontBold: PDFFont }>}
 */
export const loadCustomFonts = async (
  pdfDoc,
  fontName = 'Arimo',
  fontSize = 10
) => {
  if (!pdfDoc) {
    throw new Error('PDFDocument Instanz fehlt oder ist undefined.');
  }
const folderName = 'fonts';
const regularFile = `${fontName}.ttf`;
const boldFile = `${fontName}-Bold.ttf`;
  // 1. fontkit auf der Dokumentinstanz registrieren
  pdfDoc.registerFontkit(fontkit);

  const basePath = `${RNFS.LibraryDirectoryPath}/${folderName}`;
  const regularPath = `${basePath}/${regularFile}`;

  if (!(await RNFS.exists(regularPath))) {
    throw new Error(`Font-Datei nicht gefunden: ${regularPath}`);
  }

  // 2. Regular Font einlesen & einbetten
  const regularBase64 = await RNFS.readFile(regularPath, 'base64');
  const font = await pdfDoc.embedFont(regularBase64);

  // 3. Bold Font einlesen & einbetten (Fallback auf Regular, falls keine separate Datei existiert)
  let fontBold = font;
  const boldPath = `${basePath}/${boldFile}`;
  
  if (await RNFS.exists(boldPath)) {
    const boldBase64 = await RNFS.readFile(boldPath, 'base64');
    fontBold = await pdfDoc.embedFont(boldBase64);
  }

  return { font, fontBold, fontSize };
};