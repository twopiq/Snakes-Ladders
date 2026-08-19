/**
 * Do'kon: fishka, narvon, ilon va taxta ko'rinishlari.
 *
 * Telegram ichida — Stars (⭐) orqali sotib olinadi va hamma narsa serverda saqlanadi.
 * Oddiy brauzerda — faqat bepul ko'rinishlar, tanlov localStorage'da qoladi
 * (pullik narsalar "Telegram'da ochiladi" deb ko'rsatiladi).
 */

import { SLOTS, RARITY, defaultEquipped, getItem } from '../shared/cosmetics.js';
import { drawItemPreview } from './preview.js';
import { isTelegram, initData, openInvoice, haptic, tgConfig, pendingRef, settleRef } from './telegram.js';
import { canPromote, openTelegramApp } from './promo.js';
import { $, toast, showModal, hideModal } from './ui.js';
import { escapeHtml } from './game-view.js';
import { t, itemText } from '../shared/i18n.js';

const EQUIP_KEY = 'il_equipped';
const TABS = [...SLOTS, 'bundle'];
const tabName = (slot) => t(`slot.${slot}`);

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
    if (!silent) toast(t('msg.shopLoadFail'), 'bad');
  }
  return state;
}

// ---------------------------------------------------------------- ko'rinish

export function renderShop() {
  const root = $('#shopBody');
  if (!root) return;

  $('#shopStars').textContent = isTelegram() && state.loaded
    ? t('shop.spent', { n: state.starsSpent })
    : '';

  const note = $('#shopNote');
  if (!isTelegram()) {
    note.classList.remove('hidden');
    note.innerHTML = canPromote()
      ? `${t('shop.siteNote')}
         <button class="link-btn" type="button" data-open-tg="1">${t('common.openInTelegram')} →</button>`
      : t('shop.siteNotePlain');
    for (const el of note.querySelectorAll('[data-open-tg]')) {
      el.addEventListener('click', () => openTelegramApp());
    }
  } else {
    note.classList.add('hidden');
  }

  // bo'limlar
  $('#shopTabs').innerHTML = TABS.map((slot) => `
    <button class="tab shop-tab ${slot === state.tab ? 'active' : ''}" data-shop-tab="${slot}">${escapeHtml(tabName(slot))}</button>
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
      toast(err.message || t('msg.wearFail'), 'bad');
    }
  } else {
    saveLocalEquipped();
  }

  onChange(state.equipped);
  renderShop();
  toast(t('msg.wornOk', { name: itemText(item) || t('slot.bundle') }));
}

function card(item) {
  const rarity = RARITY[item.rarity] || RARITY.oddiy;
  const isOwned = owns(item.id);
  const isEquipped = item.slot !== 'bundle' && state.equipped[item.slot] === item.id;
  const canBuyHere = isTelegram() && state.starsEnabled;

  let action;
  const locked = canPromote()
    ? `<button class="ghost tg-open" data-open-tg="1">⭐ ${item.price} · ${t('common.openInTelegram')}</button>`
    : `<button class="ghost" disabled>${t('shop.inTelegram', { price: item.price })}</button>`;

  // Mukofot ko'rinishlari sotilmaydi — faqat do'st chaqirib olinadi
  if (item.unlock?.type === 'referral' && !isOwned) {
    action = `<button class="ghost reward-btn" data-friends="1">${t('shop.rewardBtn', { n: item.unlock.count })}</button>`;
  } else if (isOwned && item.slot === 'bundle') {
    action = allWorn(item)
      ? `<span class="shop-owned">${t('shop.worn')}</span>`
      : `<button class="ghost" data-equip-set="${item.id}">${t('shop.wearAll')}</button>`;
  } else if (isEquipped) {
    action = `<span class="shop-owned">${t('shop.worn')}</span>`;
  } else if (isOwned) {
    action = `<button class="ghost" data-equip="${item.id}" data-slot="${item.slot}">${t('shop.wear')}</button>`;
  } else if (canBuyHere) {
    action = item.slot === 'bundle'
      ? `<button class="primary" data-buy="${item.id}">${t('shop.buy', { price: item.price })}</button>`
      : `<button class="primary" data-buy="${item.id}">⭐ ${item.price}</button>`;
  } else {
    action = locked;
  }

  const bundleList = item.grants
    ? `<small class="bundle-list">${item.grants.map((g) => escapeHtml(itemText(getItem(g)) || g)).join(' · ')}</small>`
    : '';

  return `
    <div class="shop-card ${isEquipped ? 'equipped' : ''}">
      <div class="shop-preview">${
        item.slot === 'bundle'
          ? '<span class="bundle-emoji">🎁</span>'
          : `<canvas data-preview="${item.id}"></canvas>`
      }</div>
      <div class="shop-info">
        <b>${escapeHtml(itemText(item))}${item.unlock ? ' 🎁' : ''}</b>
        <span class="rarity" style="color:${rarity.color}">${escapeHtml(t(`rarity.${item.rarity}`))}</span>
        <small>${escapeHtml(itemText(item, 'about'))}</small>
        ${bundleList}
      </div>
      <div class="shop-action">${action}</div>
    </div>`;
}

// ---------------------------------------------------------------- amallar

export async function equip(slot, itemId) {
  if (!owns(itemId)) return toast(t('msg.notOwned'), 'bad');
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
      toast(err.message || t('msg.wearFail'), 'bad');
    }
  } else {
    saveLocalEquipped();
  }

  onChange(state.equipped);
  renderShop();
  toast(t('msg.wornOk', { name: itemText(getItem(itemId)) }));
}

async function buy(itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return;

  if (!isTelegram()) {
    return showModal(`
      <h2>${t('shop.needTelegram')}</h2>
      <p>${t('shop.needTelegramText')}</p>
      <div class="modal-actions"><button class="primary" data-act="ok">${t('common.gotIt')}</button></div>`,
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
      toast(t('msg.buyOk'));
      await waitForItem(itemId);
      renderShop();
    } else if (status === 'cancelled') {
      toast(t('msg.buyCancelled'));
    } else if (status === 'unsupported') {
      toast(t('msg.oldTelegram'), 'bad');
    } else if (status !== 'pending') {
      haptic('error');
      toast(t('msg.payFail'), 'bad');
    }
  } catch (err) {
    toast(err.message || t('common.error'), 'bad');
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
  toast(t('msg.buyNotSynced'), 'bad');
  return false;
}
