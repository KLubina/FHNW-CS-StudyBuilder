/**
 * LEGEND - Farben-Legende
 */

window.StudienplanLegend = {
  shouldHideCategory(category) {
    const normalized = String(category || "")
      .trim()
      .toLowerCase();
    return [
      "software",
      "programmierung",
      "systeme",
      "ergänzungen",
      "ergaenzungen",
      "theoretische",
    ].includes(normalized);
  },

  // Erstelle Legende basierend auf Kategorien
  renderLegend(categories) {
    const legendContainer = document.getElementById("legende");
    if (!legendContainer) return;

    const visibleCategories = (categories || []).filter(
      (category) => !this.shouldHideCategory(category),
    );

    const legendHTML = visibleCategories
      .map(
        (category) => `
            <div class="legende-item ${category}">
                <div class="legende-text">${this.getCategoryName(category)}</div>
            </div>
        `,
      )
      .join("");

    legendContainer.innerHTML = legendHTML;
  },

  // Übersetze Kategorie-Namen
  getCategoryName(category) {
    if (
      window.StudiengangCategoriesConfig &&
      window.StudiengangCategoriesConfig.kategorien
    ) {
      const cat = window.StudiengangCategoriesConfig.kategorien.find(
        (c) => c.klasse === category,
      );
      if (cat) return cat.name;
    }

    // Fallback für CSE themenbereiche
    if (
      window.CSEColorConfig &&
      window.CSEColorConfig.colors &&
      window.CSEColorConfig.colors.themenbereiche[category]
    ) {
      return window.CSEColorConfig.colors.themenbereiche[category].label;
    }

    return category;
  },
};
