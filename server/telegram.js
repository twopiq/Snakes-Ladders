/**
 * Telegram Mini App bilan bog'liq server tomoni.
 *
 * Telegram mijozga `initData` satrini beradi — unda foydalanuvchi ma'lumoti va
 * bot token bilan hisoblangan `hash` bo'ladi. Shu hashni qayta hisoblab
 * tekshiramiz: ya'ni "men falonchiman" degan da'voni bot tokenisiz yasab bo'lmaydi.
 *
 * Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import crypto from 'node:crypto';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BOT_USERNAME = (process.env.BOT_USERNAME || '').replace(/^@/, '');
const APP_SHORT_NAME = process.env.APP_SHORT_NAME || '';
const MAX_AGE_SEC = 24 * 60 * 60;

export const telegramEnabled = Boolean(BOT_TOKEN);

/** Bot tokeni (faqat server ichida ishlatiladi). */
export const botToken = () => BOT_TOKEN;

/** Mijozga beriladigan sozlama (maxfiy token bu yerda yo'q). */
export function telegramConfig() {
  return {
    enabled: telegramEnabled,
    botUsername: BOT_USERNAME,
    appShortName: APP_SHORT_NAME,
    // Xona havolasi shu ko'rinishda yasaladi: .../<code>
    inviteBase: BOT_USERNAME
      ? `https://t.me/${BOT_USERNAME}${APP_SHORT_NAME ? `/${APP_SHORT_NAME}` : ''}?startapp=`
      : '',
  };
}

/**
 * initData ni tekshiradi.
 * Qaytadi: { ok, user, reason }
 */
export function verifyInitData(initData, { botToken = BOT_TOKEN, maxAgeSec = MAX_AGE_SEC } = {}) {
  if (!botToken) return { ok: false, reason: 'bot-token-yoq' };
  if (typeof initData !== 'string' || !initData) return { ok: false, reason: 'bosh' };

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: 'format' };
  }

  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, reason: 'hash-yoq' };

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash.toLowerCase(), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'hash-mos-emas' };

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: 'muddati-otgan' };
  }

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'user-format' };
  }
  if (!user?.id) return { ok: false, reason: 'user-yoq' };

  return {
    ok: true,
    user: {
      id: String(user.id),
      name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Telegram',
      username: user.username || null,
      photo: user.photo_url || null,
    },
  };
}

/**
 * Onlayn xonaga kirayotgan o'yinchining kimligini aniqlaydi.
 * Telegram ichidan kelsa — ism Telegram'dan olinadi (o'zgartirib bo'lmaydi).
 * Oddiy brauzerdan kelsa — o'zi kiritgan ism ishlatiladi.
 */
export function resolveIdentity({ initData, name }) {
  if (initData && telegramEnabled) {
    const res = verifyInitData(initData);
    if (res.ok) return { name: res.user.name, tgId: res.user.id, verified: true };
    return { name: null, tgId: null, verified: false, error: res.reason };
  }
  return { name: name || null, tgId: null, verified: false };
}
