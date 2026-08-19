/** Do'kon: katalog, narx boshqaruvi, egalik va admin API tekshiruvlari. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { Store } from '../server/store.js';
import { COSMETICS, validateCatalog, getItem, resolveStyles, grantsOf, defaultEquipped } from '../public/shared/cosmetics.js';
import { makeInitData, TEST_BOT_TOKEN } from './helpers.mjs';

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'il-store-'));
  return new Store(path.join(dir, 'store.json'));
}

// ---------------------------------------------------------------- katalog

test('katalog to\'g\'ri tuzilgan', () => {
  assert.deepEqual(validateCatalog(), []);
  assert.ok(COSMETICS.length >= 15);
});

test('har bir bo\'limda bepul boshlang\'ich ko\'rinish bor', () => {
  const def = defaultEquipped();
  for (const [slot, id] of Object.entries(def)) {
    const item = getItem(id);
    assert.equal(item.slot, slot);
    assert.equal(item.price, 0);
  }
});

test('resolveStyles noma\'lum ko\'rinishda bepulga qaytadi', () => {
  const styles = resolveStyles({ token: 'yoq-bunday', ladder: 'ladder-gold' });
  assert.equal(styles.token.id, 'token-classic');
  assert.equal(styles.ladder.id, 'ladder-gold');
  assert.equal(styles.board.id, 'board-default');
});

test('to\'plam ichidagi hamma narsa beriladi', () => {
  const list = grantsOf('bundle-afsona');
  assert.ok(list.includes('token-crown'));
  assert.ok(list.includes('board-oltin'));
  assert.ok(list.includes('bundle-afsona'));
  assert.deepEqual(grantsOf('token-crown'), ['token-crown']);
});

// ---------------------------------------------------------------- narxlar

test('narxni o\'zgartirish va katalogga qaytarish', () => {
  const s = tmpStore();
  const base = getItem('token-crown').price;
  assert.equal(s.price('token-crown'), base);

  assert.equal(s.setPrice('token-crown', 250).ok, true);
  assert.equal(s.price('token-crown'), 250);

  assert.equal(s.setPrice('token-crown', null).ok, true);
  assert.equal(s.price('token-crown'), base, 'null berilsa katalog narxiga qaytadi');
});

test('noto\'g\'ri narx rad etiladi', () => {
  const s = tmpStore();
  for (const bad of [0, -5, 1.5, 'ko\'p', 200000]) {
    assert.equal(s.setPrice('token-gem', bad).ok, false, `qabul qilinmasligi kerak: ${bad}`);
  }
  assert.equal(s.setPrice('yoq-bunday', 10).ok, false);
  assert.equal(s.setPrice('token-classic', 10).ok, false, 'bepul narsa narxlanmaydi');
});

test('narx diskka saqlanadi va qayta o\'qiladi', () => {
  const s = tmpStore();
  s.setPrice('ladder-gold', 333);
  s.saveNow();
  const again = new Store(s.file);
  assert.equal(again.price('ladder-gold'), 333);
});

// ---------------------------------------------------------------- egalik

test('yangi o\'yinchida faqat bepul ko\'rinishlar bor', () => {
  const s = tmpStore();
  const u = s.user('101');
  assert.ok(u.owned.includes('token-classic'));
  assert.ok(!u.owned.includes('token-crown'));
  assert.deepEqual(u.equipped, defaultEquipped());
});

test('sotib olinmagan narsani kiyib bo\'lmaydi', () => {
  const s = tmpStore();
  assert.equal(s.equip('101', 'token', 'token-crown').ok, false);
  s.grant('101', 'token-crown');
  assert.equal(s.equip('101', 'token', 'token-crown').ok, true);
  assert.equal(s.user('101').equipped.token, 'token-crown');
});

test('ko\'rinishni noto\'g\'ri bo\'limga kiyib bo\'lmaydi', () => {
  const s = tmpStore();
  s.grant('101', 'ladder-gold');
  assert.equal(s.equip('101', 'token', 'ladder-gold').ok, false);
});

test('xarid yozib olinadi, qaytarilganda narsa olib qo\'yiladi', () => {
  const s = tmpStore();
  s.recordPurchase({ tgId: '55', itemId: 'bundle-afsona', stars: 420, chargeId: 'ch_1', name: 'Ali' });

  const u = s.user('55');
  assert.equal(u.starsSpent, 420);
  assert.ok(u.owned.includes('token-crown'), 'to\'plamdagi narsalar ochiladi');
  s.equip('55', 'token', 'token-crown');

  const stats = s.stats();
  assert.equal(stats.purchases, 1);
  assert.equal(stats.starsTotal, 420);

  const refund = s.markRefunded('ch_1');
  assert.equal(refund.ok, true);
  const after = s.user('55');
  assert.ok(!after.owned.includes('token-crown'), 'narsa olib qo\'yiladi');
  assert.equal(after.equipped.token, 'token-classic', 'kiyim bepulga qaytadi');
  assert.equal(after.starsSpent, 0);
  assert.equal(s.markRefunded('ch_1').ok, false, 'ikki marta qaytarib bo\'lmaydi');
});

// ---------------------------------------------------------------- API

const PORT = 4500 + Math.floor(Math.random() * 300);
const ADMIN_KEY = 'maxfiy-kalit-123';
let server;
let dataDir;

async function startServer() {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'il-data-'));
  server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      BOT_TOKEN: TEST_BOT_TOKEN,
      ADMIN_PASSWORD: ADMIN_KEY,
      DISABLE_BOT: '1', // testda Telegram'ga chiqmaymiz
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return;
    } catch { /* kutamiz */ }
    await sleep(120);
  }
  throw new Error('Server ishga tushmadi');
}

const post = (path, body, headers = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

test('do\'kon API: katalog, profil, kiyish va himoya', async (t) => {
  await startServer();
  t.after(() => server.kill());

  // Katalog hamma uchun ochiq
  const catalog = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
  assert.equal(catalog.items.length, COSMETICS.length);
  assert.ok(catalog.items.every((i) => Number.isInteger(i.price)));

  // Imzosiz profil olinmaydi
  const noAuth = await post('/api/shop/profile', {});
  assert.equal(noAuth.status, 401);

  // Imzo bilan — profil ochiladi
  const initData = makeInitData({ user: { id: 777, first_name: 'Doston' } });
  const profile = await (await post('/api/shop/profile', { initData })).json();
  assert.equal(profile.tgId, '777');
  assert.ok(profile.owned.includes('token-classic'));
  assert.equal(profile.equipped.token, 'token-classic');

  // Sotib olinmagan narsani kiyib bo'lmaydi
  const bad = await post('/api/shop/equip', { initData, slot: 'token', itemId: 'token-crown' });
  assert.equal(bad.status, 400);

  // Admin narxni o'zgartiradi
  const noKey = await post('/api/admin/price', { itemId: 'token-crown', stars: 199 });
  assert.equal(noKey.status, 401);

  const ok = await post('/api/admin/price', { itemId: 'token-crown', stars: 199 }, { 'x-admin-key': ADMIN_KEY });
  assert.equal(ok.status, 200);

  const updated = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
  assert.equal(updated.items.find((i) => i.id === 'token-crown').price, 199);

  // Sotuvdan olish
  await post('/api/admin/disabled', { itemId: 'token-gem', disabled: true }, { 'x-admin-key': ADMIN_KEY });
  const withDisabled = await (await fetch(`http://127.0.0.1:${PORT}/api/catalog`)).json();
  assert.equal(withDisabled.items.find((i) => i.id === 'token-gem').disabled, true);

  // Admin hisoboti
  const overview = await (await fetch(`http://127.0.0.1:${PORT}/api/admin/overview`, {
    headers: { 'x-admin-key': ADMIN_KEY },
  })).json();
  assert.ok(overview.stats.users >= 1);
  assert.equal(overview.starsEnabled, false, 'testda bot o\'chirilgan');

  // Narx diskda saqlanadi (yozish biroz kechiktiriladi)
  await sleep(600);
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'));
  assert.equal(saved.prices['token-crown'], 199);
});

test('admin sahifasi /admin manzilida ochiladi', async (t) => {
  await startServer();
  t.after(() => server.kill());
  const res = await fetch(`http://127.0.0.1:${PORT}/admin`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Do'kon boshqaruvi/);
});

// ---------------------------------------------------------------- to'plamlar

test('to\'plam bitta amalda butunlay kiyiladi', () => {
  const s = tmpStore();
  s.grant('u1', 'bundle-afsona');
  const res = s.equipSet('u1', 'bundle-afsona');
  assert.equal(res.ok, true);
  for (const id of getItem('bundle-afsona').grants) {
    const part = getItem(id);
    assert.equal(res.equipped[part.slot], id, `${id} kiyilishi kerak`);
  }
  // To'plamning o'zi hech qaysi bo'limga kiyilmaydi
  assert.ok(!Object.values(res.equipped).includes('bundle-afsona'));
});

test('to\'plamning faqat egalik qilingan qismlari kiyiladi', () => {
  const s = tmpStore();
  const u = s.user('u2');
  u.owned.push('token-crown'); // to'plamdan faqat bittasi bor
  const res = s.equipSet('u2', 'bundle-afsona');
  assert.equal(res.ok, true);
  assert.deepEqual(res.worn, ['token-crown']);
  assert.equal(res.equipped.ladder, 'ladder-wood', 'olinmagani boshlang\'ichcha qoladi');
});

test('hech narsasi yo\'q to\'plam kiyilmaydi', () => {
  const s = tmpStore();
  assert.equal(s.equipSet('u3', 'bundle-afsona').ok, false);
  assert.equal(s.equipSet('u3', 'yoq-bunday').ok, false);
});

test('API: to\'plam bitta so\'rov bilan kiyiladi', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const initData = makeInitData({ user: { id: 8080, first_name: 'Bek' } });
  await post('/api/shop/profile', { initData });
  await post('/api/admin/grant', { tgId: '8080', itemId: 'bundle-boshlash' }, { 'x-admin-key': ADMIN_KEY });

  // slot berilmasa — to'plam sifatida qabul qilinadi
  const res = await post('/api/shop/equip', { initData, itemId: 'bundle-boshlash' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.equipped.token, 'token-ring');
  assert.equal(data.equipped.board, 'board-papirus');

  // Qayta kirganda ham saqlanib qoladi
  const profile = await (await post('/api/shop/profile', { initData })).json();
  assert.equal(profile.equipped.snake, 'snake-candy');
});
