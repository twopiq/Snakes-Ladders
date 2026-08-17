import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, validateMap, mapSize, cellToGrid } from '../public/shared/maps.js';

test('barcha xaritalar yaroqli', () => {
  const errors = MAPS.flatMap(validateMap);
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('xarita id lari noyob va taxta kattaligi 120+', () => {
  const ids = new Set(MAPS.map((m) => m.id));
  assert.equal(ids.size, MAPS.length);
  for (const m of MAPS) assert.ok(mapSize(m) >= 120, `${m.id} kichik`);
});

test('cellToGrid ilon izi tartibida ishlaydi', () => {
  const m = MAPS[0];
  const seen = new Set();
  for (let c = 1; c <= mapSize(m); c++) {
    const { col, row } = cellToGrid(m, c);
    assert.ok(col >= 0 && col < m.cols && row >= 0 && row < m.rows);
    seen.add(`${col},${row}`);
  }
  assert.equal(seen.size, mapSize(m));
  assert.deepEqual(cellToGrid(m, 1), { col: 0, row: m.rows - 1 });
  assert.deepEqual(cellToGrid(m, m.cols), { col: m.cols - 1, row: m.rows - 1 });
  assert.deepEqual(cellToGrid(m, m.cols + 1), { col: m.cols - 1, row: m.rows - 2 });
});
