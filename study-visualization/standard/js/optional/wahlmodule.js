/**
 * WAHLMODULE - Optionale Wahlmodule-Verwaltung
 */

window.StudienplanWahlmodule = {
  loadedSources: {}, // Cache für geladene Modul-Daten

  getCurrentStudiengang() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("studiengang") || "eth-cs";
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
      return Array.isArray(parsed) ? parsed : [];
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

  restorePersistedSelections() {
    const placeholders = document.querySelectorAll(
      ".modul[data-wahlmodul-source]",
    );

    placeholders.forEach((placeholderElement) => {
      const source = placeholderElement.getAttribute("data-wahlmodul-source");
      const category =
        placeholderElement.getAttribute("data-wahlmodul-category") || "";
      const storedSelection = this.loadPersistedSelection(source, category);

      if (storedSelection.length > 0) {
        this.addSelectedModules(storedSelection, placeholderElement, false);
      }
    });
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
    const urlParams = new URLSearchParams(window.location.search);
    const studiengang = urlParams.get("studiengang") || "eth-cs";

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
  showModulSelectionDialog(modules, placeholderElement, categoryFilter = null) {
    // Hole bereits ausgewählte Module aus dem Platzhalter
    let selectedModules = [];
    if (placeholderElement.dataset.selectedModules) {
      try {
        selectedModules = JSON.parse(
          placeholderElement.dataset.selectedModules,
        );
      } catch (e) {
        selectedModules = [];
      }
    }

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
                        ${this.renderModulList(modules, selectedModules)}
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
    let index = 0;

    return groupedModules
      .map(({ category, modules: categoryModules }) => {
        const itemsHtml = categoryModules
          .map((module) => {
            const currentIndex = index++;
            const isSelected = selectedModules.some(
              (m) => m.name === module.name && m.ects === module.ects,
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
    // Finde oder erstelle den Container für die ausgewählten Module
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

    // Leere den Container
    selectedContainer.innerHTML = "";

    // Speichere die Auswahl im Platzhalter für spätere Bearbeitung
    placeholderElement.dataset.selectedModules =
      JSON.stringify(selectedModules);

    if (shouldPersist) {
      const source = placeholderElement.getAttribute("data-wahlmodul-source");
      const category =
        placeholderElement.getAttribute("data-wahlmodul-category") || "";
      this.savePersistedSelection(source, category, selectedModules);
    }

    // Füge ausgewählte Module hinzu
    selectedModules.forEach((module) => {
      const moduleForRender = {
        ...module,
        standardcategory: this.resolveCategoryClass(module.standardcategory),
      };
      const moduleHTML = window.StudienplanModule.renderModule(moduleForRender);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = moduleHTML;
      const moduleElement = tempDiv.firstElementChild;
      selectedContainer.appendChild(moduleElement);
    });

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

// Markiere als geladen
window.subModulesReady["wahlmodule"] = Promise.resolve();
