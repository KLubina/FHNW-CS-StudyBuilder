/**
 * COLOR MANAGER - Optionale Farbverwaltung
 */

window.StudienplanColorManager = {
  currentMode: "standard",

  initialize() {
    // Versuche, den Selector zu erstellen; wenn keine Modi definiert sind,
    // gibt createColorModeSelector false zurück und wir markieren nicht als init.
    // Erfasse die ursprünglichen Klassen der Module, damit wir später zu 'standard' zurückkehren können
    this.captureOriginalModuleClasses();

    const storedMode = this.getStoredModeKey();
    const defaultMode = this.getDefaultModeKey();
    const initialMode =
      storedMode &&
      (storedMode === "standard" ||
        window.StudiengangColorManagerModes?.[storedMode])
        ? storedMode
        : defaultMode;

    this.currentMode = initialMode;

    const created = this.createColorModeSelector();

    this.setMode(initialMode);

    return created;
  },

  createColorModeSelector() {
    if (!window.StudiengangColorManagerModes) return false;

    const existingSelector = document.getElementById("color-mode-selector");
    if (existingSelector) {
      const select = existingSelector.querySelector("#color-mode-select");
      if (select) {
        select.value = this.currentMode || this.getDefaultModeKey();
      }
      return false;
    }

    const customModeKeys = Object.keys(window.StudiengangColorManagerModes);
    if (customModeKeys.length === 0) return false;

    const selectorContainer = document.createElement("div");
    selectorContainer.id = "color-mode-selector";
    selectorContainer.style.marginBottom = "20px";
    selectorContainer.style.textAlign = "center";
    selectorContainer.innerHTML = `
            <label for="color-mode-select" style="margin-right: 10px; font-weight: bold;">Farbmodus:</label>
            <select id="color-mode-select" style="padding: 5px; border-radius: 4px;"></select>
        `;

    // Füge Standard- und projektspezifische Modi hinzu
    const select = selectorContainer.querySelector("#color-mode-select");
    const standardMode = this.getStandardModeConfig();
    const modeEntries = [
      {
        key: "standard",
        label: standardMode.label,
        order: standardMode.order,
      },
      ...customModeKeys.map((modeKey) => {
        const mode = window.StudiengangColorManagerModes[modeKey];
        return {
          key: modeKey,
          label: mode.label,
          order: mode.order || 0,
        };
      }),
    ].sort((a, b) => a.order - b.order);

    modeEntries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.key;
      option.textContent = entry.label;
      select.appendChild(option);
    });

    const initialMode = this.currentMode || this.getDefaultModeKey();
    select.value = initialMode;

    // Event listener
    select.addEventListener("change", (e) => {
      this.setMode(e.target.value);
    });

    // Platziere den Selector IN der farben-legende oben (prepend),
    // damit er nicht als zusätzliches Flex-Kind im übergeordneten .container
    // den gesamten Platz einnehmen kann.
    const farbenLegende = document.querySelector(".farben-legende");
    if (farbenLegende) {
      // bevorzugt: prepend, kompatibel mit älteren Browsern via insertAdjacentElement
      if (typeof farbenLegende.prepend === "function") {
        farbenLegende.prepend(selectorContainer);
      } else {
        farbenLegende.insertAdjacentElement("afterbegin", selectorContainer);
      }
    }

    return true;
  },

  getStandardModeConfig() {
    const configured = window.StudiengangColorManagerStandardMode || {};
    return {
      label: configured.label || "Standard",
      order: typeof configured.order === "number" ? configured.order : 0,
    };
  },

  getDefaultModeKey() {
    const configured = window.StudiengangColorManagerDefaultMode;
    if (
      configured &&
      (configured === "standard" ||
        window.StudiengangColorManagerModes?.[configured])
    ) {
      return configured;
    }
    return "standard";
  },

  setMode(modeKey) {
    this.currentMode = modeKey;

    if (modeKey === "standard") {
      this.saveModeKey(modeKey);

      // Entferne vorherige color management CSS
      const existing = document.querySelectorAll("link[data-color-mode]");
      existing.forEach((link) => link.remove());

      // Stelle ursprüngliche Klassen wieder her und entferne mode-spezifische Markierung
      const modules = document.querySelectorAll(".modul");
      modules.forEach((modul) => {
        const prev = modul.dataset.currentColorClass;
        if (prev) modul.classList.remove(prev);

        if (modul.dataset.originalClasses) {
          modul.dataset.originalClasses
            .split(" ")
            .forEach((c) => modul.classList.add(c));
        }

        delete modul.dataset.currentColorClass;
      });

      // Aktualisiere Legende
      this.updateLegend("standard");
      this.syncSelectorValue(modeKey);
      return;
    }

    const mode = window.StudiengangColorManagerModes[modeKey];
    if (!mode) return;

    this.saveModeKey(modeKey);

    // Lade die CSS für den Modus
    this.loadModeCSS(mode);

    // Update die Module-Kategorien
    this.updateModuleCategories(mode);

    // Update die Legende
    this.updateLegend(modeKey);
    this.syncSelectorValue(modeKey);
  },

  syncSelectorValue(modeKey) {
    const select = document.getElementById("color-mode-select");
    if (select && select.value !== modeKey) {
      select.value = modeKey;
    }
  },

  getStorageKey() {
    return ["studienplan", this.getCurrentStudiengang(), "color-mode"]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(":");
  },

  getStoredModeKey() {
    try {
      return window.localStorage.getItem(this.getStorageKey());
    } catch (error) {
      return null;
    }
  },

  saveModeKey(modeKey) {
    try {
      window.localStorage.setItem(this.getStorageKey(), modeKey);
    } catch (error) {
      console.warn("Konnte Farbmodus nicht lokal speichern:", error);
    }
  },

  loadModeCSS(mode) {
    // Entferne vorherige color management CSS
    const existing = document.querySelectorAll("link[data-color-mode]");
    existing.forEach((link) => link.remove());

    // Lade neue CSS
    if (mode.css.classes) {
      this.loadCSS(`../program-specific/${mode.css.classes}`, "color-mode");
    }
    if (mode.css.colors) {
      this.loadCSS(`../program-specific/${mode.css.colors}`, "color-mode");
    }
  },

  // Speichere die originalen Klassen (alles ausser 'modul') pro Modul, damit wir später zu Standard zurückkehren können
  captureOriginalModuleClasses() {
    const modules = document.querySelectorAll(".modul");
    modules.forEach((modul) => {
      if (modul.dataset.originalClasses) return;

      const orig = Array.from(modul.classList)
        .filter((c) => c !== "modul")
        .join(" ");
      if (orig) modul.dataset.originalClasses = orig;
    });
  },

  loadCSS(href, dataAttr) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(`data-${dataAttr}`, "true");
    document.head.appendChild(link);
  },

  updateModuleCategories(mode) {
    const modules = document.querySelectorAll(".modul");
    modules.forEach((modul) => {
      const moduleData = this.findModuleData(modul);
      if (moduleData) {
        let newCategory = moduleData[mode.categoryField];

        if (mode.deriveClass) {
          newCategory = mode.deriveClass(moduleData, newCategory);
        }

        if (mode.valueType === "class") {
          // newCategory ist bereits die Klasse
        } else {
          // Mappe name zu klasse
          const cat = mode.getCategories().find((c) => c.name === newCategory);
          newCategory = cat ? cat.klasse : newCategory;
        }
        // Entferne vorherige color-mode Klasse falls gesetzt
        const prev = modul.dataset.currentColorClass;
        if (prev) modul.classList.remove(prev);

        // Entferne auch die originalClasses, damit wir nur die neue Klasse haben (wenn original vorhanden)
        if (modul.dataset.originalClasses) {
          modul.dataset.originalClasses
            .split(" ")
            .forEach((c) => modul.classList.remove(c));
        }

        // Füge neue Kategorie-Klasse hinzu und merke sie als aktuell
        if (newCategory) {
          modul.classList.add(newCategory);
          modul.dataset.currentColorClass = newCategory;
        }
      }
    });
  },

  findModuleData(modulElement) {
    // Finde die Modul-Daten basierend auf dem Namen oder so
    // Einfach: verwende den Titel
    const title = modulElement.querySelector(".modul-titel").textContent;
    return window.StudiengangModules.find((m) => m.name === title);
  },

  updateLegend(modeKey) {
    const legendContainer = document.getElementById("legende");
    const legendTitle = document.getElementById("legende-titel");
    if (!legendContainer) return;

    let categories = [];

    if (modeKey === "standard") {
      const standardMode = this.getStandardModeConfig();
      if (legendTitle)
        legendTitle.textContent = `${standardMode.label}-Legende`;
      // Verwende die standard Kategorien
      const modules = document.querySelectorAll(".modul");
      const cats = new Set();
      modules.forEach((m) => {
        const category = Array.from(m.classList).find(
          (c) => !["modul"].includes(c),
        );
        if (category) cats.add(category);
      });
      categories = Array.from(cats);
    } else {
      const mode = window.StudiengangColorManagerModes[modeKey];
      if (legendTitle) legendTitle.textContent = `${mode.label}-Legende`;
      categories = mode.getCategories().map((c) => c.klasse);
    }

    const legendHTML = categories
      .map(
        (category) => `
            <div class="legende-item ${category}">
                <div class="legende-text">${this.getCategoryName(category, modeKey)}</div>
            </div>
        `,
      )
      .join("");

    legendContainer.innerHTML = legendHTML;
  },

  getCategoryName(category, modeKey) {
    if (modeKey === "standard") {
      return window.StudienplanLegend.getCategoryName(category);
    }

    const mode = window.StudiengangColorManagerModes[modeKey];
    const cat = mode.getCategories().find((c) => c.klasse === category);
    return cat ? cat.name : category;
  },

  getCurrentStudiengang() {
    return (
      document.body.getAttribute("data-studiengang") || "fhnw-cs-assessment"
    );
  },
};

// Initialisiere wenn DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.StudienplanColorManager.initialize();
});

// Falls das Script nach dem DOMContentLoaded geladen wird, sofort initialisieren
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  // Kleiner Timeout damit DOM-abhängige Elemente sicher vorhanden sind
  setTimeout(() => window.StudienplanColorManager.initialize(), 0);
}
