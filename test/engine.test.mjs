import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame, applyRoll, rollDice, stepPath, MAX_PLAYERS } from '../public/shared/engine.js';
import { getMap } from '../public/shared/maps.js';

const mapId = 'klassik130';
const map = getMap(mapId);

/** Xarita ma'lumotidan birinchi bog'lanish — testlar aniq raqamlarga bog'lanib qolmasin. */
const firstEntry = (obj) => {
  const [k, v] = Object.entries(obj)[0];
  return [Number(k), v];
};

function game(rules = {}, count = 2) {
  return createGame({
    mapId,
    rules: { specialCells: false, sixExtraTurn: false, tripleSixPenalty: false, ...rules },
    players: Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `O'yinchi ${i + 1}` })),
  });
}

test("o'yin boshlanishi", () => {
  const g = game();
  assert.equal(g.size, 130);
  assert.equal(g.players.length, 2);
  assert.ok(g.players.every((p) => p.pos === 1));
  assert.equal(g.turn, 0);
  assert.equal(g.status, 'playing');
});

test('oddiy yurish va navbat almashuvi', () => {
  const g = game();
  const { state } = applyRoll(g, 3);
  assert.equal(state.players[0].pos, 4);
  assert.equal(state.turn, 1);
  assert.equal(g.players[0].pos, 1, 'asl holat o\'zgarmasligi kerak');
});

test('narvon yuqoriga ko\'taradi', () => {
  const [from, to] = firstEntry(map.ladders);
  const g = game();
  g.players[0].pos = from - 1;
  const { state, events } = applyRoll(g, 1);
  assert.equal(state.players[0].pos, to);
  assert.ok(to > from);
  assert.equal(state.players[0].stats.ladders, 1);
  assert.ok(events.some((e) => e.type === 'ladder'));
});

test('ilon pastga tushiradi', () => {
  const [head, tail] = firstEntry(map.snakes);
  const g = game();
  g.players[0].pos = head - 1;
  const { state, events } = applyRoll(g, 1);
  assert.equal(state.players[0].pos, tail);
  assert.ok(tail < head);
  assert.equal(state.players[0].stats.snakes, 1);
  assert.ok(events.some((e) => e.type === 'snake'));
});

test('finishga aniq tushish — ortiqcha qadam orqaga qaytadi', () => {
  const g = game({ exactFinish: true });
  g.players[0].pos = 126;
  const { state, events } = applyRoll(g, 6); // 132 -> 130 - 2 = 128
  assert.equal(state.players[0].pos, 128);
  assert.ok(events.find((e) => e.type === 'move').bounced);
  assert.equal(state.status, 'playing');
});

test('orqaga qaytgan dona ilon boshiga tushsa — ilon ham ishlaydi', () => {
  // Finishga yaqin ilon boshini topamiz va unga orqaga qaytib tushamiz
  const head = Object.keys(map.snakes).map(Number).find((h) => 130 - h <= 5);
  assert.ok(head, 'sinov uchun finishga yaqin ilon kerak');
  const g = game({ exactFinish: true });
  g.players[0].pos = 2 * g.size - head - 6; // + 6 => oshib ketadi va head ga qaytadi
  const { state } = applyRoll(g, 6);
  assert.equal(state.players[0].pos, map.snakes[head]);
});

test('exactFinish o\'chirilganda finishga tushib qo\'yadi', () => {
  const g = game({ exactFinish: false });
  g.players[0].pos = 128;
  const { state } = applyRoll(g, 5);
  assert.equal(state.players[0].pos, 130);
  assert.equal(state.status, 'finished');
});

test('marraga yetish va g\'olibni aniqlash', () => {
  const g = game();
  g.players[0].pos = 126;
  const { state, events } = applyRoll(g, 4);
  assert.equal(state.players[0].finished, true);
  assert.equal(state.players[0].rank, 1);
  assert.equal(state.status, 'finished');
  assert.equal(state.ranking[0].playerId, 'p1');
  assert.equal(state.ranking.length, 2, 'qolgan o\'yinchilar ham o\'rin oladi');
  assert.ok(events.some((e) => e.type === 'gameover'));
});

test('playToLast — birinchi g\'olibdan keyin o\'yin davom etadi', () => {
  const g = game({ playToLast: true }, 3);
  g.players[0].pos = 126;
  const { state } = applyRoll(g, 4);
  assert.equal(state.status, 'playing');
  assert.equal(state.ranking.length, 1);
  assert.notEqual(state.turn, 0, 'tugatgan o\'yinchi navbat olmaydi');
});

test('6 tashlaganda qo\'shimcha navbat', () => {
  const g = game({ sixExtraTurn: true });
  const { state } = applyRoll(g, 6);
  assert.equal(state.turn, 0, 'navbat o\'sha o\'yinchida qoladi');
  assert.equal(state.players[0].stats.sixes, 1);
});

test('ketma-ket 3 ta 6 — yurish bekor', () => {
  let g = game({ sixExtraTurn: true, tripleSixPenalty: true });
  g = applyRoll(g, 6).state;
  const posAfterTwo = applyRoll(g, 6).state.players[0].pos;
  g = applyRoll(g, 6).state;
  const third = applyRoll(g, 6);
  assert.equal(third.state.players[0].pos, posAfterTwo, 'uchinchi 6 da yurmaydi');
  assert.equal(third.state.turn, 1);
  assert.ok(third.events.some((e) => e.type === 'penalty'));
});

test('bonus katak qo\'shimcha zar beradi', () => {
  const cell = map.bonus[0];
  const g = game({ specialCells: true });
  g.players[0].pos = cell - 1;
  const { state, events } = applyRoll(g, 1);
  assert.equal(state.players[0].pos, cell);
  assert.equal(state.turn, 0, 'bonus katakda navbat o\'zgarmaydi');
  assert.ok(events.some((e) => e.type === 'bonus'));
});

test('tuzoq katak bir yurishni o\'tkazib yuboradi', () => {
  const cell = map.traps[0];
  const g = game({ specialCells: true }, 2);
  g.players[1].pos = cell - 1;
  g.turn = 1;
  const after = applyRoll(g, 1);
  assert.equal(after.state.players[1].pos, cell);
  assert.equal(after.state.players[1].skipTurns, 1);
  assert.equal(after.state.turn, 0);

  const next = applyRoll(after.state, 1); // p1 yuradi, keyin p2 o'tkazib yuboriladi
  assert.equal(next.state.turn, 0, 'o\'tkazib yuborilgach navbat yana p1 ga qaytadi');
  assert.equal(next.state.players[1].skipTurns, 0);
  assert.ok(next.events.some((e) => e.type === 'skip'));
});

test('tugagan o\'yinda zar tashlash holatni o\'zgartirmaydi', () => {
  const g = game();
  g.players[0].pos = 129;
  const done = applyRoll(g, 1).state;
  assert.equal(done.status, 'finished');
  const again = applyRoll(done, 5);
  assert.deepEqual(again.state, done);
  assert.deepEqual(again.events, []);
});

test('zar 1..6 oralig\'ida va noto\'g\'ri qiymat rad etiladi', () => {
  for (let i = 0; i < 500; i++) {
    const d = rollDice();
    assert.ok(Number.isInteger(d) && d >= 1 && d <= 6);
  }
  const g = game();
  assert.throws(() => applyRoll(g, 0));
  assert.throws(() => applyRoll(g, 7));
  assert.throws(() => applyRoll(g, 2.5));
});

test('stepPath oldinga va orqaga yo\'l beradi', () => {
  assert.deepEqual(stepPath(3, 6), [4, 5, 6]);
  assert.deepEqual(stepPath(6, 3), [5, 4, 3]);
  assert.deepEqual(stepPath(4, 4), []);
});

test('6 kishilik o\'yin oxirigacha o\'ynaladi', () => {
  let g = createGame({
    mapId: 'koinot196',
    rules: { playToLast: true },
    players: Array.from({ length: MAX_PLAYERS }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` })),
  });
  let guard = 0;
  while (g.status === 'playing' && guard++ < 20000) {
    g = applyRoll(g, rollDice()).state;
  }
  assert.equal(g.status, 'finished');
  assert.equal(g.ranking.length, MAX_PLAYERS);
  assert.deepEqual(g.ranking.map((r) => r.rank), [1, 2, 3, 4, 5, 6]);
});

test('har bir xaritada o\'yin tugaydi (barcha xaritalar o\'ynasa bo\'ladi)', () => {
  for (const id of ['klassik130', 'zumrad144', 'olov180', 'koinot196', 'tezkor120']) {
    let g = createGame({ mapId: id, players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] });
    let guard = 0;
    while (g.status === 'playing' && guard++ < 20000) g = applyRoll(g, rollDice()).state;
    assert.equal(g.status, 'finished', `${id} tugamadi`);
  }
});
