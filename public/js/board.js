/**
 * Taxtani canvas ustida chizish va donalarni harakatlantirish.
 */

import { cellToGrid, mapSize } from '../shared/maps.js';

const TAU = Math.PI * 2;

export class Board {
  constructor(canvas, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.players = [];
    this.tokens = new Map(); // playerId -> {cell, x, y}
    this.highlight = null;
    this.pulse = 0;
    this.setMap(map);
    this._raf = null;
  }

  setMap(map) {
    this.map = map;
    this.size = mapSize(map);
    this.ladders = Object.entries(map.ladders).map(([f, t]) => [Number(f), t]);
    this.snakes = Object.entries(map.snakes).map(([f, t]) => [Number(f), t]);
    this.resize();
  }

  /**
   * O'yinchilar ro'yxatini yangilaydi.
   * snap=false bo'lsa donalar joyida qoladi (animatsiya davomida shunday qilinadi).
   */
  setPlayers(players, snap = true) {
    this.players = players;
    for (const p of players) {
      const cur = this.tokens.get(p.id);
      if (!cur || (snap && cur.cell !== p.pos)) {
        const c = this.cellCenter(p.pos);
        this.tokens.set(p.id, { cell: p.pos, x: c.x, y: c.y });
      }
    }
    for (const id of [...this.tokens.keys()]) {
      if (!players.some((p) => p.id === id)) this.tokens.delete(id);
    }
    this.draw();
  }

  /** Donani ma'lum katakka darhol qo'yadi (animatsiyasiz sinxronlash uchun). */
  snapTo(playerId, cell) {
    const c = this.cellCenter(cell);
    this.tokens.set(playerId, { cell, x: c.x, y: c.y });
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const style = getComputedStyle(wrap);
    const availW = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    // Bo'yi bo'yicha ekranning qolgan qismidan foydalanamiz (kichik ekranda ham to'liq ko'rinsin)
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    // Telegram ichida balandlikni webview beradi (--app-height), aks holda oyna balandligi
    const cssHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
    );
    const viewH = cssHeight || window.innerHeight;
    // Tor ekranda taxta balandligini cheklaymiz — boshqaruv tugmalari ham ko'rinib tursin
    const budget = window.innerWidth <= 900
      ? viewH * 0.62
      : viewH - Math.min(top, 220) - 40;
    const availH = Math.max(340, budget);

    const pad = 10;
    const cellByW = (availW - pad * 2) / this.map.cols;
    const cellByH = (availH - pad * 2) / this.map.rows;
    this.cell = Math.max(22, Math.min(72, Math.floor(Math.min(cellByW, cellByH))));
    this.pad = pad;

    const w = this.cell * this.map.cols + pad * 2;
    const h = this.cell * this.map.rows + pad * 2;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Donalarni yangi o'lchamga moslash
    for (const [id, tok] of this.tokens) {
      const c = this.cellCenter(tok.cell);
      this.tokens.set(id, { ...tok, x: c.x, y: c.y });
    }
    this.draw();
  }

  cellRect(cell) {
    const { col, row } = cellToGrid(this.map, cell);
    return {
      x: this.pad + col * this.cell,
      y: this.pad + row * this.cell,
      w: this.cell,
      h: this.cell,
    };
  }

  cellCenter(cell) {
    const r = this.cellRect(cell);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  // ---------- chizish ----------

  draw() {
    const ctx = this.ctx;
    const { light, dark, accent, grid } = this.map.theme;
    const W = this.cell * this.map.cols + this.pad * 2;
    const H = this.cell * this.map.rows + this.pad * 2;

    ctx.clearRect(0, 0, W, H);

    // fon
    ctx.fillStyle = light;
    roundRect(ctx, 2, 2, W - 4, H - 4, 14);
    ctx.fill();

    const bonus = new Set(this.map.bonus || []);
    const traps = new Set(this.map.traps || []);
    const small = this.cell < 34;

    for (let cell = 1; cell <= this.size; cell++) {
      const r = this.cellRect(cell);
      const { col, row } = cellToGrid(this.map, cell);
      ctx.fillStyle = (col + row) % 2 === 0 ? light : dark;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      if (cell === 1 || cell === this.size) {
        ctx.fillStyle = cell === 1 ? 'rgba(14,165,233,.28)' : 'rgba(250,204,21,.42)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else if (bonus.has(cell)) {
        ctx.fillStyle = 'rgba(34,197,94,.22)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else if (traps.has(cell)) {
        ctx.fillStyle = 'rgba(148,163,184,.35)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      ctx.strokeStyle = grid;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(r.x + 0.3, r.y + 0.3, r.w - 0.6, r.h - 0.6);

      // raqam
      ctx.fillStyle = 'rgba(15,23,42,.62)';
      ctx.font = `${Math.max(8, Math.round(this.cell * (small ? 0.3 : 0.26)))}px ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(cell), r.x + 3, r.y + 2);

      // belgi
      const mark = cell === 1 ? 'START' : cell === this.size ? 'FINISH' : bonus.has(cell) ? '★' : traps.has(cell) ? '✖' : null;
      if (mark) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (mark === 'START' || mark === 'FINISH') {
          ctx.fillStyle = 'rgba(15,23,42,.75)';
          ctx.font = `bold ${Math.max(7, Math.round(this.cell * 0.2))}px system-ui, sans-serif`;
          ctx.fillText(mark, r.x + r.w / 2, r.y + r.h * 0.68);
        } else {
          ctx.fillStyle = mark === '★' ? 'rgba(21,128,61,.85)' : 'rgba(71,85,105,.85)';
          ctx.font = `${Math.round(this.cell * 0.42)}px system-ui, sans-serif`;
          ctx.fillText(mark, r.x + r.w / 2, r.y + r.h * 0.6);
        }
      }
    }

    // ramka
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, 2, 2, W - 4, H - 4, 14);
    ctx.stroke();

    for (const [from, to] of this.ladders) this.drawLadder(from, to);
    for (const [from, to] of this.snakes) this.drawSnake(from, to);

    if (this.highlight) this.drawHighlight(this.highlight);

    this.drawTokens();
  }

  drawHighlight(cell) {
    const r = this.cellRect(cell);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(250,204,21,.95)';
    ctx.lineWidth = 3;
    roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 6);
    ctx.stroke();
    ctx.restore();
  }

  drawLadder(from, to) {
    const a = this.cellCenter(from);
    const b = this.cellCenter(to);
    const ctx = this.ctx;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const width = Math.max(6, this.cell * 0.26);

    ctx.save();
    ctx.lineCap = 'round';

    // soya
    ctx.strokeStyle = 'rgba(15,23,42,.12)';
    ctx.lineWidth = Math.max(3, this.cell * 0.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x + nx * width * s + 1.5, a.y + ny * width * s + 1.5);
      ctx.lineTo(b.x + nx * width * s + 1.5, b.y + ny * width * s + 1.5);
      ctx.stroke();
    }

    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, '#16a34a');
    grad.addColorStop(1, '#84cc16');

    // pog'onalar
    const rungs = Math.max(3, Math.round(len / (this.cell * 0.55)));
    ctx.strokeStyle = 'rgba(202,138,4,.9)';
    ctx.lineWidth = Math.max(2, this.cell * 0.07);
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      ctx.beginPath();
      ctx.moveTo(px + nx * width, py + ny * width);
      ctx.lineTo(px - nx * width, py - ny * width);
      ctx.stroke();
    }

    // yon tayanchlar
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(3, this.cell * 0.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x + nx * width * s, a.y + ny * width * s);
      ctx.lineTo(b.x + nx * width * s, b.y + ny * width * s);
      ctx.stroke();
    }

    // yuqori uchidagi strelka
    this.drawArrow(b, a, '#15803d');
    ctx.restore();
  }

  drawArrow(tip, from, color) {
    const ctx = this.ctx;
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
    const s = Math.max(6, this.cell * 0.22);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s * 0.9, 0);
    ctx.lineTo(-s * 0.5, s * 0.6);
    ctx.lineTo(-s * 0.5, -s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawSnake(from, to) {
    const a = this.cellCenter(from); // bosh
    const b = this.cellCenter(to); // dum
    const ctx = this.ctx;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const steps = 44;
    const amp = Math.min(this.cell * 0.52, len * 0.12);
    const waves = Math.max(1.5, len / (this.cell * 2.1));
    const headW = Math.max(5, this.cell * 0.2);

    const spine = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const off = Math.sin(t * waves * TAU) * amp * Math.sin(Math.PI * Math.min(1, t * 1.15));
      spine.push({
        x: a.x + dx * t + nx * off,
        y: a.y + dy * t + ny * off,
        w: headW * (1 - t * 0.78),
      });
    }

    const left = [];
    const right = [];
    for (let i = 0; i <= steps; i++) {
      const p = spine[i];
      const q = spine[Math.min(steps, i + 1)];
      const pr = spine[Math.max(0, i - 1)];
      const tx = q.x - pr.x;
      const ty = q.y - pr.y;
      const tl = Math.hypot(tx, ty) || 1;
      const ox = (-ty / tl) * p.w;
      const oy = (tx / tl) * p.w;
      left.push({ x: p.x + ox, y: p.y + oy });
      right.push({ x: p.x - ox, y: p.y - oy });
    }

    const hue = (from * 47) % 360;
    const body = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    body.addColorStop(0, `hsl(${hue} 72% 48%)`);
    body.addColorStop(1, `hsl(${(hue + 40) % 360} 65% 62%)`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (const p of left) ctx.lineTo(p.x, p.y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // gavda naqshi
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 3; i < steps - 2; i += 4) {
      const p = spine[i];
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.w * 0.42, p.w * 0.42, 0, 0, TAU);
      ctx.fill();
    }

    // bosh
    const headAng = Math.atan2(spine[1].y - spine[0].y, spine[1].x - spine[0].x);
    ctx.translate(a.x, a.y);
    ctx.rotate(headAng);
    ctx.fillStyle = `hsl(${hue} 70% 42%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, headW * 1.5, headW * 1.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-headW * 0.35, -headW * 0.5, headW * 0.34, 0, TAU);
    ctx.arc(-headW * 0.35, headW * 0.5, headW * 0.34, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-headW * 0.3, -headW * 0.5, headW * 0.16, 0, TAU);
    ctx.arc(-headW * 0.3, headW * 0.5, headW * 0.16, 0, TAU);
    ctx.fill();
    // til
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = Math.max(1, headW * 0.18);
    ctx.beginPath();
    ctx.moveTo(-headW * 1.5, 0);
    ctx.lineTo(-headW * 2.4, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawTokens() {
    const ctx = this.ctx;
    // bir katakdagi donalarni guruhlab siljitamiz
    const byCell = new Map();
    for (const p of this.players) {
      const tok = this.tokens.get(p.id);
      if (!tok) continue;
      const key = `${Math.round(tok.x)},${Math.round(tok.y)}`;
      if (!byCell.has(key)) byCell.set(key, []);
      byCell.get(key).push(p);
    }

    for (const p of this.players) {
      const tok = this.tokens.get(p.id);
      if (!tok) continue;
      const key = `${Math.round(tok.x)},${Math.round(tok.y)}`;
      const group = byCell.get(key) || [p];
      const idx = group.indexOf(p);
      const n = group.length;
      const r = Math.max(6, this.cell * (n > 2 ? 0.19 : 0.24));
      let ox = 0;
      let oy = 0;
      if (n > 1) {
        const ang = (idx / n) * TAU - Math.PI / 2;
        const spread = this.cell * 0.22;
        ox = Math.cos(ang) * spread;
        oy = Math.sin(ang) * spread;
      }

      const x = tok.x + ox;
      const y = tok.y + oy;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.75, r * 0.85, r * 0.35, 0, 0, TAU);
      ctx.fillStyle = 'rgba(15,23,42,.25)';
      ctx.fill();

      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, p.hex);
      g.addColorStop(1, shade(p.hex, -30));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, r * 0.16);
      ctx.strokeStyle = p.finished ? '#facc15' : 'rgba(255,255,255,.9)';
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(r * 1.1)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(initials(p.name), x, y + 0.5);
      ctx.restore();
    }
  }

  // ---------- animatsiya ----------

  /** Donani kataklar bo'ylab bosqichma-bosqich yurgizadi. */
  async walk(playerId, path, msPerStep = 170) {
    for (const cell of path) {
      await this.glide(playerId, cell, msPerStep, 'step');
    }
  }

  /** Donani bir katakdan boshqasiga silliq ko'chiradi. */
  glide(playerId, cell, ms = 420, mode = 'jump') {
    const tok = this.tokens.get(playerId);
    const target = this.cellCenter(cell);
    if (!tok) {
      this.tokens.set(playerId, { cell, ...target });
      this.draw();
      return Promise.resolve();
    }
    const sx = tok.x;
    const sy = tok.y;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const e = mode === 'step' ? easeOutQuad(t) : easeInOutCubic(t);
        const hop = mode === 'step' ? Math.sin(Math.PI * t) * this.cell * 0.28 : Math.sin(Math.PI * t) * this.cell * 0.12;
        tok.x = sx + (target.x - sx) * e;
        tok.y = sy + (target.y - sy) * e - hop;
        tok.cell = cell;
        this.draw();
        if (t < 1) this._raf = requestAnimationFrame(tick);
        else {
          tok.x = target.x;
          tok.y = target.y;
          this.draw();
          resolve();
        }
      };
      this._raf = requestAnimationFrame(tick);
    });
  }

  flash(cell, ms = 600) {
    this.highlight = cell;
    this.draw();
    return new Promise((resolve) => setTimeout(() => {
      this.highlight = null;
      this.draw();
      resolve();
    }, ms));
  }
}

// ---------- yordamchilar ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
