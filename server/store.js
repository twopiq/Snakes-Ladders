/**
 * Oddiy JSON saqlagich: o'yinchilar, sotib olishlar va admin o'rnatgan narxlar.
 *
 * Ma'lumot DATA_DIR/store.json faylida turadi. Yozish atomik (avval .tmp faylga,
 * keyin rename) va biroz kechiktirilgan — tez-tez yozishdan diskni asraydi.
 *
 * DIQQAT: Render'ning bepul tarifida disk vaqtinchalik — har deploydan keyin
 * fayl tozalanadi. Doimiy saqlash uchun Render Disk ulang yoki DATA_DIR ni
 * doimiy katalogga yo'naltiring (docs/monetizatsiya.md ga qarang).
 */

import fs from 'node:fs';
import path from 'node:path';
import { COSMETICS, getItem, grantsOf, freeItems, defaultEquipped, SLOTS, REFERRAL_TIERS } from '../public/shared/cosmetics.js';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'store.json');

const EMPTY = { users: {}, prices: {}, disabled: [], purchases: [], gifts: [], updatedAt: null };

export class Store {
  constructor(file = FILE) {
    this.file = file;
    this.data = structuredClone(EMPTY);
    this.timer = null;
    /** Har saqlashdan keyin chaqiriladi (Telegram zaxirasi shunga ulanadi). */
    this.afterSave = null;
    this.load();
  }

  /** Ma'lumot umuman yo'qmi? (zaxiradan tiklash shu holatda qilinadi) */
  get isEmpty() {
    return Object.keys(this.data.users).length === 0 && this.data.purchases.length === 0;
  }

  /** Butun bazani almashtiradi (zaxiradan tiklashda). */
  replaceAll(data) {
    if (!data || typeof data !== 'object' || !data.users) return { ok: false, error: 'Zaxira formati noto\'g\'ri' };
    this.data = { ...structuredClone(EMPTY), ...data };
    if (!Array.isArray(this.data.gifts)) this.data.gifts = [];
    this.saveNow({ backup: false }); // tiklangan nusxani qaytadan yuborish shart emas
    return { ok: true, users: Object.keys(this.data.users).length };
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { ...structuredClone(EMPTY), ...parsed };
      if (!Array.isArray(this.data.gifts)) this.data.gifts = [];
    } catch {
      this.data = structuredClone(EMPTY); // fayl yo'q — bo'sh boshlaymiz
    }
  }

  /** Yozishni 300 ms ga kechiktiradi (ketma-ket o'zgarishlar bitta yozuvga qo'shiladi). */
  saveSoon() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saveNow();
    }, 300);
    this.timer.unref?.();
  }

  saveNow({ backup = true } = {}) {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      this.data.updatedAt = new Date().toISOString();
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('store yozib bo\'lmadi:', err.message);
    }
    if (backup) {
      try {
        this.afterSave?.();
      } catch {
        /* zaxira ishlamasa ham o'yin to'xtamaydi */
      }
    }
  }

  // ---------------------------------------------------------------- narxlar

  /** Amaldagi narx: admin o'zgartirgan bo'lsa — o'sha, bo'lmasa katalogdagi. */
  price(itemId) {
    const item = getItem(itemId);
    if (!item) return null;
    const override = this.data.prices[itemId];
    return Number.isInteger(override) ? override : item.price;
  }

  /**
   * Narxni o'zgartiradi. stars = null bo'lsa katalogdagi qiymatga qaytadi.
   * Telegram Stars chegarasi: 1..100000 (bepul narsalar narxlanmaydi).
   */
  setPrice(itemId, stars) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    if (item.price === 0) return { ok: false, error: 'Bepul ko\'rinish narxlanmaydi' };
    if (stars === null || stars === undefined) {
      delete this.data.prices[itemId];
      this.saveSoon();
      return { ok: true, price: item.price };
    }
    const n = Number(stars);
    if (!Number.isInteger(n) || n < 1 || n > 100000) {
      return { ok: false, error: 'Narx 1 dan 100000 gacha butun son bo\'lishi kerak' };
    }
    this.data.prices[itemId] = n;
    this.saveSoon();
    return { ok: true, price: n };
  }

  isDisabled(itemId) {
    return this.data.disabled.includes(itemId);
  }

  setDisabled(itemId, off) {
    if (!getItem(itemId)) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    const set = new Set(this.data.disabled);
    if (off) set.add(itemId);
    else set.delete(itemId);
    this.data.disabled = [...set];
    this.saveSoon();
    return { ok: true, disabled: off };
  }

  // ---------------------------------------------------------------- o'yinchilar

  user(tgId) {
    const id = String(tgId);
    if (!this.data.users[id]) {
      this.data.users[id] = {
        owned: freeItems(),
        equipped: defaultEquipped(),
        starsSpent: 0,
        name: null,           // admin panelida tanib olish uchun
        lang: null,           // bot xabarlari shu tilda yuboriladi
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        played: false,        // kamida bitta o'yin o'ynadimi
        invitedBy: null,      // kim chaqirgan
        invitedConfirmed: 0,  // nechta do'st haqiqatan o'ynay boshladi
        invitedPending: 0,    // ochgan, lekin hali o'ynamagan
        rewardsGiven: [],     // qaysi darajalar berilgan
      };
      this.saveSoon();
    }
    const u = this.data.users[id];
    // Bepul narsalar har doim ochiq bo'lsin (katalog kengaysa ham)
    for (const free of freeItems()) if (!u.owned.includes(free)) u.owned.push(free);
    return u;
  }

  /** O'yinchi ilovaga kirdi — ismi, tili va oxirgi kirish vaqti yangilanadi. */
  touch(tgId, name, lang = null) {
    const u = this.user(tgId);
    const clean = String(name || '').trim().slice(0, 64);
    if (clean && u.name !== clean) u.name = clean;
    if (lang && u.lang !== lang) u.lang = lang;
    u.lastSeen = new Date().toISOString();
    this.saveSoon();
    return u;
  }

  /** O'yinchining tili (bilinmasa null). */
  langOf(tgId) {
    return this.data.users[String(tgId)]?.lang || null;
  }

  // ---------------------------------------------------------------- do'st chaqirish

  /**
   * Yangi o'yinchini chaqiruvchiga bog'laydi.
   *
   * Qoidalar (soxta hisoblarga qarshi):
   *   - o'zini o'zi chaqira olmaydi;
   *   - allaqachon chaqirilgan bo'lsa qayta bog'lanmaydi;
   *   - o'yin o'ynab bo'lgan odamni keyin "chaqirdim" deb yozib bo'lmaydi;
   *   - hisobga faqat haqiqatan o'ynay boshlagan do'st qo'shiladi (markPlayed).
   */
  attachReferral(tgId, referrerId) {
    const id = String(tgId);
    const ref = String(referrerId);
    if (!ref || id === ref) return { ok: false, error: 'self' };

    const user = this.user(id);
    if (user.invitedBy) return { ok: false, error: 'already' };
    if (user.played) return { ok: false, error: 'too-late' };

    user.invitedBy = ref;
    const referrer = this.user(ref);
    referrer.invitedPending = (referrer.invitedPending || 0) + 1;
    this.saveSoon();
    return { ok: true };
  }

  /**
   * O'yinchi o'yin boshladi. Agar uni kimdir chaqirgan bo'lsa — o'sha chaqiruv
   * tasdiqlanadi va chaqiruvchiga mukofot tekshiriladi.
   * Qaytadi: chaqiruvchiga berilgan yangi mukofotlar ro'yxati.
   */
  markPlayed(tgId) {
    const user = this.user(tgId);
    if (user.played) return { confirmed: false, rewards: [], referrerId: null };
    user.played = true;

    if (!user.invitedBy) {
      this.saveNow();
      return { confirmed: false, rewards: [], referrerId: null };
    }

    const referrer = this.user(user.invitedBy);
    referrer.invitedConfirmed = (referrer.invitedConfirmed || 0) + 1;
    referrer.invitedPending = Math.max(0, (referrer.invitedPending || 0) - 1);

    const rewards = this.checkRewards(user.invitedBy);
    this.saveNow();
    return { confirmed: true, rewards, referrerId: user.invitedBy };
  }

  /** Yig'ilgan do'stlar soniga qarab ochilishi kerak bo'lgan mukofotlarni beradi. */
  checkRewards(tgId) {
    const user = this.user(tgId);
    const given = [];
    for (const tier of REFERRAL_TIERS) {
      if ((user.invitedConfirmed || 0) < tier.count) continue;
      if (user.rewardsGiven.includes(tier.count)) continue;
      user.rewardsGiven.push(tier.count);
      this.grant(tgId, tier.itemId);
      given.push(tier);
    }
    if (given.length) this.saveSoon();
    return given;
  }

  /** "Do'stlar" ekrani uchun ma'lumot. */
  referralInfo(tgId) {
    const user = this.user(tgId);
    const confirmed = user.invitedConfirmed || 0;
    const next = REFERRAL_TIERS.find((t) => confirmed < t.count) || null;
    return {
      confirmed,
      pending: user.invitedPending || 0,
      invitedBy: user.invitedBy || null,
      rewards: REFERRAL_TIERS.map((tier) => ({
        count: tier.count,
        itemId: tier.itemId,
        unlocked: user.owned.includes(tier.itemId),
      })),
      next: next ? { count: next.count, itemId: next.itemId, left: next.count - confirmed } : null,
    };
  }

  owns(tgId, itemId) {
    return this.user(tgId).owned.includes(itemId);
  }

  /** Narsani (yoki to'plamdagi hammasini) o'yinchiga beradi. */
  grant(tgId, itemId) {
    const u = this.user(tgId);
    let added = 0;
    for (const id of grantsOf(itemId)) {
      if (!u.owned.includes(id)) {
        u.owned.push(id);
        added++;
      }
    }
    // Yangi ochilgan narsa darhol kiyiladi — o'yinchi uni qidirib yurmasin
    if (added) this.equipIfDefault(tgId, itemId);
    // Egalik — muhim, kechiktirmasdan yozamiz (server istalgan payt to'xtashi mumkin)
    this.saveNow();
    return added;
  }

  /**
   * Yangi ochilgan ko'rinishni kiydiradi — lekin faqat o'sha bo'limda hali
   * boshlang'ich variant turgan bo'lsa.
   *
   * Shu qoida tufayli xarid, sovg'a yoki mukofot "ishlamagandek" tuyulmaydi
   * (darhol ko'rinadi), lekin o'yinchi ataylab tanlab qo'ygan ko'rinish
   * hech qachon o'zgarib ketmaydi.
   */
  equipIfDefault(tgId, itemId) {
    const def = defaultEquipped();
    const u = this.user(tgId);
    const worn = [];
    for (const id of grantsOf(itemId)) {
      const part = getItem(id);
      if (!part || !SLOTS.includes(part.slot)) continue; // to'plamning o'zi kiyilmaydi
      if (!u.owned.includes(id)) continue;
      if (u.equipped[part.slot] !== def[part.slot]) continue; // o'z tanloviga tegmaymiz
      u.equipped[part.slot] = id;
      worn.push(id);
    }
    if (worn.length) this.saveNow();
    return worn;
  }

  /**
   * Bir martalik tuzatish: avvalroq olingan to'plamlar hech qayerga
   * kiyilmagan bo'lsa, bo'sh (boshlang'ich) bo'limlarga kiydiriladi.
   *
   * Bu qoida "yangi narsa o'zi kiyiladi" qoidasidan oldin olingan xarid va
   * sovg'alar uchun kerak. Har bir o'yinchi uchun faqat bir marta bajariladi.
   */
  applyOwnedBundles(tgId) {
    const u = this.user(tgId);
    if (u.bundlesApplied) return [];
    u.bundlesApplied = true;
    const worn = [];
    for (const item of COSMETICS) {
      if (item.slot !== 'bundle' || !u.owned.includes(item.id)) continue;
      worn.push(...this.equipIfDefault(tgId, item.id));
    }
    this.saveSoon();
    return worn;
  }

  /**
   * Admin biror ko'rinishni bepul beradi (yulduzsiz).
   * Mukofot ko'rinishlari ham beriladi — bu admin qarori.
   */
  giftItem(tgId, itemId, { by = 'admin', note = '' } = {}) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    const added = this.grant(tgId, itemId);
    const entry = {
      tgId: String(tgId), itemId, by, note: String(note || '').slice(0, 200),
      added, at: new Date().toISOString(), revoked: false,
    };
    this.data.gifts.push(entry);
    this.saveNow(); // sovg'a — muhim, darhol yozamiz
    return { ok: true, added, alreadyOwned: added === 0, gift: entry, owned: this.user(tgId).owned };
  }

  /** Berilgan ko'rinishni qaytarib oladi (xato bergan bo'lsa). */
  revokeItem(tgId, itemId) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    const u = this.user(tgId);
    const remove = new Set(grantsOf(itemId));
    const before = u.owned.length;
    u.owned = u.owned.filter((id) => !remove.has(id));
    // Bepul variantlar hech qachon olinmaydi, kiyimi ham buzilmasin
    for (const free of freeItems()) if (!u.owned.includes(free)) u.owned.push(free);
    for (const slot of SLOTS) {
      if (!u.owned.includes(u.equipped[slot])) u.equipped[slot] = defaultEquipped()[slot];
    }
    for (const g of this.data.gifts) {
      if (g.tgId === String(tgId) && g.itemId === itemId) g.revoked = true;
    }
    this.saveNow();
    return { ok: true, removed: before - u.owned.length, owned: u.owned };
  }

  /** Admin paneli uchun o'yinchilar ro'yxati (eng yangi kirganlar oldinda). */
  userList({ limit = 200, query = '' } = {}) {
    const q = String(query || '').trim().toLowerCase();
    const rows = Object.entries(this.data.users).map(([tgId, u]) => ({
      tgId,
      name: u.name || null,
      lang: u.lang || null,
      played: Boolean(u.played),
      starsSpent: u.starsSpent || 0,
      owned: u.owned.length,
      invitedBy: u.invitedBy || null,
      invitedConfirmed: u.invitedConfirmed || 0,
      invitedPending: u.invitedPending || 0,
      firstSeen: u.firstSeen || null,
      lastSeen: u.lastSeen || u.firstSeen || null,
      items: u.owned.slice(),
    }));
    const filtered = q
      ? rows.filter((r) => r.tgId.includes(q) || (r.name || '').toLowerCase().includes(q))
      : rows;
    filtered.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')));
    return { total: rows.length, shown: filtered.slice(0, limit) };
  }

  /**
   * To'plamdagi hamma narsani o'z bo'limiga kiydiradi.
   * To'plam sotib olingach o'yinchi to'rtta bo'limni qo'lda aylanib chiqmasin.
   */
  equipSet(tgId, itemId) {
    const item = getItem(itemId);
    if (!item) return { ok: false, error: 'Bunday ko\'rinish yo\'q' };
    const u = this.user(tgId);
    const worn = [];
    for (const id of grantsOf(itemId)) {
      const part = getItem(id);
      if (!part || !SLOTS.includes(part.slot)) continue; // to'plamning o'zi kiyilmaydi
      if (!u.owned.includes(id)) continue;
      u.equipped[part.slot] = id;
      worn.push(id);
    }
    if (!worn.length) return { ok: false, error: 'Kiyish uchun narsa topilmadi' };
    // O'yinchining tanlovi — har safar qaytadan tanlab o'tirmasin
    this.saveNow();
    return { ok: true, equipped: u.equipped, worn };
  }

  /** Sotib olingan ko'rinishni kiyadi. */
  equip(tgId, slot, itemId) {
    if (!SLOTS.includes(slot)) return { ok: false, error: 'Noma\'lum bo\'lim' };
    const item = getItem(itemId);
    if (!item || item.slot !== slot) return { ok: false, error: 'Bu ko\'rinish bu bo\'limga to\'g\'ri kelmaydi' };
    const u = this.user(tgId);
    if (!u.owned.includes(itemId)) return { ok: false, error: 'Bu ko\'rinish sizda yo\'q' };
    u.equipped[slot] = itemId;
    this.saveNow(); // tanlov darhol saqlanadi
    return { ok: true, equipped: u.equipped };
  }

  // ---------------------------------------------------------------- to'lovlar

  recordPurchase({ tgId, itemId, stars, chargeId, name }) {
    const entry = {
      tgId: String(tgId),
      itemId,
      stars,
      chargeId,
      name: name || null,
      at: new Date().toISOString(),
      refunded: false,
    };
    this.data.purchases.push(entry);
    const u = this.user(tgId);
    u.starsSpent += stars;
    this.grant(tgId, itemId);
    this.saveNow(); // to'lov — muhim, darhol yozamiz
    return entry;
  }

  findPurchase(chargeId) {
    return this.data.purchases.find((p) => p.chargeId === chargeId) || null;
  }

  markRefunded(chargeId) {
    const p = this.findPurchase(chargeId);
    if (!p) return { ok: false, error: 'Bunday to\'lov topilmadi' };
    if (p.refunded) return { ok: false, error: 'Allaqachon qaytarilgan' };
    p.refunded = true;
    const u = this.user(p.tgId);
    u.starsSpent = Math.max(0, u.starsSpent - p.stars);
    // Qaytarilgan narsa olib qo'yiladi (to'plam bo'lsa — ichidagilar ham)
    for (const id of grantsOf(p.itemId)) {
      u.owned = u.owned.filter((x) => x === id ? false : true);
    }
    for (const free of freeItems()) if (!u.owned.includes(free)) u.owned.push(free);
    for (const slot of SLOTS) {
      if (!u.owned.includes(u.equipped[slot])) u.equipped[slot] = defaultEquipped()[slot];
    }
    this.saveNow();
    return { ok: true, purchase: p };
  }

  /** Admin paneli uchun umumiy hisobot. */
  stats() {
    const active = this.data.purchases.filter((p) => !p.refunded);
    const byItem = {};
    for (const p of active) {
      byItem[p.itemId] = byItem[p.itemId] || { count: 0, stars: 0 };
      byItem[p.itemId].count++;
      byItem[p.itemId].stars += p.stars;
    }
    const users = Object.values(this.data.users);
    return {
      users: users.length,
      played: users.filter((u) => u.played).length,
      invited: users.filter((u) => u.invitedBy).length,
      purchases: active.length,
      refunds: this.data.purchases.length - active.length,
      starsTotal: active.reduce((s, p) => s + p.stars, 0),
      byItem,
      recent: this.data.purchases.slice(-25).reverse(),
      referrals: {
        attached: users.filter((u) => u.invitedBy).length,
        confirmed: users.reduce((n, u) => n + (u.invitedConfirmed || 0), 0),
        pending: users.reduce((n, u) => n + (u.invitedPending || 0), 0),
        rewarded: users.filter((u) => (u.rewardsGiven || []).length).length,
      },
      gifts: this.data.gifts.slice(-25).reverse(),
    };
  }
}
