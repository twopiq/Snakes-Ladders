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
    left: false,
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
    log: [{ key: 'log.start', params: { mapId: map.id }, kind: 'info' }],
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
  log(next, 'log.roll', { name: player.name, dice }, 'roll');

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
    log(next, 'log.tripleSix', { name: player.name }, 'bad');
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
  if (bounced) log(next, 'log.bounce', { name: player.name, cell: target }, 'info');

  // --- Narvon / ilon ---
  if (target !== next.size) {
    const ladderTo = map.ladders[target];
    const snakeTo = map.snakes[target];

    if (ladderTo) {
      player.pos = ladderTo;
      player.stats.ladders += 1;
      events.push({ type: 'ladder', playerId: player.id, from: target, to: ladderTo });
      log(next, 'log.ladder', { name: player.name, from: target, to: ladderTo }, 'good');
    } else if (snakeTo) {
      player.pos = snakeTo;
      player.stats.snakes += 1;
      events.push({ type: 'snake', playerId: player.id, from: target, to: snakeTo });
      log(next, 'log.snake', { name: player.name, from: target, to: snakeTo }, 'bad');
    } else if (next.rules.specialCells && (map.bonus || []).includes(target)) {
      extraTurn = true;
      events.push({ type: 'bonus', playerId: player.id, cell: target });
      log(next, 'log.bonus', { name: player.name }, 'good');
    } else if (next.rules.specialCells && (map.traps || []).includes(target)) {
      player.skipTurns += 1;
      events.push({ type: 'trap', playerId: player.id, cell: target });
      log(next, 'log.trap', { name: player.name }, 'bad');
    }
  }

  next.lastMove = { playerId: player.id, from, to: player.pos };

  // --- Finish ---
  if (player.pos === next.size) {
    player.finished = true;
    player.rank = next.ranking.length + 1;
    next.ranking.push({ playerId: player.id, name: player.name, rank: player.rank });
    events.push({ type: 'finish', playerId: player.id, rank: player.rank });
    log(next, 'log.finish', { name: player.name, rank: player.rank }, 'win');

    const remaining = next.players.filter((p) => !p.finished);
    if (!next.rules.playToLast || remaining.length <= 1) {
      closeGame(next, events);
      return { state: next, events };
    }
    extraTurn = false;
  }

  if (dice === 6 && next.rules.sixExtraTurn && !player.finished) extraTurn = true;

  if (extraTurn) {
    events.push({ type: 'extra-turn', playerId: player.id });
    log(next, 'log.again', { name: player.name }, 'info');
  } else {
    advanceTurn(next, events);
  }

  return { state: next, events };
}

/**
 * O'yinchi o'yinni tashlab ketdi (aloqa uzildi yoki "Chiqish" bosildi).
 * Uning navbati o'tkazib yuboriladi, qolganlar o'ynashda davom etadi.
 * Bitta o'yinchi qolsa — o'yin tugaydi va u g'olib bo'ladi.
 */
export function abandonPlayer(state, playerId) {
  if (state.status !== 'playing') return { state, events: [] };
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0 || state.players[idx].finished) return { state, events: [] };

  const next = cloneState(state);
  const player = next.players[idx];
  player.finished = true;
  player.left = true;
  const events = [{ type: 'left', playerId: player.id }];
  log(next, 'log.left', { name: player.name }, 'bad');

  const active = next.players.filter((p) => !p.finished);
  if (active.length <= 1) {
    // Qolgan o'yinchi g'olib
    for (const p of active) {
      p.finished = true;
      p.rank = next.ranking.length + 1;
      next.ranking.push({ playerId: p.id, name: p.name, rank: p.rank });
      events.push({ type: 'finish', playerId: p.id, rank: p.rank });
    }
    closeGame(next, events);
    return { state: next, events };
  }

  if (next.turn === idx) advanceTurn(next, events);
  return { state: next, events };
}

/** O'yinni yakunlaydi va qolgan o'rinlarni taqsimlaydi. */
function closeGame(state, events) {
  const ranked = new Set(state.ranking.map((r) => r.playerId));
  const rest = state.players.filter((p) => !ranked.has(p.id));
  // Marraga yaqinroq turgan yuqori o'rinni oladi; tashlab ketganlar oxirida
  rest.sort((a, b) => (Boolean(a.left) === Boolean(b.left) ? b.pos - a.pos : (a.left ? 1 : -1)));
  for (const p of rest) {
    p.rank = state.ranking.length + 1;
    state.ranking.push({ playerId: p.id, name: p.name, rank: p.rank });
  }
  state.status = 'finished';
  events.push({ type: 'gameover', ranking: state.ranking });
  log(state, 'log.over', null, 'info');
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
      log(state, 'log.skipped', { name: p.name }, 'info');
      continue;
    }
    state.turn = idx;
    state.turnNo += 1;
    events.push({ type: 'turn', playerId: p.id });
    return;
  }
  // Hamma tugatgan bo'lsa
  closeGame(state, events);
}

/**
 * Jurnalga yozuv qo'shadi.
 *
 * Matn emas, tarjima kaliti saqlanadi: onlayn o'yinda holatni server yasaydi,
 * lekin har bir o'yinchi jurnalni o'z tilida ko'rishi kerak. Matn mijozda
 * (game-view.js dagi logText) yig'iladi.
 */
function log(state, key, params = null, kind = 'info') {
  state.log.push(params ? { key, params, kind } : { key, kind });
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
