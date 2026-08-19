/**
 * "Do'stlar" ekrani — taklif havolasi va mukofotlar.
 *
 * Mukofot ko'rinishlari yulduz bilan sotilmaydi: ularni faqat do'st chaqirib olish
 * mumkin (3, 5, 7, 10 ta do'st). Do'st "hisoblanadi" — havoladan kirib, kamida
 * bitta o'yin boshlaganda (shunchaki havolani ochish yetarli emas).
 */

import { REFERRAL_TIERS, getItem, RARITY } from '../shared/cosmetics.js';
import { isTelegram, initData, shareRoom, haptic, tgConfig, pendingRef, settleRef } from './telegram.js';
import { canPromote, openTelegramApp, telegramAppLink } from './promo.js';
import { $, toast } from './ui.js';
import { escapeHtml } from './game-view.js';
import { drawItemPreview } from './preview.js';
import { t, itemText } from '../shared/i18n.js';

const state = { confirmed: 0, pending: 0, rewards: [], link: null, tgId: null, loaded: false };

export const referralState = () => state;

/** Serverdan do'stlar ma'lumotini oladi (faqat Telegram ichida). */
export async function loadFriends() {
  if (!isTelegram() || !initData()) return state;
  try {
    const res = await fetch('/api/shop/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Bu ekran ham taklifni biriktirishga urinadi — do'kon so'rovi yo'qolgan bo'lsa
      body: JSON.stringify({ initData: initData(), ref: pendingRef() }),
    });
    if (!res.ok) return state;
    const data = await res.json();
    settleRef(data.ref);
    Object.assign(state, data.referral, {
      tgId: data.tgId,
      // Server havolani yasay olmasa (bot nomi noma'lum) — mijoz tomonda urinib ko'ramiz
      link: data.link || telegramAppLink(`r${data.tgId}`),
      loaded: true,
    });
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
      // Taklif hali biriktirilmagan bo'lsa — oxirgi imkoniyat
      body: JSON.stringify({ initData: initData(), ref: pendingRef() }),
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
        <h3>${t('friends.openFail')}</h3>
        <p class="muted">${t('friends.openFailText')}</p>
        <p class="muted" style="font-family:ui-monospace,monospace;font-size:11px">${escapeHtml(String(err.message || err))}</p>
      </div>`;
  }
}

function renderFriendsInner(root) {

  if (!isTelegram()) {
    root.innerHTML = `
      <div class="panel">
        <h3>${t('friends.siteTitle')}</h3>
        <p class="muted">${t('friends.siteText')}</p>
        ${canPromote() ? `<button class="primary big" data-open-tg="1">${t('common.openInTelegram')}</button>` : ''}
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
        <span>${t('friends.played')}${state.pending ? ` · ${t('friends.pending', { n: state.pending })}` : ''}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
      <p class="muted">${next
        ? t('friends.next', { n: next.count - state.confirmed })
        : t('friends.allDone')}</p>
      ${state.link ? `
        <button class="primary big" data-invite="1">${t('friends.invite')}</button>
        <button class="ghost big" data-copy="1">${t('friends.copyLink')}</button>
        <p class="link-box">${escapeHtml(state.link)}</p>
      ` : `
        <p class="conn-status bad">${t('friends.linkNotReady')}</p>
      `}
      <p class="muted" style="margin-top:12px">${t('friends.rule')}</p>
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
          <span class="reward-tier">${escapeHtml(t('friends.tier', { n: tier.count }))}</span>
          <b>${escapeHtml(itemText(item))}</b>
          <span class="rarity" style="color:${rarity.color}">${escapeHtml(t(`rarity.${item.rarity}`))}</span>
          <small>${escapeHtml(itemText(item, 'about'))}</small>
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
  if (!state.link) return toast(t('friends.linkNotReadyShort'), 'bad');
  const text = t('friends.inviteText');
  const url = `https://t.me/share/url?url=${encodeURIComponent(state.link)}&text=${encodeURIComponent(text)}`;
  if (isTelegram()) window.Telegram.WebApp.openTelegramLink(url);
  else shareRoom('', text);
}

function copyLink() {
  if (!state.link) return toast(t('friends.linkNotReadyShort'), 'bad');
  navigator.clipboard?.writeText(state.link).then(
    () => toast(t('msg.linkCopied')),
    () => toast(state.link),
  );
}

export { tgConfig };
