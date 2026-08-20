/**
 * Yuqoridagi menyu.
 *
 * Avval barcha tugmalar (do'stlar, ko'rinishlar, do'kon, ovoz, til, qoidalar)
 * sarlavha yonida qator bo'lib turardi — tor telefonda ular sig'may, sahifa
 * yon tomonga surilib ketardi. Endi ular bitta "☰" tugmasi ostidagi ro'yxatda.
 *
 * Menyu o'ng yoki chap tomonda turishi mumkin — tanlov eslab qolinadi
 * (chap qo'l bilan ushlaydiganlar uchun ham qulay bo'lsin).
 */

import { $, $$ } from './ui.js';
import { t, onLangChange } from '../shared/i18n.js';

const SIDE_KEY = 'il_menu_side';
const SIDES = ['right', 'left'];

let open = false;

/** Saqlangan tomon (sukut bo'yicha — o'ngda). */
export function menuSide() {
  try {
    const value = localStorage.getItem(SIDE_KEY);
    return SIDES.includes(value) ? value : 'right';
  } catch {
    return 'right';
  }
}

/** Menyu tomonini o'zgartiradi. */
export function setMenuSide(side) {
  const next = SIDES.includes(side) ? side : 'right';
  try {
    localStorage.setItem(SIDE_KEY, next);
  } catch {
    /* xotira yopiq bo'lsa ham ishlayveradi */
  }
  applySide(next);
  return next;
}

function applySide(side) {
  document.body.dataset.menuSide = side;
  for (const btn of $$('.side-toggle [data-side]')) {
    btn.classList.toggle('on', btn.dataset.side === side);
    btn.setAttribute('aria-pressed', String(btn.dataset.side === side));
  }
}

export function closeMenu() {
  if (!open) return;
  open = false;
  $('#appMenu')?.classList.add('hidden');
  $('#menuBtn')?.setAttribute('aria-expanded', 'false');
}

export function toggleMenu(force = null) {
  const panel = $('#appMenu');
  if (!panel) return;
  open = force === null ? !open : force;
  panel.classList.toggle('hidden', !open);
  $('#menuBtn')?.setAttribute('aria-expanded', String(open));
}

/** Ovoz holatini menyuda ko'rsatadi. */
export function setSoundState(on) {
  const item = $('#soundBtn');
  if (!item) return;
  item.classList.toggle('off', !on);
  const icon = item.querySelector('.mi-icon');
  const state = item.querySelector('.mi-state');
  if (icon) icon.textContent = on ? '🔊' : '🔇';
  if (state) state.textContent = t(on ? 'sound.on' : 'sound.off');
}

/** Menyudagi til yozuvini yangilaydi. */
export function setLangState(short) {
  const state = $('#langBtn .mi-state');
  if (state) state.textContent = short;
}

/**
 * Menyuni ishga tushiradi.
 * Har bir bandning o'z bosilish hodisasi app.js da biriktirilgan — bu yerda
 * faqat ochish/yopish va tomonni tanlash bor.
 */
export function initMenu() {
  applySide(menuSide());

  $('#menuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Band bosilsa menyu yopiladi (ovoz va tomon tugmalaridan tashqari)
  for (const item of $$('.app-menu-item')) {
    if (item.id === 'soundBtn') continue;
    item.addEventListener('click', () => closeMenu());
  }

  for (const btn of $$('.side-toggle [data-side]')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuSide(btn.dataset.side);
    });
  }

  // Tashqariga bosilsa yoki Escape bosilsa yopiladi
  document.addEventListener('click', (e) => {
    if (!open) return;
    if (e.target.closest('#appMenu') || e.target.closest('#menuBtn')) return;
    closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  onLangChange(() => {
    const item = $('#soundBtn');
    if (item) setSoundState(!item.classList.contains('off'));
  });
}
