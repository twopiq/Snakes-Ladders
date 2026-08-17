/**
 * Kichik Telegram bot — Mini App uchun "kirish eshigi".
 *
 * Vazifasi:
 *   /start        → o'yinni ochadigan tugma yuboradi
 *   /start KOD    → to'g'ridan-to'g'ri o'sha xonaga kirish tugmasi
 *   /help         → qisqacha qoidalar
 *   inline rejim  → istalgan chatda "@bot" yozib o'yinga taklif yuborish
 *
 * Ishga tushirish:
 *   BOT_TOKEN=... WEBAPP_URL=https://sizning-sayt.onrender.com node bot/bot.js
 *
 * Eslatma: Mini App'ning o'zi bu botsiz ham ishlaydi (BotFather'dagi menyu
 * tugmasi orqali). Bot faqat qulaylik va taklif havolalari uchun.
 */

const TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL = (process.env.WEBAPP_URL || '').replace(/\/$/, '');
const API = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN) {
  console.error('BOT_TOKEN berilmagan. Misol: BOT_TOKEN=123:abc WEBAPP_URL=https://... node bot/bot.js');
  process.exit(1);
}
if (!WEBAPP_URL.startsWith('https://')) {
  console.error('WEBAPP_URL https:// bilan boshlanishi kerak (Telegram faqat HTTPS ni qabul qiladi).');
  process.exit(1);
}

const WELCOME = [
  '🐍 <b>Ilonlar va Narvonlar</b>',
  '',
  "Qo'lda chizilgan klassik taxta o'yinining elektron ko'rinishi.",
  '',
  '• <b>Onlayn</b> — 2 kishi, real vaqtda',
  "• <b>Oflayn</b> — bitta telefonda 2-6 kishi",
  '• 5 ta katta xarita, 120 dan 196 katakkacha',
  '',
  "Pastdagi tugmani bosing va o'ynang!",
].join('\n');

async function call(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.error(`${method} xatosi:`, data.description);
  return data;
}

const playButton = (text, startParam = '') => ({
  inline_keyboard: [[{
    text,
    web_app: { url: startParam ? `${WEBAPP_URL}/?room=${encodeURIComponent(startParam)}` : WEBAPP_URL },
  }]],
});

async function onMessage(msg) {
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();
  if (!chatId) return;

  if (text.startsWith('/start')) {
    const param = text.split(/\s+/)[1] || '';
    const code = /^[A-Z0-9]{4}$/i.test(param) ? param.toUpperCase() : '';
    await call('sendMessage', {
      chat_id: chatId,
      text: code ? `${WELCOME}\n\n🎟 Xona kodi: <code>${code}</code>` : WELCOME,
      parse_mode: 'HTML',
      reply_markup: playButton(code ? `🎮 ${code} xonasiga kirish` : "🎮 O'ynash", code),
    });
    return;
  }

  if (text.startsWith('/help') || text.startsWith('/qoida')) {
    await call('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: [
        '<b>Qoidalar</b>',
        '',
        '• Navbat bilan zar tashlanadi va dona shuncha katak oldinga suriladi.',
        '• 🪜 narvon yuqoriga ko\'taradi, 🐍 ilon pastga tushiradi.',
        '• ★ bonus katak — qo\'shimcha zar, ✖ tuzoq katak — bir yurish yo\'q.',
        '• 6 tashlagan yana tashlaydi, ketma-ket 3 ta 6 — yurish bekor.',
        '• Finishga aniq tushish kerak.',
        '',
        'Onlayn o\'ynash uchun xona kodini do\'stingizga yuboring.',
      ].join('\n'),
      reply_markup: playButton("🎮 O'ynash"),
    });
    return;
  }

  await call('sendMessage', {
    chat_id: chatId,
    text: "O'ynash uchun pastdagi tugmani bosing 👇",
    reply_markup: playButton("🎮 O'ynash"),
  });
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
  });
}

async function setup() {
  const me = await call('getMe', {});
  if (me.ok) console.log(`Bot ishga tushdi: @${me.result.username}`);

  // Chat oynasidagi menyu tugmasi ham Mini App'ni ochsin
  await call('setChatMenuButton', {
    menu_button: { type: 'web_app', text: "O'ynash", web_app: { url: WEBAPP_URL } },
  });
  await call('setMyCommands', {
    commands: [
      { command: 'start', description: "O'yinni boshlash" },
      { command: 'help', description: 'Qoidalar' },
    ],
  });
}

/** Uzun so'rov (long polling) — webhook sozlash shart emas. */
async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const res = await fetch(`${API}/getUpdates?timeout=50&offset=${offset}`);
      const data = await res.json();
      if (!data.ok) {
        await sleep(3000);
        continue;
      }
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) await onMessage(update.message).catch(console.error);
        else if (update.inline_query) await onInlineQuery(update.inline_query).catch(console.error);
      }
    } catch (err) {
      console.error('polling xatosi:', err.message);
      await sleep(3000);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await setup();
await poll();
