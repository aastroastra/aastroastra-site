import assert from 'node:assert/strict';
import { createDecipheriv, createHash, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = ['deck/index.html', 'deck/deck.css', 'deck/deck.js', 'deck/deck.enc', 'deck/deck.pdf.enc', 'deck/encrypt-deck.mjs', 'deck/README.md'];
const envelope = JSON.parse(readFileSync('deck/deck.enc', 'utf8'));
const pdfEnvelope = JSON.parse(readFileSync('deck/deck.pdf.enc', 'utf8'));

const decryptEnvelope = (data, password) => {
  const encrypted = Buffer.from(data.ciphertext, 'base64');
  const body = encrypted.subarray(0, -16);
  const tag = encrypted.subarray(-16);
  const key = pbkdf2Sync(password, Buffer.from(data.salt, 'base64'), data.iterations, 32, 'sha256');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
};

test('encrypted deck has a supported authenticated envelope', () => {
  assert.equal(envelope.version, 1);
  assert.equal(envelope.cipher, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.ok(envelope.iterations >= 300000);
  assert.equal(Buffer.from(envelope.salt, 'base64').length, 16);
  assert.equal(Buffer.from(envelope.iv, 'base64').length, 12);
  assert.ok(Buffer.from(envelope.ciphertext, 'base64').length > 10000);
});

test('encrypted PDF has a supported authenticated envelope', () => {
  assert.equal(pdfEnvelope.version, 1);
  assert.equal(pdfEnvelope.cipher, 'AES-256-GCM');
  assert.equal(pdfEnvelope.kdf, 'PBKDF2-SHA-256');
  assert.ok(pdfEnvelope.iterations >= 300000);
  assert.equal(Buffer.from(pdfEnvelope.salt, 'base64').length, 16);
  assert.equal(Buffer.from(pdfEnvelope.iv, 'base64').length, 12);
  assert.ok(Buffer.from(pdfEnvelope.ciphertext, 'base64').length > 100000);
  assert.equal(pdfEnvelope.iterations, envelope.iterations);
  assert.equal(pdfEnvelope.salt, envelope.salt);
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
  const plain = decryptEnvelope(envelope, process.env.DECK_PASSWORD);
  const html = plain.toString('utf8');
  assert.equal((html.match(/<section class="slide"/g) || []).length, 14);
  assert.equal((html.match(/https:\/\//g) || []).length, 10);
  assert.equal(createHash('sha256').update(plain).digest('hex'), '6fae99590974f0220d89b70bd41b4e7dd01fadaa8a7bc808d42dc16e3ac212dc');
});

test('password decrypts the PDF download', { skip: !process.env.DECK_PASSWORD }, () => {
  const pdf = decryptEnvelope(pdfEnvelope, process.env.DECK_PASSWORD);
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 100000);
});
