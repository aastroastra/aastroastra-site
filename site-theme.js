/* Subpages share the homepage's aa-theme preference and palette names. */
(() => {
  'use strict';
  const colors = {
    'yellow-light': '#FFFFFF',
    'white-light': '#FFFFFF',
    'mono-light': '#FFFFFF',
    'yellow-dark': '#0B0B0C',
    'mono-dark': '#0A0A0A'
  };
  const valid = theme => Object.hasOwn(colors, theme);
  const fallback = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'yellow-dark' : 'yellow-light';
  let theme;
  try { theme = localStorage.getItem('aa-theme'); } catch (_) { /* Storage is optional. */ }
  function apply(value, persist = false) {
    theme = valid(value) ? value : fallback();
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = colors[theme];
    document.querySelectorAll('[data-site-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.siteTheme === theme));
    });
    document.querySelectorAll('[data-site-theme-select]').forEach(select => { select.value = theme; });
    if (persist) {
      try { localStorage.setItem('aa-theme', theme); } catch (_) { /* Keep the current page usable. */ }
    }
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(theme);
    document.querySelectorAll('[data-site-theme]').forEach(button => {
      button.addEventListener('click', () => apply(button.dataset.siteTheme, true));
    });
    document.querySelectorAll('[data-site-theme-select]').forEach(select => {
      select.addEventListener('change', () => apply(select.value, true));
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === 'aa-theme' || event.key === null) apply(event.newValue);
  });
})();
