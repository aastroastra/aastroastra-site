/* Get-the-app bar for phones. Android sees Google Play, iPhone/iPad sees the
   public TestFlight beta, desktop sees nothing. Load it as the first element
   inside <body> (not deferred) so the bar is in place before first paint and
   pushes the page down instead of jumping in later.

   Google Ads policy: link only to Google Play and TestFlight, never to an
   APK or IPA file.

   No Safari Smart App Banner (<meta name="apple-itunes-app">): it needs an
   App Store app id, and the iPhone app is TestFlight only for now. */
(function () {
  'use strict';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.avdstudiox.android';
  var TESTFLIGHT = 'https://testflight.apple.com/join/HZXJ4Dav';
  var KEY = 'aa-appbar-dismissed';
  var SNOOZE_DAYS = 30;

  var nav = window.navigator || {};
  var ua = nav.userAgent || '';
  var uad = nav.userAgentData;
  // iPadOS 13+ asks for the desktop site and reports "Macintosh"; a Mac with
  // a touch screen is an iPad.
  var isIOS = /iPhone|iPad|iPod/.test(ua) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  var isIPad = /iPad/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  var isAndroid = !isIOS && ((uad && uad.platform === 'Android') || /Android/i.test(ua));
  if (!isIOS && !isAndroid) return;

  try {
    var t = Number(localStorage.getItem(KEY));
    if (t && Date.now() - t < SNOOZE_DAYS * 864e5) return;
  } catch (e) { /* storage is optional */ }

  var fromPdf = false;
  try { fromPdf = new URLSearchParams(location.search).get('src') === 'pdf'; } catch (e) { /* old browser */ }

  var COPY = {
    en: {
      sub: fromPdf ? 'Thanks for reading your report'
        : (isIOS ? (isIPad ? 'iPad beta' : 'iPhone beta') + ': your kundali, explained' : 'Your real kundali, computed and explained'),
      top: isIOS ? 'Join the iOS beta on' : 'Get it on',
      big: isIOS ? 'TestFlight' : 'Google Play',
      label: isIOS ? 'Join the iOS beta on TestFlight' : 'Get it on Google Play',
      close: 'Close'
    },
    hi: {
      sub: fromPdf ? 'अपनी रिपोर्ट पढ़ने के लिए धन्यवाद'
        : (isIOS ? (isIPad ? 'आईपैड बीटा' : 'आईफ़ोन बीटा') + ': आपकी कुंडली, समझाई हुई' : 'आपकी असली कुंडली, समझाई हुई'),
      top: isIOS ? 'iOS बीटा जॉइन करें' : 'इसे पाएँ',
      big: isIOS ? 'TestFlight पर' : 'Google Play पर',
      label: isIOS ? 'TestFlight पर iOS बीटा जॉइन करें' : 'इसे Google Play पर पाएँ',
      close: 'बंद करें'
    }
  };

  var css =
    '.aa-appbar{position:relative;z-index:5;background:var(--card,#fff);color:var(--fg,#1A1A1A);border-bottom:1px solid var(--line,#ECE6D8);' +
      'font-family:var(--font-body,"Inter","Noto Sans Devanagari",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif);-webkit-font-smoothing:antialiased;}' +
    '.aa-appbar-in{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:10px 16px 10px 6px;box-sizing:border-box;}' +
    '.aa-appbar-x{flex:none;width:32px;height:40px;border:0;background:transparent;color:var(--muted,#6E6859);font:400 22px/1 sans-serif;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;}' +
    '.aa-appbar-x:hover{color:var(--fg,#1A1A1A);}' +
    '.aa-appbar-icon{flex:none;width:40px;height:40px;border-radius:10px;background:var(--tint-grad,#E0A015);display:inline-flex;align-items:center;justify-content:center;}' +
    '.aa-appbar-icon i{width:26px;height:26px;background:var(--on-accent,#1A1A1A);-webkit-mask:url(/logo-mark.png) center/contain no-repeat;mask:url(/logo-mark.png) center/contain no-repeat;}' +
    '.aa-appbar-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}' +
    '.aa-appbar-txt b{font-size:14.5px;font-weight:700;letter-spacing:-.01em;line-height:1.25;}' +
    '.aa-appbar-txt span{font-size:12.5px;color:var(--fg2,#565043);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}' +
    '.aa-appbar-cta{flex:none;display:inline-flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;min-height:44px;padding:6px 14px;border-radius:12px;' +
      'background:var(--btn-bg,#0B0B0C);color:var(--btn-fg,#fff);text-decoration:none;line-height:1.1;}' +
    '.aa-appbar-cta small{font-size:10.5px;font-weight:500;opacity:.85;white-space:nowrap;}' +
    '.aa-appbar-cta strong{font-size:14.5px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;}' +
    '.aa-appbar-cta:hover{filter:brightness(1.08);}' +
    '.aa-appbar :focus-visible{outline:2px solid var(--tint,#E0A015);outline-offset:2px;}' +
    '@media(max-width:340px){.aa-appbar-txt span{display:none;}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.className = 'aa-appbar';
  bar.setAttribute('role', 'region');
  bar.innerHTML =
    '<div class="aa-appbar-in">' +
      '<button type="button" class="aa-appbar-x">&times;</button>' +
      '<span class="aa-appbar-icon" aria-hidden="true"><i></i></span>' +
      '<span class="aa-appbar-txt"><b>AstroAshwa</b><span></span></span>' +
      '<a class="aa-appbar-cta" target="_blank" rel="noopener"><small></small><strong></strong></a>' +
    '</div>';
  var cta = bar.querySelector('.aa-appbar-cta');
  var closeBtn = bar.querySelector('.aa-appbar-x');
  cta.href = isIOS ? TESTFLIGHT : PLAY;

  var root = document.documentElement;
  function lang() {
    var l = root.getAttribute('data-lang') || root.getAttribute('lang') || '';
    return l.indexOf('hi') === 0 ? 'hi' : 'en';
  }
  function render() {
    var l = lang(), c = COPY[l];
    bar.setAttribute('lang', l);
    bar.setAttribute('aria-label', c.label);
    bar.querySelector('.aa-appbar-txt span').textContent = c.sub;
    cta.querySelector('small').textContent = c.top;
    cta.querySelector('strong').textContent = c.big;
    cta.setAttribute('aria-label', c.label);
    closeBtn.setAttribute('aria-label', c.close);
    closeBtn.title = c.close;
  }
  render();
  // The homepage (React) and the content pages (pages.js) both update <html>
  // when the visitor switches language; follow them.
  if (window.MutationObserver) {
    new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }

  closeBtn.addEventListener('click', function () {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* hide for this page view only */ }
    if (bar.parentNode) bar.parentNode.removeChild(bar);
  });
  cta.addEventListener('click', function () {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'app_bar_click', { platform: isIOS ? 'ios' : 'android', src: fromPdf ? 'pdf' : 'site' });
      }
    } catch (e) { /* analytics is optional */ }
  });

  var body = document.body;
  if (body) body.insertBefore(bar, body.firstChild);
  else document.addEventListener('DOMContentLoaded', function () { document.body.insertBefore(bar, document.body.firstChild); });
})();
