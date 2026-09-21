// Play Store kit page. Data comes from kit-data.js (window.PLAY_KIT), generated
// by aastroastra-android/store/build-play-kit.py, so the page works from a
// theme ZIP with no server. The five theme dots in the site header switch the
// whole kit: site-theme.js sets <html data-theme>, this file watches it.
(function () {
  'use strict';
  const KIT = window.PLAY_KIT;
  if (!KIT) { document.getElementById('resources').innerHTML = '<p class="notice">kit-data.js did not load. Run build-play-kit.py.</p>'; return; }
  const offline = location.protocol === 'file:';
  if (offline) document.documentElement.classList.add('offline');
  const revision = offline ? '' : '?v=' + encodeURIComponent(KIT.version + '-' + KIT.versionCode);
  const LANGS = KIT.languages;
  const THEMES = KIT.themes;
  const FIELDS = [
    ['title', 'App name', 30, 'title.txt', false],
    ['shortDescription', 'Short description', 80, 'short-description.txt', false],
    ['fullDescription', 'Full description', 4000, 'full-description.txt', true],
    ['releaseNotes', 'Release notes', 500, 'release-notes.txt', false]
  ];
  let lang = LANGS[0];
  let theme = KIT.playTheme;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const png = file => KIT.version + '/' + theme + '/' + lang + '/' + file + revision;
  const webp = file => 'preview/' + theme + '/' + lang + '/' + file.replace(/\.png$/, '.webp') + revision;
  const zip = name => (KIT.zipBase || '') + name + (KIT.zipBase ? '' : revision);
  const themeName = t => KIT.themeNames[t] || t;
  const langOf = () => KIT.data[theme][lang];
  const list = items => items.join(', ').replace(/, ([^,]*)$/, ' and $1');

  // Header facts
  document.getElementById('version-line').textContent = 'Android ' + KIT.versionLabel + ' · ' + LANGS.length + ' languages · ' + THEMES.length + ' themes';
  document.getElementById('build-version').textContent = KIT.versionLabel;
  document.getElementById('build-package').textContent = KIT.package;
  document.getElementById('metadata-link').href = KIT.version + '/metadata.json' + revision;
  document.getElementById('lead').textContent = 'Preview and download the feature graphic, phone screenshots, icon and store descriptions in ' +
    list(LANGS.map(l => KIT.data[THEMES[0]][l].name)) + '. The theme dots in the header switch every asset between ' + list(THEMES.map(themeName)) + '.';

  // Language tabs
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = LANGS.map(l => `<button type="button" role="tab" id="tab-${esc(l)}" aria-selected="false" aria-controls="resources" data-lang="${esc(l)}" lang="${esc(l.split('-')[0])}" title="${esc(KIT.data[THEMES[0]][l].name)}">${esc(KIT.data[THEMES[0]][l].nativeName)}</button>`).join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) show(b.dataset.lang, theme); });
  tabs.addEventListener('keydown', e => {
    let i = LANGS.indexOf(lang);
    if (e.key === 'ArrowRight') i = (i + 1) % LANGS.length;
    else if (e.key === 'ArrowLeft') i = (i + LANGS.length - 1) % LANGS.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = LANGS.length - 1;
    else return;
    e.preventDefault(); show(LANGS[i], theme); document.getElementById('tab-' + LANGS[i]).focus();
  });

  // Theme: follow the site header. A ?theme= link applies its theme to this page
  // without touching the visitor's stored preference.
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('[data-site-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.siteTheme === t)));
    document.querySelectorAll('[data-site-theme-select]').forEach(s => { s.value = t; });
  }
  new MutationObserver(() => {
    const t = document.documentElement.dataset.theme;
    if (t && t !== theme && KIT.data[t]) show(lang, t);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function captureTag(s, d) {
    if (s.capture === 'themed') return `<span class="tag localized">${esc(d.name)} · ${esc(themeName(theme))} screen</span>`;
    if (s.capture === 'localized') return `<span class="tag localized">${esc(d.name)} screen</span>`;
    return '<span class="tag">English screen</span>';
  }

  function show(nextLang, nextTheme) {
    if (!KIT.data[nextTheme]) nextTheme = KIT.playTheme;
    if (!KIT.data[nextTheme][nextLang]) nextLang = LANGS[0];
    lang = nextLang; theme = nextTheme;
    const d = langOf();
    document.getElementById('status').textContent = '';
    if (!offline) { const url = new URL(location.href); url.searchParams.set('lang', lang); url.searchParams.set('theme', theme); history.replaceState(null, '', url); }
    tabs.querySelectorAll('[role=tab]').forEach(t => { const on = t.dataset.lang === lang; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    const langZip = document.getElementById('language-zip');
    langZip.href = zip('aastroastra-play-store-' + theme + '-' + lang + '.zip');
    langZip.textContent = 'Download ' + d.name + ' · ' + themeName(theme) + ' ZIP ↓';
    const allZip = document.getElementById('all-zip');
    allZip.href = zip('aastroastra-play-store-' + theme + '.zip');
    allZip.textContent = 'All languages · ' + themeName(theme) + ' ↓';
    const n = d.screenshots.length;
    const captures = d.themedCaptures === n ? 'Every phone shows the app in ' + d.name + ' and ' + themeName(theme) + '.'
      : d.localizedCaptures === n ? 'Every phone shows the app in ' + d.name + '; the app itself is captured in its default theme.'
      : (n - d.localizedCaptures) + ' of ' + n + ' phones show the reviewed English capture under a ' + d.name + ' caption.';
    document.getElementById('locale-note').textContent = (d.playLocale
      ? 'Play Console language ' + d.playLocale + '. '
      : d.name + ' is not a Google Play listing language yet; this copy is for the website, press and stores that accept it. ')
      + themeName(theme) + ' set. ' + captures;

    const shots = d.screenshots.map((s, i) => `
      <figure class="shot">
        <img src="${webp(s.file)}" width="540" height="960" loading="${i < 3 ? 'eager' : 'lazy'}" alt="${esc(s.title)}. ${esc(s.subtitle)}">
        <h4 lang="${esc(lang.split('-')[0])}">${esc(s.title)}</h4>
        <p lang="${esc(lang.split('-')[0])}">${esc(s.subtitle)}</p>
        <div class="row"><span class="index">${esc(s.file.replace('.png', ''))}</span>${captureTag(s, d)}</div>
        <a class="button small" download href="${png(s.file)}">Download PNG ↓</a>
      </figure>`).join('');

    const copies = FIELDS.map(([key, label, limit, file, wide]) => {
      const text = d[key]; const count = text.length;
      return `<article class="copy-card${wide ? ' wide' : ''}">
        <header><h3>${label}</h3><span class="count${count > limit ? ' over' : ''}">${count} / ${limit}</span></header>
        <pre id="copy-${key}" lang="${esc(lang.split('-')[0])}">${esc(text)}</pre>
        <div class="row"><button type="button" class="button small" data-copy="${key}">Copy text</button><a class="button small" download href="${png(file)}">Download .txt ↓</a></div>
      </article>`;
    }).join('');

    const iconPng = KIT.version + '/' + theme + '/icon-512.png' + revision;
    const iconWebp = 'preview/' + theme + '/icon-512.webp' + revision;
    const iconNote = theme === KIT.playTheme ? 'This is the icon on Google Play.' : 'Preview. Google Play carries one icon per app, currently the ' + themeName(KIT.playTheme) + ' one.';

    document.getElementById('resources').innerHTML = `
      <section class="kit" aria-labelledby="h-feature">
        <div class="section-top"><h2 id="h-feature">Feature graphic</h2><span class="muted">${esc(themeName(theme))}</span></div>
        <p class="spec">1024 × 500 px · PNG · 24-bit RGB · brand mark in the theme accent, localized tagline</p>
        <div class="feature">
          <img src="${webp('feature-graphic.png')}" width="768" height="375" alt="AastroAstra feature graphic, ${esc(d.name)}, ${esc(themeName(theme))}">
          <div><h3 lang="${esc(lang.split('-')[0])}">${esc(d.featureTagline)}</h3><p>The first thing a visitor sees at the top of the listing.</p><a class="button" download href="${png('feature-graphic.png')}">Download feature graphic ↓</a></div>
        </div>
      </section>
      <section class="kit" aria-labelledby="h-shots">
        <div class="section-top"><h2 id="h-shots">Phone screenshots</h2><span class="muted">${n} frames · carousel order · ${esc(themeName(theme))}</span></div>
        <p class="spec">1080 × 1920 px · PNG · 24-bit RGB · caption above the phone, status bar cropped</p>
        <div class="gallery">${shots}</div>
      </section>
      <section class="kit" aria-labelledby="h-copy">
        <div class="section-top"><h2 id="h-copy">Store listing</h2><span class="muted">counts are characters, as Play Console counts them</span></div>
        <p class="spec">Paste into Play Console → Main store listing → ${esc(d.playLocale || d.name)}. The text is the same in every theme.</p>
        <div class="copy-grid">${copies}</div>
      </section>
      <section class="kit" aria-labelledby="h-icon">
        <div class="section-top"><h2 id="h-icon">App icon</h2><span class="muted">${esc(themeName(theme))}</span></div>
        <p class="spec">512 × 512 px · PNG · brand mark in the theme accent on the theme background</p>
        <div class="icon"><img src="${iconWebp}" width="256" height="256" alt="AastroAstra app icon, ${esc(themeName(theme))}"><div><p class="muted">${iconNote}</p><a class="button" download href="${iconPng}">Download icon ↓</a></div></div>
      </section>`;
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyField(b.dataset.copy)));
  }

  async function copyField(key) {
    const status = document.getElementById('status');
    try {
      await navigator.clipboard.writeText(langOf()[key]);
      status.textContent = 'Copied to clipboard.';
    } catch (err) {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('copy-' + key));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      status.textContent = 'Text selected. Press Ctrl+C or Cmd+C to copy.';
    }
  }

  const params = new URLSearchParams(location.search);
  const wantedTheme = params.get('theme');
  const current = document.documentElement.dataset.theme;
  const startTheme = wantedTheme && KIT.data[wantedTheme] ? wantedTheme : (KIT.data[current] ? current : KIT.playTheme);
  if (startTheme !== current) applyTheme(startTheme);
  const wantedLang = params.get('lang');
  show(wantedLang && KIT.data[startTheme][wantedLang] ? wantedLang : LANGS[0], startTheme);
})();
