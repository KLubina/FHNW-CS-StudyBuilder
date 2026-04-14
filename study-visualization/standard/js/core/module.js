/**
 * MODULE RENDERING - Modul-Darstellung
 */

window.StudienplanModule = {
  hasMaterialClickListener: false,

  initialize() {
    if (this.hasMaterialClickListener) return;

    // Klick-Handler deaktiviert, damit echte <a>-Tags direkt vom Browser oder Add-ons verarbeitet werden
    this.hasMaterialClickListener = true;
  },

  getModuleMaterialEntries(moduleName) {
    const details = window.StudiengangModuleDetails?.[moduleName];
    if (!details || !details.vorlesungsmaterial) return [];

    if (Array.isArray(details.vorlesungsmaterial)) {
      return details.vorlesungsmaterial
        .map((entry) => String(entry).trim())
        .filter(Boolean);
    }

    return String(details.vorlesungsmaterial)
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  },

  escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  toFileHref(path) {
    const trimmedPath = String(path || "").trim();
    if (!trimmedPath) return "";

    if (/^(https?:|file:|vscode:)/i.test(trimmedPath)) {
      return trimmedPath;
    }

    if (/^[a-zA-Z]:\\/.test(trimmedPath)) {
      const normalized = trimmedPath.replace(/\\/g, "/");
      const segments = normalized.split("/");
      const drive = segments.shift();
      const driveLetter = drive ? drive.charAt(0).toUpperCase() : "C";

      // Für das Local Filesystem Links Add-on dürfen wir Spaces NICHT zu %20 machen,
      // da die Windows CMD/Explorer %20 als wörtliches Zeichen interpretieren würde!
      const unencodedPath = segments.join("/");
      return `file:///${driveLetter}:/${unencodedPath}`;
    }

    return trimmedPath;
  },

  copyPathFallback(path) {
    const text = String(path || "").trim();
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.info("Pfad in Zwischenablage kopiert:", text);
        })
        .catch(() => {
          window.prompt("Pfad kopieren:", text);
        });
      return;
    }

    window.prompt("Pfad kopieren:", text);
  },

  showBlockedFileHint(fileHref, originalPath) {
    const message =
      "Der Browser blockiert lokale file:/// Links aus http:// Seiten. " +
      "Ich habe den Pfad bereitgestellt, damit du ihn direkt im Explorer oder Browser öffnen kannst.";
    console.warn(message, fileHref);
    window.prompt(
      "Lokalen Link/Pfad manuell öffnen:",
      fileHref || originalPath,
    );
  },

  tryOpenHref(href) {
    try {
      const opened = window.open(href, "_blank", "noopener");
      return !!opened;
    } catch (error) {
      console.warn("Lokaler Link konnte nicht direkt geöffnet werden:", error);
      return false;
    }
  },

  openMaterial(path) {
    const trimmedPath = String(path || "").trim();
    if (!trimmedPath) return;

    const targetHref = this.toFileHref(trimmedPath);
    const opened = this.tryOpenHref(targetHref);

    if (opened) return;

    if (
      targetHref.toLowerCase().startsWith("file:///") &&
      /^https?:$/i.test(window.location.protocol)
    ) {
      this.showBlockedFileHint(targetHref, trimmedPath);
      this.copyPathFallback(trimmedPath);
      return;
    }

    this.copyPathFallback(trimmedPath);
  },

  renderMaterialButtons(moduleName) {
    const materials = this.getModuleMaterialEntries(moduleName);
    if (materials.length === 0) return "";

    const buttonsHtml = materials
      .map((materialPath, index) => {
        const fileHref = this.toFileHref(materialPath);
        const escapedPath = this.escapeAttribute(fileHref);
        const label = materials.length > 1 ? `Link ${index + 1}` : "Link";
        // Da Add-ons oft auf target="_blank" negativ reagieren (weil es einen neuen Tab erzwingt bevor das Script greift),
        // entfernen wir es und lassen den reinen Link:
        return `<a href="${escapedPath}" class="module-material-button" title="Vorlesungsunterlagen öffnen">${label}</a>`;
      })
      .join("");

    return `<div class="module-material-buttons">${buttonsHtml}</div>`;
  },

  // Erstelle HTML für ein einzelnes Modul
  renderModule(module) {
    const baseEcts = module.ects || 0;
    const isWahlmodulPlaceholder = !!(
      module.isPlaceholder && module.wahlmodulSource
    );
    const ects = isWahlmodulPlaceholder ? 0 : baseEcts;
    const category = module.standardcategory || "unknown";
    const name = module.name || "Unbekanntes Modul";

    // Berechne Größe basierend auf ECTS (4 ECTS = 100px)
    const baseSize = 100;
    const sizeEcts = baseEcts > 0 ? baseEcts : 4;
    const scale = Math.sqrt(sizeEcts / 4);
    const size = baseSize * scale;
    const style = `width: ${size}px; height: ${size}px;`;

    // Platzhalter-Module speziell markieren
    let placeholderClass = "";
    let wahlmodulSourceAttr = "";
    if (isWahlmodulPlaceholder) {
      placeholderClass = "modul-platzhalter";
      wahlmodulSourceAttr = `data-wahlmodul-source="${this.escapeAttribute(module.wahlmodulSource)}"`;
      if (module.wahlmodulCategory) {
        wahlmodulSourceAttr += ` data-wahlmodul-category="${this.escapeAttribute(module.wahlmodulCategory)}"`;
      }
    }

    const materialButtons = this.renderMaterialButtons(name);

    return `
            <div class="modul ${category} ${placeholderClass}" data-ects="${ects}" style="${style}" ${wahlmodulSourceAttr}>
                <div class="modul-titel">${name}</div>
                <div class="modul-kp">${ects} KP</div>
                ${materialButtons}
            </div>
        `;
  },

  // Erstelle HTML für eine Semester-Liste von Modulen
  renderSemesterModules(modules) {
    const withIndex = modules.map((module, index) => ({ module, index }));
    withIndex.sort((a, b) => {
      const rankA = Number(a.module.orientationRank ?? 2);
      const rankB = Number(b.module.orientationRank ?? 2);
      if (rankA !== rankB) return rankA - rankB;
      return a.index - b.index;
    });

    return withIndex.map(({ module }) => this.renderModule(module)).join("");
  },
};

window.StudienplanModule.initialize();
