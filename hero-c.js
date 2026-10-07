/* Hero C, "The page is a kundali", the default hero (see index.html).
   Draws the North Indian chart at the stage's pixel size so every hairline is
   crisp and the geometry is exact: outer square, both full diagonals, and the
   inner diamond through the side midpoints, making twelve houses. The chart
   draws itself once (stroke-dashoffset), then the words arrive (CSS). Hover,
   focus or tap a house for one line of what it does. Nothing loops; the
   entrance waits until the hero is on screen in a visible tab. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hc = document.getElementById('hero-c');
  if (!hc || root.classList.contains('hero-a-on') || root.classList.contains('hero-b-on')) return;

  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = hc.querySelector('[data-hc-stage]');
  var svg = hc.querySelector('[data-hc-lines]');
  var cap = hc.querySelector('[data-hc-cap]');
  var labels = {};
  Array.prototype.forEach.call(hc.querySelectorAll('.hc-h'), function (b) { labels[b.getAttribute('data-h')] = b; });

  /* What each house holds. The bhava's own meaning comes first, then one
     truthful line about the feature that lives there. */
  var H = {
    1:  ['Self', 'तनु', 'Your birth chart from exact time and place, with dashas and yogas explained.', 'सटीक जन्म समय और स्थान से आपकी कुंडली, दशा और योग समझाए हुए।'],
    2:  ['Face', 'मुख', 'One photo of your face, read in plain words.', 'चेहरे की एक फ़ोटो, सरल शब्दों में पढ़ी हुई।'],
    3:  ['Hands', 'हाथ', 'Photograph your palm and it reads the major lines.', 'हथेली की फ़ोटो लें, यह मुख्य रेखाएं पढ़ती है।'],
    4:  ['Home', 'सुख', 'Today’s tithi, nakshatra and muhurat for your city.', 'आपके शहर के लिए आज की तिथि, नक्षत्र और मुहूर्त।'],
    5:  ['Intellect', 'बुद्धि', 'Ask AshvaAI anything about your chart. Every answer shows its working.', 'अपनी कुंडली के बारे में AshvaAI से कुछ भी पूछें। हर जवाब अपना हिसाब दिखाता है।'],
    6:  ['Daily life', 'दिनचर्या', 'Chaldean name numbers and your Lo Shu grid, with the full working.', 'कैल्डियन नामांक और आपका लो शू ग्रिड, पूरे हिसाब के साथ।'],
    7:  ['Marriage', 'विवाह', 'Ashtakoota matching out of 36 gunas, every koota and dosha explained.', '36 गुणों का अष्टकूट मिलान, हर कूट और दोष समझाया हुआ।'],
    8:  ['Hidden', 'गूढ़', 'Lal Kitab readings and simple remedies from your own chart.', 'आपकी अपनी कुंडली से लाल किताब फल और सरल उपाय।'],
    9:  ['Fortune', 'भाग्य', 'Daily, weekly and monthly horoscope for your sign.', 'आपकी राशि का दैनिक, साप्ताहिक और मासिक राशिफल।'],
    10: ['Karma', 'कर्म', 'Kundali, matching and numerology reports as PDFs to keep and share.', 'कुंडली, मिलान और अंक ज्योतिष रिपोर्ट, PDF में रखने और भेजने के लिए।'],
    11: ['Gains', 'लाभ', 'Rank several kundalis against yours in one go.', 'कई कुंडलियों को एक साथ अपनी कुंडली से मिलाकर क्रम में देखें।'],
    12: ['Moksha', 'मोक्ष', 'Pooja booking and astrologer calls, in preparation.', 'पूजा बुकिंग और ज्योतिषी से कॉल, तैयारी में।']
  };
  function hi() { return root.getAttribute('data-lang') === 'hi'; }
  function setHint() { cap.setAttribute('data-hint', hi() ? 'किसी भाव को छुएं' : 'Tap a house'); }
  setHint();

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- The chart ---------- */
  var drawn = reduce, want = false, hits = {};
  function pts(a) { return a.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function build() {
    var r = stage.getBoundingClientRect();
    var W = Math.round(r.width), Ht = Math.round(r.height);
    if (W < 10 || Ht < 10) return;
    lastW = W; lastH = Ht;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Ht);
    svg.innerHTML = '';
    // Half a pixel in so the 1px frame lands on whole device pixels.
    var o = .5, L = o, T = o, R = W - o, B = Ht - o, cx = W / 2, cy = Ht / 2;
    var q = { tm: [cx, T], rm: [R, cy], bm: [cx, B], lm: [L, cy], tl: [L, T], tr: [R, T], br: [R, B], bl: [L, B], c: [cx, cy],
      // Where the diagonals cross the inner diamond.
      ul: [(L + cx) / 2, (T + cy) / 2], ur: [(R + cx) / 2, (T + cy) / 2], ll: [(L + cx) / 2, (B + cy) / 2], lr: [(R + cx) / 2, (B + cy) / 2] };
    // Houses, counter-clockwise from Lagna at the top, as in a real chart.
    var house = {
      1: [q.tm, q.ur, q.c, q.ul], 2: [q.tl, q.tm, q.ul], 3: [q.tl, q.ul, q.lm], 4: [q.lm, q.ul, q.c, q.ll],
      5: [q.lm, q.ll, q.bl], 6: [q.bl, q.ll, q.bm], 7: [q.bm, q.ll, q.c, q.lr], 8: [q.bm, q.lr, q.br],
      9: [q.br, q.lr, q.rm], 10: [q.rm, q.lr, q.c, q.ur], 11: [q.rm, q.ur, q.tr], 12: [q.tr, q.ur, q.tm]
    };
    var g = el('g', {}, svg);
    for (var h = 1; h <= 12; h++) {
      hits[h] = el('polygon', { 'class': 'hit', 'data-h': h, points: pts(house[h]) }, g);
    }
    function P(d) { return 'M' + d.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L'); }
    // The frame from the Lagna point both ways, the diagonals, the diamond.
    var lines = [
      // [class, path, delay ms, duration ms]
      ['hl', P([q.tm, q.tr, q.br, q.bm]), '0,1800'], ['hl', P([q.tm, q.tl, q.bl, q.bm]), '0,1800'],
      ['hl', P([q.tl, q.br]), '150,1700'], ['hl', P([q.tr, q.bl]), '150,1700'],
      ['hl', P([q.tm, q.rm, q.bm]), '300,1600'], ['hl', P([q.tm, q.lm, q.bm]), '300,1600'],
      ['lagna', P([q.ul, q.tm, q.ur]), '1650,1000']
    ];
    lines.forEach(function (d) {
      var p = el('path', { 'class': d[0], d: d[1], 'data-t': d[2] }, svg);
      var len = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = len + ' ' + len;
      p.style.strokeDashoffset = drawn ? '0' : String(len);
      p._len = len;
    });
    if (want && !drawn) draw();
  }

  // The draw waits for the lines to exist (hero-c.css may land after this
  // script) and for the hero to be on screen in a visible tab.
  function draw() {
    want = true;
    if (drawn || !svg.querySelector('path')) return;
    drawn = true;
    Array.prototype.forEach.call(svg.querySelectorAll('path'), function (p) {
      var t = p.getAttribute('data-t').split(',');
      p.style.strokeDashoffset = '0';
      if (p.animate) {
        anims.push(p.animate([{ strokeDashoffset: p._len }, { strokeDashoffset: 0 }],
          { delay: +t[0], duration: +t[1], easing: 'cubic-bezier(.45,0,.15,1)', fill: 'backwards' }));
      }
    });
  }
  var anims = [];

  var lastW = 0, lastH = 0;
  build();
  if ('ResizeObserver' in window) {
    new ResizeObserver(function (es) {
      var c = es[0].contentRect;
      if (Math.round(c.width) === lastW && Math.round(c.height) === lastH) return;
      lastW = Math.round(c.width); lastH = Math.round(c.height);
      build(); hide();
    }).observe(stage);
  } else {
    window.addEventListener('resize', function () { build(); hide(); });
  }

  /* ---------- One line per house ---------- */
  var active = null, pinned = null;
  var narrow = window.matchMedia ? matchMedia('(max-width: 768px)') : { matches: false };
  function show(h) {
    h = String(h);
    var d = H[h];
    if (!d || !d[2]) { hide(); return; }
    if (active && active !== h) off(active);
    active = h;
    labels[h].classList.add('on');
    if (hits[h]) hits[h].classList.add('on');
    var x = hi();
    cap.innerHTML = '<small>' + (x ? 'भाव ' : 'House ') + h + ' · ' + (x ? d[1] : d[0]) + '</small>' + (x ? d[3] : d[2]);
    if (!narrow.matches) place(labels[h]);
    cap.classList.add('show');
  }
  function off(h) { labels[h].classList.remove('on'); if (hits[h]) hits[h].classList.remove('on'); }
  function hide() {
    if (active) off(active);
    active = null; pinned = null;
    cap.classList.remove('show');
    if (narrow.matches) cap.innerHTML = '';
  }
  // Below the label if it fits, else beside it, else above; never over the words.
  var copy = hc.querySelector('.hc-copy');
  function place(lab) {
    var box = hc.getBoundingClientRect(), r = lab.getBoundingClientRect();
    var cw = cap.offsetWidth, ch = cap.offsetHeight, g = 8;
    var mx = r.left + r.width / 2 - box.left, my = r.top + r.height / 2 - box.top;
    var tries = [
      [mx - cw / 2, r.bottom - box.top + 2],
      [r.right - box.left + g, my - ch / 2],
      [r.left - box.left - g - cw, my - ch / 2],
      [mx - cw / 2, r.top - box.top - ch - 2]
    ];
    var sr0 = stage.getBoundingClientRect();
    var sl = sr0.left - box.left + 4, st = sr0.top - box.top + 4, sr = sr0.right - box.left - 4, sb = sr0.bottom - box.top - 4;
    function rel(q, pad) { return { l: q.left - box.left - pad, t: q.top - box.top - pad, r: q.right - box.left + pad, b: q.bottom - box.top + pad }; }
    // Keep clear of the words and of every other house label.
    var avoid = [];
    // The inked extent of each line of words, not the full-width box.
    Array.prototype.forEach.call(copy.children, function (n) {
      var rg = document.createRange(); rg.selectNodeContents(n);
      avoid.push(rel(rg.getBoundingClientRect(), 4));
    });
    for (var k in labels) if (labels[k] !== lab) avoid.push(rel(labels[k].getBoundingClientRect(), 4));
    // First candidate that is clear wins; otherwise the one that overlaps least.
    function ov(x, y, c) { return Math.max(0, Math.min(x + cw, c.r) - Math.max(x, c.l)) * Math.max(0, Math.min(y + ch, c.b) - Math.max(y, c.t)); }
    var pick = null, best = Infinity;
    for (var i = 0; i < tries.length; i++) {
      // Slide sideways to stay inside the chart before judging a spot.
      var x = Math.max(sl, Math.min(sr - cw, tries[i][0])), y = tries[i][1];
      tries[i][0] = x;
      var out = cw * ch - ov(x, y, { l: sl, t: st, r: sr, b: sb });
      var cost = out * 2;
      avoid.forEach(function (c) { cost += ov(x, y, c); });
      if (cost < best - .5) { best = cost; pick = tries[i]; }
      if (cost === 0) break;
    }
    cap.style.left = Math.round(Math.max(0, Math.min(box.width - cw, pick[0]))) + 'px';
    cap.style.top = Math.round(pick[1]) + 'px';
  }

  function houseOf(t) { var n = t.closest && t.closest('[data-h]'); return n && hc.contains(n) ? n.getAttribute('data-h') : null; }
  hc.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || pinned) return;
    var h = houseOf(e.target);
    if (h) show(h);
  });
  stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !pinned) hide(); });
  hc.addEventListener('click', function (e) {
    var h = houseOf(e.target);
    if (!h) return;
    if (pinned === h) { hide(); return; }
    show(h); pinned = active ? h : null;
  });
  hc.addEventListener('focusin', function (e) { var h = houseOf(e.target); if (h && !pinned) show(h); });
  hc.addEventListener('focusout', function (e) { if (!pinned && !(e.relatedTarget && houseOf(e.relatedTarget))) hide(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) hide(); });
  document.addEventListener('pointerdown', function (e) { if (pinned && !houseOf(e.target)) hide(); });
  new MutationObserver(function () { setHint(); var a = active, p = pinned; if (a) { show(a); pinned = p; } })
    .observe(root, { attributes: true, attributeFilter: ['data-lang'] });

  /* The gold sheen crosses the wordmark again on hover (fine pointers only). */
  var word = hc.querySelector('.hc-word'), sweeping = true;
  if (word && !reduce) {
    word.addEventListener('animationend', function (e) { if (e.animationName === 'hc-sweep') sweeping = false; });
    word.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || sweeping) return;
      if (!word.animate) return;
      sweeping = true;
      word.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0 0' }],
        { duration: 1300, easing: 'cubic-bezier(.45,0,.25,1)' })
        .finished.then(function () { sweeping = false; }, function () { sweeping = false; });
    });
  }

  /* ---------- People count under the badges ----------
     stats.json (update-stats.py): users_display = real accounts (never guests,
     team and test accounts removed), rounded down to a friendly bucket
     ("90+"). Null below 10 or when unknown, and the line stays empty. Its
     height is reserved in CSS, so filling it shifts nothing. */
  var stat = hc.querySelector('[data-hc-stat]');
  if (stat && window.fetch) {
    fetch('https://gttszlununmqivrqevwv.supabase.co/storage/v1/object/public/site/stats.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
        var u = st && typeof st.users_display === 'string' && /^[0-9][0-9.]*k?\+$/.test(st.users_display) ? st.users_display : null;
        if (!u) return;
        stat.innerHTML = '<span lang="en"><b>' + u + '</b> people use AstroAshva</span>' +
          '<span lang="hi"><b>' + u + '</b> \u0932\u094b\u0917 AstroAshva \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902</span>';
      }).catch(function () {});
  }

  /* ---------- Scroll cue (phones): to the next section, gone once scrolling ---------- */
  var cue = hc.querySelector('[data-hc-cue]');
  if (cue) {
    var setCueLabel = function () { cue.setAttribute('aria-label', hi() ? 'और जानने के लिए नीचे स्क्रॉल करें' : 'Scroll to learn more'); };
    setCueLabel();
    new MutationObserver(setCueLabel).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
    cue.addEventListener('click', function () {
      var n = hc.nextElementSibling;
      while (n && (n.offsetParent === null || n.offsetHeight === 0)) n = n.nextElementSibling;
      if (n) n.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    var onScroll = function () { cue.classList.toggle('gone', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Phones: hero B's sky, faint, behind the words ----------
     The zodiac ring (12 rashis, 27 nakshatra ticks) and the nine grahas on
     their orbits, with hero B's glyphs, periods and start angles. Drawn once,
     only on phones; CSS turns it (paused with the hero, still for reduced
     motion). Decorative: aria-hidden, no pointer events. */
  var sky = hc.querySelector('[data-hc-sky]');
  var SKY = [ // [id, orbit share, period s, start rad, dir, glyph] from hero-b.js
    ['mo', .41, 15, 2.86, 1, '<path class="f" d="M8.2 3a9.2 9.2 0 0 1 0 18a12 12 0 0 0 0-18z"/>'],
    ['me', .5, 21, 3.07, 1, '<circle cx="12" cy="12" r="4.3"/><path d="M7.8 3a4.2 4.2 0 0 0 8.4 0M12 16.3V22M9 19.2h6"/>'],
    ['ve', .58, 26, 5.99, 1, '<circle cx="12" cy="8.6" r="5.4"/><path d="M12 14v8M8.6 18.3h6.8"/>'],
    ['su', .65, 31, 0.51, 1, '<circle cx="12" cy="12" r="8.2"/><circle class="f" cx="12" cy="12" r="2.3"/>'],
    ['ma', .71, 37, 3.41, 1, '<circle cx="10" cy="14" r="5.6"/><path d="M14 10l5.6-5.6M14.6 4.4h5v5"/>'],
    ['ju', .77, 48, 2.81, 1, '<path d="M5.4 8.2C5.4 4.4 11.2 4 11.2 8.2c0 3.4-3.6 5.6-6.2 8H19M15.6 3.6V21"/>'],
    ['ra', .83, 56, 5.98, -1, '<path d="M7.6 16.6C3.4 12.6 5 4.6 12 4.6s8.6 8 4.4 12"/><circle cx="7" cy="18.8" r="2.2"/><circle cx="17" cy="18.8" r="2.2"/>'],
    ['ke', .83, 56, 5.98 + Math.PI, -1, '<path d="M7.6 7.4C3.4 11.4 5 19.4 12 19.4s8.6-8 4.4-12"/><circle cx="7" cy="5.2" r="2.2"/><circle cx="17" cy="5.2" r="2.2"/>'],
    ['sa', .9, 66, 0.21, 1, '<path d="M6.4 5.2h6.2M9.5 2.4V19M9.5 12.6c0-3.6 6.6-4 6.6 0 0 3-3 4-3 6.5 0 2 2.1 2.6 3.9 1.2"/>']
  ];
  function drawSky() {
    if (!sky || sky.firstChild) return;
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols&display=swap&text=' + encodeURIComponent('\u2648\u2649\u264a\u264b\u264c\u264d\u264e\u264f\u2650\u2651\u2652\u2653');
    document.head.appendChild(f);
    var svg = el('svg', { viewBox: '-100 -100 200 200', focusable: 'false' }, sky);
    var ring = el('g', { 'class': 'ring' }, svg);
    el('circle', { r: 97, 'class': 'rc' }, ring);
    el('circle', { r: 88, 'class': 'rc' }, ring);
    el('circle', { r: 84.6, 'class': 'rc' }, ring);
    for (var i = 0; i < 12; i++) {
      var a = i * 30;
      el('line', { x1: 0, y1: -88, x2: 0, y2: -97, 'class': 'div', transform: 'rotate(' + a + ')' }, ring);
      el('text', { x: 0, y: -92.5, transform: 'rotate(' + (a + 15) + ')' }, ring).textContent = String.fromCharCode(0x2648 + i) + '\ufe0e';
    }
    for (var n = 0; n < 27; n++) {
      el('line', { x1: 0, y1: -84.6, x2: 0, y2: n % 9 === 0 ? -80.6 : -82.4, 'class': 'tick', transform: 'rotate(' + (n * 360 / 27) + ')' }, ring);
    }
    var R = 80;
    SKY.forEach(function (g) {
      var r = g[1] * R;
      if (g[0] !== 'ke') el('circle', { r: r, 'class': 'orb' }, svg);
      // Start where hero B starts: a negative delay of start / (2 pi) of a period.
      var spin = el('g', { 'class': 'spin' + (g[4] < 0 ? ' rev' : '') }, svg);
      var frac = g[3] / (Math.PI * 2);
      if (g[4] < 0) frac = 1 - frac;
      spin.style.setProperty('--p', g[2] + 's');
      spin.style.setProperty('--d', (-frac * g[2]).toFixed(2) + 's');
      spin.setAttribute('transform', reduce ? 'rotate(' + (g[3] * 180 / Math.PI) + ')' : '');
      var at = el('g', { transform: 'translate(' + r.toFixed(2) + ' 0)' }, spin);
      var up = el('g', { 'class': 'up', transform: reduce ? 'rotate(' + (-g[3] * 180 / Math.PI) + ')' : '' }, at);
      up.style.setProperty('--p', g[2] + 's');
      up.style.setProperty('--d', (-frac * g[2]).toFixed(2) + 's');
      var gl = el('g', { 'class': 'gl ' + g[0], transform: 'translate(-6 -6) scale(.5)' }, up);
      gl.innerHTML = g[5];
    });
  }
  var phone = window.matchMedia ? matchMedia('(max-width: 768px)') : null;
  if (sky && phone) {
    if (phone.matches) drawSky();
    var onPhone = function () { if (phone.matches) drawSky(); };
    if (phone.addEventListener) phone.addEventListener('change', onPhone); else if (phone.addListener) phone.addListener(onPhone);
  }

  /* ---------- Entrance and pausing ----------
     The chart draws when it is on screen: at once on desktop, on scroll on
     phones, where the words fill the first screen. The house words follow. */
  var visible = true, stageSeen = true;
  function setRunning() {
    var run = visible && !document.hidden;
    hc.classList.toggle('paused', !run);
    anims.forEach(function (a) { if (a.playState === 'running' && !run) a.pause(); else if (a.playState === 'paused' && run) a.play(); });
    if (run && stageSeen) { draw(); stage.classList.add('go'); }
  }
  if (!reduce) {
    if ('IntersectionObserver' in window) {
      stageSeen = false;
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; setRunning(); }).observe(hc);
      var so = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { stageSeen = true; so.disconnect(); setRunning(); }
      }, { threshold: .25 });
      so.observe(stage);
    }
    document.addEventListener('visibilitychange', setRunning);
    requestAnimationFrame(function () { requestAnimationFrame(setRunning); });
  } else {
    stage.classList.add('go');
  }
})();
