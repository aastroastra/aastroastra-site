/* English / Hindi switch for the public content pages. Shares the homepage's
   `aa-lang` preference, so a language picked anywhere follows the visitor. */
(() => {
  'use strict';
  const root = document.documentElement;
  let lang = 'en';
  try { lang = localStorage.getItem('aa-lang') === 'hi' ? 'hi' : 'en'; } catch (_) { /* storage is optional */ }
  function apply(value, persist) {
    lang = value === 'hi' ? 'hi' : 'en';
    root.dataset.lang = lang;
    root.lang = lang;
    document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
    if (persist) { try { localStorage.setItem('aa-lang', lang); } catch (_) { /* keep working */ } }
  }
  apply(lang);
  document.addEventListener('DOMContentLoaded', () => {
    apply(lang);
    document.querySelectorAll('[data-set-lang]').forEach(b => b.addEventListener('click', () => apply(b.dataset.setLang, true)));
  });
})();
