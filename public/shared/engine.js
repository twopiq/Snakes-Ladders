/**
 * O'yin qoidalari — sof (pure) modul.
 *
 * Bu fayl ham brauzerda (oflayn rejim), ham serverda (onlayn rejim) ishlatiladi.
 * Zar qiymati tashqaridan beriladi, shuning uchun natija to'liq deterministik:
 * server zarni o'zi tashlaydi va bir xil holatni ikkala o'yinchiga yuboradi.
 */

import { getMap, mapSize } from './maps.js';

export const PLAYER_COLORS = [
  { id: 'qizil', name: 'Qizil', hex: '#ef4444' },
  { id: 'kok', name: "Ko'k", hex: '#3b82f6' },
  { id: 'yashil', name: 'Yashil', hex: '#22c55e' },
  { id: 'sariq', name: 'Sariq', hex: '#eab308' },
  { id: 'binafsha', name: 'Binafsha', hex: '#a855f7' },
  { id: 'firuza', name: 'Firuza', hex: '#06b6d4' },
];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const DEFAULT_RULES = {
  /** Finishga aniq tushish shart (ortiqcha qadamlar orqaga qaytariladi). */
  exactFinish: true,
  /** 6 tashlagan o'yinchi yana tashlaydi. */
  sixExtraTurn: true,
  /** Ketma-ket 3 ta 6 — yurish bekor qilinadi. */
  tripleSixPenalty: true,
  /** Bonus va tuzoq kataklari ishlaydi. */
  specialCells: true,
  /** Birinchi g'olibdan keyin o'yin davom etadi (o'rinlar to'liq aniqlanadi). */
  playToLast: false,
};

export function normalizeRules(rules = {}) {
  const out = { ...DEFAULT_RULES };
  for (const key of Object.keys(DEFAULT_RULES)) {
    if (typeof rules[key] === 'boolean') out[key] = rules[key];
  }
  return out;
}

/**
 * Yangi o'yin holatini yaratadi.
 * players: [{ id, name, colorId }]
 */
export function createGame({ mapId, players, rules = {}, seatOwners = null }) {
  const map = getMap(mapId);
  const size = mapSize(map);
  const list = players.slice(0, MAX_PLAYERS).map((p, i) => ({
    id: p.id ?? `p${i + 1}`,
    name: (p.name || `O'yinchi ${i + 1}`).slice(0, 16),
    color: p.colorId || PLAYER_COLORS[i % PLAYER_COLORS.length].id,
    hex: (PLAYER_COLORS.find((c) => c.id === p.colorId) || PLAYER_COLORS[i % PLAYER_COLORS.length]).hex,
    pos: 1,
    skipTurns: 0,
    sixStreak: 0,
    finished: false,
    rank: 0,
    owner: seatOwners ? seatOwners[i] ?? null : null,
    stats: { rolls: 0, ladders: 0, snakes: 0, sixes: 0, steps: 0 },
  }));

  return {
    mapId: map.id,
    size,
    rules: normalizeRules(rules),
    players: list,
    turn: 0,
    turnNo: 1,
    lastRoll: null,
    lastMove: null,
    status: 'playing', // 'playing' | 'finished'
    ranking: [],
    log: [{ text: `O'yin boshlandi — ${map.name}`, kind: 'info' }],
  };
}

export const activePlayer = (state) => state.players[state.turn];

/** 1..6 oralig'ida zar. rnd — 0..1 qaytaruvchi funksiya. */
export function rollDice(rnd = Math.random) {
  return 1 + Math.floor(rnd() * 6);
}

/**
 * Zar natijasini qo'llaydi.
 * Qaytadi: { state, events } — events animatsiya va jurnal uchun.
 * State mutatsiya qilinmaydi (nusxa qaytariladi).
 */
export function applyRoll(state, dice) {
  if (state.status !== 'playing') return { state, events: [] };
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) throw new Error('Zar qiymati noto\'g\'ri');

  const next = cloneState(state);
  const map = getMap(next.mapId);
  const player = next.players[next.turn];
  const events = [];

  player.stats.rolls += 1;
  next.lastRoll = { playerId: player.id, dice, turnNo: next.turnNo };
  events.push({ type: 'roll', playerId: player.id, dice });
  log(next, `${player.name} — zar: ${dice}`, 'roll');

  let extraTurn = false;

  if (dice === 6) {
    player.stats.sixes += 1;
    player.sixStreak += 1;
  } else {
    player.sixStreak = 0;
  }

  if (next.rules.tripleSixPenalty && player.sixStreak >= 3) {
    player.sixStreak = 0;
    events.push({ type: 'penalty', playerId: player.id, reason: 'triple-six' });
    log(next, `${player.name} ketma-ket 3 ta 6 tashladi — yurish bekor!`, 'bad');
    advanceTurn(next, events);
    return { state: next, events };
  }

  // --- Yurish ---
  const from = player.pos;
  let target = from + dice;
  let bounced = false;

  if (target > next.size) {
    if (next.rules.exactFinish) {
      const overshoot = target - next.size;
      target = next.size - overshoot;
      bounced = true;
    } else {
      target = next.size;
    }
  }

  player.stats.steps += Math.abs(target - from);
  player.pos = target;
  events.push({ type: 'move', playerId: player.id, from, to: target, bounced });
  if (bounced) log(next, `${player.name} finishdan oshib ketdi — ${target}-katakka qaytdi`, 'info');

  // --- Narvon / ilon ---
  if (target !== next.size) {
    const ladderTo = map.ladders[target];
    const snakeTo = map.snakes[target];

    if (ladderTo) {
      player.pos = ladderTo;
      player.stats.ladders += 1;
      events.push({ type: 'ladder', playerId: player.id, from: target, to: ladderTo });
      log(next, `${player.name} narvondan ko'tarildi: ${target} → ${ladderTo}`, 'good');
    } else if (snakeTo) {
      player.pos = snakeTo;
      player.stats.snakes += 1;
      events.push({ type: 'snake', playerId: player.id, from: target, to: snakeTo });
      log(next, `${player.name} ilonga yutildi: ${target} → ${snakeTo}`, 'bad');
    } else if (next.rules.specialCells && (map.bonus || []).includes(target)) {
      extraTurn = true;
      events.push({ type: 'bonus', playerId: player.id, cell: target });
      log(next, `${player.name} bonus katakka tushdi — qo'shimcha zar!`, 'good');
    } else if (next.rules.specialCells && (map.traps || []).includes(target)) {
      player.skipTurns += 1;
      events.push({ type: 'trap', playerId: player.id, cell: target });
      log(next, `${player.name} tuzoqqa tushdi — bir yurish o'tkazib yuboriladi`, 'bad');
    }
  }

  next.lastMove = { playerId: player.id, from, to: player.pos };

  // --- Finish ---
  if (player.pos === next.size) {
    player.finished = true;
    player.rank = next.ranking.length + 1;
    next.ranking.push({ playerId: player.id, name: player.name, rank: player.rank });
    events.push({ type: 'finish', playerId: player.id, rank: player.rank });
    log(next, `🏁 ${player.name} marraga yetdi — ${player.rank}-o'rin!`, 'win');

    const remaining = next.players.filter((p) => !p.finished);
    if (!next.rules.playToLast || remaining.length <= 1) {
      for (const p of remaining) {
        p.rank = next.ranking.length + 1;
        next.ranking.push({ playerId: p.id, name: p.name, rank: p.rank });
      }
      next.status = 'finished';
      events.push({ type: 'gameover', ranking: next.ranking });
      log(next, "O'yin tugadi", 'info');
      return { state: next, events };
    }
    extraTurn = false;
  }

  if (dice === 6 && next.rules.sixExtraTurn && !player.finished) extraTurn = true;

  if (extraTurn) {
    events.push({ type: 'extra-turn', playerId: player.id });
    log(next, `${player.name} yana tashlaydi`, 'info');
  } else {
    advanceTurn(next, events);
  }

  return { state: next, events };
}

/** Navbatni keyingi o'yinchiga o'tkazadi, tuzoqdagilarni o'tkazib yuboradi. */
function advanceTurn(state, events) {
  const total = state.players.length;
  for (let step = 1; step <= total * 3; step++) {
    const idx = (state.turn + step) % total;
    const p = state.players[idx];
    if (p.finished) continue;
    if (p.skipTurns > 0) {
      p.skipTurns -= 1;
      events.push({ type: 'skip', playerId: p.id });
      log(state, `${p.name} bu yurishni o'tkazib yubordi`, 'info');
      continue;
    }
    state.turn = idx;
    state.turnNo += 1;
    events.push({ type: 'turn', playerId: p.id });
    return;
  }
  // Hamma tugatgan bo'lsa
  state.status = 'finished';
  events.push({ type: 'gameover', ranking: state.ranking });
}

function log(state, text, kind = 'info') {
  state.log.push({ text, kind });
  if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
}

function cloneState(state) {
  return {
    ...state,
    rules: { ...state.rules },
    players: state.players.map((p) => ({ ...p, stats: { ...p.stats } })),
    ranking: state.ranking.map((r) => ({ ...r })),
    log: state.log.slice(),
  };
}

/** Katakdan katakka bosqichma-bosqich yo'l (animatsiya uchun). */
export function stepPath(from, to) {
  const path = [];
  const dir = to >= from ? 1 : -1;
  for (let c = from + dir; dir > 0 ? c <= to : c >= to; c += dir) path.push(c);
  return path;
}
