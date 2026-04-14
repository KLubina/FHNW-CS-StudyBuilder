/**
 * CONFIG LOADER - Lädt Studiengang-Konfiguration und Daten
 */

window.StudienplanConfigLoader = {
  // Lade Konfiguration für einen Studiengang
  async loadStudiengangConfig(studiengang) {
    try {
      // Bestimme das Modell (JETZT NUR NOCH MONO FÜR ALLE)
      // Lade General-Konfiguration
      const generalConfigPath = `../program-specific/${studiengang}/standard-config/general-config.js`;
      await this.loadScript(generalConfigPath);

      // Lade Kategorien-Konfiguration
      const categoriesConfigPath = `../program-specific/${studiengang}/standard-config/standardcategories-config.js`;
      await this.loadScript(categoriesConfigPath);

      // Lade Color-Config falls vorhanden (für CSE)
      const colorConfigPath = `../program-specific/${studiengang}/standard-config/color-config.js`;
      try {
        await this.loadScript(colorConfigPath);
      } catch (e) {
        // Color-Config ist optional
      }

      // Lade Color Management Configs falls vorhanden
      const secondCategoriesPath = `../program-specific/${studiengang}/colormanagement/secondcategories-config.js`;
      try {
        await this.loadScript(secondCategoriesPath);
      } catch (e) {
        // Optional
      }
      const thirdCategoriesPath = `../program-specific/${studiengang}/colormanagement/thirdcategories-config.js`;
      try {
        await this.loadScript(thirdCategoriesPath);
      } catch (e) {
        // Optional
      }
      const fourthCategoriesPath = `../program-specific/${studiengang}/colormanagement/fourthcategories-config.js`;
      try {
        await this.loadScript(fourthCategoriesPath);
      } catch (e) {
        // Optional
      }

      // Lade Modul-Daten
      // Verwende das standardisierte basic-modules-data.js
      const dataPath = `../program-specific/${studiengang}/data/basic-modules-data.js`;
      await this.loadScript(dataPath);

      // Lade Wahlmodul-Sektionen falls vorhanden
      const wahlmoduleSectionsPath = `../program-specific/${studiengang}/data/wahlmodule-sections.js`;
      try {
        await this.loadScript(wahlmoduleSectionsPath);
      } catch (e) {
        // Optional
      }

      // Lade Vertiefungen/Fachergänzungen-Sektionen falls vorhanden
      const vertiefungenSectionsPath = `../program-specific/${studiengang}/data/vertiefungen-sections.js`;
      try {
        await this.loadScript(vertiefungenSectionsPath);
      } catch (e) {
        // Optional
      }

      // Lade Kontext-Sektionen falls vorhanden
      const contextSectionsPath = `../program-specific/${studiengang}/data/context-sections.js`;
      try {
        await this.loadScript(contextSectionsPath);
      } catch (e) {
        // Optional
      }

      // Lade feste Projektmodule falls vorhanden
      const projectModulesPath = `../program-specific/${studiengang}/data/project-modules-data.js`;
      try {
        await this.loadScript(projectModulesPath);
      } catch (e) {
        // Optional
      }

      // Major-Minor Legacy Handling:
      // Check if global variable for modules is set after loading.
      // Major-Minor files might define variables ending in 'PflichtmoduleData'.
      if (!window.StudiengangModules) {
        const anyKey = Object.keys(window).find((k) =>
          /PflichtmoduleData$/.test(k),
        );
        if (anyKey) {
          console.log(`Using legacy data variable: ${anyKey}`);
          window.StudiengangModules = window[anyKey];
        }
      }

      // Lade Modul-Details falls vorhanden (für Module Details Modal)
      const detailsPath = `../program-specific/${studiengang}/data/basic-modules-details.js`;

      try {
        await this.loadScript(detailsPath);
      } catch (e) {
        // Details sind optional
      }

      // Wenn Daten geladen, rendere den Studienplan
      if (window.StudiengangModules) {
        this.renderStudiengang(window.StudiengangModules, studiengang);
      } else {
        console.error("Keine Modul-Daten gefunden für:", studiengang);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Konfiguration:", error);
    }
  },

  // Lade ein Script dynamisch
  async loadScript(src) {
    const script = document.createElement("script");
    script.src = src;
    document.head.appendChild(script);

    // Warte auf Laden
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
    });
  },

  // Rendere den Studienplan
  renderStudiengang(modules, studiengang) {
    // Mappe Kategorien zu CSS-Klassen
    const mappedModules = this.mapCategoriesToClasses(modules);

    // Entferne Assessment-Module aus dem initialen Render, damit sie
    // nur über die Zuweisung in den Studienplan gelangen (vermeidet Duplikate)
    const modulesToRender = Array.isArray(mappedModules)
      ? mappedModules.filter((m) => !m.isAssessment)
      : mappedModules;

    // Gruppiere Module (ohne Assessments)
    const grouped =
      window.StudienplanUtils.groupModulesByYearAndSemester(modulesToRender);

    // Rendere Layout
    window.StudienplanLayout.renderLayout(grouped);

    // Rendere Legende (basierend auf tatsächlich gerenderten Modulen)
    const categories =
      window.StudienplanUtils.getUniqueCategories(modulesToRender);
    window.StudienplanLegend.renderLegend(categories);
    // Setze Titel
    this.setTitles(studiengang);

    // Initialisiere optionale Module, falls vorhanden (z.B. wenn sie nach DOMContentLoaded geladen wurden)
    try {
      if (
        window.StudienplanColorManager &&
        typeof window.StudienplanColorManager.initialize === "function"
      ) {
        // Color Manager initialisieren (erzeugt Selector / Legendeneinträge)
        window.StudienplanColorManager.initialize();
      }

      if (
        window.StudienplanWahlmodule &&
        typeof window.StudienplanWahlmodule.restorePersistedSelections ===
          "function"
      ) {
        // Gespeicherte Wahlmodule nach dem Rendern wiederherstellen
        window.StudienplanWahlmodule.restorePersistedSelections();
      }

      if (
        window.StudienplanKPCounter &&
        typeof window.StudienplanKPCounter.updateTotalKP === "function"
      ) {
        // KP Counter aktualisieren (berechnet aus gerenderten Modulen)
        window.StudienplanKPCounter.updateTotalKP();
      }
    } catch (e) {
      console.warn("Fehler beim Initialisieren optionaler Module:", e);
    }

    console.log("Studienplan gerendert für:", studiengang);
  },

  // Mappe standardcategory zu CSS-Klasse
  mapCategoriesToClasses(modules) {
    if (
      !window.StudiengangCategoriesConfig ||
      !window.StudiengangCategoriesConfig.kategorien
    ) {
      // Fallback: verwende color-config falls vorhanden, sonst vereinfache
      return modules.map((module) => ({
        ...module,
        standardcategory:
          this.getCategoryFromColorConfig(module) ||
          this.simplifyCategory(module.standardcategory),
      }));
    }

    const normalizeCategoryName = (name) =>
      (name || "")
        .trim()
        .replace(/^[-*]\s+/, "")
        .toLowerCase();

    const categoryMap = {};
    window.StudiengangCategoriesConfig.kategorien.forEach((cat) => {
      categoryMap[normalizeCategoryName(cat.name)] = cat.klasse;
    });

    // Backward-compatible aliases for renamed legend categories
    const legacyAliases = {
      "fachgrundlagen & fachergänzungen": "fachgrundlagen",
      vertiefungen: "vertiefung",
      projekte: "projekt",
      kontext: "kontext",
      "software engineering": "kontext",
    };

    return modules.map((module) => ({
      ...module,
      standardcategory:
        categoryMap[normalizeCategoryName(module.standardcategory)] ||
        legacyAliases[normalizeCategoryName(module.standardcategory)] ||
        this.getCategoryFromColorConfig(module) ||
        this.simplifyCategory(module.standardcategory),
    }));
  },

  // Hole Kategorie aus color-config (für CSE)
  getCategoryFromColorConfig(module) {
    if (window.CSEColorConfig && window.CSEColorConfig.getThemenbereich) {
      const themenbereich = window.CSEColorConfig.getThemenbereich(module.name);
      return themenbereich;
    }
    return null;
  },

  // Vereinfache Kategorie-Name zu CSS-Klasse
  simplifyCategory(category) {
    if (!category) return "unknown";
    return category
      .toLowerCase()
      .replace(/obligatorische\s+/g, "")
      .replace(/fächer/g, "")
      .replace(/praktikum/g, "praktikum")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  },

  // Setze Titel und Untertitel
  setTitles(studiengang) {
    const titleElement = document.getElementById("studienplan-title");
    const subtitleElement = document.getElementById("studienplan-subtitle");

    if (titleElement) {
      const title =
        window.StudiengangGeneralConfig?.title ||
        this.getStudiengangName(studiengang);
      titleElement.textContent = title;
    }

    if (subtitleElement) {
      if (window.StudiengangGeneralConfig?.subtitleHtml) {
        subtitleElement.innerHTML =
          window.StudiengangGeneralConfig.subtitleHtml;
      } else {
        subtitleElement.textContent = "mind. 180 KP insgesamt";
      }
    }
  },

  // Übersetze Studiengang-Namen
  getStudiengangName(studiengang) {
    const names = {
      "eth-cs": "Informatik",
      "eth-cse": "Computer Science and Engineering",
      // Füge weitere hinzu...
    };
    return names[studiengang] || studiengang.toUpperCase();
  },
};

// Mache Funktion global verfügbar
window.loadStudiengangConfig =
  window.StudienplanConfigLoader.loadStudiengangConfig.bind(
    window.StudienplanConfigLoader,
  );
