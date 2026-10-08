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
  /* Which capture each image shows: only captures of the site theme's family.
     What exists (shots/landing/<lang>...):
       <lang>/          Yellow·Light, every screen (Android size)
       <lang>/yd, /md   Yellow·Dark, B&W·Dark, for the screens in DARK
       <lang>-and/      White·Light Android for the screens in WL; /yd, /md dark
       <lang>-ios/      White·Light iPhone for the story six; /yd, /md dark
     Families: Yellow (Yellow·Light, Yellow·Dark), White (White·Light),
     B&W (B&W·Dark; there is no B&W·Light set, so B&W·Light uses B&W·Dark).
     The story's side phones take the lightest capture of the family. A
     screen with no capture in the family borrows the same feature's covered
     screen (SUB) where the image allows it (data-sub); otherwise it is hidden
     rather than shown in another theme. */
  var DARK = {'01-dashboard': 1, '12-kundali-hero': 1, '13-kundali-chart': 1, '09-match-score': 1, '10-match-koota': 1, '05-multimatch-results': 1, '07n-numerology': 1, '15-chat-answer': 1, '22-horoscope-daily': 1, '20-palm-takeaways': 1, '16-face-hero': 1, '23-panchang': 1, '30-pdf-report': 1};
  var WL = {'05-multimatch-results': 1, '07n-numerology': 1, '09-match-score': 1, '12-kundali-hero': 1, '15-chat-answer': 1, '20-palm-takeaways': 1};
  var IOS = WL;   // the iPhone set has the same six screens
  // White·Light Android captures that exist in Hindi only (from the Hindi ad kit).
  var WL_HI = {'16-face-hero': 1, '22-horoscope-daily': 1, '23-panchang': 1};
  var SUB = {'14-chat-empty': '15-chat-answer', '18-palm-start': '20-palm-takeaways', '21-prediction-weekly': '12-kundali-hero',
    '13-kundali-chart': '12-kundali-hero', '10-match-koota': '09-match-score', '07-multimatch-types-detail': '05-multimatch-results',
    '01-dashboard': '05-multimatch-results', '22-horoscope-daily': '12-kundali-hero'};
  function variant() {
    var t = root.getAttribute('data-theme') || '';
    return t === 'yellow-dark' ? 'yd' : t === 'mono-dark' ? 'md' : '';
  }
  // The capture families to try, in order, for an image in this theme.
  function familyFor(img) {
    var t = root.getAttribute('data-theme') || 'white-light';
    var side = img.hasAttribute('data-light');
    if (t === 'white-light') return ['wl'];
    if (t.indexOf('mono') === 0) return ['md'];
    if (t === 'yellow-dark' && !side) return ['yd', 'yl'];
    return ['yl'];
  }
  // The folder for one screen in one family, or null when it was never captured.
  function capture(name, ios, fam) {
    if (fam === 'yl') return lang + '/' + name;                 // Android size; the iPhone frame crops it a little
    if (fam === 'wl') return ios ? (IOS[name] ? lang + '-ios/' + name : null) : ((WL[name] || (lang === 'hi' && WL_HI[name])) ? lang + '-and/' + name : null);
    if (ios) return IOS[name] ? lang + '-ios/' + fam + '/' + name : null;
    if (DARK[name]) return lang + '/' + fam + '/' + name;
    return WL[name] ? lang + '-and/' + fam + '/' + name : null;
  }
  function shotBase(img) {
    var name = img.getAttribute('data-shot'), ios = img.getAttribute('data-dev') === 'ios';
    var fams = familyFor(img), names = [name];
    if (img.hasAttribute('data-sub') && SUB[name]) names.push(SUB[name]);
    for (var i = 0; i < names.length; i++) for (var k = 0; k < fams.length; k++) {
      var f = capture(names[i], ios, fams[k]);
      if (f) return f;
    }
    return null;
  }
  function setShots() {
    document.querySelectorAll('img[data-shot]').forEach(function (img) {
      var rel = shotBase(img);
      // No capture in this theme's family: hide the phone, never show another theme.
      var holder = img.closest('.sl') || img.closest('.feat-dev, .side-phone, figure, .peek') || img.parentNode;
      holder.classList.toggle('shot-missing', !rel);
      var f = img.closest('.feat');
      if (f && img.closest('.feat-dev')) f.classList.toggle('no-shot', !rel);
      if (!rel) { img.removeAttribute('srcset'); img.removeAttribute('src'); img.setAttribute('data-base', ''); return; }
      var base = 'shots/landing/' + rel;
      if (img.getAttribute('data-base') === base) return;
      img.setAttribute('data-base', base);
      var sl = img.parentNode;
      if (sl.classList.contains('sl')) sl.classList.toggle('dk', base.indexOf('/yd/') > 0 || base.indexOf('/md/') > 0);
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
  // Phones get the static grid instead (landing.css): one pinned scene per
  // page there, and that one is AshvaAI.
  /* Vector device frames: drawn once into every [data-frame] (the story's
     three phones and its reduced-motion grid). The screen is real HTML on
     top of the frame; the camera (Pixel punch-hole, iPhone Dynamic Island)
     sits above the screen. No fake status bar: every capture has its own. */
  var FR = {
    pixel: { w: 108.4, h: 213.96, o: 12.5, i: 11.6, btn: [['r', 52, 12], ['r', 70, 26]],
      top: '<circle class="dv-cam" cx="54.2" cy="9.9" r="1.9"/><circle class="dv-lens" cx="54.2" cy="9.9" r=".75"/>' },
    ios: { w: 107.6, h: 225, o: 17.6, i: 16.7, btn: [['l', 40, 8], ['l', 55, 14], ['l', 72, 14], ['r', 58, 24], ['r', 112, 12]],
      top: '<rect class="dv-cam" x="38.3" y="6.3" width="31" height="9" rx="4.5"/><circle class="dv-lens" cx="64" cy="10.8" r="1.5"/>' }
  };
  // Features on phones: each tile's screenshot also in the iPhone frame
  // (shown instead of the desktop peek below 760px; landing.css / thread.css).
  document.querySelectorAll('.feat .peek img[data-shot]').forEach(function (im) {
    var f = im.closest('.feat');
    if (f.querySelector('.feat-dev')) return;
    f.insertAdjacentHTML('beforeend', '<div class="device ios feat-dev" data-frame="ios" aria-hidden="true"><div class="dev-in"><div class="dev-screen">' +
      '<img data-shot="' + im.getAttribute('data-shot') + '" loading="lazy" width="540" height="1110" alt=""></div></div></div>');
  });
  setShots();
  if (!document.getElementById('dv-metal')) {
    var defs = document.createElement('div');
    defs.innerHTML = '<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>' +
      '<linearGradient id="dv-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--dev-metal-a)"/>' +
      '<stop offset=".45" style="stop-color:var(--dev-metal-b)"/><stop offset=".72" style="stop-color:var(--dev-metal-c)"/>' +
      '<stop offset="1" style="stop-color:var(--dev-metal-b)"/></linearGradient></defs></svg>';
    document.body.appendChild(defs.firstChild);
  }
  document.querySelectorAll('[data-frame]').forEach(function (d) {
    var f = FR[d.getAttribute('data-frame')], inn = d.querySelector('.dev-in');
    if (!f || !inn || inn.querySelector('.dev-frame')) return;
    var vb = '0 0 ' + f.w + ' ' + f.h;
    var btn = f.btn.map(function (b) {
      return '<rect class="dv-btn" x="' + (b[0] === 'r' ? f.w - .3 : -1.1) + '" y="' + b[1] + '" width="1.4" height="' + b[2] + '" rx=".6"/>';
    }).join('');
    inn.insertAdjacentHTML('afterbegin', '<svg class="dev-frame" viewBox="' + vb + '" aria-hidden="true" focusable="false">' + btn +
      '<rect class="dv-edge" width="' + f.w + '" height="' + f.h + '" rx="' + f.o + '"/>' +
      '<rect class="dv-body" x=".9" y=".9" width="' + (f.w - 1.8) + '" height="' + (f.h - 1.8) + '" rx="' + f.i + '"/></svg>');
    inn.insertAdjacentHTML('beforeend', '<svg class="dev-top" viewBox="' + vb + '" aria-hidden="true" focusable="false">' + f.top + '</svg>');
  });

  if (story && !reduce) {
    var rows = Array.prototype.slice.call(story.querySelectorAll('.m-row'));
    // The iPhone in the centre leads; the Pixels follow a beat apart.
    var LAG = { c: 0, l: 0.06, r: 0.12 };
    var phones = Array.prototype.slice.call(story.querySelectorAll('.trio .device')).map(function (pw) {
      var k = pw.classList.contains('l') ? 'l' : pw.classList.contains('r') ? 'r' : 'c';
      return { lag: LAG[k], slides: Array.prototype.slice.call(pw.querySelectorAll('.sl')) };
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
      var capNow = Math.round(stepAt(u, 0));
      if (capNow !== capOn && caps[capNow]) { caps[capOn].classList.remove('on'); caps[capNow].classList.add('on'); capOn = capNow; }
      phones.forEach(function (ph) {
        var f = stepAt(u, ph.lag);
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
    var aiScroll = document.querySelector('[data-ai-scroll]');
    var fit = aiScroll && aiScroll.querySelector('[data-ai-fit]');
    if (reduce || !aiScroll || !fit) {
      setStep(5); demo.classList.add('done');
      demo.querySelectorAll('.ln, .rule, .src').forEach(function (n) { n.classList.add('on'); });
    } else {
      /* The signature scene: pinned, and the scroll plays it. Each beat is a
         share of the pinned scroll, so scrolling back plays it backwards. */
      demo.classList.add('scrolly');
      root.classList.add('ai-scrolly');
      var lns = Array.prototype.slice.call(demo.querySelectorAll('.ln'));
      var rls = Array.prototype.slice.call(demo.querySelectorAll('.rule'));
      var srcEl = demo.querySelector('.src');
      var STEP = [0.03, 0.2, 0.42, 0.62, 0.7];          // s1..s5
      var RULE = [0.46, 0.51, 0.56], LINE = [0.72, 0.79, 0.86], SRC = 0.92;
      var aiQueued = false, curStep = -1;
      // Scale the scene to fit the screen (transform only, so layout and the
      // flow lines inside it are untouched).
      var fitIt = function () {
        fit.style.setProperty('--fit', '1');
        var h = fit.offsetHeight, room = window.innerHeight - 24;
        fit.style.setProperty('--fit', Math.min(1, room / Math.max(1, h)).toFixed(3));
      };
      var aiFrame = function () {
        aiQueued = false;
        var r = aiScroll.getBoundingClientRect(), vh = window.innerHeight;
        if (r.bottom < -vh || r.top > vh * 2) return;
        var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
        var n = 0;
        STEP.forEach(function (t, i) { if (p >= t) n = i + 1; });
        if (n !== curStep) { curStep = n; setStep(n); demo.classList.toggle('done', n >= 5); }
        rls.forEach(function (el, i) { el.classList.toggle('on', p >= RULE[i]); });
        lns.forEach(function (el, i) { el.classList.toggle('on', p >= LINE[i]); });
        if (srcEl) srcEl.classList.toggle('on', p >= SRC);
      };
      var aiScrollFn = function () { if (!aiQueued) { aiQueued = true; requestAnimationFrame(aiFrame); } };
      window.addEventListener('scroll', aiScrollFn, { passive: true });
      window.addEventListener('resize', function () { fitIt(); aiScrollFn(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitIt(); draw(); });
      document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { requestAnimationFrame(function () { fitIt(); draw(); }); }); });
      fitIt(); aiFrame();
    }
  }

  /* ---------- Features: a tile opens its screenshot large ---------- */
  var feats = Array.prototype.slice.call(document.querySelectorAll('.feat')).filter(function (f) { return f.querySelector('.peek img'); });
  var dlg = document.createElement('dialog');
  if (feats.length && typeof dlg.showModal === 'function') {
    dlg.className = 'shot-dlg';
    dlg.innerHTML = '<button type="button" class="shot-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<figure><div class="shot-frame"><img alt="" width="540" height="1110"></div><figcaption></figcaption></figure>';
    document.body.appendChild(dlg);
    var dImg = dlg.querySelector('img'), dCap = dlg.querySelector('figcaption'), dX = dlg.querySelector('.shot-x');
    var opener = null;
    var close = function () { if (dlg.open) dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dX.addEventListener('click', close);
    dlg.addEventListener('close', function () { root.classList.remove('dlg-open'); if (opener) opener.focus(); });
    var open = function (f) {
      if (f.classList.contains('no-shot')) return;
      var img = f.querySelector('.feat-dev img') || f.querySelector('.peek img'), base = img.getAttribute('data-base');
      dImg.src = base ? base + '-540.webp' : img.currentSrc || img.src;
      dImg.alt = img.alt || '';
      var h = f.querySelector('h3'), t = f.querySelector('p');
      dCap.innerHTML = '<b>' + (h ? h.innerHTML : '') + '</b>' + (t ? '<span class="shot-sub">' + t.innerHTML + '</span>' : '');
      dX.setAttribute('aria-label', lang === 'hi' ? 'बंद करें' : 'Close');
      opener = f;
      root.classList.add('dlg-open');
      dlg.showModal();
    };
    feats.forEach(function (f) {
      f.classList.add('opens');
      f.setAttribute('tabindex', '0');
      f.setAttribute('role', 'button');
      f.setAttribute('aria-haspopup', 'dialog');
      // Its name is its own heading and line, in the page language.
      f.addEventListener('click', function () { open(f); });
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(f); }
      });
    });
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

  /* The footer heart beats once when it comes into view. */
  var heartP = document.querySelector('[data-heart]');
  if (heartP && !reduce && 'IntersectionObserver' in window) {
    var hio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { hio.disconnect(); heartP.classList.add('beat'); }
    }, { threshold: 1 });
    hio.observe(heartP);
  }

  var y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
