/**
 * STUDIENPLAN BASE LOADER - MODULARIZED VERSION
 *
 * New structure (functionality/...):
 * - core/      → unverzichtbare Basismodule (Rendering, Layout, Legend, Config, Utils, etc.)
 * - optional/  → optionale Erweiterungen (Tooltip, KP-Counter, Color-Mode, Major/Minor, Wahlmodule)
 *
 * Lade-Reihenfolge:
 * 1) Zuerst Core-Module in fester Reihenfolge laden
 * 2) Danach optionale Module (fehlende optionale Module dürfen das Laden NICHT abbrechen)
 */

// New base paths reflecting the moved modules into core/ and optional/
const corePath = "js/core";
const optionalPath = "js/optional";

console.log("📦 Loading Studienplan components (core first, then optional)...");

// Small helper to load a single script and return a promise
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onerror = () => {
      const error = new Error(`Failed to load ${src}`);
      console.error(`❌ ${error.message}`);
      reject(error);
    };
    script.onload = () => {
      console.log(`✅ Loaded: ${src}`);
      resolve();
    };
    document.head.appendChild(script);
  });
}

// Promise that resolves when core and optional modules are loaded (lenient for optional)
window.baseModulesReady = (async () => {
  // 1) Load core modules in deterministic order
  const coreModules = [
    "utils.js",
    "module.js",
    "legend.js",
    "layout.js",
    "configLoader.js",
    "core.js",
  ];
  console.log("📥 Loading core modules ...");
  for (const moduleName of coreModules) {
    await loadScript(`${corePath}/${moduleName}`);
  }
  console.log("✅ Core modules loaded successfully");

  // 2) NOW load optional modules (after core is complete)
  const optionalModules = [
    "tooltip.js",
    "kp-counter.js",
    "color-manager.js",
    "major-minor-selector.js",
    "template-manager.js",
    "wahlmodule.js",
  ];

  console.log("📥 Loading optional modules ...");
  const settled = await Promise.allSettled(
    optionalModules.map((m) => loadScript(`${optionalPath}/${m}`)),
  );
  const failed = settled.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(
      `⚠️ Optional modules failed to load: ${failed}. Core continues.`,
    );
  }
  console.log("✅ All modules (core + optional) loaded successfully");
})();

console.log("📦 Module loading initiated (core + optional)");
