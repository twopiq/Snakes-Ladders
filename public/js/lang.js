/**
 * Til boshqaruvi: aniqlash, saqlash, sahifadagi matnlarni almashtirish.
 *
 * HTML dagi o'zgarmas matnlar `data-i18n="kalit"` atributi bilan belgilangan;
 * bu modul til almashganda ularning hammasini qayta yozadi. Dinamik ro'yxatlar
 * (do'kon, jurnal va h.k.) o'z render funksiyalarida t() ni ishlatadi.
 */

import { LANGS, LANG_CODES, DEFAULT_LANG, t, setLang, getLang, onLangChange, detectLang } from '../shared/i18n.js';
import { showModal, hideModal, $, $$ } from './ui.js';

const KEY = 'il_lang';

/** Saqlangan til (bo'lmasa null). */
function saved() {
  try {
    const code = localStorage.getItem(KEY);
    return LANG_CODES.includes(code) ? code : null;
  } catch {
    return null;
  }
}

function remember(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* xotira yopiq bo'lsa ham ishlayveradi */
  }
}

/**
 * Tilni tanlaydi: avval o'yinchi o'zi tanlagani, keyin Telegram profili,
 * keyin brauzer tili, oxirida o'zbekcha.
 */
export function initLang({ telegramLang = null } = {}) {
  const code = saved() || detectLang([telegramLang, ...(navigator.languages || [navigator.language || ''])]);
  setLang(code);
  applyStatic();
  onLangChange(() => applyStatic());
  return getLang();
}

/** HTML dagi barcha belgilangan matnlarni joriy tilga o'giradi. */
export function applyStatic(root = document) {
  for (const el of $$('[data-i18n]', root)) el.textContent = t(el.dataset.i18n);
  for (const el of $$('[data-i18n-ph]', root)) el.placeholder = t(el.dataset.i18nPh);
  for (const el of $$('[data-i18n-title]', root)) el.title = t(el.dataset.i18nTitle);
  for (const el of $$('[data-i18n-aria]', root)) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  document.documentElement.lang = getLang();
  const btn = $('#langBtn');
  if (btn) btn.textContent = (LANGS.find((l) => l.code === getLang()) || LANGS[0]).short;
}

/** Til tanlash oynasi. */
export function showLangPicker() {
  const now = getLang();
  showModal(`
    <h2>${t('top.lang')}</h2>
    <div class="lang-list">
      ${LANGS.map((l) => `
        <button class="lang-option ${l.code === now ? 'on' : ''}" type="button" data-act="lang:${l.code}">
          <b>${l.name}</b>
          <span>${l.short}</span>
        </button>`).join('')}
    </div>
    <div class="modal-actions"><button class="ghost" data-act="close">${t('common.cancel')}</button></div>`,
    (act) => {
      if (act.startsWith('lang:')) {
        const code = act.slice(5);
        remember(code);
        setLang(code);
      }
      hideModal();
    });
}

export { t, getLang, setLang, onLangChange, LANGS, LANG_CODES, DEFAULT_LANG };
