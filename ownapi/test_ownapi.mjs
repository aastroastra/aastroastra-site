import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
import { ownership, tokenBudget } from './economics.mjs';
test('low traffic costs more when upkeep and residual vendor are included', () => {
 const r = ownership({bill:10000,calls:3200,removed:90,infra:9000,variable:0.005,maintenance:20000,investment:1800000,months:12});
 assert.equal(r.cash,10016);assert.equal(r.total,30016);assert.equal(r.savings,-20016);assert.equal(r.payback,null);assert.equal(r.advantage,-2040192);
});
test('positive million-call case and period total reconcile', () => {
 const r=ownership({bill:100000,calls:1000000,removed:100,infra:9000,variable:0.005,maintenance:20000,investment:1800000,months:36});
 assert.equal(r.total,34000);assert.equal(r.savings,66000);assert.equal(r.payback,1800000/66000);assert.equal(r.advantage,576000);
});
test('zero traffic and invalid inputs do not invent payback', () => {
 const x={bill:0,calls:0,removed:0,infra:0,variable:0,maintenance:0,investment:0,months:12};
 assert.equal(ownership(x).payback,null);assert.throws(()=>ownership({...x,removed:101}));assert.throws(()=>ownership({...x,bill:NaN}));assert.throws(()=>ownership({...x,calls:-1}));
});
test('token units are millions, no repeated million multiplier',()=>{assert.deepEqual(tokenBudget({tin:60,tout:6,pin:3,pout:15,fx:90}),{usd:270,inr:24300});assert.throws(()=>tokenBudget({tin:1,tout:1,pin:1,pout:1,fx:0}));});
test('published envelope is authenticated and rejects a wrong password',()=>{
 const e=JSON.parse(readFileSync(new URL('./plan.enc',import.meta.url)));assert.equal(e.iterations,310000);
 const ciphertext=Buffer.from(e.ciphertext,'base64');const key=pbkdf2Sync('known-wrong-password',Buffer.from(e.salt,'base64'),e.iterations,32,'sha256');
 const d=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));d.setAuthTag(ciphertext.subarray(-16));assert.throws(()=>Buffer.concat([d.update(ciphertext.subarray(0,-16)),d.final()]));
 assert.ok(!readFileSync(new URL('./plan.enc',import.meta.url),'utf8').includes('3,227'));
});
