/**
 * O'yin ekrani: taxta, zar, o'yinchilar paneli, jurnal, chat va animatsiyalar.
 * Rejimga bog'liq emas — oflayn ham, onlayn ham shu ko'rinishdan foydalanadi.
 */

import { Board } from './board.js';
import { getMap } from '../shared/maps.js';
import { stepPath } from '../shared/engine.js';
import { sound } from './sound.js';
import { haptic } from './telegram.js';
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
    this.chain = Promise.resolve();

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
    this.mode = mode;
    this.state = state;
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

  canRoll() {
    if (!this.state || this.state.status !== 'playing' || this.animating) return false;
    if (this.mode === 'online') return this.state.turn === this.mySeat;
    return true;
  }

  /**
   * Yangi holatni qo'llaydi. events berilsa — avval animatsiya, keyin render.
   * Chaqiruvlar navbat bilan bajariladi (animatsiyalar ustma-ust tushmaydi).
   */
  update(state, events = []) {
    this.chain = this.chain.then(() => this._update(state, events)).catch((err) => {
      console.error(err);
      this.animating = false;
      this.state = state;
      this.board?.setPlayers(state.players);
      this.render();
    });
    return this.chain;
  }

  async _update(state, events) {
    if (!events.length) {
      this.state = state;
      this.board.setPlayers(state.players);
      this.render();
      return;
    }

    this.animating = true;
    this.state = state;
    // Meta ma'lumot yangilanadi, lekin donalar animatsiya uchun joyida qoladi
    this.board.setPlayers(state.players, false);
    this.render();

    for (const ev of events) await this.playEvent(ev, state);

    // Kafolat: oxirida hamma dona o'z katagida
    for (const p of state.players) this.board.snapTo(p.id, p.pos);
    this.board.setPlayers(state.players);
    this.animating = false;
    this.render();

    if (state.status === 'finished') this.showResults(state);
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
        const speed = path.length > 8 ? 105 : 165;
        for (const cell of path) {
          sound.step();
          haptic('light');
          await this.board.glide(ev.playerId, cell, speed, 'step');
        }
        break;
      }

      case 'ladder':
        sound.ladder();
        haptic('success');
        await this.board.flash(ev.from, 220);
        await this.board.glide(ev.playerId, ev.to, 620);
        toast(`${player?.name || ''} narvondan ${ev.from} → ${ev.to} ko'tarildi 🪜`);
        break;

      case 'snake':
        sound.snake();
        haptic('error');
        await this.board.flash(ev.from, 220);
        await this.board.glide(ev.playerId, ev.to, 700);
        toast(`${player?.name || ''} ilonga tushdi: ${ev.from} → ${ev.to} 🐍`, 'bad');
        break;

      case 'bonus':
        sound.bonus();
        haptic('success');
        toast(`${player?.name || ''} bonus katak — qo'shimcha zar! ★`);
        await wait(220);
        break;

      case 'trap':
        sound.trap();
        haptic('warning');
        toast(`${player?.name || ''} tuzoqqa tushdi — bir yurish yo'q ✖`, 'bad');
        await wait(220);
        break;

      case 'penalty':
        toast(`${player?.name || ''}: ketma-ket 3 ta 6 — yurish bekor`, 'bad');
        await wait(220);
        break;

      case 'finish':
        sound.win();
        haptic('success');
        toast(`🏁 ${player?.name || ''} — ${ev.rank}-o'rin!`);
        await wait(400);
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
        if (++n >= 6) {
          clearInterval(timer);
          this.el.dice.classList.remove('rolling');
          this.setDice(value);
          setTimeout(resolve, 160);
        }
      }, 70);
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
    const cur = state.players[state.turn];

    // navbat
    if (state.status === 'finished') {
      this.el.turnName.textContent = "O'yin tugadi";
      this.el.turnBox.style.borderLeftColor = 'var(--gold)';
    } else {
      const mine = this.mode === 'online' && state.turn === this.mySeat;
      this.el.turnName.textContent = mine ? `${cur.name} (siz)` : cur.name;
      this.el.turnBox.style.borderLeftColor = cur.hex;
    }

    // zar tugmasi
    const can = this.canRoll();
    this.el.rollBtn.disabled = !can;
    if (state.status === 'finished') {
      this.el.rollBtn.textContent = "O'yin tugadi";
      this.el.rollHint.textContent = "Natijalar uchun \"Qayta o'ynash\"ni bosing";
    } else if (this.animating) {
      this.el.rollBtn.textContent = 'Yurish...';
      this.el.rollHint.textContent = '';
    } else if (this.mode === 'online' && state.turn !== this.mySeat) {
      this.el.rollBtn.textContent = 'Raqib navbati';
      this.el.rollHint.textContent = 'Kuting...';
    } else {
      this.el.rollBtn.textContent = 'Zar tashlash';
      this.el.rollHint.textContent = this.mode === 'offline' ? `Navbat: ${cur.name}` : 'Sizning navbatingiz!';
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
      card.className = 'player-card' + (i === state.turn && state.status === 'playing' ? ' turn' : '') + (p.finished ? ' done' : '');
      const meta = [];
      if (p.finished) meta.push(`${p.rank}-o'rin 🏁`);
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
      <div class="modal-actions">
        <button class="primary" data-act="rematch">Qayta o'ynash</button>
        <button class="ghost" data-act="menu">Menyu</button>
      </div>`, (act) => {
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
