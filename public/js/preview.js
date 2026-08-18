/**
 * Ko'rinish namunasi — do'kon va "Do'stlar" ekranidagi kichik rasmchalar.
 * O'yindagi chizuvchining o'zi ishlatiladi, shuning uchun namuna aynan
 * o'yinda ko'rinadigandek chiqadi.
 */

import { Board } from './board.js';
import { getItem, defaultEquipped } from '../shared/cosmetics.js';

export function drawItemPreview(canvas, itemId) {
  const item = getItem(itemId);
  if (!item || !canvas) return;
  const slot = item.slot;

  const theme = { light: '#f8fafc', dark: '#e2e8f0', accent: '#94a3b8', grid: '#cbd5e1' };
  const map = {
    id: 'preview', name: 'preview',
    cols: slot === 'token' ? 2 : 3,
    rows: slot === 'token' ? 2 : 3,
    ladders: slot === 'ladder' || slot === 'board' ? { 2: 8 } : {},
    snakes: slot === 'snake' ? { 8: 2 } : {},
    bonus: [], traps: [], theme,
  };

  const board = new Board(canvas, map);
  board.showLabels = slot === 'board'; // taxta mavzusida raqam ham ko'rinsin
  board.setSkins({ ...defaultEquipped(), [slot]: itemId });
  board.setPlayers(slot === 'token'
    ? [{ id: 'p', name: 'A', hex: '#ef4444', pos: 1, finished: false },
       { id: 'q', name: 'B', hex: '#3b82f6', pos: 4, finished: false }]
    : []);
}
