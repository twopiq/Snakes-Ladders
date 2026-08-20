/**
 * Telegram zaxirasi: bazani hujjat qilib yuborish va qayta ishga tushgach tiklash.
 *
 * Render bepul tarifida disk vaqtinchalik — server har qayta ishga tushganda
 * fayllar yo'qoladi. Shu test aynan o'sha holatni takrorlaydi.
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

const ADMIN_KEY = 'zaxira-kaliti';

/** Soxta Telegram: hujjat qabul qiladi, pin qiladi va qaytarib beradi. */
function fakeTelegram() {
  const files = new Map(); // file_id -> matn
  let pinned = null;
  const calls = [];

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const raw = Buffer.concat(chunks);
      const reply = (result) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result }));
      };

      // Fayl yuklab olish: /file/bot<token>/<path>
      if (req.url.startsWith('/file/')) {
        const id = req.url.split('/').pop();
        const body = files.get(id);
        if (!body) {
          res.writeHead(404);
          return res.end('yoq');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(body);
      }

      const method = req.url.split('/').pop().split('?')[0];
      calls.push(method);

      if (method === 'sendDocument') {
        // multipart ichidan JSON tanasini ajratib olamiz
        const text = raw.toString('utf8');
        const start = text.indexOf('{"');
        const end = text.lastIndexOf('}');
        const json = text.slice(start, end + 1);
        const id = `file${files.size + 1}`;
        files.set(id, json);
        const message = {
          message_id: files.size,
          document: { file_id: id, file_unique_id: id, file_name: 'store.json' },
        };
        return reply(message);
      }
      if (method === 'pinChatMessage') {
        const body = JSON.parse(raw.toString() || '{}');
        const id = `file${body.message_id}`;
        pinned = { message_id: body.message_id, document: { file_id: id, file_unique_id: id } };
        return reply(true);
      }
      if (method === 'unpinAllChatMessages') {
        pinned = null;
        return reply(true);
      }
      if (method === 'getChat') return reply({ id: 111, pinned_message: pinned });
      if (method === 'getFile') {
        const body = JSON.parse(raw.toString() || '{}');
        return reply({ file_id: body.file_id, file_path: body.file_id });
      }
      if (method === 'getMe') return reply({ id: 1, username: 'test_bot' });
      if (method === 'getUpdates') return reply([]);
      return reply(true);
    });
  });

  return {
    listen: () => new Promise((r) => server.listen(0, '127.0.0.1', r)),
    port: () => server.address().port,
    close: () => server.close(),
    calls,
    fileCount: () => files.size,
    hasPinned: () => Boolean(pinned),
  };
}

async function startServer({ port, dataDir, tgPort, chatId = '111' }) {
  const server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      BOT_TOKEN: TEST_BOT_TOKEN,
      ADMIN_PASSWORD: ADMIN_KEY,
      TELEGRAM_API_BASE: `http://127.0.0.1:${tgPort}`,
      BACKUP_CHAT_ID: chatId,
      DISABLE_BOT: '1', // getUpdates aylanmasin, zaxira baribir ishlaydi
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return server; } catch { /* kutamiz */ }
    await sleep(120);
  }
  server.kill();
  throw new Error('Server ishga tushmadi');
}

test('server qayta ishga tushganda ma\'lumot Telegram zaxirasidan tiklanadi', async (t) => {
  const tg = fakeTelegram();
  await tg.listen();
  t.after(() => tg.close());

  const PORT = 5400 + Math.floor(Math.random() * 200);
  const dirOne = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-1-'));
  const dirTwo = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-2-'));
  const base = `http://127.0.0.1:${PORT}`;
  const initData = makeInitData({ user: { id: 4242, first_name: 'Temur' } });

  const post = (p, body, headers = {}) => fetch(`${base}${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  const admin = (p, body) => post(p, body, { 'x-admin-key': ADMIN_KEY });

  // --- Birinchi ishga tushish: o'yinchi, sovg'a va narx o'zgarishi
  let server = await startServer({ port: PORT, dataDir: dirOne, tgPort: tg.port() });
  try {
    await post('/api/shop/profile', { initData });
    await admin('/api/admin/grant', { tgId: '4242', itemId: 'bundle-afsona' });
    await admin('/api/admin/price', { itemId: 'token-crown', stars: 333 });

    const before = await (await post('/api/shop/profile', { initData })).json();
    assert.ok(before.owned.includes('token-crown'));
    assert.equal(before.equipped.board, 'board-oltin');

    // Qo'lda zaxiralaymiz (avtomatik yuborish kechiktiriladi)
    const saved = await (await admin('/api/admin/backup', {})).json();
    assert.equal(saved.ok, true);
    assert.ok(tg.hasPinned(), 'zaxira xabari pin qilinadi');
  } finally {
    server.kill();
    await sleep(300);
  }

  // --- Ikkinchi ishga tushish: BOSHQA (bo'sh) katalog — disk tozalangandek
  server = await startServer({ port: PORT, dataDir: dirTwo, tgPort: tg.port() });
  try {
    const after = await (await post('/api/shop/profile', { initData })).json();
    assert.ok(after.owned.includes('token-crown'), 'sovg\'a qaytib keldi');
    assert.equal(after.equipped.board, 'board-oltin', 'kiyimi ham saqlanib qoldi');

    const catalog = await (await fetch(`${base}/api/catalog`)).json();
    assert.equal(catalog.items.find((i) => i.id === 'token-crown').price, 333, 'narxlar ham tiklandi');

    const overview = await (await fetch(`${base}/api/admin/overview`, { headers: { 'x-admin-key': ADMIN_KEY } })).json();
    assert.equal(overview.storage.backup.enabled, true);

    // Yangi katalogda fayl ham paydo bo'ldi
    await sleep(400);
    const onDisk = JSON.parse(fs.readFileSync(path.join(dirTwo, 'store.json'), 'utf8'));
    assert.ok(onDisk.users['4242'], 'tiklangan nusxa diskka ham yozildi');
  } finally {
    server.kill();
  }
});

test('zaxira sozlanmagan bo\'lsa server baribir ishlaydi', async (t) => {
  const tg = fakeTelegram();
  await tg.listen();
  t.after(() => tg.close());

  const PORT = 5700 + Math.floor(Math.random() * 200);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-3-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT), DATA_DIR: dir, BOT_TOKEN: TEST_BOT_TOKEN,
      ADMIN_PASSWORD: ADMIN_KEY, TELEGRAM_API_BASE: `http://127.0.0.1:${tg.port()}`,
      DISABLE_BOT: '1', BACKUP_CHAT_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());

  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* kutamiz */ }
    await sleep(120);
  }

  const overview = await (await fetch(`${base}/api/admin/overview`, { headers: { 'x-admin-key': ADMIN_KEY } })).json();
  assert.equal(overview.storage.backup.enabled, false);

  const res = await fetch(`${base}/api/admin/backup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }, body: '{}',
  });
  assert.equal(res.status, 503, 'sozlanmagan bo\'lsa aniq xato qaytadi');
});
