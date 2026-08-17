/**
 * Xaritalar to'plami.
 *
 * Har bir xarita:
 *   id          - noyob identifikator
 *   name        - ekranda ko'rinadigan nom
 *   about       - qisqacha tavsif
 *   cols, rows  - kataklar to'ri (1-katak pastki chap burchakda, ilon izi tartibida)
 *   ladders     - { qaerdan: qayerga }  (yuqoriga ko'taruvchi narvonlar)
 *   snakes      - { qaerdan: qayerga }  (pastga tushiruvchi ilonlar)
 *   bonus       - qayta tashlash huquqini beruvchi kataklar
 *   traps       - bir yurishni o'tkazib yuboruvchi kataklar
 *   theme       - taxta ranglari
 *
 * Barcha xaritalar `validateMap()` orqali tekshiriladi (test/maps.test.mjs).
 */

export const MAPS = [
  {
    id: 'klassik130',
    name: 'Klassik 130',
    about: "Qo'lda chizilgan asl taxta uslubida: 10 × 13 katak, muvozanatli ilon va narvonlar.",
    cols: 10,
    rows: 13,
    ladders: {
      12: 32, 21: 59, 26: 47, 28: 67, 40: 60, 42: 80,
      46: 66, 51: 90, 53: 73, 75: 95, 82: 123, 84: 104,
      87: 127, 92: 128,
    },
    snakes: {
      31: 10, 37: 17, 48: 9, 57: 35, 65: 44, 70: 49,
      72: 34, 94: 55, 98: 77, 102: 62, 110: 89, 121: 100,
      125: 107,
    },
    bonus: [6, 61, 96],
    traps: [24, 79, 108],
    theme: { light: '#f8fafc', dark: '#e2e8f0', accent: '#0ea5e9', grid: '#94a3b8' },
  },
  {
    id: 'zumrad144',
    name: 'Zumrad vodiysi 144',
    about: "12 × 12 katak. Narvonlar ko'p, ilonlar qisqa — hujumkor o'yin uchun.",
    cols: 12,
    rows: 12,
    ladders: {
      2: 26, 4: 43, 21: 46, 29: 54, 32: 55, 38: 82,
      40: 62, 51: 96, 66: 101, 68: 115, 77: 124, 87: 109,
      90: 140, 93: 141, 98: 123, 118: 143,
    },
    snakes: {
      36: 12, 44: 7, 57: 15, 72: 25, 74: 48, 81: 42,
      84: 34, 104: 79, 107: 83, 137: 113, 139: 114,
    },
    bonus: [16, 49, 95, 134],
    traps: [27, 60, 120],
    theme: { light: '#f2fbf5', dark: '#d9f2e3', accent: '#10b981', grid: '#7bbf9b' },
  },
  {
    id: 'olov180',
    name: 'Olov cho\'qqisi 180',
    about: "12 × 15 katak — uzun va shafqatsiz yo'l. Yuqorida ilonlar poylab turadi.",
    cols: 12,
    rows: 15,
    ladders: {
      15: 41, 21: 69, 24: 70, 36: 62, 51: 95, 57: 82,
      67: 104, 74: 117, 79: 113, 98: 124, 102: 127, 108: 155,
      111: 134, 121: 167, 129: 154, 131: 179,
    },
    snakes: {
      33: 8, 38: 9, 59: 13, 63: 40, 65: 43, 77: 55,
      88: 42, 94: 71, 106: 81, 119: 96, 133: 85, 137: 89,
      139: 93, 148: 116, 166: 125, 169: 145, 176: 152,
    },
    bonus: [4, 45, 83, 135, 162],
    traps: [28, 61, 115, 146],
    theme: { light: '#fff7ed', dark: '#fee3c8', accent: '#f97316', grid: '#d9a273' },
  },
  {
    id: 'koinot196',
    name: 'Koinot 196',
    about: "14 × 14 — eng katta taxta. Uzoq safar, katta sakrashlar va chuqur tushishlar.",
    cols: 14,
    rows: 14,
    ladders: {
      7: 36, 10: 37, 24: 52, 31: 59, 54: 81, 63: 119,
      65: 92, 68: 100, 98: 126, 102: 150, 104: 131, 108: 136,
      117: 162, 124: 152, 134: 188, 142: 193, 146: 189,
    },
    snakes: {
      56: 28, 61: 5, 70: 14, 74: 47, 77: 20, 80: 33,
      106: 78, 113: 86, 115: 58, 137: 88, 148: 120, 153: 96,
      165: 139, 167: 138, 171: 144, 179: 151, 184: 158,
    },
    bonus: [19, 45, 90, 129, 190],
    traps: [35, 85, 128, 156],
    theme: { light: '#f5f3ff', dark: '#e4dcff', accent: '#8b5cf6', grid: '#a596d6' },
  },
  {
    id: 'tezkor120',
    name: 'Tezkor 120',
    about: "10 × 12 katak. Uzun narvonlar, kam ilon — qisqa va shiddatli o'yin.",
    cols: 10,
    rows: 12,
    ladders: {
      4: 23, 11: 50, 18: 39, 26: 46, 28: 69, 36: 64,
      44: 85, 54: 86, 59: 81, 65: 94, 67: 108, 72: 111,
      75: 115, 83: 116, 91: 113,
    },
    snakes: {
      42: 22, 49: 9, 51: 30, 70: 31, 78: 57, 80: 40,
      99: 61, 119: 77,
    },
    bonus: [6, 38, 97],
    traps: [34, 62, 110],
    theme: { light: '#fdf2f8', dark: '#fbd9ea', accent: '#ec4899', grid: '#d18cae' },
  },
];

/** Xaritani id bo'yicha topadi (topilmasa birinchisini qaytaradi). */
export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

/** Xaritadagi kataklar soni. */
export function mapSize(map) {
  return map.cols * map.rows;
}

/**
 * Katak raqamini (1..size) to'r koordinatasiga aylantiradi.
 * 1-katak pastki chapda, keyingi qatorlar ilon izi (boustrophedon) bo'ylab yuradi.
 * Qaytadi: { col, row } — row 0 = eng yuqori qator (chizish uchun qulay).
 */
export function cellToGrid(map, cell) {
  const index = cell - 1;
  const rowFromBottom = Math.floor(index / map.cols);
  const posInRow = index % map.cols;
  const col = rowFromBottom % 2 === 0 ? posInRow : map.cols - 1 - posInRow;
  return { col, row: map.rows - 1 - rowFromBottom };
}

/**
 * cellToGrid ning teskarisi: ustun va pastdan hisoblangan qator → katak raqami.
 */
export function gridToCell(map, col, rowFromBottom) {
  const posInRow = rowFromBottom % 2 === 0 ? col : map.cols - 1 - col;
  return rowFromBottom * map.cols + posInRow + 1;
}

/**
 * Xarita ma'lumotlarini tekshiradi. Xatolar ro'yxatini qaytaradi (bo'sh = soz).
 */
export function validateMap(map) {
  const errors = [];
  const size = mapSize(map);
  const used = new Map();

  const claim = (cell, what) => {
    if (!Number.isInteger(cell) || cell < 1 || cell > size) {
      errors.push(`${map.id}: ${what} — ${cell} katak chegaradan tashqarida (1..${size})`);
      return;
    }
    if (cell === 1) errors.push(`${map.id}: ${what} — START katagida bo'lishi mumkin emas`);
    if (cell === size) errors.push(`${map.id}: ${what} — FINISH katagida bo'lishi mumkin emas`);
    if (used.has(cell)) {
      errors.push(`${map.id}: ${cell} katak ikki marta ishlatilgan (${used.get(cell)} va ${what})`);
    } else {
      used.set(cell, what);
    }
  };

  for (const [from, to] of Object.entries(map.ladders)) {
    claim(Number(from), 'narvon boshi');
    claim(to, 'narvon uchi');
    if (Number(from) >= to) errors.push(`${map.id}: narvon ${from}→${to} yuqoriga ko'tarmaydi`);
  }
  for (const [from, to] of Object.entries(map.snakes)) {
    claim(Number(from), 'ilon boshi');
    claim(to, 'ilon dumi');
    if (Number(from) <= to) errors.push(`${map.id}: ilon ${from}→${to} pastga tushirmaydi`);
  }
  for (const cell of map.bonus || []) claim(cell, 'bonus katak');
  for (const cell of map.traps || []) claim(cell, 'tuzoq katak');

  if (size < 100) errors.push(`${map.id}: taxta juda kichik (${size})`);
  return errors;
}
