/**
 * LEGEND - Farben-Legende
 */

window.StudienplanLegend = {
  getCategoryOrderMap() {
    const categories = window.StudiengangCategoriesConfig?.kategorien || [];
    return new Map(
      categories.map((category, index) => [category.klasse, index]),
    );
  },

  shouldHideCategory(category) {
    return false;
  },

  // Erstelle Legende basierend auf Kategorien
  renderLegend(categories) {
    const legendContainer = document.getElementById("legende");
    if (!legendContainer) return;

    const visibleCategories = (categories || []).filter(
      (category) => !this.shouldHideCategory(category),
    );
    const orderMap = this.getCategoryOrderMap();
    visibleCategories.sort((left, right) => {
      const leftOrder = orderMap.has(left)
        ? orderMap.get(left)
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.has(right)
        ? orderMap.get(right)
        : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left).localeCompare(String(right), "de");
    });

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
