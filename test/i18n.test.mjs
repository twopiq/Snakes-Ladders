/**
 * Uch tillilik: lug'at to'liqligi, o'rniga qo'yish va jurnal kalitlari.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { t, KEYS, LANGS, LANG_CODES, DEFAULT_LANG, setLang, getLang, detectLang, itemText, mapText } from '../public/shared/i18n.js';
import { COSMETICS, getItem } from '../public/shared/cosmetics.js';
import { MAPS } from '../public/shared/maps.js';
import { createGame, applyRoll, abandonPlayer } from '../public/shared/engine.js';

test('uchala til ham bor', () => {
  assert.deepEqual(LANG_CODES, ['uz', 'ru', 'en']);
  assert.equal(DEFAULT_LANG, 'uz');
  assert.ok(LANGS.every((l) => l.name && l.short));
});

// Ba'zi so'zlar tillarda bir xil yoziladi — ular ataylab tarjimasiz qoldirilgan
const SAME_OK = new Set(['game.chat']);

test("har bir kalit uchun uchala tarjima ham yozilgan", () => {
  const missing = [];
  for (const key of KEYS) {
    for (const lang of LANG_CODES) {
      const value = t(key, null, lang);
      // Tarjima yo'q bo'lsa t() o'zbekchasiga qaytadi — shuni ushlaymiz
      if (!value) missing.push(`${key}/${lang}`);
      else if (lang !== 'uz' && value === t(key, null, 'uz') && !SAME_OK.has(key) && !/^[\W\d]+$/.test(value)) {
        missing.push(`${key}/${lang}`);
      }
    }
  }
  assert.deepEqual(missing, [], `tarjima tushib qolgan: ${missing.join(', ')}`);
});

test("o'rniga qo'yiladigan qiymatlar ishlaydi", () => {
  assert.equal(t('game.turnOf', { name: 'Ali' }, 'uz'), 'Navbat: Ali');
  assert.equal(t('game.turnOf', { name: 'Ali' }, 'ru'), 'Ходит: Ali');
  assert.equal(t('game.turnOf', { name: 'Ali' }, 'en'), 'Turn: Ali');
  assert.match(t('ev.ladder', { name: 'Vali', from: 3, to: 22 }, 'en'), /Vali.*3.*22/);
});

test("noma'lum kalit ilovani buzmaydi", () => {
  assert.equal(t('yoq.bunday.kalit'), 'yoq.bunday.kalit');
});

test('til aniqlash va almashtirish', () => {
  assert.equal(detectLang(['ru-RU', 'en']), 'ru');
  assert.equal(detectLang([null, 'en-US']), 'en');
  assert.equal(detectLang(['de', 'fr']), 'uz', "noma'lum til o'zbekchaga tushadi");
  assert.equal(detectLang([]), 'uz');

  const before = getLang();
  setLang('en');
  assert.equal(t('common.menu'), 'Menu');
  setLang('ru');
  assert.equal(t('common.menu'), 'Меню');
  setLang('yoq');
  assert.equal(getLang(), 'uz', "noto'g'ri kod sukut tilga tushadi");
  setLang(before);
});

test("har bir ko'rinish va xarita uchala tilda nomlangan", () => {
  for (const item of COSMETICS) {
    for (const lang of LANG_CODES) {
      assert.ok(itemText(item, 'name', lang), `${item.id} nomi yo'q (${lang})`);
      assert.ok(itemText(item, 'about', lang), `${item.id} tavsifi yo'q (${lang})`);
    }
    // Ruscha nom o'zbekchadan farq qilsin (nusxa qolib ketmasin)
    assert.notEqual(itemText(item, 'name', 'ru'), itemText(item, 'name', 'uz'), `${item.id} ruschasi tarjima qilinmagan`);
  }
  for (const map of MAPS) {
    for (const lang of LANG_CODES) {
      assert.ok(mapText(map, 'name', lang), `${map.id} nomi yo'q (${lang})`);
      assert.ok(mapText(map, 'about', lang), `${map.id} tavsifi yo'q (${lang})`);
    }
  }
});

test("o'yin jurnali matn emas, kalit saqlaydi", () => {
  const state = createGame({
    mapId: 'klassik130',
    players: [{ id: 'a', name: 'Ali' }, { id: 'b', name: 'Vali' }],
  });
  assert.equal(state.log[0].key, 'log.start');
  assert.equal(state.log[0].params.mapId, 'klassik130');

  const { state: after } = applyRoll(state, 3);
  const { state: gone } = abandonPlayer(after, 'a');
  const all = [...after.log, ...gone.log];
  for (const entry of all) {
    assert.ok(entry.key, `jurnal yozuvida kalit yo'q: ${JSON.stringify(entry)}`);
    assert.ok(KEYS.includes(entry.key), `lug'atda yo'q kalit: ${entry.key}`);
    assert.equal(entry.text, undefined, 'tayyor matn saqlanmasligi kerak');
  }
  // Kalitlar uchala tilda ham matnga aylanadi
  for (const lang of LANG_CODES) {
    assert.ok(t(after.log[1].key, after.log[1].params, lang).includes('Ali'));
  }
});

test("HTML dagi barcha data-i18n kalitlari lug'atda bor", () => {
  const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-ph|-title|-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 40, `data-i18n kam: ${used.length}`);
  const unknown = [...new Set(used)].filter((k) => !KEYS.includes(k));
  assert.deepEqual(unknown, [], `lug'atda yo'q kalitlar: ${unknown.join(', ')}`);
});

test("kodda ishlatilgan t('...') kalitlari lug'atda bor", () => {
  const dir = path.resolve('public/js');
  const unknown = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-z][\w.-]+)'/g)) {
      if (!KEYS.includes(m[1])) unknown.add(`${file}:${m[1]}`);
    }
  }
  assert.deepEqual([...unknown], []);
});

test("server kodidagi t('...') kalitlari ham lug'atda bor", () => {
  const dir = path.resolve('server');
  const unknown = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-z][\w.-]+)'/g)) {
      if (!KEYS.includes(m[1])) unknown.add(`${file}:${m[1]}`);
    }
  }
  assert.deepEqual([...unknown], []);
});
