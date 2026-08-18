/**
 * Taxtani canvas ustida chizish va donalarni harakatlantirish.
 */

import { cellToGrid, mapSize } from '../shared/maps.js';
import { resolveStyles } from '../shared/cosmetics.js';

const TAU = Math.PI * 2;

export class Board {
  constructor(canvas, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.players = [];
    this.tokens = new Map(); // playerId -> {cell, x, y}
    this.highlight = null;
    this.showLabels = true; // do'kondagi kichik namunalarda o'chiriladi
    this.rafOk = true; // animatsiya kadrlari kelayaptimi (fon rejimida kelmaydi)
    this.skins = resolveStyles({});
    // Statik qatlam: kataklar, narvon/ilonlar va raqamlar shu yerda bir marta
    // chiziladi. Har kadrda ularni qayta chizish katta taxtada telefonni
    // qiynaydi — endi kadrga faqat tayyor rasm + donalar tushadi.
    this.bg = document.createElement('canvas');
    this.bgDirty = true;
    this._bgLabels = null;
    this.setMap(map);
    this._raf = null;
  }

  /** Statik qatlamni qayta chizishga belgi qo'yadi. */
  invalidate() {
    this.bgDirty = true;
  }

  setMap(map) {
    this.map = map;
    this.invalidate();
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

  /** Sotib olingan ko'rinishlarni qo'llaydi (fishka, narvon, ilon, taxta). */
  setSkins(equipped) {
    this.skins = resolveStyles(equipped || {});
    this.invalidate();
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
    this.dpr = dpr;
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
    this.invalidate(); // o'lcham o'zgardi — statik qatlam qaytadan chizilsin

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

  // ---------- ranglar ----------

  /** Kiyilgan taxta ko'rinishi bo'yicha ranglar (yoki xaritaning o'z rangi). */
  theme() {
    const skin = this.skins?.board;
    if (!skin || skin.useMapTheme) {
      return { ...this.map.theme, number: 'rgba(15,23,42,.78)', halo: 'rgba(255,255,255,.95)' };
    }
    return {
      light: skin.light,
      dark: skin.dark,
      accent: skin.accent,
      grid: skin.grid,
      number: skin.number || 'rgba(15,23,42,.78)',
      halo: skin.dark_ui ? 'rgba(2,6,23,.9)' : 'rgba(255,255,255,.95)',
      darkUi: Boolean(skin.dark_ui),
    };
  }

  // ---------- chizish ----------

  /** Har kadrda chaqiriladi: tayyor fon + belgilangan katak + donalar. */
  draw() {
    const W = this.cell * this.map.cols + this.pad * 2;
    const H = this.cell * this.map.rows + this.pad * 2;

    if (this.bgDirty || this._bgLabels !== this.showLabels) this.buildBackground(W, H);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.bg, 0, 0, W, H);

    if (this.highlight) this.drawHighlight(this.highlight);
    this.drawTokens();
  }

  /**
   * O'zgarmaydigan qatlamni alohida canvasga chizadi.
   * Faqat xarita, o'lcham yoki ko'rinish almashganda qayta chaqiriladi.
   */
  buildBackground(W, H) {
    const dpr = this.dpr || 1;
    this.bg.width = Math.max(1, Math.round(W * dpr));
    this.bg.height = Math.max(1, Math.round(H * dpr));
    const bctx = this.bg.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);

    // Chizish metodlari this.ctx ga yozadi — vaqtincha fon kontekstiga yo'naltiramiz
    const real = this.ctx;
    this.ctx = bctx;
    try {
      const th = this.theme();
      bctx.fillStyle = th.light;
      roundRect(bctx, 2, 2, W - 4, H - 4, 14);
      bctx.fill();

      this.drawCells(th);

      // Narvon va ilonlar biroz shaffof — ostidagi kataklar bilinib turadi
      bctx.save();
      bctx.globalAlpha = 0.88;
      for (const [from, to] of this.ladders) this.drawLadder(from, to);
      for (const [from, to] of this.snakes) this.drawSnake(from, to);
      bctx.restore();

      // Raqamlar va belgilar eng ustida — hech narsa ularni to'smaydi
      this.drawLabels(th);

      bctx.strokeStyle = th.accent;
      bctx.lineWidth = 2;
      roundRect(bctx, 2, 2, W - 4, H - 4, 14);
      bctx.stroke();
    } finally {
      this.ctx = real;
    }

    this.bgDirty = false;
    this._bgLabels = this.showLabels;
  }

  /** Katak fonlari va to'r chiziqlari. */
  drawCells(th) {
    const ctx = this.ctx;
    const bonus = new Set(this.map.bonus || []);
    const traps = new Set(this.map.traps || []);

    for (let cell = 1; cell <= this.size; cell++) {
      const r = this.cellRect(cell);
      const { col, row } = cellToGrid(this.map, cell);
      ctx.fillStyle = (col + row) % 2 === 0 ? th.light : th.dark;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      if (cell === 1 || cell === this.size) {
        ctx.fillStyle = cell === 1 ? 'rgba(14,165,233,.30)' : 'rgba(250,204,21,.45)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else if (bonus.has(cell)) {
        ctx.fillStyle = 'rgba(34,197,94,.22)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else if (traps.has(cell)) {
        ctx.fillStyle = th.darkUi ? 'rgba(148,163,184,.22)' : 'rgba(148,163,184,.35)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      ctx.strokeStyle = th.grid;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(r.x + 0.3, r.y + 0.3, r.w - 0.6, r.h - 0.6);
    }

    // "Do'stlar galaktikasi" kabi mavzularda yulduzli fon
    if (this.skins?.board?.sparkle) this.drawStarField();
  }

  /** Taxta ustidagi mayda yulduzchalar (mavzu talab qilsa). */
  drawStarField() {
    const ctx = this.ctx;
    const W = this.cell * this.map.cols + this.pad * 2;
    const H = this.cell * this.map.rows + this.pad * 2;
    ctx.save();
    for (let i = 0; i < 90; i++) {
      // Doimiy joylashuv: tasodifiy emas, formula bo'yicha (har chizishda bir xil)
      const x = ((i * 73) % 101) / 100 * W;
      const y = ((i * 149) % 97) / 97 * H;
      const r = 0.6 + ((i * 37) % 5) * 0.35;
      ctx.fillStyle = i % 7 === 0 ? 'rgba(244,114,182,.75)' : 'rgba(226,232,240,.55)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Katak raqamlari va belgilari — narvon/ilonlar ustidan chiziladi.
   * Har bir yozuv atrofida kontrast "halo" bor, shuning uchun ilon ustida ham o'qiladi.
   */
  drawLabels(th) {
    if (!this.showLabels) return;
    const ctx = this.ctx;
    const bonus = new Set(this.map.bonus || []);
    const traps = new Set(this.map.traps || []);
    const numFont = Math.max(9, Math.round(this.cell * 0.28));

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    for (let cell = 1; cell <= this.size; cell++) {
      const r = this.cellRect(cell);

      // raqam (chap yuqori burchak)
      ctx.font = `600 ${numFont}px ui-monospace, SFMono-Regular, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const nx = r.x + 3;
      const ny = r.y + 2;
      ctx.lineWidth = Math.max(2.5, this.cell * 0.11);
      ctx.strokeStyle = th.halo;
      ctx.strokeText(String(cell), nx, ny);
      ctx.fillStyle = th.number;
      ctx.fillText(String(cell), nx, ny);

      // belgi (katak markazidan pastroqda)
      const mark = cell === 1 ? 'START' : cell === this.size ? 'FINISH' : bonus.has(cell) ? '★' : traps.has(cell) ? '✖' : null;
      if (!mark) continue;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const mx = r.x + r.w / 2;
      if (mark === 'START' || mark === 'FINISH') {
        ctx.font = `bold ${Math.max(8, Math.round(this.cell * 0.2))}px system-ui, sans-serif`;
        ctx.lineWidth = Math.max(2.5, this.cell * 0.1);
        ctx.strokeStyle = th.halo;
        ctx.strokeText(mark, mx, r.y + r.h * 0.7);
        ctx.fillStyle = th.darkUi ? 'rgba(226,232,240,.95)' : 'rgba(15,23,42,.85)';
        ctx.fillText(mark, mx, r.y + r.h * 0.7);
      } else {
        ctx.font = `${Math.round(this.cell * 0.4)}px system-ui, sans-serif`;
        ctx.lineWidth = Math.max(2.5, this.cell * 0.1);
        ctx.strokeStyle = th.halo;
        ctx.strokeText(mark, mx, r.y + r.h * 0.62);
        ctx.fillStyle = mark === '★' ? '#15803d' : '#475569';
        ctx.fillText(mark, mx, r.y + r.h * 0.62);
      }
    }
    ctx.restore();
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

  // ---------- narvonlar ----------

  drawLadder(from, to) {
    const style = this.skins?.ladder || { kind: 'wood', rail: ['#16a34a', '#84cc16'], rung: 'rgba(202,138,4,.9)' };
    const a = this.cellCenter(from);
    const b = this.cellCenter(to);
    const ctx = this.ctx;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Narvon avvalgidan ingichkaroq — raqamlarni kamroq to'sadi
    const width = Math.max(5, this.cell * 0.2);
    const rails = style.rail || ['#16a34a', '#84cc16'];

    ctx.save();
    ctx.lineCap = 'round';

    // pog'onalar
    const rungs = Math.max(3, Math.round(len / (this.cell * 0.55)));
    ctx.strokeStyle = style.rung || 'rgba(202,138,4,.9)';
    ctx.lineWidth = Math.max(1.6, this.cell * 0.06);
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const w = style.wavy ? width * (0.82 + 0.18 * Math.cos(t * Math.PI * 4)) : width;
      ctx.beginPath();
      ctx.moveTo(px + nx * w, py + ny * w);
      ctx.lineTo(px - nx * w, py - ny * w);
      ctx.stroke();
    }

    // yulduzli narvon: pog'onalar o'rniga yulduzchalar
    if (style.stars) {
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        star(ctx, a.x + dx * t, a.y + dy * t, Math.max(3, this.cell * 0.13), '#FACC15');
      }
    }

    // yon tayanchlar
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, rails[0]);
    grad.addColorStop(1, rails[1]);
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(2.4, this.cell * 0.085);
    if (style.glow) {
      ctx.shadowColor = rails[1];
      ctx.shadowBlur = this.cell * 0.3;
    }
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (style.wavy) {
        const steps = 18;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const w = width * (0.82 + 0.18 * Math.cos(t * Math.PI * 4)) * s;
          const px = a.x + dx * t + nx * w;
          const py = a.y + dy * t + ny * w;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      } else {
        ctx.moveTo(a.x + nx * width * s, a.y + ny * width * s);
        ctx.lineTo(b.x + nx * width * s, b.y + ny * width * s);
      }
      ctx.stroke();
    }

    if (style.metallic) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = Math.max(0.8, this.cell * 0.02);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(a.x + nx * width * s, a.y + ny * width * s);
        ctx.lineTo(b.x + nx * width * s, b.y + ny * width * s);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    this.drawArrow(b, a, rails[0]);
    ctx.restore();
  }

  drawArrow(tip, from, color) {
    const ctx = this.ctx;
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
    const s = Math.max(5, this.cell * 0.18);
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

  // ---------- ilonlar ----------

  drawSnake(from, to) {
    const style = this.skins?.snake || { kind: 'classic' };
    const a = this.cellCenter(from); // bosh
    const b = this.cellCenter(to); // dum
    const ctx = this.ctx;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const steps = 44;
    const amp = Math.min(this.cell * 0.46, len * 0.11);
    const waves = Math.max(1.5, len / (this.cell * 2.1));
    // Gavda ingichkaroq — katak raqamlari ko'rinib tursin
    const headW = Math.max(4, this.cell * 0.165);
    const hue = style.hue ?? (from * 47) % 360;

    const spine = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let off = Math.sin(t * waves * TAU) * amp * Math.sin(Math.PI * Math.min(1, t * 1.15));
      if (style.zigzag) off = (Math.abs(((t * waves * 2) % 2) - 1) * 2 - 1) * amp * Math.sin(Math.PI * Math.min(1, t * 1.15));
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

    const body = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    body.addColorStop(0, `hsl(${hue} 72% 48%)`);
    body.addColorStop(1, `hsl(${(hue + 40) % 360} 65% 62%)`);

    ctx.save();

    // ajdaho tikanlari — gavdadan oldin chiziladi
    if (style.spikes) {
      ctx.fillStyle = `hsl(${(hue + 30) % 360} 80% 40%)`;
      for (let i = 2; i < steps - 4; i += 3) {
        const p = spine[i];
        const q = spine[i + 1];
        const tx = q.x - p.x;
        const ty = q.y - p.y;
        const tl = Math.hypot(tx, ty) || 1;
        const ox = (-ty / tl) * p.w * 2.1;
        const oy = (tx / tl) * p.w * 2.1;
        ctx.beginPath();
        ctx.moveTo(p.x + ox, p.y + oy);
        ctx.lineTo(p.x - (tx / tl) * p.w, p.y - (ty / tl) * p.w);
        ctx.lineTo(p.x + (tx / tl) * p.w, p.y + (ty / tl) * p.w);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (style.glow) {
      ctx.shadowColor = `hsl(${hue} 90% 60%)`;
      ctx.shadowBlur = this.cell * 0.35;
    }

    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (const p of left) ctx.lineTo(p.x, p.y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(15,23,42,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // gavda naqshi
    if (style.stripes) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = Math.max(1.4, headW * 0.5);
      for (let i = 2; i < steps - 2; i += 3) {
        ctx.beginPath();
        ctx.moveTo(left[i].x, left[i].y);
        ctx.lineTo(right[i].x, right[i].y);
        ctx.stroke();
      }
    } else if (style.starPattern) {
      for (let i = 3; i < steps - 2; i += 4) {
        const p = spine[i];
        star(ctx, p.x, p.y, Math.max(2, p.w * 0.75), 'rgba(255,255,255,.9)');
      }
    } else if (style.kind === 'electric') {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = Math.max(1, headW * 0.3);
      ctx.beginPath();
      spine.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 3; i < steps - 2; i += 4) {
        const p = spine[i];
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w * 0.42, p.w * 0.42, 0, 0, TAU);
        ctx.fill();
      }
    }

    // bosh
    const headAng = Math.atan2(spine[1].y - spine[0].y, spine[1].x - spine[0].x);
    ctx.translate(a.x, a.y);
    ctx.rotate(headAng);
    ctx.fillStyle = `hsl(${hue} 70% 42%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, headW * 1.6, headW * 1.2, 0, 0, TAU);
    ctx.fill();

    if (style.spikes) {
      // shoxlar
      ctx.beginPath();
      ctx.moveTo(headW * 0.4, -headW * 1.1);
      ctx.lineTo(headW * 1.9, -headW * 2.1);
      ctx.lineTo(headW * 1.1, -headW * 0.6);
      ctx.closePath();
      ctx.moveTo(headW * 0.4, headW * 1.1);
      ctx.lineTo(headW * 1.9, headW * 2.1);
      ctx.lineTo(headW * 1.1, headW * 0.6);
      ctx.closePath();
      ctx.fill();
    }

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
    ctx.strokeStyle = style.spikes ? '#f97316' : '#e11d48';
    ctx.lineWidth = Math.max(1, headW * 0.18);
    ctx.beginPath();
    ctx.moveTo(-headW * 1.6, 0);
    ctx.lineTo(-headW * 2.5, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- donalar ----------

  drawTokens() {
    const ctx = this.ctx;
    const style = this.skins?.token || { shape: 'circle' };

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
      const r = Math.max(6, this.cell * (n > 2 ? 0.2 : 0.26));
      let ox = 0;
      let oy = 0;
      if (n > 1) {
        const ang = (idx / n) * TAU - Math.PI / 2;
        const spread = this.cell * 0.22;
        ox = Math.cos(ang) * spread;
        oy = Math.sin(ang) * spread;
      }
      this.drawToken(p, tok.x + ox, tok.y + oy, r, style);
    }
  }

  /** Bitta dona — kiyilgan fishka ko'rinishiga qarab. */
  drawToken(player, x, y, r, style) {
    const ctx = this.ctx;
    ctx.save();

    // soya
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.78, r * 0.8, r * 0.32, 0, 0, TAU);
    ctx.fillStyle = 'rgba(15,23,42,.28)';
    ctx.fill();

    const light = shade(player.hex, 55);
    const dark = shade(player.hex, -35);
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.12, x, y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, player.hex);
    grad.addColorStop(1, dark);

    if (style.glow) {
      ctx.shadowColor = light;
      ctx.shadowBlur = r * 0.9;
    }

    ctx.fillStyle = grad;
    ctx.strokeStyle = player.finished ? '#facc15' : 'rgba(255,255,255,.92)';
    ctx.lineWidth = Math.max(1.2, r * 0.16);

    switch (style.shape) {
      case 'ring': {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.strokeStyle = player.hex;
        ctx.lineWidth = r * 0.42;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.82, 0, TAU);
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.stroke();
        break;
      }
      case 'gem': {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.85, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r * 0.85, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (style.facets) {
          ctx.strokeStyle = 'rgba(255,255,255,.65)';
          ctx.lineWidth = Math.max(0.8, r * 0.08);
          ctx.beginPath();
          ctx.moveTo(x - r * 0.85, y);
          ctx.lineTo(x + r * 0.85, y);
          ctx.moveTo(x, y - r);
          ctx.lineTo(x, y + r);
          ctx.stroke();
        }
        break;
      }
      case 'heart': {
        const w = r * 1.15;
        const h = r * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.85);
        ctx.bezierCurveTo(x - w * 1.25, y - h * 0.25, x - w * 0.45, y - h * 1.2, x, y - h * 0.35);
        ctx.bezierCurveTo(x + w * 0.45, y - h * 1.2, x + w * 1.25, y - h * 0.25, x, y + h * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (style.sparkle) star(ctx, x + r * 0.45, y - r * 0.45, r * 0.35, 'rgba(255,255,255,.95)');
        break;
      }
      case 'star': {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? r * 1.12 : r * 0.48;
          const ang = (i / 10) * TAU - Math.PI / 2;
          const px = x + Math.cos(ang) * rad;
          const py = y + Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'crown': {
        ctx.beginPath();
        ctx.arc(x, y + r * 0.15, r * 0.92, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        const cw = r * 0.95;
        const cy = y - r * 0.75;
        ctx.moveTo(x - cw, cy + r * 0.45);
        ctx.lineTo(x - cw, cy - r * 0.15);
        ctx.lineTo(x - cw * 0.45, cy + r * 0.2);
        ctx.lineTo(x, cy - r * 0.45);
        ctx.lineTo(x + cw * 0.45, cy + r * 0.2);
        ctx.lineTo(x + cw, cy - r * 0.15);
        ctx.lineTo(x + cw, cy + r * 0.45);
        ctx.closePath();
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.stroke();
        break;
      }
      default: {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;

    // bosh harflar
    if (style.shape !== 'crown' && style.shape !== 'heart') {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(r * 1.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = 2;
      ctx.fillText(initials(player.name), x, y + 0.5);
    }
    ctx.restore();
  }

  // ---------- animatsiya ----------

  /** Donani kataklar bo'ylab bosqichma-bosqich yurgizadi. */
  async walk(playerId, path, msPerStep = 170) {
    for (const cell of path) {
      await this.glide(playerId, cell, msPerStep, 'step');
    }
  }

  /**
   * Donani bir katakdan boshqasiga silliq ko'chiradi.
   *
   * Muhim: requestAnimationFrame sahifa fonda bo'lganda ishlamaydi (telefon
   * ekrani o'chsa, boshqa ilovaga o'tilsa). Shuning uchun qo'shimcha "qo'riqchi"
   * taymer bor — animatsiya tugamasa ham va'da (promise) baribir yopiladi,
   * aks holda keyingi yurishlar navbatda qotib qolardi.
   */
  glide(playerId, cell, ms = 420, mode = 'jump') {
    const tok = this.tokens.get(playerId);
    const target = this.cellCenter(cell);
    if (!tok) {
      this.tokens.set(playerId, { cell, ...target });
      this.draw();
      return Promise.resolve();
    }
    // Kadrlar kelmayotgani allaqachon ma'lum bo'lsa — vaqt sarflamaymiz
    if (!this.rafOk) {
      tok.x = target.x;
      tok.y = target.y;
      tok.cell = cell;
      this.draw();
      return Promise.resolve();
    }

    const sx = tok.x;
    const sy = tok.y;
    const start = performance.now();

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        tok.x = target.x;
        tok.y = target.y;
        tok.cell = cell;
        this.draw();
        resolve();
      };
      // rAF ishlamay qolsa ham yurish tugashi kafolatlanadi.
      // Bir marta ushlansa — keyingi qadamlar animatsiyasiz, darhol bajariladi.
      const guard = setTimeout(() => {
        this.rafOk = false;
        finish();
      }, ms + 400);

      const tick = (now) => {
        if (done) return;
        const t = Math.min(1, (now - start) / ms);
        const e = mode === 'step' ? easeOutQuad(t) : easeInOutCubic(t);
        const hop = mode === 'step' ? Math.sin(Math.PI * t) * this.cell * 0.28 : Math.sin(Math.PI * t) * this.cell * 0.12;
        tok.x = sx + (target.x - sx) * e;
        tok.y = sy + (target.y - sy) * e - hop;
        tok.cell = cell;
        this.draw();
        if (t < 1) this._raf = requestAnimationFrame(tick);
        else finish();
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

/** Kichik besh qirrali yulduz. */
function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const ang = (i / 10) * TAU - Math.PI / 2;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
