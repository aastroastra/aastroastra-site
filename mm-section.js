/* Multi-match explainer on the home page. Self-contained: reads only its own
   section ([data-mm]) and the page's data-lang / reduced-motion state.

   The maths is the app's, rule for rule (iOS MultiMatchEngine + MultiMatchTypes,
   Android MultiMatchEngine.weightsFor / rankFor, workspace/docs/multimatch-types-spec.md):
   - Each type is defined by koota points only (Physical = Yoni, Love = Bhakoot +
     Graha Maitri, ...).
   - Match score = 100 x (0.61 x weighted guna + 0.22 x Manglik + 0.17 x numerology)
     x dosha gates; the kootas behind the picked type count 2.5x their base weight.
   - Ties go to the higher points on the picked type's kootas.
   - The reading is the weakest koota of the type at its own band.
   The three candidates are demo data. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-mm]');
  if (!sec) return;
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MAX = { varna: 1, vashya: 2, tara: 3, yoni: 4, maitri: 5, gana: 6, bhakoot: 7, nadi: 8 };
  var BASE_W = { varna: 0.5, vashya: 1, tara: 1, yoni: 1.5, maitri: 1.5, gana: 1.5, bhakoot: 2.5, nadi: 3 };
  var ORDER = ['varna', 'vashya', 'tara', 'yoni', 'maitri', 'gana', 'bhakoot', 'nadi'];
  var KOOTA = {
    varna: ['Varna', 'वर्ण'], vashya: ['Vashya', 'वश्य'], tara: ['Tara', 'तारा'], yoni: ['Yoni', 'योनि'],
    maitri: ['Graha Maitri', 'ग्रह मैत्री'], gana: ['Gana', 'गण'], bhakoot: ['Bhakoot', 'भकूट'], nadi: ['Nadi', 'नाड़ी']
  };
  var TYPES = {
    guna: { k: [], n: ['Overall guna', 'कुल गुण'] },
    love: { k: ['bhakoot', 'maitri'], n: ['Love', 'प्रेम'] },
    physical: { k: ['yoni'], n: ['Physical', 'शारीरिक'] },
    friendship: { k: ['maitri', 'gana'], n: ['Friendship', 'मित्रता'] },
    temperament: { k: ['gana'], n: ['Temperament', 'स्वभाव'] },
    destiny: { k: ['tara'], n: ['Destiny', 'भाग्य'] }
  };
  var BAND = { strong: ['Strong', 'मजबूत'], fair: ['Fair', 'ठीक'], weak: ['Weak', 'कमज़ोर'] };
  // First sentence of the app's reading for each koota x band (mmt_read_*).
  var READ = {
    guna: { strong: ['Your charts agree on most of the eight kootas.', 'आपकी कुंडलियाँ आठ में से ज़्यादातर कूटों पर सहमत हैं।'],
            fair: ['Your charts agree on some kootas and differ on others.', 'आपकी कुंडलियाँ कुछ कूटों पर सहमत हैं और कुछ पर अलग।'] },
    yoni: { strong: ['Your physical natures fit well, with ease and comfort in intimacy.', 'आपकी शारीरिक प्रकृति अच्छी तरह मेल खाती है, और अंतरंगता में सहजता व आराम रहता है।'],
            fair: ['Physical compatibility is moderate.', 'शारीरिक अनुकूलता मध्यम है।'],
            weak: ['Your physical natures differ, so intimacy may not feel easy at first.', 'आपकी शारीरिक प्रकृति अलग है, इसलिए शुरुआत में अंतरंगता आसान नहीं लग सकती।'] },
    maitri: { strong: ['The lords of your Moon signs are friends, so your minds meet easily.', 'आपकी चंद्र राशियों के स्वामी मित्र हैं, इसलिए आपके मन आसानी से मिलते हैं।'],
              fair: ['The lords of your Moon signs are neutral to each other.', 'आपकी चंद्र राशियों के स्वामी एक-दूसरे के प्रति तटस्थ हैं।'],
              weak: ['The lords of your Moon signs are at odds, so you may often think differently.', 'आपकी चंद्र राशियों के स्वामी आपस में मेल नहीं खाते, इसलिए आप अक्सर अलग सोच सकते हैं।'] },
    gana: { strong: ['Your temperaments match, so daily life feels easy together.', 'आपके स्वभाव मिलते हैं, इसलिए रोज़मर्रा की ज़िंदगी साथ में आसान लगती है।'],
            fair: ['Your temperaments differ a little.', 'आपके स्वभाव थोड़े अलग हैं।'],
            weak: ['Your temperaments clash, the classic Gana dosha.', 'आपके स्वभाव टकराते हैं, यही क्लासिक गण दोष है।'] },
    bhakoot: { strong: ['Your Moon signs sit in a favourable relation for love, family and money.', 'प्रेम, परिवार और धन के लिहाज़ से आपकी चंद्र राशियाँ अनुकूल स्थिति में हैं।'] },
    tara: { strong: ['Your birth stars support each other’s wellbeing and fortune.', 'आपके जन्म नक्षत्र एक-दूसरे की खुशहाली और भाग्य का साथ देते हैं।'],
            fair: ['Your birth stars are partly supportive.', 'आपके जन्म नक्षत्र आंशिक रूप से एक-दूसरे का साथ देते हैं।'],
            weak: ['Your birth stars sit in a difficult relation for fortune and wellbeing.', 'भाग्य और खुशहाली के लिहाज़ से आपके जन्म नक्षत्र मुश्किल स्थिति में हैं।'] }
  };
  // Demo candidates: plausible koota points, both sides' Manglik known and matching,
  // a numerology vibe, and no dosha (every candidate is in the Recommended bucket).
  var PEOPLE = [
    { id: 'neha', n: ['Neha', 'नेहा'], s: { varna: 1, vashya: 2, tara: 3, yoni: 4, maitri: 2, gana: 1, bhakoot: 7, nadi: 8 }, num: 0.70 },
    { id: 'anita', n: ['Anita', 'अनीता'], s: { varna: 1, vashya: 0.5, tara: 1.5, yoni: 2, maitri: 5, gana: 5, bhakoot: 7, nadi: 8 }, num: 0.55 },
    { id: 'priya', n: ['Priya', 'प्रिया'], s: { varna: 1, vashya: 2, tara: 1.5, yoni: 1, maitri: 4, gana: 6, bhakoot: 7, nadi: 8 }, num: 0.62 }
  ];

  function band(p, m) { var x = m > 0 ? p / m : 0; return x >= 0.75 ? 'strong' : x >= 0.40 ? 'fair' : 'weak'; }
  function fmt(x) { return (Math.round(x * 10) / 10).toString(); }
  function guna(c) { return ORDER.reduce(function (a, k) { return a + c.s[k]; }, 0); }
  function score(c, type) {
    var w = {}, boost = TYPES[type].k;
    ORDER.forEach(function (k) { w[k] = BASE_W[k] * (boost.indexOf(k) >= 0 ? 2.5 : 1); });
    var num = 0, den = 0;
    ORDER.forEach(function (k) { num += c.s[k] * w[k]; den += MAX[k] * w[k]; });
    var g = den ? num / den : 0;
    return Math.round(100 * (0.61 * g + 0.22 * 1.0 + 0.17 * c.num));
  }
  function focus(c, type) {
    var ks = TYPES[type].k.length ? TYPES[type].k : ORDER, p = 0, m = 0;
    ks.forEach(function (k) { p += c.s[k]; m += MAX[k]; });
    return m ? p / m : 0;
  }
  // The driver: Overall uses the guna total; a one-koota type its koota; a
  // two-koota type its weakest koota (first listed wins a tie).
  function driver(c, type) {
    var ks = TYPES[type].k;
    if (!ks.length) { var t = guna(c); return { key: 'guna', p: t, m: 36, b: band(t, 36) }; }
    var lead = ks[0];
    ks.forEach(function (k) { if (c.s[k] / MAX[k] < c.s[lead] / MAX[lead]) lead = k; });
    return { key: lead, p: c.s[lead], m: MAX[lead], b: band(c.s[lead], MAX[lead]) };
  }
  function bi(en, hi) { return '<span lang="en">' + en + '</span><span lang="hi">' + hi + '</span>'; }

  var list = sec.querySelector('[data-mm-list]');
  var chips = Array.prototype.slice.call(sec.querySelectorAll('[data-mm-type]'));
  var rankedFor = sec.querySelector('[data-mm-for]');
  var rows = {};
  PEOPLE.forEach(function (c) {
    var li = document.createElement('li');
    li.className = 'mm-row';
    li.innerHTML = '<span class="mm-rank" aria-hidden="true"></span>' +
      '<span class="mm-av" aria-hidden="true">' + c.n[0].charAt(0) + '</span>' +
      '<div class="mm-body"><p class="mm-name">' + bi(c.n[0], c.n[1]) + '</p><p class="mm-sub"></p><p class="mm-why"></p></div>' +
      '<p class="mm-pct"><b></b><small>%</small></p>';
    rows[c.id] = li;
    list.appendChild(li);
  });

  function render(type, animate, reversed) {
    var first = {};
    if (animate) PEOPLE.forEach(function (c) { first[c.id] = rows[c.id].getBoundingClientRect().top; });
    var ranked = PEOPLE.map(function (c) { return { c: c, v: score(c, type), f: focus(c, type) }; })
      .sort(function (a, b) { return b.v - a.v || b.f - a.f; });
    // Before the thread reaches the list: lowest first, unranked, waiting.
    if (reversed) ranked.reverse();
    var tn = TYPES[type].n;
    ranked.forEach(function (r, i) {
      var li = rows[r.c.id], d = driver(r.c, type), read = (READ[d.key] || {})[d.b] || ['', ''];
      li.querySelector('.mm-rank').textContent = reversed ? '' : String(i + 1);
      li.querySelector('.mm-pct b').textContent = String(r.v);
      li.querySelector('.mm-sub').innerHTML = bi(r.v + '% for ' + tn[0] + ' · ' + fmt(guna(r.c)) + '/36 guna',
        tn[1] + ' के लिए ' + r.v + '% · ' + fmt(guna(r.c)) + '/36 गुण');
      var kn = d.key === 'guna' ? ['Guna', 'गुण'] : KOOTA[d.key];
      li.querySelector('.mm-why').innerHTML = '<span class="mm-k mm-' + d.b + '">' + bi(kn[0], kn[1]) + ' ' + fmt(d.p) + '/' + d.m +
        ' · ' + bi(BAND[d.b][0], BAND[d.b][1]) + '</span> ' + bi(read[0], read[1]);
      li.classList.toggle('top', !reversed && i === 0);
      list.appendChild(li);   // DOM order follows the rank, for screen readers too
    });
    rankedFor.innerHTML = bi('Ranked for: ' + tn[0], tn[1] + ' के लिए रैंक');
    chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mm-type') === type)); });
    if (!animate || reduce) return;
    // FLIP: rows slide from where they were to their new place.
    PEOPLE.forEach(function (c) {
      var li = rows[c.id], dy = first[c.id] - li.getBoundingClientRect().top;
      if (!dy) return;
      li.style.transition = 'none';
      li.style.transform = 'translate3d(0,' + dy + 'px,0)';
      li.getBoundingClientRect();
      li.style.transition = '';
      li.style.transform = '';
    });
    list.classList.remove('flash'); void list.offsetWidth; list.classList.add('flash');
  }
  var waiting = false;
  chips.forEach(function (b) {
    b.addEventListener('click', function () { waiting = false; sec.classList.remove('mm-waiting'); render(b.getAttribute('data-mm-type'), true); });
  });
  /* The rows start unranked and sort themselves when the thread reaches the
     list (thread.js sends aa:mm-sort), or when the list is well in view. */
  function sortNow() {
    if (!waiting) return;
    waiting = false;
    sec.classList.remove('mm-waiting');
    render('guna', true);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    waiting = true;
    sec.classList.add('mm-waiting');
    render('guna', false, true);
    document.addEventListener('aa:mm-sort', sortNow);
    var mio = new IntersectionObserver(function (es) {
      if (es[0].intersectionRatio >= 0.9) { mio.disconnect(); setTimeout(sortNow, 400); }
    }, { threshold: [0.9] });
    mio.observe(list);
  } else {
    render('guna', false);
  }
})();
