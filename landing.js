/* AstroAshva home page: language, screenshots, hero marquee, scroll story,
   reveal on scroll, reviews and store-click tracking. No framework, no build.
   Motion is transform and opacity only, and stops for prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REST = 'https://gttszlununmqivrqevwv.supabase.co/rest/v1';
  var SUPA = 'https://gttszlununmqivrqevwv.supabase.co/storage/v1/object/public/site/';
  // The anon key is public by design; every table it can reach is RLS-locked.
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dHN6bHVudW5tcWl2cnFldnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzEwMjQsImV4cCI6MjA4ODgwNzAyNH0.owDFA7ZPpDYoTmcIwYxxfn1w-qRUnKrM5pX17IAIzQQ';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- Language (shares aa-lang with every other page) ---------- */
  var lang = root.getAttribute('data-lang') === 'hi' ? 'hi' : 'en';
  function setLang(value, persist) {
    lang = value === 'hi' ? 'hi' : 'en';
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    if (persist) {
      try { localStorage.setItem('aa-lang', lang); } catch (e) {}
      try {
        var u = new URL(location.href);
        if (u.searchParams.has('lang')) {
          if (lang === 'hi') u.searchParams.set('lang', 'hi'); else u.searchParams.delete('lang');
          history.replaceState(null, '', u);
        }
      } catch (e) {}
    }
    setShots();
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });

  /* ---------- Real app screenshots, per language ----------
     Images carry data-shot="name"; the source is picked here so a Hindi
     visitor never downloads the English set first. */
  function setShots() {
    document.querySelectorAll('img[data-shot]').forEach(function (img) {
      var base = 'shots/landing/' + lang + '/' + img.getAttribute('data-shot');
      var small = img.closest('.card-shot, .side-phone, .story-static');
      if (!img.hasAttribute('data-eager') && !img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.sizes = small ? '(max-width: 760px) 160px, 240px' : '(max-width: 760px) 240px, 300px';
      img.srcset = base + '-360.webp 360w, ' + base + '-540.webp 540w';
      img.src = base + (small ? '-360' : '-540') + '.webp';
    });
  }

  /* ---------- Hero marquee: drifts on its own, drags and scrolls by hand ---------- */
  var mq = document.querySelector('[data-marquee]');
  if (mq) {
    var track = mq.firstElementChild;
    Array.prototype.slice.call(track.children).forEach(function (card) {
      var c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('img').forEach(function (i) { i.alt = ''; i.removeAttribute('data-eager'); });
      track.appendChild(c);
    });
    var half = 0, pos = 0, last = 0, holdUntil = 0, hover = false, running = false, visible = true;
    var measure = function () { half = track.scrollWidth / 2; };
    var wrap = function () {
      if (!half) return;
      if (mq.scrollLeft >= half) { mq.scrollLeft -= half; pos -= half; }
      else if (mq.scrollLeft <= 0 && drag) { mq.scrollLeft += half; pos += half; drag.s += half; }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    mq.addEventListener('scroll', function () {
      // Only a hand-made scroll moves the drift position; our own writes round to whole pixels.
      if (Math.abs(mq.scrollLeft - pos) > 2) pos = mq.scrollLeft;
      wrap();
    }, { passive: true });
    var hold = function () { holdUntil = performance.now() + 1800; };
    mq.addEventListener('touchstart', hold, { passive: true });
    mq.addEventListener('wheel', hold, { passive: true });
    mq.addEventListener('mouseenter', function () { hover = true; });
    mq.addEventListener('mouseleave', function () { hover = false; });
    // Mouse drag (touch scrolls natively).
    var drag = null;
    mq.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, s: mq.scrollLeft };
      mq.classList.add('dragging'); hold();
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      mq.scrollLeft = drag.s - (e.clientX - drag.x);
      hold();
    });
    window.addEventListener('pointerup', function () { if (drag) { drag = null; mq.classList.remove('dragging'); hold(); } });
    mq.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { hold(); mq.scrollBy({ left: e.key === 'ArrowRight' ? 260 : -260, behavior: 'smooth' }); e.preventDefault(); }
    });
    var tick = function (now) {
      if (!visible) { running = false; return; }
      var dt = Math.min(48, now - (last || now)); last = now;
      if (now > holdUntil && !drag) {
        pos += dt * (hover ? 0.012 : 0.038);
        if (half && pos >= half) pos -= half;
        mq.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    };
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !running) { running = true; last = 0; pos = mq.scrollLeft; requestAnimationFrame(tick); }
      }).observe(mq);
    }
  }

  setLang(lang, false);

  /* ---------- Scroll story: phone pinned, screen changes, mantra drifts ---------- */
  var story = document.querySelector('[data-story]');
  if (story && !reduce) {
    var rows = Array.prototype.slice.call(story.querySelectorAll('.m-row'));
    var shots = Array.prototype.slice.call(story.querySelectorAll('.phone .screen img'));
    var caps = Array.prototype.slice.call(story.querySelectorAll('.cap'));
    var bars = Array.prototype.slice.call(story.querySelectorAll('.story-bar b'));
    var N = shots.length, rowW = [], vw = 0, vh = 0, active = 0, queued = false;
    var size = function () {
      vw = window.innerWidth; vh = window.innerHeight;
      rowW = rows.map(function (r) { return r.scrollWidth; });
      frame();
    };
    var frame = function () {
      queued = false;
      var r = story.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var total = Math.max(1, r.height - vh);
      var raw = -r.top / total;
      var p = clamp(raw, 0, 1);
      // Mantra: rows slide in alternate directions, a little past the pin on both ends.
      rows.forEach(function (row, i) {
        var dir = +row.getAttribute('data-dir');
        var base = -(rowW[i] - vw) / 2;
        var x = base + dir * (raw - 0.5) * vw * 0.55 + (i % 2 ? 0.08 : -0.08) * vw;
        row.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      });
      // Screens: each one slides up over the last, which settles back.
      var f = p * (N - 1), t = [];
      for (var i = 0; i < N; i++) t[i] = i === 0 ? 1 : ease((f - (i - 0.72)) / 0.44);
      var now = 0;
      for (var j = 0; j < N; j++) {
        var next = j + 1 < N ? t[j + 1] : 0;
        shots[j].style.transform = 'translate3d(0,' + ((1 - t[j]) * 100).toFixed(2) + '%,0) scale(' + (1 - 0.07 * next).toFixed(4) + ')';
        // Opaque at all times so nothing shows through; two screens back is hidden.
        shots[j].style.visibility = j + 2 < N && t[j + 2] >= 1 ? 'hidden' : 'visible';
        if (t[j] > 0.5) now = j;
      }
      if (now !== active) {
        caps[active].classList.remove('on');
        caps[now].classList.add('on');
        active = now;
      }
      bars.forEach(function (b, k) { b.style.setProperty('--f', clamp(p * N - k, 0, 1).toFixed(3)); });
    };
    var onScroll = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
  }

  /* ---------- AshvaAI steps: the sticky phone follows the step in view ---------- */
  var aiSteps = Array.prototype.slice.call(document.querySelectorAll('.ai-step'));
  var aiShots = Array.prototype.slice.call(document.querySelectorAll('.ai-phone .screen img'));
  if (aiSteps.length && 'IntersectionObserver' in window) {
    var aio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var k = +e.target.getAttribute('data-ai');
        aiSteps.forEach(function (s, i) { s.classList.toggle('on', i === k); });
        aiShots.forEach(function (s, i) { s.classList.toggle('on', i === k); });
      });
    }, { rootMargin: '-42% 0px -42% 0px' });
    aiSteps.forEach(function (s) { aio.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveal = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveal.forEach(function (el) { el.classList.add('in'); });
  } else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); rio.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- Reviews: only real ones, from reviews.json, and only with three or more ---------- */
  var revSec = document.getElementById('reviews');
  if (revSec && window.fetch) {
    fetch('reviews.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (list) {
      if (!Array.isArray(list)) return;
      var ok = list.filter(function (x) {
        return x && typeof x.quote === 'string' && x.quote.trim() && typeof x.name === 'string' && x.name.trim() && +x.stars >= 1 && +x.stars <= 5;
      });
      if (ok.length < 3) return;
      var grid = revSec.querySelector('[data-reviews]');
      ok.slice(0, ok.length >= 6 ? 6 : 3).forEach(function (x) {
        var card = document.createElement('figure'); card.className = 'rev';
        var s = document.createElement('div'); s.className = 'stars';
        var n = Math.round(+x.stars); s.textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
        s.setAttribute('aria-label', n + ' / 5');
        var q = document.createElement('blockquote'); q.textContent = '“' + x.quote.trim() + '”';
        var who = document.createElement('figcaption'); who.className = 'who'; who.textContent = x.name.trim();
        var meta = [x.place, x.source].filter(function (v) { return typeof v === 'string' && v.trim(); }).join(' · ');
        if (meta) { var sm = document.createElement('small'); sm.textContent = meta; who.appendChild(sm); }
        card.appendChild(s); card.appendChild(q); card.appendChild(who); grid.appendChild(card);
      });
      revSec.hidden = false;
    }).catch(function () {});
  }

  /* ---------- Install counts (stats.json), shown only once Android installs exist ---------- */
  var statsEl = document.querySelector('[data-stats]');
  function human(n) { return n < 1000 ? String(n) : (Math.round(n / 100) / 10) + 'k'; }
  if (statsEl && window.fetch) {
    fetch(SUPA + 'stats.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (!s || s.android_installs == null) return;
      var items = [[s.android_installs, 'Android installs', 'एंड्रॉइड इंस्टॉल']];
      if (s.ios_installs != null) items.push([s.ios_installs, 'iPhone installs', 'आईफ़ोन इंस्टॉल']);
      items.forEach(function (x) {
        var d = document.createElement('div');
        var nEl = document.createElement('div'); nEl.className = 'n'; nEl.textContent = human(+x[0]);
        var l = document.createElement('div'); l.className = 'l';
        var en = document.createElement('span'); en.lang = 'en'; en.textContent = x[1];
        var hi = document.createElement('span'); hi.lang = 'hi'; hi.textContent = x[2];
        l.appendChild(en); l.appendChild(hi); d.appendChild(nEl); d.appendChild(l); statsEl.appendChild(d);
      });
      statsEl.hidden = false;
    }).catch(function () {});
  }

  /* ---------- Store clicks: download_events row + GA event, never blocking the link ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-store]');
    if (!a) return;
    var platform = a.getAttribute('data-store'), channel = a.getAttribute('data-channel');
    try {
      fetch(REST + '/download_events', {
        method: 'POST', keepalive: true,
        headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + ANON, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ platform: platform, channel: channel })
      }).catch(function () {});
    } catch (err) {}
    try { if (window.gtag) gtag('event', 'store_click', { platform: platform, channel: channel }); } catch (err) {}
  });

  var y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
