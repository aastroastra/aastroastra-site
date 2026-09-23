import { ownership, tokenBudget } from './economics.mjs';
const gate = document.querySelector('#gate');
const report = document.querySelector('#report');
const actions = document.querySelector('#document-actions');
const password = document.querySelector('#password');
const status = document.querySelector('#unlock-status');
const form = document.querySelector('#unlock-form');
const button = form.querySelector('button');
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const values = f => Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, v.trim() === '' ? NaN : Number(v)]));
let controller;
let unlockGeneration = 0;
function lock() {
  unlockGeneration++;
  controller?.abort();
  controller = undefined;
  report.replaceChildren();
  report.hidden = true;
  actions.hidden = true;
  gate.hidden = false;
  password.value = '';
  status.textContent = '';
  button.disabled = false;
  history.replaceState(null, '', location.pathname);
  window.scrollTo(0, 0);
  password.focus();
}
function initReport() {
  controller = new AbortController();
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: controller.signal });
  for (const prefix of ['endpoint', 'catalog']) {
    const search = report.querySelector(`#${prefix}-search`);
    const filter = report.querySelector(`#${prefix}-filter`);
    const rows = [...report.querySelectorAll(`#${prefix}-table tbody tr`)];
    const update = () => {
      let shown = 0;
      for (const row of rows) {
        const selected = filter.value;
        const categoryMatch = selected === 'all' || (prefix === 'catalog' ? row.dataset.category === selected : selected === 'Observed' ? row.dataset.observed === 'true' : row.dataset.kind === selected);
        row.hidden = !(categoryMatch && row.dataset.search.includes(search.value.trim().toLowerCase()));
        if (!row.hidden) shown++;
      }
      report.querySelector(`#${prefix}-count`).textContent = `${shown} of ${rows.length} entries shown.`;
    };
    listen(search, 'input', update); listen(filter, 'change', update); update();
  }
  const costForm = report.querySelector('#cost-form');
  const costUpdate = () => {
    const results = report.querySelector('#cost-results');
    const verdict = report.querySelector('#cost-verdict');
    const bars = report.querySelector('#cost-bars');
    try {
      const input = values(costForm); const r = ownership(input);
      results.replaceChildren(); bars.replaceChildren();
      for (const [label, value] of [['Monthly infrastructure + residual vendor', money(r.cash)], ['Monthly total including upkeep', money(r.total)], ['Monthly net saving', money(r.savings)]]) {
        const div = document.createElement('div'); const span = document.createElement('span'); const strong = document.createElement('strong');
        span.textContent = label; strong.textContent = value; div.append(span, strong); results.append(div);
      }
      for (const [label, amount] of [['Vendor today', input.bill], ['Own + residual + upkeep', r.total]]) {
        const row = document.createElement('div'); row.className = 'bar-row';
        const span = document.createElement('span'); span.textContent = label;
        const progress = document.createElement('progress'); progress.max = Math.max(input.bill, r.total, 1); progress.value = amount; progress.setAttribute('aria-label', label);
        const b = document.createElement('b'); b.textContent = money(amount); row.append(span, progress, b); bars.append(row);
      }
      verdict.textContent = `${r.savings > 0 ? `Positive monthly savings. Simple payback: ${r.payback.toFixed(1)} months.` : 'No financial payback at these inputs; recurring ownership costs equal or exceed the vendor bill.'} ${input.months}-month net advantage after ${money(input.investment)} upfront investment: ${money(r.advantage)}. Residual vendor bill: ${money(r.remaining)}/month.`;
    } catch (e) { results.replaceChildren(); bars.replaceChildren(); verdict.textContent = e.message; }
  };
  listen(costForm, 'input', costUpdate); listen(costForm, 'submit', e => e.preventDefault()); costUpdate();
  const tokenForm = report.querySelector('#token-form');
  const tokenUpdate = () => {
    const output = report.querySelector('#token-results');
    try { const r = tokenBudget(values(tokenForm)); output.textContent = `Estimated API equivalent: $${r.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })} / ${money(r.inr)}. Editable pricing assumptions; excludes tools, tax, cache-write/long-context premiums and people. This is not a Codex top-up quote.`; }
    catch (e) { output.textContent = e.message; }
  };
  listen(tokenForm, 'input', tokenUpdate); listen(tokenForm, 'submit', e => e.preventDefault()); tokenUpdate();
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const generation = ++unlockGeneration;
  button.disabled = true; status.textContent = 'Unlocking the encrypted plan…';
  let plaintext;
  try {
    if (!crypto.subtle) throw new Error('unsupported');
    const response = await fetch('./plan.enc', { cache: 'no-store' });
    if (!response.ok) throw new Error('load');
    const envelope = await response.json();
    if (envelope.version !== 1 || envelope.cipher !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.iterations !== 310000) throw new Error('format');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.value), 'PBKDF2', false, ['deriveKey']);
    password.value = '';
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(envelope.salt), iterations: envelope.iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(envelope.iv) }, key, bytes(envelope.ciphertext));
    const content = JSON.parse(new TextDecoder().decode(plaintext));
    if (generation !== unlockGeneration) return;
    if (content.version !== 1 || typeof content.html !== 'string') throw new Error('format');
    // Trusted authored HTML is authenticated by AES-GCM; never render user-supplied HTML.
    report.innerHTML = content.html;
    initReport(); report.hidden = false; actions.hidden = false; gate.hidden = true; status.textContent = '';
    document.querySelector('#document').focus();
  } catch (e) {
    if (generation !== unlockGeneration) return;
    report.replaceChildren(); report.hidden = true; actions.hidden = true; gate.hidden = false;
    status.textContent = e.message === 'unsupported' ? 'Use a current browser over HTTPS to open this plan.' : e.message === 'load' ? 'The document could not be loaded. Please try again.' : 'Unable to unlock. Check the password and try again.';
    password.focus();
  } finally { if (plaintext) new Uint8Array(plaintext).fill(0); if (generation === unlockGeneration) button.disabled = false; }
});
document.querySelector('#lock').addEventListener('click', lock);
document.querySelector('#print').addEventListener('click', () => window.print());
window.addEventListener('pagehide', lock);
