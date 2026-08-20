/**
 * Ko'rinish namunasi — do'kon, "Mening ko'rinishlarim" va mukofot kartochkalari
 * uchun kichik rasmchalar.
 *
 * O'yindagi chizuvchining o'zi ishlatiladi, shuning uchun namuna aynan o'yinda
 * ko'rinadigandek chiqadi. Faqat o'lchami aniq belgilangan (Board oyna
 * kengligiga moslashmaydi) va raqamlar chizilmaydi — hamma kartochkada bir xil,
 * ixcham va toza kvadrat chiqishi uchun.
 */

import { Board } from './board.js';
import { getItem, defaultEquipped } from '../shared/cosmetics.js';

/**
    * Namuna o'lchami hamma kartochkada bir xil — 98×98 px.
    * Fishka uchun to'r yirikroq (2×2), shunda dona kattaroq va aniq ko'rinadi;
    * narvon va ilon uchun 3×3 — ular bo'yiga cho'zilib turadi.
    */
const BOX = 98;
const GRID = {
  token: { cols: 2, rows: 2, cell: 45 },
  other: { cols: 3, rows: 3, cell: 30 },
};

const THEME = { light: '#f8fafc', dark: '#e8eef7', accent: '#94a3b8', grid: '#cbd5e1' };

/** Har bir bo'lim uchun eng yaxshi ko'rsatadigan sahna. */
function scene(slot) {
  switch (slot) {
    // Narvon markazda, pastdan tepaga
    case 'ladder': return { ladders: { 2: 8 }, snakes: {} };
    // Ilon tepadan pastga
    case 'snake': return { ladders: {}, snakes: { 8: 2 } };
    // Taxta mavzusida ikkalasi ham ko'rinsin — ranglar to'liq bilinadi
    case 'board': return { ladders: { 1: 7 }, snakes: { 9: 3 } };
    default: return { ladders: {}, snakes: {} };
  }
}

/** Fishka namunasida ikkita dona — rang va shakl yaqqol ko'rinadi. */
function tokens(slot) {
  if (slot !== 'token') return [];
  return [
    { id: 'a', name: 'A', hex: '#ef4444', pos: 1, finished: false },
    { id: 'b', name: 'B', hex: '#3b82f6', pos: 3, finished: false },
  ];
}

export function drawItemPreview(canvas, itemId) {
  const item = getItem(itemId);
  if (!item || !canvas) return;
  const slot = item.slot;

  const grid = slot === 'token' ? GRID.token : GRID.other;
  const map = {
    id: `preview-${slot}`,
    name: 'preview',
    cols: grid.cols,
    rows: grid.rows,
    ...scene(slot),
    bonus: [],
    traps: [],
    theme: THEME,
  };

  const pad = (BOX - grid.cell * grid.cols) / 2;
  const board = new Board(canvas, map, { cell: grid.cell, pad, labels: false, ends: false });
  board.setSkins({ ...defaultEquipped(), [slot]: itemId });
  board.setPlayers(tokens(slot));
}
