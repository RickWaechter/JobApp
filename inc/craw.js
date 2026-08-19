// inc/craw.js
import { parse } from 'node-html-parser';

// Parameter 'found' entfernt, da onProgress jetzt beide Werte liefert
export async function crawlEmails(firmenName, onProgress) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const ergebnisse = [];
  const startPunkte = [1, 11, 21, 31];

  const saubererName = firmenName
    .replace(/gmbh|co\.|kg|&|\b\.?\b/gi, '') 
    .replace(/\s+/g, ' ')
    .trim();

  const suchPhrasen = [
    `${saubererName} bewerbungs mail `,
    `${saubererName} bewerbung mail `,
    `${saubererName} mail `,
    `${saubererName} email `
  ];

  try {
    for (const aktuellePhrase of suchPhrasen) {
      let emailsFuerDiesePhrase = 0;
      // Hier 2 Argumente übergeben: Status-Text + Anzahl
      onProgress?.(`Suche nach: "${aktuellePhrase.trim()}"`, emailsFuerDiesePhrase);

      for (const start of startPunkte) {
        if (emailsFuerDiesePhrase >= 25) {
          break;
        }

        const url = `https://www.bing.com/search?pc=MOZI&form=MOZLBR&q=${encodeURIComponent(aktuellePhrase)}&first=${start}`;
        
        // Auch hier beide Werte übergeben:
        onProgress?.(
          `Scrape Position ${start}... (${emailsFuerDiesePhrase}/25 Mails gefunden)`, 
          emailsFuerDiesePhrase
        );

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'de-DE,de;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Referer': 'https://www.bing.com/'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();
        const root = parse(html);
        const algos = root.querySelectorAll('.b_algo');

        for (const element of algos) {
          if (emailsFuerDiesePhrase >= 25) {
            break; 
          }

          const snippetElement = element.querySelector('.b_caption p') 
            || element.querySelector('.b_snippet') 
            || element.querySelector('.b_linebreaking') 
            || element.querySelector('.b_algoSubcaption');

          let snippet = snippetElement ? snippetElement.text.trim() : '';

          if (!snippet) {
            const clone = parse(element.toString());
            ['h2', '.b_attribution', '.b_headline'].forEach(selector => {
              clone.querySelectorAll(selector).forEach(el => el.remove());
            });
            snippet = clone.text.trim();
          }

          snippet = snippet.replace(/\s+/g, ' ').trim();
          const gefundeneEmails = snippet.match(emailRegex) || [];
          
          if (gefundeneEmails.length === 0) {
            continue; 
          }

          const einzigartigeMails = [...new Set(gefundeneEmails)];

          einzigartigeMails.forEach(email => {
            const bereinigteMail = email.toLowerCase().trim();
            
            if (!ergebnisse.includes(bereinigteMail)) {
              ergebnisse.push(bereinigteMail);
              emailsFuerDiesePhrase++;
            }
          });
        }
      }
    }
    console.log("🚀🚀 suchPhrasen: ", suchPhrasen);
    console.log("🚀🚀 checkpoint reached");
    console.log("🚀🚀 checkpoint reached");
    
    return ergebnisse;

  } catch (error) {
    console.error("Crawling Fehler:", error);
    throw error;
  }
  console.log("🚀🚀 checkpoint reached");
}