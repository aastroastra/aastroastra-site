/* AstroAshva home page: language, screenshots, hero marquee, scroll story,
   reveal on scroll, reviews and store-click tracking. No framework, no build.
   Motion is transform and opacity only, and stops for prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  // Hero A's screenshot row exists only for ?hero=a (C is the default, B has
  // its own). Removed before any image source is set, so other visitors
  // download none of it and the hidden row is never built.
  if (root.classList.contains('hero-b-on') || root.classList.contains('hero-c-on')) {
    var heroA = document.querySelector('main > .hero .marquee');
    if (heroA) heroA.parentNode.removeChild(heroA);
  }
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
  // Dark themes show dark captures where one exists (Yellow Dark: yd,
  // B&W Dark: md). Screens without a dark capture keep the light one.
  var DARK = {'01-dashboard': 1, '12-kundali-hero': 1, '13-kundali-chart': 1, '09-match-score': 1, '10-match-koota': 1, '05-multimatch-results': 1, '07n-numerology': 1, '15-chat-answer': 1, '22-horoscope-daily': 1, '20-palm-takeaways': 1, '16-face-hero': 1, '23-panchang': 1, '30-pdf-report': 1};
  function variant() {
    var t = root.getAttribute('data-theme') || '';
    return t === 'yellow-dark' ? 'yd' : t === 'mono-dark' ? 'md' : '';
  }
  function setShots() {
    var v = variant();
    document.querySelectorAll('img[data-shot]').forEach(function (img) {
      var name = img.getAttribute('data-shot');
      // data-dev ("and" or "ios"): the scroll story's own Android and iPhone
      // captures, in the page language; every theme has its own set there.
      var dev = img.getAttribute('data-dev');
      var base = 'shots/landing/' + lang + (dev ? '-' + dev : '') + '/' + (v && (dev || DARK[name]) ? v + '/' : '') + name;
      if (img.getAttribute('data-base') === base) return;
      img.setAttribute('data-base', base);
      var sl = img.parentNode;
      if (sl.classList.contains('sl')) sl.classList.toggle('dk', !!(v && (dev || DARK[name])));
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
    // The cards in the HTML are the source set. Cards marked data-only show
    // in light or dark themes only. The track repeats the visible set until
    // each half is wider than the screen, so the drift can wrap seamlessly.
    var source = Array.prototype.slice.call(track.children);
    source.forEach(function (c) { track.removeChild(c); });
    var build = function () {
      var dark = !!variant();
      var set = source.filter(function (c) { var o = c.getAttribute('data-only'); return !o || (o === 'dark') === dark; });
      track.innerHTML = '';
      var add = function (hidden) {
        set.forEach(function (card) {
          var c = card.cloneNode(true);
          if (hidden) { c.setAttribute('aria-hidden', 'true'); c.querySelectorAll('img').forEach(function (i) { i.alt = ''; i.removeAttribute('data-eager'); }); }
          track.appendChild(c);
        });
      };
      add(false);
      var setW = Math.max(1, track.scrollWidth), copies = Math.max(1, Math.ceil((window.innerWidth + 40) / setW));
      for (var k = 1; k < copies * 2; k++) add(true);
      setShots();
      half = track.scrollWidth / 2;
    };
    var half = 0, pos = 0, last = 0, holdUntil = 0, hover = false, running = false, visible = true;
    var measure = function () { half = track.scrollWidth / 2; };
    build();
    var lastW = window.innerWidth, lastDark = !!variant();
    var rebuild = function () {
      if (window.innerWidth === lastW && !!variant() === lastDark) { measure(); return; }
      lastW = window.innerWidth; lastDark = !!variant();
      build(); pos = Math.min(pos, half - 1); mq.scrollLeft = pos;
    };
    var wrap = function () {
      if (!half) return;
      if (mq.scrollLeft >= half) { mq.scrollLeft -= half; pos -= half; }
      else if (mq.scrollLeft <= 0 && drag) { mq.scrollLeft += half; pos += half; drag.s += half; }
    };
    window.addEventListener('resize', rebuild);
    window.mqRebuild = rebuild;
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
  // Theme toggles (site-theme.js) swap light and dark captures in place.
  if (window.MutationObserver) {
    new MutationObserver(function () { setShots(); if (window.mqRebuild) window.mqRebuild(); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- Scroll story: phone pinned, screen changes, mantra drifts ---------- */
  var story = document.querySelector('[data-story]');
  if (story && !reduce) {
    var rows = Array.prototype.slice.call(story.querySelectorAll('.m-row'));
    var phones = Array.prototype.slice.call(story.querySelectorAll('.pw')).map(function (pw) {
      return { slides: Array.prototype.slice.call(pw.querySelectorAll('.sl')) };
    });
    // One caption per step, shared by both phones (the same feature on each).
    var caps = Array.prototype.slice.call(story.querySelectorAll('.pcaps .cap')), capOn = 0;
    var bars = Array.prototype.slice.call(story.querySelectorAll('.story-bar b'));
    var N = caps.length || 1, rowW = [], vw = 0, vh = 0, queued = false;
    var size = function () {
      vw = window.innerWidth; vh = window.innerHeight;
      rowW = rows.map(function (r) { return r.scrollWidth; });
      frame();
    };
    // Each step holds still for most of its scroll, then the next screen
    // fades in as the current one fades out; the iPhone follows a beat later.
    var stepAt = function (u, lag) {
      var base = Math.min(Math.floor(u), N - 1), frac = u - base;
      if (base >= N - 1) return N - 1;
      return base + ease((frac - 0.4 - lag) / 0.18);
    };
    var frame = function () {
      queued = false;
      var r = story.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var total = Math.max(1, r.height - vh);
      var raw = -r.top / total;
      var p = clamp(raw, 0, 1);
      rows.forEach(function (row, i) {
        var dir = +row.getAttribute('data-dir');
        var base = -(rowW[i] - vw) / 2;
        var x = base + dir * (raw - 0.5) * vw * 0.55 + (i % 2 ? 0.08 : -0.08) * vw;
        row.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      });
      var u = clamp(p * N - 0.5, 0, N - 1);
      // The caption changes on the second phone's beat, so it never names a
      // feature the iPhone is not showing yet.
      var capNow = Math.round(stepAt(u, (phones.length - 1) * 0.08));
      if (capNow !== capOn && caps[capNow]) { caps[capOn].classList.remove('on'); caps[capNow].classList.add('on'); capOn = capNow; }
      phones.forEach(function (ph, k) {
        var f = stepAt(u, k * 0.08);
        var cur = Math.floor(f), mix = f - cur;
        ph.slides.forEach(function (sl, i) {
          // Out, then in: the current screen fades away before the next one
          // appears, so two screens never overlap.
          var o = i === cur ? clamp(1 - 2 * mix, 0, 1) : i === cur + 1 ? clamp(2 * mix - 1, 0, 1) : 0;
          sl.style.opacity = o.toFixed(3);
        });
      });
      bars.forEach(function (b, k) { b.style.setProperty('--f', clamp(p * N - k, 0, 1).toFixed(3)); });
    };
    var onScroll = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
  }

  /* ---------- AshvaAI illustration: plays once when it comes into view ---------- */
  var demo = document.querySelector('[data-demo]');
  if (demo) {
    var stage = demo.querySelector('.stage');
    var flows = demo.querySelector('.flows');
    var stepLis = Array.prototype.slice.call(demo.querySelectorAll('.demo-steps li'));
    var timers = [];
    var setStep = function (n) {
      for (var k = 1; k <= 5; k++) demo.classList.toggle('s' + k, k <= n);
      var cur = Math.min(n, 4);
      stepLis.forEach(function (li) {
        var st = +li.getAttribute('data-st');
        li.classList.toggle('on', st <= cur);
        li.classList.toggle('cur', st === cur);
      });
    };
    // Position inside the stage, ignoring transforms (the cards animate in).
    var box = function (el) {
      var x = 0, y = 0, e = el;
      while (e && e !== stage) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
    };
    var draw = function () {
      var W = stage.clientWidth, H = stage.clientHeight;
      flows.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var people = demo.querySelectorAll('.person'), charts = demo.querySelectorAll('.kc');
      var node = box(demo.querySelector('.node')), ca = box(demo.querySelector('.ca'));
      var across = box(charts[0]).x > box(people[0]).x + box(people[0]).w - 4;
      var d = [];
      var link = function (a, b, cls) {
        var p, q, c;
        if (across) {
          p = [a.x + a.w, a.y + a.h / 2]; q = [b.x, b.y + b.h / 2]; c = (q[0] - p[0]) / 2;
          d.push('<path class="' + cls + '" pathLength="1" d="M' + p[0] + ' ' + p[1] + 'C' + (p[0] + c) + ' ' + p[1] + ' ' + (q[0] - c) + ' ' + q[1] + ' ' + q[0] + ' ' + q[1] + '"/>');
        } else {
          p = [a.x + a.w / 2, a.y + a.h]; q = [b.x + b.w / 2, b.y]; c = (q[1] - p[1]) / 2;
          d.push('<path class="' + cls + '" pathLength="1" d="M' + p[0] + ' ' + p[1] + 'C' + p[0] + ' ' + (p[1] + c) + ' ' + q[0] + ' ' + (q[1] - c) + ' ' + q[0] + ' ' + q[1] + '"/>');
        }
      };
      for (var i = 0; i < people.length; i++) {
        var pc = box(people[i]), kc = box(charts[i].querySelector('.kcg'));
        link(pc, kc, 'f1');
        var kw = box(charts[i]);
        link(kw, node, 'f2');
        link(kw, node, 'pulse');
      }
      link(node, ca, 'f3');
      flows.innerHTML = d.join('');
    };
    var play = function () {
      timers.forEach(clearTimeout); timers = [];
      demo.classList.remove('done');
      setStep(0);
      [[200, 1], [1700, 2], [3700, 3], [5600, 4], [6500, 5]].forEach(function (t) {
        timers.push(setTimeout(function () { setStep(t[1]); }, t[0]));
      });
      timers.push(setTimeout(function () { demo.classList.add('done'); }, 8600));
    };
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(stage); else window.addEventListener('resize', draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { requestAnimationFrame(draw); }); });
    demo.querySelector('[data-replay]').addEventListener('click', play);
    if (reduce || !('IntersectionObserver' in window)) {
      setStep(5); demo.classList.add('done');
    } else {
      var dio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { dio.disconnect(); play(); }
      }, { threshold: 0.3 });
      dio.observe(stage);
    }
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

  /* ---------- Install counts (stats.json, written by update-stats.py) ----------
     Real numbers only: Android = Play Console "Total User Installs",
     iPhone = TestFlight testers with the beta installed. The hero line shows
     the total only when BOTH are known, so a missing source never shrinks it. */
  var statsEl = document.querySelector('[data-stats]');
  var heroStat = document.querySelector('[data-dl-stat]');
  function human(n) { return n < 1000 ? String(n) : (Math.round(n / 100) / 10) + 'k'; }
  function floorNice(n) {
    if (n < 100) return String(n);
    var p = Math.pow(10, String(n).length - 2);
    return human(Math.floor(n / p) * p) + '+';
  }
  function bi(parent, en, hi) {
    var e = document.createElement('span'); e.lang = 'en'; e.textContent = en;
    var h = document.createElement('span'); h.lang = 'hi'; h.textContent = hi;
    parent.appendChild(e); parent.appendChild(h);
  }
  if ((statsEl || heroStat) && window.fetch) {
    fetch(SUPA + 'stats.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (!s) return;
      var a = s.android_installs, i = s.ios_installs;
      if (heroStat && typeof a === 'number' && typeof i === 'number' && a + i > 0) {
        var b = document.createElement('b'); b.textContent = floorNice(a + i);
        heroStat.appendChild(b); heroStat.appendChild(document.createTextNode(' '));
        bi(heroStat, 'downloads on Android and iOS', 'डाउनलोड, एंड्रॉइड और iOS पर');
        heroStat.hidden = false;
      }
      if (!statsEl || a == null) return;
      var items = [[a, 'Android installs', 'एंड्रॉइड इंस्टॉल']];
      if (i != null) items.push([i, 'iPhone installs', 'आईफ़ोन इंस्टॉल']);
      items.forEach(function (x) {
        var d = document.createElement('div');
        var nEl = document.createElement('div'); nEl.className = 'n'; nEl.textContent = human(+x[0]);
        var l = document.createElement('div'); l.className = 'l';
        bi(l, x[1], x[2]); d.appendChild(nEl); d.appendChild(l); statsEl.appendChild(d);
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
