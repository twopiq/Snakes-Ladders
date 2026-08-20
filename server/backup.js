/**
 * Ma'lumotni Telegram'ning o'ziga zaxiralash.
 *
 * NEGA KERAK: Render'ning bepul tarifida disk vaqtinchalik — xizmat har qayta
 * ishga tushganda fayllar tozalanadi va xaridlar, do'st hisobi hammasi
 * yo'qoladi. Doimiy disk esa faqat pullik tarifda beriladi.
 *
 * QANDAY ISHLAYDI: bot store.json faylini belgilangan chatga hujjat qilib
 * yuboradi va o'sha xabarni "pin" qiladi. Server ishga tushganda bazasi bo'sh
 * bo'lsa, o'sha pin qilingan xabardan faylni qaytarib oladi. Ya'ni hech qanday
 * qo'shimcha xizmat, ro'yxatdan o'tish yoki to'lov kerak emas — faqat bot.
 *
 * BACKUP_CHAT_ID berilmasa modul umuman ishga tushmaydi.
 */

const FILE_NAME = 'store.json';
/** Ketma-ket o'zgarishlarni bitta yuborishga qo'shamiz. */
const DEBOUNCE_MS = 15_000;
/**
 * Telegram'ni bezovta qilmaslik uchun eng qisqa oraliq.
 * Qisqa bo'lgani yaxshi: server istalgan payt to'xtashi mumkin, oxirgi
 * o'zgarish esa zaxiraga tushib ulgurishi kerak.
 */
const MIN_GAP_MS = 60_000;

export function createBackup({ token, store, chatId, base = null }) {
  const API_BASE = base || process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
  const API = `${API_BASE}/bot${token}`;

  let timer = null;
  let busy = false;
  let lastAt = null;
  let lastError = null;
  let pending = false;

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

  /** Zaxiradan tiklash. Faqat baza bo'sh bo'lganda chaqiriladi. */
  async function restore() {
    try {
      const chat = await call('getChat', { chat_id: chatId });
      const doc = chat?.pinned_message?.document;
      if (!doc) return { ok: false, error: 'Zaxira topilmadi (pin qilingan fayl yo\'q)' };

      const file = await call('getFile', { file_id: doc.file_id });
      const res = await fetch(`${API_BASE}/file/bot${token}/${file.file_path}`);
      if (!res.ok) return { ok: false, error: `Faylni yuklab bo'lmadi (${res.status})` };

      const data = await res.json();
      const result = store.replaceAll(data);
      if (!result.ok) return result;

      lastAt = doc.file_unique_id ? new Date().toISOString() : null;
      console.log(`Zaxiradan tiklandi: ${result.users} ta o'yinchi`);
      return result;
    } catch (err) {
      lastError = err.message;
      console.error('zaxiradan tiklab bo\'lmadi:', err.message);
      return { ok: false, error: err.message };
    }
  }

  /** Joriy bazani Telegram'ga yuboradi va o'sha xabarni pin qiladi. */
  async function save() {
    if (busy) {
      pending = true;
      return { ok: false, error: 'band' };
    }
    busy = true;
    try {
      const body = new FormData();
      body.set('chat_id', String(chatId));
      body.set('disable_notification', 'true');
      body.set('caption', `🗄 ${new Date().toISOString()} · ${Object.keys(store.data.users).length} o'yinchi`);
      body.set(
        'document',
        new Blob([JSON.stringify(store.data)], { type: 'application/json' }),
        FILE_NAME,
      );

      const res = await fetch(`${API}/sendDocument`, { method: 'POST', body });
      const data = await res.json().catch(() => ({ ok: false, description: 'javob o\'qilmadi' }));
      if (!data.ok) throw new Error(data.description);

      // Eng oxirgi nusxa doim pin qilingan bo'lsin — tiklashda shundan olinadi
      await call('unpinAllChatMessages', { chat_id: chatId }).catch(() => {});
      await call('pinChatMessage', {
        chat_id: chatId,
        message_id: data.result.message_id,
        disable_notification: true,
      });

      lastAt = new Date().toISOString();
      lastError = null;
      return { ok: true, at: lastAt };
    } catch (err) {
      lastError = err.message;
      console.error('zaxira yuborilmadi:', err.message);
      return { ok: false, error: err.message };
    } finally {
      busy = false;
      if (pending) {
        pending = false;
        schedule();
      }
    }
  }

  /**
   * O'zgarish bo'lgani haqida xabar.
   * Yuborish kechiktiriladi va MIN_GAP_MS dan tez-tez bo'lmaydi.
   */
  function schedule() {
    if (timer) return;
    const since = lastAt ? Date.now() - Date.parse(lastAt) : Infinity;
    const wait = Math.max(DEBOUNCE_MS, MIN_GAP_MS - since);
    timer = setTimeout(() => {
      timer = null;
      save();
    }, wait);
    timer.unref?.();
  }

  return {
    enabled: true,
    chatId: String(chatId),
    restore,
    save,
    schedule,
    stop: () => clearTimeout(timer),
    status: () => ({ enabled: true, chatId: String(chatId), lastAt, error: lastError }),
  };
}
