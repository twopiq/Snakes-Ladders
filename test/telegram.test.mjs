/** Telegram initData tekshiruvi — imzoni buzib bo'lmasligiga ishonch hosil qilamiz. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyInitData, resolveIdentity } from '../server/telegram.js';
import { makeInitData, TEST_BOT_TOKEN as BOT_TOKEN } from './helpers.mjs';

test("to'g'ri imzolangan initData qabul qilinadi", () => {
  const res = verifyInitData(makeInitData(), { botToken: BOT_TOKEN });
  assert.equal(res.ok, true);
  assert.equal(res.user.id, '42');
  assert.equal(res.user.name, 'Ali Valiyev');
  assert.equal(res.user.username, 'ali');
});

test("boshqa bot tokeni bilan imzolangan ma'lumot rad etiladi", () => {
  const res = verifyInitData(makeInitData({ token: 'boshqa:token' }), { botToken: BOT_TOKEN });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'hash-mos-emas');
});

test("ma'lumot o'zgartirilsa imzo mos kelmaydi", () => {
  const raw = makeInitData({ user: { id: 42, first_name: 'Ali' } });
  const tampered = raw.replace('Ali', 'Bek');
  const res = verifyInitData(tampered, { botToken: BOT_TOKEN });
  assert.equal(res.ok, false);
});

test('eski initData (muddati o\'tgan) rad etiladi', () => {
  const old = makeInitData({ authDate: Math.floor(Date.now() / 1000) - 48 * 3600 });
  const res = verifyInitData(old, { botToken: BOT_TOKEN });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'muddati-otgan');
});

test('bo\'sh yoki buzuq qiymatlar xavfsiz rad etiladi', () => {
  for (const bad of ['', null, undefined, 'hash=xxx', 'auth_date=1&hash=' + 'a'.repeat(64)]) {
    const res = verifyInitData(bad, { botToken: BOT_TOKEN });
    assert.equal(res.ok, false, `qabul qilinmasligi kerak: ${bad}`);
  }
});

test('bot token sozlanmagan bo\'lsa tekshiruv o\'tmaydi', () => {
  const res = verifyInitData(makeInitData(), { botToken: '' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'bot-token-yoq');
});

test('oddiy brauzerdan kelgan o\'yinchi o\'z ismi bilan qoladi', () => {
  const ident = resolveIdentity({ name: 'Mehmon' });
  assert.equal(ident.name, 'Mehmon');
  assert.equal(ident.verified, false);
  assert.equal(ident.tgId, null);
});
