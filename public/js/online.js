/** WebSocket mijozi: xona ochish/qo'shilish, zar so'rovi, chat, qayta ulanish. */

const STORAGE_KEY = 'il_session';

/**
 * Mobil tarmoqlarda ulanish "yarim ochiq" qolishi mumkin: brauzer ulanish tirik
 * deb o'ylaydi, lekin serverdan xabarlar kelmaydi. Shuning uchun har PING_MS da
 * ping yuboramiz; PONG_TIMEOUT ichida javob kelmasa — ulanishni yopib, qaytadan
 * ulanamiz va xonaga qayta kiramiz.
 */
const PING_MS = 12000;
const PONG_TIMEOUT = 6000;
/** So'rovdan keyin javob shuncha kutiladi, keyin sinxronlash boshlanadi. */
const REPLY_TIMEOUT = 2500;

export class OnlineClient {
  constructor(handlers = {}) {
    this.on = handlers;
    this.ws = null;
    this.ready = null;
    this.session = loadSession(); // { code, token }
    this.retry = 0;
    this.manualClose = false;
    this.hbTimer = null;
    this.pongTimer = null;
    this.expectTimer = null;
    this.lastMessageAt = 0;
  }

  get connected() {
    return this.ws && this.ws.readyState === 1;
  }

  connect() {
    if (this.connected) return Promise.resolve();
    if (this.ready) return this.ready;

    this.manualClose = false;
    // Eski soket qolgan bo'lsa yopamiz — bir vaqtda ikkita ulanish bo'lmasin
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        /* e'tiborsiz */
      }
      this.ws = null;
    }
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
        this.startHeartbeat();
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
        this.stopHeartbeat();
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

  /** Ulanish tirikligini tekshirib turadi (yarim ochiq ulanishlarga qarshi). */
  startHeartbeat() {
    this.stopHeartbeat();
    this.hbTimer = setInterval(() => {
      if (!this.connected) return;
      this.send({ t: 'ping' });
      clearTimeout(this.pongTimer);
      this.pongTimer = setTimeout(() => {
        if (!this.connected) return;
        this.on.onStatus?.('Aloqa tekshirilmoqda...', '');
        try {
          this.ws.close(); // onclose qayta ulanishni boshlaydi
        } catch {
          /* e'tiborsiz */
        }
      }, PONG_TIMEOUT);
    }, PING_MS);
  }

  stopHeartbeat() {
    clearInterval(this.hbTimer);
    clearTimeout(this.pongTimer);
    clearTimeout(this.expectTimer);
    this.hbTimer = null;
    this.pongTimer = null;
    this.expectTimer = null;
    this.lastMessageAt = 0;
  }

  handle(msg) {
    this.lastMessageAt = Date.now();
    if (msg.t === 'pong') {
      clearTimeout(this.pongTimer);
      return;
    }
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
        if (msg.code === 'room-gone') {
          this.clearSession();
          this.manualClose = true;
          this.on.onRoomGone?.(msg.msg);
          break;
        }
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

  async create({ name, mapId, rules, capacity }) {
    await this.connect();
    this.send({ t: 'create', name, mapId, rules, capacity, ...this.ident() });
  }

  /** Xona egasi to'lmagan xonada o'yinni boshlaydi. */
  start() {
    return this.send({ t: 'start' });
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

  /** Zar tashlash so'rovi. false qaytsa — ulanish yo'q, qayta ulanamiz. */
  roll() {
    if (!this.send({ t: 'roll' })) {
      this.reconnectNow();
      return false;
    }
    this.expectReply();
    return true;
  }

  /**
   * So'rov yuborilgach javobni kutamiz. Ulanish "yarim ochiq" bo'lsa
   * (brauzer tirik deb o'ylaydi, lekin xabarlar kelmaydi) javob kelmaydi —
   * shunda avval sinxronlashni, keyin ulanishni yangilashni sinaymiz.
   */
  expectReply(ms = REPLY_TIMEOUT) {
    clearTimeout(this.expectTimer);
    const mark = this.lastMessageAt;
    this.expectTimer = setTimeout(() => {
      if (this.lastMessageAt !== mark) return; // javob keldi — hammasi joyida
      this.on.onStatus?.('Javob kelmadi — sinxronlanmoqda...', '');
      if (!this.send({ t: 'sync' })) return this.hardReconnect();
      setTimeout(() => {
        if (this.lastMessageAt === mark) this.hardReconnect();
      }, ms);
    }, ms);
  }

  /** Ulanishni majburan yangilaydi (yarim ochiq soketni yopib). */
  hardReconnect() {
    this.on.onStatus?.('Ulanish yangilanmoqda...', '');
    try {
      this.ws?.close();
    } catch {
      /* e'tiborsiz */
    }
    this.ws = null;
    this.ready = null;
    this.stopHeartbeat();
    this.reconnectNow();
  }

  /** Serverdan xonaning joriy holatini so'raydi (desinxronizatsiyaga qarshi). */
  sync() {
    if (!this.session) return false;
    if (!this.send({ t: 'sync' })) {
      this.hardReconnect();
      return false;
    }
    this.expectReply();
    return true;
  }

  /** Darhol qayta ulanishga urinish (kutmasdan). */
  reconnectNow() {
    if (this.connected || this.manualClose || !this.session) return;
    this.retry = 0;
    this.connect()
      .then(() => this.send({ t: 'rejoin', ...this.session }))
      .catch(() => {});
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
    this.stopHeartbeat();
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
