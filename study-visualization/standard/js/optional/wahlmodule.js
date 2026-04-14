/**
 * WAHLMODULE - Optionale Wahlmodule-Verwaltung
 */

window.StudienplanWahlmodule = {
  loadedSources: {}, // Cache für geladene Modul-Daten

  getCurrentStudiengang() {
    return (
      document.body.getAttribute("data-studiengang") ||
      new URLSearchParams(window.location.search).get("studiengang") ||
      "fhnw-cs-assessment"
    );
  },

  getStorageKey(source, category = "") {
    return [
      "studienplan",
      this.getCurrentStudiengang(),
      "wahlmodule",
      source,
      category || "all",
    ]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(":");
  },

  loadPersistedSelection(source, category = "") {
    try {
      const raw = window.localStorage.getItem(
        this.getStorageKey(source, category),
      );
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return this.normalizeAssignments(parsed);
    } catch (error) {
      return [];
    }
  },

  savePersistedSelection(source, category, selectedModules) {
    try {
      window.localStorage.setItem(
        this.getStorageKey(source, category),
        JSON.stringify(selectedModules),
      );
    } catch (error) {
      console.warn("Konnte Wahlmodule nicht lokal speichern:", error);
    }
  },

  getProjectStorageKey() {
    return [
      "studienplan",
      this.getCurrentStudiengang(),
      "projects",
      "assignments",
    ]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(":");
  },

  loadPersistedProjectAssignments() {
    try {
      const raw = window.localStorage.getItem(this.getProjectStorageKey());
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};

      const normalized = {};
      Object.keys(parsed).forEach((projectName) => {
        normalized[projectName] = this.normalizeSemester(parsed[projectName]);
      });

      return normalized;
    } catch (error) {
      return {};
    }
  },

  savePersistedProjectAssignments(assignments) {
    try {
      window.localStorage.setItem(
        this.getProjectStorageKey(),
        JSON.stringify(assignments || {}),
      );
    } catch (error) {
      console.warn("Konnte Projektzuweisungen nicht speichern:", error);
    }
  },

  getProjectModules() {
    return (
      window.FHNWCSAssessmentProjectModules ||
      window.StudiengangProjectModules ||
      []
    );
  },

  renderProjectAssignmentCard(module, assignedSemester) {
    const moduleForRender = {
      ...module,
      standardcategory: this.resolveCategoryClass(module.standardcategory),
    };
    const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);
    const selectId = `project-semester-${this.escapeHtml(module.name)}`;
    const semesterLabel =
      assignedSemester == null
        ? "Noch nicht zugewiesen"
        : `Semester ${assignedSemester}`;
    const semesterOptions = Array.from({ length: 12 }, (_, index) => {
      const semesterNumber = index + 1;
      const selectedAttr =
        assignedSemester === semesterNumber ? "selected" : "";
      return `<option value="${semesterNumber}" ${selectedAttr}>Semester ${semesterNumber}</option>`;
    }).join("");

    return `
      <div class="projekt-assignment-card" data-project-name="${this.escapeHtml(module.name)}">
        ${moduleHTML}
        <div class="projekt-assignment-actions">
          <div class="projekt-assignment-semester">${this.escapeHtml(semesterLabel)}</div>
          <div class="projekt-semester-select-wrapper">
            <label class="projekt-semester-select-label" for="${selectId}">Semester zuweisen</label>
            <select
              id="${selectId}"
              class="projekt-semester-select"
              data-action="assign-project-semester"
              data-project-name="${this.escapeHtml(module.name)}"
            >
              <option value="">Nicht zugewiesen</option>
              ${semesterOptions}
            </select>
          </div>
        </div>
      </div>
    `;
  },

  refreshProjectAssignmentsPanel() {
    const projectRow = document.querySelector(".projekte-module-row");
    if (!projectRow) return;

    const projectModules = this.getProjectModules();
    if (!Array.isArray(projectModules) || projectModules.length === 0) {
      projectRow.innerHTML = "";
      return;
    }

    const projectAssignments = this.loadPersistedProjectAssignments();
    projectRow.innerHTML = projectModules
      .map((module) =>
        this.renderProjectAssignmentCard(
          module,
          this.normalizeSemester(projectAssignments[module.name]),
        ),
      )
      .join("");
  },

  updateProjectAssignment(projectName, semester) {
    const assignments = this.loadPersistedProjectAssignments();
    assignments[projectName] = this.normalizeSemester(semester);
    this.savePersistedProjectAssignments(assignments);
    this.refreshWahlmoduleViews();
  },

  /* Assessment assignment support (ähnlich wie Projekte) */
  getAssessmentStorageKey() {
    return [
      "studienplan",
      this.getCurrentStudiengang(),
      "assessments",
      "assignments",
    ]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(":");
  },

  loadPersistedAssessmentAssignments() {
    try {
      const raw = window.localStorage.getItem(this.getAssessmentStorageKey());
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};

      const normalized = {};
      Object.keys(parsed).forEach((name) => {
        normalized[name] = this.normalizeSemester(parsed[name]);
      });

      return normalized;
    } catch (error) {
      return {};
    }
  },

  savePersistedAssessmentAssignments(assignments) {
    try {
      window.localStorage.setItem(
        this.getAssessmentStorageKey(),
        JSON.stringify(assignments || {}),
      );
    } catch (error) {
      console.warn("Konnte Assessment-Zuweisungen nicht speichern:", error);
    }
  },

  getAssessmentModules() {
    return (
      window.FHNWCSAssessmentAssessmentModules ||
      window.StudiengangAssessmentModules ||
      (Array.isArray(window.StudiengangModules)
        ? window.StudiengangModules.filter((m) => m && m.isAssessment)
        : [])
    );
  },

  renderAssessmentAssignmentCard(module, assignedSemester) {
    const moduleForRender = {
      ...module,
      standardcategory: this.resolveCategoryClass(module.standardcategory),
    };
    const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);
    const selectId = `assessment-semester-${this.escapeHtml(module.name)}`;
    const semesterLabel =
      assignedSemester == null
        ? "Noch nicht zugewiesen"
        : `Semester ${assignedSemester}`;
    const semesterOptions = Array.from({ length: 12 }, (_, index) => {
      const semesterNumber = index + 1;
      const selectedAttr =
        assignedSemester === semesterNumber ? "selected" : "";
      return `<option value="${semesterNumber}" ${selectedAttr}>Semester ${semesterNumber}</option>`;
    }).join("");

    return `
      <div class="assessment-assignment-card" data-assessment-name="${this.escapeHtml(module.name)}">
        ${moduleHTML}
        <div class="assessment-assignment-actions">
          <div class="assessment-assignment-semester">${this.escapeHtml(semesterLabel)}</div>
          <div class="assessment-semester-select-wrapper">
            <label class="assessment-semester-select-label" for="${selectId}">Semester zuweisen</label>
            <select
              id="${selectId}"
              class="assessment-semester-select"
              data-action="assign-assessment-semester"
              data-assessment-name="${this.escapeHtml(module.name)}"
            >
              <option value="">Nicht zugewiesen</option>
              ${semesterOptions}
            </select>
          </div>
        </div>
      </div>
    `;
  },

  refreshAssessmentAssignmentsPanel() {
    const assessmentRow = document.querySelector(".assessments-module-row");
    if (!assessmentRow) return;

    const assessmentModules = this.getAssessmentModules();
    if (!Array.isArray(assessmentModules) || assessmentModules.length === 0) {
      assessmentRow.innerHTML = "";
      return;
    }

    const assessmentAssignments = this.loadPersistedAssessmentAssignments();
    assessmentRow.innerHTML = assessmentModules
      .map((module) =>
        this.renderAssessmentAssignmentCard(
          module,
          this.normalizeSemester(assessmentAssignments[module.name]),
        ),
      )
      .join("");
  },

  updateAssessmentAssignment(assessmentName, semester) {
    const assignments = this.loadPersistedAssessmentAssignments();
    assignments[assessmentName] = this.normalizeSemester(semester);
    this.savePersistedAssessmentAssignments(assignments);
    this.refreshWahlmoduleViews();
  },

  createAssignmentId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  normalizeSemester(semester) {
    const numberValue = Number(semester);
    if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 12) {
      return null;
    }

    return numberValue;
  },

  getModuleIdentity(module) {
    const identityParts = [
      module?.name,
      module?.ects,
      module?.standardcategory,
      module?.subcategory,
    ];

    return identityParts
      .map((part) =>
        String(part ?? "")
          .trim()
          .toLowerCase(),
      )
      .join("|");
  },

  normalizeAssignment(entry) {
    if (!entry) return null;

    const module = entry.module || entry;
    if (!module || !module.name) return null;

    return {
      id: entry.id || this.createAssignmentId(),
      semester: this.normalizeSemester(entry.semester),
      module: { ...module },
    };
  },

  normalizeAssignments(entries) {
    if (!Array.isArray(entries)) return [];

    return entries
      .map((entry) => this.normalizeAssignment(entry))
      .filter(Boolean);
  },

  mergeAssignments(existingAssignments, selectedModules) {
    const existingMap = new Map(
      existingAssignments.map((assignment) => [
        this.getModuleIdentity(assignment.module),
        assignment,
      ]),
    );

    return selectedModules
      .map((moduleEntry) => {
        const module = moduleEntry?.module || moduleEntry;
        if (!module) return null;

        const existingAssignment = existingMap.get(
          this.getModuleIdentity(module),
        );

        return {
          id:
            moduleEntry?.id ||
            existingAssignment?.id ||
            this.createAssignmentId(),
          semester: this.normalizeSemester(
            moduleEntry?.semester ?? existingAssignment?.semester,
          ),
          module: { ...module },
        };
      })
      .filter(Boolean);
  },

  getPersistedAssignments(source, category = "") {
    return this.normalizeAssignments(
      this.loadPersistedSelection(source, category),
    );
  },

  renderSelectedModulesPanel(placeholderElement, assignments) {
    const source = placeholderElement.getAttribute("data-wahlmodul-source");
    const category =
      placeholderElement.getAttribute("data-wahlmodul-category") || "";
    let selectedContainer = placeholderElement.nextElementSibling;
    if (
      !selectedContainer ||
      !selectedContainer.classList.contains("wahlmodul-selected-container")
    ) {
      selectedContainer = document.createElement("div");
      selectedContainer.className = "wahlmodul-selected-container";
      placeholderElement.parentElement.insertBefore(
        selectedContainer,
        placeholderElement.nextElementSibling,
      );
    }

    selectedContainer.innerHTML = "";

    if (assignments.length === 0) {
      selectedContainer.innerHTML = `
        <div class="wahlmodul-selected-empty">
          Noch keine Wahlmodule ausgewählt.
        </div>
      `;
      return;
    }

    assignments.forEach((assignment) => {
      const card = this.renderAssignmentCard(
        assignment,
        "selection",
        source,
        category,
      );
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = card;
      const moduleElement = tempDiv.querySelector(".modul");
      if (moduleElement) {
        moduleElement.classList.add("module-kp-exempt");
      }
      selectedContainer.appendChild(tempDiv.firstElementChild);
    });
  },

  renderAssignmentCard(
    assignment,
    mode = "selection",
    source = "",
    category = "",
  ) {
    const moduleForRender = {
      ...assignment.module,
      standardcategory: this.resolveCategoryClass(
        assignment.module.standardcategory,
      ),
    };
    const semesterLabel =
      assignment.semester == null
        ? "Noch nicht zugewiesen"
        : `Semester ${assignment.semester}`;
    const selectId = `semester-select-${assignment.id}`;
    const semesterOptions = Array.from({ length: 12 }, (_, index) => {
      const semesterNumber = index + 1;
      const selectedAttr =
        assignment.semester === semesterNumber ? "selected" : "";
      return `<option value="${semesterNumber}" ${selectedAttr}>Semester ${semesterNumber}</option>`;
    }).join("");

    const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);

    return `
      <div class="wahlmodul-assignment-card ${mode === "plan" ? "is-plan-card" : "is-selection-card"}" data-assignment-id="${this.escapeHtml(assignment.id)}" data-assignment-semester="${assignment.semester == null ? "" : assignment.semester}" data-wahlmodul-source="${this.escapeHtml(source)}" data-wahlmodul-category="${this.escapeHtml(category)}">
        ${moduleHTML}
        <div class="wahlmodul-assignment-actions">
          <div class="wahlmodul-assignment-semester">${this.escapeHtml(semesterLabel)}</div>
          <div class="wahlmodul-semester-select-wrapper">
            <label class="wahlmodul-semester-select-label" for="${this.escapeHtml(selectId)}">Semester zuweisen</label>
            <select
              id="${this.escapeHtml(selectId)}"
              class="wahlmodul-semester-select"
              data-action="assign-semester-select"
            >
              <option value="">Nicht zugewiesen</option>
              ${semesterOptions}
            </select>
          </div>
          <div class="wahlmodul-assignment-buttons">
            <button type="button" class="wahlmodul-assignment-button is-secondary" data-action="remove-assignment">Entfernen</button>
          </div>
        </div>
      </div>
    `;
  },

  refreshWahlmoduleViews() {
    const placeholders = document.querySelectorAll(
      ".modul[data-wahlmodul-source]",
    );

    placeholders.forEach((placeholderElement) => {
      const source = placeholderElement.getAttribute("data-wahlmodul-source");
      const category =
        placeholderElement.getAttribute("data-wahlmodul-category") || "";
      const assignments = this.getPersistedAssignments(source, category);

      placeholderElement.dataset.selectedModules = JSON.stringify(assignments);
      this.renderSelectedModulesPanel(placeholderElement, assignments);
    });

    this.refreshAssessmentAssignmentsPanel();
    this.refreshProjectAssignmentsPanel();

    this.renderStudyPlanAssignments();
    this.syncPlanVisibility();

    if (window.StudienplanKPCounter) {
      window.StudienplanKPCounter.updateCounter();
    }
  },

  syncPlanVisibility() {
    const yearElements = document.querySelectorAll(".jahr");

    yearElements.forEach((yearElement) => {
      const semesterElements = yearElement.querySelectorAll(".semester");

      semesterElements.forEach((semesterElement) => {
        const moduleContainer =
          semesterElement.querySelector(".module-container");
        const hasModules = !!moduleContainer?.querySelector(".modul");
        semesterElement.classList.toggle("is-empty-semester", !hasModules);
      });

      const hasVisibleSemester = Array.from(semesterElements).some(
        (semesterElement) =>
          !semesterElement.classList.contains("is-empty-semester"),
      );
      yearElement.classList.toggle("is-empty-year", !hasVisibleSemester);
    });
  },

  renderStudyPlanAssignments() {
    document
      .querySelectorAll(".module-container .studyplan-assigned-module")
      .forEach((moduleElement) => moduleElement.remove());

    const placeholders = document.querySelectorAll(
      ".modul[data-wahlmodul-source]",
    );

    placeholders.forEach((placeholderElement) => {
      const source = placeholderElement.getAttribute("data-wahlmodul-source");
      const category =
        placeholderElement.getAttribute("data-wahlmodul-category") || "";
      const assignments = this.getPersistedAssignments(source, category);

      assignments.forEach((assignment) => {
        if (!assignment.semester) return;
        const year = Math.ceil(assignment.semester / 2);
        const semesterInYear = assignment.semester % 2 === 1 ? 1 : 2;
        const semesterContainer = document.querySelector(
          `.semester[data-year="${year}"][data-semester="${semesterInYear}"] .module-container`,
        );

        if (!semesterContainer) return;

        const moduleForRender = {
          ...assignment.module,
          standardcategory: this.resolveCategoryClass(
            assignment.module.standardcategory,
          ),
        };

        const moduleHTML =
          window.StudienplanModule.renderModule(moduleForRender);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = moduleHTML;
        const moduleElement = tempDiv.firstElementChild;
        if (!moduleElement) return;

        moduleElement.classList.add("studyplan-assigned-module");
        semesterContainer.appendChild(moduleElement);
      });
    });

    const projectAssignments = this.loadPersistedProjectAssignments();
    this.getProjectModules().forEach((projectModule) => {
      const assignedSemester = this.normalizeSemester(
        projectAssignments[projectModule.name],
      );
      if (!assignedSemester) return;

      const year = Math.ceil(assignedSemester / 2);
      const semesterInYear = assignedSemester % 2 === 1 ? 1 : 2;
      const semesterContainer = document.querySelector(
        `.semester[data-year="${year}"][data-semester="${semesterInYear}"] .module-container`,
      );
      if (!semesterContainer) return;

      const moduleForRender = {
        ...projectModule,
        standardcategory: this.resolveCategoryClass(
          projectModule.standardcategory,
        ),
      };
      const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = moduleHTML;
      const moduleElement = tempDiv.firstElementChild;
      if (!moduleElement) return;

      moduleElement.classList.add(
        "studyplan-assigned-module",
        "project-assigned-module",
      );
      semesterContainer.appendChild(moduleElement);
    });

    // Assessment-Module einfügen (falls zugewiesen)
    const assessmentAssignments = this.loadPersistedAssessmentAssignments();
    this.getAssessmentModules().forEach((assessmentModule) => {
      const assignedSemester = this.normalizeSemester(
        assessmentAssignments[assessmentModule.name],
      );
      if (!assignedSemester) return;

      const year = Math.ceil(assignedSemester / 2);
      const semesterInYear = assignedSemester % 2 === 1 ? 1 : 2;
      const semesterContainer = document.querySelector(
        `.semester[data-year="${year}"][data-semester="${semesterInYear}"] .module-container`,
      );
      if (!semesterContainer) return;

      const moduleForRender = {
        ...assessmentModule,
        standardcategory: this.resolveCategoryClass(
          assessmentModule.standardcategory,
        ),
      };
      const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = moduleHTML;
      const moduleElement = tempDiv.firstElementChild;
      if (!moduleElement) return;

      moduleElement.classList.add(
        "studyplan-assigned-module",
        "assessment-assigned-module",
      );
      semesterContainer.appendChild(moduleElement);
    });
  },

  findAssignment(source, category, assignmentId) {
    const assignments = this.getPersistedAssignments(source, category);
    return (
      assignments.find((assignment) => assignment.id === assignmentId) || null
    );
  },

  updateAssignmentSemester(source, category, assignmentId, semester) {
    const assignments = this.getPersistedAssignments(source, category);
    const updatedAssignments = assignments.map((assignment) =>
      assignment.id === assignmentId
        ? { ...assignment, semester: this.normalizeSemester(semester) }
        : assignment,
    );

    this.savePersistedSelection(source, category, updatedAssignments);
    this.refreshWahlmoduleViews();
  },

  removeAssignment(source, category, assignmentId) {
    const assignments = this.getPersistedAssignments(source, category);
    const updatedAssignments = assignments.filter(
      (assignment) => assignment.id !== assignmentId,
    );

    this.savePersistedSelection(source, category, updatedAssignments);
    this.refreshWahlmoduleViews();
  },

  restorePersistedSelections() {
    this.refreshWahlmoduleViews();
  },

  initialize() {
    // Klick-Listener für Platzhalter-Module
    document.addEventListener("click", (e) => {
      const modul = e.target.closest(".modul[data-wahlmodul-source]");
      if (!modul) return;

      const source = modul.getAttribute("data-wahlmodul-source");
      const category = modul.getAttribute("data-wahlmodul-category");
      if (source) {
        e.preventDefault();
        e.stopPropagation();
        window.StudienplanWahlmodule.openWahlmodulDialog(
          source,
          modul,
          category,
        );
      }
    });

    document.addEventListener("change", (e) => {
      const projectAssignSelect = e.target.closest(
        "select[data-action='assign-project-semester']",
      );
      if (projectAssignSelect) {
        const projectName =
          projectAssignSelect.getAttribute("data-project-name");
        const selectedValue = projectAssignSelect.value;
        const semester = selectedValue ? Number(selectedValue) : null;
        this.updateProjectAssignment(projectName, semester);
        return;
      }

      const assessmentAssignSelect = e.target.closest(
        "select[data-action='assign-assessment-semester']",
      );
      if (assessmentAssignSelect) {
        const assessmentName = assessmentAssignSelect.getAttribute(
          "data-assessment-name",
        );
        const selectedValue = assessmentAssignSelect.value;
        const semester = selectedValue ? Number(selectedValue) : null;
        this.updateAssessmentAssignment(assessmentName, semester);
        return;
      }

      const assignSelect = e.target.closest(
        "select[data-action='assign-semester-select']",
      );
      if (!assignSelect) return;

      const assignmentCard = assignSelect.closest(".wahlmodul-assignment-card");
      if (!assignmentCard) return;

      const source = assignmentCard.getAttribute("data-wahlmodul-source");
      const category =
        assignmentCard.getAttribute("data-wahlmodul-category") || "";
      const assignmentId = assignmentCard.getAttribute("data-assignment-id");
      const selectedValue = assignSelect.value;
      const semester = selectedValue ? Number(selectedValue) : null;
      this.updateAssignmentSemester(source, category, assignmentId, semester);
    });

    document.addEventListener("click", (e) => {
      const removeButton = e.target.closest(
        "[data-action='remove-assignment']",
      );
      const assignmentCard = e.target.closest(".wahlmodul-assignment-card");

      if (!assignmentCard) return;
      if (e.target.closest("a")) return;

      const source = assignmentCard.getAttribute("data-wahlmodul-source");
      const category =
        assignmentCard.getAttribute("data-wahlmodul-category") || "";
      const assignmentId = assignmentCard.getAttribute("data-assignment-id");
      const assignment = this.findAssignment(source, category, assignmentId);

      if (!assignment) return;

      if (removeButton) {
        e.preventDefault();
        e.stopPropagation();
        this.removeAssignment(source, category, assignmentId);
        return;
      }
    });

    // Check ob Platzhalter vorhanden sind
    setTimeout(() => {
      const platzhalter = document.querySelectorAll(
        ".modul[data-wahlmodul-source]",
      );
      console.log("Platzhalter gefunden:", platzhalter.length);
    }, 1000);

    console.log("Wahlmodule initialisiert");
  },

  // Öffnet Dialog zur Modulauswahl
  async openWahlmodulDialog(source, modulElement, categoryFilter = null) {
    try {
      // Lade Modul-Daten
      const modules = await this.loadWahlmodulData(source);
      const currentAssignments = this.getPersistedAssignments(
        source,
        categoryFilter || "",
      );
      const selectedModules = currentAssignments.map(
        (assignment) => assignment.module,
      );
      const filteredModules = categoryFilter
        ? modules.filter(
            (module) =>
              String(module.standardcategory || "").trim() ===
              String(categoryFilter || "").trim(),
          )
        : modules;

      if (!filteredModules || filteredModules.length === 0) {
        alert("Keine Wahlmodule gefunden für: " + source);
        return;
      }

      // Zeige Dialog
      this.showModulSelectionDialog(
        filteredModules,
        modulElement,
        categoryFilter,
        selectedModules,
      );
    } catch (error) {
      console.error("Fehler beim Laden der Wahlmodule:", error);
      alert("Fehler beim Laden der Wahlmodule: " + error.message);
    }
  },

  // Lädt Wahlmodul-Daten aus der angegebenen Quelle
  async loadWahlmodulData(source) {
    // Prüfe Cache
    if (this.loadedSources[source]) {
      return this.loadedSources[source];
    }

    // Bestimme den Basis-Pfad (relativ zum aktuellen Studiengang)
    const studiengang = this.getCurrentStudiengang();

    // Konstruiere vollständigen Pfad
    const basePath = `../program-specific/${studiengang}/data/`;
    const fullPath = basePath + source.replace("./", "");

    // Lade Datei dynamisch
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = fullPath;
      script.onload = () => {
        // Mappe Dateinamen zu erwarteten Variablennamen
        const sourceToVarMap = {
          "wahlmodule-data.js": "FHNWCSAssessmentWahlmoduleData",
          "vertiefungen-data.js": "FHNWCSAssessmentVertiefungenData",
          "context-modules-data.js": "FHNWCSAssessmentContextModulesData",
          "seminar-data.js": "PolisciSeminarData",
          "vertiefungsmodule-data.js": "PolisciVertiefungsmoduleData",
          "specialisationmodule-data.js": "SpecialisationModuleData",
          "major-modules-data.js": "StudiengangWahlmoduleData",
          "erweiterung-modules-data.js": "StudiengangErweiterungWahlmoduleData",
          "wahlmodules.js": "StudiengangWahlmoduleData",
          "vertiefungsmodule.js": "StudiengangVertiefungsmoduleData",
        };

        // Versuche zuerst die spezifische Variable basierend auf dem Dateinamen
        let modules = null;
        const fileName = source.split("/").pop();
        const expectedVar = sourceToVarMap[fileName];

        if (expectedVar && window[expectedVar]) {
          modules = window[expectedVar];
        }

        // Fallback: Versuche verschiedene globale Variablen zu finden
        if (!modules) {
          const possibleVars = [
            "ITETWahlfaecherData",
            "ITETModuleData", // Kernfächer
            "ITETWeitereWahlGrundlagenData",
            "ITETPraktikaSeminarProjektData",
            "WahlmoduleData",
          ];

          for (const varName of possibleVars) {
            if (window[varName]) {
              modules = window[varName];
              break;
            }
          }
        }

        if (modules) {
          this.loadedSources[source] = modules;
          resolve(modules);
        } else {
          reject(new Error("Keine Modul-Daten gefunden in: " + fullPath));
        }
      };
      script.onerror = () =>
        reject(new Error("Fehler beim Laden von: " + fullPath));
      document.head.appendChild(script);
    });
  },

  // Zeigt den Auswahl-Dialog an
  showModulSelectionDialog(
    modules,
    placeholderElement,
    categoryFilter = null,
    selectedModules = [],
  ) {
    const normalizedSelectedModules = Array.isArray(selectedModules)
      ? selectedModules
      : [];

    // Erstelle Modal-Overlay
    const overlay = document.createElement("div");
    overlay.className = "wahlmodul-overlay";
    overlay.innerHTML = `
            <div class="wahlmodul-dialog">
                <div class="wahlmodul-header">
                  <h3>${categoryFilter ? `Wahlmodule: ${this.escapeHtml(categoryFilter)}` : "Wahlmodule nach Kategorie auswählen"}</h3>
                    <button class="wahlmodul-close" title="Schließen">×</button>
                </div>
                <div class="wahlmodul-body">
                    <div class="wahlmodul-filter">
                        <input type="text" id="wahlmodul-search" placeholder="Module durchsuchen...">
                    </div>
                    <div class="wahlmodul-list" id="wahlmodul-list">
                      ${this.renderModulList(modules, normalizedSelectedModules)}
                    </div>
                </div>
                <div class="wahlmodul-footer">
                    <div class="wahlmodul-selected-info">
                        <span id="selected-count">0</span> Module ausgewählt
                        (<span id="selected-ects">0</span> ECTS)
                    </div>
                    <button class="wahlmodul-cancel">Abbrechen</button>
                    <button class="wahlmodul-confirm">Bestätigen</button>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Event Listener
    this.attachDialogListeners(overlay, modules, placeholderElement);
  },

  // Rendert die Modulliste
  renderModulList(modules, selectedModules = []) {
    const groupedModules = this.groupModulesByCategory(modules);
    const selectedIdentitySet = new Set(
      selectedModules.map((module) => this.getModuleIdentity(module)),
    );
    let index = 0;

    return groupedModules
      .map(({ category, modules: categoryModules }) => {
        const itemsHtml = categoryModules
          .map((module) => {
            const currentIndex = index++;
            const isSelected = selectedIdentitySet.has(
              this.getModuleIdentity(module),
            );
            const checkedAttr = isSelected ? "checked" : "";

            return `
            <div class="wahlmodul-item" data-index="${currentIndex}" data-category="${this.escapeHtml(category)}">
                <input type="checkbox" id="wahlmodul-${currentIndex}" class="wahlmodul-checkbox" ${checkedAttr}>
                <label for="wahlmodul-${currentIndex}">
                    <span class="wahlmodul-name">${this.escapeHtml(module.name)}</span>
                    <span class="wahlmodul-ects">${module.ects || 0} ECTS</span>
                </label>
            </div>
        `;
          })
          .join("");

        return `
          <section class="wahlmodul-category-section" data-category="${this.escapeHtml(category)}">
            <div class="wahlmodul-category-title">${this.escapeHtml(category)}</div>
            <div class="wahlmodul-category-items">${itemsHtml}</div>
          </section>
        `;
      })
      .join("");
  },

  groupModulesByCategory(modules) {
    const grouped = [];
    const categoryMap = new Map();

    modules.forEach((module) => {
      const category =
        module.subcategory || module.standardcategory || "Ohne Kategorie";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
        grouped.push({ category, modules: categoryMap.get(category) });
      }
      categoryMap.get(category).push(module);
    });

    return grouped;
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  resolveCategoryClass(categoryName) {
    const normalizedName = String(categoryName || "")
      .trim()
      .toLowerCase();

    const categoryAliases = {
      vertiefungen: "vertiefung",
      fachergänzungen: "fachgrundlagen",
      fachergaenzungen: "fachgrundlagen",
    };

    if (categoryAliases[normalizedName]) {
      return categoryAliases[normalizedName];
    }

    const categoryConfig = window.StudiengangCategoriesConfig?.kategorien || [];
    const matchedCategory = categoryConfig.find(
      (category) =>
        String(category.name || "")
          .trim()
          .toLowerCase() === normalizedName,
    );

    if (matchedCategory?.klasse) {
      return matchedCategory.klasse;
    }

    return normalizedName
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  },

  // Fügt Event Listener zum Dialog hinzu
  attachDialogListeners(overlay, modules, placeholderElement) {
    const closeBtn = overlay.querySelector(".wahlmodul-close");
    const cancelBtn = overlay.querySelector(".wahlmodul-cancel");
    const confirmBtn = overlay.querySelector(".wahlmodul-confirm");
    const searchInput = overlay.querySelector("#wahlmodul-search");
    const checkboxes = overlay.querySelectorAll(".wahlmodul-checkbox");
    const selectedCount = overlay.querySelector("#selected-count");
    const selectedEcts = overlay.querySelector("#selected-ects");

    // Schließen-Handler
    const closeDialog = () => overlay.remove();
    closeBtn.addEventListener("click", closeDialog);
    cancelBtn.addEventListener("click", closeDialog);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    // Auswahl-Tracking
    const updateSelection = () => {
      const selected = Array.from(checkboxes).filter((cb) => cb.checked);
      const totalEcts = selected.reduce((sum, cb) => {
        const index = parseInt(cb.id.split("-")[1]);
        return sum + (modules[index].ects || 0);
      }, 0);
      selectedCount.textContent = selected.length;
      selectedEcts.textContent = totalEcts;
    };

    checkboxes.forEach((cb) => cb.addEventListener("change", updateSelection));

    // Initiale Auswahl anzeigen
    updateSelection();

    // Such-Funktion
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const sections = overlay.querySelectorAll(".wahlmodul-category-section");
      const items = overlay.querySelectorAll(".wahlmodul-item");
      items.forEach((item) => {
        const name = item
          .querySelector(".wahlmodul-name")
          .textContent.toLowerCase();
        const category = (item.dataset.category || "").toLowerCase();
        item.style.display =
          name.includes(searchTerm) || category.includes(searchTerm)
            ? "flex"
            : "none";
      });

      sections.forEach((section) => {
        const visibleItems = section.querySelectorAll(
          ".wahlmodul-item[style*='flex']",
        );
        section.style.display = visibleItems.length > 0 ? "block" : "none";
      });
    });

    // Bestätigen-Handler
    confirmBtn.addEventListener("click", () => {
      const selected = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => {
          const index = parseInt(cb.id.split("-")[1]);
          return modules[index];
        });

      this.addSelectedModules(selected, placeholderElement);
      closeDialog();
    });
  },

  // Fügt ausgewählte Module zum Studienplan hinzu
  addSelectedModules(
    selectedModules,
    placeholderElement,
    shouldPersist = true,
  ) {
    const source = placeholderElement.getAttribute("data-wahlmodul-source");
    const category =
      placeholderElement.getAttribute("data-wahlmodul-category") || "";
    const existingAssignments = this.getPersistedAssignments(source, category);
    const normalizedAssignments = this.mergeAssignments(
      existingAssignments,
      selectedModules,
    );

    if (shouldPersist) {
      this.savePersistedSelection(source, category, normalizedAssignments);
    }

    placeholderElement.dataset.selectedModules = JSON.stringify(
      normalizedAssignments,
    );

    this.renderSelectedModulesPanel(placeholderElement, normalizedAssignments);
    this.renderStudyPlanAssignments();

    // Aktualisiere KP-Counter falls vorhanden
    if (window.StudienplanKPCounter) {
      window.StudienplanKPCounter.updateCounter();
    }

    if (
      window.StudienplanColorManager &&
      typeof window.StudienplanColorManager.setMode === "function"
    ) {
      window.StudienplanColorManager.setMode(
        window.StudienplanColorManager.currentMode || "standard",
      );
    }

    console.log(
      "Module hinzugefügt:",
      selectedModules.map((m) => m.name).join(", "),
    );
  },
};

// Initialisiere sofort oder wenn DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.StudienplanWahlmodule.initialize();
  });
} else {
  // DOM ist bereits ready, initialisiere sofort
  window.StudienplanWahlmodule.initialize();
}
