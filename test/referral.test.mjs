/**
 * Do'st chaqirish tizimi: hisob yuritish, mukofotlar va soxta hisoblarga qarshi qoidalar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { Store } from '../server/store.js';
import { REFERRAL_TIERS, getItem, freeItems, validateCatalog } from '../public/shared/cosmetics.js';
import { makeInitData, TEST_BOT_TOKEN } from './helpers.mjs';

const tmpStore = () => new Store(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ref-')), 'store.json'));

// ---------------------------------------------------------------- katalog

test("mukofot ko'rinishlari sotilmaydi va boshidan ochiq emas", () => {
  assert.deepEqual(validateCatalog(), []);
  const free = new Set(freeItems());
  for (const tier of REFERRAL_TIERS) {
    const item = getItem(tier.itemId);
    assert.ok(item, `${tier.itemId} topilmadi`);
    assert.equal(item.price, 0, 'mukofot narxlanmaydi');
    assert.equal(item.unlock.type, 'referral');
    assert.equal(item.unlock.count, tier.count);
    assert.ok(!free.has(item.id), 'mukofot boshidan ochiq bo\'lmasligi kerak');
  }
});

test('mukofot darajalari 3, 5, 7, 10', () => {
  assert.deepEqual(REFERRAL_TIERS.map((t) => t.count), [3, 5, 7, 10]);
  // Har bir daraja boshqa bo'limdan — hammasi bir joyda to'planib qolmasin
  const slots = REFERRAL_TIERS.map((t) => getItem(t.itemId).slot);
  assert.equal(new Set(slots).size, slots.length, 'har bir mukofot alohida bo\'limda');
});

// ---------------------------------------------------------------- hisob

test('do\'st faqat o\'ynay boshlagach hisobga qo\'shiladi', () => {
  const s = tmpStore();
  s.attachReferral('friend1', 'host');
  assert.equal(s.referralInfo('host').confirmed, 0, 'havolani ochish yetarli emas');
  assert.equal(s.referralInfo('host').pending, 1);

  s.markPlayed('friend1');
  assert.equal(s.referralInfo('host').confirmed, 1);
  assert.equal(s.referralInfo('host').pending, 0);
});

test('mukofotlar 3, 5, 7, 10 da ochiladi', () => {
  const s = tmpStore();
  const owned = () => s.user('host').owned;

  for (let i = 1; i <= 10; i++) {
    s.attachReferral(`f${i}`, 'host');
    s.markPlayed(`f${i}`);

    const expected = REFERRAL_TIERS.filter((t) => t.count <= i).map((t) => t.itemId);
    for (const id of expected) assert.ok(owned().includes(id), `${i} ta do'stda ${id} ochilishi kerak`);
    const notYet = REFERRAL_TIERS.filter((t) => t.count > i).map((t) => t.itemId);
    for (const id of notYet) assert.ok(!owned().includes(id), `${i} ta do'stda ${id} hali ochilmasligi kerak`);
  }
});

test('mukofot ikki marta berilmaydi', () => {
  const s = tmpStore();
  for (let i = 1; i <= 4; i++) {
    s.attachReferral(`f${i}`, 'host');
    s.markPlayed(`f${i}`);
  }
  const first = s.user('host').owned.filter((id) => id === 'token-dostlik').length;
  s.checkRewards('host');
  s.checkRewards('host');
  const after = s.user('host').owned.filter((id) => id === 'token-dostlik').length;
  assert.equal(first, 1);
  assert.equal(after, 1);
});

test('o\'zini o\'zi chaqira olmaydi', () => {
  const s = tmpStore();
  assert.equal(s.attachReferral('host', 'host').ok, false);
  assert.equal(s.referralInfo('host').confirmed, 0);
});

test('bir o\'yinchi faqat bir marta hisobga olinadi', () => {
  const s = tmpStore();
  s.attachReferral('friend', 'host1');
  assert.equal(s.attachReferral('friend', 'host2').ok, false, 'ikkinchi chaqiruvchiga o\'tmaydi');
  s.markPlayed('friend');
  s.markPlayed('friend'); // takroriy xabar
  assert.equal(s.referralInfo('host1').confirmed, 1);
  assert.equal(s.referralInfo('host2').confirmed, 0);
});

test('allaqachon o\'ynagan odamni keyin "chaqirdim" deb yozib bo\'lmaydi', () => {
  const s = tmpStore();
  s.markPlayed('eskiUser');
  assert.equal(s.attachReferral('eskiUser', 'host').ok, false);
  assert.equal(s.referralInfo('host').confirmed, 0);
});

test("mukofot ma'lumoti keyingi darajani ko'rsatadi", () => {
  const s = tmpStore();
  s.attachReferral('a', 'host');
  s.markPlayed('a');
  const info = s.referralInfo('host');
  assert.equal(info.next.count, 3);
  assert.equal(info.next.left, 2);
  assert.equal(info.rewards.length, 4);
  assert.ok(info.rewards.every((r) => r.unlocked === false));
});

test('holat diskka saqlanadi', () => {
  const s = tmpStore();
  for (let i = 1; i <= 3; i++) {
    s.attachReferral(`f${i}`, 'host');
    s.markPlayed(`f${i}`);
  }
  s.saveNow();
  const again = new Store(s.file);
  assert.equal(again.referralInfo('host').confirmed, 3);
  assert.ok(again.user('host').owned.includes('token-dostlik'));
});

// ---------------------------------------------------------------- API

test('API: taklif havolasi, biriktirish va mukofot', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-api-'));
  const PORT = 4200 + Math.floor(Math.random() * 200);
  const server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      BOT_TOKEN: TEST_BOT_TOKEN,
      BOT_USERNAME: 'ilonlar_bot',
      APP_SHORT_NAME: 'oyin',
      DISABLE_BOT: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());

  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* kutamiz */ }
    await sleep(120);
  }
  const post = (p, body) => fetch(`${base}${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  const host = makeInitData({ user: { id: 100, first_name: 'Host' } });

  // Taklif havolasi
  const ref = await (await post('/api/shop/referral', { initData: host })).json();
  assert.equal(ref.link, 'https://t.me/ilonlar_bot/oyin?startapp=r100');
  assert.equal(ref.referral.confirmed, 0);

  // Uchta do'st havola orqali kiradi va o'ynay boshlaydi
  for (const id of [201, 202, 203]) {
    const friend = makeInitData({ user: { id, first_name: `F${id}` } });
    const profile = await (await post('/api/shop/profile', { initData: friend, ref: 'r100' })).json();
    assert.equal(profile.tgId, String(id));
    await post('/api/shop/played', { initData: friend });
  }

  const after = await (await post('/api/shop/referral', { initData: host })).json();
  assert.equal(after.referral.confirmed, 3);
  assert.ok(after.referral.rewards.find((r) => r.count === 3).unlocked, 'birinchi mukofot ochildi');

  // Mukofot profilda ham ko'rinadi va uni kiyish mumkin
  const hostProfile = await (await post('/api/shop/profile', { initData: host })).json();
  assert.ok(hostProfile.owned.includes('token-dostlik'));
  const equip = await post('/api/shop/equip', { initData: host, slot: 'token', itemId: 'token-dostlik' });
  assert.equal(equip.status, 200);

  // Mukofotni yulduz bilan sotib bo'lmaydi
  const invoice = await post('/api/shop/invoice', { initData: host, itemId: 'ladder-yulduz' });
  assert.equal(invoice.status, 400, 'mukofot sotilmaydi');

  // O'zini o'zi chaqirish hisobga olinmaydi
  const self = await (await post('/api/shop/profile', { initData: host, ref: 'r100' })).json();
  assert.equal(self.referral.confirmed, 3, 'o\'zgarmadi');
});
