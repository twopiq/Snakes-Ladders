/**
 * Stars to'lovlarining to'liq yo'li: hisob-faktura → to'lov → narsa ochilishi → qaytarish.
 * Telegram API o'rniga soxta server ishlatiladi (tashqi tarmoqqa chiqmaymiz).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { makeInitData, TEST_BOT_TOKEN } from './helpers.mjs';

const ADMIN_KEY = 'admin-kalit';
const USER_ID = 909;

/** Soxta Telegram Bot API. */
function fakeTelegram() {
  const calls = [];
  let pending = []; // getUpdates orqali beriladigan yangilanishlar
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const method = req.url.split('/').pop().split('?')[0];
      const body = raw ? JSON.parse(raw) : {};
      calls.push({ method, body });
      const reply = (result) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result }));
      };
      switch (method) {
        case 'getMe': return reply({ id: 1, username: 'test_bot' });
        case 'createInvoiceLink': return reply(`https://t.me/invoice/${encodeURIComponent(body.payload)}`);
        case 'getUpdates': {
          const out = pending;
          pending = [];
          return reply(out);
        }
        default: return reply(true);
      }
    });
  });
  return {
    server,
    calls,
    push: (update) => pending.push(update),
    listen: () => new Promise((r) => server.listen(0, '127.0.0.1', r)),
    port: () => server.address().port,
    close: () => server.close(),
  };
}

test('Stars: hisob-faktura, to\'lov, narsa ochilishi va qaytarish', async (t) => {
  const tg = fakeTelegram();
  await tg.listen();
  t.after(() => tg.close());

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'il-pay-'));
  const PORT = 4800 + Math.floor(Math.random() * 200);
  const server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      BOT_TOKEN: TEST_BOT_TOKEN,
      ADMIN_PASSWORD: ADMIN_KEY,
      TELEGRAM_API_BASE: `http://127.0.0.1:${tg.port()}`,
      WEBAPP_URL: 'https://example.com',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());

  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* kutamiz */ }
    await sleep(120);
  }

  const post = (p, body, headers = {}) => fetch(`${base}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const initData = makeInitData({ user: { id: USER_ID, first_name: 'Doston' } });

  // Bot ulanganini tekshiramiz
  await sleep(400);
  assert.ok(tg.calls.some((c) => c.method === 'getMe'), 'bot Telegram API ga ulandi');

  // 1) Hisob-faktura so'raymiz
  const invRes = await post('/api/shop/invoice', { initData, itemId: 'token-crown' });
  const inv = await invRes.json();
  assert.equal(invRes.status, 200);
  assert.ok(inv.link.startsWith('https://t.me/invoice/'), 'to\'lov havolasi keldi');

  const invoiceCall = tg.calls.find((c) => c.method === 'createInvoiceLink');
  assert.equal(invoiceCall.body.currency, 'XTR', 'valyuta — Telegram Stars');
  assert.equal(invoiceCall.body.prices[0].amount, 150, 'katalogdagi narx');
  const payload = invoiceCall.body.payload;

  // 2) Telegram to'lovdan oldin tasdiq so'raydi
  tg.push({ update_id: 1, pre_checkout_query: { id: 'q1', invoice_payload: payload, from: { id: USER_ID } } });
  await sleep(700);
  const pre = tg.calls.find((c) => c.method === 'answerPreCheckoutQuery');
  assert.ok(pre, 'pre_checkout javobi yuborildi');
  assert.equal(pre.body.ok, true);

  // 3) To'lov muvaffaqiyatli
  tg.push({
    update_id: 2,
    message: {
      chat: { id: USER_ID },
      from: { id: USER_ID, first_name: 'Doston' },
      successful_payment: {
        currency: 'XTR',
        total_amount: 150,
        invoice_payload: payload,
        telegram_payment_charge_id: 'charge_abc',
      },
    },
  });
  await sleep(900);

  const profile = await (await post('/api/shop/profile', { initData })).json();
  assert.ok(profile.owned.includes('token-crown'), 'narsa ochildi');
  assert.equal(profile.starsSpent, 150);

  // Endi uni kiysa bo'ladi
  const equip = await post('/api/shop/equip', { initData, slot: 'token', itemId: 'token-crown' });
  assert.equal(equip.status, 200);
  assert.equal((await equip.json()).equipped.token, 'token-crown');

  // Ikki marta sotib olishga yo'l qo'yilmaydi
  const again = await post('/api/shop/invoice', { initData, itemId: 'token-crown' });
  assert.equal(again.status, 400);

  // 4) Admin hisobotida ko'rinadi
  const overview = await (await fetch(`${base}/api/admin/overview`, { headers: { 'x-admin-key': ADMIN_KEY } })).json();
  assert.equal(overview.stats.starsTotal, 150);
  assert.equal(overview.stats.recent[0].chargeId, 'charge_abc');

  // 5) Admin narxni o'zgartiradi — keyingi hisob-faktura yangi narxda
  await post('/api/admin/price', { itemId: 'ladder-gold', stars: 99 }, { 'x-admin-key': ADMIN_KEY });
  await post('/api/shop/invoice', { initData, itemId: 'ladder-gold' });
  const second = tg.calls.filter((c) => c.method === 'createInvoiceLink').pop();
  assert.equal(second.body.prices[0].amount, 99, 'admin o\'rnatgan narx ishlatiladi');

  // 6) Qaytarish
  const refund = await post('/api/admin/refund', { chargeId: 'charge_abc' }, { 'x-admin-key': ADMIN_KEY });
  assert.equal(refund.status, 200);
  assert.ok(tg.calls.some((c) => c.method === 'refundStarPayment'), 'Telegram ga qaytarish so\'rovi yuborildi');

  const after = await (await post('/api/shop/profile', { initData })).json();
  assert.ok(!after.owned.includes('token-crown'), 'qaytarilgach narsa olib qo\'yiladi');
  assert.equal(after.equipped.token, 'token-classic', 'kiyim bepulga qaytadi');
  assert.equal(after.starsSpent, 0);

  // 7) Sotuvdan olingan narsaga hisob-faktura yasalmaydi
  await post('/api/admin/disabled', { itemId: 'snake-dragon', disabled: true }, { 'x-admin-key': ADMIN_KEY });
  const blocked = await post('/api/shop/invoice', { initData, itemId: 'snake-dragon' });
  assert.equal(blocked.status, 400);
});
