# 🐍 Ilonlar va Narvonlar

Qo'lda chizilgan "Ilonlar va Narvonlar" stol o'yinining elektron ko'rinishi.

- **Telegram Mini App** — o'yin Telegram ichida ochiladi, ism profildan olinadi, taklif havolasi bilan do'stni chaqirasiz ([sozlash](docs/telegram-mini-app.md)).
- **Onlayn** — **2 dan 4 kishigacha**, real vaqtda (WebSocket). Xona kodi orqali yoki tezkor juftlash bilan.
- **Oflayn** — bitta qurilmada 2 dan 6 kishigacha, navbat bilan.
- **5 ta katta xarita** — 120 dan 196 katakkacha.
- **Do'kon** — fishka, narvon, ilon va taxta ko'rinishlari; Telegram Stars (⭐) orqali ([sozlash](docs/monetizatsiya.md)).
- **Do'st chaqirish mukofotlari** — 3, 5, 7, 10 ta do'st uchun sotilmaydigan maxsus ko'rinishlar.
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

1. Xona ochuvchi **nechta o'yinchi** (2 dan 4 gacha) ekanini tanlaydi va 4 belgili kodni oladi.
2. Qolganlar shu kodni kiritib qo'shiladi — xona to'lganda o'yin avtomatik boshlanadi.
3. Hamma yig'ilmasa, **xona egasi "Hozir boshlash"** tugmasi bilan kamroq
   kishi bilan boshlashi mumkin (kamida 2 kishi).
4. **Tezkor o'yin** tugmasi navbatdagi birinchi raqib bilan avtomatik juftlaydi (2 kishi).

O'yin o'rtasida kimdir chiqib ketsa, uning navbati o'tkazib yuboriladi va qolganlar
davom etaveradi; bitta o'yinchi qolsa — u g'olib bo'ladi.

Zar **serverda** tashlanadi va ikkala mijozga bir xil holat yuboriladi — ya'ni natijani
o'zgartirib bo'lmaydi. Navbat qoidasi ham serverda tekshiriladi. Aloqa uzilsa, o'yinchi
60 soniya ichida (sahifani yangilagan bo'lsa ham) o'z o'rniga qaytadi.

## Telegram Mini App

O'yin Telegram ichida ham ishlaydi — kod bitta, faqat qo'shimcha imkoniyatlar yoqiladi:
ism Telegram profilidan olinadi va server uni imzo orqali tekshiradi, zar tugmasi
Telegram'ning pastki asosiy tugmasiga chiqadi, tebranish (haptika) qo'shiladi,
"Do'stni chaqirish" tugmasi esa `?startapp=KOD` havolasini ulashadi — do'st havolani
bosishi bilan to'g'ridan-to'g'ri xonangizga tushadi.

Muhit o'zgaruvchilari: `BOT_TOKEN`, `BOT_USERNAME`, `APP_SHORT_NAME`.
To'liq yo'riqnoma: [docs/telegram-mini-app.md](docs/telegram-mini-app.md).

Bot (`/start`, inline taklif va Stars to'lovlari) **server ichida** ishlaydi —
`BOT_TOKEN` berilsa avtomatik ishga tushadi, alohida jarayon kerak emas.

## Do'kon va monetizatsiya

Ko'rinishlar Telegram Stars orqali sotiladi, narxlarni admin panelidan
(`/admin`, `ADMIN_PASSWORD` bilan) istalgan vaqt oshirish yoki tushirish mumkin.
Har bir bo'limda bitta bepul variant bor — hech narsa sotib olmagan o'yinchi ham
to'liq o'ynaydi.

Sayt versiyasida Stars ishlamaydi (Telegram cheklovi), shuning uchun saytdagi
o'yinchi menyu banneri, do'kondagi tugma va o'yin natijasi orqali Telegram
ilovasiga taklif qilinadi — bepul ko'rinishlar esa saytda ham tanlanadi.

To'liq yo'riqnoma: [docs/monetizatsiya.md](docs/monetizatsiya.md)
(muhim: doimiy disk sozlanmasa, xaridlar deploydan keyin yo'qoladi).

## Loyiha tuzilishi

```
server/
  index.js       HTTP + WebSocket server, xabarlar protokoli
  rooms.js       Onlayn xonalar (2-4 kishi), o'rinlar, qayta ulanish, tezkor juftlash
  telegram.js    Mini App initData imzosini tekshirish, sozlama
  bot.js         Telegram bot va Stars to'lovlari (server ichida)
  store.js       O'yinchilar, xaridlar va narxlar (JSON saqlagich)
  static.js      public/ katalogini xavfsiz uzatish
public/
  index.html     Ekranlar: menyu, oflayn sozlama, onlayn lobbi, o'yin
  css/style.css
  js/
    app.js       Ekranlar va rejimlarni bog'lash
    game-view.js O'yin ekrani, animatsiyalar, natijalar
    board.js     Canvas: taxta, ilon/narvon chizish, donalar harakati
    online.js    WebSocket mijozi (yurak urishi, qayta ulanish, sinxronlash)
    telegram.js  Telegram Mini App integratsiyasi
    shop.js      Do'kon: ko'rinishlar, Stars xaridlari
    promo.js     Saytdan Telegram ilovasiga yo'naltirish
    friends.js   Do'st chaqirish ekrani va mukofotlar
    preview.js   Do'kon/mukofot namunalari
    admin.js     Admin paneli (narxlar, xaridlar, qaytarish)
    sound.js     Ovoz effektlari
    ui.js        DOM yordamchilari
  shared/
    maps.js      Xaritalar (server va brauzer uchun umumiy)
    engine.js    O'yin qoidalari — sof funksiyalar, umumiy
    cosmetics.js Ko'rinishlar katalogi va narxlari
  admin.html     Narx boshqaruvi sahifasi
assets/brand/       Bot avatari, muqova va ulashuv rasmlari (SVG + PNG)
tools/gen-maps.mjs  Xarita generatori
tools/render-brand.mjs  SVG -> PNG (npm run brand)
docs/               Telegram Mini App va monetizatsiya yo'riqnomalari
test/               Qoidalar, xaritalar va onlayn rejim testlari
```

`shared/` ichidagi qoidalar moduli ikkala tomonda ham ishlatiladi: oflayn rejimda
brauzer o'zi hisoblaydi, onlayn rejimda esa server — kod bitta bo'lgani uchun
natijalar bir xil bo'ladi.

## Aloqa uzilishiga chidamlilik

Mobil tarmoqda ulanish "yarim ochiq" qolishi mumkin — brauzer ulanish tirik deb
o'ylaydi, lekin serverdan xabar kelmaydi. Shunga qarshi:

- mijoz har 12 soniyada `ping` yuboradi va javob kelmasa ulanishni yangilaydi;
- zar tashlagandan keyin 2,5 soniya ichida javob kelmasa — avtomatik sinxronlash;
- telefon ekrani yonganda (sahifa fondan qaytganda) holat serverdan qayta olinadi;
- animatsiya kadrlari kelmasa (fon rejimi) yurish darhol yakunlanadi — o'yin
  hech qachon "qotib" qolmaydi;
- server navbat xatosiga javoban joriy holatni ham yuboradi.

## Admin paneli

`/admin` manzilida (kirish uchun `ADMIN_PASSWORD` kerak):

- ko'rinishlar narxini o'zgartirish va sotuvdan olish;
- Telegram sozlamalari diagnostikasi (token, bot nomi, taklif havolasi, ma'lumot saqlanishi);
- **istalgan ko'rinishni Telegram foydalanuvchisiga bepul berish** va kerak bo'lsa qaytarib olish;
- o'yinchilar ro'yxati (ism/ID bo'yicha qidiruv) va do'st chaqirish hisobi;
- xaridlar tarixi va yulduzlarni qaytarish.

## Boshqaruv

- **Zar tashlash** tugmasi yoki **Bo'sh joy / Enter** tugmalari.
- Xona kodini nusxalash uchun yuqoridagi kod belgisiga bosing.
- Ovozni yuqoridagi 🔊 tugmasi bilan o'chirish mumkin.
