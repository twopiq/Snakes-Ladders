/**
 * Do'kon: fishka, narvon, ilon va taxta ko'rinishlari.
 *
 * Telegram ichida — Stars (⭐) orqali sotib olinadi va hamma narsa serverda saqlanadi.
 * Oddiy brauzerda — faqat bepul ko'rinishlar, tanlov localStorage'da qoladi
 * (pullik narsalar "Telegram'da ochiladi" deb ko'rsatiladi).
 */

import { SLOTS, SLOT_NAMES, RARITY, defaultEquipped, getItem } from '../shared/cosmetics.js';
import { drawItemPreview } from './preview.js';
import { isTelegram, initData, openInvoice, haptic, tgConfig, pendingRef, settleRef } from './telegram.js';
import { canPromote, openTelegramApp, LOCK_LABEL } from './promo.js';
import { $, toast, showModal, hideModal } from './ui.js';
import { escapeHtml } from './game-view.js';

const EQUIP_KEY = 'il_equipped';
const TABS = [...SLOTS, 'bundle'];
const TAB_NAMES = { ...SLOT_NAMES, bundle: "To'plamlar" };

const state = {
  items: [],
  owned: [],
  equipped: loadLocalEquipped(),
  starsSpent: 0,
  starsEnabled: false,
  tab: 'token',
  loaded: false,
};

let onChange = () => {};
let onFriendsClick = () => {};

/** Do'kondagi "do'st chaqiring" tugmasi bosilganda. */
export function onOpenFriends(fn) {
  onFriendsClick = fn || (() => {});
}

export function equippedNow() {
  return state.equipped;
}

/** Do'kon holati (katalog, ochilganlar, kiyilganlar) — "Mening ko'rinishlarim" uchun. */
export function shopState() {
  return state;
}

/** Ko'rinish o'zgarganda taxtani yangilash uchun. */
export function onEquipChange(fn) {
  onChange = fn || (() => {});
}

function loadLocalEquipped() {
  try {
    const saved = JSON.parse(localStorage.getItem(EQUIP_KEY) || 'null');
    return { ...defaultEquipped(), ...(saved || {}) };
  } catch {
    return defaultEquipped();
  }
}

function saveLocalEquipped() {
  localStorage.setItem(EQUIP_KEY, JSON.stringify(state.equipped));
}

/** Do'kon ma'lumotini yuklaydi (Telegram'da — shaxsiy, saytda — umumiy katalog). */
export async function loadShop({ silent = true } = {}) {
  try {
    if (isTelegram() && initData()) {
      const res = await fetch('/api/shop/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ref — do'st taklifi havolasi orqali kelgan bo'lsa (biriktirilgunicha yuboriladi)
        body: JSON.stringify({ initData: initData(), ref: pendingRef() }),
      });
      if (res.ok) {
        const data = await res.json();
        settleRef(data.ref);
        state.items = data.items;
        state.owned = data.owned;
        state.equipped = { ...defaultEquipped(), ...data.equipped };
        state.starsSpent = data.starsSpent;
        state.starsEnabled = data.starsEnabled;
        state.loaded = true;
        onChange(state.equipped);
        return state;
      }
    }
    const res = await fetch('/api/catalog');
    const data = await res.json();
    state.items = data.items;
    state.starsEnabled = data.starsEnabled;
    // Mukofotlar bepul emas — ular faqat do'st chaqirib ochiladi
    state.owned = data.items.filter((i) => i.price === 0 && !i.unlock).map((i) => i.id);
    state.equipped = loadLocalEquipped();
    state.loaded = true;
    onChange(state.equipped);
  } catch {
    if (!silent) toast("Do'konni yuklab bo'lmadi", 'bad');
  }
  return state;
}

// ---------------------------------------------------------------- ko'rinish

export function renderShop() {
  const root = $('#shopBody');
  if (!root) return;

  $('#shopStars').textContent = isTelegram() && state.loaded
    ? `⭐ ${state.starsSpent} sarflangan`
    : '';

  const note = $('#shopNote');
  if (!isTelegram()) {
    note.classList.remove('hidden');
    note.innerHTML = canPromote()
      ? `Pullik ko'rinishlar Telegram Stars (⭐) orqali sotiladi — xarid faqat Telegram ilovasida ishlaydi.
         <button class="link-btn" type="button" data-open-tg="1">Telegram'da ochish →</button>`
      : "Pullik ko'rinishlar Telegram ilovasi ichida sotiladi. Bepul variantlar bu yerda ham tanlanadi.";
    for (const el of note.querySelectorAll('[data-open-tg]')) {
      el.addEventListener('click', () => openTelegramApp());
    }
  } else {
    note.classList.add('hidden');
  }

  // bo'limlar
  $('#shopTabs').innerHTML = TABS.map((t) => `
    <button class="tab shop-tab ${t === state.tab ? 'active' : ''}" data-shop-tab="${t}">${escapeHtml(TAB_NAMES[t])}</button>
  `).join('');
  for (const btn of document.querySelectorAll('[data-shop-tab]')) {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.shopTab;
      haptic('select');
      renderShop();
    });
  }

  const items = state.items.filter((i) => i.slot === state.tab && !(i.disabled && !owns(i.id)));
  root.innerHTML = items.map((item) => card(item)).join('');

  for (const el of root.querySelectorAll('[data-buy]')) {
    el.addEventListener('click', () => buy(el.dataset.buy));
  }
  for (const el of root.querySelectorAll('[data-equip]')) {
    el.addEventListener('click', () => equip(el.dataset.slot, el.dataset.equip));
  }
  for (const el of root.querySelectorAll('[data-equip-set]')) {
    el.addEventListener('click', () => equipSet(el.dataset.equipSet));
  }
  for (const el of root.querySelectorAll('[data-open-tg]')) {
    el.addEventListener('click', () => openTelegramApp());
  }
  for (const el of root.querySelectorAll('[data-friends]')) {
    el.addEventListener('click', () => onFriendsClick());
  }
  for (const canvas of root.querySelectorAll('canvas[data-preview]')) {
    drawItemPreview(canvas, canvas.dataset.preview);
  }
}

function owns(id) {
  return state.owned.includes(id);
}

/** To'plam ichidagi hamma narsa hozir kiyilganmi? */
function allWorn(item) {
  const parts = (item.grants || []).map((id) => getItem(id)).filter((x) => x && x.slot !== 'bundle');
  return parts.length > 0 && parts.every((x) => state.equipped[x.slot] === x.id);
}

/**
 * To'plamni butunlay kiyadi.
 * Sotib olingan to'plam o'z-o'zidan ishlashi kerak — o'yinchi to'rtta bo'limni
 * aylanib chiqib, har birini alohida kiyishi shart emas.
 */
export async function equipSet(itemId) {
  const item = state.items.find((i) => i.id === itemId) || getItem(itemId);
  const parts = (item?.grants || []).map((id) => getItem(id)).filter((x) => x && x.slot !== 'bundle');
  if (!parts.length) return;

  for (const part of parts) if (owns(part.id)) state.equipped[part.slot] = part.id;
  haptic('light');

  if (isTelegram() && initData()) {
    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData(), itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      state.equipped = { ...defaultEquipped(), ...data.equipped };
    } catch (err) {
      toast(err.message || "Kiyib bo'lmadi", 'bad');
    }
  } else {
    saveLocalEquipped();
  }

  onChange(state.equipped);
  renderShop();
  toast(`${item?.name || "To'plam"} kiyildi`);
}

function card(item) {
  const rarity = RARITY[item.rarity] || RARITY.oddiy;
  const isOwned = owns(item.id);
  const isEquipped = item.slot !== 'bundle' && state.equipped[item.slot] === item.id;
  const canBuyHere = isTelegram() && state.starsEnabled;

  let action;
  const locked = canPromote()
    ? `<button class="ghost tg-open" data-open-tg="1">⭐ ${item.price} · ${LOCK_LABEL}</button>`
    : `<button class="ghost" disabled title="Telegram ilovasida sotiladi">⭐ ${item.price} · Telegram'da</button>`;

  // Mukofot ko'rinishlari sotilmaydi — faqat do'st chaqirib olinadi
  if (item.unlock?.type === 'referral' && !isOwned) {
    action = `<button class="ghost reward-btn" data-friends="1">🎁 ${item.unlock.count} ta do'st chaqiring</button>`;
  } else if (isOwned && item.slot === 'bundle') {
    action = allWorn(item)
      ? '<span class="shop-owned">Kiyilgan ✓</span>'
      : `<button class="ghost" data-equip-set="${item.id}">Hammasini kiyish</button>`;
  } else if (isEquipped) {
    action = '<span class="shop-owned">Kiyilgan ✓</span>';
  } else if (isOwned) {
    action = `<button class="ghost" data-equip="${item.id}" data-slot="${item.slot}">Kiyish</button>`;
  } else if (canBuyHere) {
    action = item.slot === 'bundle'
      ? `<button class="primary" data-buy="${item.id}">⭐ ${item.price} — olish</button>`
      : `<button class="primary" data-buy="${item.id}">⭐ ${item.price}</button>`;
  } else {
    action = locked;
  }

  const bundleList = item.grants
    ? `<small class="bundle-list">${item.grants.map((g) => escapeHtml(getItem(g)?.name || g)).join(' · ')}</small>`
    : '';

  return `
    <div class="shop-card ${isEquipped ? 'equipped' : ''}">
      <div class="shop-preview">${
        item.slot === 'bundle'
          ? '<span class="bundle-emoji">🎁</span>'
          : `<canvas data-preview="${item.id}"></canvas>`
      }</div>
      <div class="shop-info">
        <b>${escapeHtml(item.name)}${item.unlock ? ' 🎁' : ''}</b>
        <span class="rarity" style="color:${rarity.color}">${escapeHtml(rarity.name)}</span>
        <small>${escapeHtml(item.about || '')}</small>
        ${bundleList}
      </div>
      <div class="shop-action">${action}</div>
    </div>`;
}

// ---------------------------------------------------------------- amallar

export async function equip(slot, itemId) {
  if (!owns(itemId)) return toast("Bu ko'rinish hali sizda yo'q", 'bad');
  state.equipped[slot] = itemId;
  haptic('light');

  if (isTelegram() && initData()) {
    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData(), slot, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      state.equipped = { ...defaultEquipped(), ...data.equipped };
    } catch (err) {
      toast(err.message || 'Kiyib bo\'lmadi', 'bad');
    }
  } else {
    saveLocalEquipped();
  }

  onChange(state.equipped);
  renderShop();
  toast(`${getItem(itemId)?.name} kiyildi`);
}

async function buy(itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return;

  if (!isTelegram()) {
    return showModal(`
      <h2>Telegram kerak</h2>
      <p>Ko'rinishlar Telegram Stars (⭐) orqali sotiladi, shuning uchun xarid faqat
      Telegram ilovasi ichida ishlaydi. O'yinni Telegram'da oching va do'konga kiring.</p>
      <div class="modal-actions"><button class="primary" data-act="ok">Tushunarli</button></div>`,
      () => hideModal());
  }

  try {
    const res = await fetch('/api/shop/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: initData(), itemId }),
    });
    const data = await res.json();
    if (!res.ok || !data.link) throw new Error(data.error || 'To\'lov havolasi olinmadi');

    const status = await openInvoice(data.link);
    if (status === 'paid') {
      haptic('success');
      toast('Xarid muvaffaqiyatli! Ochilmoqda...');
      await waitForItem(itemId);
      renderShop();
    } else if (status === 'cancelled') {
      toast('Xarid bekor qilindi');
    } else if (status === 'unsupported') {
      toast("Telegram ilovangiz eskiroq — yangilang", 'bad');
    } else if (status !== 'pending') {
      haptic('error');
      toast("To'lov amalga oshmadi", 'bad');
    }
  } catch (err) {
    toast(err.message || 'Xatolik', 'bad');
  }
}

/** To'lovdan keyin narsa serverda paydo bo'lishini kutamiz (bot xabari biroz kechikadi). */
async function waitForItem(itemId, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await loadShop();
    if (owns(itemId)) {
      const item = getItem(itemId);
      if (item?.slot === 'bundle') await equipSet(itemId);
      else if (item?.slot) await equip(item.slot, itemId);
      return true;
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  toast("Xarid qayd etildi, lekin ro'yxat yangilanmadi — do'konni qayta oching", 'bad');
  return false;
}
