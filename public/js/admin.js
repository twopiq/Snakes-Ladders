/**
 * Admin paneli: ko'rinishlar narxini o'zgartirish, sotuvdan olish,
 * xaridlar hisoboti va yulduzlarni qaytarish.
 *
 * Kalit sessionStorage'da turadi va har so'rovda x-admin-key sarlavhasida yuboriladi.
 */

import { $, toast } from './ui.js';
import { SLOT_NAMES, RARITY } from '../shared/cosmetics.js';

const SLOT_LABEL = { ...SLOT_NAMES, bundle: "To'plam" };
let key = sessionStorage.getItem('il_admin_key') || '';

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

function render({ items, stats, starsEnabled }) {
  $('#stats').innerHTML = `
    <div class="stat"><b>${stats.starsTotal}</b><span>⭐ jami tushum</span></div>
    <div class="stat"><b>${stats.purchases}</b><span>xarid</span></div>
    <div class="stat"><b>${stats.users}</b><span>o'yinchi</span></div>
    <div class="stat"><b>${stats.refunds}</b><span>qaytarilgan</span></div>
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

function bind() {
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

$('#loginBtn').addEventListener('click', login);
$('#key').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

if (key) {
  $('#key').value = key;
  login();
}
