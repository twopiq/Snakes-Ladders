import http from 'node:http';
import { WebSocketServer } from 'ws';

import { serveStatic } from './static.js';
import { RoomStore } from './rooms.js';
import { telegramConfig, telegramEnabled, resolveIdentity } from './telegram.js';
import { MAPS } from '../public/shared/maps.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const store = new RoomStore();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, rooms: store.rooms.size, queue: store.queue.length, uptime: process.uptime() });
  }
  if (url.pathname === '/api/config') {
    return json(res, 200, { telegram: telegramConfig() });
  }
  if (url.pathname === '/api/maps') {
    return json(res, 200, MAPS.map((m) => ({
      id: m.id, name: m.name, about: m.about, cols: m.cols, rows: m.rows, size: m.cols * m.rows,
      ladders: Object.keys(m.ladders).length, snakes: Object.keys(m.snakes).length,
    })));
  }
  if (url.pathname === '/api/room' && url.searchParams.has('code')) {
    const room = store.get(url.searchParams.get('code'));
    if (!room) return json(res, 404, { error: 'Xona topilmadi' });
    return json(res, 200, { code: room.code, players: room.players.length, mapId: room.mapId, started: !!room.state });
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.ctx = { code: null, token: null };
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw).slice(0, 4000));
    } catch {
      return send(ws, { t: 'error', msg: "Xabar formati noto'g'ri" });
    }
    try {
      handle(ws, msg);
    } catch (err) {
      console.error('handle error:', err);
      send(ws, { t: 'error', msg: 'Serverda xatolik yuz berdi' });
    }
  });

  ws.on('close', () => {
    store.queue = store.queue.filter((q) => q.ws !== ws);
    const { code, token } = ws.ctx;
    if (!code || !token) return;
    const room = store.get(code);
    if (!room) return;
    room.markOffline(token);
    broadcastRoom(room);
    notify(room, `Raqib aloqani uzdi — 60 soniya kutilmoqda...`);
  });
});

/**
 * O'yinchi kimligini aniqlaydi. Telegram ichidan kelgan bo'lsa, ism imzolangan
 * ma'lumotdan olinadi — ya'ni boshqaning ismi bilan kirib bo'lmaydi.
 * Xato bo'lsa mijozga xabar yuboriladi va null qaytadi.
 */
function identify(ws, msg) {
  const ident = resolveIdentity({ initData: msg.initData, name: msg.name });
  if (msg.initData && telegramEnabled && !ident.verified) {
    send(ws, { t: 'error', msg: 'Telegram tekshiruvidan o\'tmadi — ilovani qayta oching' });
    return null;
  }
  return ident;
}

function handle(ws, msg) {
  switch (msg.t) {
    case 'create': {
      const ident = identify(ws, msg);
      if (!ident) return;
      const room = store.create({ name: ident.name, mapId: msg.mapId, rules: msg.rules });
      const player = room.addPlayer(ident.name, ws, ident.tgId);
      bind(ws, room, player);
      send(ws, { t: 'joined', code: room.code, seat: player.seat, token: player.token, room: room.snapshot() });
      break;
    }

    case 'join': {
      const ident = identify(ws, msg);
      if (!ident) return;
      const room = store.get(msg.code);
      if (!room) return send(ws, { t: 'error', msg: 'Bunday kodli xona topilmadi' });
      if (room.full) return send(ws, { t: 'error', msg: "Xona to'lgan (2/2)" });
      const player = room.addPlayer(ident.name, ws, ident.tgId);
      bind(ws, room, player);
      send(ws, { t: 'joined', code: room.code, seat: player.seat, token: player.token, room: room.snapshot() });
      broadcastRoom(room);
      notify(room, `${player.name} xonaga qo'shildi`);
      break;
    }

    case 'rejoin': {
      const room = store.get(msg.code);
      if (!room) return send(ws, { t: 'error', msg: 'Xona endi mavjud emas' });
      const player = room.byToken(msg.token);
      if (!player) return send(ws, { t: 'error', msg: "Bu xonada o'rningiz qolmagan" });
      player.ws = ws;
      player.online = true;
      player.lastSeen = Date.now();
      bind(ws, room, player);
      send(ws, { t: 'joined', code: room.code, seat: player.seat, token: player.token, room: room.snapshot() });
      broadcastRoom(room);
      notify(room, `${player.name} qaytib ulandi`);
      break;
    }

    case 'quick': {
      // Tezkor o'yin: navbatdagi raqib bilan avtomatik juftlash
      const ident = identify(ws, msg);
      if (!ident) return;
      store.queue = store.queue.filter((q) => q.ws.readyState === 1 && q.ws !== ws);
      const mate = store.queue.shift();
      if (!mate) {
        store.queue.push({ ws, name: ident.name, mapId: msg.mapId, tgId: ident.tgId });
        return send(ws, { t: 'queued' });
      }
      const room = store.create({ mapId: mate.mapId || msg.mapId, rules: msg.rules });
      const p1 = room.addPlayer(mate.name, mate.ws, mate.tgId);
      const p2 = room.addPlayer(ident.name, ws, ident.tgId);
      bind(mate.ws, room, p1);
      bind(ws, room, p2);
      // Ikkalasi ham to'liq holatni oladi — o'yin shu zahoti boshlanadi
      const snap = room.snapshot();
      send(mate.ws, { t: 'joined', code: room.code, seat: p1.seat, token: p1.token, room: snap });
      send(ws, { t: 'joined', code: room.code, seat: p2.seat, token: p2.token, room: snap });
      notify(room, 'Raqib topildi — omad!');
      break;
    }

    case 'roll': {
      const room = requireRoom(ws);
      if (!room) return;
      if (!room.full || !room.state) return send(ws, { t: 'error', msg: 'Raqib hali qo\'shilmagan' });
      const result = room.roll(ws.ctx.token);
      if (result.error) return send(ws, { t: 'error', msg: result.error });
      broadcastRoom(room, 'roll', { dice: result.dice, events: result.events });
      break;
    }

    case 'chat': {
      const room = requireRoom(ws);
      if (!room) return;
      const player = room.byToken(ws.ctx.token);
      const text = String(msg.text || '').slice(0, 200).trim();
      if (!text || !player) return;
      const entry = { from: player.name, seat: player.seat, text, ts: Date.now() };
      room.chat.push(entry);
      if (room.chat.length > 50) room.chat.shift();
      broadcast(room, { t: 'chat', ...entry });
      break;
    }

    case 'rematch': {
      const room = requireRoom(ws);
      if (!room) return;
      const started = room.voteRematch(ws.ctx.token);
      broadcastRoom(room, started ? 'restart' : 'room');
      if (started) notify(room, 'Yangi o\'yin boshlandi — o\'rinlar almashdi');
      break;
    }

    case 'leave': {
      const room = requireRoom(ws);
      if (!room) return;
      const player = room.byToken(ws.ctx.token);
      room.removePlayer(ws.ctx.token);
      ws.ctx = { code: null, token: null };
      send(ws, { t: 'left' });
      broadcastRoom(room);
      if (player) notify(room, `${player.name} o'yindan chiqdi`);
      break;
    }

    case 'ping':
      send(ws, { t: 'pong' });
      break;

    default:
      send(ws, { t: 'error', msg: "Noma'lum so'rov" });
  }
}

function bind(ws, room, player) {
  ws.ctx = { code: room.code, token: player.token };
}

function requireRoom(ws) {
  const room = store.get(ws.ctx.code);
  if (!room) {
    send(ws, { t: 'error', msg: 'Xona topilmadi' });
    return null;
  }
  return room;
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj) {
  for (const p of room.players) send(p.ws, obj);
}

/** Xona holatini yuboradi — har bir o'yinchiga o'z o'rni (seat) bilan birga. */
function broadcastRoom(room, type = 'room', extra = {}) {
  const snap = room.snapshot();
  for (const p of room.players) send(p.ws, { t: type, room: snap, seat: p.seat, ...extra });
}

function notify(room, text) {
  broadcast(room, { t: 'notice', text });
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

// Uzilib qolgan ulanishlarni aniqlash
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
  store.sweep();
}, 25_000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, HOST, () => {
  console.log(`Ilonlar va Narvonlar → http://localhost:${PORT}`);
});
