import RNFS from 'react-native-fs';

export const downloader = async (fileName, folderName) => {
  try {
    const folderPath = `${RNFS.LibraryDirectoryPath}/${folderName}`;

    // Ordner sicherstellen
    if (!(await RNFS.exists(folderPath))) {
      await RNFS.mkdir(folderPath);
    }

    const isFont = fileName.toLowerCase().endsWith('.ttf') || !fileName.includes('.');

    // ─────────────────────────────────────────────────────────────────────────
    // FALL 1: Normale Einzeldatei (z. B. jobs.db)
    // ─────────────────────────────────────────────────────────────────────────
    if (!isFont) {
      const destPath = `${folderPath}/${fileName}`;
      const fileExists = await RNFS.exists(destPath);

      if (!fileExists) {
        const res = await fetch(`https://api.jobapp2.de/get-secure-link/${folderName}/${fileName}`);
        if (!res.ok) {
          throw new Error(`Server antwortete mit Status ${res.status}`);
        }

        const data = await res.json();
        console.log(`Link Response für ${fileName}:`, data);

        if (data?.url) {
          const secureUrl = data.url.replace('http://', 'https://');
          await RNFS.downloadFile({
            fromUrl: secureUrl,
            toFile: destPath,
          }).promise;
          console.log(`✅ Datei erfolgreich gespeichert: ${destPath}`);
        } else {
          throw new Error('Keine Download-URL vom Server erhalten');
        }
      } else {
        console.log(`Datei ${fileName} existiert bereits lokal.`);
      }
    } 
    // ─────────────────────────────────────────────────────────────────────────
    // FALL 2: Fonts (.ttf / Regular + Bold)
    // ─────────────────────────────────────────────────────────────────────────
    else {
      const baseName = fileName.replace(/\.ttf$/i, '');
      const regularDest = `${folderPath}/${baseName}.ttf`;
      const boldDest = `${folderPath}/${baseName}-Bold.ttf`;

      const regularExists = await RNFS.exists(regularDest);
      const boldExists = await RNFS.exists(boldDest);

      if (!regularExists || !boldExists) {
        const res = await fetch(`https://api.jobapp2.de/get-secure-link/${folderName}/${baseName}`);
        if (!res.ok) {
          throw new Error(`Server antwortete mit Status ${res.status}`);
        }

        const data = await res.json();
        if (data?.regular && data?.bold) {
          const secureUrlRegular = data.regular.replace('http://', 'https://');
          const secureUrlBold = data.bold.replace('http://', 'https://');

          const downloads = [];
          if (!regularExists) {
            downloads.push(RNFS.downloadFile({ fromUrl: secureUrlRegular, toFile: regularDest }).promise);
          }
          if (!boldExists) {
            downloads.push(RNFS.downloadFile({ fromUrl: secureUrlBold, toFile: boldDest }).promise);
          }

          await Promise.all(downloads);
          console.log(`✅ Fonts für ${baseName} erfolgreich gespeichert.`);
        }
      }
    }

    // ── Auflistung ──
    const items = await RNFS.readDir(folderPath);
    console.log(`📁 Dateien in "${folderName}" (${items.length} gesamt):`);
    items.forEach((item, index) => {
      const sizeKB = (item.size / 1024).toFixed(1);
      console.log(`  [${index + 1}] ${item.name} (${sizeKB} KB)`);
    });

    return items;
  } catch (err) {
    console.error('Downloader Error:', err);
    throw err;
  }
};