/**
 * Onlayn xonalar (2 kishilik real vaqt rejimi) uchun holat boshqaruvi.
 * Zar serverda tashlanadi — mijoz faqat "tashladim" deb so'raydi, natijani server hal qiladi.
 */

import crypto from 'node:crypto';
import { createGame, applyRoll, rollDice, normalizeRules, PLAYER_COLORS } from '../public/shared/engine.js';
import { getMap } from '../public/shared/maps.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // chalkash belgilarsiz
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

  create({ name, mapId, rules }) {
    const room = new Room(this.newCode(), { mapId, rules });
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
  constructor(code, { mapId, rules }) {
    this.code = code;
    this.mapId = getMap(mapId).id;
    this.rules = normalizeRules(rules);
    /** @type {Array<{token:string,name:string,seat:number,ws:any,online:boolean,lastSeen:number}>} */
    this.players = [];
    this.state = null;
    this.rematchVotes = new Set();
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.chat = [];
  }

  get full() {
    return this.players.length >= 2;
  }

  addPlayer(name, ws, tgId = null) {
    if (this.full) return null;
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
    if (this.rematchVotes.size >= this.players.length && this.players.length === 2) {
      // yangi o'yinda o'rinlar almashadi — navbat adolatli bo'lsin
      this.players.reverse();
      this.players.forEach((p, i) => { p.seat = i; });
      this.startGame();
      return true;
    }
    return false;
  }

  removePlayer(token) {
    const idx = this.players.findIndex((p) => p.token === token);
    if (idx >= 0) this.players.splice(idx, 1);
    this.players.forEach((p, i) => { p.seat = i; });
    this.lastActivity = Date.now();
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
      players: this.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        online: p.online,
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
