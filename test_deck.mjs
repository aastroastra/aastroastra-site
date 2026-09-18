import assert from 'node:assert/strict';
import { createDecipheriv, createHash, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = ['deck/index.html', 'deck/deck.css', 'deck/deck.js', 'deck/deck.enc', 'deck/encrypt-deck.mjs', 'deck/README.md'];
const envelope = JSON.parse(readFileSync('deck/deck.enc', 'utf8'));

test('encrypted deck has a supported authenticated envelope', () => {
  assert.equal(envelope.version, 1);
  assert.equal(envelope.cipher, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.ok(envelope.iterations >= 300000);
  assert.equal(Buffer.from(envelope.salt, 'base64').length, 16);
  assert.equal(Buffer.from(envelope.iv, 'base64').length, 12);
  assert.ok(Buffer.from(envelope.ciphertext, 'base64').length > 10000);
});

test('committed source contains neither passcode nor plaintext investor copy', () => {
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n');
  assert.ok(!/\b\d{19}\b/.test(source));
  assert.ok(!source.includes('class="slide"'));
});

test('new deck source follows the no em dash rule', () => {
  for (const file of files) assert.ok(!readFileSync(file, 'utf8').includes('—'), file);
});

test('password decrypts a complete, sourced 14-slide presentation', { skip: !process.env.DECK_PASSWORD }, () => {
  const encrypted = Buffer.from(envelope.ciphertext, 'base64');
  const body = encrypted.subarray(0, -16);
  const tag = encrypted.subarray(-16);
  const key = pbkdf2Sync(process.env.DECK_PASSWORD, Buffer.from(envelope.salt, 'base64'), envelope.iterations, 32, 'sha256');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  const html = plain.toString('utf8');
  assert.equal((html.match(/<section class="slide"/g) || []).length, 14);
  assert.equal((html.match(/https:\/\//g) || []).length, 10);
  assert.equal(createHash('sha256').update(plain).digest('hex'), '90c31d225cab9eef68cef966d7737a2c2d58da8efd17176bfb7e85c97ddbae25');
});
