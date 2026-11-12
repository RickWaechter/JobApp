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
      color: #253047;
      line-height: 1.5;
      padding: 20px 0 60px 0;
      -webkit-font-smoothing: antialiased;
    }

    .sheet {
      width: 210mm;
      height: 295.5mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.4);
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
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.4);
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

    .sheet:last-child {
      margin-bottom: 0;
      page-break-after: auto !important;
      break-after: auto !important;
    }

    /* BLAUER HEADER */
    .header {
      position: relative;
      background: #142b4a !important;
      color: #ffffff;
      padding: ${twoPage ? '32px 45px 26px' : '24px 40px 18px'};
      overflow: hidden;
      flex-shrink: 0;
    }

    .header::after {
      content: "";
      position: absolute;
      width: 260px;
      height: 260px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      right: -70px;
      top: -120px;
      box-shadow:
        0 0 0 25px rgba(255, 255, 255, 0.025),
        0 0 0 50px rgba(255, 255, 255, 0.025);
    }

    .eyebrow {
      color: #8db9f5;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    h1 {
      font-size: ${twoPage ? '30px' : '26px'};
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      overflow-wrap: anywhere;
    }

    .job-title {
      color: #a9c8f4;
      font-size: ${twoPage ? '15px' : '13.5px'};
      font-weight: 500;
      margin-top: 4px;
    }

    .header-line {
      width: 45px;
      height: 3px;
      background: #5597f2 !important;
      border-radius: 5px;
      margin: ${twoPage ? '12px 0 10px' : '9px 0 9px'};
    }

    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 24px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #d4deec;
      font-size: ${twoPage ? '11px' : '10.5px'};
    }

    .contact-icon {
      color: #8db9f5;
      font-size: 13px;
    }

    /* HEADER SEITE 2 */
    .header-page2 {
      background: #142b4a !important;
      color: #ffffff;
      padding: 16px 45px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .page2-name {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .page2-title {
      color: #8db9f5;
      font-size: 11.5px;
      font-weight: 600;
    }

    /* INHALT */
    .page-content {
      padding: ${twoPage ? '24px 45px 16px' : '16px 40px 12px'};
      flex: 1;
      overflow: hidden;
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

    /* Abstand vor jedem folgenden Abschnitt (Profil -> Berufserfahrung -> Ausbildung -> Skills) */
    .sheetOnePage .page-content * + .section-heading {
      margin-top: 30px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: ${twoPage ? '14px' : '8px'};
      margin-bottom: ${twoPage ? '12px' : '6px'};
    }

    .section-heading:first-child {
      margin-top: 0;
    }

    .section-number {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      background: #edf4ff !important;
      color: #2867bd;
      font-size: 11px;
      font-weight: 800;
    }

    .section-title {
      color: #142b4a;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }

    .section-divider {
      flex: 1;
      height: 1px;
      background: #e8edf3 !important;
    }

    .profile-text {
      font-size: ${twoPage ? '12px' : '11px'};
      line-height: ${twoPage ? '1.65' : '1.5'};
      color: #536176;
      margin-bottom: ${twoPage ? '14px' : '8px'};
    }

    /* TIMELINE */
    .timeline {
      padding-left: 18px;
      margin-left: 4px;
      border-left: 2px solid #e8eef6;
    }

    .entry {
      position: relative;
      padding-bottom: ${twoPage ? '16px' : '20px'};
    }

    .entry:last-child {
      padding-bottom: 0;
    }

    .entry::before {
      content: "";
      position: absolute;
      left: -24px;
      top: 5px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff !important;
      border: 3px solid #4285d4 !important;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .role {
      color: #253752;
      font-size: ${twoPage ? '13px' : '12px'};
      font-weight: 750;
      line-height: 1.35;
    }

    .date {
      flex-shrink: 0;
      color: #477fc0;
      background: #edf4ff !important;
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 700;
    }

    .company {
      color: #477fc0;
      font-size: ${twoPage ? '11.5px' : '11px'};
      font-weight: 650;
      margin-top: 2px;
      margin-bottom: 4px;
    }

    .description {
      color: #647187;
      font-size: ${twoPage ? '11.5px' : '10.5px'};
      line-height: ${twoPage ? '1.6' : '1.45'};
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
      background: #f3f6fa !important;
      color: #344761;
      border: 1px solid #e4eaf1;
      padding: ${twoPage ? '5px 11px' : '4px 8px'};
      border-radius: 5px;
      font-size: ${twoPage ? '11px' : '10px'};
      font-weight: 650;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid #edf0f5;
      padding: 10px 45px;
      display: flex;
      justify-content: space-between;
      color: #a0aabb;
      font-size: 9px;
      letter-spacing: 0.5px;
      background: #ffffff !important;
      flex-shrink: 0;
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
        height: 297mm !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .sheet {
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

      .sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `;

  const profileSection = (num = '01') =>
    personal.summary
      ? `
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Profil</div>
          <div class="section-divider"></div>
        </div>
        <p class="profile-text">${formatText(personal.summary)}</p>
      `
      : '';

  const expSection = (num = '02') =>
    expArray.length > 0
      ? `
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Berufserfahrung</div>
          <div class="section-divider"></div>
        </div>
        <div class="timeline">
          ${expArray
            .map(
              (exp) => `
            <div class="entry">
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
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Ausbildung</div>
          <div class="section-divider"></div>
        </div>
        <div class="timeline">
          ${eduArray
            .map(
              (edu) => `
            <div class="entry">
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
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Kompetenzen</div>
          <div class="section-divider"></div>
        </div>
        <div class="skills-box">
          ${skillsList
            .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
            .join('')}
        </div>
      `
      : '';

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

  <!-- SEITE 1 -->
  <div class="sheet">
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
    </main>

    <footer class="footer">
      <span>LEBENSLAUF — SEITE 1 VON 2</span>
      <span>${displayName}</span>
    </footer>
  </div>

  <!-- SEITE 2 -->
  <div class="sheet">
    <div class="header-page2">
      <span class="page2-name">${displayName}</span>
      <span class="page2-title">${jobTitle}</span>
    </div>

    <main class="page-content">
      ${eduSection('03')}
      ${skillsSection('04')}
    </main>

    <footer class="footer">
      <span>LEBENSLAUF — SEITE 2 VON 2</span>
      <span>${displayName}</span>
    </footer>
  </div>

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