/** Statik fayllar: kesh sarlavhalari va versiya belgisi. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4700 + Math.floor(Math.random() * 200);
let server;

test.before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return; } catch { /* kutamiz */ }
    await sleep(120);
  }
  throw new Error('Server ishga tushmadi');
});

test.after(() => server?.kill());

test('kod fayllari keshlanmaydi, lekin ETag bilan 304 qaytadi', async () => {
  const base = `http://127.0.0.1:${PORT}`;
  const res = await fetch(`${base}/js/app.js`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-cache', 'deploydan keyin eski JS qolmasligi uchun');

  const etag = res.headers.get('etag');
  assert.ok(etag, 'ETag bo\'lishi kerak');

  const again = await fetch(`${base}/js/app.js`, { headers: { 'If-None-Match': etag } });
  assert.equal(again.status, 304, 'o\'zgarmagan fayl uchun 304 — trafik tejaladi');
});

test('rasmlar uzoq keshlanadi', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/brand/og.png`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /max-age=\d{4,}/);
});

test('HTML ichiga versiya belgisi qo\'yiladi', async () => {
  const base = `http://127.0.0.1:${PORT}`;
  const html = await (await fetch(`${base}/`)).text();
  assert.ok(!html.includes('__V__'), 'belgi almashtirilishi kerak');

  const { version } = await (await fetch(`${base}/api/health`)).json();
  assert.ok(version, 'versiya qaytishi kerak');
  assert.ok(html.includes(`/js/app.js?v=${version}`), 'skript manzilida versiya bo\'ladi');
  assert.ok(html.includes(`/css/style.css?v=${version}`));
});
