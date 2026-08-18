# Brend rasmlari

Barchasi SVG dan yasaladi — istalgan o'lchamda qayta chiqarish mumkin, sifat yo'qolmaydi.

```bash
node tools/render-brand.mjs      # SVG -> PNG (assets/brand/png/)
```

## Fayllar

| SVG | PNG | Qayerga |
|---|---|---|
| `icon-emblem.svg` | 512×512 | Bot avatari — ilon narvonga o'ralgan, boy variant |
| `icon-minimal.svg` | 512×512 | Bot avatari — sodda X shakli, kichik o'lchamda eng aniq |
| `icon-dice.svg` | 512×512 | Bot avatari — markazda zar, "o'yin" ekani darrov bilinadi |
| `cover.svg` | 640×360 | Mini App muqovasi (BotFather `/newapp`) |
| `og.svg` | 1200×630 | Havola ulashilganda ko'rinadigan rasm (saytda `/brand/og.png`) |

`cover.svg` va `og.svg` da **o'ng tomon / yuqori qism ataylab bo'sh** — o'yin uch
tilda bo'lgani uchun sarlavhani keyin har bir til uchun alohida qo'yish mumkin
(o'zbekcha, ruscha, inglizcha uchta versiya).

## Ranglar

| Nima | Rang |
|---|---|
| Fon | `#0B1220` → `#16294A` |
| Ko'k nur | `#38BDF8` |
| Ilon | `#86EFAC` → `#22C55E` → `#0D9488` |
| Narvon | `#FDE68A` → `#F59E0B` → `#B45309` |
| Yulduz/oltin | `#FACC15` |

## Telegram talablari

- Bot avatari: kvadrat, doira qilib kesiladi — chetlarda bo'sh joy qoldirilgan.
- Mini App muqovasi: aynan 640×360.
- Boshqa o'lchov kerak bo'lsa `tools/render-brand.mjs` dagi `JOBS` ro'yxatiga qo'shing.
