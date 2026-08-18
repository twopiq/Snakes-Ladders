/**
 * Ko'rinishlar (kosmetika) katalogi — fishkalar, narvon/ilon uslublari va taxta mavzulari.
 *
 * Bu fayl ham brauzerda, ham serverda ishlatiladi:
 *   - brauzer chizishda uslub parametrlarini shu yerdan oladi;
 *   - server sotib olishni tekshirishda shu ro'yxatga tayanadi.
 *
 * MUHIM: narxlar bu yerda faqat "boshlang'ich" qiymat. Haqiqiy narxni admin
 * panelidan o'zgartirish mumkin (server/store.js dagi priceOverrides), shuning
 * uchun mijoz narxni har doim /api/catalog dan oladi.
 */

/** Kiyish joylari — har bir o'yinchida har biridan bittadan. */
export const SLOTS = ['token', 'ladder', 'snake', 'board'];

export const SLOT_NAMES = {
  token: 'Fishka',
  ladder: 'Narvon',
  snake: 'Ilon',
  board: 'Xarita ko\'rinishi',
};

/** Nodirlik darajalari — do'konda rang bilan ajratiladi. */
export const RARITY = {
  free: { name: 'Bepul', color: '#94a3b8' },
  oddiy: { name: 'Oddiy', color: '#38bdf8' },
  nodir: { name: 'Nodir', color: '#a855f7' },
  afsonaviy: { name: 'Afsonaviy', color: '#f59e0b' },
};

export const COSMETICS = [
  // ---------------------------------------------------------------- FISHKALAR
  {
    id: 'token-classic', slot: 'token', name: 'Klassik dona', rarity: 'free', price: 0,
    about: 'Oddiy yaltiroq dona — boshlang\'ich ko\'rinish.',
    style: { shape: 'circle' },
  },
  {
    id: 'token-ring', slot: 'token', name: 'Neon halqa', rarity: 'oddiy', price: 35,
    about: 'Ichi bo\'sh, chekkasi yorqin nur bilan yonadi.',
    style: { shape: 'ring', glow: true },
  },
  {
    id: 'token-gem', slot: 'token', name: 'Qimmatbaho tosh', rarity: 'nodir', price: 75,
    about: 'Qirralari yaltiraydigan olmos shaklidagi dona.',
    style: { shape: 'gem', facets: true },
  },
  {
    id: 'token-star', slot: 'token', name: 'Yulduz', rarity: 'nodir', price: 90,
    about: 'Besh qirrali yulduz — taxtada darrov ko\'zga tashlanadi.',
    style: { shape: 'star', glow: true },
  },
  {
    id: 'token-crown', slot: 'token', name: 'Shohona toj', rarity: 'afsonaviy', price: 150,
    about: 'Boshida oltin toji bor dona. G\'oliblar uchun.',
    style: { shape: 'crown', metallic: true, glow: true },
  },

  // ---------------------------------------------------------------- NARVONLAR
  {
    id: 'ladder-wood', slot: 'ladder', name: 'Yog\'och narvon', rarity: 'free', price: 0,
    about: 'Klassik yashil-jigarrang narvon.',
    style: { kind: 'wood', rail: ['#16a34a', '#84cc16'], rung: 'rgba(202,138,4,.9)' },
  },
  {
    id: 'ladder-rope', slot: 'ladder', name: 'Arqon narvon', rarity: 'oddiy', price: 40,
    about: 'Eshilgan arqon va yog\'och pog\'onalar.',
    style: { kind: 'rope', rail: ['#a16207', '#eab308'], rung: 'rgba(120,53,15,.9)', wavy: true },
  },
  {
    id: 'ladder-crystal', slot: 'ladder', name: 'Billur narvon', rarity: 'nodir', price: 85,
    about: 'Shaffof muz-billur, ichidan nur o\'tadi.',
    style: { kind: 'crystal', rail: ['#22d3ee', '#a5f3fc'], rung: 'rgba(14,116,144,.75)', glow: true },
  },
  {
    id: 'ladder-gold', slot: 'ladder', name: 'Oltin narvon', rarity: 'afsonaviy', price: 140,
    about: 'Sof oltin — har ko\'tarilish bayramdek.',
    style: { kind: 'gold', rail: ['#b45309', '#fde68a'], rung: 'rgba(146,64,14,.95)', metallic: true, glow: true },
  },

  // ---------------------------------------------------------------- ILONLAR
  {
    id: 'snake-classic', slot: 'snake', name: 'Oddiy ilon', rarity: 'free', price: 0,
    about: 'Rang-barang klassik ilonlar.',
    style: { kind: 'classic' },
  },
  {
    id: 'snake-candy', slot: 'snake', name: 'Konfet ilon', rarity: 'oddiy', price: 40,
    about: 'Chiziqli shirinlik ilonlari — bolalar uchun.',
    style: { kind: 'candy', hue: 330, stripes: true },
  },
  {
    id: 'snake-electric', slot: 'snake', name: 'Chaqmoq ilon', rarity: 'nodir', price: 85,
    about: 'Elektr yoyi kabi keskin va yorqin.',
    style: { kind: 'electric', hue: 190, glow: true, zigzag: true },
  },
  {
    id: 'snake-dragon', slot: 'snake', name: 'Ajdaho', rarity: 'afsonaviy', price: 150,
    about: 'Qirrali tikanlari va olovli nafasi bor ajdaho.',
    style: { kind: 'dragon', hue: 12, spikes: true, glow: true },
  },

  // ---------------------------------------------------------------- TAXTALAR
  {
    id: 'board-default', slot: 'board', name: 'Xarita rangi', rarity: 'free', price: 0,
    about: 'Har bir xaritaning o\'z rangi.',
    style: { useMapTheme: true },
  },
  {
    id: 'board-papirus', slot: 'board', name: 'Qadimiy papirus', rarity: 'oddiy', price: 55,
    about: 'Sarg\'aygan qog\'oz — qo\'lda chizilgandek.',
    style: { light: '#fdf6e3', dark: '#f0e2c0', accent: '#b45309', grid: '#c8a97a', number: 'rgba(69,26,3,.75)' },
  },
  {
    id: 'board-tun', slot: 'board', name: 'Tungi neon', rarity: 'nodir', price: 110,
    about: 'Qorong\'i taxta va neon chiziqlar.',
    style: { light: '#1e293b', dark: '#0f172a', accent: '#22d3ee', grid: '#334155', number: 'rgba(226,232,240,.85)', dark_ui: true },
  },
  {
    id: 'board-muz', slot: 'board', name: 'Muzlik', rarity: 'nodir', price: 110,
    about: 'Muz ranglari, sovuq va tiniq.',
    style: { light: '#f0f9ff', dark: '#d7ecfb', accent: '#0284c7', grid: '#8ec5e8', number: 'rgba(7,58,89,.75)' },
  },
  {
    id: 'board-oltin', slot: 'board', name: 'Oltin saroy', rarity: 'afsonaviy', price: 200,
    about: 'Qora marmar ustida oltin naqshlar.',
    style: { light: '#2a2416', dark: '#1a160d', accent: '#f5c518', grid: '#5c4a1a', number: 'rgba(253,230,138,.9)', dark_ui: true },
  },

  // ---------------------------------------------------------------- TO'PLAMLAR
  {
    id: 'bundle-afsona', slot: 'bundle', name: 'Afsonaviy to\'plam', rarity: 'afsonaviy', price: 420,
    about: 'Shohona toj + Oltin narvon + Ajdaho + Oltin saroy. Alohida olgandan arzon.',
    grants: ['token-crown', 'ladder-gold', 'snake-dragon', 'board-oltin'],
  },
  {
    id: 'bundle-boshlash', slot: 'bundle', name: 'Boshlovchi to\'plam', rarity: 'oddiy', price: 99,
    about: 'Neon halqa + Arqon narvon + Konfet ilon + Papirus taxta.',
    grants: ['token-ring', 'ladder-rope', 'snake-candy', 'board-papirus'],
  },
];

const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

export function getItem(id) {
  return BY_ID.get(id) || null;
}

export function itemsBySlot(slot) {
  return COSMETICS.filter((c) => c.slot === slot);
}

/** Sotib olish shart bo'lmagan (bepul) ko'rinishlar. */
export function freeItems() {
  return COSMETICS.filter((c) => c.price === 0).map((c) => c.id);
}

/** Yangi o'yinchining sukut bo'yicha kiyimi. */
export function defaultEquipped() {
  return { token: 'token-classic', ladder: 'ladder-wood', snake: 'snake-classic', board: 'board-default' };
}

/**
 * Kiyilgan ko'rinishlardan chizish uchun uslublar to'plamini yasaydi.
 * Noma'lum yoki sotib olinmagan narsa berilsa — bepul variantga qaytadi.
 */
export function resolveStyles(equipped = {}) {
  const def = defaultEquipped();
  const out = {};
  for (const slot of SLOTS) {
    const item = getItem(equipped[slot]) || getItem(def[slot]);
    out[slot] = { id: item.id, ...item.style };
  }
  return out;
}

/** To'plam ichidagi barcha narsalar (oddiy narsa uchun — o'zi). */
export function grantsOf(id) {
  const item = getItem(id);
  if (!item) return [];
  return item.grants?.length ? [...item.grants, id] : [id];
}

/** Katalog to'g'riligini tekshiradi (testlar uchun). */
export function validateCatalog() {
  const errors = [];
  const seen = new Set();
  for (const item of COSMETICS) {
    if (seen.has(item.id)) errors.push(`takrorlangan id: ${item.id}`);
    seen.add(item.id);
    if (!item.name) errors.push(`${item.id}: nom yo'q`);
    if (!SLOTS.includes(item.slot) && item.slot !== 'bundle') errors.push(`${item.id}: noma'lum slot ${item.slot}`);
    if (!Number.isInteger(item.price) || item.price < 0) errors.push(`${item.id}: narx butun son bo'lishi kerak`);
    if (!RARITY[item.rarity]) errors.push(`${item.id}: noma'lum nodirlik ${item.rarity}`);
    for (const g of item.grants || []) {
      if (!BY_ID.has(g)) errors.push(`${item.id}: to'plamdagi ${g} topilmadi`);
    }
  }
  for (const slot of SLOTS) {
    const free = itemsBySlot(slot).filter((c) => c.price === 0);
    if (free.length !== 1) errors.push(`${slot}: aynan bitta bepul variant bo'lishi kerak (hozir ${free.length})`);
  }
  return errors;
}
