/**
 * "Mening ko'rinishlarim" — o'yinchida bor bo'lgan ko'rinishlar sahifasi.
 *
 * Do'kon nimani sotib olish mumkinligini ko'rsatadi, bu sahifa esa allaqachon
 * ochilganlarni: qaysi biri kiyilgan, qaysi birini bir bosishda almashtirish
 * mumkin. Tanlangan ko'rinish shu zahoti taxtaga qo'llanadi.
 */

import { SLOTS, RARITY, getItem } from '../shared/cosmetics.js';
import { drawItemPreview } from './preview.js';
import { shopState, equip, equipSet } from './shop.js';
import { isTelegram } from './telegram.js';
import { canPromote, openTelegramApp } from './promo.js';
import { $ } from './ui.js';
import { escapeHtml } from './game-view.js';
import { t, itemText } from '../shared/i18n.js';

let onShop = () => {};
let onFriends = () => {};

/** "Do'kon" va "Do'stlar" tugmalari qayerga olib borishi. */
export function wardrobeLinks({ shop, friends } = {}) {
  onShop = shop || (() => {});
  onFriends = friends || (() => {});
}

export function renderWardrobe() {
  const root = $('#wardrobeBody');
  if (!root) return;
  const state = shopState();
  const owned = new Set(state.owned);
  const items = state.items.length ? state.items : [];

  const bySlot = (slot) => items.filter((i) => i.slot === slot && owned.has(i.id));
  const bundles = items.filter((i) => i.slot === 'bundle' && owned.has(i.id));
  const total = SLOTS.reduce((n, slot) => n + bySlot(slot).length, 0);
  // Faqat boshlang'ich variantlar bo'lsa bo'limlarni takrorlamaymiz —
  // ular yuqoridagi "hozir kiyilgan" qatorida allaqachon ko'rinib turibdi
  const onlyStarters = total <= SLOTS.length;

  root.innerHTML = `
    ${wornHtml(state)}
    ${onlyStarters ? '' : SLOTS.map((slot) => groupHtml(slot, bySlot(slot), state)).join('')}
    ${bundles.length ? bundlesHtml(bundles, state) : ''}
    ${hintHtml(onlyStarters)}`;

  for (const el of root.querySelectorAll('[data-wear]')) {
    el.addEventListener('click', async () => {
      await equip(el.dataset.slot, el.dataset.wear);
      renderWardrobe();
    });
  }
  for (const el of root.querySelectorAll('[data-wear-set]')) {
    el.addEventListener('click', async () => {
      await equipSet(el.dataset.wearSet);
      renderWardrobe();
    });
  }
  root.querySelector('[data-go-shop]')?.addEventListener('click', () => onShop());
  root.querySelector('[data-go-friends]')?.addEventListener('click', () => onFriends());
  root.querySelector('[data-open-tg]')?.addEventListener('click', () => openTelegramApp());

  for (const canvas of root.querySelectorAll('canvas[data-preview]')) {
    drawItemPreview(canvas, canvas.dataset.preview);
  }
}

/** Yuqoridagi "hozir kiyilgan" to'plami. */
function wornHtml(state) {
  return `
    <div class="panel worn-panel">
      <h3>${t('mine.worn')}</h3>
      <div class="worn-row">
        ${SLOTS.map((slot) => {
          const item = getItem(state.equipped[slot]) || {};
          return `
            <div class="worn-item">
              <canvas data-preview="${escapeHtml(item.id || '')}"></canvas>
              <b>${escapeHtml(itemText(item) || '—')}</b>
              <small>${escapeHtml(t(`slot.${slot}`))}</small>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function groupHtml(slot, list, state) {
  if (!list.length) return '';
  return `
    <div class="panel">
      <h3>${escapeHtml(t(`slot.${slot}`))} <small class="muted">${escapeHtml(t('mine.count', { n: list.length }))}</small></h3>
      <div class="mine-grid">
        ${list.map((item) => {
          const worn = state.equipped[slot] === item.id;
          const rarity = RARITY[item.rarity] || RARITY.oddiy;
          return `
            <button class="mine-card ${worn ? 'on' : ''}" type="button"
                    ${worn ? 'disabled' : `data-wear="${escapeHtml(item.id)}" data-slot="${escapeHtml(slot)}"`}>
              <canvas data-preview="${escapeHtml(item.id)}"></canvas>
              <b>${escapeHtml(itemText(item))}${item.unlock ? ' 🎁' : ''}</b>
              <span class="rarity" style="color:${rarity.color}">${escapeHtml(t(`rarity.${item.rarity}`))}</span>
              <span class="mine-state">${escapeHtml(worn ? t('shop.worn') : t('shop.wear'))}</span>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

function bundlesHtml(bundles, state) {
  return `
    <div class="panel">
      <h3>${t('slot.bundle')}</h3>
      <div class="mine-bundles">
        ${bundles.map((item) => {
          const parts = (item.grants || []).map((id) => getItem(id)).filter((x) => x && x.slot !== 'bundle');
          const worn = parts.length > 0 && parts.every((x) => state.equipped[x.slot] === x.id);
          return `
            <div class="mine-bundle">
              <div>
                <b>🎁 ${escapeHtml(itemText(item))}</b>
                <small>${parts.map((x) => escapeHtml(itemText(x))).join(' · ')}</small>
              </div>
              ${worn
                ? `<span class="shop-owned">${t('shop.worn')}</span>`
                : `<button class="ghost" type="button" data-wear-set="${escapeHtml(item.id)}">${t('shop.wearAll')}</button>`}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/** Faqat boshlang'ich variantlar bo'lsa — qayerdan yangisini olish mumkinligi. */
function hintHtml(onlyStarters) {
  if (!onlyStarters) {
    return `
      <p class="muted" style="text-align:center">
        ${t('mine.hint')}
        <button class="link-btn" type="button" data-go-shop="1">${t('mine.toShop')}</button>
      </p>`;
  }
  return `
    <div class="panel">
      <h3>${t('mine.emptyTitle')}</h3>
      <p class="muted">${t('mine.emptyText')}</p>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="primary" type="button" data-go-shop="1">${t('mine.goShop')}</button>
        <button class="ghost" type="button" data-go-friends="1">${t('mine.goFriends')}</button>
        ${!isTelegram() && canPromote() ? `<button class="ghost" type="button" data-open-tg="1">${t('common.openInTelegram')}</button>` : ''}
      </div>
    </div>`;
}
