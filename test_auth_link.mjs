import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('./auth/confirm/auth.js', import.meta.url), 'utf8');
function render(fragment) {
  const nodes = { 'open-app': { hidden: true }, message: {} };
  const history = [];
  const window = {
    location: { hash: fragment, pathname: '/auth/confirm/' },
    history: { replaceState: (...args) => history.push(args) },
  };
  vm.runInNewContext(script, { window, document: { getElementById: id => nodes[id] }, URL, URLSearchParams });
  return { nodes, history };
}
const hash = 'a'.repeat(64);
test('a branded link preserves leading zeroes and creates only the registered callback', () => {
  const { nodes, history } = render(`#token_hash=${hash}&type=email&otp=012345`);
  const url = new URL(nodes['open-app'].href);
  assert.equal(url.protocol, 'aastroastra:');
  assert.equal(url.host, 'login-callback');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('otp'), '012345');
  assert.equal(nodes['open-app'].hidden, false);
  assert.equal(history[0][2], '/auth/confirm/');
});
test('incomplete duplicate and invalid credentials never create a callback', () => {
  for (const value of ['', '#otp=123456', `#token_hash=${hash}&type=email&otp=1234`, `#token_hash=${hash}&type=email&otp=012345&otp=654321`, `#token_hash=${hash}&type=recovery&otp=012345`]) {
    const { nodes, history } = render(value);
    assert.equal(nodes['open-app'].href, undefined);
    assert.equal(nodes['open-app'].hidden, true);
    assert.ok(nodes.message.textContent.includes('incomplete'));
    assert.equal(history[0][2], '/auth/confirm/');
  }
});
test('the landing page has no third-party resources and does not send or store credentials', () => {
  const html = readFileSync(new URL('./auth/confirm/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('name="referrer" content="no-referrer"'));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|console\./.test(script));
  assert.ok(!/https?:\/\//.test(html));
});
