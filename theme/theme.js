/**
 * Theme handling for all Send As Alias pages.
 *
 * The stored `theme` value is "system" (default), "light" or "dark":
 *   - "system" → no data-theme attribute on <html>, prefers-color-scheme decides
 *   - "light" / "dark" → pinned via data-theme, overriding the OS setting
 *
 * Loaded as the first script (in <head>) of every page so the pinned theme
 * applies before the page renders. Attaches applyTheme to globalThis for the
 * options page's live preview (classic script, same pattern as shared/).
 */

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

async function applyStoredTheme() {
  try {
    const stored = await messenger.storage.local.get('theme');
    applyTheme(stored.theme);
  } catch (error) {
    console.error('Error applying stored theme:', error);
  }
}

globalThis.applyTheme = applyTheme;

applyStoredTheme();
