/**
 * Onlayn rejimning uchdan-uchgacha tekshiruvi: server ishga tushadi,
 * ikkita mijoz xonaga kiradi, navbat qoidasi va zar sinxronligi tekshiriladi.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';

import { makeInitData, TEST_BOT_TOKEN } from './helpers.mjs';

const PORT = 3999 + Math.floor(Math.random() * 300);
let server;

async function startServer(env = {}) {
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      /* hali ko'tarilmagan */
    }
    await sleep(120);
  }
  throw new Error('Server ishga tushmadi');
}

/** Kutilayotgan turdagi xabar kelguncha kutadigan kichik mijoz. */
function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    const idx = waiters.findIndex((w) => w.type === msg.t);
    if (idx >= 0) waiters.splice(idx, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  return {
    ws,
    open: () => new Promise((r) => ws.once('open', r)),
    send: (obj) => ws.send(JSON.stringify(obj)),
    take(type, timeout = 4000) {
      const idx = inbox.findIndex((m) => m.t === type);
      if (idx >= 0) return Promise.resolve(inbox.splice(idx, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { type, resolve };
        waiters.push(w);
        setTimeout(() => {
          const i = waiters.indexOf(w);
          if (i >= 0) waiters.splice(i, 1);
          reject(new Error(`"${type}" xabari kelmadi`));
        }, timeout);
      });
    },
    close: () => ws.close(),
  };
}

test('onlayn rejim: xona, navbat, sinxron holat', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  a.send({ t: 'create', name: 'Ali', mapId: 'tezkor120', rules: { specialCells: true } });
  const joinedA = await a.take('joined');
  assert.equal(joinedA.code.length, 4);
  assert.equal(joinedA.seat, 0);
  assert.equal(joinedA.room.state, null, 'raqibsiz o\'yin boshlanmaydi');

  b.send({ t: 'join', code: joinedA.code, name: 'Vali' });
  const joinedB = await b.take('joined');
  assert.equal(joinedB.seat, 1);
  assert.ok(joinedB.room.state, 'ikkinchi o\'yinchi qo\'shilgach o\'yin boshlanadi');
  assert.equal(joinedB.room.state.players.length, 2);
  assert.equal(joinedB.room.state.mapId, 'tezkor120');

  // Maxfiylik: raqibning tokeni mijozga yuborilmaydi
  const raw = JSON.stringify(joinedB.room);
  assert.ok(!raw.includes(joinedA.token), 'boshqa o\'yinchi tokeni oshkor bo\'lmasligi kerak');
  assert.ok(joinedB.room.state.players.every((p) => p.owner === undefined));

  // Navbat 0-o'yinchida: b tashlay olmaydi
  b.send({ t: 'roll' });
  const err = await b.take('error');
  assert.match(err.msg, /navbat/i);

  // a tashlaydi — ikkala mijoz ham bir xil holatni oladi
  a.send({ t: 'roll' });
  const rollA = await a.take('roll');
  const rollB = await b.take('roll');
  assert.equal(rollA.dice, rollB.dice);
  assert.deepEqual(rollA.room.state.players.map((p) => p.pos), rollB.room.state.players.map((p) => p.pos));
  assert.ok(rollA.dice >= 1 && rollA.dice <= 6);
  assert.equal(rollA.seat, 0);
  assert.equal(rollB.seat, 1);
  assert.ok(rollA.events.some((e) => e.type === 'roll'));

  // Chat ikkala tomonga ham yetadi
  a.send({ t: 'chat', text: 'Salom!' });
  const chatB = await b.take('chat');
  assert.equal(chatB.text, 'Salom!');
  assert.equal(chatB.from, 'Ali');

  // Qayta ulanish: b uziladi va tokeni bilan qaytadi
  const posBefore = rollB.room.state.players.map((p) => p.pos);
  b.close();
  await sleep(150);
  const b2 = client();
  await b2.open();
  b2.send({ t: 'rejoin', code: joinedA.code, token: joinedB.token });
  const back = await b2.take('joined');
  assert.equal(back.seat, 1);
  assert.deepEqual(back.room.state.players.map((p) => p.pos), posBefore, 'holat saqlanadi');

  // Uchinchi o'yinchi kira olmaydi
  const c = client();
  await c.open();
  c.send({ t: 'join', code: joinedA.code, name: 'Uchinchi' });
  const full = await c.take('error');
  assert.match(full.msg, /to'lgan/);
  c.close();

  a.close();
  b2.close();
});

test('sinxronlash: mijoz holatni istalgan payt qayta so\'ray oladi', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  a.send({ t: 'create', name: 'Ali', mapId: 'klassik130' });
  const joinedA = await a.take('joined');
  b.send({ t: 'join', code: joinedA.code, name: 'Vali' });
  await b.take('joined');
  await a.take('room');

  // Bir necha yurish qilamiz
  a.send({ t: 'roll' });
  const roll = await a.take('roll');
  const positions = roll.room.state.players.map((p) => p.pos);

  // "sync" — joriy holat qaytadi (o'z o'rni bilan)
  a.send({ t: 'sync' });
  const synced = await a.take('room');
  assert.deepEqual(synced.room.state.players.map((p) => p.pos), positions);
  assert.equal(synced.seat, 0);

  // ping/pong — ulanish tirikligini tekshirish uchun
  b.send({ t: 'ping' });
  const pong = await b.take('pong');
  assert.equal(pong.t, 'pong');

  a.close();
  b.close();
});

test('navbat emasligi haqidagi xatoga holat ham qo\'shib yuboriladi', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  a.send({ t: 'create', name: 'Ali', mapId: 'klassik130' });
  const joinedA = await a.take('joined');
  b.send({ t: 'join', code: joinedA.code, name: 'Vali' });
  await b.take('joined');

  // Navbat A da — B tashlamoqchi bo'ladi
  b.send({ t: 'roll' });
  await b.take('error');
  // Mijoz eskirgan holat bilan qolib ketmasligi uchun server holatni ham yuboradi
  const fresh = await b.take('room');
  assert.ok(fresh.room.state, 'xatodan keyin joriy holat keladi');
  assert.equal(fresh.seat, 1);
  assert.equal(fresh.room.state.turn, 0);

  a.close();
  b.close();
});

test("qayta o'yin: ikkala tomon rozi bo'lgach o'rinlar almashadi", async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  a.send({ t: 'create', name: 'Ali', mapId: 'klassik130' });
  const joinedA = await a.take('joined');
  b.send({ t: 'join', code: joinedA.code, name: 'Vali' });
  await b.take('joined');
  await a.take('room');

  a.send({ t: 'rematch' });
  const pending = await a.take('room');
  assert.ok(pending.room.players.some((p) => p.rematch), 'ovoz belgilanadi');

  b.send({ t: 'rematch' });
  const restartA = await a.take('restart');
  const restartB = await b.take('restart');
  assert.equal(restartA.seat, 1, "birinchi o'yinchi endi ikkinchi o'rinda");
  assert.equal(restartB.seat, 0);
  assert.ok(restartA.room.state.players.every((p) => p.pos === 1), 'yangi o\'yin boshidan');

  a.close();
  b.close();
});

test('tezkor o\'yin: navbatdagi ikki o\'yinchi juftlanadi', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  a.send({ t: 'quick', name: 'Ali', mapId: 'olov180' });
  await a.take('queued');

  b.send({ t: 'quick', name: 'Vali', mapId: 'olov180' });
  const joinedA = await a.take('joined');
  const joinedB = await b.take('joined');
  assert.equal(joinedA.code, joinedB.code);
  assert.equal(joinedA.room.state.mapId, 'olov180');
  assert.notEqual(joinedA.seat, joinedB.seat);

  a.close();
  b.close();
});

test("noto'g'ri kod bilan qo'shilib bo'lmaydi", async (t) => {
  await startServer();
  t.after(() => server.kill());

  const a = client();
  await a.open();
  a.send({ t: 'join', code: 'ZZZZ', name: 'X' });
  const err = await a.take('error');
  assert.match(err.msg, /topilmadi/);
  a.close();
});

test('Telegram: imzolangan o\'yinchi ismi Telegram profilidan olinadi', async (t) => {
  await startServer({ BOT_TOKEN: TEST_BOT_TOKEN, BOT_USERNAME: 'ilonlar_bot', APP_SHORT_NAME: 'oyin' });
  t.after(() => server.kill());

  const cfg = await (await fetch(`http://127.0.0.1:${PORT}/api/config`)).json();
  assert.equal(cfg.telegram.enabled, true);
  assert.equal(cfg.telegram.inviteBase, 'https://t.me/ilonlar_bot/oyin?startapp=');

  const a = client();
  const b = client();
  await Promise.all([a.open(), b.open()]);

  // Ism "Yolg'onchi" deb yuborilsa ham, Telegram imzosidagi ism ustun turadi
  a.send({
    t: 'create',
    name: "Yolg'onchi",
    mapId: 'tezkor120',
    initData: makeInitData({ user: { id: 7, first_name: 'Ali', username: 'ali' } }),
  });
  const joinedA = await a.take('joined');
  assert.equal(joinedA.room.players[0].name, 'Ali');

  // Buzilgan imzo bilan kirish mumkin emas
  b.send({ t: 'join', code: joinedA.code, name: 'Vali', initData: makeInitData({ token: 'soxta:token' }) });
  const err = await b.take('error');
  assert.match(err.msg, /Telegram/);

  a.close();
  b.close();
});

test('statik sahifa va API javob beradi', async (t) => {
  await startServer();
  t.after(() => server.kill());

  const page = await fetch(`http://127.0.0.1:${PORT}/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Ilonlar va Narvonlar/);

  const maps = await (await fetch(`http://127.0.0.1:${PORT}/api/maps`)).json();
  assert.equal(maps.length, 5);
  assert.ok(maps.every((m) => m.size >= 120));

  // Katalogdan chiqishga urinish bloklanadi
  const hack = await fetch(`http://127.0.0.1:${PORT}/../package.json`);
  assert.notEqual(hack.status, 200);
});
