/**
 * Onlayn xonalar (2 kishilik real vaqt rejimi) uchun holat boshqaruvi.
 * Zar serverda tashlanadi — mijoz faqat "tashladim" deb so'raydi, natijani server hal qiladi.
 */

import crypto from 'node:crypto';
import { createGame, applyRoll, rollDice, normalizeRules, abandonPlayer, PLAYER_COLORS } from '../public/shared/engine.js';
import { getMap } from '../public/shared/maps.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // chalkash belgilarsiz
export const MIN_SEATS = 2;
export const MAX_SEATS = 3; // onlayn xonada eng ko'pi 3 kishi
const ROOM_TTL_MS = 30 * 60 * 1000; // hamma uzilgach xona shuncha vaqt saqlanadi
const RECONNECT_MS = 60 * 1000;

export class RoomStore {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Array<{ws: any, name: string, mapId: string}>} */
    this.queue = [];
  }

  newCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  create({ name, mapId, rules, capacity }) {
    const room = new Room(this.newCode(), { mapId, rules, capacity });
    this.rooms.set(room.code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim());
  }

  /** Bo'sh yoki uzilib qolgan xonalarni tozalaydi. */
  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const anyOnline = room.players.some((p) => p.online);
      if (!anyOnline && now - room.lastActivity > ROOM_TTL_MS) this.rooms.delete(code);
      if (room.players.length === 0 && now - room.createdAt > 10 * 60 * 1000) this.rooms.delete(code);
    }
    this.queue = this.queue.filter((q) => q.ws.readyState === 1);
  }
}

export class Room {
  constructor(code, { mapId, rules, capacity }) {
    this.code = code;
    this.mapId = getMap(mapId).id;
    this.rules = normalizeRules(rules);
    // Nechta o'yinchiga mo'ljallangan (2 yoki 3)
    this.capacity = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Number(capacity) || MIN_SEATS));
    /** @type {Array<{token:string,name:string,seat:number,ws:any,online:boolean,lastSeen:number}>} */
    this.players = [];
    this.state = null;
    this.rematchVotes = new Set();
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.chat = [];
  }

  get full() {
    return this.players.length >= this.capacity;
  }

  /** Kamida ikki kishi bo'lsa, xona egasi o'yinni erta boshlashi mumkin. */
  get canStartEarly() {
    return !this.state && this.players.length >= MIN_SEATS && !this.full;
  }

  /** Xona egasi — birinchi o'ringa kirgan o'yinchi. */
  isHost(token) {
    return this.players[0]?.token === token;
  }

  addPlayer(name, ws, tgId = null) {
    if (this.full || this.state) return null; // o'yin boshlangach yangi odam qo'shilmaydi
    const seat = this.players.length;
    const player = {
      token: crypto.randomBytes(16).toString('hex'),
      name: cleanName(name, seat),
      tgId,
      seat,
      ws,
      online: true,
      lastSeen: Date.now(),
    };
    this.players.push(player);
    this.lastActivity = Date.now();
    if (this.full && !this.state) this.startGame();
    return player;
  }

  byToken(token) {
    return this.players.find((p) => p.token === token);
  }

  startGame() {
    this.state = createGame({
      mapId: this.mapId,
      rules: this.rules,
      players: this.players.map((p, i) => ({
        id: `seat${i}`,
        name: p.name,
        colorId: PLAYER_COLORS[i].id,
      })),
      seatOwners: this.players.map((p) => p.token),
    });
    this.rematchVotes.clear();
    this.lastActivity = Date.now();
  }

  /** Xona egasi to'lmagan xonada o'yinni boshlaydi. */
  startEarly(token) {
    if (!this.isHost(token)) return { ok: false, error: 'Faqat xona egasi boshlay oladi' };
    if (this.state) return { ok: false, error: "O'yin allaqachon boshlangan" };
    if (this.players.length < MIN_SEATS) return { ok: false, error: 'Kamida 2 kishi kerak' };
    this.startGame();
    return { ok: true };
  }

  /** Navbat shu tokendagi o'yinchidami? */
  isTurnOf(token) {
    if (!this.state || this.state.status !== 'playing') return false;
    const p = this.byToken(token);
    if (!p) return false;
    return this.state.turn === p.seat;
  }

  roll(token) {
    if (!this.isTurnOf(token)) return { error: 'Hozir sizning navbatingiz emas' };
    const dice = rollDice(() => crypto.randomInt(1_000_000) / 1_000_000);
    const { state, events } = applyRoll(this.state, dice);
    this.state = state;
    this.lastActivity = Date.now();
    return { dice, state, events };
  }

  voteRematch(token) {
    if (!this.byToken(token)) return false;
    this.rematchVotes.add(token);
    if (this.rematchVotes.size >= this.players.length && this.players.length >= MIN_SEATS) {
      // Navbat adolatli bo'lishi uchun o'rinlar bittaga suriladi:
      // birinchi bo'lib boshlagan endi oxirgi bo'ladi.
      this.players.push(this.players.shift());
      this.players.forEach((p, i) => { p.seat = i; });
      this.startGame();
      return true;
    }
    return false;
  }

  /**
   * O'yinchi xonadan chiqadi.
   * O'yin boshlanmagan bo'lsa — ro'yxatdan olib tashlanadi.
   * O'yin ketayotgan bo'lsa — o'rinlar buzilmasligi uchun faqat "tashlab ketdi"
   * deb belgilanadi va navbat undan o'tib ketadi.
   */
  removePlayer(token) {
    const idx = this.players.findIndex((p) => p.token === token);
    if (idx < 0) return { events: [] };
    this.lastActivity = Date.now();

    if (!this.state || this.state.status !== 'playing') {
      this.players.splice(idx, 1);
      this.players.forEach((p, i) => { p.seat = i; });
      this.rematchVotes.delete(token);
      return { events: [] };
    }

    const seatId = `seat${this.players[idx].seat}`;
    const { state, events } = abandonPlayer(this.state, seatId);
    this.state = state;
    this.players[idx].left = true;
    return { events };
  }

  markOffline(token) {
    const p = this.byToken(token);
    if (p) {
      p.online = false;
      p.ws = null;
      p.lastSeen = Date.now();
    }
    this.lastActivity = Date.now();
  }

  /** Uzilgan o'yinchi qayta ulanish muddatini o'tkazib yubordimi? */
  expiredPlayers() {
    const now = Date.now();
    return this.players.filter((p) => !p.online && now - p.lastSeen > RECONNECT_MS);
  }

  /** Mijozga yuboriladigan xona tavsifi (maxfiy tokenlarsiz). */
  snapshot() {
    return {
      code: this.code,
      mapId: this.mapId,
      rules: this.rules,
      state: this.state ? sanitizeState(this.state) : null,
      chat: this.chat.slice(-30),
      capacity: this.capacity,
      canStartEarly: this.canStartEarly,
      players: this.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        online: p.online,
        left: Boolean(p.left),
        color: PLAYER_COLORS[p.seat]?.id,
        rematch: this.rematchVotes.has(p.token),
      })),
    };
  }
}

/** O'yin holatidan o'yinchi tokenlarini olib tashlaydi — ular faqat serverda qoladi. */
function sanitizeState(state) {
  return {
    ...state,
    players: state.players.map(({ owner, ...rest }) => rest),
  };
}

function cleanName(name, seat) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return clean || `O'yinchi ${seat + 1}`;
}
