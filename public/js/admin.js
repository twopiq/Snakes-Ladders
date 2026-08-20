/**
 * Admin paneli: ko'rinishlar narxini o'zgartirish, sotuvdan olish,
 * xaridlar hisoboti va yulduzlarni qaytarish.
 *
 * Kalit sessionStorage'da turadi va har so'rovda x-admin-key sarlavhasida yuboriladi.
 */

import { $, toast } from './ui.js';
import { SLOT_NAMES, RARITY, getItem } from '../shared/cosmetics.js';

const SLOT_LABEL = { ...SLOT_NAMES, bundle: "To'plam" };
let key = sessionStorage.getItem('il_admin_key') || '';
let catalog = [];   // oxirgi yuklangan katalog (sovg'a ro'yxati uchun)
let allUsers = [];  // oxirgi yuklangan o'yinchilar (qidiruv mijozda ishlaydi)

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Xatolik (${res.status})`);
  return data;
}

async function login() {
  key = $('#key').value.trim();
  if (!key) return;
  try {
    const data = await api('/api/admin/overview');
    sessionStorage.setItem('il_admin_key', key);
    $('#loginBox').classList.add('hidden');
    $('#panel').classList.remove('hidden');
    render(data);
  } catch (err) {
    $('#loginMsg').textContent = err.message;
    $('#loginMsg').className = 'conn-status bad';
  }
}

async function refresh() {
  try {
    render(await api('/api/admin/overview'));
  } catch (err) {
    toast(err.message, 'bad');
  }
}

function render({ items, stats, users, starsEnabled, telegram, storage }) {
  catalog = items;
  allUsers = users?.shown || [];
  renderDiagnostics(telegram, starsEnabled, storage);
  renderGiftForm(items);
  renderUsers(users);
  renderGifts(stats.gifts || []);
  $('#stats').innerHTML = `
    <div class="stat"><b>${stats.starsTotal}</b><span>⭐ jami tushum</span></div>
    <div class="stat"><b>${stats.purchases}</b><span>xarid</span></div>
    <div class="stat"><b>${stats.users}</b><span>o'yinchi</span></div>
    <div class="stat"><b>${stats.refunds}</b><span>qaytarilgan</span></div>
    <div class="stat"><b>${stats.referrals?.confirmed ?? 0}</b><span>tasdiqlangan taklif</span></div>
    <div class="stat ${starsEnabled ? 'ok' : 'warn'}">
      <b>${starsEnabled ? 'Yoqilgan' : "O'chiq"}</b><span>Stars to'lovi</span>
    </div>`;

  const sold = stats.byItem || {};
  $('#priceTable').innerHTML = items.filter((i) => i.basePrice > 0).map((item) => {
    const s = sold[item.id] || { count: 0, stars: 0 };
    const changed = item.price !== item.basePrice;
    return `
      <div class="price-row ${item.disabled ? 'off' : ''}">
        <div class="pr-name">
          <b>${item.name}</b>
          <small>${SLOT_LABEL[item.slot] || item.slot} · <span style="color:${(RARITY[item.rarity] || {}).color}">${(RARITY[item.rarity] || {}).name || item.rarity}</span></small>
        </div>
        <div class="pr-sold"><b>${s.count}</b><small>${s.stars} ⭐</small></div>
        <div class="pr-price">
          <input class="text-input" type="number" min="1" max="100000" step="1" value="${item.price}" data-price="${item.id}" />
          <small>katalog: ${item.basePrice} ${changed ? '· <b>qo\'lda o\'rnatilgan</b>' : ''}</small>
        </div>
        <div class="pr-actions">
          <button class="primary" data-save="${item.id}">Saqlash</button>
          ${changed ? `<button class="ghost" data-reset="${item.id}">Qaytarish</button>` : ''}
          <button class="ghost" data-toggle="${item.id}" data-off="${item.disabled ? '0' : '1'}">
            ${item.disabled ? 'Sotuvga qaytarish' : 'Sotuvdan olish'}
          </button>
        </div>
      </div>`;
  }).join('');

  $('#purchases').innerHTML = stats.recent.length
    ? stats.recent.map((p) => `
      <div class="purchase ${p.refunded ? 'refunded' : ''}">
        <div>
          <b>${p.itemId}</b>
          <small>${p.name || p.tgId} · ${new Date(p.at).toLocaleString('uz')}</small>
          <small class="charge">${p.chargeId}</small>
        </div>
        <div class="p-stars">${p.stars} ⭐</div>
        <div>${p.refunded
          ? '<span class="muted" style="margin:0">qaytarilgan</span>'
          : `<button class="ghost" data-refund="${p.chargeId}">Qaytarish</button>`}</div>
      </div>`).join('')
    : '<p class="muted">Hozircha xarid yo\'q.</p>';

  bind();
}

/** Telegram sozlamasi to'g'rimi — eng ko'p uchraydigan xatolarni ko'rsatadi. */
function renderDiagnostics(tg = {}, starsEnabled, storage = {}) {
  const box = document.getElementById('diag');
  if (!box) return;

  const rows = [];
  rows.push(tg.tokenSet
    ? ['ok', 'BOT_TOKEN', "o'rnatilgan"]
    : ['bad', 'BOT_TOKEN', "yo'q — do'kon va imzo tekshiruvi ishlamaydi"]);

  if (tg.tokenSet) {
    rows.push(tg.botUsername
      ? ['ok', 'Token qaysi botniki', `@${tg.botUsername}`]
      : ['bad', 'Token qaysi botniki', "Telegram'ga ulanib bo'lmadi (token noto'g'ri yoki tarmoq yopiq)"]);
  }
  if (tg.configuredUsername) {
    rows.push(tg.mismatch
      ? ['bad', 'BOT_USERNAME', `@${tg.configuredUsername} — token boshqa botniki! Mini App shu botga ulanganiga ishonch hosil qiling`]
      : ['ok', 'BOT_USERNAME', `@${tg.configuredUsername}`]);
  } else {
    rows.push(['warn', 'BOT_USERNAME', "yo'q — saytdan Telegram'ga yo'naltirish ishlamaydi"]);
  }
  rows.push(tg.appShortName
    ? ['ok', 'APP_SHORT_NAME', tg.appShortName]
    : ['warn', 'APP_SHORT_NAME', "yo'q — havolalar bot chati orqali ochiladi (?start=)"]);
  rows.push(tg.inviteBase
    ? ['ok', 'Taklif havolasi', `${tg.inviteBase}r&lt;id&gt;`]
    : ['bad', 'Taklif havolasi', "yasab bo'lmaydi — do'st chaqirish ishlamaydi"]);
  rows.push(starsEnabled
    ? ['ok', "Stars to'lovi", 'yoqilgan']
    : ['bad', "Stars to'lovi", "o'chiq (BOT_TOKEN yoki bot ulanmagan)"]);
  rows.push(storage.persistent
    ? ['ok', 'Ma\'lumot saqlanishi', `DATA_DIR: ${esc(storage.file || '')}`]
    : ['warn', 'Ma\'lumot saqlanishi',
       "DATA_DIR sozlanmagan — disk vaqtinchalik. Doimiy disk ulasangiz DATA_DIR ni ko'rsating "
       + "yoki pastdagi Telegram zaxirasini yoqing."]);

  const bk = storage.backup || {};
  rows.push(bk.enabled
    ? [bk.error ? 'warn' : 'ok', 'Telegram zaxirasi',
       `chat <code>${esc(bk.chatId)}</code> · ${bk.lastAt ? `oxirgi nusxa: ${new Date(bk.lastAt).toLocaleString('uz')}` : 'hali yuborilmagan'}${bk.error ? ` · <b>${esc(bk.error)}</b>` : ''}`]
    : ['bad', 'Telegram zaxirasi',
       "o'chiq — BACKUP_CHAT_ID sozlanmagan. Yoqilmasa, server qayta ishga tushganda "
       + "xaridlar va do'st hisobi <b>o'chib ketadi</b>. Botga /id yozib chat raqamingizni oling."]);

  box.innerHTML = `<h3>Telegram holati</h3>` + rows.map(([k, name, val]) => `
    <div class="diag-row ${k}">
      <span>${k === 'ok' ? '✅' : k === 'warn' ? '⚠️' : '❌'}</span>
      <b>${name}</b>
      <span>${val}</span>
    </div>`).join('');
}

/** Sovg'a formasidagi ko'rinishlar ro'yxati. */
function renderGiftForm(items) {
  const sel = document.getElementById('giftItem');
  if (!sel) return;
  const keep = sel.value;
  const group = (label, list) => list.length
    ? `<optgroup label="${esc(label)}">${list.map((i) => `
        <option value="${esc(i.id)}">${esc(i.name)}${i.price ? ` — ${i.price} ⭐` : i.unlock ? ' — mukofot' : ' — bepul'}</option>`).join('')}</optgroup>`
    : '';
  sel.innerHTML = ['token', 'ladder', 'snake', 'board', 'bundle']
    .map((slot) => group(SLOT_LABEL[slot] || slot, items.filter((i) => i.slot === slot)))
    .join('');
  if (keep) sel.value = keep;
}

/** O'yinchilar ro'yxati — ID ni bosib sovg'a formasiga qo'yish mumkin. */
function renderUsers(users) {
  const root = document.getElementById('userList');
  if (!root) return;
  const q = (document.getElementById('userSearch')?.value || '').trim().toLowerCase();
  const rows = allUsers.filter((u) => !q || u.tgId.includes(q) || (u.name || '').toLowerCase().includes(q));

  const total = document.getElementById('userTotal');
  if (total) total.textContent = users ? `— jami ${users.total} ta` : '';

  root.innerHTML = rows.length ? rows.map((u) => `
    <div class="user-row">
      <div class="u-main">
        <b>${esc(u.name || 'Ismsiz')}</b>
        <small><code>${esc(u.tgId)}</code> · ${u.played ? "o'ynagan" : "hali o'ynamagan"}${
          u.starsSpent ? ` · ${u.starsSpent} ⭐` : ''}${
          u.invitedConfirmed ? ` · ${u.invitedConfirmed} ta do'st` : ''}${
          u.invitedPending ? ` (+${u.invitedPending} kutilmoqda)` : ''}</small>
      </div>
      <div class="u-actions">
        <button class="ghost" data-pick="${esc(u.tgId)}">Tanlash</button>
        <button class="ghost" data-items="${esc(u.tgId)}">Ko'rinishlari (${u.owned})</button>
      </div>
      <div class="u-items hidden" data-items-for="${esc(u.tgId)}">${u.items.map((id) => `
        <span class="u-item">${esc(getItem(id)?.name || id)}
          <button class="link-btn" data-revoke="${esc(id)}" data-user="${esc(u.tgId)}" title="Olib qo'yish">✕</button>
        </span>`).join('')}</div>
    </div>`).join('')
    : '<p class="muted">Mos o\'yinchi topilmadi.</p>';
}

function renderGifts(gifts) {
  const root = document.getElementById('gifts');
  if (!root) return;
  root.innerHTML = gifts.length ? gifts.map((g) => `
    <div class="purchase ${g.revoked ? 'refunded' : ''}">
      <div>
        <b>${esc(getItem(g.itemId)?.name || g.itemId)}</b>
        <small>${esc(g.tgId)} · ${new Date(g.at).toLocaleString('uz')}${g.added ? '' : ' · allaqachon bor edi'}</small>
      </div>
      <div class="p-stars">bepul</div>
      <div>${g.revoked
        ? '<span class="muted" style="margin:0">olib qo\'yilgan</span>'
        : `<button class="ghost" data-revoke="${esc(g.itemId)}" data-user="${esc(g.tgId)}">Olib qo'yish</button>`}</div>
    </div>`).join('')
    : '<p class="muted">Hozircha sovg\'a berilmagan.</p>';
}

async function gift() {
  const tgId = $('#giftId').value.trim();
  const itemId = $('#giftItem').value;
  const msg = $('#giftMsg');
  msg.textContent = '';
  msg.className = 'conn-status';
  if (!/^\d{3,20}$/.test(tgId)) {
    msg.textContent = "Telegram ID faqat raqamlardan iborat bo'lishi kerak";
    msg.className = 'conn-status bad';
    return;
  }
  try {
    const res = await api('/api/admin/grant', { tgId, itemId, notify: $('#giftNotify').checked });
    msg.className = 'conn-status ok';
    msg.textContent = res.added
      ? `${res.itemName} berildi${res.notified ? ' va xabar yuborildi' : ''}`
      : `${res.itemName} bu o'yinchida allaqachon bor edi`;
    toast(`${res.itemName} → ${tgId}`);
    refresh();
  } catch (err) {
    msg.className = 'conn-status bad';
    msg.textContent = err.message;
  }
}

function bind() {
  for (const btn of document.querySelectorAll('[data-backup]')) {
    btn.addEventListener('click', async () => {
      const restore = btn.dataset.backup === 'restore';
      if (restore && !confirm('Zaxiradagi nusxa hozirgi ma\'lumotlarni almashtiradi. Davom etamizmi?')) return;
      btn.disabled = true;
      try {
        const res = await api('/api/admin/backup', { restore });
        toast(restore ? `Tiklandi: ${res.users} ta o'yinchi` : 'Zaxira yuborildi');
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      } finally {
        btn.disabled = false;
      }
    });
  }
  for (const btn of document.querySelectorAll('[data-pick]')) {
    btn.addEventListener('click', () => {
      $('#giftId').value = btn.dataset.pick;
      $('#giftId').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  for (const btn of document.querySelectorAll('[data-items]')) {
    btn.addEventListener('click', () => {
      document.querySelector(`[data-items-for="${btn.dataset.items}"]`)?.classList.toggle('hidden');
    });
  }
  for (const btn of document.querySelectorAll('[data-revoke]')) {
    btn.addEventListener('click', async () => {
      const { revoke, user } = btn.dataset;
      if (!confirm(`${getItem(revoke)?.name || revoke} — ${user} dan olib qo'yilsinmi?`)) return;
      try {
        const res = await api('/api/admin/revoke', { tgId: user, itemId: revoke });
        toast(res.removed ? `${res.itemName} olib qo'yildi` : 'Bu o\'yinchida yo\'q edi');
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
  for (const btn of document.querySelectorAll('[data-save]')) {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.save;
      const input = document.querySelector(`[data-price="${id}"]`);
      const stars = Number(input.value);
      try {
        await api('/api/admin/price', { itemId: id, stars });
        toast(`${id}: yangi narx ${stars} ⭐`);
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
  for (const btn of document.querySelectorAll('[data-reset]')) {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/price', { itemId: btn.dataset.reset, stars: null });
        toast(`Katalog narxiga qaytdi: ${res.price} ⭐`);
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
  for (const btn of document.querySelectorAll('[data-toggle]')) {
    btn.addEventListener('click', async () => {
      try {
        await api('/api/admin/disabled', { itemId: btn.dataset.toggle, disabled: btn.dataset.off === '1' });
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
  for (const btn of document.querySelectorAll('[data-refund]')) {
    btn.addEventListener('click', async () => {
      if (!confirm('Yulduzlarni qaytarasizmi? Narsa o\'yinchidan olib qo\'yiladi.')) return;
      try {
        await api('/api/admin/refund', { chargeId: btn.dataset.refund });
        toast('Qaytarildi');
        refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
}

document.getElementById('giftBtn')?.addEventListener('click', gift);
document.getElementById('userSearch')?.addEventListener('input', () => {
  renderUsers(null);
  bind();
});

$('#loginBtn').addEventListener('click', login);
$('#key').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

if (key) {
  $('#key').value = key;
  login();
}
