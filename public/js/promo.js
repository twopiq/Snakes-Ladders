/**
 * Sayt versiyasidan Telegram ilovasiga yo'naltirish.
 *
 * Sabab: ko'rinishlar Telegram Stars orqali sotiladi, ya'ni xarid faqat
 * Telegram ichida ishlaydi. Shuning uchun saytdagi o'yinchiga uch joyda
 * (menyu, do'kon, o'yin natijasi) Telegram'da ochish taklif qilinadi.
 *
 * Qoidalar:
 *   - Telegram ichida bo'lsak — hech narsa ko'rsatilmaydi;
 *   - bot sozlanmagan bo'lsa (BOT_USERNAME yo'q) — ham ko'rsatilmaydi;
 *   - menyudagi bannerni yopib qo'yish mumkin (7 kun ko'rinmaydi).
 */

import { isTelegram, tgConfig } from './telegram.js';

const HIDE_KEY = 'il_promo_hidden_until';
const HIDE_DAYS = 7;

/**
 * Mini App havolasi.
 *
 * Parametrli havola serverdagi "inviteBase" dan yasaladi: Mini App short name
 * bo'lsa `?startapp=`, bo'lmasa `?start=` (oddiy bot havolasi — u har doim
 * ishlaydi, bot javobida o'yinni ochadigan tugma bo'ladi).
 */
export function telegramAppLink(startParam = '') {
  const { botUsername, appShortName, inviteBase } = tgConfig();
  if (!botUsername) return null;
  const plain = appShortName
    ? `https://t.me/${botUsername}/${appShortName}`
    : `https://t.me/${botUsername}`;
  if (!startParam) return plain;
  return inviteBase
    ? `${inviteBase}${encodeURIComponent(startParam)}`
    : `${plain}?start=${encodeURIComponent(startParam)}`;
}

/** Yo'naltirishni ko'rsatish mumkinmi? */
export function canPromote() {
  return !isTelegram() && Boolean(telegramAppLink());
}

/** Telegram ilovasini yangi oynada ochadi. */
export function openTelegramApp(startParam = '') {
  const link = telegramAppLink(startParam);
  if (!link) return false;
  window.open(link, '_blank', 'noopener');
  return true;
}

function bannerHidden() {
  const until = Number(localStorage.getItem(HIDE_KEY) || 0);
  return Date.now() < until;
}

/** Menyudagi banner. */
export function renderMenuPromo(root) {
  if (!root) return;
  if (!canPromote() || bannerHidden()) {
    root.innerHTML = '';
    root.classList.add('hidden');
    return;
  }

  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="promo">
      <span class="promo-emoji">🎁</span>
      <div class="promo-text">
        <b>Telegram'da ko'proq imkoniyat</b>
        <small>Ko'rinishlar do'koni (fishka, narvon, ilon, taxta), do'stni bir bosishda
        chaqirish va ismingiz avtomatik — hammasi Telegram ilovasida.</small>
      </div>
      <button class="primary" type="button" data-promo="open">Telegram'da ochish</button>
      <button class="promo-close" type="button" data-promo="close" title="Yopish" aria-label="Yopish">×</button>
    </div>`;

  root.querySelector('[data-promo="close"]').addEventListener('click', () => {
    localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 24 * 3600 * 1000));
    renderMenuPromo(root);
  });
  root.querySelector('[data-promo="open"]').addEventListener('click', () => openTelegramApp());
}

/** O'yin tugagach natijalar oynasiga qo'shiladigan taklif. */
export function promoModalHtml() {
  if (!canPromote()) return '';
  return `
    <div class="promo inline">
      <span class="promo-emoji">⭐</span>
      <div class="promo-text">
        <b>Fishkangizni almashtirasizmi?</b>
        <small>Toj, olmos, ajdaho, oltin narvon va boshqa ko'rinishlar Telegram ilovasida.</small>
      </div>
      <button class="ghost" type="button" data-act="telegram">Ochish</button>
    </div>`;
}

/** Do'kondagi pullik kartochka uchun tugma matni. */
export const LOCK_LABEL = "Telegram'da ochish";
