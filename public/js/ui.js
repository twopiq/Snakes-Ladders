/** Kichik DOM yordamchilari: ekranlar, modal oyna, toast xabarlar. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function showScreen(id) {
  for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function toast(text, kind = 'ok', ms = 2600) {
  const wrap = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'bad' ? 'bad' : ''}`;
  el.textContent = text;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

let modalHandler = null;

export function showModal(html, onAction) {
  const overlay = $('#overlay');
  const modal = $('#modal');
  modal.innerHTML = html;
  overlay.classList.remove('hidden');
  modalHandler = onAction || null;

  modal.onclick = (e) => {
    const btn = e.target.closest('[data-act]');
    if (btn && modalHandler) modalHandler(btn.dataset.act, btn);
  };
}

export function hideModal() {
  $('#overlay').classList.add('hidden');
  modalHandler = null;
}

/** Bir nechta boshqaruv elementiga bitta hodisa biriktirish. */
export function on(selector, event, handler, root = document) {
  for (const el of $$(selector, root)) el.addEventListener(event, handler);
}
