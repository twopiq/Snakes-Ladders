/**
 * Telegram bot va Stars to'lovlari — server ichida ishlaydi.
 *
 * Nega server ichida? Chunki to'lov tasdig'i (successful_payment) botga keladi,
 * sotib olingan narsani esa o'yin bazasiga yozish kerak. Ikkalasi bitta jarayonda
 * bo'lgani uchun hech narsa yo'qolmaydi. (getUpdates ni ikki joyda chaqirib
 * bo'lmaydi — Telegram 409 xatosi beradi.)
 *
 * BOT_TOKEN berilmasa bu modul umuman ishga tushmaydi va o'yin oddiy holda ishlayveradi.
 */

import { getItem } from '../public/shared/cosmetics.js';
import { setBotUsername } from './telegram.js';
import { t, itemText, detectLang } from '../public/shared/i18n.js';

const STARS = 'XTR';

export function createBot({ token, store, webappUrl = '' }) {
  // TELEGRAM_API_BASE — testlarda soxta API ga yo'naltirish uchun
  const BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
  const API = `${BASE}/bot${token}`;
  let running = false;

  async function call(method, body = {}) {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ ok: false, description: 'javob o\'qilmadi' }));
    if (!data.ok) throw new Error(`${method}: ${data.description}`);
    return data.result;
  }

  /** Telegram profilidagi til (bo'lmasa saqlangani, u ham bo'lmasa o'zbekcha). */
  const langOf = (from) => detectLang([from?.language_code, store.langOf?.(from?.id)]);

  const playButton = (text, startParam = '') => {
    // r<id> — taklif, aks holda xona kodi
    const query = !startParam ? ''
      : /^r\d{3,20}$/.test(startParam) ? `?ref=${encodeURIComponent(startParam)}`
      : `?room=${encodeURIComponent(startParam)}`;
    return { inline_keyboard: [[{ text, web_app: { url: `${webappUrl}/${query}` } }]] };
  };

  /** Do'kondagi narsa uchun to'lov havolasi (Telegram Stars). */
  async function createInvoice({ itemId, tgId, lang = null }) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    if (item.unlock) return { ok: false, error: `Bu ko'rinish faqat ${item.unlock.count} ta do'st chaqirib olinadi` };
    if (item.price === 0) return { ok: false, error: 'Bu ko\'rinish bepul' };
    if (store.isDisabled(itemId)) return { ok: false, error: 'Bu ko\'rinish hozircha sotuvda emas' };
    if (store.owns(tgId, itemId)) return { ok: false, error: 'Bu sizda allaqachon bor' };

    const stars = store.price(itemId);
    const payload = `v1|${itemId}|${tgId}|${Date.now()}`;
    const code = lang || store.langOf?.(tgId) || null;
    const title = itemText(item, 'name', code);
    const about = itemText(item, 'about', code) || title;

    try {
      const link = await call('createInvoiceLink', {
        title: title.slice(0, 32),
        description: about.slice(0, 255),
        payload,
        provider_token: '', // Stars uchun provider kerak emas
        currency: STARS,
        prices: [{ label: title.slice(0, 32), amount: stars }],
      });
      return { ok: true, link, stars };
    } catch (err) {
      console.error('invoice xatosi:', err.message);
      return { ok: false, error: 'To\'lov havolasini yasab bo\'lmadi' };
    }
  }

  /** O'yinchiga oddiy xabar yuborish (masalan mukofot haqida). */
  async function notify(tgId, html) {
    if (!tgId) return;
    const lang = store.langOf?.(tgId) || undefined;
    await call('sendMessage', {
      chat_id: Number(tgId),
      text: html,
      parse_mode: 'HTML',
      reply_markup: playButton(t('bot.open', null, lang)),
    });
  }

  /** Yulduzlarni qaytarish (admin panelidan). */
  async function refund({ tgId, chargeId }) {
    try {
      await call('refundStarPayment', { user_id: Number(tgId), telegram_payment_charge_id: chargeId });
      return store.markRefunded(chargeId);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------- yangilanishlar

  async function onMessage(msg) {
    const chatId = msg.chat?.id;
    if (!chatId) return;

    // To'lov muvaffaqiyatli — narsani beramiz
    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      const [, itemId, payloadUser] = String(sp.invoice_payload || '').split('|');
      const tgId = String(msg.from?.id || payloadUser);
      const item = getItem(itemId);

      if (!item) {
        console.error('noma\'lum to\'lov payload:', sp.invoice_payload);
        return;
      }
      if (store.findPurchase(sp.telegram_payment_charge_id)) return; // takroriy xabar

      store.recordPurchase({
        tgId,
        itemId,
        stars: sp.total_amount,
        chargeId: sp.telegram_payment_charge_id,
        name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' '),
      });

      const lang = langOf(msg.from);
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          t('bot.paid', { name: itemText(item, 'name', lang) }, lang),
          '',
          t('bot.paidHint', null, lang),
          '',
          t('bot.chargeId', { id: sp.telegram_payment_charge_id }, lang),
        ].join('\n'),
        reply_markup: playButton(t('bot.open', null, lang)),
      }).catch(() => {});
      return;
    }

    const text = (msg.text || '').trim();

    if (text.startsWith('/start')) {
      const param = text.split(/\s+/)[1] || '';
      const isRef = /^r\d{3,20}$/.test(param);
      const code = !isRef && /^[A-Z0-9]{4}$/i.test(param) ? param.toUpperCase() : '';

      // Taklifni shu yerdayoq biriktiramiz — Mini App ochilmasa ham yo'qolmasin.
      // (Mini App ochilganda ham qayta yuboriladi, lekin ikkinchi marta hisoblanmaydi.)
      const lang = langOf(msg.from);
      if (msg.from?.id) store.touch(String(msg.from.id), [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' '), lang);

      let refNote = '';
      if (isRef && msg.from?.id) {
        const res = store.attachReferral(String(msg.from.id), param.slice(1));
        refNote = res.ok ? t('bot.refOk', null, lang)
          : res.error === 'self' ? t('bot.refSelf', null, lang)
          : res.error === 'already' ? t('bot.refAlready', null, lang)
          : t('bot.refLate', null, lang);
      }

      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          `🐍 <b>${t('app.title', null, lang)}</b>`,
          '',
          t('bot.lead', null, lang),
          '',
          `• ${t('bot.online', null, lang)}`,
          `• ${t('bot.offline', null, lang)}`,
          `• ${t('bot.shop', null, lang)}`,
          '',
          code ? t('bot.roomCode', { code }, lang)
            : isRef ? refNote
            : t('bot.press', null, lang),
        ].join('\n'),
        reply_markup: playButton(
          code ? t('bot.joinRoom', { code }, lang) : t('bot.play', null, lang),
          code || param,
        ),
      }).catch(() => {});
      return;
    }

    if (text.startsWith('/help') || text.startsWith('/qoida')) {
      const lang = langOf(msg.from);
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          t('bot.rulesTitle', null, lang),
          '',
          `• ${t('bot.r1', null, lang)}`,
          `• ${t('bot.r2', null, lang)}`,
          `• ${t('bot.r3', null, lang)}`,
          `• ${t('bot.r4', null, lang)}`,
          '',
          t('bot.shopLine', null, lang),
          t('bot.supportLine', null, lang),
        ].join('\n'),
        reply_markup: playButton(t('bot.play', null, lang)),
      }).catch(() => {});
      return;
    }

    if (text.startsWith('/support') || text.startsWith('/refund')) {
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [t('bot.supportTitle', null, langOf(msg.from)), '', t('bot.supportText', null, langOf(msg.from))].join('\n'),
      }).catch(() => {});
      return;
    }

    const lang = langOf(msg.from);
    await call('sendMessage', {
      chat_id: chatId,
      text: t('bot.pressShort', null, lang),
      reply_markup: playButton(t('bot.play', null, lang)),
    }).catch(() => {});
  }

  /** To'lovdan oldingi tekshiruv — 10 soniya ichida javob berish shart. */
  async function onPreCheckout(q) {
    const [, itemId] = String(q.invoice_payload || '').split('|');
    const item = getItem(itemId);
    const ok = Boolean(item) && !store.isDisabled(itemId);
    await call('answerPreCheckoutQuery', {
      pre_checkout_query_id: q.id,
      ok,
      ...(ok ? {} : { error_message: t('bot.notForSale', null, langOf(q.from)) }),
    }).catch((err) => console.error('preCheckout:', err.message));
  }

  async function onInlineQuery(q) {
    const lang = langOf(q.from);
    await call('answerInlineQuery', {
      inline_query_id: q.id,
      cache_time: 5,
      results: [{
        type: 'article',
        id: 'play',
        title: t('bot.inviteTitle', null, lang),
        description: t('bot.inviteDesc', null, lang),
        input_message_content: {
          message_text: t('bot.inviteMsg', null, lang),
          parse_mode: 'HTML',
        },
        reply_markup: playButton(t('bot.play', null, lang)),
      }],
    }).catch(() => {});
  }

  async function setup() {
    const me = await call('getMe');
    api.info = { id: me.id, username: me.username };
    setBotUsername(me.username); // BOT_USERNAME yozilmagan bo'lsa ham havolalar ishlasin
    console.log(`Telegram bot ulandi: @${me.username}`);
    if (webappUrl.startsWith('https://')) {
      await call('setChatMenuButton', {
        menu_button: { type: 'web_app', text: t('bot.menuButton'), web_app: { url: webappUrl } },
      }).catch(() => {});
    }
    await call('setMyCommands', {
      commands: [
        { command: 'start', description: t('bot.cmdStart') },
        { command: 'help', description: t('bot.cmdHelp') },
        { command: 'support', description: t('bot.cmdSupport') },
      ],
    }).catch(() => {});
  }

  async function poll() {
    let offset = 0;
    while (running) {
      try {
        const res = await fetch(`${API}/getUpdates?timeout=45&offset=${offset}&allowed_updates=${
          encodeURIComponent(JSON.stringify(['message', 'pre_checkout_query', 'inline_query']))}`);
        const data = await res.json();
        if (!data.ok) {
          await sleep(3000);
          continue;
        }
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.pre_checkout_query) await onPreCheckout(update.pre_checkout_query);
          else if (update.message) await onMessage(update.message).catch(console.error);
          else if (update.inline_query) await onInlineQuery(update.inline_query);
        }
      } catch (err) {
        console.error('bot polling:', err.message);
        await sleep(3000);
      }
    }
  }

  async function start() {
    if (running) return;
    running = true;
    try {
      await setup();
    } catch (err) {
      console.error('bot sozlanmadi:', err.message);
    }
    poll();
  }

  const api = { start, stop: () => { running = false; }, createInvoice, refund, notify, call, info: null };
  return api;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
