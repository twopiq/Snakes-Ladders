/**
 * Admin sovg'asi: do'kondagi istalgan ko'rinishni yulduzsiz berish va qaytarib olish.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { Store } from '../server/store.js';
import { getItem, REFERRAL_TIERS } from '../public/shared/cosmetics.js';
import { makeInitData, TEST_BOT_TOKEN } from './helpers.mjs';

const tmpStore = () => new Store(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gift-')), 'store.json'));

// ---------------------------------------------------------------- store

test('sovg\'a berilgach o\'yinchida paydo bo\'ladi', () => {
  const s = tmpStore();
  const res = s.giftItem('500', 'token-crown');
  assert.equal(res.ok, true);
  assert.equal(res.added, 1);
  assert.ok(s.owns('500', 'token-crown'));
  assert.equal(s.user('500').starsSpent, 0, 'sovg\'a yulduz hisobiga tushmaydi');
  assert.equal(s.data.gifts.length, 1);
});

test('takroriy sovg\'a ikkinchi marta qo\'shilmaydi', () => {
  const s = tmpStore();
  s.giftItem('500', 'token-crown');
  const again = s.giftItem('500', 'token-crown');
  assert.equal(again.added, 0);
  assert.equal(again.alreadyOwned, true);
  assert.equal(s.user('500').owned.filter((id) => id === 'token-crown').length, 1);
});

test('to\'plam sovg\'a qilinsa ichidagi hammasi beriladi', () => {
  const s = tmpStore();
  s.giftItem('500', 'bundle-afsona');
  for (const id of getItem('bundle-afsona').grants) assert.ok(s.owns('500', id), `${id} berilishi kerak`);
});

test('mukofot ko\'rinishini ham sovg\'a qilsa bo\'ladi', () => {
  const s = tmpStore();
  const rewardId = REFERRAL_TIERS[0].itemId;
  assert.equal(s.giftItem('500', rewardId).ok, true);
  assert.ok(s.owns('500', rewardId), 'admin qaroriga cheklov yo\'q');
});

test('noma\'lum ko\'rinish berilmaydi', () => {
  const s = tmpStore();
  assert.equal(s.giftItem('500', 'yoq-bunday').ok, false);
});

test('qaytarib olinganda kiyimi bepul variantga tushadi', () => {
  const s = tmpStore();
  s.giftItem('500', 'token-crown');
  s.equip('500', 'token', 'token-crown');
  assert.equal(s.user('500').equipped.token, 'token-crown');

  const res = s.revokeItem('500', 'token-crown');
  assert.equal(res.ok, true);
  assert.equal(res.removed, 1);
  assert.equal(s.owns('500', 'token-crown'), false);
  assert.equal(s.user('500').equipped.token, 'token-classic', 'kiyim boshlang\'ichga qaytadi');
  assert.equal(s.data.gifts[0].revoked, true);
});

test('qaytarib olish bepul ko\'rinishlarga tegmaydi', () => {
  const s = tmpStore();
  s.revokeItem('500', 'token-classic');
  assert.ok(s.owns('500', 'token-classic'), 'boshlang\'ich variant har doim qoladi');
});

test('o\'yinchilar ro\'yxati ism va ID bo\'yicha qidiriladi', () => {
  const s = tmpStore();
  s.touch('111', 'Ali Valiyev');
  s.touch('222', 'Hasan');
  assert.equal(s.userList().total, 2);
  assert.equal(s.userList({ query: 'ali' }).shown.length, 1);
  assert.equal(s.userList({ query: '222' }).shown[0].tgId, '222');
  assert.equal(s.userList({ query: 'yoq' }).shown.length, 0);

  // Ro'yxat oxirgi kirgan bo'yicha saralanadi
  s.user('111').lastSeen = '2026-01-01T00:00:00.000Z';
  s.user('222').lastSeen = '2026-02-01T00:00:00.000Z';
  assert.deepEqual(s.userList().shown.map((u) => u.tgId), ['222', '111']);
});

// ---------------------------------------------------------------- API

const PORT = 5200 + Math.floor(Math.random() * 200);
const ADMIN_KEY = 'sovga-kaliti-999';
const base = `http://127.0.0.1:${PORT}`;
let server;
let dataDir;

async function startServer() {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-api-'));
  server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      BOT_TOKEN: TEST_BOT_TOKEN,
      BOT_USERNAME: 'ilonlar_bot',
      APP_SHORT_NAME: 'oyin',
      ADMIN_PASSWORD: ADMIN_KEY,
      DISABLE_BOT: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* kutamiz */ }
    await sleep(120);
  }
  throw new Error('Server ishga tushmadi');
}

const post = (p, body, headers = {}) => fetch(`${base}${p}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
const admin = (p, body) => post(p, body, { 'x-admin-key': ADMIN_KEY });

test('admin API: sovg\'a berish va qaytarib olish', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const initData = makeInitData({ user: { id: 909, first_name: 'Sardor' } });
  await post('/api/shop/profile', { initData }); // o'yinchi ro'yxatga tushsin

  // Kalitsiz ishlamaydi
  assert.equal((await post('/api/admin/grant', { tgId: '909', itemId: 'token-crown' })).status, 401);

  // Noto'g'ri ID va noma'lum ko'rinish rad etiladi
  assert.equal((await admin('/api/admin/grant', { tgId: 'abc', itemId: 'token-crown' })).status, 400);
  assert.equal((await admin('/api/admin/grant', { tgId: '909', itemId: 'yoq' })).status, 400);

  // Sovg'a
  const gift = await admin('/api/admin/grant', { tgId: '909', itemId: 'token-crown' });
  const giftData = await gift.json();
  assert.equal(gift.status, 200);
  assert.equal(giftData.added, 1);
  assert.equal(giftData.itemName, getItem('token-crown').name);

  // O'yinchi buni ko'radi va kiya oladi
  const profile = await (await post('/api/shop/profile', { initData })).json();
  assert.ok(profile.owned.includes('token-crown'));
  assert.equal(profile.starsSpent, 0, 'sovg\'a bepul');
  assert.equal((await post('/api/shop/equip', { initData, slot: 'token', itemId: 'token-crown' })).status, 200);

  // Mukofot ko'rinishini ham admin bera oladi (do'konda sotilmasa ham)
  const rewardId = REFERRAL_TIERS[1].itemId;
  assert.equal((await admin('/api/admin/grant', { tgId: '909', itemId: rewardId })).status, 200);
  assert.equal((await post('/api/shop/invoice', { initData, itemId: rewardId })).status, 400, 'sotib olish baribir yopiq');

  // Ro'yxatda ko'rinadi
  const users = await (await admin('/api/admin/users', { query: '909' })).json();
  assert.equal(users.shown.length, 1);
  assert.ok(users.shown[0].items.includes('token-crown'));
  assert.equal(users.shown[0].name, 'Sardor');

  // Qaytarib olish
  const back = await (await admin('/api/admin/revoke', { tgId: '909', itemId: 'token-crown' })).json();
  assert.equal(back.removed, 1);
  const after = await (await post('/api/shop/profile', { initData })).json();
  assert.ok(!after.owned.includes('token-crown'));
  assert.equal(after.equipped.token, 'token-classic');

  // Hisobotda sovg'alar va saqlash holati bor
  const overview = await (await fetch(`${base}/api/admin/overview`, { headers: { 'x-admin-key': ADMIN_KEY } })).json();
  assert.equal(overview.storage.persistent, true, 'DATA_DIR berilgan');
  assert.ok(overview.stats.gifts.length >= 2);
  assert.ok(overview.users.total >= 1);
  assert.equal(overview.telegram.inviteBase, 'https://t.me/ilonlar_bot/oyin?startapp=');

  // Diskda ham qoladi
  await sleep(600);
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'));
  assert.ok(saved.gifts.length >= 2);
});
