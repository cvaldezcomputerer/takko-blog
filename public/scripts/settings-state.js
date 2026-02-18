/*
 * WARNING: Browser-only helper.
 * This file touches window/document/localStorage directly.
 * Do not import this into server-rendered (SSR/build-time) modules.
 */
(function initializeTakkoSettings() {
  if (typeof window === 'undefined') return;
  if (window.TakkoSettings) return;

  const STORAGE_KEYS = {
    theme: 'theme',
    showDefinitionHighlights: 'showDefinitionHighlights',
    islandVisibility: 'islandVisibility',
  };

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function getTheme() {
    const storedTheme = safeGet(STORAGE_KEYS.theme);
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme = getTheme()) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#212121' : '#FAFAFA');
    }
  }

  function setTheme(theme) {
    safeSet(STORAGE_KEYS.theme, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
  }

  function getShowDefinitionHighlights() {
    return safeGet(STORAGE_KEYS.showDefinitionHighlights) !== '0';
  }

  function applyDefinitionHighlightsSetting(value = getShowDefinitionHighlights()) {
    document.documentElement.classList.toggle('definition-highlights-off', !value);
  }

  function setShowDefinitionHighlights(value) {
    safeSet(STORAGE_KEYS.showDefinitionHighlights, value ? '1' : '0');
    applyDefinitionHighlightsSetting(value);
  }

  function getIslandVisibility() {
    return safeGet(STORAGE_KEYS.islandVisibility) !== '0';
  }

  function applyIslandVisibilitySetting(value = getIslandVisibility()) {
    document.documentElement.classList.toggle('island-hidden', !value);
  }

  function setIslandVisibility(value) {
    safeSet(STORAGE_KEYS.islandVisibility, value ? '1' : '0');
    applyIslandVisibilitySetting(value);
    document.dispatchEvent(
      new CustomEvent('takko:settings-change', {
        detail: { key: 'islandVisibility', value },
      }),
    );
  }

  function applyAll() {
    applyTheme();
    applyDefinitionHighlightsSetting();
    applyIslandVisibilitySetting();
  }

  window.TakkoSettings = {
    STORAGE_KEYS,
    getTheme,
    applyTheme,
    setTheme,
    toggleTheme,
    getShowDefinitionHighlights,
    applyDefinitionHighlightsSetting,
    setShowDefinitionHighlights,
    getIslandVisibility,
    applyIslandVisibilitySetting,
    setIslandVisibility,
    applyAll,
  };
})();
