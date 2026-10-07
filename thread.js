/* The thread: one line that starts at the hero chart (house 7, its lowest
   point), runs down the whole page with the scroll, and closes into the logo
   at Download. On the way it becomes each section's own diagram:
   - Why: the connector across the four steps (each step lights as it passes);
   - Multi-match: the ranking line beside the list (the rows sort when it
     arrives, then each place lights);
   - Download: it ends in the AA mark.
   Wide screens (> 1000px): it weaves between a left and a right rail.
   Phones and tablets: a straight rail down the left edge.
   How far it is drawn follows a point 62% down the screen, so it is always
   just ahead of the eye. stroke-dashoffset only; no layout is ever touched.
   Reduced motion: drawn in full, every stop lit, nothing moves. */
(function () {
  'use strict';
  var root = document.documentElement;
  var main = document.querySelector('main');
  var svg = document.querySelector('[data-thread]');
  if (!main || !svg || !svg.querySelector('.thread-path')) return;

  var path = svg.querySelector('.thread-path');
  var tip = svg.querySelector('.thread-tip');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wideMq = window.matchMedia ? matchMedia('(min-width: 1001px)') : { matches: true };
  var endEl = document.querySelector('[data-thread-end]');
  var steps = Array.prototype.slice.call(document.querySelectorAll('#why .steps > li'));
  var mmList = document.querySelector('[data-mm-list]');
  // Measures a path while it is being built (in the SVG, so every engine
  // can measure it; never painted).
  var probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  probe.setAttribute('class', 'thread-probe');
  svg.appendChild(probe);

  var segs = [], stops = [], total = 0, drawn = -1, sorted = false, queued = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // Position inside <main>, ignoring transforms (reveals, pinned scenes).
  function box(el) {
    var x = 0, y = 0, e = el;
    while (e && e !== main) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function shown(el) { return el && el.offsetParent !== null && el.offsetWidth > 0; }

  /* ---------- Building the path ----------
     Each piece knows the stretch of scroll (page y of the "eye" point) over
     which it draws. Most pieces draw as the eye passes their own height; the
     flat connector in Why draws over a quarter screen instead. */
  function build() {
    if (!steps.length || !endEl) return false;
    var W = main.clientWidth, H = main.scrollHeight, vh = window.innerHeight;
    var wide = wideMq.matches;
    var why = document.getElementById('why');
    var wrap = why && why.querySelector('.wrap');
    if (!wrap || !shown(wrap)) return false;
    var wb = box(wrap), pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 16;
    var cl = wb.x + pad, cr = wb.x + wb.w - pad;
    var hc = document.getElementById('hero-c');
    var heroBox = shown(hc) ? box(hc) : box(main.querySelector('section'));
    var stage = hc && hc.querySelector('[data-hc-stage]');
    var eb = box(endEl), ex = eb.x + eb.w / 2, ey = eb.y + eb.h / 2;

    var d = '', cur = null, pieces = [];
    function add(cmd, to, t0, t1) {
      pieces.push({ from: cur, to: to, cmd: cmd, t0: t0 == null ? cur[1] : t0, t1: t1 == null ? to[1] : t1 });
      cur = to;
    }
    function line(x, y, t0, t1) { add('L' + x.toFixed(1) + ' ' + y.toFixed(1), [x, y], t0, t1); }
    // A vertical S: leaves straight down, arrives straight down.
    function sweep(x, y) {
      var m = (cur[1] + y) / 2;
      add('C' + cur[0].toFixed(1) + ' ' + m.toFixed(1) + ' ' + x.toFixed(1) + ' ' + m.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1), [x, y]);
    }
    // A rounded corner into (x, y) through the corner point (cx, cy).
    function corner(cx, cy, x, y, t0, t1) {
      add('C' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1), [x, y], t0, t1);
    }
    var stopList = [];
    var stepY = box(steps[0]).y;
    var slots = mmList && shown(mmList) ? Array.prototype.slice.call(mmList.children) : [];

    if (wide) {
      var railL = Math.max(14, cl - 30), railR = Math.min(W - 14, cr + 30), r = 44;
      var sb = stage && shown(stage) ? box(stage) : null;
      var start = sb ? [sb.x + sb.w / 2, sb.y + sb.h - 1] : [W / 2, heroBox.y + heroBox.h];
      cur = start; d = 'M' + start[0].toFixed(1) + ' ' + start[1].toFixed(1);
      // Out of the chart and across to the left rail.
      sweep(railL, start[1] + Math.max(220, vh * 0.32));
      // Down the left rail, past the story, to the steps in Why.
      var Y = stepY - 26;
      line(railL, Y - r);
      corner(railL, Y, railL + r, Y);
      // The connector: drawn over a quarter screen, lighting each step.
      var hx0 = railL + r, hx1 = railR - r;
      add('L' + hx1.toFixed(1) + ' ' + Y.toFixed(1), [hx1, Y], Y, Y + vh * 0.28);
      var hIdx = pieces.length - 1;
      steps.forEach(function (li) {
        var b = box(li);
        stopList.push({ piece: hIdx, along: clamp(b.x + b.w / 2 - hx0, 0, hx1 - hx0), on: li, kind: 'step' });
      });
      corner(railR, Y, railR, Y + r, Y + vh * 0.28, Y + vh * 0.32);
      // Down the right rail, beside the AshvaAI scene, to Multi-match.
      if (slots.length) {
        var lb = box(mmList), rx = lb.x - 18, top = lb.y + 6;
        line(railR, Math.max(Y + r + 1, top - 260));
        sweep(rx, top);
        var first = pieces.length;
        line(rx, lb.y + lb.h - 6);
        slots.forEach(function (li, i) {
          var b = box(li);
          stopList.push({ piece: first, along: clamp(b.y + b.h / 2 - top, 0, lb.h), slot: i, kind: 'slot' });
        });
        // Back to the left rail in the open space above the note, never
        // through a line of text.
        var note = document.querySelector('#multimatch .mm-note');
        var ny = note && shown(note) ? box(note).y - 14 : lb.y + lb.h + 160;
        sweep(railL, Math.max(ny, lb.y + lb.h + 60));
      } else {
        line(railR, Y + vh * 0.6);
        sweep(railL, Y + vh * 1.2);
      }
      // Down the left rail through Features, then into the mark at Download.
      line(railL, ey - 240);
      sweep(ex, ey);
    } else {
      // Phones and tablets: one straight rail at the left edge.
      var x = Math.max(6, Math.round(cl / 2));
      var y0 = heroBox.y + heroBox.h - 8;
      cur = [x, y0]; d = 'M' + x + ' ' + y0.toFixed(1);
      line(x, ey - 160);
      sweep(ex, ey);
      steps.forEach(function (li) {
        var b = box(li);
        stopList.push({ piece: 0, along: clamp(b.y + 34 - y0, 0, ey - 160 - y0), on: li, kind: 'step' });
      });
      slots.forEach(function (li, i) {
        var b = box(li);
        stopList.push({ piece: 0, along: clamp(b.y + b.h / 2 - y0, 0, ey - 160 - y0), slot: i, kind: 'slot' });
      });
    }

    // Lengths and draw windows. Windows never run backwards: a piece starts
    // when the one before it has finished.
    var dd = d, L = 0, tPrev = -Infinity;
    segs = pieces.map(function (p) {
      dd += p.cmd;
      probe.setAttribute('d', dd);
      var L1 = probe.getTotalLength();
      var t0 = Math.max(tPrev, p.t0), t1 = Math.max(t0 + 1, p.t1);
      var s = { L0: L, L1: L1, t0: t0, t1: t1 };
      L = L1; tPrev = t1;
      return s;
    });
    total = L;
    stops = stopList.map(function (s) {
      var sg = segs[s.piece];
      return { at: Math.min(sg.L1, sg.L0 + s.along), on: s.on, slot: s.slot, kind: s.kind };
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.height = H + 'px';
    path.setAttribute('d', dd);
    path.style.strokeDasharray = total.toFixed(1) + ' ' + (total + 10).toFixed(1);
    drawn = -1;
    return true;
  }

  /* ---------- Drawing with the scroll ---------- */
  function lengthAt(t) {
    if (!segs.length || t <= segs[0].t0) return 0;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (t <= s.t0) return s.L0;
      if (t <= s.t1) return s.L0 + (t - s.t0) / (s.t1 - s.t0) * (s.L1 - s.L0);
    }
    return total;
  }
  function apply(len) {
    if (Math.abs(len - drawn) < 0.5) return;
    drawn = len;
    path.style.strokeDashoffset = (total - len).toFixed(1);
    if (tip) {
      var live = !reduce && len > 2 && len < total - 2;
      tip.classList.toggle('on', live);
      if (live) {
        var p = path.getPointAtLength(len);
        tip.setAttribute('cx', p.x.toFixed(1)); tip.setAttribute('cy', p.y.toFixed(1));
      }
    }
    var slotsNow = mmList ? mmList.children : [];
    stops.forEach(function (s) {
      var on = len >= s.at - 1;
      if (s.kind === 'step') s.on.classList.toggle('lit', on);
      else if (s.kind === 'slot') {
        if (on && !sorted) { sorted = true; document.dispatchEvent(new CustomEvent('aa:mm-sort')); }
        if (slotsNow[s.slot]) slotsNow[s.slot].classList.toggle('lit', on);
      }
    });
    if (endEl) endEl.classList.toggle('closed', len >= total - 2);
  }
  function frame() {
    queued = false;
    if (!total) return;
    if (reduce) { apply(total); return; }
    var mainTop = main.getBoundingClientRect().top;
    apply(lengthAt(window.innerHeight * 0.62 - mainTop));
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

  var rebuildT = 0;
  function rebuild() {
    clearTimeout(rebuildT);
    rebuildT = setTimeout(function () { if (build()) frame(); }, 120);
  }

  if (!build()) return;
  root.classList.add('thread-on');
  frame();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', rebuild);
  window.addEventListener('load', rebuild);
  if (wideMq.addEventListener) wideMq.addEventListener('change', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.addEventListener('click', rebuild); });
  // The page grows when reviews arrive or images settle: re-measure.
  if ('ResizeObserver' in window) {
    var lastH = main.scrollHeight;
    new ResizeObserver(function () {
      var h = main.scrollHeight;
      if (Math.abs(h - lastH) > 2) { lastH = h; rebuild(); }
    }).observe(main);
  }
})();
