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

  const playButton = (text, startParam = '') => ({
    inline_keyboard: [[{
      text,
      web_app: { url: startParam ? `${webappUrl}/?room=${encodeURIComponent(startParam)}` : webappUrl },
    }]],
  });

  /** Do'kondagi narsa uchun to'lov havolasi (Telegram Stars). */
  async function createInvoice({ itemId, tgId }) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    if (item.price === 0) return { ok: false, error: 'Bu ko\'rinish bepul' };
    if (store.isDisabled(itemId)) return { ok: false, error: 'Bu ko\'rinish hozircha sotuvda emas' };
    if (store.owns(tgId, itemId)) return { ok: false, error: 'Bu sizda allaqachon bor' };

    const stars = store.price(itemId);
    const payload = `v1|${itemId}|${tgId}|${Date.now()}`;

    try {
      const link = await call('createInvoiceLink', {
        title: item.name.slice(0, 32),
        description: (item.about || item.name).slice(0, 255),
        payload,
        provider_token: '', // Stars uchun provider kerak emas
        currency: STARS,
        prices: [{ label: item.name.slice(0, 32), amount: stars }],
      });
      return { ok: true, link, stars };
    } catch (err) {
      console.error('invoice xatosi:', err.message);
      return { ok: false, error: 'To\'lov havolasini yasab bo\'lmadi' };
    }
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

      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `✅ <b>${item.name}</b> ochildi!\n\nO'yinni oching va "Do'kon" bo'limidan kiying.\n\n<i>Xarid raqami: <code>${sp.telegram_payment_charge_id}</code></i>`,
        reply_markup: playButton("🎮 O'yinni ochish"),
      }).catch(() => {});
      return;
    }

    const text = (msg.text || '').trim();

    if (text.startsWith('/start')) {
      const param = text.split(/\s+/)[1] || '';
      const code = /^[A-Z0-9]{4}$/i.test(param) ? param.toUpperCase() : '';
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          '🐍 <b>Ilonlar va Narvonlar</b>',
          '',
          "Klassik taxta o'yinining elektron ko'rinishi.",
          '',
          '• <b>Onlayn</b> — 2 kishi, real vaqtda',
          '• <b>Oflayn</b> — bitta telefonda 2-6 kishi',
          "• Do'konda fishka, narvon, ilon va taxta ko'rinishlari",
          '',
          code ? `🎟 Xona kodi: <code>${code}</code>` : "Pastdagi tugmani bosing va o'ynang!",
        ].join('\n'),
        reply_markup: playButton(code ? `🎮 ${code} xonasiga kirish` : "🎮 O'ynash", code),
      }).catch(() => {});
      return;
    }

    if (text.startsWith('/help') || text.startsWith('/qoida')) {
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          '<b>Qoidalar</b>',
          '',
          '• Navbat bilan zar tashlanadi.',
          '• 🪜 narvon yuqoriga, 🐍 ilon pastga tushiradi.',
          '• ★ bonus — qo\'shimcha zar, ✖ tuzoq — bir yurish yo\'q.',
          '• Finishga aniq tushish kerak.',
          '',
          '<b>Do\'kon</b>: ko\'rinishlar Telegram Stars (⭐) orqali olinadi.',
          'Muammo bo\'lsa /support yozing.',
        ].join('\n'),
        reply_markup: playButton("🎮 O'ynash"),
      }).catch(() => {});
      return;
    }

    if (text.startsWith('/support') || text.startsWith('/refund')) {
      await call('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          "Xarid bilan bog'liq muammo bormi?",
          '',
          "Xarid raqamingizni (<code>charge id</code>) shu yerga yuboring — tekshirib,",
          "kerak bo'lsa yulduzlarni qaytaramiz.",
        ].join('\n'),
      }).catch(() => {});
      return;
    }

    await call('sendMessage', {
      chat_id: chatId,
      text: "O'ynash uchun pastdagi tugmani bosing 👇",
      reply_markup: playButton("🎮 O'ynash"),
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
      ...(ok ? {} : { error_message: 'Bu ko\'rinish hozir sotuvda emas. Yulduzlaringiz saqlanib qoladi.' }),
    }).catch((err) => console.error('preCheckout:', err.message));
  }

  async function onInlineQuery(q) {
    await call('answerInlineQuery', {
      inline_query_id: q.id,
      cache_time: 5,
      results: [{
        type: 'article',
        id: 'play',
        title: "Ilonlar va Narvonlar — o'ynashga taklif",
        description: "Do'stingizni o'yinga chaqirish",
        input_message_content: {
          message_text: "🐍 <b>Ilonlar va Narvonlar</b>\nQani, kim tezroq marraga yetadi?",
          parse_mode: 'HTML',
        },
        reply_markup: playButton("🎮 O'ynash"),
      }],
    }).catch(() => {});
  }

  async function setup() {
    const me = await call('getMe');
    api.info = { id: me.id, username: me.username };
    console.log(`Telegram bot ulandi: @${me.username}`);
    if (webappUrl.startsWith('https://')) {
      await call('setChatMenuButton', {
        menu_button: { type: 'web_app', text: "O'ynash", web_app: { url: webappUrl } },
      }).catch(() => {});
    }
    await call('setMyCommands', {
      commands: [
        { command: 'start', description: "O'yinni boshlash" },
        { command: 'help', description: 'Qoidalar' },
        { command: 'support', description: "Xarid bo'yicha yordam" },
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

  const api = { start, stop: () => { running = false; }, createInvoice, refund, call, info: null };
  return api;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
