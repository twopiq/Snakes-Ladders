import http from 'node:http';
import { WebSocketServer } from 'ws';

import crypto from 'node:crypto';

import { serveStatic } from './static.js';
import { RoomStore } from './rooms.js';
import { telegramConfig, telegramEnabled, resolveIdentity, verifyInitData, botToken, reasonText } from './telegram.js';
import { Store } from './store.js';
import { createBot } from './bot.js';
import { MAPS } from '../public/shared/maps.js';
import { COSMETICS } from '../public/shared/cosmetics.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const store = new RoomStore();
const shop = new Store();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const WEBAPP_URL = (process.env.WEBAPP_URL || '').replace(/\/$/, '');

// Bot va Stars to'lovlari — faqat token berilgan bo'lsa
const bot = telegramEnabled && process.env.DISABLE_BOT !== '1'
  ? createBot({ token: botToken(), store: shop, webappUrl: WEBAPP_URL })
  : null;
bot?.start();

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
  if (url.pathname === '/api/catalog') {
    return json(res, 200, { items: catalogForClient(), starsEnabled: Boolean(bot) });
  }
  if (url.pathname.startsWith('/api/shop/') || url.pathname.startsWith('/api/admin/')) {
    return handleApi(req, res, url);
  }
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    req.url = '/admin.html';
    return serveStatic(req, res);
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
 * O'yinchi kimligini aniqlaydi.
 *
 * Telegram imzosi to'g'ri bo'lsa — ism profildan olinadi (ishonchli).
 * Imzo tekshiruvi o'tmasa (masalan serverda noto'g'ri BOT_TOKEN) — O'YIN TO'XTAMAYDI:
 * o'yinchi o'zi kiritgan ism bilan davom etadi, xuddi saytdagidek. Sozlama xatosi
 * tufayli odamlarni o'ynashdan to'xtatib qo'yish noto'g'ri bo'lardi.
 * (Xavfsizlik jihatidan yomonlashuv yo'q: initData yubormasdan ham shu holat bo'lardi.)
 */
function identify(ws, msg) {
  const ident = resolveIdentity({ initData: msg.initData, name: msg.name });
  if (msg.initData && telegramEnabled && !ident.verified) {
    if (!ws.warnedAuth) {
      ws.warnedAuth = true;
      console.warn(`initData tekshiruvi o'tmadi: ${ident.error} (${reasonText(ident.error)})`);
    }
    return { name: msg.name || null, tgId: null, verified: false };
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
      // Server qayta ishga tushgan bo'lsa xonalar yo'qoladi — mijozga aniq belgi beramiz
      const room = store.get(msg.code);
      if (!room) return send(ws, { t: 'error', msg: 'Xona endi mavjud emas', code: 'room-gone' });
      const player = room.byToken(msg.token);
      if (!player) return send(ws, { t: 'error', msg: "Bu xonada o'rningiz qolmagan", code: 'room-gone' });
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
      if (result.error) {
        send(ws, { t: 'error', msg: result.error });
        // Mijoz holati eskirgan bo'lishi mumkin — darhol joriy holatni yuboramiz
        return sendRoom(ws, room);
      }
      broadcastRoom(room, 'roll', { dice: result.dice, events: result.events });
      break;
    }

    case 'sync': {
      // Mijoz uzilib-ulangach yoki fondan qaytgach holatni so'raydi
      const room = requireRoom(ws);
      if (!room) return;
      sendRoom(ws, room);
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

/** Bitta mijozga joriy holatni yuboradi (sinxronlash uchun). */
function sendRoom(ws, room) {
  const player = room.byToken(ws.ctx.token);
  send(ws, { t: 'room', room: room.snapshot(), seat: player ? player.seat : undefined });
}

function notify(room, text) {
  broadcast(room, { t: 'notice', text });
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

// ---------------------------------------------------------------- do'kon va admin API

/** Katalog + amaldagi narxlar (mijoz narxni har doim shu yerdan oladi). */
function catalogForClient() {
  return COSMETICS.map((item) => ({
    id: item.id,
    slot: item.slot,
    name: item.name,
    about: item.about,
    rarity: item.rarity,
    grants: item.grants || null,
    style: item.style || null,
    price: shop.price(item.id),
    basePrice: item.price,
    disabled: shop.isDisabled(item.id),
  }));
}

function readBody(req, limit = 8000) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error('juda katta'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('json emas'));
      }
    });
    req.on('error', reject);
  });
}

/** Admin kalitini tekshiradi (vaqt bo'yicha xavfsiz solishtirish). */
function adminOk(req) {
  if (!ADMIN_PASSWORD) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Do'kon so'rovlarida o'yinchini aniqlash — faqat imzolangan Telegram ma'lumoti. */
function shopUser(body) {
  if (!telegramEnabled) return { ok: false, error: 'Do\'kon faqat Telegram ichida ishlaydi' };
  const res = verifyInitData(body.initData);
  if (!res.ok) return { ok: false, error: reasonText(res.reason), reason: res.reason };
  return { ok: true, tgId: res.user.id, name: res.user.name };
}

async function handleApi(req, res, url) {
  const path = url.pathname;

  // ---- admin
  if (path.startsWith('/api/admin/')) {
    if (!ADMIN_PASSWORD) return json(res, 503, { error: 'ADMIN_PASSWORD sozlanmagan' });
    if (!adminOk(req)) return json(res, 401, { error: 'Kalit noto\'g\'ri' });

    if (path === '/api/admin/overview') {
      const cfg = telegramConfig();
      const linked = bot?.info?.username || null;
      return json(res, 200, {
        items: catalogForClient(),
        stats: shop.stats(),
        starsEnabled: Boolean(bot),
        telegram: {
          tokenSet: telegramEnabled,
          botUsername: linked,                       // token haqiqatda qaysi botniki
          configuredUsername: cfg.botUsername || null, // BOT_USERNAME nima deb yozilgan
          mismatch: Boolean(linked && cfg.botUsername && linked.toLowerCase() !== cfg.botUsername.toLowerCase()),
        },
      });
    }

    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { error: 'So\'rov formati noto\'g\'ri' });
    }

    if (path === '/api/admin/price') {
      const result = shop.setPrice(body.itemId, body.stars === null ? null : Number(body.stars));
      return json(res, result.ok ? 200 : 400, result);
    }
    if (path === '/api/admin/disabled') {
      const result = shop.setDisabled(body.itemId, Boolean(body.disabled));
      return json(res, result.ok ? 200 : 400, result);
    }
    if (path === '/api/admin/refund') {
      const purchase = shop.findPurchase(String(body.chargeId || ''));
      if (!purchase) return json(res, 404, { error: 'Bunday xarid topilmadi' });
      if (!bot) return json(res, 503, { error: 'Bot ulanmagan — qaytarib bo\'lmaydi' });
      const result = await bot.refund({ tgId: purchase.tgId, chargeId: purchase.chargeId });
      return json(res, result.ok ? 200 : 400, result);
    }
    return json(res, 404, { error: 'Topilmadi' });
  }

  // ---- do'kon
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { error: 'So\'rov formati noto\'g\'ri' });
  }

  const who = shopUser(body);
  if (!who.ok) return json(res, 401, { error: who.error, reason: who.reason });

  if (path === '/api/shop/profile') {
    const user = shop.user(who.tgId);
    return json(res, 200, {
      tgId: who.tgId,
      name: who.name,
      owned: user.owned,
      equipped: user.equipped,
      starsSpent: user.starsSpent,
      items: catalogForClient(),
      starsEnabled: Boolean(bot),
    });
  }

  if (path === '/api/shop/equip') {
    const result = shop.equip(who.tgId, String(body.slot), String(body.itemId));
    return json(res, result.ok ? 200 : 400, result);
  }

  if (path === '/api/shop/invoice') {
    if (!bot) return json(res, 503, { error: 'To\'lovlar hozircha yoqilmagan' });
    const result = await bot.createInvoice({ itemId: String(body.itemId), tgId: who.tgId });
    return json(res, result.ok ? 200 : 400, result);
  }

  return json(res, 404, { error: 'Topilmadi' });
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
