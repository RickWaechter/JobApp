// inc/cvView.js
export function cvView(
  twoPage = false,
  personal = {},
  experiences = [],
  educations = [],
  skills = ''
) {
  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const formatText = (value) =>
    escapeHtml(value).replace(/\n/g, '<br>');

  const skillsList = (Array.isArray(skills)
    ? skills
    : String(skills || '').split(',')
  )
    .map((s) => String(s).trim())
    .filter(Boolean);

  const expArray = Array.isArray(experiences) ? experiences : [];
  const eduArray = Array.isArray(educations) ? educations : [];

  const contactItems = [
    personal.email && { icon: '✉', value: personal.email },
    personal.phone && { icon: '☎', value: personal.phone },
    personal.location && { icon: '⌖', value: personal.location },
  ].filter(Boolean);

  const displayName = escapeHtml(personal.name || 'Vor- und Nachname');
  const jobTitle = escapeHtml(personal.title || 'Berufsbezeichnung');

  const styles = `
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
        Roboto, Helvetica, Arial, sans-serif;
      background: transparent;
      color: #0f172a;
      line-height: 1.5;
      padding: 20px 0 60px 0;
      -webkit-font-smoothing: antialiased;
    }

    .sheet {
      width: 210mm;
      height: 295.5mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 20px 50px rgba(11, 21, 40, 0.32);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* 1-PAGER: Feste DIN-A4-Fläche, Inhalt skaliert innen automatisch passend */
    .sheetOnePage {
      width: 210mm;
      height: 295mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 20px 50px rgba(11, 21, 40, 0.32);
      overflow: hidden;
      position: relative;
    }

    .sheet-inner {
      width: 100%;
      min-height: 295mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transform-origin: top left;
    }

    .sheet:last-child {
      margin-bottom: 0;
      page-break-after: auto !important;
      break-after: auto !important;
    }

    /* MODERNER ZENTRIERTER HERO-HEADER */
    .header {
      position: relative;
      background:
        radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.16) 0%, transparent 62%),
        linear-gradient(145deg, #091326 0%, #102442 52%, #173561 100%) !important;
      color: #ffffff;
      padding: ${twoPage ? '36px 48px 30px' : '22px 42px 18px'};
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 3px solid #3b82f6;
    }

    .header::before {
      content: "";
      position: absolute;
      width: 260px;
      height: 260px;
      border: 1px solid rgba(148, 197, 255, 0.08);
      border-radius: 50%;
      left: -95px;
      bottom: -145px;
      box-shadow: 0 0 0 32px rgba(255, 255, 255, 0.018);
      pointer-events: none;
    }

    .header::after {
      content: "";
      position: absolute;
      width: 300px;
      height: 300px;
      border: 1px solid rgba(148, 197, 255, 0.09);
      border-radius: 50%;
      right: -95px;
      top: -155px;
      box-shadow:
        0 0 0 30px rgba(255, 255, 255, 0.02),
        0 0 0 62px rgba(255, 255, 255, 0.014);
      pointer-events: none;
    }

    h1 {
      position: relative;
      z-index: 1;
      font-size: ${twoPage ? '33px' : '26px'};
      line-height: 1.12;
      font-weight: 800;
      letter-spacing: -0.7px;
      color: #ffffff;
      overflow-wrap: anywhere;
    }

    /* BERUF: PROMINENT, GRÖSSER & MITTIG */
    .job-title {
      position: relative;
      z-index: 1;
      color: #bae6fd;
      font-size: ${twoPage ? '19px' : '16px'};
      font-weight: 600;
      letter-spacing: 0.4px;
      margin-top: ${twoPage ? '8px' : '5px'};
      line-height: 1.3;
    }

    .header-line {
      position: relative;
      z-index: 1;
      width: 64px;
      height: 3px;
      background: linear-gradient(90deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%) !important;
      border-radius: 999px;
      margin: ${twoPage ? '15px auto 15px' : '9px auto 9px'};
    }

    .contact-bar {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px 10px;
      max-width: 100%;
    }

    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.07) !important;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      padding: ${twoPage ? '4px 13px' : '3px 11px'};
      font-size: ${twoPage ? '10.5px' : '10px'};
      font-weight: 500;
      letter-spacing: 0.1px;
    }

    .contact-icon {
      color: #38bdf8;
      font-size: 11.5px;
    }

    /* HEADER FOLGESEITEN (2, 3, 4...) */
    .header-page2 {
      background: linear-gradient(135deg, #091326 0%, #142c52 100%) !important;
      color: #ffffff;
      padding: 15px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      border-bottom: 2.5px solid #3b82f6;
    }

    .page2-name {
      font-size: 14.5px;
      font-weight: 800;
      letter-spacing: -0.2px;
    }

    .page2-title {
      color: #bae6fd;
      font-size: 13px;
      font-weight: 600;
    }

    /* INHALT */
    .page-content {
      padding: ${twoPage ? '26px 48px 18px' : '16px 42px 12px'};
      flex: 1;
      overflow: ${twoPage ? 'hidden' : 'visible'};
    }

    /* ABSTÄNDE FÜR DIE EINZELSEITE (ONEPAGE) */
    .sheetOnePage .page-content .section-heading {
      margin-top: 0;
      margin-bottom: 8px;
    }

    .sheetOnePage .page-content .section-heading:first-child,
    .sheetOnePage .page-content .section-heading:first-of-type {
      margin-top: 0;
    }

    .sheetOnePage .page-content * + .section-heading {
      margin-top: 15px;
    }

    /* ZENTRIERTE SEKTIONS-ÜBERSCHRIFT MIT PILL-BADGE & VERLAUFSLINIEN */
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: ${twoPage ? '20px' : '10px'};
      margin-bottom: ${twoPage ? '14px' : '8px'};
    }

    .section-heading:first-child {
      margin-top: 0;
    }

    .section-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 4px 14px 4px 6px;
      flex-shrink: 0;
    }

    .section-number {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .section-title {
      color: #0f172a;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 1.6px;
      text-transform: uppercase;
    }

    .section-divider {
      flex: 1;
      height: 1px;
    }

    .section-divider-left {
      background: linear-gradient(270deg, #cbd5e1 0%, transparent 100%) !important;
    }

    .section-divider-right {
      background: linear-gradient(90deg, #cbd5e1 0%, transparent 100%) !important;
    }

    /* KURZPROFIL CALLOUT */
    .profile-text {
      font-size: ${twoPage ? '11.6px' : '10.5px'};
      line-height: ${twoPage ? '1.65' : '1.46'};
      color: #334155;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 3.5px solid #2563eb;
      border-radius: 10px;
      padding: ${twoPage ? '12px 16px' : '7px 13px'};
      margin-bottom: ${twoPage ? '14px' : '6px'};
    }

    /* MODERNE TIMELINE MIT SUBTILEN KARTEN */
    .timeline {
      padding-left: 20px;
      margin-left: 6px;
      border-left: 2px solid #dbeafe;
    }

    .entry {
      position: relative;
      background: #fafbfd !important;
      border: 1px solid #edf2f7;
      border-radius: 10px;
      padding: ${twoPage ? '11px 14px' : '7px 11px'};
      margin-bottom: ${twoPage ? '12px' : '7px'};
    }

    .entry:last-child {
      margin-bottom: 0;
    }

    .entry::before {
      content: "";
      position: absolute;
      left: -26px;
      top: 13px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff !important;
      border: 3px solid #2563eb !important;
      box-shadow: 0 0 0 3px #dbeafe;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .role {
      color: #0f172a;
      font-size: ${twoPage ? '13px' : '11.6px'};
      font-weight: 750;
      line-height: 1.32;
    }

    .date {
      flex-shrink: 0;
      color: #1d4ed8;
      background: #eff6ff !important;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .company {
      color: #2563eb;
      font-size: ${twoPage ? '11.3px' : '10.5px'};
      font-weight: 650;
      margin-top: 2px;
    }

    .description {
      color: #475569;
      font-size: ${twoPage ? '11.2px' : '10px'};
      line-height: ${twoPage ? '1.58' : '1.42'};
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1px dashed #e2e8f0;
    }

    /* KOMPETENZEN / SKILLS */
    .skills-box {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: ${twoPage ? '8px' : '5px'};
      margin-top: 4px;
    }

    .skill-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc !important;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      padding: ${twoPage ? '5px 12px' : '3px 9px'};
      border-radius: 8px;
      font-size: ${twoPage ? '10.6px' : '9.5px'};
      font-weight: 600;
    }

    .skill-tag::before {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #2563eb !important;
      flex-shrink: 0;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 9px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #64748b;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.9px;
      text-transform: uppercase;
      background: #f8fafc !important;
      flex-shrink: 0;
    }

    /* VERSTECKTE MESS- & QUELL-CONTAINER */
    #cv-source,
    #mm-ruler {
      position: absolute;
      left: -9999px;
      top: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #cv-source {
      width: 210mm;
    }

    #mm-ruler {
      width: 10mm;
      height: 100mm;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 209.5mm !important;
        height: ${twoPage ? 'auto' : '295mm'} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #cv-source,
      #mm-ruler {
        display: none !important;
      }

      .sheet {
        margin: 0 !important;
        box-shadow: none !important;
        width: 209.5mm !important;
        height: 295mm !important;
        max-height: 295mm !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      }

      .sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .sheetOnePage {
        margin: 0 !important;
        box-shadow: none !important;
        width: 209.5mm !important;
        height: 295mm !important;
        max-height: 295mm !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `;

  const renderSectionHeading = (num, title, blockName) => `
    <div class="section-heading" data-block="${blockName}">
      <div class="section-divider section-divider-left"></div>
      <div class="section-pill">
        <div class="section-number">${num}</div>
        <div class="section-title">${title}</div>
      </div>
      <div class="section-divider section-divider-right"></div>
    </div>
  `;

  const profileSection = (num = '01') =>
    personal.summary
      ? `
        ${renderSectionHeading(num, 'Profil', 'profile-heading')}
        <p class="profile-text" data-block="profile-text">${formatText(personal.summary)}</p>
      `
      : '';

  const expSection = (num = '02') =>
    expArray.length > 0
      ? `
        ${renderSectionHeading(num, 'Berufserfahrung', 'exp-heading')}
        <div class="timeline">
          ${expArray
            .map(
              (exp) => `
            <div class="entry" data-block="exp-entry">
              <div class="entry-header">
                <div class="role">${escapeHtml(exp.role || 'Position')}</div>
                ${exp.period ? `<div class="date">${escapeHtml(exp.period)}</div>` : ''}
              </div>
              ${exp.company ? `<div class="company">${escapeHtml(exp.company)}</div>` : ''}
              ${exp.description ? `<div class="description">${formatText(exp.description)}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
      : '';

  const eduSection = (num = '03') =>
    eduArray.length > 0
      ? `
        ${renderSectionHeading(num, 'Ausbildung', 'edu-heading')}
        <div class="timeline">
          ${eduArray
            .map(
              (edu) => `
            <div class="entry" data-block="edu-entry">
              <div class="entry-header">
                <div class="role">${escapeHtml(edu.degree || 'Abschluss')}</div>
                ${edu.period ? `<div class="date">${escapeHtml(edu.period)}</div>` : ''}
              </div>
              ${edu.school ? `<div class="company">${escapeHtml(edu.school)}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
      : '';

  const skillsSection = (num = '04') =>
    skillsList.length > 0
      ? `
        ${renderSectionHeading(num, 'Kompetenzen', 'skills-heading')}
        <div class="skills-box" data-block="skills-box">
          ${skillsList
            .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
            .join('')}
        </div>
      `
      : '';

  // MEHRSEITIGER MODUS (verteilt Inhalt automatisch auf 2, 3, 4+ Seiten)
  if (twoPage) {
    return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=800, user-scalable=yes" />
<title>Lebenslauf - ${displayName}</title>
<style>${styles}</style>
</head>
<body>

  <div id="pages-container"></div>

  <div id="cv-source">
    <header id="tpl-header-first" class="header">
      <h1>${displayName}</h1>
      <div class="job-title">${jobTitle}</div>
      <div class="header-line"></div>
      <div class="contact-bar">
        ${contactItems
          .map(
            (item) => `
          <div class="contact-item">
            <span class="contact-icon">${item.icon}</span>
            <span>${escapeHtml(item.value)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </header>

    <div id="tpl-header-next" class="header-page2">
      <span class="page2-name">${displayName}</span>
      <span class="page2-title">${jobTitle}</span>
    </div>

    <footer id="tpl-footer" class="footer">
      <span class="page-counter">LEBENSLAUF</span>
      <span>${displayName}</span>
    </footer>

    ${profileSection('01')}
    ${expSection('02')}
    ${eduSection('03')}
    ${skillsSection('04')}
  </div>

  <script>
    (function paginateCv() {
      var container = document.getElementById('pages-container');
      var source = document.getElementById('cv-source');
      if (!container || !source) return;

      var tplHeaderFirst = document.getElementById('tpl-header-first');
      var tplHeaderNext = document.getElementById('tpl-header-next');
      var tplFooter = document.getElementById('tpl-footer');

      var pages = [];

      function createPage(pageIndex) {
        var sheet = document.createElement('div');
        sheet.className = 'sheet';

        var header = (pageIndex === 0 ? tplHeaderFirst : tplHeaderNext).cloneNode(true);
        header.removeAttribute('id');

        var main = document.createElement('main');
        main.className = 'page-content';

        var footer = tplFooter.cloneNode(true);
        footer.removeAttribute('id');

        sheet.appendChild(header);
        sheet.appendChild(main);
        sheet.appendChild(footer);

        container.appendChild(sheet);
        pages.push(sheet);
        return main;
      }

      var currentMain = createPage(0);

      function overflows(el) {
        return el.scrollHeight > el.clientHeight + 1;
      }

      // 1. Profil
      var profHeading = source.querySelector('[data-block="profile-heading"]');
      var profText = source.querySelector('[data-block="profile-text"]');
      if (profHeading && profText) {
        currentMain.appendChild(profHeading);
        currentMain.appendChild(profText);
        if (overflows(currentMain) && currentMain.children.length > 2) {
          currentMain = createPage(pages.length);
          currentMain.appendChild(profHeading);
          currentMain.appendChild(profText);
        }
      }

      // Hilfsfunktion für Timeline-Sektionen (Berufserfahrung & Ausbildung)
      function flowTimelineSection(headingSelector, entrySelector) {
        var heading = source.querySelector(headingSelector);
        var entries = Array.prototype.slice.call(source.querySelectorAll(entrySelector));
        if (!heading || entries.length === 0) return;

        var timeline = document.createElement('div');
        timeline.className = 'timeline';

        var firstEntry = entries[0];
        timeline.appendChild(firstEntry);
        currentMain.appendChild(heading);
        currentMain.appendChild(timeline);

        if (overflows(currentMain) && currentMain.children.length > 2) {
          currentMain = createPage(pages.length);
          currentMain.appendChild(heading);
          currentMain.appendChild(timeline);
        }

        for (var i = 1; i < entries.length; i++) {
          var entry = entries[i];
          timeline.appendChild(entry);

          if (overflows(currentMain)) {
            timeline.removeChild(entry);
            currentMain = createPage(pages.length);
            timeline = document.createElement('div');
            timeline.className = 'timeline';
            timeline.appendChild(entry);
            currentMain.appendChild(timeline);
          }
        }
      }

      // 2. Berufserfahrung
      flowTimelineSection('[data-block="exp-heading"]', '[data-block="exp-entry"]');

      // 3. Ausbildung
      flowTimelineSection('[data-block="edu-heading"]', '[data-block="edu-entry"]');

      // 4. Kompetenzen
      var skillsHeading = source.querySelector('[data-block="skills-heading"]');
      var skillsBox = source.querySelector('[data-block="skills-box"]');
      if (skillsHeading && skillsBox) {
        currentMain.appendChild(skillsHeading);
        currentMain.appendChild(skillsBox);

        if (overflows(currentMain) && currentMain.children.length > 2) {
          currentMain = createPage(pages.length);
          currentMain.appendChild(skillsHeading);
          currentMain.appendChild(skillsBox);
        }
      }

      var totalPages = pages.length;
      for (var p = 0; p < totalPages; p++) {
        var counter = pages[p].querySelector('.page-counter');
        if (counter) {
          counter.textContent = 'LEBENSLAUF — SEITE ' + (p + 1) + ' VON ' + totalPages;
        }
      }

      source.remove();
    })();
  </script>

</body>
</html>
`;
  }

  // 1-PAGER (passt Inhalt per physikalischer mm-Messung & Zoom/Scale exakt auf 1 DIN-A4-Seite ein)
  return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=800, user-scalable=yes" />
<title>Lebenslauf - ${displayName}</title>
<style>${styles}</style>
</head>
<body>

  <div id="mm-ruler"></div>

  <div class="sheetOnePage" id="one-page-sheet">
    <div class="sheet-inner" id="one-page-inner">
      <header class="header">
        <h1>${displayName}</h1>
        <div class="job-title">${jobTitle}</div>
        <div class="header-line"></div>
        <div class="contact-bar">
          ${contactItems
            .map(
              (item) => `
            <div class="contact-item">
              <span class="contact-icon">${item.icon}</span>
              <span>${escapeHtml(item.value)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </header>

      <main class="page-content">
        ${profileSection('01')}
        ${expSection('02')}
        ${eduSection('03')}
        ${skillsSection('04')}
      </main>

      <footer class="footer">
        <span>LEBENSLAUF</span>
        <span>${displayName}</span>
      </footer>
    </div>
  </div>

  <script>
    (function () {
      function fitOnePage() {
        var inner = document.getElementById('one-page-inner');
        var ruler = document.getElementById('mm-ruler');
        if (!inner) return;

        // Zurücksetzen für saubere Messung
        inner.style.zoom = '1';
        inner.style.transform = '';
        inner.style.width = '100%';
        inner.style.minHeight = '295mm';

        // Exakte Pixel-Höhe von 293mm über das 100mm-Referenzelement bestimmen
        var mmPx = (ruler && ruler.offsetHeight > 0) ? (ruler.offsetHeight / 100) : 3.7795;
        var targetH = 293 * mmPx;
        var contentH = inner.scrollHeight;

        if (contentH > targetH + 1) {
          var scale = Math.max(0.5, (targetH / contentH) * 0.985);

          // 1. Primär CSS zoom (skaliert Layout & Druck-Box direkt in WebKit & Blink)
          inner.style.zoom = String(scale);
          inner.style.minHeight = (295 / scale) + 'mm';

          // 2. Fallback auf transform: scale(), falls ein Renderer zoom ignoriert
          var renderedH = inner.getBoundingClientRect().height;
          if (renderedH > targetH * 1.03) {
            inner.style.zoom = '';
            inner.style.width = (100 / scale) + '%';
            var refinedH = inner.scrollHeight;
            var finalScale = Math.max(0.5, (targetH / refinedH) * 0.985);
            inner.style.width = (100 / finalScale) + '%';
            inner.style.minHeight = (295 / finalScale) + 'mm';
            inner.style.transform = 'scale(' + finalScale + ')';
          }
        }
      }

      fitOnePage();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fitOnePage);
      }
      window.addEventListener('load', fitOnePage);
      window.addEventListener('beforeprint', fitOnePage);
      window.addEventListener('resize', fitOnePage);
      setTimeout(fitOnePage, 60);
    })();
  </script>

</body>
</html>
`;
}