/* /r/<CODE> referral landing page.
 *
 * GitHub Pages is static, so https://www.aastroastra.com/r/PRYA7K3M has no file
 * of its own. The site's /404.html sees the /r/<CODE> path and replaces it with
 * /r/?c=PRYA7K3M, which serves this page. This script also reads the code from
 * the path itself (/r/PRYA7K3M), ?code= and #PRYA7K3M, so the page works
 * whichever way it is reached.
 *
 * Amounts are deliberately not shown: they are admin-controlled and this page
 * cannot read them without a session.
 */
(function (root) {
  'use strict';

  var CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6,8}$/;
  var PACKAGE = 'com.avdstudiox.android';
  var SITE = 'https://www.aastroastra.com';
  var IOS_STORE = 'https://testflight.apple.com/join/HZXJ4Dav';

  function normalize(raw) {
    if (raw == null) return null;
    var value = String(raw);
    try { value = decodeURIComponent(value); } catch (_) { /* keep raw */ }
    value = value.trim().toUpperCase();
    return CODE_RE.test(value) ? value : null;
  }

  // Returns {code, raw}: code is the valid, upper-cased code or null; raw says
  // whether anything code-like was present (to tell "no code" from "bad code").
  function parseCode(pathname, search, hash) {
    var params = new URLSearchParams(search || '');
    var candidates = [params.get('c'), params.get('code')];
    var m = /^\/r\/([^/?#]+)\/?$/.exec(pathname || '');
    if (m) candidates.push(m[1]);
    if (hash && hash.length > 1) candidates.push(hash.slice(1));
    var raw = false;
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] == null || candidates[i] === '') continue;
      raw = true;
      var code = normalize(candidates[i]);
      if (code) return { code: code, raw: true };
    }
    return { code: null, raw: raw };
  }

  function playUrl(code) {
    var base = 'https://play.google.com/store/apps/details?id=' + PACKAGE;
    if (!code) return base;
    // Play Install Referrer: the referrer value is itself a query string, URL-encoded once.
    return base + '&referrer=' + encodeURIComponent('utm_source=referral&referral_code=' + code);
  }

  function shareUrl(code) { return SITE + '/r/' + code; }

  // Android: an explicit intent for the https invite link, so the app opens even
  // before App Links verification, and Play (with the referrer) otherwise.
  function androidIntentUrl(code) {
    return 'intent://www.aastroastra.com/r/' + code +
      '#Intent;scheme=https;package=' + PACKAGE +
      ';S.browser_fallback_url=' + encodeURIComponent(playUrl(code)) + ';end';
  }

  // iOS: a Universal Link tapped on its own domain stays in Safari, so the button
  // uses the app's custom scheme (aastroastra://), which both apps register.
  function iosSchemeUrl(code) { return 'aastroastra://r/' + code; }

  function platform(ua) {
    ua = ua || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua))) return 'ios';
    return 'other';
  }

  var STRINGS = {
    en: {
      eyebrow: 'Invitation',
      title: 'Your friend invited you to AastroAstra',
      lead: 'Get free credits when you join with this invite code.',
      codeLabel: 'Your invite code',
      copy: 'Copy',
      copied: 'Code copied',
      copyFailed: 'Could not copy. Select the code and copy it.',
      invalidTitle: 'This invite link looks incomplete',
      invalidBody: 'Ask your friend to send the full link again. You can still install the app below.',
      openApp: 'Open in app',
      play: 'Get it on Google Play',
      ios: 'Get it on iPhone (TestFlight)',
      noteAndroid: 'Installing from Google Play brings your code along. If the app asks, paste the code above.',
      noteIos: 'On iPhone: after installing, open the app — it will offer to paste your code.',
      tfNeed: 'New to TestFlight?',
      tfGet: 'Install TestFlight first',
      fine: 'Credits are for use in the app only. They have no cash value and cannot be transferred. The invite bonus is for new accounts, for a limited time after sign-up.',
      docTitle: "You're invited · AastroAstra"
    },
    hi: {
      eyebrow: 'आमंत्रण',
      title: 'आपके मित्र ने आपको AastroAstra पर आमंत्रित किया है',
      lead: 'इस आमंत्रण कोड के साथ जुड़ें और मुफ़्त क्रेडिट पाएँ।',
      codeLabel: 'आपका आमंत्रण कोड',
      copy: 'कॉपी करें',
      copied: 'कोड कॉपी हो गया',
      copyFailed: 'कॉपी नहीं हो सका। कोड चुनकर कॉपी करें।',
      invalidTitle: 'यह आमंत्रण लिंक अधूरा लगता है',
      invalidBody: 'अपने मित्र से पूरा लिंक दोबारा भेजने को कहें। आप नीचे से ऐप फिर भी इंस्टॉल कर सकते हैं।',
      openApp: 'ऐप में खोलें',
      play: 'Google Play से पाएँ',
      ios: 'iPhone पर पाएँ (TestFlight)',
      noteAndroid: 'Google Play से इंस्टॉल करने पर आपका कोड साथ आता है। अगर ऐप पूछे, तो ऊपर दिया कोड पेस्ट करें।',
      noteIos: 'iPhone पर: इंस्टॉल करने के बाद ऐप खोलें — वह आपका कोड पेस्ट करने का विकल्प देगा।',
      tfNeed: 'TestFlight नया है?',
      tfGet: 'पहले TestFlight इंस्टॉल करें',
      fine: 'क्रेडिट केवल ऐप में उपयोग के लिए हैं। इनका कोई नकद मूल्य नहीं है और इन्हें ट्रांसफ़र नहीं किया जा सकता। आमंत्रण बोनस नए खातों के लिए है, साइन-अप के बाद सीमित समय तक।',
      docTitle: 'आपको आमंत्रण · AastroAstra'
    }
  };

  var api = {
    CODE_RE: CODE_RE, normalize: normalize, parseCode: parseCode, playUrl: playUrl,
    shareUrl: shareUrl, androidIntentUrl: androidIntentUrl, iosSchemeUrl: iosSchemeUrl,
    platform: platform, STRINGS: STRINGS, IOS_STORE: IOS_STORE
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ─── Browser ───────────────────────────────────────────────────────────────
  var doc = root.document;
  var parsed = parseCode(root.location.pathname, root.location.search, root.location.hash);
  var code = parsed.code;
  var os = platform(root.navigator.userAgent);
  var lang = 'en';
  try { lang = root.localStorage.getItem('aa-lang') === 'hi' ? 'hi' : 'en'; } catch (_) { /* optional */ }
  if (!/[?&]lang=/.test(root.location.search) && lang === 'en' &&
      /^hi\b/i.test((root.navigator.language || ''))) { lang = 'hi'; }
  var langParam = new URLSearchParams(root.location.search).get('lang');
  if (langParam === 'hi' || langParam === 'en') lang = langParam;

  function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key]; }

  function applyLang() {
    doc.documentElement.lang = lang;
    doc.title = t('docTitle');
    doc.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    doc.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
  }

  function copyText(text) {
    if (root.navigator.clipboard && root.isSecureContext) {
      return root.navigator.clipboard.writeText(text).then(function () { return true; }, fallbackCopy);
    }
    return Promise.resolve(fallbackCopy());
    function fallbackCopy() {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (_) { ok = false; }
      doc.body.removeChild(ta);
      return ok;
    }
  }

  function setStatus(ok) {
    var el = doc.getElementById('copy-status');
    el.textContent = ok ? t('copied') : t('copyFailed');
  }

  function init() {
    // Keep the address bar tidy and shareable: /r/?c=CODE → /r/CODE is not
    // servable on Pages, so settle on the canonical query form.
    if (code && root.history && root.history.replaceState && root.location.pathname !== '/r/') {
      try { root.history.replaceState(null, '', '/r/?c=' + code); } catch (_) { /* cosmetic */ }
    }

    applyLang();
    doc.querySelectorAll('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () {
        lang = b.getAttribute('data-lang');
        try { root.localStorage.setItem('aa-lang', lang); } catch (_) { /* optional */ }
        applyLang();
      });
    });

    var play = doc.getElementById('play');
    var ios = doc.getElementById('ios');
    var open = doc.getElementById('open-app');
    play.href = playUrl(code);
    ios.href = IOS_STORE;

    if (code) {
      doc.getElementById('code-card').hidden = false;
      doc.getElementById('code').textContent = code;
      doc.getElementById('copy').addEventListener('click', function () {
        copyText(code).then(setStatus);
      });
      // Copy before leaving for the App Store so the app can offer to paste it.
      ios.addEventListener('click', function () { copyText(code); });
      if (os === 'android') open.href = androidIntentUrl(code);
      else if (os === 'ios') open.href = iosSchemeUrl(code);
      else open.hidden = true; // desktop: nothing to open
    } else {
      if (parsed.raw) doc.getElementById('invalid').hidden = false;
      open.hidden = true;
    }

    // Put the relevant store first and hide the other platform's note.
    var actions = open.parentNode;
    if (os === 'ios') { actions.insertBefore(ios, play); doc.getElementById('note-android').hidden = true; }
    if (os === 'android') {
      doc.getElementById('note-ios').hidden = true;
      ios.parentNode.appendChild(ios);
      doc.querySelector('.r-small').hidden = true;
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
