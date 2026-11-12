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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, Helvetica, Arial, sans-serif;
      background: transparent;
      color: #1e293b;
      line-height: 1.5;
      padding: 20px 0 60px 0;
      -webkit-font-smoothing: antialiased;
    }

    .sheet {
      width: 210mm;
      height: 295.5mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.35);
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

    .sheetOnePage {
      width: 210mm;
      min-height: 295.5mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.35);
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

    .sheet:last-child,
    .sheetOnePage:last-child {
      margin-bottom: 0;
      page-break-after: auto !important;
      break-after: auto !important;
    }

    /* ZENTRIERTER HERO-HEADER */
    .header {
      position: relative;
      background: linear-gradient(135deg, #0f233e 0%, #163358 55%, #1d4272 100%) !important;
      color: #ffffff;
      padding: ${twoPage ? '36px 48px 30px' : '26px 42px 22px'};
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .header::before {
      content: "";
      position: absolute;
      width: 240px;
      height: 240px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 50%;
      left: -85px;
      bottom: -130px;
      box-shadow: 0 0 0 28px rgba(255, 255, 255, 0.02);
      pointer-events: none;
    }

    .header::after {
      content: "";
      position: absolute;
      width: 280px;
      height: 280px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 50%;
      right: -80px;
      top: -135px;
      box-shadow:
        0 0 0 26px rgba(255, 255, 255, 0.022),
        0 0 0 54px rgba(255, 255, 255, 0.018);
      pointer-events: none;
    }

    .eyebrow {
      color: #93c5fd;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(147, 197, 253, 0.22);
      border-radius: 999px;
      padding: 3px 12px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 2.2px;
      text-transform: uppercase;
      margin-bottom: ${twoPage ? '10px' : '8px'};
    }

    h1 {
      font-size: ${twoPage ? '32px' : '27px'};
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.6px;
      color: #ffffff;
      overflow-wrap: anywhere;
    }

    /* BERUF: GRÖSSER & MITTIG */
    .job-title {
      color: #bfdbfe;
      font-size: ${twoPage ? '18.5px' : '16px'};
      font-weight: 600;
      letter-spacing: 0.3px;
      margin-top: ${twoPage ? '7px' : '5px'};
      line-height: 1.3;
    }

    .header-line {
      width: 56px;
      height: 3px;
      background: linear-gradient(90deg, #60a5fa, #3b82f6) !important;
      border-radius: 999px;
      margin: ${twoPage ? '14px auto 14px' : '10px auto 10px'};
    }

    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px 12px;
      max-width: 100%;
    }

    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #e2e8f0;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 999px;
      padding: ${twoPage ? '4px 12px' : '3px 10px'};
      font-size: ${twoPage ? '10.5px' : '10px'};
      font-weight: 500;
    }

    .contact-icon {
      color: #7dd3fc;
      font-size: 12px;
    }

    /* HEADER FOLGESEITEN (2, 3, 4...) */
    .header-page2 {
      background: linear-gradient(135deg, #0f233e 0%, #163358 100%) !important;
      color: #ffffff;
      padding: 15px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      border-bottom: 2px solid #3b82f6;
    }

    .page2-name {
      font-size: 14.5px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .page2-title {
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 600;
    }

    /* INHALT */
    .page-content {
      padding: ${twoPage ? '26px 48px 18px' : '18px 42px 14px'};
      flex: 1;
      overflow: hidden;
    }

    /* ABSTÄNDE FÜR DIE EINZELSEITE (ONEPAGE) */
    .sheetOnePage .page-content .section-heading {
      margin-top: 0;
      margin-bottom: 9px;
    }

    .sheetOnePage .page-content .section-heading:first-child,
    .sheetOnePage .page-content .section-heading:first-of-type {
      margin-top: 0;
    }

    .sheetOnePage .page-content * + .section-heading {
      margin-top: 22px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: ${twoPage ? '20px' : '10px'};
      margin-bottom: ${twoPage ? '13px' : '8px'};
    }

    .section-heading:first-child {
      margin-top: 0;
    }

    .section-number {
      width: 25px;
      height: 25px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      background: #eff6ff !important;
      border: 1px solid #dbeafe;
      color: #1d4ed8;
      font-size: 10.5px;
      font-weight: 800;
    }

    .section-title {
      color: #0f233e;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
    }

    .section-divider {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #cbd8ea 0%, #f1f5f9 100%) !important;
    }

    /* KURZPROFIL CALLOUT */
    .profile-text {
      font-size: ${twoPage ? '11.8px' : '10.8px'};
      line-height: ${twoPage ? '1.65' : '1.5'};
      color: #475569;
      background: #f8fafd !important;
      border-left: 3px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      padding: ${twoPage ? '11px 15px' : '8px 12px'};
      margin-bottom: ${twoPage ? '14px' : '8px'};
    }

    /* TIMELINE */
    .timeline {
      padding-left: 20px;
      margin-left: 5px;
      border-left: 2px solid #dbe7f6;
    }

    .entry {
      position: relative;
      padding-bottom: ${twoPage ? '17px' : '14px'};
    }

    .entry:last-child {
      padding-bottom: 0;
    }

    .entry::before {
      content: "";
      position: absolute;
      left: -26px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff !important;
      border: 3px solid #2563eb !important;
      box-shadow: 0 0 0 3px #eff6ff;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .role {
      color: #0f172a;
      font-size: ${twoPage ? '13.2px' : '12px'};
      font-weight: 700;
      line-height: 1.35;
    }

    .date {
      flex-shrink: 0;
      color: #1d4ed8;
      background: #eff6ff !important;
      border: 1px solid #dbeafe;
      border-radius: 999px;
      padding: 2px 9px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .company {
      color: #3568b2;
      font-size: ${twoPage ? '11.5px' : '10.8px'};
      font-weight: 600;
      margin-top: 2px;
      margin-bottom: 5px;
    }

    .description {
      color: #475569;
      font-size: ${twoPage ? '11.3px' : '10.3px'};
      line-height: ${twoPage ? '1.6' : '1.46'};
    }

    /* SKILLS */
    .skills-box {
      display: flex;
      flex-wrap: wrap;
      gap: ${twoPage ? '8px' : '6px'};
      margin-top: 4px;
    }

    .skill-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f4f7fb !important;
      color: #1e3352;
      border: 1px solid #dce5f2;
      padding: ${twoPage ? '5px 12px' : '4px 9px'};
      border-radius: 7px;
      font-size: ${twoPage ? '10.8px' : '9.8px'};
      font-weight: 600;
    }

    .skill-tag::before {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #3b82f6 !important;
      flex-shrink: 0;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 10px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      background: #fafbfd !important;
      flex-shrink: 0;
    }

    /* VERSTECKTER QUELL-CONTAINER FÜR SEITENUMBRUCH */
    #cv-source {
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
      visibility: hidden;
      pointer-events: none;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        width: 210mm !important;
        height: auto !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #cv-source {
        display: none !important;
      }

      .sheet,
      .sheetOnePage {
        margin: 0 !important;
        box-shadow: none !important;
        width: 210mm !important;
        height: 295.5mm !important;
        max-height: 295.5mm !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      }

      .sheet:last-child,
      .sheetOnePage:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `;

  const profileSection = (num = '01') =>
    personal.summary
      ? `
        <div class="section-heading" data-block="profile-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Profil</div>
          <div class="section-divider"></div>
        </div>
        <p class="profile-text" data-block="profile-text">${formatText(personal.summary)}</p>
      `
      : '';

  const expSection = (num = '02') =>
    expArray.length > 0
      ? `
        <div class="section-heading" data-block="exp-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Berufserfahrung</div>
          <div class="section-divider"></div>
        </div>
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
        <div class="section-heading" data-block="edu-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Ausbildung</div>
          <div class="section-divider"></div>
        </div>
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
        <div class="section-heading" data-block="skills-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Kompetenzen</div>
          <div class="section-divider"></div>
        </div>
        <div class="skills-box" data-block="skills-box">
          ${skillsList
            .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
            .join('')}
        </div>
      `
      : '';

  // MEHRSEITIGER MODUS (verschiebt Sektionen komplett auf die nächste Seite, wenn sie nicht mehr ganz passen)
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
      <div class="eyebrow">Curriculum Vitae</div>
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

      // Hilfsfunktion: Verschiebt eine komplette Sektion auf die nächste Seite,
      // sobald sie nicht mehr vollständig auf die aktuelle Seite passt
      function placeWholeBlock(elements) {
        if (!elements || elements.length === 0) return;

        var hadContentBefore = currentMain.children.length > 0;

        for (var i = 0; i < elements.length; i++) {
          currentMain.appendChild(elements[i]);
        }

        if (overflows(currentMain) && hadContentBefore) {
          for (var j = 0; j < elements.length; j++) {
            currentMain.removeChild(elements[j]);
          }
          currentMain = createPage(pages.length);
          for (var k = 0; k < elements.length; k++) {
            currentMain.appendChild(elements[k]);
          }
        }
      }

      // 1. Profil
      var profHeading = source.querySelector('[data-block="profile-heading"]');
      var profText = source.querySelector('[data-block="profile-text"]');
      if (profHeading && profText) {
        placeWholeBlock([profHeading, profText]);
      }

      // 2. & 3. Timeline-Sektionen (Berufserfahrung & Ausbildung) als Ganzes platzieren
      function placeTimelineSection(headingSelector, entrySelector) {
        var heading = source.querySelector(headingSelector);
        var entries = Array.prototype.slice.call(source.querySelectorAll(entrySelector));
        if (!heading || entries.length === 0) return;

        var timeline = document.createElement('div');
        timeline.className = 'timeline';
        for (var i = 0; i < entries.length; i++) {
          timeline.appendChild(entries[i]);
        }

        // Kompletten Abschnitt inkl. aller Einträge prüfen & bei Überlauf ganz verschieben
        placeWholeBlock([heading, timeline]);

        // Fallback nur falls eine einzelne Sektion allein länger als eine ganze Seite ist
        if (overflows(currentMain) && timeline.children.length > 1) {
          var overflowEntries = [];
          while (timeline.children.length > 1 && overflows(currentMain)) {
            var last = timeline.lastElementChild;
            timeline.removeChild(last);
            overflowEntries.unshift(last);
          }

          for (var m = 0; m < overflowEntries.length; m++) {
            var entry = overflowEntries[m];
            if (m === 0) {
              currentMain = createPage(pages.length);
              timeline = document.createElement('div');
              timeline.className = 'timeline';
              currentMain.appendChild(timeline);
            }
            timeline.appendChild(entry);
            if (overflows(currentMain) && timeline.children.length > 1) {
              timeline.removeChild(entry);
              currentMain = createPage(pages.length);
              timeline = document.createElement('div');
              timeline.className = 'timeline';
              timeline.appendChild(entry);
              currentMain.appendChild(timeline);
            }
          }
        }
      }

      placeTimelineSection('[data-block="exp-heading"]', '[data-block="exp-entry"]');
      placeTimelineSection('[data-block="edu-heading"]', '[data-block="edu-entry"]');

      // 4. Kompetenzen
      var skillsHeading = source.querySelector('[data-block="skills-heading"]');
      var skillsBox = source.querySelector('[data-block="skills-box"]');
      if (skillsHeading && skillsBox) {
        placeWholeBlock([skillsHeading, skillsBox]);
      }

      // Seitenzahlen aktualisieren (z. B. SEITE 1 VON 2 oder SEITE 1 VON 3)
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

  // 1-PAGER
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

  <div class="sheetOnePage">
    <header class="header">
      <div class="eyebrow">Curriculum Vitae</div>
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

</body>
</html>
`;
}