/**
 * Telegram Mini App integratsiyasi.
 *
 * Ilova ikki joyda ishlaydi:
 *   - oddiy brauzerda (sayt sifatida) — bu modul deyarli hech nima qilmaydi;
 *   - Telegram ichida — sarlavha rangi, orqaga tugmasi, pastdagi asosiy tugma,
 *     tebranish (haptika), foydalanuvchi ismi va taklif havolasi ishlaydi.
 *
 * Telegram SDK yuklanmasa ham ilova buzilmaydi — har bir chaqiruv tekshiriladi.
 */

let api = null;
let backHandler = null;
let mainButtonHandler = null;
let config = { enabled: false, botUsername: '', appShortName: '', inviteBase: '' };

/** SDK har doim ham modul yuklanishidan oldin tayyor bo'lmaydi — kerak bo'lganda olamiz. */
function sdk() {
  if (!api) api = window.Telegram?.WebApp || null;
  return api;
}

/** Haqiqatan Telegram ichidamizmi? (SDK saytda ham yuklanadi, lekin u yerda platform = unknown) */
export function isTelegram() {
  const a = sdk();
  return Boolean(a && a.platform && a.platform !== 'unknown');
}

/** Serverdagi Telegram sozlamalarini olib keladi (bot nomi, taklif havolasi asosi). */
export async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    config = { ...config, ...(data.telegram || {}) };
  } catch {
    /* sozlama bo'lmasa ham ishlayveradi */
  }
  return config;
}

export const tgConfig = () => config;

/** Telegram ichida boshlang'ich sozlash. */
export function initTelegram({ onBack } = {}) {
  if (!isTelegram()) return false;
  const a = sdk();
  backHandler = onBack || null;

  a.ready();
  a.expand();

  document.body.classList.add('tg');
  document.body.dataset.tgPlatform = a.platform;

  safe(() => a.setHeaderColor('#0b1220'));
  safe(() => a.setBackgroundColor('#0b1220'));
  safe(() => a.disableVerticalSwipes()); // o'yin paytida sahifa tortilib ketmasin

  safe(() => a.BackButton.onClick(() => backHandler?.()));
  safe(() => a.MainButton.onClick(() => mainButtonHandler?.()));

  const applyViewport = () => {
    const h = a.viewportStableHeight || window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
    window.dispatchEvent(new Event('resize'));
  };
  safe(() => a.onEvent('viewportChanged', applyViewport));
  applyViewport();

  return true;
}

/** Telegram foydalanuvchisining ismi (bo'lmasa null). */
export function tgUserName() {
  const u = sdk()?.initDataUnsafe?.user;
  if (!u) return null;
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username || null;
}

/** Serverga yuboriladigan imzolangan satr — server uni bot token bilan tekshiradi. */
export function initData() {
  return sdk()?.initData || '';
}

/** Havoladan kelgan xona kodi: t.me/bot/app?startapp=KOD (yoki saytda ?room=KOD). */
export function startParam() {
  const fromTg = sdk()?.initDataUnsafe?.start_param;
  if (fromTg) return String(fromTg).toUpperCase().slice(0, 8);
  const url = new URLSearchParams(location.search);
  const code = url.get('room') || url.get('tgWebAppStartParam');
  return code ? code.toUpperCase().slice(0, 8) : null;
}

/** Xona uchun ulashsa bo'ladigan havola. */
export function inviteLink(code) {
  if (config.inviteBase) return `${config.inviteBase}${code}`;
  return `${location.origin}/?room=${code}`;
}

/** Do'stni chaqirish: Telegram'da ulashish oynasi, saytda — tizim ulashuvi yoki nusxalash. */
export function shareRoom(code, text = "Ilonlar va Narvonlar o'ynaymizmi?") {
  const link = inviteLink(code);
  if (isTelegram()) {
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    safe(() => sdk().openTelegramLink(url));
    return 'telegram';
  }
  if (navigator.share) {
    navigator.share({ title: 'Ilonlar va Narvonlar', text, url: link }).catch(() => {});
    return 'share';
  }
  navigator.clipboard?.writeText(link);
  return 'clipboard';
}

// ---------------------------------------------------------------- tugmalar

export function showBackButton(show) {
  if (!isTelegram()) return;
  safe(() => (show ? sdk().BackButton.show() : sdk().BackButton.hide()));
}

/**
 * Telefonda eng qulay joy — Telegram'ning pastki asosiy tugmasi.
 * O'yin ekranida zar tashlash uchun ishlatiladi.
 */
export function setMainButton({ show, text, enabled, onClick }) {
  if (!isTelegram()) return;
  if (onClick) mainButtonHandler = onClick;
  const btn = sdk().MainButton;
  safe(() => {
    if (!show) {
      btn.hide();
      return;
    }
    btn.setText(text);
    if (enabled) {
      btn.enable();
      btn.setParams({ color: '#0ea5e9', text_color: '#04263a' });
    } else {
      btn.disable();
      btn.setParams({ color: '#334155', text_color: '#94a3b8' });
    }
    btn.show();
  });
}

/** O'yin davom etayotganda tasodifan yopib yubormaslik uchun. */
export function setClosingConfirmation(on) {
  if (!isTelegram()) return;
  safe(() => (on ? sdk().enableClosingConfirmation() : sdk().disableClosingConfirmation()));
}

/**
 * Stars to'lovi oynasini ochadi.
 * Qaytadi: 'paid' | 'cancelled' | 'failed' | 'pending' | 'unsupported'
 */
export function openInvoice(link) {
  return new Promise((resolve) => {
    const a = sdk();
    if (!isTelegram() || typeof a?.openInvoice !== 'function') return resolve('unsupported');
    try {
      a.openInvoice(link, (status) => resolve(status));
    } catch {
      resolve('failed');
    }
  });
}

/** Telegram ilovasining versiyasi kerakli darajadami? */
export function supportsVersion(v) {
  const a = sdk();
  try {
    return Boolean(a?.isVersionAtLeast?.(v));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- haptika

const IMPACT = { light: 'light', medium: 'medium', heavy: 'heavy', rigid: 'rigid', soft: 'soft' };

export function haptic(kind = 'light') {
  if (!isTelegram()) return;
  safe(() => {
    const h = sdk().HapticFeedback;
    if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind);
    else if (kind === 'select') h.selectionChanged();
    else h.impactOccurred(IMPACT[kind] || 'light');
  });
}

function safe(fn) {
  try {
    fn();
  } catch {
    /* eski Telegram versiyalarida ba'zi metodlar yo'q */
  }
}
