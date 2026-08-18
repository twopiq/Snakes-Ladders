/**
 * Xarita generatori (bir marta ishlatiladigan yordamchi vosita).
 *
 *   node tools/gen-maps.mjs
 *
 * Narvon va ilonlarni "qo'lda chizilgan taxta" uslubida joylashtiradi:
 * sakrash 2-3 qator, ustun bo'yicha siljish kichik — shunda chiziqlar
 * taxta bo'ylab chalkashib ketmaydi va o'qish oson bo'ladi.
 * Chiqqan natija public/shared/maps.js ichiga ko'chiriladi.
 */

import { gridToCell, cellToGrid } from '../public/shared/maps.js';

/** Takrorlanadigan natija uchun oddiy seedli tasodifiy generator. */
function mulberry32(seed) {
  return function rnd() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECS = [
  { id: 'klassik130', cols: 10, rows: 13, seed: 11, ladders: 14, snakes: 13, bonus: 4, traps: 3 },
  { id: 'zumrad144', cols: 12, rows: 12, seed: 27, ladders: 16, snakes: 11, bonus: 4, traps: 4 },
  { id: 'olov180', cols: 12, rows: 15, seed: 43, ladders: 16, snakes: 17, bonus: 5, traps: 4 },
  { id: 'koinot196', cols: 14, rows: 14, seed: 58, ladders: 17, snakes: 17, bonus: 5, traps: 4 },
  { id: 'tezkor120', cols: 10, rows: 12, seed: 74, ladders: 15, snakes: 8, bonus: 4, traps: 3 },
];

function generate(spec) {
  const map = { cols: spec.cols, rows: spec.rows };
  const size = spec.cols * spec.rows;
  const rnd = mulberry32(spec.seed);
  const used = new Set([1, size]);
  const ladders = {};
  const snakes = {};

  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const free = (cell) => cell > 1 && cell < size && !used.has(cell);

  /** Qatorlar bo'ylab teng taqsimlangan boshlanish qatorlari ro'yxati. */
  const rowPool = (lo, hi, count) => {
    const rows = [];
    for (let i = 0; i < count; i++) rows.push(lo + Math.round((i * (hi - lo)) / Math.max(1, count - 1)));
    // biroz aralashtiramiz, lekin taqsimot saqlanadi
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
  };

  /** Berilgan qatordan bog'lanish yasashga urinadi: dir=+1 narvon, dir=-1 ilon. */
  const link = (dir, wantRow) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      const jump = pick([2, 2, 3, 3, 4]); // necha qator
      const startRow = Math.min(
        dir > 0 ? spec.rows - jump - 1 : spec.rows - 1,
        Math.max(dir > 0 ? 0 : jump, wantRow + pick([-1, 0, 0, 1])),
      );
      const endRow = startRow + dir * jump;
      if (endRow < 0 || endRow >= spec.rows) continue;

      const startCol = Math.floor(rnd() * spec.cols);
      const drift = pick([-2, -1, -1, 0, 0, 0, 1, 1, 2]);
      const endCol = Math.min(spec.cols - 1, Math.max(0, startCol + drift));

      const from = gridToCell(map, startCol, startRow);
      const to = gridToCell(map, endCol, endRow);
      if (!free(from) || !free(to)) continue;
      if (dir > 0 ? to <= from : to >= from) continue;

      used.add(from);
      used.add(to);
      // qo'shni kataklar ham band bo'lsin — boshlar bir-biriga yopishib qolmasin
      used.add(from + 1);
      used.add(from - 1);
      return [from, to];
    }
    return null;
  };

  for (const row of rowPool(0, spec.rows - 3, spec.ladders)) {
    const l = link(1, row);
    if (l) ladders[l[0]] = l[1];
  }
  for (const row of rowPool(2, spec.rows - 1, spec.snakes)) {
    const s = link(-1, row);
    if (s) snakes[s[0]] = s[1];
  }

  // Maxsus kataklar taxta bo'ylab teng tarqatiladi
  const specials = [];
  const total = spec.bonus + spec.traps;
  const band = Math.floor((size - 6) / total);
  for (let i = 0; i < total; i++) {
    const lo = 3 + i * band;
    for (let attempt = 0; attempt < 300; attempt++) {
      const cell = lo + Math.floor(rnd() * band);
      if (!free(cell)) continue;
      used.add(cell);
      specials.push(cell);
      break;
    }
  }
  // navbat bilan bonus va tuzoq — ikkalasi ham butun taxtaga tarqaladi
  const bonus = specials.filter((_, i) => i % 2 === 0).slice(0, spec.bonus).sort((a, b) => a - b);
  const traps = specials.filter((c) => !bonus.includes(c)).slice(0, spec.traps).sort((a, b) => a - b);

  return { ladders, snakes, bonus, traps };
}

const fmt = (obj) => {
  const entries = Object.entries(obj).sort((a, b) => Number(a[0]) - Number(b[0]));
  const lines = [];
  for (let i = 0; i < entries.length; i += 6) {
    lines.push('      ' + entries.slice(i, i + 6).map(([k, v]) => `${k}: ${v},`).join(' '));
  }
  return lines.join('\n');
};

for (const spec of SPECS) {
  const { ladders, snakes, bonus, traps } = generate(spec);
  const dist = Object.entries(ladders).map(([f, t]) => {
    const a = cellToGrid({ cols: spec.cols, rows: spec.rows }, Number(f));
    const b = cellToGrid({ cols: spec.cols, rows: spec.rows }, t);
    return Math.abs(a.row - b.row);
  });
  console.log(`\n// ${spec.id} — ${spec.cols}x${spec.rows} = ${spec.cols * spec.rows}, `
    + `${Object.keys(ladders).length} narvon, ${Object.keys(snakes).length} ilon, `
    + `sakrash ${Math.min(...dist)}-${Math.max(...dist)} qator`);
  console.log('    ladders: {');
  console.log(fmt(ladders));
  console.log('    },');
  console.log('    snakes: {');
  console.log(fmt(snakes));
  console.log('    },');
  console.log(`    bonus: [${bonus.join(', ')}],`);
  console.log(`    traps: [${traps.join(', ')}],`);
}

// --json bayrog'i bilan chaqirilsa, natijani maps.js ga yozish uchun JSON beradi
if (process.argv.includes('--json')) {
  const out = {};
  for (const spec of SPECS) out[spec.id] = generate(spec);
  process.stdout.write('\n@@JSON@@' + JSON.stringify(out));
}
