/** WebSocket mijozi: xona ochish/qo'shilish, zar so'rovi, chat, qayta ulanish. */

const STORAGE_KEY = 'il_session';

export class OnlineClient {
  constructor(handlers = {}) {
    this.on = handlers;
    this.ws = null;
    this.ready = null;
    this.session = loadSession(); // { code, token }
    this.retry = 0;
    this.manualClose = false;
  }

  get connected() {
    return this.ws && this.ws.readyState === 1;
  }

  connect() {
    if (this.connected) return Promise.resolve();
    if (this.ready) return this.ready;

    this.manualClose = false;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws`;

    this.ready = new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        this.ready = null;
        reject(err);
        return;
      }
      this.ws = ws;

      ws.onopen = () => {
        this.retry = 0;
        this.on.onStatus?.('Serverga ulandi', 'ok');
        resolve();
      };

      ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        this.handle(msg);
      };

      ws.onerror = () => {
        this.on.onStatus?.('Ulanishda xatolik', 'bad');
      };

      ws.onclose = () => {
        this.ws = null;
        this.ready = null;
        this.on.onStatus?.('Aloqa uzildi', 'bad');
        this.on.onDisconnected?.();
        if (!this.manualClose && this.session) this.scheduleReconnect();
        reject(new Error('closed'));
      };
    });

    return this.ready;
  }

  scheduleReconnect() {
    const delay = Math.min(8000, 800 * 2 ** this.retry++);
    setTimeout(() => {
      if (this.connected || this.manualClose) return;
      this.on.onStatus?.('Qayta ulanmoqda...', '');
      this.connect().then(() => {
        if (this.session) this.send({ t: 'rejoin', ...this.session });
      }).catch(() => {});
    }, delay);
  }

  handle(msg) {
    switch (msg.t) {
      case 'joined':
        this.session = { code: msg.code, token: msg.token };
        saveSession(this.session);
        this.on.onJoined?.(msg);
        break;
      case 'room':
        this.on.onRoom?.(msg.room, msg.seat);
        break;
      case 'roll':
        this.on.onRoll?.(msg);
        break;
      case 'restart':
        this.on.onRestart?.(msg.room, msg.seat);
        break;
      case 'chat':
        this.on.onChat?.(msg);
        break;
      case 'notice':
        this.on.onNotice?.(msg.text);
        break;
      case 'queued':
        this.on.onQueued?.();
        break;
      case 'left':
        this.clearSession();
        this.on.onLeft?.();
        break;
      case 'error':
        this.on.onError?.(msg.msg);
        break;
      default:
        break;
    }
  }

  send(obj) {
    if (!this.connected) return false;
    this.ws.send(JSON.stringify(obj));
    return true;
  }

  /** Telegram imzosi kabi qo'shimcha maydonlar (agar berilgan bo'lsa). */
  ident() {
    try {
      return this.on.identity?.() || {};
    } catch {
      return {};
    }
  }

  async create({ name, mapId, rules }) {
    await this.connect();
    this.send({ t: 'create', name, mapId, rules, ...this.ident() });
  }

  async join({ code, name }) {
    await this.connect();
    this.send({ t: 'join', code: String(code).toUpperCase(), name, ...this.ident() });
  }

  async quick({ name, mapId, rules }) {
    await this.connect();
    this.send({ t: 'quick', name, mapId, rules, ...this.ident() });
  }

  /** Sahifa yangilangach oldingi o'yinga qaytishga urinish. */
  async tryRejoin() {
    if (!this.session) return false;
    await this.connect();
    this.send({ t: 'rejoin', ...this.session });
    return true;
  }

  roll() {
    this.send({ t: 'roll' });
  }

  chat(text) {
    this.send({ t: 'chat', text });
  }

  rematch() {
    this.send({ t: 'rematch' });
  }

  leave() {
    this.send({ t: 'leave' });
    this.clearSession();
    this.manualClose = true;
    this.ws?.close();
  }

  clearSession() {
    this.session = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.code || !data?.token) return null;
    if (Date.now() - (data.ts || 0) > 2 * 60 * 60 * 1000) return null;
    return { code: data.code, token: data.token };
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, ts: Date.now() }));
}
