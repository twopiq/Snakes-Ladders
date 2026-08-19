/** Ilova markazi: ekranlar, oflayn o'yin, onlayn lobbi va ularning bog'lanishi. */

import { MAPS, getMap, mapSize } from '../shared/maps.js';
import { createGame, applyRoll, rollDice, DEFAULT_RULES, PLAYER_COLORS, MIN_PLAYERS, MAX_PLAYERS } from '../shared/engine.js';
import { GameView, escapeHtml } from './game-view.js';
import { OnlineClient } from './online.js';
import { loadShop, renderShop, equippedNow, onEquipChange, onOpenFriends } from './shop.js';
import { renderWardrobe, wardrobeLinks } from './wardrobe.js';
import { loadFriends, renderFriends, reportPlayed } from './friends.js';
import { renderMenuPromo, openTelegramApp, canPromote, telegramAppLink } from './promo.js';
import { sound } from './sound.js';
import {
  isTelegram, initTelegram, loadConfig, tgUserName, initData, startParam,
  shareRoom, showBackButton, setMainButton, setClosingConfirmation, appVersion, haptic,
} from './telegram.js';
import { $, $$, showScreen, toast, showModal, hideModal } from './ui.js';

const RULE_INFO = [
  { key: 'exactFinish', title: 'Finishga aniq tushish', note: 'Ortiqcha qadamlar orqaga qaytariladi' },
  { key: 'sixExtraTurn', title: '6 tashlasa — yana tashlaydi', note: "Qo'shimcha yurish huquqi" },
  { key: 'tripleSixPenalty', title: 'Ketma-ket 3 ta 6 — yurish bekor', note: 'Omadga qarshi muvozanat' },
  { key: 'specialCells', title: '★ bonus va ✖ tuzoq kataklari', note: 'Bonus qayta zar, tuzoq bir yurish' },
  { key: 'playToLast', title: "Barcha o'rinlar aniqlanguncha", note: "Birinchi g'olibdan keyin ham davom etadi", offlineOnly: true },
];

const S = {
  offline: {
    mapId: MAPS[0].id,
    count: 3,
    names: [],
    rules: { ...DEFAULT_RULES },
    config: null,
  },
  online: {
    mapId: MAPS[0].id,
    capacity: 2, // onlayn xonada 2 dan 4 gacha
    rules: { ...DEFAULT_RULES, playToLast: false },
    room: null,
    mySeat: null,
    inGame: false,
  },
  mode: null,
  state: null,
};

/** Ekranni almashtiradi va Telegram'ning "orqaga" tugmasini moslaydi. */
function goto(screenId) {
  showScreen(screenId);
  if (screenId === 'screen-shop') {
    renderShop();
    // Do'st chaqirish mukofoti ochilgan bo'lishi mumkin — ro'yxatni yangilaymiz
    loadShop().then(renderShop);
  }
  if (screenId === 'screen-friends') {
    renderFriends();
    loadFriends().then(renderFriends);
  }
  if (screenId === 'screen-wardrobe') {
    renderWardrobe();
    // Do'kondan yoki mukofotdan yangi narsa ochilgan bo'lishi mumkin
    loadShop().then(renderWardrobe);
  }
  showBackButton(screenId !== 'screen-menu');
  if (screenId !== 'screen-game') setMainButton({ show: false });
}

/**
 * Telegram'dagi "orqaga" tugmasi bosilganda.
 *
 * O'yin davom etayotgan bo'lsa darhol chiqarib yubormaymiz — tasdiq so'raymiz.
 * Telegram'da bu tugma ekranning burchagida turadi va tasodifan bosilib,
 * o'yindan chiqib ketish oson edi.
 */
function handleBack() {
  if (leaveAskOpen()) return hideModal(); // tasdiq oynasi ochiq edi — uni yopamiz
  if (inLiveGame()) return askLeave();
  if (S.mode) return leaveGame();
  goto('screen-menu');
}

/** Hozir tugallanmagan o'yin ichidamizmi? */
function inLiveGame() {
  if (!S.mode || !$('#screen-game').classList.contains('active')) return false;
  const state = S.mode === 'offline' ? S.state : S.online.room?.state;
  return state?.status === 'playing';
}

/**
 * Chiqishni tasdiqlash oynasi hozir ochiqmi?
 * Holatni alohida o'zgaruvchida saqlamaymiz — DOM dan o'qiymiz, shunda oyna
 * qanday yopilsa ham (fonga bosish, boshqa oyna ustiga chiqishi) belgi qolib ketmaydi.
 */
function leaveAskOpen() {
  return !$('#overlay').classList.contains('hidden') && Boolean($('#modal [data-act="leave"]'));
}

/** O'yindan chiqishdan oldin tasdiq so'raydi. */
function askLeave() {
  haptic('warning');
  const online = S.mode === 'online';
  showModal(`
    <h2>O'yindan chiqasizmi?</h2>
    <p>${online
      ? "O'yin davom etmoqda. Chiqsangiz o'rningiz bo'shaydi va qaytib kira olmaysiz — qolganlar davom etadi."
      : "O'yin davom etmoqda. Chiqsangiz joriy o'yin yo'qoladi."}</p>
    <div class="modal-actions">
      <button class="ghost" data-act="stay">Yo'q, davom etaman</button>
      <button class="primary danger" data-act="leave">Ha, chiqaman</button>
    </div>`, (act) => {
    hideModal();
    if (act === 'leave') leaveGame();
  });
}

/** Chiqish tugmalari uchun: kerak bo'lsa tasdiq so'raydi. */
function requestLeave() {
  if (inLiveGame()) return askLeave();
  leaveGame();
}

// ---------------------------------------------------------------- ko'rinish
const view = new GameView({
  onRoll: () => requestRoll(),
  // Sahifaga qaytganda (telefon ekrani yonganda) holatni serverdan qayta olamiz
  onVisible: () => {
    if (S.mode === 'online' && S.online.inGame) net.sync();
  },
  onRematch: () => (S.mode === 'offline' ? offlineRematch() : onlineRematch()),
  onLeave: () => requestLeave(),
  onTelegram: () => openTelegramApp(),
  onChat: (text) => {
    if (S.mode === 'online') net.chat(text);
  },
  // Telefonda qulay bo'lishi uchun zar tugmasini Telegram'ning pastki tugmasiga ham chiqaramiz
  onControls: ({ canRoll, label, finished }) => {
    setMainButton({
      show: true,
      text: finished ? "O'yin tugadi" : label,
      enabled: canRoll,
      onClick: () => requestRoll(),
    });
  },
});

/**
 * Zar tashlash so'rovi.
 * Onlaynda ulanish uzilgan bo'lsa — jim qolmaymiz: xabar beramiz va qayta ulanamiz.
 */
function requestRoll() {
  if (!view.canRoll()) return;
  if (S.mode === 'offline') return offlineRoll();
  if (!net.roll()) toast("Aloqa uzilgan — qayta ulanmoqda...", 'bad');
}

// ---------------------------------------------------------------- onlayn mijoz
const net = new OnlineClient({
  // Telegram ichida bo'lsak — imzolangan ma'lumot, server ismni o'zi tekshirib oladi
  identity: () => ({ initData: initData() }),
  onStatus: (text, kind) => setConn(text, kind),
  onJoined: (msg) => {
    S.online.mySeat = msg.seat;
    S.online.room = msg.room;
    hideModal();
    applyRoom(msg.room);
  },
  onRoom: (room, seat) => {
    if (typeof seat === 'number') S.online.mySeat = seat;
    applyRoom(room);
  },
  onRestart: (room, seat) => {
    if (typeof seat === 'number') S.online.mySeat = seat;
    S.online.inGame = false;
    applyRoom(room);
    toast("Yangi o'yin boshlandi");
  },
  onRoll: (msg) => {
    S.online.room = msg.room;
    if (typeof msg.seat === 'number') S.online.mySeat = msg.seat;
    view.mySeat = S.online.mySeat;
    if (msg.room?.state) view.update(msg.room.state, msg.events || []);
  },
  onChat: (msg) => view.addChat({ from: msg.from, text: msg.text, mine: msg.seat === S.online.mySeat }),
  onNotice: (text) => toast(text),
  onQueued: () => {
    showModal(`
      <h2>Raqib qidirilmoqda...</h2>
      <p>Boshqa o'yinchi "Raqib topish" tugmasini bosishi bilan o'yin boshlanadi.</p>
      <div class="modal-actions"><button class="ghost" data-act="cancel">Bekor qilish</button></div>`,
      (act) => {
        if (act === 'cancel') {
          hideModal();
          net.leave();
        }
      });
  },
  onLeft: () => {
    S.online.room = null;
    S.online.inGame = false;
    setClosingConfirmation(false);
    goto('screen-menu');
  },
  onError: (msg) => {
    hideModal();
    toast(msg, 'bad', 3600);
  },
  // Xona yo'qolgan (server qayta ishga tushgan) — o'yinni yopamiz
  onRoomGone: (msg) => {
    S.online.room = null;
    S.online.inGame = false;
    S.mode = null;
    hideModal();
    setClosingConfirmation(false);
    setMainButton({ show: false });
    goto('screen-online');
    toast(`${msg} — yangi xona oching`, 'bad', 5000);
  },
  onDisconnected: () => {
    if (S.mode === 'online' && S.online.inGame) toast('Aloqa uzildi — qayta ulanmoqda...', 'bad');
  },
});

// ---------------------------------------------------------------- boshlang'ich UI
async function init() {
  renderMenuMaps();
  renderMapList($('#offlineMaps'), 'offline');
  renderMapList($('#onlineMaps'), 'online');
  renderRules($('#offlineRules'), S.offline.rules, false);
  renderRules($('#onlineRules'), S.online.rules, true);
  renderPlayerInputs();

  for (const btn of $$('[data-goto]')) {
    btn.addEventListener('click', () => goto(btn.dataset.goto));
  }
  $('#brandBtn').addEventListener('click', handleBack);

  $('#playersMinus').addEventListener('click', () => changeCount(-1));
  $('#playersPlus').addEventListener('click', () => changeCount(1));
  $('#onlineMinus').addEventListener('click', () => changeOnlineCount(-1));
  $('#onlinePlus').addEventListener('click', () => changeOnlineCount(1));
  $('#startOffline').addEventListener('click', startOffline);

  $('#createRoom').addEventListener('click', createRoom);
  $('#joinRoom').addEventListener('click', joinRoom);
  $('#quickMatch').addEventListener('click', quickMatch);
  $('#joinCode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
  });

  const nameInput = $('#onlineName');
  nameInput.value = localStorage.getItem('il_name') || '';
  nameInput.addEventListener('change', () => localStorage.setItem('il_name', nameInput.value.trim()));

  $('#shopBtn').addEventListener('click', () => goto('screen-shop'));
  $('#friendsBtn').addEventListener('click', () => goto('screen-friends'));
  $('#mineBtn').addEventListener('click', () => goto('screen-wardrobe'));
  onOpenFriends(() => goto('screen-friends'));
  wardrobeLinks({ shop: () => goto('screen-shop'), friends: () => goto('screen-friends') });
  $('#helpBtn').addEventListener('click', showHelp);
  const soundBtn = $('#soundBtn');
  soundBtn.classList.toggle('off', !sound.enabled);
  soundBtn.addEventListener('click', () => {
    const on = sound.toggle();
    soundBtn.classList.toggle('off', !on);
    soundBtn.textContent = on ? '🔊' : '🔇';
  });
  soundBtn.textContent = sound.enabled ? '🔊' : '🔇';

  $('#overlay').addEventListener('click', (e) => {
    if (e.target.id === 'overlay') hideModal();
  });

  onEquipChange((equipped) => {
    view.board?.setSkins(equipped);
    if ($('#screen-wardrobe').classList.contains('active')) renderWardrobe();
  });

  await loadConfig();
  initTelegram({ onBack: handleBack });
  renderMenuPromo($('#menuPromo'));
  loadShop().then(() => {
    if ($('#screen-shop').classList.contains('active')) renderShop();
  });
  loadFriends();

  if (isTelegram()) {
    const name = tgUserName();
    if (name) {
      nameInput.value = name;
      nameInput.readOnly = true;
      nameInput.title = 'Ism Telegram profilingizdan olinadi';
      localStorage.setItem('il_name', name);
    }
  }

  // Taklif havolasi orqali kirilgan bo'lsa — to'g'ridan-to'g'ri xonaga
  const invited = startParam(); // taklif havolasi bo'lsa null qaytadi
  if (invited && invited.length === 4) {
    net.clearSession();
    S.mode = 'online';
    goto('screen-online');
    $('#joinCode').value = invited;
    toast('Xonaga qo\'shilmoqda...');
    net.join({ code: invited, name: myName() }).catch(() => toast('Serverga ulanib bo\'lmadi', 'bad'));
    return;
  }

  // Sahifa yangilangan bo'lsa, oldingi onlayn o'yinga qaytishga urinamiz
  if (net.session) {
    S.mode = 'online';
    net.tryRejoin().catch(() => net.clearSession());
  }
}

function renderMenuMaps() {
  $('#menuMaps').innerHTML = MAPS.map((m) => `
    <div class="map-chip">
      <b>${escapeHtml(m.name)}</b>
      <span>${m.cols}×${m.rows} = ${mapSize(m)} katak · ${Object.keys(m.ladders).length} narvon · ${Object.keys(m.snakes).length} ilon</span>
    </div>`).join('');
}

function renderMapList(root, which) {
  root.innerHTML = '';
  for (const m of MAPS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-option' + (S[which].mapId === m.id ? ' selected' : '');
    btn.dataset.id = m.id;
    btn.innerHTML = `
      <span class="thumb" style="background:linear-gradient(140deg, ${m.theme.accent}, ${m.theme.dark})">${m.cols}×${m.rows}</span>
      <span>
        <b>${escapeHtml(m.name)} · ${mapSize(m)} katak</b>
        <span>${escapeHtml(m.about)}</span>
      </span>`;
    btn.addEventListener('click', () => {
      S[which].mapId = m.id;
      for (const el of root.children) el.classList.toggle('selected', el.dataset.id === m.id);
    });
    root.appendChild(btn);
  }
}

function renderRules(root, rules, isOnline) {
  root.innerHTML = '';
  for (const info of RULE_INFO) {
    if (isOnline && info.offlineOnly) continue;
    const label = document.createElement('label');
    label.className = 'rule';
    label.innerHTML = `
      <input type="checkbox" ${rules[info.key] ? 'checked' : ''} />
      <span>${escapeHtml(info.title)}<small>${escapeHtml(info.note)}</small></span>`;
    label.querySelector('input').addEventListener('change', (e) => {
      rules[info.key] = e.target.checked;
    });
    root.appendChild(label);
  }
}

function changeCount(delta) {
  S.offline.count = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, S.offline.count + delta));
  $('#playersCount').textContent = S.offline.count;
  renderPlayerInputs();
}

/** Onlayn xona sig'imi: 2 dan 4 gacha. */
function changeOnlineCount(delta) {
  S.online.capacity = Math.max(2, Math.min(4, S.online.capacity + delta));
  $('#onlineCount').textContent = S.online.capacity;
}

function renderPlayerInputs() {
  const root = $('#playerInputs');
  const saved = [...root.querySelectorAll('input')].map((i) => i.value);
  root.innerHTML = '';
  for (let i = 0; i < S.offline.count; i++) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <span class="swatch" style="background:${PLAYER_COLORS[i].hex}"></span>
      <input class="text-input" maxlength="16" placeholder="${PLAYER_COLORS[i].name} o'yinchi" />`;
    const input = row.querySelector('input');
    input.value = saved[i] ?? S.offline.names[i] ?? '';
    input.addEventListener('input', () => {
      S.offline.names[i] = input.value;
    });
    root.appendChild(row);
  }
  $('#playersCount').textContent = S.offline.count;
}

// ---------------------------------------------------------------- oflayn
/** Taxta ochilgach kiyilgan ko'rinishlarni qo'llaydi. */
function applySkins() {
  view.board?.setSkins(equippedNow());
}

function startOffline() {
  const inputs = [...$('#playerInputs').querySelectorAll('input')];
  const players = inputs.map((input, i) => ({
    id: `p${i + 1}`,
    name: input.value.trim() || `${PLAYER_COLORS[i].name} o'yinchi`,
    colorId: PLAYER_COLORS[i].id,
  }));

  S.offline.config = { mapId: S.offline.mapId, players, rules: { ...S.offline.rules } };
  S.mode = 'offline';
  S.state = createGame(S.offline.config);
  goto('screen-game');
  setClosingConfirmation(true);
  view.open({ state: S.state, mode: 'offline' });
  applySkins();
  reportPlayed();
}

function offlineRoll() {
  if (!S.state || S.state.status !== 'playing') return;
  const dice = rollDice();
  const { state, events } = applyRoll(S.state, dice);
  S.state = state;
  view.update(state, events);
}

function offlineRematch() {
  hideModal();
  if (!S.offline.config) return goto('screen-offline');
  S.state = createGame(S.offline.config);
  view.open({ state: S.state, mode: 'offline' });
  applySkins();
}

// ---------------------------------------------------------------- onlayn
function myName() {
  const name = $('#onlineName').value.trim();
  if (name) localStorage.setItem('il_name', name);
  return name || 'Mehmon';
}

async function createRoom() {
  S.mode = 'online';
  try {
    await net.create({
      name: myName(), mapId: S.online.mapId, rules: S.online.rules, capacity: S.online.capacity,
    });
  } catch {
    toast('Serverga ulanib bo\'lmadi', 'bad');
  }
}

async function joinRoom() {
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length !== 4) return toast('Xona kodi 4 ta belgidan iborat', 'bad');
  S.mode = 'online';
  try {
    await net.join({ code, name: myName() });
  } catch {
    toast('Serverga ulanib bo\'lmadi', 'bad');
  }
}

async function quickMatch() {
  S.mode = 'online';
  try {
    await net.quick({ name: myName(), mapId: S.online.mapId, rules: S.online.rules });
  } catch {
    toast('Serverga ulanib bo\'lmadi', 'bad');
  }
}

/** Serverdan kelgan xona holatini ekranga tushirish. */
function applyRoom(room) {
  if (!room) return;
  S.online.room = room;
  S.mode = 'online';

  if (!room.state || room.players.length < 2) {
    showWaitingRoom(room);
    return;
  }

  hideModal();
  if (!S.online.inGame) {
    S.online.inGame = true;
    goto('screen-game');
    setClosingConfirmation(true);
    view.open({ state: room.state, mode: 'online', mySeat: S.online.mySeat, roomCode: room.code });
    applySkins();
    reportPlayed();
    for (const msg of room.chat || []) {
      view.addChat({ from: msg.from, text: msg.text, mine: msg.seat === S.online.mySeat });
    }
  } else {
    view.mySeat = S.online.mySeat;
    view.update(room.state, []);
  }

  const offlinePeer = room.players.find((p) => !p.online);
  if (offlinePeer) $('#rollHint').textContent = `${offlinePeer.name} aloqadan uzilgan...`;
}

function showWaitingRoom(room) {
  const capacity = room.capacity || 2;
  const list = room.players.map((p) => `${escapeHtml(p.name)}${p.online ? '' : ' (uzilgan)'}`).join(', ');
  const iAmHost = S.online.mySeat === 0;
  const canStart = iAmHost && room.canStartEarly;

  showModal(`
    <h2>Xona tayyor</h2>
    <p>Do'stlaringizga shu kodni yuboring — ular "Kod bilan qo'shilish" bo'limiga kiritadi.</p>
    <div class="code-big" data-act="copy" title="Nusxalash">${room.code}</div>
    <p>Xarita: <b>${escapeHtml(getMap(room.mapId).name)}</b><br>
    O'yinchilar (${room.players.length}/${capacity}): ${list}</p>
    ${canStart ? '<p class="muted">Hamma yig\'ilishini kutmasdan boshlasangiz ham bo\'ladi.</p>' : ''}
    <div class="modal-actions">
      ${canStart ? '<button class="primary" data-act="start">Hozir boshlash</button>' : ''}
      <button class="primary" data-act="invite">Do'stni chaqirish</button>
      <button class="ghost" data-act="copy">Kodni nusxalash</button>
      ${canPromote() ? '<button class="ghost" data-act="tg-invite">Telegram havolasi</button>' : ''}
      <button class="ghost" data-act="cancel">Bekor qilish</button>
    </div>`, (act) => {
    if (act === 'start') {
      net.start();
      return;
    }
    if (act === 'tg-invite') {
      const link = telegramAppLink(room.code);
      navigator.clipboard?.writeText(link).then(
        () => toast('Telegram havolasi nusxalandi'),
        () => toast(link),
      );
    }
    if (act === 'invite') {
      const how = shareRoom(room.code);
      if (how === 'clipboard') toast('Taklif havolasi nusxalandi');
    }
    if (act === 'copy') {
      navigator.clipboard?.writeText(room.code).then(() => toast('Kod nusxalandi'), () => toast(`Kod: ${room.code}`));
    }
    if (act === 'cancel') {
      hideModal();
      net.leave();
      goto('screen-online');
    }
  });
}

function onlineRematch() {
  hideModal();
  net.rematch();
  toast("Qayta o'ynash so'raldi — raqib tasdiqlashi kerak");
}

// ---------------------------------------------------------------- umumiy
function leaveGame() {
  if (S.mode === 'online') {
    net.leave();
    S.online.inGame = false;
    S.online.room = null;
  }
  S.mode = null;
  S.state = null;
  hideModal();
  setClosingConfirmation(false);
  setMainButton({ show: false });
  goto('screen-menu');
}

function setConn(text, kind) {
  const el = $('#connStatus');
  el.textContent = text;
  el.className = `conn-status ${kind || ''}`;
}

function showHelp() {
  showModal(`
    <h2>Qoidalar</h2>
    <ul>
      <li>Har bir o'yinchi navbat bilan zar tashlaydi va donasini shuncha katak oldinga suradi.</li>
      <li><b>Narvon</b> (🪜 yashil) tepasiga ko'taradi, <b>ilon</b> (🐍) boshiga tushsangiz dumigacha tushirasiz.</li>
      <li><b>★ bonus</b> katak qo'shimcha zar beradi, <b>✖ tuzoq</b> katak bir yurishni o'tkazib yuboradi.</li>
      <li>6 tashlagan o'yinchi yana zar tashlaydi. Ketma-ket 3 ta 6 — yurish bekor bo'ladi.</li>
      <li>Finishga aniq tushish kerak: ortiqcha qadamlar orqaga qaytaradi.</li>
      <li>Birinchi bo'lib oxirgi katakka yetgan o'yinchi g'olib.</li>
    </ul>
    <h2 style="font-size:17px;margin-top:18px">Rejimlar</h2>
    <ul>
      <li><b>Onlayn:</b> 2 dan 4 kishigacha, real vaqtda. Xona kodi yoki tezkor juftlash orqali. Aloqa uzilsa 60 soniya ichida qaytish mumkin.</li>
      <li><b>Oflayn:</b> bitta qurilmada 2–6 kishi navbat bilan.</li>
    </ul>
    <p style="margin-top:14px">Zar tashlash uchun <b>Bo'sh joy</b> tugmasini ham bosish mumkin.</p>
    <p class="muted" style="font-size:11px">Versiya: ${escapeHtml(appVersion() || '—')}</p>
    <div class="modal-actions"><button class="primary" data-act="ok">Tushunarli</button></div>`,
    () => hideModal());
}

init();
