/**
 * "Do'stlar" ekrani — taklif havolasi va mukofotlar.
 *
 * Mukofot ko'rinishlari yulduz bilan sotilmaydi: ularni faqat do'st chaqirib olish
 * mumkin (3, 5, 7, 10 ta do'st). Do'st "hisoblanadi" — havoladan kirib, kamida
 * bitta o'yin boshlaganda (shunchaki havolani ochish yetarli emas).
 */

import { REFERRAL_TIERS, getItem, RARITY } from '../shared/cosmetics.js';
import { isTelegram, initData, shareRoom, haptic, tgConfig } from './telegram.js';
import { canPromote, openTelegramApp } from './promo.js';
import { $, toast } from './ui.js';
import { escapeHtml } from './game-view.js';
import { drawItemPreview } from './preview.js';

const state = { confirmed: 0, pending: 0, rewards: [], link: null, loaded: false };

export const referralState = () => state;

/** Serverdan do'stlar ma'lumotini oladi (faqat Telegram ichida). */
export async function loadFriends() {
  if (!isTelegram() || !initData()) return state;
  try {
    const res = await fetch('/api/shop/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: initData() }),
    });
    if (!res.ok) return state;
    const data = await res.json();
    Object.assign(state, data.referral, { link: data.link, loaded: true });
  } catch {
    /* jim qolamiz — ekran baribir ochiladi */
  }
  return state;
}

/** O'yin boshlanganini serverga bildiradi — shu payt taklif tasdiqlanadi. */
export async function reportPlayed() {
  if (!isTelegram() || !initData()) return;
  try {
    await fetch('/api/shop/played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: initData() }),
    });
  } catch {
    /* muhim emas — keyingi o'yinda qayta urinadi */
  }
}

export function renderFriends() {
  const root = $('#friendsBody');
  if (!root) return;
  try {
    renderFriendsInner(root);
  } catch (err) {
    // Ekran bo'sh qolib ketmasligi uchun — xatoni ko'rsatamiz
    console.error('friends render:', err);
    root.innerHTML = `
      <div class="panel">
        <h3>Ekranni ochib bo'lmadi</h3>
        <p class="muted">Ilovani yopib, qaytadan oching. Muammo qolsa — botga /support yozing.</p>
        <p class="muted" style="font-family:ui-monospace,monospace;font-size:11px">${escapeHtml(String(err.message || err))}</p>
      </div>`;
  }
}

function renderFriendsInner(root) {

  if (!isTelegram()) {
    root.innerHTML = `
      <div class="panel">
        <h3>Do'stlarni chaqirish</h3>
        <p class="muted">Taklif havolasi va mukofotlar Telegram ilovasida ishlaydi —
        chaqirilgan do'st sizning Telegram hisobingizga bog'lanadi.</p>
        ${canPromote() ? '<button class="primary big" data-open-tg="1">Telegram\'da ochish</button>' : ''}
      </div>
      ${rewardsHtml(new Set())}`;
    for (const el of root.querySelectorAll('[data-open-tg]')) {
      el.addEventListener('click', () => openTelegramApp());
    }
    drawPreviews(root);
    return;
  }

  const unlocked = new Set(state.rewards.filter((r) => r.unlocked).map((r) => r.itemId));
  const next = REFERRAL_TIERS.find((t) => state.confirmed < t.count);
  const goal = next ? next.count : REFERRAL_TIERS[REFERRAL_TIERS.length - 1].count;
  const percent = Math.min(100, Math.round((state.confirmed / goal) * 100));

  root.innerHTML = `
    <div class="panel friends-top">
      <div class="friends-count">
        <b>${state.confirmed}</b>
        <span>do'st o'ynadi${state.pending ? ` · ${state.pending} ta hali o'ynamagan` : ''}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
      <p class="muted">${next
        ? `Keyingi mukofotgacha yana <b>${next.count - state.confirmed}</b> ta do'st`
        : 'Barcha mukofotlar ochildi — rahmat! 🎉'}</p>
      <button class="primary big" data-invite="1">Do'stni chaqirish</button>
      <button class="ghost big" data-copy="1">Havolani nusxalash</button>
      <p class="muted" style="margin-top:12px">
        Do'st havolangiz orqali kirib, kamida bitta o'yin boshlasa — hisobga qo'shiladi.
      </p>
    </div>
    ${rewardsHtml(unlocked)}`;

  root.querySelector('[data-invite]')?.addEventListener('click', invite);
  root.querySelector('[data-copy]')?.addEventListener('click', copyLink);
  drawPreviews(root);
}

function rewardsHtml(unlocked) {
  return `<div class="reward-list">${REFERRAL_TIERS.map((tier) => {
    const item = getItem(tier.itemId);
    const done = unlocked.has(tier.itemId);
    const rarity = RARITY[item.rarity] || RARITY.oddiy;
    return `
      <div class="reward ${done ? 'done' : ''}">
        <div class="reward-preview"><canvas data-item="${item.id}"></canvas></div>
        <div class="reward-info">
          <span class="reward-tier">${tier.count} ta do'st</span>
          <b>${escapeHtml(item.name)}</b>
          <span class="rarity" style="color:${rarity.color}">${escapeHtml(rarity.name)}</span>
          <small>${escapeHtml(item.about)}</small>
        </div>
        <div class="reward-state">${done ? '✅' : '🔒'}</div>
      </div>`;
  }).join('')}</div>`;
}

function drawPreviews(root) {
  for (const canvas of root.querySelectorAll('canvas[data-item]')) {
    drawItemPreview(canvas, canvas.dataset.item);
  }
}

function invite() {
  haptic('light');
  if (!state.link) return toast('Havola tayyor emas', 'bad');
  const text = "Ilonlar va Narvonlar o'ynaymizmi? Men bilan o'ynasang, menga mukofot ochiladi 🎁";
  const url = `https://t.me/share/url?url=${encodeURIComponent(state.link)}&text=${encodeURIComponent(text)}`;
  if (isTelegram()) window.Telegram.WebApp.openTelegramLink(url);
  else shareRoom('', text);
}

function copyLink() {
  if (!state.link) return toast('Havola tayyor emas', 'bad');
  navigator.clipboard?.writeText(state.link).then(
    () => toast('Havola nusxalandi'),
    () => toast(state.link),
  );
}

export { tgConfig };
