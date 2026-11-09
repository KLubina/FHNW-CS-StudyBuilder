/**
 * KP COUNTER - Optionale KP-Zähl-Funktionalität
 */

window.StudienplanKPCounter = {
  storageKey: "fhnw-cs-assessment-module-status",

  initialize() {
    // Verhindere doppelte Initialisierung
    if (this._initialized) return;
    this._initialized = true;

    // Erstelle KP-Counter Box wenn sie noch nicht existiert
    this.createCounterBox();

    // Berechne und zeige Gesamt-KP
    this.updateTotalKP();
    this.applyStoredStatuses();

    // Starte Beobachtung des DOM, damit Änderungen an Modulen automatisch nachgezählt werden
    this.startMutationObserver();
  },

  createCounterBox() {
    // Schaue ob Counter-Box bereits existiert
    if (document.getElementById("kp-counter")) {
      return;
    }

    // Erstelle Container für KP-Counter
    const counterBox = document.createElement("div");
    counterBox.id = "kp-counter";
    counterBox.className = "kp-counter-box";

    // Füge IN die Farben-Legende ein (am Ende)
    const legendeContainer = document.querySelector(".farben-legende");
    if (legendeContainer) {
      legendeContainer.appendChild(counterBox);
    }
  },

  updateTotalKP() {
    // Zähle nur Module, die tatsächlich im Studienplan (in Semester-Containern)
    // platziert sind. Dadurch werden Platzhalter, Legendeneinträge und
    // Auswahl-Dialoge nicht mitgezählt.
    const modules = document.querySelectorAll(
      ".semester .module-container .modul:not(.module-kp-exempt)",
    );
    let total = 0;
    let passed = 0;
    let failed = 0;

    modules.forEach((module) => {
      const ects = parseInt(module.dataset.ects, 10) || 0;
      total += ects;
      const statuses = this.getEffectiveModuleStatuses(module);
      if (statuses.attempt1 === "passed" || statuses.attempt2 === "passed") {
        passed += ects;
      } else if (
        statuses.attempt1 === "failed" ||
        statuses.attempt2 === "failed"
      ) {
        failed += ects;
      }
    });

    // Zeige in KP-Counter Box
    const counterBox = document.getElementById("kp-counter");
    if (counterBox) {
      counterBox.innerHTML = `
        <div id="kp-total">Gesamt: <strong>${total} KP</strong> (mind. 180 KP erforderlich)</div>
        <div class="kp-status-counters">
          <div class="kp-status-counter kp-passed-counter">
            Bestanden: <strong>${passed} KP</strong>
          </div>
          <div class="kp-status-counter kp-failed-counter">
            Nicht bestanden: <strong>${failed} KP</strong>
          </div>
        </div>
      `;
    }

    this.updateSemesterCounters();
  },

  updateSemesterCounters() {
    const semesterElements = document.querySelectorAll(".semester");

    semesterElements.forEach((semesterElement) => {
      const counterElement = semesterElement.querySelector(
        ".semester-ects-counter",
      );
      if (!counterElement) return;

      const semesterModules = semesterElement.querySelectorAll(
        ".module-container .modul:not(.module-kp-exempt)",
      );

      let semesterTotal = 0;
      semesterModules.forEach((module) => {
        semesterTotal += parseInt(module.dataset.ects, 10) || 0;
      });

      counterElement.textContent = `${semesterTotal} ECTS`;
    });
  },

  // Alias-Methode für Abwärtskompatibilität (anderes Modul ruft updateCounter())
  updateCounter() {
    this.updateTotalKP();
  },

  getStatuses() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || "{}");
    } catch (error) {
      console.warn("Gespeicherte Modulstatus konnten nicht geladen werden:", error);
      return {};
    }
  },

  getModuleStatuses(moduleName) {
    const stored = this.getStatuses()[moduleName];
    if (typeof stored === "string") {
      return { attempt1: stored, attempt2: null };
    }
    return stored || { attempt1: null, attempt2: null };
  },

  getEffectiveModuleStatuses(module) {
    const moduleName = module.querySelector(".modul-titel")?.textContent;
    const statuses = this.getModuleStatuses(moduleName);
    const secondAttemptAvailable = !!module.querySelector(
      '[data-attempt="2"]:not(:disabled)',
    );

    return secondAttemptAvailable
      ? statuses
      : { ...statuses, attempt2: null };
  },

  setModuleStatus(moduleName, attempt, status) {
    const statuses = this.getStatuses();
    const moduleStatuses = this.getModuleStatuses(moduleName);
    const attemptKey = `attempt${attempt}`;
    if (status === "passed" || status === "failed") {
      moduleStatuses[attemptKey] = status;
    } else {
      moduleStatuses[attemptKey] = null;
    }
    statuses[moduleName] = moduleStatuses;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(statuses));
    } catch (error) {
      console.warn("Modulstatus konnte nicht gespeichert werden:", error);
    }

    document.querySelectorAll(".modul").forEach((module) => {
      const title = module.querySelector(".modul-titel")?.textContent;
      if (title === moduleName) this.applyStatus(module, moduleStatuses);
    });
    this.updateTotalKP();
  },

  applyStatus(module, statuses) {
    const effectiveStatuses = this.getEffectiveModuleStatuses(module);
    const normalized = statuses
      ? {
          ...statuses,
          attempt2: effectiveStatuses.attempt2,
        }
      : effectiveStatuses;
    module.classList.toggle(
      "module-passed",
      normalized.attempt1 === "passed" || normalized.attempt2 === "passed",
    );
    module.classList.toggle(
      "module-failed",
      !module.classList.contains("module-passed") &&
        (normalized.attempt1 === "failed" || normalized.attempt2 === "failed"),
    );
    module.querySelectorAll(".module-status-button").forEach((button) => {
      const selected =
        normalized[`attempt${button.dataset.attempt}`] ===
        button.dataset.moduleStatus;
      button.classList.toggle("active", selected);
    });
    const secondAttempt = module.querySelector('[data-attempt-row="2"]');
    if (secondAttempt) {
      secondAttempt.hidden = normalized.attempt1 === "passed";
    }
  },

  applyStoredStatuses() {
    const statuses = this.getStatuses();
    document.querySelectorAll(".modul").forEach((module) => {
      const title = module.querySelector(".modul-titel")?.textContent;
      this.applyStatus(module, title ? this.getModuleStatuses(title) : null);
    });
    this.updateTotalKP();
  },

  // Beobachtet DOM-Änderungen und aktualisiert den KP-Counter bei hinzugefügten/entfernten Modulen
  startMutationObserver() {
    if (this._observer) return;

    const observer = new MutationObserver((mutations) => {
      // Debounce: kurz warten, falls mehrere Änderungen in Folge auftreten
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        // Prüfe ob relevante Änderungen vorhanden sind
        const relevant = mutations.some((m) => {
          return (
            Array.from(m.addedNodes).some(
              (n) =>
                n.nodeType === 1 &&
                n.classList &&
                n.classList.contains("modul"),
            ) ||
            Array.from(m.removedNodes).some(
              (n) =>
                n.nodeType === 1 &&
                n.classList &&
                n.classList.contains("modul"),
            )
          );
        });
        if (relevant) {
          this.applyStoredStatuses();
          this.updateTotalKP();
        }
      }, 50);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this._observer = observer;
  },
};

// Initialisiere wenn DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.StudienplanKPCounter.initialize();
});

// Falls das Script nach dem DOMContentLoaded geladen wird, sofort initialisieren
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  // Kleiner Timeout, damit andere Module (z.B. Layout) zuerst ihre Arbeit beenden können
  setTimeout(() => window.StudienplanKPCounter.initialize(), 0);
}
