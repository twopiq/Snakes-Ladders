/**
 * O'yin ekrani: taxta, zar, o'yinchilar paneli, jurnal, chat va animatsiyalar.
 * Rejimga bog'liq emas — oflayn ham, onlayn ham shu ko'rinishdan foydalanadi.
 */

import { Board } from './board.js';
import { getMap } from '../shared/maps.js';
import { stepPath } from '../shared/engine.js';
import { sound } from './sound.js';
import { haptic } from './telegram.js';
import { promoModalHtml } from './promo.js';
import { $, toast, showModal, hideModal } from './ui.js';

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export class GameView {
  constructor(handlers = {}) {
    this.on = handlers;
    this.mode = 'offline';
    this.state = null;
    this.mySeat = null;
    this.board = null;
    this.animating = false;
    this.gen = 0; // har bir yangi o'yin/ochilishda oshadi — eski animatsiyalar bekor bo'ladi
    this.resultsShown = false;

    // Animatsiya navbati.
    //   serverState  — serverdan kelgan eng oxirgi holat (tugma shunga qarab yonadi);
    //   pending      — hali ko'rsatilmagan holat; yangisi eskisining o'rniga tushadi;
    //   skip         — ketayotgan animatsiyani tez yakunlash belgisi.
    // Shu tufayli navbat ortda qolib ketmaydi: 4 kishilik o'yinda ham ekran
    // serverdan ko'pi bilan bitta yurishga orqada bo'ladi.
    this.serverState = null;
    this.pending = null;
    this.skip = false;
    this.running = false;
    this.loop = Promise.resolve();

    this.el = {
      canvas: $('#board'),
      wrap: $('#boardWrap'),
      turnName: $('#turnName'),
      turnBox: $('#turnBox'),
      dice: $('#dice'),
      rollBtn: $('#rollBtn'),
      rollHint: $('#rollHint'),
      players: $('#playersPanel'),
      log: $('#log'),
      mapBadge: $('#mapBadge'),
      roomBadge: $('#roomBadge'),
      chatTab: $('#chatTab'),
      chatPane: $('#chatPane'),
      chatList: $('#chatList'),
      chatForm: $('#chatForm'),
      chatInput: $('#chatInput'),
      rematchBtn: $('#rematchBtn'),
      toMenuBtn: $('#toMenuBtn'),
      leaveBtn: $('#leaveGame'),
    };

    this.el.rollBtn.addEventListener('click', () => {
      if (!this.canRoll()) return;
      this.on.onRoll?.();
    });
    this.el.rematchBtn.addEventListener('click', () => this.on.onRematch?.());
    this.el.toMenuBtn.addEventListener('click', () => this.on.onLeave?.());
    this.el.leaveBtn.addEventListener('click', () => this.on.onLeave?.());

    this.el.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.el.chatInput.value.trim();
      if (!text) return;
      this.on.onChat?.(text);
      this.el.chatInput.value = '';
    });

    for (const tab of document.querySelectorAll('.tab')) {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    }

    this.el.roomBadge.addEventListener('click', () => {
      const code = this.el.roomBadge.dataset.code;
      if (!code) return;
      navigator.clipboard?.writeText(code).then(
        () => toast('Xona kodi nusxalandi: ' + code),
        () => toast('Kod: ' + code),
      );
    });

    window.addEventListener('resize', () => this.board?.resize());

    // Telefon ekrani o'chib-yonganda yoki boshqa ilovadan qaytganda:
    // qotib qolgan animatsiyani yopamiz va holatni serverdan qayta so'raymiz.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (this.animating) this.forceFinish();
      this.on.onVisible?.();
    });

    // Bo'sh joy / Enter bilan zar tashlash
    document.addEventListener('keydown', (e) => {
      if ($('#screen-game').classList.contains('active') === false) return;
      if (e.target.matches('input, textarea')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (this.canRoll()) this.on.onRoll?.();
      }
    });
  }

  /** O'yin ekranini ochadi va taxtani quradi. */
  open({ state, mode, mySeat = null, roomCode = null }) {
    // Oldingi o'yindan qolgan animatsiya yangi o'yin ustiga chizmasligi uchun
    this.gen++;
    this.animating = false;
    this.pending = null;
    this.skip = false;
    this.resultsShown = false;

    this.mode = mode;
    this.state = state;
    this.serverState = state;
    this.mySeat = mySeat;
    const map = getMap(state.mapId);

    if (!this.board) this.board = new Board(this.el.canvas, map);
    else this.board.setMap(map);

    this.board.tokens.clear();
    this.board.setPlayers(state.players);
    this.el.mapBadge.textContent = `${map.name} · ${state.size} katak`;

    if (mode === 'online' && roomCode) {
      this.el.roomBadge.textContent = `Xona: ${roomCode}`;
      this.el.roomBadge.dataset.code = roomCode;
      this.el.roomBadge.classList.remove('hidden');
      this.el.chatTab.classList.remove('hidden');
    } else {
      this.el.roomBadge.classList.add('hidden');
      this.el.chatTab.classList.add('hidden');
      this.switchTab('log');
    }

    this.el.chatList.innerHTML = '';
    this.setDice(null);
    this.render();
    requestAnimationFrame(() => this.board.resize());
  }

  switchTab(name) {
    for (const tab of document.querySelectorAll('.tab')) {
      tab.classList.toggle('active', tab.dataset.tab === name);
    }
    this.el.log.classList.toggle('hidden', name !== 'log');
    this.el.chatPane.classList.toggle('hidden', name !== 'chat');
  }

  /**
   * Zar tashlash mumkinmi?
   *
   * Onlaynda navbat serverdan kelgan eng oxirgi holat bo'yicha aniqlanadi —
   * animatsiya biroz orqada qolsa ham tugma darhol yonadi. Oflaynda esa bitta
   * qurilma bo'lgani uchun animatsiya tugamaguncha kutamiz (tasodifan ikki
   * marta bosilib, navbat sakrab ketmasin).
   */
  canRoll() {
    const st = this.mode === 'online' ? (this.serverState || this.state) : this.state;
    if (!st || st.status !== 'playing') return false;
    if (this.mode === 'online') return st.turn === this.mySeat;
    return !this.animating;
  }

  /**
   * Yangi holatni qo'llaydi. events berilsa — avval animatsiya, keyin render.
   * Chaqiruvlar navbat bilan bajariladi (animatsiyalar ustma-ust tushmaydi).
   */
  update(state, events = []) {
    this.serverState = state;
    // Eski, hali ko'rsatilmagan holat yangisi bilan almashtiriladi — navbat o'smaydi
    this.pending = { state, events };
    this.skip = true;      // ketayotgan animatsiya tez yakunlansin
    this.syncControls();   // tugma serverdagi navbatga qarab darhol yangilanadi
    if (!this.running) this.loop = this.runQueue();
    return this.loop;
  }

  /** Navbatdagi holatlarni ketma-ket ko'rsatadi (har doim eng oxirgisini). */
  async runQueue() {
    this.running = true;
    try {
      while (this.pending) {
        const { state, events } = this.pending;
        this.pending = null;
        this.skip = false;
        try {
          await this._update(state, events);
        } catch (err) {
          console.error(err);
          this.applyInstant(state);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Tugma matni va faolligini holatga qarab yangilaydi (to'liq render qilmasdan). */
  syncControls() {
    const st = this.serverState || this.state;
    if (!st) return;
    const can = this.canRoll();
    this.el.rollBtn.disabled = !can;
    this.el.rollBtn.textContent = this.rollLabel(st, can);
    this.on.onControls?.({ canRoll: can, label: this.el.rollBtn.textContent, finished: st.status === 'finished' });
  }

  /** Zar tugmasidagi matn. */
  rollLabel(state, can) {
    if (state.status === 'finished') return "O'yin tugadi";
    if (can) return 'Zar tashlash';
    if (this.mode === 'online') return 'Raqib navbati';
    return this.animating ? 'Yurish...' : 'Zar tashlash';
  }

  async _update(state, events) {
    // Sahifa fonda bo'lsa animatsiya ishlamaydi — holatni darhol qo'llaymiz
    if (!events.length || document.hidden || this.skip) {
      this.applyInstant(state);
      return;
    }

    const gen = this.gen;
    // Har bir yurishda animatsiyani qaytadan sinab ko'ramiz (sharoit yaxshilangan bo'lishi mumkin)
    if (this.board) this.board.rafOk = true;
    this.animating = true;
    this.state = state;
    // Meta ma'lumot yangilanadi, lekin donalar animatsiya uchun joyida qoladi
    this.board.setPlayers(state.players, false);
    this.render();

    // Qo'riqchi: animatsiya har qanday sababga ko'ra tugamasa ham,
    // holat baribir qo'llanadi va navbat bloklanib qolmaydi.
    const budget = 1200 + events.length * 600;
    let guard;
    const guardPromise = new Promise((resolve) => {
      guard = setTimeout(resolve, budget);
    });

    await Promise.race([
      (async () => {
        for (const ev of events) {
          if (this.gen !== gen) return; // yangi o'yin boshlandi — eskisini tashlaymiz
          if (this.skip) return;        // yangi yurish keldi — bunisini tugatamiz
          await this.playEvent(ev, state);
        }
      })(),
      guardPromise,
    ]);
    clearTimeout(guard);

    if (this.gen !== gen) return;
    this.applyInstant(state);
  }

  /** Holatni animatsiyasiz, darhol qo'llaydi (kafolatli yakun). */
  applyInstant(state) {
    this.state = state;
    if (this.board) {
      for (const p of state.players) this.board.snapTo(p.id, p.pos);
      this.board.setPlayers(state.players);
    }
    this.animating = false;
    this.render();
    if (state.status === 'finished' && !this.resultsShown) {
      this.resultsShown = true;
      this.showResults(state);
    }
    if (state.status !== 'finished') this.resultsShown = false;
  }

  /** Qotib qolgan animatsiyani majburan yakunlaydi. */
  forceFinish() {
    this.gen++;
    this.skip = true;
    this.pending = null;
    const latest = this.serverState || this.state;
    if (latest) this.applyInstant(latest);
  }

  async playEvent(ev, state) {
    const player = state.players.find((p) => p.id === ev.playerId);
    switch (ev.type) {
      case 'roll':
        await this.rollDiceAnim(ev.dice);
        break;

      case 'move': {
        const tok = this.board.tokens.get(ev.playerId);
        const from = tok ? tok.cell : ev.from;
        const path = ev.bounced
          ? [...stepPath(from, state.size), ...stepPath(state.size, ev.to)]
          : stepPath(from, ev.to);
        const speed = path.length > 6 ? 70 : 110;
        for (const cell of path) {
          if (this.skip) break; // navbatda yangi yurish kutyapti — qolganini sakraymiz
          sound.step();
          haptic('light');
          await this.board.glide(ev.playerId, cell, speed, 'step');
        }
        break;
      }

      case 'ladder':
        sound.ladder();
        haptic('success');
        await this.board.flash(ev.from, 160);
        await this.board.glide(ev.playerId, ev.to, 460);
        toast(`${player?.name || ''} narvondan ${ev.from} → ${ev.to} ko'tarildi 🪜`);
        break;

      case 'snake':
        sound.snake();
        haptic('error');
        await this.board.flash(ev.from, 160);
        await this.board.glide(ev.playerId, ev.to, 500);
        toast(`${player?.name || ''} ilonga tushdi: ${ev.from} → ${ev.to} 🐍`, 'bad');
        break;

      case 'bonus':
        sound.bonus();
        haptic('success');
        toast(`${player?.name || ''} bonus katak — qo'shimcha zar! ★`);
        await wait(140);
        break;

      case 'trap':
        sound.trap();
        haptic('warning');
        toast(`${player?.name || ''} tuzoqqa tushdi — bir yurish yo'q ✖`, 'bad');
        await wait(140);
        break;

      case 'penalty':
        toast(`${player?.name || ''}: ketma-ket 3 ta 6 — yurish bekor`, 'bad');
        await wait(140);
        break;

      case 'finish':
        sound.win();
        haptic('success');
        toast(`🏁 ${player?.name || ''} — ${ev.rank}-o'rin!`);
        await wait(300);
        break;

      default:
        break;
    }
  }

  rollDiceAnim(value) {
    return new Promise((resolve) => {
      sound.dice();
      haptic('medium');
      this.el.dice.classList.add('rolling');
      let n = 0;
      const timer = setInterval(() => {
        this.setDice(1 + Math.floor(Math.random() * 6));
        // Yangi yurish kutayotgan bo'lsa zarni cho'zmaymiz
        if (++n >= 5 || this.skip) {
          clearInterval(timer);
          this.el.dice.classList.remove('rolling');
          this.setDice(value);
          setTimeout(resolve, 110);
        }
      }, 55);
    });
  }

  setDice(value) {
    const pips = this.el.dice.children;
    const on = value ? PIPS[value] : [];
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', on.includes(i));
    this.el.dice.dataset.value = value || '';
  }

  render() {
    const state = this.state;
    if (!state) return;
    // Navbat va tugma serverdagi eng oxirgi holatga qaraydi, taxta esa
    // animatsiya tugagunicha o'z holicha qoladi.
    const turnState = this.mode === 'online' ? (this.serverState || state) : state;
    const cur = turnState.players[turnState.turn];

    // navbat
    if (turnState.status === 'finished') {
      this.el.turnName.textContent = "O'yin tugadi";
      this.el.turnBox.style.borderLeftColor = 'var(--gold)';
    } else {
      const mine = this.mode === 'online' && turnState.turn === this.mySeat;
      this.el.turnName.textContent = mine ? `${cur.name} (siz)` : cur.name;
      this.el.turnBox.style.borderLeftColor = cur.hex;
    }

    // zar tugmasi
    const can = this.canRoll();
    this.el.rollBtn.disabled = !can;
    this.el.rollBtn.textContent = this.rollLabel(turnState, can);
    if (turnState.status === 'finished') {
      this.el.rollHint.textContent = "Natijalar uchun \"Qayta o'ynash\"ni bosing";
    } else if (can) {
      this.el.rollHint.textContent = this.mode === 'offline' ? `Navbat: ${cur.name}` : 'Sizning navbatingiz!';
    } else if (this.mode === 'online') {
      this.el.rollHint.textContent = 'Kuting...';
    } else {
      this.el.rollHint.textContent = '';
    }

    // tashqi boshqaruv (Telegram pastki tugmasi) uchun holat
    this.on.onControls?.({
      canRoll: can,
      label: this.el.rollBtn.textContent,
      finished: state.status === 'finished',
    });

    // o'yinchilar
    this.el.players.innerHTML = '';
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      const card = document.createElement('div');
      card.className = 'player-card'
        + (i === state.turn && state.status === 'playing' ? ' turn' : '')
        + (p.finished ? ' done' : '')
        + (p.left ? ' left' : '');
      const meta = [];
      if (p.left) meta.push('chiqib ketdi 🚪');
      else if (p.finished) meta.push(`${p.rank}-o'rin 🏁`);
      if (p.skipTurns > 0) meta.push(`${p.skipTurns} yurish o'tkazadi`);
      meta.push(`🪜 ${p.stats.ladders} · 🐍 ${p.stats.snakes}`);
      const you = this.mode === 'online' && i === this.mySeat ? ' (siz)' : '';
      card.innerHTML = `
        <span class="dot" style="background:${p.hex}"></span>
        <span class="who"><b>${escapeHtml(p.name)}${you}</b><small>${meta.join(' · ')}</small></span>
        <span class="pos">${p.pos}<small>/${state.size}</small></span>`;
      this.el.players.appendChild(card);
    }

    // jurnal
    this.el.log.innerHTML = '';
    for (const entry of state.log.slice(-40)) {
      const li = document.createElement('li');
      li.className = entry.kind || 'info';
      li.textContent = entry.text;
      this.el.log.appendChild(li);
    }
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  addChat({ from, text, mine }) {
    const li = document.createElement('li');
    if (mine) li.className = 'me';
    li.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
    this.el.chatList.appendChild(li);
    this.el.chatList.scrollTop = this.el.chatList.scrollHeight;
    if (!mine && this.el.chatPane.classList.contains('hidden')) {
      this.el.chatTab.textContent = 'Chat •';
      sound.notify();
    }
  }

  showResults(state) {
    const medals = ['🥇', '🥈', '🥉'];
    const rows = state.ranking.map((r) => {
      const p = state.players.find((x) => x.id === r.playerId);
      return `<li>
        <span class="medal">${medals[r.rank - 1] || `${r.rank}.`}</span>
        <span class="dot" style="background:${p?.hex || '#888'}"></span>
        <span><b>${escapeHtml(r.name)}</b><br><small>🪜 ${p?.stats.ladders ?? 0} narvon · 🐍 ${p?.stats.snakes ?? 0} ilon · ${p?.stats.rolls ?? 0} zar</small></span>
        <span>${p?.pos ?? ''}</span>
      </li>`;
    }).join('');

    showModal(`
      <h2>🏆 ${escapeHtml(state.ranking[0]?.name || '')} g'olib!</h2>
      <ul class="rank-list">${rows}</ul>
      ${promoModalHtml()}
      <div class="modal-actions">
        <button class="primary" data-act="rematch">Qayta o'ynash</button>
        <button class="ghost" data-act="menu">Menyu</button>
      </div>`, (act) => {
      if (act === 'telegram') return this.on.onTelegram?.();
      hideModal();
      if (act === 'rematch') this.on.onRematch?.();
      if (act === 'menu') this.on.onLeave?.();
    });
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
