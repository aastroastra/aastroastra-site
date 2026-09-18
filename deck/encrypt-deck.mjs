import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
const password = process.env.DECK_PASSWORD;
if (!input || !output || !password) {
  console.error('Usage: DECK_PASSWORD=... node deck/encrypt-deck.mjs input.html deck/deck.enc');
  process.exit(2);
}

const iterations = 310000;
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(readFileSync(input)), cipher.final(), cipher.getAuthTag()]);
const envelope = {
  version: 1,
  cipher: 'AES-256-GCM',
  kdf: 'PBKDF2-SHA-256',
  iterations,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ciphertext: encrypted.toString('base64')
};
writeFileSync(output, `${JSON.stringify(envelope)}\n`, { mode: 0o644 });
console.log(`Encrypted ${input} to ${output} (${encrypted.length} bytes).`);
