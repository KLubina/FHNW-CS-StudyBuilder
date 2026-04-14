/**
 * LAYOUT - Layout-Rendering für Jahre und Semester
 */

window.StudienplanLayout = {
  // Rendere das gesamte Studienplan-Layout
  renderLayout(groupedModules) {
    const container = document.getElementById("studienplan");
    if (!container) return;

    const years = Array.from({ length: 6 }, (_, index) => index + 1);
    const layoutHTML =
      `
        <div class="studienplan-hauptbereich">
          ${years.map((year) => this.renderYear(year, groupedModules[year] || {})).join("")}
        </div>
      ` +
      this.renderAssessmentSection() +
      this.renderProjectSection() +
      this.renderWahlmoduleSections() +
      this.renderVertiefungenSections() +
      this.renderContextSections();

    container.innerHTML = layoutHTML;
  },

  // Rendere Wahlmodul-Kategorien unter dem regulären zweiten Semester
  renderWahlmoduleSections() {
    const sections =
      window.FHNWCSAssessmentWahlmoduleSections ||
      window.StudiengangWahlmoduleSections ||
      [];
    if (!Array.isArray(sections) || sections.length === 0) return "";

    const blocks = sections
      .map((section) => this.renderWahlmoduleSection(section))
      .join("");

    return `
            <div class="wahlmodule-bereich">
                <h3 class="wahlmodule-title">Wahlmodule</h3>
                <div class="wahlmodule-sections">
                    ${blocks}
                </div>
            </div>
        `;
  },

  renderProjectSection() {
    const modules =
      window.FHNWCSAssessmentProjectModules ||
      window.StudiengangProjectModules ||
      [];
    if (!Array.isArray(modules) || modules.length === 0) return "";

    const moduleRow = window.StudienplanModule.renderSemesterModules(modules);

    return `
            <div class="projekte-bereich">
                <h3 class="projekte-title">Projekte</h3>
                <div class="projekte-module-row">
                    ${moduleRow}
                </div>
            </div>
        `;
  },

  renderAssessmentSection() {
    const modules =
      window.FHNWCSAssessmentAssessmentModules ||
      window.StudiengangAssessmentModules ||
      (Array.isArray(window.StudiengangModules)
        ? window.StudiengangModules.filter((m) => m && m.isAssessment)
        : []);

    if (!Array.isArray(modules) || modules.length === 0) return "";

    const moduleRow = window.StudienplanModule.renderSemesterModules(modules);

    return `
            <div class="assessments-bereich">
                <h3 class="assessments-title">Assessment-Module</h3>
                <div class="assessments-module-row">
                    ${moduleRow}
                </div>
            </div>
        `;
  },

  renderVertiefungenSections() {
    const sections =
      window.FHNWCSAssessmentVertiefungenSections ||
      window.StudiengangVertiefungenSections ||
      [];
    if (!Array.isArray(sections) || sections.length === 0) return "";

    const blocks = sections
      .map((section) => this.renderWahlmoduleSection(section))
      .join("");

    return `
            <div class="vertiefungen-bereich">
                <h3 class="vertiefungen-title">Vertiefungen und Fachergänzungen</h3>
                <div class="vertiefungen-sections">
                    ${blocks}
                </div>
            </div>
        `;
  },

  renderContextSections() {
    const sections =
      window.FHNWCSAssessmentContextSections ||
      window.StudiengangContextSections ||
      [];
    if (!Array.isArray(sections) || sections.length === 0) return "";

    const blocks = sections
      .map((section) => this.renderContextSection(section))
      .join("");

    return `
            <div class="kontext-bereich">
                <h3 class="kontext-title">Kontext</h3>
                <div class="kontext-sections">
                    ${blocks}
                </div>
            </div>
        `;
  },

  renderContextSection(section) {
    const title = section.title || section.category || "Kontext";
    const category = section.category || title;
    const source = section.source || "context-modules-data.js";
    const className = section.className || "kontext";
    const minEcts = Number(section.minEcts || 0);
    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const placeholderModule = {
      name: title,
      ects: 0,
      standardcategory: className,
      isPlaceholder: true,
      wahlmodulSource: source,
      wahlmodulCategory: category,
    };

    return `
            <div class="kontext-section" data-wahlmodul-category="${escapeHtml(category)}">
                <div class="kontext-section-header">
                    <div class="kontext-section-title">${escapeHtml(title)}</div>
                    <div class="kontext-section-meta">mind. ${minEcts} ECTS</div>
                </div>
                <div class="kontext-section-block">
                    ${window.StudienplanModule.renderModule(placeholderModule)}
                </div>
            </div>
        `;
  },

  renderWahlmoduleSection(section) {
    const title = section.title || section.category || "Wahlmodule";
    const category = section.category || title;
    const source = section.source || "wahlmodule-data.js";
    const className = section.className || "Ergänzungen";
    const minEcts = Number(section.minEcts || 0);
    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const placeholderModule = {
      name: title,
      ects: 0,
      standardcategory: className,
      isPlaceholder: true,
      wahlmodulSource: source,
      wahlmodulCategory: category,
    };

    return `
            <div class="wahlmodule-section" data-wahlmodul-category="${escapeHtml(category)}">
                <div class="wahlmodule-section-header">
                    <div class="wahlmodule-section-title">${escapeHtml(title)}</div>
            <div class="wahlmodule-section-meta">mind. ${minEcts} ECTS</div>
                </div>
                <div class="wahlmodule-section-block">
                    ${window.StudienplanModule.renderModule(placeholderModule)}
                </div>
            </div>
        `;
  },

  // Rendere ein Jahr
  renderYear(year, semesters) {
    const semesterKeys = [1, 2];
    const yearHTML = semesterKeys
      .map((semester) =>
        this.renderSemester(year, semester, semesters[semester] || []),
      )
      .join("");

    return `
            <div class="jahr" data-year="${year}">
                <h3 class="year-title">${year}. Jahr</h3>
                ${yearHTML}
            </div>
        `;
  },

  // Rendere ein Semester
  renderSemester(year, semester, modules) {
    const semesterName =
      semester % 2 === 1 ? "Herbstsemester" : "Frühlingssemester";
    const modulesHTML = window.StudienplanModule.renderSemesterModules(modules);

    return `
            <div class="semester" data-year="${year}" data-semester="${semester}">
          <div class="semester-title-row">
            <h4 class="semester-title">${semesterName}</h4>
            <span class="semester-ects-counter">0 ECTS</span>
          </div>
                <div class="module-container">
                    ${modulesHTML}
                </div>
            </div>
        `;
  },
};
