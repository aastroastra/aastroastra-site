// Play Store kit page. Data comes from kit-data.js (window.PLAY_KIT), generated
// by aastroastra-android/store/build-play-kit.py, so the page works from the
// "all languages" ZIP with no server.
(function () {
  'use strict';
  const KIT = window.PLAY_KIT;
  if (!KIT) { document.getElementById('resources').innerHTML = '<p class="notice">kit-data.js did not load. Run build-play-kit.py.</p>'; return; }
  const offline = location.protocol === 'file:';
  if (offline) document.documentElement.classList.add('offline');
  const revision = offline ? '' : '?v=' + encodeURIComponent(KIT.version + '-' + KIT.versionCode);
  const LANGS = KIT.languages;
  const FIELDS = [
    ['title', 'App name', 30, 'title.txt', false],
    ['shortDescription', 'Short description', 80, 'short-description.txt', false],
    ['fullDescription', 'Full description', 4000, 'full-description.txt', true],
    ['releaseNotes', 'Release notes', 500, 'release-notes.txt', false]
  ];
  let current = LANGS[0];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = (lang, file) => KIT.version + '/' + lang + '/' + file + revision;

  // Header facts
  document.getElementById('version-line').textContent = 'Android ' + KIT.versionLabel + ' · ' + LANGS.length + ' languages';
  document.getElementById('build-version').textContent = KIT.versionLabel;
  document.getElementById('build-package').textContent = KIT.package;
  document.getElementById('metadata-link').href = KIT.version + '/metadata.json' + revision;
  document.getElementById('all-zip').href = 'aastroastra-play-store-all.zip' + revision;
  document.getElementById('lead').textContent = 'Preview and download the feature graphic, phone screenshots and store descriptions in ' +
    LANGS.map(l => KIT.data[l].name).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';

  // Tabs
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = LANGS.map(l => `<button type="button" role="tab" id="tab-${esc(l)}" aria-selected="false" aria-controls="resources" data-lang="${esc(l)}" lang="${esc(l.split('-')[0])}" title="${esc(KIT.data[l].name)}">${esc(KIT.data[l].nativeName)}</button>`).join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) showLanguage(b.dataset.lang); });
  tabs.addEventListener('keydown', e => {
    let i = LANGS.indexOf(current);
    if (e.key === 'ArrowRight') i = (i + 1) % LANGS.length;
    else if (e.key === 'ArrowLeft') i = (i + LANGS.length - 1) % LANGS.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = LANGS.length - 1;
    else return;
    e.preventDefault(); showLanguage(LANGS[i]); document.getElementById('tab-' + LANGS[i]).focus();
  });

  function showLanguage(lang) {
    if (!Object.prototype.hasOwnProperty.call(KIT.data, lang)) lang = LANGS[0];
    current = lang;
    const d = KIT.data[lang];
    document.getElementById('status').textContent = '';
    if (!offline) { const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url); }
    tabs.querySelectorAll('[role=tab]').forEach(t => { const on = t.dataset.lang === lang; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    const zip = document.getElementById('language-zip');
    zip.href = 'aastroastra-play-store-' + lang + '.zip' + revision;
    zip.textContent = 'Download ' + d.name + ' ZIP ↓';
    document.getElementById('locale-note').textContent = d.playLocale
      ? 'Play Console language: ' + d.playLocale + '. ' + (d.localizedCaptures === d.screenshots.length ? 'Every phone shows the ' + d.name + ' screen.' : d.localizedCaptures + ' of ' + d.screenshots.length + ' phones show a ' + d.name + ' screen; the rest show the reviewed English capture under a ' + d.name + ' caption.')
      : d.name + ' is not a Google Play listing language yet. This copy is for the website, press and stores that accept it.';

    const shots = d.screenshots.map((s, i) => `
      <figure class="shot">
        <img src="${asset(lang, s.file)}" width="1080" height="1920" loading="${i < 3 ? 'eager' : 'lazy'}" alt="${esc(s.title)}. ${esc(s.subtitle)}">
        <h4 lang="${esc(lang.split('-')[0])}">${esc(s.title)}</h4>
        <p lang="${esc(lang.split('-')[0])}">${esc(s.subtitle)}</p>
        <div class="row"><span class="index">${esc(s.file.replace('.png', ''))}</span>${s.localizedCapture ? '<span class="tag localized">' + esc(d.name) + ' screen</span>' : '<span class="tag">English screen</span>'}</div>
        <a class="button small" download href="${asset(lang, s.file)}">Download PNG ↓</a>
      </figure>`).join('');

    const copies = FIELDS.map(([key, label, limit, file, wide]) => {
      const text = d[key]; const n = text.length;
      return `<article class="copy-card${wide ? ' wide' : ''}">
        <header><h3>${label}</h3><span class="count${n > limit ? ' over' : ''}">${n} / ${limit}</span></header>
        <pre id="copy-${key}" lang="${esc(lang.split('-')[0])}">${esc(text)}</pre>
        <div class="row"><button type="button" class="button small" data-copy="${key}">Copy text</button><a class="button small" download href="${asset(lang, file)}">Download .txt ↓</a></div>
      </article>`;
    }).join('');

    document.getElementById('resources').innerHTML = `
      <section class="kit" aria-labelledby="h-feature">
        <div class="section-top"><h2 id="h-feature">Feature graphic</h2></div>
        <p class="spec">1024 × 500 px · PNG · 24-bit RGB · localized tagline on the reviewed master</p>
        <div class="feature">
          <img src="${asset(lang, 'feature-graphic.png')}" width="1024" height="500" alt="AastroAstra feature graphic, ${esc(d.name)}">
          <div><h3 lang="${esc(lang.split('-')[0])}">${esc(d.featureTagline)}</h3><p>The first thing a visitor sees at the top of the listing.</p><a class="button" download href="${asset(lang, 'feature-graphic.png')}">Download feature graphic ↓</a></div>
        </div>
      </section>
      <section class="kit" aria-labelledby="h-shots">
        <div class="section-top"><h2 id="h-shots">Phone screenshots</h2><span class="muted">${d.screenshots.length} frames · carousel order</span></div>
        <p class="spec">1080 × 1920 px · PNG · 24-bit RGB · caption above the phone, status bar cropped</p>
        <div class="gallery">${shots}</div>
      </section>
      <section class="kit" aria-labelledby="h-copy">
        <div class="section-top"><h2 id="h-copy">Store listing</h2><span class="muted">counts are characters, as Play Console counts them</span></div>
        <p class="spec">Paste into Play Console → Main store listing → ${esc(d.playLocale || d.name)}</p>
        <div class="copy-grid">${copies}</div>
      </section>
      <section class="kit" aria-labelledby="h-icon">
        <div class="section-top"><h2 id="h-icon">App icon</h2></div>
        <p class="spec">512 × 512 px · PNG · the same icon for every language</p>
        <div class="icon"><img src="${KIT.version}/icon-512.png${revision}" width="512" height="512" alt="AastroAstra app icon"><div><p class="muted">Play Console → Main store listing → App icon</p><a class="button" download href="${KIT.version}/icon-512.png${revision}">Download icon ↓</a></div></div>
      </section>`;
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyField(b.dataset.copy)));
  }

  async function copyField(key) {
    const status = document.getElementById('status');
    try {
      await navigator.clipboard.writeText(KIT.data[current][key]);
      status.textContent = 'Copied to clipboard.';
    } catch (err) {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('copy-' + key));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      status.textContent = 'Text selected. Press Ctrl+C or Cmd+C to copy.';
    }
  }

  const wanted = new URLSearchParams(location.search).get('lang');
  showLanguage(wanted && KIT.data[wanted] ? wanted : LANGS[0]);
})();
