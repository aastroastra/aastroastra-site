(() => {
  'use strict';

  const keyStore = 'aa-deck-key-v1';
  const gate = document.querySelector('#gate');
  const shell = document.querySelector('#deck-shell');
  const form = document.querySelector('#unlock-form');
  const passcode = document.querySelector('#passcode');
  const status = document.querySelector('#gate-status');
  const presentation = document.querySelector('#presentation');
  let envelope;
  let activeKey;
  let slides = [];
  let current = 0;

  const decode = value => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  const loadEnvelope = async () => {
    if (!envelope) {
      const response = await fetch('deck.enc', { cache: 'no-store' });
      if (!response.ok) throw new Error('The private deck is temporarily unavailable.');
      envelope = await response.json();
      if (envelope.version !== 1 || envelope.cipher !== 'AES-256-GCM') {
        throw new Error('This deck format is not supported.');
      }
    }
    return envelope;
  };

  const importStoredKey = async raw => crypto.subtle.importKey(
    'raw', decode(raw), { name: 'AES-GCM' }, false, ['decrypt']
  );

  const deriveKey = async (secret, data) => {
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: decode(data.salt), iterations: data.iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  };

  const decrypt = async key => {
    const data = await loadEnvelope();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decode(data.iv) }, key, decode(data.ciphertext)
    );
    return new TextDecoder().decode(plain);
  };

  const decryptFile = async (path, key) => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('The protected download is temporarily unavailable.');
    const data = await response.json();
    if (data.version !== 1 || data.cipher !== 'AES-256-GCM') throw new Error('Unsupported protected download.');
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decode(data.iv) }, key, decode(data.ciphertext)
    );
  };

  const showDeck = (markup, key) => {
    activeKey = key;
    presentation.innerHTML = markup;
    gate.hidden = true;
    shell.hidden = false;
    document.body.classList.add('deck-open');
    initDeck();
    requestAnimationFrame(() => presentation.focus({ preventScroll: true }));
  };

  const unlockWithKey = async key => {
    const markup = await decrypt(key);
    showDeck(markup, key);
  };

  const restore = async () => {
    let saved;
    try { saved = sessionStorage.getItem(keyStore); } catch (_) { /* Session storage is optional. */ }
    if (!saved) return;
    try {
      await unlockWithKey(await importStoredKey(saved));
    } catch (_) {
      try { sessionStorage.removeItem(keyStore); } catch (_) { /* Ignore unavailable storage. */ }
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.dataset.tone = 'working';
    status.textContent = 'Opening private deck…';
    form.querySelector('button').disabled = true;
    try {
      const data = await loadEnvelope();
      const key = await deriveKey(passcode.value, data);
      const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
      const stored = btoa(String.fromCharCode(...raw));
      const markup = await decrypt(key);
      try { sessionStorage.setItem(keyStore, stored); } catch (_) { /* Current view still works. */ }
      passcode.value = '';
      showDeck(markup, key);
    } catch (_) {
      status.dataset.tone = 'error';
      status.textContent = 'That passcode did not open the deck.';
      passcode.select();
    } finally {
      form.querySelector('button').disabled = false;
    }
  });

  const go = index => {
    if (!slides.length) return;
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides[current].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const renderPosition = index => {
    current = index;
    document.querySelector('#current-slide').textContent = String(index + 1).padStart(2, '0');
    document.querySelector('#progress').style.width = `${((index + 1) / slides.length) * 100}%`;
    document.querySelector('#previous').disabled = index === 0;
    document.querySelector('#next').disabled = index === slides.length - 1;
  };

  function initDeck() {
    slides = [...presentation.querySelectorAll('.slide')];
    document.querySelector('#total-slides').textContent = String(slides.length).padStart(2, '0');
    slides.forEach((slide, index) => {
      slide.dataset.index = index;
      slide.querySelector('.slide-num')?.setAttribute('aria-hidden', 'true');
    });
    renderPosition(0);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) renderPosition(Number(visible.target.dataset.index));
    }, { root: presentation, threshold: [.1, .35, .65] });
    slides.forEach(slide => observer.observe(slide));
    let frame;
    presentation.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = presentation.scrollTop;
        const nearest = slides.reduce((best, slide, index) => {
          const distance = Math.abs(slide.offsetTop - top);
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Number.POSITIVE_INFINITY });
        renderPosition(nearest.index);
      });
    }, { passive: true });
    document.querySelector('#previous').onclick = () => go(current - 1);
    document.querySelector('#next').onclick = () => go(current + 1);
  }

  document.addEventListener('keydown', event => {
    if (shell.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const actions = {
      ArrowRight: () => go(current + 1), ArrowDown: () => go(current + 1), PageDown: () => go(current + 1),
      ArrowLeft: () => go(current - 1), ArrowUp: () => go(current - 1), PageUp: () => go(current - 1),
      Home: () => go(0), End: () => go(slides.length - 1)
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });

  document.querySelector('#fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch (_) { /* Full screen is optional. */ }
  });

  document.querySelector('#download-pdf').addEventListener('click', async event => {
    const button = event.currentTarget;
    if (!activeKey || button.getAttribute('aria-busy') === 'true') return;
    button.setAttribute('aria-busy', 'true');
    const label = button.textContent;
    button.textContent = 'Preparing…';
    try {
      const plain = await decryptFile('deck.pdf.enc', activeKey);
      const url = URL.createObjectURL(new Blob([plain], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'AastroAstra-Investor-Deck-September-2026.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (_) {
      button.textContent = 'Try again';
      setTimeout(() => { button.textContent = label; }, 1800);
    } finally {
      button.removeAttribute('aria-busy');
      if (button.textContent !== 'Try again') button.textContent = label;
    }
  });

  document.querySelector('#lock').addEventListener('click', () => {
    try { sessionStorage.removeItem(keyStore); } catch (_) { /* Ignore unavailable storage. */ }
    presentation.replaceChildren();
    activeKey = undefined;
    shell.hidden = true;
    gate.hidden = false;
    document.body.classList.remove('deck-open');
    status.textContent = '';
    passcode.focus();
  });

  restore();
})();
