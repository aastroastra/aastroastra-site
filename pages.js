/* English / Hindi switch for the public content pages. Shares the homepage's
   `aa-lang` preference, so a language picked anywhere follows the visitor. */
(() => {
  'use strict';
  const root = document.documentElement;
  let lang = 'en';
  // ?lang=hi|en (the hreflang URL) wins over the saved choice.
  let q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (_) { /* old browser */ }
  if (q === 'hi' || q === 'en') lang = q;
  else { try { lang = localStorage.getItem('aa-lang') === 'hi' ? 'hi' : 'en'; } catch (_) { /* storage is optional */ } }
  function apply(value, persist) {
    lang = value === 'hi' ? 'hi' : 'en';
    root.dataset.lang = lang;
    root.lang = lang;
    document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
    if (persist) {
      try { localStorage.setItem('aa-lang', lang); } catch (_) { /* keep working */ }
      try {
        const u = new URL(location.href);
        if (u.searchParams.has('lang')) { if (lang === 'hi') u.searchParams.set('lang', 'hi'); else u.searchParams.delete('lang'); history.replaceState(null, '', u); }
      } catch (_) { /* keep working */ }
    }
  }
  apply(lang);
  document.addEventListener('DOMContentLoaded', () => {
    apply(lang);
    document.querySelectorAll('[data-set-lang]').forEach(b => b.addEventListener('click', () => apply(b.dataset.setLang, true)));
  });
})();
