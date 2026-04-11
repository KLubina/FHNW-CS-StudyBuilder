/**
 * LAYOUT - Layout-Rendering für Jahre und Semester
 */

window.StudienplanLayout = {
  // Rendere das gesamte Studienplan-Layout
  renderLayout(groupedModules) {
    const container = document.getElementById("studienplan");
    if (!container) return;

    const years = Object.keys(groupedModules).sort((a, b) => a - b);
    const layoutHTML =
      years
        .map((year) => this.renderYear(year, groupedModules[year]))
        .join("") + this.renderWahlmoduleSections();

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

  renderWahlmoduleSection(section) {
    const title = section.title || section.category || "Wahlmodule";
    const category = section.category || title;
    const source = section.source || "wahlmodule-data.js";
    const className = section.className || "Ergänzungen";
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

    if (
      Array.isArray(section.fixedModules) &&
      section.fixedModules.length > 0
    ) {
      const fixedModulesHtml = section.fixedModules
        .map((module) =>
          window.StudienplanModule.renderModule({
            ...module,
            standardcategory: className,
          }),
        )
        .join("");

      return `
            <div class="wahlmodule-section" data-wahlmodul-category="${escapeHtml(category)}">
                <div class="wahlmodule-section-header">
                    <div class="wahlmodule-section-title">${escapeHtml(title)}</div>
                </div>
                <div class="wahlmodule-section-block">
                    <div class="wahlmodule-fixed-grid">
                        ${fixedModulesHtml}
                    </div>
                </div>
            </div>
        `;
    }

    return `
            <div class="wahlmodule-section" data-wahlmodul-category="${escapeHtml(category)}">
                <div class="wahlmodule-section-header">
                    <div class="wahlmodule-section-title">${escapeHtml(title)}</div>
                </div>
                <div class="wahlmodule-section-block">
                    ${window.StudienplanModule.renderModule(placeholderModule)}
                </div>
            </div>
        `;
  },

  // Rendere ein Jahr
  renderYear(year, semesters) {
    const semesterKeys = Object.keys(semesters).sort((a, b) => a - b);
    const yearHTML = semesterKeys
      .map((semester) =>
        this.renderSemester(year, semester, semesters[semester]),
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
                <h4 class="semester-title">${semesterName}</h4>
                <div class="module-container">
                    ${modulesHTML}
                </div>
            </div>
        `;
  },
};

// Markiere als geladen
window.subModulesReady.layout = Promise.resolve();
