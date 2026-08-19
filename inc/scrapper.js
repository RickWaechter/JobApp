export const extractScript = `
    (function() {
      try {
        const descSelectors = [
          '#react-native-html-content',
          '#jobDescriptionText',
          '.jobsearch-JobComponent-description',
          '#vj-desc',
          '[id^="jobDescription"]',
          '[data-testid="jobsearch-JobComponent-description"]'
        ];

        let jobContainer = null;
        for (let selector of descSelectors) {
          jobContainer = document.querySelector(selector);
          if (jobContainer && jobContainer.textContent.trim().length > 0) {
            break; 
          }
        }
        
        const titleSelectors = [
          '[data-testid="jobsearch-JobInfoHeader-title"]',
          'h1.jobsearch-JobInfoHeader-title',
          'h2.jobsearch-JobInfoHeader-title',
          '.jobsearch-JobInfoHeader-title',
          'h5[role="heading"]'
        ];
        
        let titleElement = null;
        for (let tSel of titleSelectors) {
          titleElement = document.querySelector(tSel);
          if (titleElement && titleElement.textContent.trim().length > 0) {
            break; 
          }
        }
                             
        const jobTitle = titleElement ? titleElement.textContent.trim() : 'Unbekannter Job';

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
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'error',
            message: 'Konnte die Beschreibung nicht finden. Bitte öffne die Anzeige komplett.',
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
  export const jobvectorScript = `
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
  `;
export const meinestadtScript = `
   (function() {
    try {
      // 1. DEN TEXT-CONTAINER SUCHEN
      const descSelectors = [
        '[id^="croppedCopy-"]',         // Flexibel für alle Nummern (-41, -43 etc.)
        '.ms-jobDetailStyledText', 
        '.js-mstWrapper',
        '#detail-beschreibung-text-container',
        'article.m-croppedCopy__content'
      ];

      let jobContainer = null;
      for (let selector of descSelectors) {
        jobContainer = document.querySelector(selector);
        if (jobContainer && jobContainer.textContent.trim().length > 0) {
          break; 
        }
      }
      
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
                           
      const jobTitle = titleElement ? titleElement.textContent.trim() : 'Unbekannter Job';

      // 3. DATEN BEREINIGEN
      if (jobContainer) {
        let clone = jobContainer.cloneNode(true);

        // --- NEU: COOKIE-TEXT ENTFERNEN ---
        // Wir suchen nach Absätzen, die typische Datenschutz-Wörter enthalten
        const paragraphs = clone.querySelectorAll('p, li');
        paragraphs.forEach(p => {
          const txt = p.textContent.toLowerCase();
          if (txt.includes('cookies') || txt.includes('datenschutzeinstellungen') || txt.includes('technisch notwendige')) {
            p.remove();
          }
        });

        // Listen extrahieren für dein 'lists' Array
        let extractedLists = [];
        clone.querySelectorAll('ul').forEach(ul => {
          let listItems = [];
          ul.querySelectorAll('li').forEach(li => {
            let text = li.textContent.trim();
            if (text) listItems.push(text);
          });
          if (listItems.length > 0) extractedLists.push(listItems);
        });

        // HTML zu Text konvertieren
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
          description: cleanText,
          lists: extractedLists
        }));
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