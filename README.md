# 🐍 Ilonlar va Narvonlar

Qo'lda chizilgan "Ilonlar va Narvonlar" stol o'yinining elektron ko'rinishi.

- **Onlayn** — 2 kishi, real vaqtda (WebSocket). Xona kodi orqali yoki tezkor juftlash bilan.
- **Oflayn** — bitta qurilmada 2 dan 6 kishigacha, navbat bilan.
- **5 ta katta xarita** — 120 dan 196 katakkacha.
- Brauzerda ishlaydi, telefon va kompyuterga moslashadi. Ovoz effektlari, chat, o'yin jurnali.

## Ishga tushirish

```bash
npm install
npm start
```

So'ng brauzerda `http://localhost:3000` ni oching.

Portni o'zgartirish: `PORT=8080 npm start`.

Testlar:

```bash
npm test
```

## Xaritalar

| Xarita | O'lcham | Kataklar | Tavsif |
|---|---|---|---|
| Klassik 130 | 10 × 13 | 130 | Asl qo'lda chizilgan taxta uslubida |
| Zumrad vodiysi 144 | 12 × 12 | 144 | Narvonlar ko'p, hujumkor o'yin |
| Olov cho'qqisi 180 | 12 × 15 | 180 | Uzun yo'l, ilonlar ko'p |
| Koinot 196 | 14 × 14 | 196 | Eng katta taxta |
| Tezkor 120 | 10 × 12 | 120 | Qisqa va shiddatli |

Har bir xaritada:

- 🪜 **narvon** — yuqoriga ko'taradi;
- 🐍 **ilon** — boshiga tushsangiz dumigacha tushirasiz;
- ★ **bonus katak** — qo'shimcha zar;
- ✖ **tuzoq katak** — bir yurish o'tkazib yuboriladi.

Yangi xarita qo'shish uchun `public/shared/maps.js` ga yozuv qo'shing — u avtomatik ravishda
menyularda ham, taxtada ham paydo bo'ladi. `node tools/gen-maps.mjs` esa yangi xarita uchun
ilon/narvon joylashuvini generatsiya qilib beradi. `npm test` xaritani tekshiradi
(kataklar takrorlanmasligi, chegaradan chiqmasligi va h.k.).

## Qoidalar (sozlanadi)

| Qoida | Ma'nosi |
|---|---|
| Finishga aniq tushish | Ortiqcha qadamlar orqaga qaytariladi |
| 6 tashlasa — yana tashlaydi | Qo'shimcha yurish |
| Ketma-ket 3 ta 6 | Yurish bekor qilinadi |
| Maxsus kataklar | ★ bonus va ✖ tuzoq ishlaydi |
| Barcha o'rinlar aniqlanguncha | Birinchi g'olibdan keyin ham davom etadi (oflayn) |

## Onlayn rejim qanday ishlaydi

1. Bir o'yinchi **"Xona ochish"** tugmasini bosadi va 4 belgili kodni oladi.
2. Ikkinchi o'yinchi shu kodni kiritib qo'shiladi — o'yin darhol boshlanadi.
3. **Tezkor o'yin** tugmasi navbatdagi birinchi raqib bilan avtomatik juftlaydi.

Zar **serverda** tashlanadi va ikkala mijozga bir xil holat yuboriladi — ya'ni natijani
o'zgartirib bo'lmaydi. Navbat qoidasi ham serverda tekshiriladi. Aloqa uzilsa, o'yinchi
60 soniya ichida (sahifani yangilagan bo'lsa ham) o'z o'rniga qaytadi.

## Loyiha tuzilishi

```
server/
  index.js       HTTP + WebSocket server, xabarlar protokoli
  rooms.js       Onlayn xonalar, o'rinlar, qayta ulanish, tezkor juftlash
  static.js      public/ katalogini xavfsiz uzatish
public/
  index.html     Ekranlar: menyu, oflayn sozlama, onlayn lobbi, o'yin
  css/style.css
  js/
    app.js       Ekranlar va rejimlarni bog'lash
    game-view.js O'yin ekrani, animatsiyalar, natijalar
    board.js     Canvas: taxta, ilon/narvon chizish, donalar harakati
    online.js    WebSocket mijozi
    sound.js     Ovoz effektlari
    ui.js        DOM yordamchilari
  shared/
    maps.js      Xaritalar (server va brauzer uchun umumiy)
    engine.js    O'yin qoidalari — sof funksiyalar, umumiy
tools/gen-maps.mjs  Xarita generatori
test/               Qoidalar, xaritalar va onlayn rejim testlari
```

`shared/` ichidagi qoidalar moduli ikkala tomonda ham ishlatiladi: oflayn rejimda
brauzer o'zi hisoblaydi, onlayn rejimda esa server — kod bitta bo'lgani uchun
natijalar bir xil bo'ladi.

## Boshqaruv

- **Zar tashlash** tugmasi yoki **Bo'sh joy / Enter** tugmalari.
- Xona kodini nusxalash uchun yuqoridagi kod belgisiga bosing.
- Ovozni yuqoridagi 🔊 tugmasi bilan o'chirish mumkin.
