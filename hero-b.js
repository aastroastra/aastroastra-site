/* Hero variant B, "Navagraha orbit". Loaded only for ?hero=b (see index.html).
   The nine grahas orbit a phone of real app screens on tilted ellipses; every
   so often they settle into a North Indian chart and release again. One
   requestAnimationFrame loop, transforms and opacity only; it stops off screen,
   in a hidden tab, and for prefers-reduced-motion (a still, arranged sky). */
(function () {
  'use strict';
  var root = document.documentElement;
  var hb = document.getElementById('hero-b');
  if (!hb || !root.classList.contains('hero-b-on')) return;
  hb.hidden = false;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var TAU = Math.PI * 2;
  var stage = hb.querySelector('[data-hb-stage]');
  var tilt = hb.querySelector('[data-hb-tilt]');
  var ring = hb.querySelector('[data-hb-ring]');
  var dust = hb.querySelector('[data-hb-dust]');
  var back = hb.querySelector('[data-hb-back]');
  var front = hb.querySelector('[data-hb-front]');
  var phone = hb.querySelector('[data-hb-phone]');
  var screen = hb.querySelector('[data-hb-screen]');
  var chart = hb.querySelector('[data-hb-chart]');
  var holder = hb.querySelector('[data-hb-grahas]');
  var tip = hb.querySelector('[data-hb-tip]');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* Rashi glyphs need a font that has them; a subset of Noto Sans Symbols. */
  var RASHI = '♈♉♊♋♌♍♎♏♐♑♒♓';
  var f = document.createElement('link');
  f.rel = 'stylesheet';
  f.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols&display=swap&text=' + encodeURIComponent(RASHI);
  document.head.appendChild(f);

  /* ---------- The nine grahas ----------
     k: orbit size (share of the stage radius), tilt in degrees, period in
     seconds (Moon fastest, Saturn slowest), dir -1 for Rahu and Ketu.
     house: where each sits in the sample chart of the chart moment. */
  var G = [
    { id: 'mo', en: 'Chandra', enx: 'Moon', hi: 'चंद्र', k: .41, t: -15, p: 15, house: 4,
      svg: '<path class="f" d="M8.2 3a9.2 9.2 0 0 1 0 18a12 12 0 0 0 0-18z"/>',
      ten: 'Your Rashi and Nakshatra', thi: 'आपकी राशि और नक्षत्र' },
    { id: 'me', en: 'Budh', enx: 'Mercury', hi: 'बुध', k: .5, t: 10, p: 21, house: 11,
      svg: '<circle cx="12" cy="12" r="4.3"/><path d="M7.8 3a4.2 4.2 0 0 0 8.4 0M12 16.3V22M9 19.2h6"/>',
      ten: 'Speech, intellect and business', thi: 'वाणी, बुद्धि और व्यापार' },
    { id: 've', en: 'Shukra', enx: 'Venus', hi: 'शुक्र', k: .58, t: -24, p: 26, house: 9,
      svg: '<circle cx="12" cy="8.6" r="5.4"/><path d="M12 14v8M8.6 18.3h6.8"/>',
      ten: 'Love, marriage and comforts', thi: 'प्रेम, विवाह और सुख-सुविधा' },
    { id: 'su', en: 'Surya', enx: 'Sun', hi: 'सूर्य', k: .65, t: 17, p: 31, house: 10,
      svg: '<circle cx="12" cy="12" r="8.2"/><circle class="f" cx="12" cy="12" r="2.3"/>',
      ten: 'Your Sun sign, self and authority', thi: 'आपकी सूर्य राशि, आत्मा और अधिकार' },
    { id: 'ma', en: 'Mangal', enx: 'Mars', hi: 'मंगल', k: .71, t: -6, p: 37, house: 1,
      svg: '<circle cx="10" cy="14" r="5.6"/><path d="M14 10l5.6-5.6M14.6 4.4h5v5"/>',
      ten: 'Mangal dosha, energy and courage', thi: 'मंगल दोष, ऊर्जा और साहस' },
    { id: 'ju', en: 'Guru', enx: 'Jupiter', hi: 'गुरु', k: .77, t: 23, p: 48, house: 7,
      svg: '<path d="M5.4 8.2C5.4 4.4 11.2 4 11.2 8.2c0 3.4-3.6 5.6-6.2 8H19M15.6 3.6V21"/>',
      ten: 'Blessings, teachers and the 9th house', thi: 'आशीर्वाद, गुरु और नवम भाव' },
    { id: 'ra', en: 'Rahu', enx: 'North node', hi: 'राहु', k: .83, t: -11, p: 56, dir: -1, house: 12, node: 1,
      svg: '<path d="M7.6 16.6C3.4 12.6 5 4.6 12 4.6s8.6 8 4.4 12"/><circle cx="7" cy="18.8" r="2.2"/><circle cx="17" cy="18.8" r="2.2"/>',
      ten: 'The karmic axis in your chart, opposite Ketu', thi: 'आपकी कुंडली की कर्म-धुरी, केतु के ठीक सामने' },
    { id: 'ke', en: 'Ketu', enx: 'South node', hi: 'केतु', k: .83, t: -11, p: 56, dir: -1, house: 6, node: 1, twin: 'ra',
      svg: '<path d="M7.6 7.4C3.4 11.4 5 19.4 12 19.4s8.6-8 4.4-12"/><circle cx="7" cy="5.2" r="2.2"/><circle cx="17" cy="5.2" r="2.2"/>',
      ten: 'The karmic axis in your chart, opposite Rahu', thi: 'आपकी कुंडली की कर्म-धुरी, राहु के ठीक सामने' },
    { id: 'sa', en: 'Shani', enx: 'Saturn', hi: 'शनि', k: .9, t: 6, p: 66, house: 3,
      svg: '<path d="M6.4 5.2h6.2M9.5 2.4V19M9.5 12.6c0-3.6 6.6-4 6.6 0 0 3-3 4-3 6.5 0 2 2.1 2.6 3.9 1.2"/>',
      ten: 'Sade Sati and your 10th house of work', thi: 'साढ़े साती और कर्म का दशम भाव' }
  ];
  // North Indian chart (outer square, both diagonals, inner diamond on the side
  // midpoints): the centroid of each of the 12 houses, as a share of the square.
  // Kendras are diamonds centred a quarter in; the rest are triangles.
  var T = 1 / 12;
  var HOUSE = [null, [.5, .25], [.25, T], [T, .25], [.25, .5], [T, .75], [.25, 1 - T], [.5, .75], [.75, 1 - T], [1 - T, .75], [.75, .5], [1 - T, .25], [.75, T]];
  var B = .33, TRAILS = 6, TSTEP = .055;
  var byId = {};
  // Starting angles, chosen so the nine are spread out and clear of the phone
  // (also the still sky for prefers-reduced-motion).
  var START = [2.86, 3.07, 5.99, 0.51, 3.41, 2.81, 5.98, 0, 0.21];

  G.forEach(function (g, i) {
    byId[g.id] = g;
    g.i = i; g.dir = g.dir || 1; g.hold = false;
    g.w = TAU / g.p * g.dir;
    g.th = START[i];
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hb-g g-' + g.id;
    b.style.setProperty('--c', 'var(--g-' + g.id + ')');
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', g.en + ' (' + g.enx + '): ' + g.ten);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + g.svg + '</svg>';
    g.btn = b;
    g.trail = [];
    for (var k = 0; k < TRAILS; k++) {
      var d = document.createElement('i');
      d.className = 'hb-trail'; d.setAttribute('aria-hidden', 'true');
      d.style.setProperty('--c', 'var(--g-' + g.id + ')');
      holder.appendChild(d); g.trail.push(d);
    }
    holder.appendChild(b);
  });
  byId.ke.th = byId.ra.th + Math.PI;

  /* ---------- Zodiac ring: 12 rashis, 27 nakshatra ticks ---------- */
  (function () {
    el('circle', { r: 97, class: 'rc' }, ring);
    el('circle', { r: 88, class: 'rc' }, ring);
    el('circle', { r: 84.6, class: 'rc thin' }, ring);
    for (var i = 0; i < 12; i++) {
      var a = i * 30, r = a * Math.PI / 180;
      el('line', { x1: 0, y1: -88, x2: 0, y2: -97, class: 'div', transform: 'rotate(' + a + ')' }, ring);
      var t = el('text', { x: 0, y: -92.5, transform: 'rotate(' + (a + 15) + ')' }, ring);
      t.textContent = RASHI.charAt(i) + '︎';
    }
    for (var n = 0; n < 27; n++) {
      el('line', { x1: 0, y1: -84.6, x2: 0, y2: n % 9 === 0 ? -80.6 : -82.4, class: 'tick', transform: 'rotate(' + (n * 360 / 27) + ')' }, ring);
    }
  })();

  /* ---------- Star dust: seeded, so every visit draws the same sky ---------- */
  (function () {
    var s = 7;
    var rnd = function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    dust.setAttribute('viewBox', '0 0 100 100');
    var groups = [el('g', {}, dust), el('g', { class: 'tw1' }, dust), el('g', { class: 'tw2' }, dust)];
    for (var i = 0; i < 90; i++) {
      var ang = rnd() * TAU, rad = Math.sqrt(rnd()) * 54;
      var x = 50 + Math.cos(ang) * rad, y = 50 + Math.sin(ang) * rad;
      el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: (0.12 + rnd() * rnd() * 0.42).toFixed(2), opacity: (0.12 + rnd() * 0.38).toFixed(2) }, groups[i % 3]);
    }
  })();

  /* ---------- Orbit paths: full ellipses behind the phone, near halves in front ---------- */
  var W = 0, C = 0, R = 0, orbitEls = {};
  function drawOrbits() {
    [back, front].forEach(function (svg) { svg.innerHTML = ''; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + W); });
    orbitEls = {};
    G.forEach(function (g) {
      if (g.twin) return;
      var a = g.k * R, b = a * B, tf = 'translate(' + C + ' ' + C + ') rotate(' + g.t + ')';
      var cls = g.node ? 'nodes' : '';
      var e1 = el('ellipse', { rx: a, ry: b, transform: tf, class: cls }, back);
      var e2 = el('path', { d: 'M' + a + ' 0A' + a + ' ' + b + ' 0 0 1 ' + (-a) + ' 0', transform: tf, class: cls }, front);
      e1.style.setProperty('--c', 'var(--g-' + g.id + ')');
      e2.style.setProperty('--c', 'var(--g-' + g.id + ')');
      orbitEls[g.id] = [e1, e2];
    });
  }
  function measure() {
    W = stage.clientWidth; C = W / 2; R = W / 2;
    drawOrbits();
    render(0);
  }

  /* ---------- Phone screens: the hero's light and dark capture sets ---------- */
  var DARK = { '01-dashboard': 1, '12-kundali-hero': 1, '13-kundali-chart': 1, '05-multimatch-results': 1, '23-panchang': 1 };
  var LIGHT_SET = ['12-kundali-hero', '23-panchang', '09-match-score', '05-multimatch-results', '22-horoscope-daily', '13-kundali-chart'];
  var DARK_SET = ['01-dashboard', '12-kundali-hero', '23-panchang', '05-multimatch-results', '13-kundali-chart'];
  var CHART_SHOT = '13-kundali-chart';
  var shots = [], shotOn = 0, shotKey = '';
  function variant() {
    var t = root.getAttribute('data-theme') || '';
    return t === 'yellow-dark' ? 'yd' : t === 'mono-dark' ? 'md' : '';
  }
  function buildShots() {
    var v = variant(), lang = root.getAttribute('data-lang') === 'hi' ? 'hi' : 'en';
    var key = v + lang;
    if (key === shotKey) return;
    shotKey = key;
    var cur = shots.length ? shots[shotOn].getAttribute('data-name') : null;
    screen.innerHTML = '';
    shots = (v ? DARK_SET : LIGHT_SET).map(function (name, i) {
      var base = 'shots/landing/' + lang + '/' + (v && DARK[name] ? v + '/' : '') + name;
      var img = new Image();
      img.alt = ''; img.decoding = 'async';
      img.setAttribute('data-name', name);
      if (i > 0) img.loading = 'lazy';
      img.width = 540; img.height = 1110;
      img.sizes = '(max-width: 768px) 160px, 230px';
      img.srcset = base + '-360.webp 360w, ' + base + '-540.webp 540w';
      img.src = base + '-540.webp';
      screen.appendChild(img);
      return img;
    });
    var idx = cur ? Math.max(0, shots.map(function (s) { return s.getAttribute('data-name'); }).indexOf(cur)) : 0;
    shotOn = idx;
    shots[idx].classList.add('on');
  }
  function showShot(i) {
    if (!shots.length) return;
    i = (i + shots.length) % shots.length;
    if (i === shotOn) return;
    shots[shotOn].classList.remove('on');
    shots[i].classList.add('on');
    shotOn = i;
  }
  function nextShot() {
    var i = shotOn + 1;
    // The chart screen is kept for the moment after the chart forms.
    if (shots[i % shots.length] && shots[i % shots.length].getAttribute('data-name') === CHART_SHOT) i++;
    showShot(i);
  }
  function showChartShot() {
    for (var i = 0; i < shots.length; i++) if (shots[i].getAttribute('data-name') === CHART_SHOT) { showShot(i); return; }
  }

  /* ---------- One frame ---------- */
  var align = 0;           // 0 = orbiting, 1 = settled in the chart
  var entrance = 0;        // seconds since the sky started
  var tx = 0, ty = 0, cx = 0, cy = 0; // parallax target and current
  var pinned = null;       // graha whose tooltip is open
  var lastDraw = false;

  function pos(g, th) {
    var a = g.k * R, b = a * B, rad = g.t * Math.PI / 180;
    var x0 = a * Math.cos(th), y0 = b * Math.sin(th);
    var cs = Math.cos(rad), sn = Math.sin(rad);
    return { x: C + x0 * cs - y0 * sn, y: C + x0 * sn + y0 * cs, d: Math.sin(th) };
  }
  function render() {
    if (!W) return;
    var w = ease(align), cw = W * .62;
    G.forEach(function (g) {
      var o = pos(g, g.th);
      // Entrance: each graha drifts in from beyond the ring, one after another.
      var e = reduce ? 1 : easeOut((entrance - .35 - g.i * .09) / 1.3);
      var out = 1 + (1 - e) * .9;
      var ox = C + (o.x - C) * out, oy = C + (o.y - C) * out;
      var h = HOUSE[g.house];
      var hx = C + (h[0] - .5) * cw, hy = C + (h[1] - .5) * cw;
      var x = ox + (hx - ox) * w, y = oy + (hy - oy) * w;
      var depth = (o.d + 1) / 2;   // 0 far side, 1 near side
      var sc = (.74 + .34 * depth) * (1 - w) + 1 * w;
      var op = (.5 + .5 * depth) * (1 - w) + w;
      g.btn.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
      g.btn.style.opacity = (op * e).toFixed(3);
      var z = (o.d > 0 || w > .5) ? 5 : 1;
      if (g.z !== z) { g.z = z; g.btn.style.zIndex = z; }
      g.x = x; g.y = y; g.sc = sc;
      // Fading trail behind each graha (gone while it is held or in the chart).
      var tv = reduce ? 0 : (1 - w) * e * (g.hold ? 0 : 1);
      for (var k = 0; k < TRAILS; k++) {
        var d = g.trail[k];
        if (!tv) { if (d.style.opacity !== '0') d.style.opacity = '0'; continue; }
        var p = pos(g, g.th - g.dir * TSTEP * (k + 1) * (15 / g.p + .4));
        var ts = (1 - (k + 1) / (TRAILS + 1)) * (.7 + .5 * (p.d + 1) / 2);
        d.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scale(' + ts.toFixed(2) + ')';
        d.style.opacity = (tv * .55 * (1 - k / TRAILS) * (.45 + .55 * (p.d + 1) / 2)).toFixed(3);
        var tz = p.d > 0 ? 4 : 1;
        if (d._z !== tz) { d._z = tz; d.style.zIndex = tz; }
      }
    });
    chart.style.opacity = w.toFixed(3);
    chart.style.transform = 'scale(' + (.94 + .06 * w).toFixed(3) + ')';
    var drawOn = align > .25;
    if (drawOn !== lastDraw) { lastDraw = drawOn; chart.classList.toggle('draw', drawOn); }
    phone.style.opacity = (1 - .82 * w).toFixed(3);
    back.style.opacity = front.style.opacity = (1 - .85 * w).toFixed(3);
    tilt.style.transform = 'rotateX(' + cy.toFixed(2) + 'deg) rotateY(' + cx.toFixed(2) + 'deg)';
    if (pinned) placeTip();
  }

  /* ---------- Tooltip ---------- */
  function fillTip(g) {
    tip.style.setProperty('--c', 'var(--g-' + g.id + ')');
    tip.innerHTML = '<b><span lang="en">' + g.en + ' <i>' + g.enx + '</i></span><span lang="hi">' + g.hi + '</span></b>' +
      '<span lang="en">' + g.ten + '</span><span lang="hi">' + g.thi + '</span>';
  }
  function placeTip() {
    var g = pinned, tw = tip.offsetWidth, th = tip.offsetHeight, s = g.btn.offsetWidth * g.sc / 2;
    var x = clamp(g.x - tw / 2, 4, W - tw - 4);
    var y = g.y - s - th - 10;
    if (y < 4) y = g.y + s + 10;
    tip.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }
  function holdNodes(g, on) {
    // Rahu and Ketu stop together, so they stay exactly opposite.
    if (g.node) { byId.ra.hold = on; byId.ke.hold = on; } else g.hold = on;
    var o = orbitEls[g.twin || g.id];
    if (o) o.forEach(function (e) { e.classList.toggle('hot', on); });
  }
  function open(g) {
    if (pinned === g) return;
    if (pinned) close();
    pinned = g; g.openedAt = performance.now(); holdNodes(g, true); g.btn.classList.add('on');
    g.btn.setAttribute('aria-describedby', 'hb-tip');
    fillTip(g); tip.hidden = false; placeTip();
    requestAnimationFrame(function () { tip.classList.add('show'); });
    if (!loopOn) render();
  }
  function close() {
    if (!pinned) return;
    holdNodes(pinned, false); pinned.btn.classList.remove('on');
    pinned.btn.removeAttribute('aria-describedby');
    pinned = null; tip.classList.remove('show'); tip.hidden = true;
  }
  G.forEach(function (g) {
    var b = g.btn;
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') open(g); });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && pinned === g) close(); });
    b.addEventListener('click', function (e) { e.stopPropagation(); 
      // A tap focuses first (which opens); a second tap closes.
      if (pinned === g && !finePointer && performance.now() - g.openedAt > 400) close(); else open(g);
    });
    b.addEventListener('focus', function () { open(g); });
    b.addEventListener('blur', function () { if (pinned === g) close(); });
  });
  document.addEventListener('click', function (e) { if (pinned && !pinned.btn.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* ---------- Parallax tilt (desktop only) ---------- */
  if (finePointer && !reduce) {
    hb.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var nx = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -1, 1);
      var ny = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -1, 1);
      tx = nx * 7; ty = -ny * 5;
    });
    hb.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
  }

  /* ---------- The loop: orbit, chart moment every 16 s, screens every 3.8 s ---------- */
  var CYCLE = 16, IN_AT = 10.4, IN_DUR = 1.5, HOLD = 2.8, OUT_DUR = 1.6;
  var cycle = 3.2, shotT = 0, last = 0, loopOn = false, visible = true;
  function alignAt(t) {
    if (t < IN_AT) return 0;
    if (t < IN_AT + IN_DUR) return (t - IN_AT) / IN_DUR;
    if (t < IN_AT + IN_DUR + HOLD) return 1;
    return 1 - (t - IN_AT - IN_DUR - HOLD) / OUT_DUR;
  }
  function tick(now) {
    if (!loopOn) return;
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    entrance += dt;
    var started = entrance > 1.2;
    G.forEach(function (g) { if (!g.hold && !g.twin) g.th += g.w * dt; });
    byId.ke.th = byId.ra.th + Math.PI;
    if (started) {
      // A graha held open keeps the sky from re-forming until it is let go.
      var prev = cycle;
      if (!(pinned && cycle < IN_AT + .01 && cycle + dt >= IN_AT)) cycle += dt;
      if (pinned && cycle >= IN_AT && cycle < IN_AT + IN_DUR + HOLD) close();
      if (cycle >= CYCLE) cycle -= CYCLE;
      align = Math.max(0, alignAt(cycle));
      var outStart = IN_AT + IN_DUR + HOLD;
      if (prev < outStart && cycle >= outStart) { showChartShot(); shotT = -1.2; }
      if (align === 0) {
        shotT += dt;
        if (shotT > 3.8) { shotT = 0; nextShot(); }
      }
    }
    cx += (tx - cx) * Math.min(1, dt * 4); cy += (ty - cy) * Math.min(1, dt * 4);
    render();
    requestAnimationFrame(tick);
  }
  function setRunning() {
    var run = !reduce && visible && !document.hidden;
    hb.classList.toggle('paused', !run && !reduce);
    if (run && !loopOn) { loopOn = true; last = 0; requestAnimationFrame(tick); }
    else if (!run) loopOn = false;
  }

  /* ---------- Start ---------- */
  buildShots();
  if (window.MutationObserver) {
    new MutationObserver(function () { buildShots(); if (pinned) fillTip(pinned); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-lang'] });
  }
  // With reduced motion the START angles are the still sky; nothing moves.
  if (!reduce) hb.classList.add('pre');
  measure();
  if (window.ResizeObserver) new ResizeObserver(function () { if (stage.clientWidth !== W) measure(); }).observe(stage);
  else window.addEventListener('resize', measure);
  var skip = /[?&]hbt=/.test(location.search);
  if (!reduce) {
    if (!skip) requestAnimationFrame(function () { hb.classList.add('go'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; setRunning(); }).observe(stage);
    }
    document.addEventListener('visibilitychange', setRunning);
    setRunning();
  }

  // Test hook for screenshots: ?hero=b&hbt=<seconds> sets the point in the 16 s cycle.
  try {
    var jump = parseFloat(new URLSearchParams(location.search).get('hbt'));
    if (jump > 0) {
      entrance = 99; hb.classList.remove('pre'); hb.classList.remove('go');
      G.forEach(function (g) { if (!g.twin) g.th += g.w * jump; });
      byId.ke.th = byId.ra.th + Math.PI;
      cycle = jump % CYCLE; align = Math.max(0, alignAt(cycle));
      if (cycle > IN_AT + IN_DUR + HOLD) showChartShot();
      render();
    }
  } catch (e) {}
})();
