export const extractScript = `
  (function() {
    function findTitle(doc) {
      if (!doc) return null;
      const selectors = [
        '[data-testid="vj-job-title"]',
        'h4[data-testid="vj-job-title"]',
        'h1[data-testid="jobsearch-JobInfoHeader-title"]',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title',
        'h1',
        'h4[role="heading"]',
        'h2'
      ];
      for (let s of selectors) {
        const el = doc.querySelector(s);
        if (el && el.textContent && el.textContent.trim().length > 2) {
          const text = el.textContent.trim();
          if (!text.toLowerCase().includes('indeed')) return text;
        }
      }
      return null;
    }

    // Klickt alle bekannten Varianten von "Mehr anzeigen" / "Weiterlesen"
    function expandFullDescription(doc) {
      if (!doc) return false;
      let clicked = false;

      // 1. Per Selektor
      const selectors = [
        'button[aria-expanded="false"]',
        '[data-testid="viewJobDetailsButton"]',
        '.jobsearch-JobDescription-viewMore',
        'button[data-testid="job-details-expand-button"]',
        '#viewJobDetailsButton'
      ];
      for (let s of selectors) {
        const btn = doc.querySelector(s);
        if (btn) {
          btn.click();
          clicked = true;
          break;
        }
      }

      // 2. Per Text-Inhalt (sucht alle klickbaren Elemente ab)
      if (!clicked) {
        const candidates = doc.querySelectorAll('button, [role="button"], a, div[tabindex="0"]');
        for (let el of candidates) {
          const t = (el.textContent || '').trim().toLowerCase();
          if (
            t.includes('mehr anzeigen') ||
            t.includes('weiterlesen') ||
            t.includes('vollständige') ||
            t.includes('ganze stellenanzeige') ||
            t.includes('show more')
          ) {
            el.click();
            clicked = true;
            break;
          }
        }
      }
      return clicked;
    }

    function extractDescription(doc) {
      if (!doc) return '';
      const descSelectors = [
        '#jobDescriptionText',
        '#react-native-html-content',
        '[data-testid="jobsearch-JobComponent-description"]',
        '.jobsearch-JobComponent-description',
        '#vj-desc',
        'div.react-native-html-content',
        '[id^="jobDescription"]'
      ];

      for (let sel of descSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 30) {
          let clone = el.cloneNode(true);
          clone.querySelectorAll('style, script').forEach(n => n.remove());

          let html = clone.innerHTML
            .replace(/<br\\s*[\\/]?>/gi, "\\n")
            .replace(/<\\/p>/gi, "\\n\\n")
            .replace(/<\\/li>/gi, "\\n")
            .replace(/<li>/gi, "• ");

          let div = document.createElement('div');
          div.innerHTML = html;
          return (div.textContent || div.innerText || '').replace(/\\n{3,}/g, "\\n\\n").trim();
        }
      }
      return '';
    }

    // 1. Sofort versuchen, den Ausklapp-Button im Hauptdokument oder iFrames zu drücken
    expandFullDescription(document);
    const frames = document.querySelectorAll('iframe');
    frames.forEach(f => {
      try {
        expandFullDescription(f.contentDocument || f.contentWindow.document);
      } catch (e) {}
    });

    // 2. Polling mit Wartezeit, damit der DOM nach dem Klick nachladen kann
    let attempts = 0;
    const maxAttempts = 20; // 20 * 250ms = 5 Sekunden
    let lastLength = 0;

    const interval = setInterval(function() {
      attempts++;

      // Immer wieder versuchen zu expandieren, falls der Button spät geladen wurde
      expandFullDescription(document);

      let title = findTitle(document);
      let desc = extractDescription(document);

      // Falls im Hauptdokument nichts da ist, in den iFrames schauen
      if (!desc || desc.length < 150) {
        const iframes = document.querySelectorAll('iframe');
        for (let frame of iframes) {
          try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (!title) title = findTitle(frameDoc);
            const frameDesc = extractDescription(frameDoc);
            if (frameDesc.length > desc.length) desc = frameDesc;
          } catch (e) {}
        }
      }

      // Prüfen, ob der Text abgeschnitten ist (endet auf "..." oder typische Zeichen)
      const isStillTruncated = desc.endsWith('...') || desc.endsWith('…');

      // Wir sind fertig, wenn:
      // a) Titel da ist
      // b) Text länger als 400 Zeichen ist (oder nicht mehr wächst)
      // c) Kein "..." am Ende mehr steht ODER Timeout erreicht ist
      const isComplete = desc.length > 400 && !isStillTruncated;

      if (isComplete || (attempts >= maxAttempts && desc.length > 50)) {
        clearInterval(interval);

        // Fallback Titel über OpenGraph / Document.title
        if (!title) {
          const og = document.querySelector('meta[property="og:title"]');
          title = og ? og.content.split(' - ')[0] : document.title.split(' - ')[0];
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: desc.length > 50 ? 'success' : 'error',
          title: title || 'Unbekannter Job',
          description: desc,
          debugAttempts: attempts
        }));
      }

      lastLength = desc.length;
    }, 250);

  })();
  true;
`;
   /* export const jobvectorScript = `
    (function() {
      try {
        // 1. DEN TEXT-CONTAINER SUCHEN
        const descSelectors = [
          '#react-native-html-content',
          '#jobDescriptionText',
          '.jobsearch-JobComponent-description',
          '#vj-desc',
          '[class^="job-description-text"]',
          '[data-testid="jobsearch-JobComponent-description"]'
        ];

        let jobContainer = null;
        for (let selector of descSelectors) {
          jobContainer = document.querySelector(selector);
          if (jobContainer && jobContainer.textContent.trim().length > 0) {
            break; 
          }
        }
        
        // 2. DEN TITEL SUCHEN (Mit intelligenter Prioritätenliste)
        const titleSelectors = [
          '[data-testid="jobsearch-JobInfoHeader-title"]', // 1. Wahl: Der perfekte Treffer
          'h1.jobsearch-JobInfoHeader-title',              // 2. Wahl: Desktop h1 mit Klasse
          'h2.subheading-title',              // 3. Wahl: Tablet h2 mit Klasse
          '.jobsearch-JobInfoHeader-title',                // 4. Wahl: Nur die Klasse (egal ob span, div, etc.)
          'h5[role="heading"]'                             // 5. Wahl: Die mobile React-Native Ansicht
        ];
        
        let titleElement = null;
        for (let tSel of titleSelectors) {
          titleElement = document.querySelector(tSel);
          if (titleElement && titleElement.textContent.trim().length > 0) {
            break; // Sobald er einen gültigen Titel findet, hört er auf zu suchen
          }
        }
                             
        const jobTitle = titleElement ? titleElement.textContent.trim() : 'Unbekannter Job';

        // 3. DATEN BEREINIGEN UND SENDEN
        if (jobContainer) {
          let clone = jobContainer.cloneNode(true);
          let styleTags = clone.querySelectorAll('style');
          styleTags.forEach(tag => tag.remove());
          
          let htmlContent = clone.innerHTML;
          
          htmlContent = htmlContent.replace(/<br\\s*[\\/]?>/gi, "\\n");
          htmlContent = htmlContent.replace(/<\\/p>/gi, "\\n\\n");
          htmlContent = htmlContent.replace(/<\\/li>/gi, "\\n");
          htmlContent = htmlContent.replace(/<li>/gi, "• ");
          
          let tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          let cleanText = tempDiv.textContent.trim();
          
          cleanText = cleanText.replace(/\\n{3,}/g, "\\n\\n");

          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'success',
            title: jobTitle,
            description: cleanText
          }));
        } else {
          const bodyText = document.body ? document.body.innerText.substring(0, 200) : 'Kein Body';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'error',
            message: 'Konnte die Beschreibung nicht finden.',
            debug: bodyText 
          }));
        }
      } catch (e) {
         window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'error',
            message: 'Fehler im Auslese-Skript: ' + e.toString()
          }));
      }
    })();
    true;
  `;*/
export const meinestadtScript = `
   (function() {
    try {
      // 1. ALLE TEXT-CONTAINER SUCHEN (Kombinierter Selektor)
     const descSelector = [
        // 1. [id^="croppedCopy-"]
        'div[id^="croppedCopy-"]',
        'article[id^="croppedCopy-"]',

        // 2. .ms-jobDetailStyledText
        'div.ms-jobDetailStyledText',
        'article.ms-jobDetailStyledText',

        // 3. .js-mstWrapper
        'div.js-mstWrapper',
        'article.js-mstWrapper',

        // 4. #detail-beschreibung-text-container
        'div#detail-beschreibung-text-container',
        'article#detail-beschreibung-text-container',

        // 5. m-croppedCopy__content
        'div.m-croppedCopy__content',
        'article.m-croppedCopy__content'
      ].join(', ');

      const containers = document.querySelectorAll(descSelector);
    
      // 2. DEN TITEL SUCHEN
      const titleSelectors = [
        '#detail-kopfbereich-titel',
        'h1.titel-lane',
        '.job-title',
        'h1',
        '[data-testid="jobsearch-JobInfoHeader-title"]'
      ];
      
      let titleElement = null;
      for (let tSel of titleSelectors) {
        titleElement = document.querySelector(tSel);
        if (titleElement && titleElement.textContent.trim().length > 0) {
          break; 
        }
      }
                           
      const jobTitle = titleElement ? titleElement.textContent.trim() : (document.title.split(' - ')[0] || 'Unbekannter Job');

      // 3. DATEN BEREINIGEN & ZUSAMMENFÜHREN
      if (containers && containers.length > 0) {
        let fullDescription = '';
        let extractedLists = [];

        containers.forEach((container) => {
          // cloneNode funktioniert nur auf einzelnen DOM-Knoten!
          let clone = container.cloneNode(true);

          // Unerwünschte Tags entfernen
          clone.querySelectorAll('style, script').forEach(tag => tag.remove());

          // Cookie- & Datenschutzeinstellungen filtern
          const paragraphs = clone.querySelectorAll('p, li, div');
          paragraphs.forEach(p => {
            const txt = (p.textContent || '').toLowerCase();
            if (txt.includes('cookies') || txt.includes('datenschutzeinstellungen') || txt.includes('technisch notwendige')) {
              p.remove();
            }
          });

          // Listen extrahieren
          clone.querySelectorAll('ul').forEach(ul => {
            let listItems = [];
            ul.querySelectorAll('li').forEach(li => {
              let text = li.textContent.trim();
              if (text) listItems.push(text);
            });
            if (listItems.length > 0) extractedLists.push(listItems);
          });

          // HTML in Text umwandeln mit Zeilenumbrüchen
          let htmlContent = clone.innerHTML;
          htmlContent = htmlContent.replace(/<br\\s*[\\/]?>/gi, "\\n");
          htmlContent = htmlContent.replace(/<\\/p>/gi, "\\n\\n");
          htmlContent = htmlContent.replace(/<\\/li>/gi, "\\n");
          htmlContent = htmlContent.replace(/<li>/gi, "• ");
          
          let tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          let cleanText = (tempDiv.textContent || tempDiv.innerText || '').trim();

          // Duplikate vermeiden (falls Selektoren verschachtelt zutreffen)
          if (cleanText.length > 0 && !fullDescription.includes(cleanText)) {
            fullDescription += cleanText + "\\n\\n";
          }
        });

        fullDescription = fullDescription.replace(/\\n{3,}/g, "\\n\\n").trim();

        if (fullDescription.length > 30) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'success',
            title: jobTitle,
            description: fullDescription,
            lists: extractedLists
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'error',
            message: 'Extrahierter Text war zu kurz.'
          }));
        }
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'error',
          message: 'Konnte die Beschreibung nicht finden.'
        }));
      }
    } catch (e) {
       window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'error',
          message: 'Fehler im Skript: ' + e.toString()
        }));
    }
  })();
  true;
`;

export const stepstoneScript = `
(function() {
  try {
    // 1. TITEL-SUCHE (Priorität auf stabilen Daten-Attributen)
    const titleSelectors = [
      '[data-at="header-job-title"]',
      'h1[class*="job-ad-display"]',
      'h1'
    ];

    let jobTitle = 'Unbekannter Job';
    for (let tSel of titleSelectors) {
      let el = document.querySelector(tSel);
      if (el && el.textContent.trim()) {
        jobTitle = el.textContent.trim();
        break;
      }
    }

    // 2. BESCHREIBUNG-SUCHE
    // Wir suchen nach dem Attribut "section-text-description-content"
    // oder nach Klassen, die mit "job-ad-display" beginnen.
    const descSelectors = [
      '[data-at="section-text-description-content"]',
      '[class*="job-ad-display-"][class*="description"]',
      '[class*="job-ad-display-nfizss"]',
      '#jobDescriptionText',
      '.listingContentBrandingColor' // Speziell für Stepstone
    ];

    let jobContainer = null;
    for (let selector of descSelectors) {
      jobContainer = document.querySelector(selector);
      if (jobContainer && jobContainer.textContent.trim().length > 30) {
        break; 
      }
    }

    // 3. DATEN EXTRAHIEREN
    if (jobContainer) {
      let extractedLists = [];
      // Wir suchen alle Listen im Container
      jobContainer.querySelectorAll('ul').forEach(ul => {
        let items = Array.from(ul.querySelectorAll('li'))
                         .map(li => li.textContent.replace(/\\s+/g, ' ').trim())
                         .filter(text => text.length > 0);
        if (items.length > 0) extractedLists.push(items);
      });

      // Text-Reinigung für das Anschreiben
      let cleanText = jobContainer.innerText || jobContainer.textContent;
      cleanText = cleanText.replace(/\\n{3,}/g, "\\n\\n").trim();

      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: 'success',
        title: jobTitle,
        description: cleanText,
        lists: extractedLists
      }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: 'error',
        message: 'Konnte die Stellenbeschreibung nicht finden.'
      }));
    }
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      status: 'error',
      message: 'JS Fehler: ' + e.toString()
    }));
  }
})();
true;
`;
  export const agenturScript = `
  (function() {
    try {
      // 1. DEN TEXT-CONTAINER SUCHEN
     const descSelectors = [
  '#detail-beschreibung-text-container', // <--- NEU: Dein perfekter Treffer aus dem HTML!
  '#react-native-html-content',
  '#jobDescriptionText',
  '.jobsearch-JobComponent-description',
  '#vj-desc',
  '[id^="croppedCopy-41"]',
  '[data-testid="jobsearch-JobComponent-description"]',
  '.ba-copytext'                         // <--- Fallback auf die Klasse, falls die ID mal fehlt
];

      let jobContainer = null;
      for (let selector of descSelectors) {
        jobContainer = document.querySelector(selector);
        if (jobContainer && jobContainer.textContent.trim().length > 0) {
          break; 
        }
      }
      
      // 2. DEN TITEL SUCHEN (Mit intelligenter Prioritätenliste)
     const titleSelectors = [
        '#detail-kopfbereich-titel',                     // <--- NEU: Deine gefundene ID für den Titel!
        '[data-testid="jobsearch-JobInfoHeader-title"]', 
        'h1#headline-31',              
        'h2.subheading-title',              
        '.jobsearch-JobInfoHeader-title',                
        'h5[role="heading"]',
        '.titel-lane'                                    // Fallback auf die Klasse
      ];
      
      let titleElement = null;
      for (let tSel of titleSelectors) {
        titleElement = document.querySelector(tSel);
        if (titleElement && titleElement.textContent.trim().length > 0) {
          break; 
        }
      }
                           
      const jobTitle = titleElement ? titleElement.textContent.trim() : 'Unbekannter Job';

      // 3. DATEN BEREINIGEN UND SENDEN
      if (jobContainer) {
        
        // NEU: Gezielt alle Listen (<ul>) und deren Punkte (<li>) scrappen
        let extractedLists = [];
        let ulElements = jobContainer.querySelectorAll('ul');
        
        ulElements.forEach(ul => {
          let listItems = [];
          // Alle <li> innerhalb dieser <ul> finden
          ul.querySelectorAll('li').forEach(li => {
            let text = li.textContent.trim();
            if (text) {
              listItems.push(text);
            }
          });
          // Nur hinzufügen, wenn die Liste auch wirklich Punkte enthält
          if (listItems.length > 0) {
            extractedLists.push(listItems);
          }
        });

        // Bisherige Logik für den kompletten Text beibehalten
        let clone = jobContainer.cloneNode(true);
        let styleTags = clone.querySelectorAll('style');
        styleTags.forEach(tag => tag.remove());
        
        let htmlContent = clone.innerHTML;
        
        htmlContent = htmlContent.replace(/<br\\s*[\\/]?>/gi, "\\n");
        htmlContent = htmlContent.replace(/<\\/p>/gi, "\\n\\n");
        htmlContent = htmlContent.replace(/<\\/li>/gi, "\\n");
        htmlContent = htmlContent.replace(/<li>/gi, "• ");
        
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        let cleanText = tempDiv.textContent.trim();
        
        cleanText = cleanText.replace(/\\n{3,}/g, "\\n\\n");

        // Daten an React Native senden inkl. dem neuen 'lists' Array
        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'success',
          title: jobTitle,
          description: cleanText,
          lists: extractedLists // Hier ist dein Array mit allen <ul> / <li> Inhalten!
        }));
      } else {
        const bodyText = document.body ? document.body.innerText.substring(0, 200) : 'Kein Body';
        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'error',
          message: 'Konnte die Beschreibung nicht finden.',
          debug: bodyText 
        }));
      }
    } catch (e) {
       window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'error',
          message: 'Fehler im Auslese-Skript: ' + e.toString()
        }));
    }
  })();
  true;
`;