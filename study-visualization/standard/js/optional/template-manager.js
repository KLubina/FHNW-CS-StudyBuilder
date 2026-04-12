/**
 * TEMPLATE MANAGER - Persistente Studienplan-Templates
 */

window.StudienplanTemplateManager = {
  _initialized: false,
  _eventsBound: false,

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.renderTemplateManager();
    this.bindEvents();
    this.refreshTemplateList();
  },

  getCurrentStudiengang() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("studiengang") || "eth-cs";
  },

  getStorageNamespace() {
    return ["studienplan", this.getCurrentStudiengang()]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(":");
  },

  getStatePrefix() {
    return `${this.getStorageNamespace()}:`;
  },

  getTemplatesStorageKey() {
    return `${this.getStorageNamespace()}:templates`;
  },

  createTemplateId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  getTemplates() {
    try {
      const raw = window.localStorage.getItem(this.getTemplatesStorageKey());
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((entry) => this.normalizeTemplate(entry))
        .filter(Boolean)
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || 0).getTime();
          const bTime = new Date(b.updatedAt || 0).getTime();
          return bTime - aTime;
        });
    } catch (error) {
      return [];
    }
  },

  normalizeTemplate(entry) {
    if (!entry || typeof entry !== "object") return null;

    const name = String(entry.name || "").trim();
    if (!name) return null;

    const snapshot =
      entry.snapshot && typeof entry.snapshot === "object"
        ? entry.snapshot
        : {};

    return {
      id: String(entry.id || this.createTemplateId()),
      name,
      updatedAt: entry.updatedAt || new Date().toISOString(),
      snapshot,
    };
  },

  saveTemplates(templates) {
    try {
      window.localStorage.setItem(
        this.getTemplatesStorageKey(),
        JSON.stringify(templates || []),
      );
    } catch (error) {
      console.warn("Konnte Templates nicht speichern:", error);
    }
  },

  captureStateSnapshot() {
    const snapshot = {};
    const prefix = this.getStatePrefix();
    const registryKey = this.getTemplatesStorageKey();

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(prefix) || key === registryKey) {
        continue;
      }

      const value = window.localStorage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  },

  clearStateSnapshot() {
    const prefix = this.getStatePrefix();
    const registryKey = this.getTemplatesStorageKey();
    const keysToRemove = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(prefix) || key === registryKey) {
        continue;
      }

      keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  },

  applyStateSnapshot(snapshot) {
    this.clearStateSnapshot();

    Object.entries(snapshot || {}).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  },

  getTemplateById(templateId) {
    return (
      this.getTemplates().find((template) => template.id === templateId) || null
    );
  },

  getSelectedTemplateId() {
    const select = document.getElementById("template-manager-select");
    return select ? select.value : "";
  },

  setSelectedTemplateId(templateId) {
    const select = document.getElementById("template-manager-select");
    if (select) {
      select.value = templateId || "";
    }
  },

  getSelectedTemplate() {
    const templateId = this.getSelectedTemplateId();
    if (!templateId) return null;

    return this.getTemplateById(templateId);
  },

  renderTemplateManager() {
    let container = document.getElementById("template-manager");
    if (!container) {
      const anchor = document.getElementById("template-manager-anchor");
      container = document.createElement("section");
      container.id = "template-manager";
      container.className = "template-manager";
      container.innerHTML = this.getTemplateManagerMarkup();

      if (anchor?.parentElement) {
        anchor.replaceWith(container);
      } else {
        const subtitle = document.getElementById("studienplan-subtitle");
        if (subtitle?.parentElement) {
          subtitle.insertAdjacentElement("afterend", container);
        }
      }
    } else {
      container.innerHTML = this.getTemplateManagerMarkup();
    }

    this.refreshTemplateList();
  },

  getTemplateManagerMarkup() {
    const templates = this.getTemplates();
    const options = templates.length
      ? templates
          .map((template) => {
            const label = `${template.name} · ${this.formatUpdatedAt(template.updatedAt)}`;
            return `<option value="${this.escapeHtml(template.id)}">${this.escapeHtml(label)}</option>`;
          })
          .join("")
      : `<option value="">Keine Templates</option>`;

    return `
      <div class="template-manager__header">
        <div class="template-manager__heading-block">
          <h3 class="template-manager__title">Templates</h3>
        </div>
        <div class="template-manager__count" id="template-manager-count">${templates.length}</div>
      </div>
      <div class="template-manager__content">
        <div class="template-manager__field">
          <label for="template-manager-select">Gespeicherte</label>
          <select id="template-manager-select" class="template-manager__select" ${templates.length === 0 ? "disabled" : ""}>
            ${options}
          </select>
        </div>
        <div class="template-manager__actions">
          <button type="button" class="template-manager__button template-manager__button--primary" data-action="template-save">Speichern</button>
          <button type="button" class="template-manager__button" data-action="template-load" ${templates.length === 0 ? "disabled" : ""}>Laden</button>
          <button type="button" class="template-manager__button" data-action="template-rename" ${templates.length === 0 ? "disabled" : ""}>Umbenennen</button>
          <button type="button" class="template-manager__button template-manager__button--danger" data-action="template-delete" ${templates.length === 0 ? "disabled" : ""}>Löschen</button>
        </div>
      </div>
    `;
  },

  refreshTemplateList(selectTemplateId = null) {
    const templates = this.getTemplates();
    const container = document.getElementById("template-manager");
    if (!container) return;

    const select = container.querySelector("#template-manager-select");
    const count = container.querySelector("#template-manager-count");
    const actions = container.querySelectorAll("[data-action]");

    if (count) {
      count.textContent = String(templates.length);
    }

    if (!select) return;

    const selectedId =
      selectTemplateId || select.value || templates[0]?.id || "";

    select.innerHTML = templates.length
      ? templates
          .map((template) => {
            const label = `${template.name} · ${this.formatUpdatedAt(template.updatedAt)}`;
            return `<option value="${this.escapeHtml(template.id)}">${this.escapeHtml(label)}</option>`;
          })
          .join("")
      : `<option value="">Keine Templates</option>`;

    select.disabled = templates.length === 0;
    actions.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (action === "template-save") {
        button.disabled = false;
        return;
      }

      button.disabled = templates.length === 0;
    });

    if (templates.length === 0) {
      select.value = "";
      return;
    }

    const resolvedSelection = templates.some(
      (template) => template.id === selectedId,
    )
      ? selectedId
      : templates[0].id;
    select.value = resolvedSelection;
  },

  saveCurrentTemplate() {
    const suggestedName = `Template ${new Date().toLocaleDateString("de-DE")}`;
    const name = window.prompt("Wie soll das Template heissen?", suggestedName);
    if (name == null) return;

    const templateName = String(name).trim();
    if (!templateName) {
      window.alert("Bitte einen gültigen Namen eingeben.");
      return;
    }

    const templates = this.getTemplates();
    const existingIndex = templates.findIndex(
      (template) =>
        template.name.trim().toLowerCase() === templateName.toLowerCase(),
    );

    if (existingIndex >= 0) {
      const overwrite = window.confirm(
        `Ein Template mit dem Namen "${templateName}" existiert bereits. Möchtest du es überschreiben?`,
      );
      if (!overwrite) return;

      templates.splice(existingIndex, 1);
    }

    const template = {
      id: this.createTemplateId(),
      name: templateName,
      updatedAt: new Date().toISOString(),
      snapshot: this.captureStateSnapshot(),
    };

    templates.unshift(template);
    this.saveTemplates(templates);
    this.renderTemplateManager();
    this.setSelectedTemplateId(template.id);
    window.alert(`Template "${templateName}" wurde gespeichert.`);
  },

  loadSelectedTemplate() {
    const template = this.getSelectedTemplate();
    if (!template) {
      window.alert("Bitte zuerst ein gespeichertes Template auswählen.");
      return;
    }

    const confirmLoad = window.confirm(
      `Template "${template.name}" laden? Der aktuelle Zustand wird dabei ersetzt.`,
    );
    if (!confirmLoad) return;

    this.applyStateSnapshot(template.snapshot);
    window.location.reload();
  },

  renameSelectedTemplate() {
    const template = this.getSelectedTemplate();
    if (!template) {
      window.alert("Bitte zuerst ein gespeichertes Template auswählen.");
      return;
    }

    const newName = window.prompt("Neuer Template-Name", template.name);
    if (newName == null) return;

    const trimmedName = String(newName).trim();
    if (!trimmedName) {
      window.alert("Bitte einen gültigen Namen eingeben.");
      return;
    }

    const templates = this.getTemplates();
    const duplicateIndex = templates.findIndex(
      (entry) =>
        entry.id !== template.id &&
        entry.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicateIndex >= 0) {
      const overwrite = window.confirm(
        `Ein anderes Template heisst bereits "${trimmedName}". Dieses Template wird ersetzt.`,
      );
      if (!overwrite) return;

      templates.splice(duplicateIndex, 1);
    }

    const updatedTemplates = templates.map((entry) =>
      entry.id === template.id
        ? {
            ...entry,
            name: trimmedName,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    );

    this.saveTemplates(updatedTemplates);
    this.renderTemplateManager();
    this.setSelectedTemplateId(template.id);
  },

  deleteSelectedTemplate() {
    const template = this.getSelectedTemplate();
    if (!template) {
      window.alert("Bitte zuerst ein gespeichertes Template auswählen.");
      return;
    }

    const confirmDelete = window.confirm(
      `Template "${template.name}" wirklich löschen?`,
    );
    if (!confirmDelete) return;

    const updatedTemplates = this.getTemplates().filter(
      (entry) => entry.id !== template.id,
    );

    this.saveTemplates(updatedTemplates);
    this.renderTemplateManager();
    this.setSelectedTemplateId(updatedTemplates[0]?.id || "");
  },

  formatUpdatedAt(updatedAt) {
    if (!updatedAt) return "ohne Datum";

    try {
      return new Date(updatedAt).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (error) {
      return new Date(updatedAt).toLocaleString("de-DE");
    }
  },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const container = button.closest("#template-manager");
      if (!container) return;

      const action = button.getAttribute("data-action");
      if (action === "template-save") {
        event.preventDefault();
        this.saveCurrentTemplate();
        return;
      }

      if (action === "template-load") {
        event.preventDefault();
        this.loadSelectedTemplate();
        return;
      }

      if (action === "template-rename") {
        event.preventDefault();
        this.renameSelectedTemplate();
        return;
      }

      if (action === "template-delete") {
        event.preventDefault();
        this.deleteSelectedTemplate();
      }
    });

    document.addEventListener("change", (event) => {
      const select = event.target.closest("#template-manager-select");
      if (!select) return;

      this.refreshTemplateList(select.value);
    });
  },
};

// Initialisiere wenn DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.StudienplanTemplateManager.initialize();
  });
} else {
  window.StudienplanTemplateManager.initialize();
}

// Markiere als geladen
window.subModulesReady["template-manager"] = Promise.resolve();
