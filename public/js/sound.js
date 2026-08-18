/** Kichik WebAudio effektlari (tashqi fayllarsiz). */

let ctx = null;
let enabled = localStorage.getItem('il_sound') !== '0';

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', gain = 0.06, delay = 0) {
  if (!enabled) return;
  try {
    const a = ac();
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, a.currentTime + delay);
    g.gain.setValueAtTime(0.0001, a.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(gain, a.currentTime + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur);
    osc.connect(g).connect(a.destination);
    osc.start(a.currentTime + delay);
    osc.stop(a.currentTime + delay + dur + 0.02);
  } catch {
    /* ovoz muhim emas */
  }
}

export const sound = {
  get enabled() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    localStorage.setItem('il_sound', enabled ? '1' : '0');
    if (enabled) tone(660, 0.1, 'triangle');
    return enabled;
  },
  dice() {
    for (let i = 0; i < 4; i++) tone(220 + Math.random() * 260, 0.05, 'square', 0.03, i * 0.07);
  },
  step() {
    tone(520, 0.05, 'triangle', 0.035);
  },
  ladder() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.05, i * 0.07));
  },
  snake() {
    [660, 550, 440, 330, 247].forEach((f, i) => tone(f, 0.16, 'sawtooth', 0.045, i * 0.07));
  },
  bonus() {
    [784, 988, 1318].forEach((f, i) => tone(f, 0.12, 'sine', 0.05, i * 0.06));
  },
  trap() {
    tone(180, 0.3, 'sawtooth', 0.05);
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.24, 'triangle', 0.06, i * 0.12));
  },
  notify() {
    tone(880, 0.09, 'sine', 0.045);
    tone(1170, 0.09, 'sine', 0.04, 0.1);
  },
};
