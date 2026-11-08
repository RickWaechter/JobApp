export const modernBlue = (
  twoPage,
  safeName,
  personal = {},
  eduArray = [],
  expArray = [],
  skillsArray = []
) => {
  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const formatText = (value) =>
    escapeHtml(value).replace(/\n/g, '<br>');

  const skillsList = (Array.isArray(skillsArray)
    ? skillsArray
    : String(skillsArray || '').split(',')
  )
    .map((s) => String(s).trim())
    .filter(Boolean);

  const experiences = Array.isArray(expArray) ? expArray : [];
  const educations = Array.isArray(eduArray) ? eduArray : [];

  const contactItems = [
    personal.email && { icon: '✉', value: personal.email },
    personal.phone && { icon: '☎', value: personal.phone },
    personal.location && { icon: '⌖', value: personal.location },
  ].filter(Boolean);

  const displayName = escapeHtml(safeName || personal.name || 'Vor- und Nachname');
  const jobTitle = escapeHtml(personal.title || 'Berufsbezeichnung');

  // Gemeinsames CSS
  const styles = `
    * {
      box-sizing: border-box;
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
      height: 297mm;
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
    }

    .sheet:last-child {
      margin-bottom: 0;
    }

    /* HEADER SEITE 1 */
    .header {
      position: relative;
      background: #142b4a;
      color: #ffffff;
      padding: ${twoPage ? '34px 45px 28px' : '26px 40px 20px'};
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
      background: #5597f2;
      border-radius: 5px;
      margin: ${twoPage ? '14px 0 12px' : '10px 0 10px'};
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

    /* HEADER SEITE 2 (Kompakt) */
    .header-page2 {
      background: #142b4a;
      color: #ffffff;
      padding: 18px 45px;
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
      padding: ${twoPage ? '28px 45px 20px' : '18px 40px 14px'};
      flex: 1;
      overflow: hidden;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: ${twoPage ? '16px' : '10px'};
      margin-bottom: ${twoPage ? '14px' : '8px'};
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
      background: #edf4ff;
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
      background: #e8edf3;
    }

    .profile-text {
      font-size: ${twoPage ? '12.5px' : '11.5px'};
      line-height: ${twoPage ? '1.7' : '1.55'};
      color: #536176;
      margin-bottom: ${twoPage ? '18px' : '10px'};
    }

    /* TIMELINE */
    .timeline {
      padding-left: 18px;
      margin-left: 4px;
      border-left: 2px solid #e8eef6;
    }

    .entry {
      position: relative;
      padding-bottom: ${twoPage ? '18px' : '11px'};
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
      background: #ffffff;
      border: 3px solid #4285d4;
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
      background: #edf4ff;
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
      line-height: ${twoPage ? '1.65' : '1.5'};
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
      background: #f3f6fa;
      color: #344761;
      border: 1px solid #e4eaf1;
      padding: ${twoPage ? '6px 12px' : '4px 9px'};
      border-radius: 5px;
      font-size: ${twoPage ? '11px' : '10px'};
      font-weight: 650;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid #edf0f5;
      padding: 12px 45px;
      display: flex;
      justify-content: space-between;
      color: #a0aabb;
      font-size: 9px;
      letter-spacing: 0.5px;
      background: #ffffff;
      flex-shrink: 0;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .sheet {
        box-shadow: none;
        margin: 0;
        width: 100%;
      }
    }
  `;

  // HTML für die einzelnen Sektionen
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
    experiences.length > 0
    console.log('aaa', experiences)

      ? `
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Berufserfahrung</div>
          <div class="section-divider"></div>
        </div>
        <div class="timeline">
          ${experiences
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
    educations.length > 0
      ? `
        <div class="section-heading">
          <div class="section-number">${num}</div>
          <div class="section-title">Ausbildung</div>
          <div class="section-divider"></div>
        </div>
        <div class="timeline">
          ${educations
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

  // -------------------------------------------------------------
  // FALL 1: ZWEI-PAGER (twoPage === true)
  // -------------------------------------------------------------
  if (twoPage) {
    return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Lebenslauf - ${displayName}</title>
<style>${styles}</style>
</head>
<body>

  <!-- SEITE 1: Profil & Berufserfahrung -->
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

  <!-- SEITE 2: Ausbildung & Kompetenzen -->
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

  // -------------------------------------------------------------
  // FALL 2: EIN-SEITER (twoPage === false)
  // -------------------------------------------------------------
  return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Lebenslauf - ${displayName}</title>
<style>${styles}</style>
</head>
<body>

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
};