# Do'kon, Telegram Stars va narx boshqaruvi

O'yinda ko'rinishlar (kosmetika) sotiladi: **fishkalar**, **narvon uslublari**,
**ilon uslublari** va **taxta mavzulari**. Ular faqat tashqi ko'rinishni
o'zgartiradi — o'yin qoidalariga ta'sir qilmaydi (bu Telegram qoidalariga ham mos
va o'yinchilar orasida adolatni saqlaydi).

Har bir bo'limda bitta **bepul** variant bor, shuning uchun hech narsa sotib
olmagan o'yinchi ham bemalol o'ynayveradi.

## Qanday ishlaydi

1. O'yinchi Telegram ichida do'konni ochadi va narsani tanlaydi.
2. Server Telegram'dan **to'lov havolasi** (`createInvoiceLink`, valyuta `XTR`) oladi.
3. Mini App `openInvoice` bilan to'lov oynasini ochadi.
4. To'lov o'tgach Telegram botga `successful_payment` yuboradi — server narsani
   o'yinchiga ochadi va uni avtomatik kiydiradi.
5. Xarid `DATA_DIR/store.json` ga yoziladi (xarid raqami — `charge id` bilan).

Bot **server ichida** ishlaydi (`server/bot.js`). Buning sababi: to'lov tasdig'i
botga keladi, narsani esa bazaga yozish kerak — ikkalasi bitta jarayonda bo'lgani
uchun hech narsa yo'qolmaydi. (Telegram `getUpdates` ni ikki joyda chaqirishga
yo'l qo'ymaydi.)

## Sozlash

Render'da **Environment** bo'limiga qo'shing:

| Kalit | Nima uchun | Majburiymi |
|---|---|---|
| `BOT_TOKEN` | Bot tokeni — to'lovlar va imzo tekshiruvi | Ha (do'kon uchun) |
| `BOT_USERNAME` | Taklif havolasi uchun | Tavsiya etiladi |
| `APP_SHORT_NAME` | Mini App qisqa nomi | Tavsiya etiladi |
| `WEBAPP_URL` | Bot tugmalari ochadigan manzil (https) | Tavsiya etiladi |
| `ADMIN_PASSWORD` | Admin paneliga kirish kaliti | Ha (narx o'zgartirish uchun) |
| `DATA_DIR` | Ma'lumot saqlanadigan katalog | Pastga qarang |

`BOT_TOKEN` bo'lmasa do'kon "faqat ko'rish" rejimida ishlaydi: bepul ko'rinishlar
tanlanadi, pullik narsalar "Telegram'da" deb ko'rsatiladi.

## ⚠️ Ma'lumot saqlanishi — eng muhim ogohlantirish

Xaridlar oddiy JSON faylda (`DATA_DIR/store.json`) saqlanadi. **Render'ning bepul
tarifida disk vaqtinchalik**: har deploydan yoki qayta ishga tushishdan keyin fayl
yo'qoladi — ya'ni odamlar pul to'lab olgan narsalari yo'qoladi.

### Yechim 1 — Telegram zaxirasi (bepul tarifda ham ishlaydi) ✅

Bot bazani **Telegram'ning o'ziga** hujjat qilib yuboradi va o'sha xabarni pin
qiladi. Server qayta ishga tushganda bazasi bo'sh bo'lsa — o'sha nusxadan
tiklaydi. Hech qanday qo'shimcha xizmat, ro'yxatdan o'tish yoki to'lov kerak emas.

> **Bu faqat siz — o'yin egasi uchun, bir martalik sozlama.** O'yinchilar hech
> nima qilmaydi va bu haqda bilmaydi ham: zaxirada barcha o'yinchilarning
> ma'lumoti bitta faylda, bitta chatga yuboriladi.

Sozlash ikki qadam:

1. **O'zingiz** botga **`/id`** deb yozing — u sizga chat raqamingizni qaytaradi.
2. Render → Environment → `BACKUP_CHAT_ID` ga o'sha raqamni qo'ying va saqlang.

Tekshirish: `/admin` → "Telegram holati" da **"Telegram zaxirasi"** qatori yashil
bo'lishi kerak. O'sha yerdagi "Zaxira nusxa" bo'limida qo'lda ham zaxiralash va
tiklash tugmalari bor.

Qanday ishlaydi:

- nusxada **barcha o'yinchilar** bir joyda: xaridlar, sovg'alar, do'st hisobi,
  kiyilgan ko'rinishlar va narxlar;
- har o'zgarishdan keyin nusxa yuboriladi (ketma-ket o'zgarishlar birlashtiriladi,
  daqiqada bir martadan tez emas — Telegram bezovta bo'lmasin);
- faqat **eng oxirgi** nusxa pin qilingan bo'ladi, tiklashda shundan olinadi;
- tiklash faqat baza **bo'sh** bo'lganda bajariladi, ya'ni ishlab turgan
  server ustiga eski nusxa yozilib ketmaydi;
- pin qilingan xabarni o'chirmang — u zaxiraning o'zi.

### Yechim 2 — Render Disk (pullik tarif)

Dashboard → xizmat → Disks → Add Disk, Mount Path masalan `/var/data`, so'ng
`DATA_DIR=/var/data` qilib qo'ying. Ikkalasini birga ishlatsa ham bo'ladi:
disk asosiy, Telegram esa zaxira nusxa bo'lib qoladi.

### Yechim 3 — tashqi baza

`server/store.js` ni Postgres yoki Redis'ga o'tkazing — undagi metodlar
(`user`, `grant`, `equip`, `recordPurchase`, `price`) shu maqsadda ajratib yozilgan.

## Narxlarni o'zgartirish

Admin paneli: **`https://sizning-sayt.com/admin`**

Kirish uchun `ADMIN_PASSWORD` dagi kalitni kiriting (kalit brauzerda sessiya
davomida saqlanadi, serverga har so'rovda yuboriladi).

Panelda:

- **Narxni o'zgartirish** — maydonga yangi ⭐ sonini yozib "Saqlash". Yangi narx
  darhol kuchga kiradi, keyingi xarid o'sha narxda bo'ladi.
- **Qaytarish** — "katalog narxi"ga (koddagi boshlang'ich qiymatga) qaytaradi.
- **Sotuvdan olish** — narsa do'konda ko'rinmay qoladi (allaqachon sotib olganlar
  ishlatishda davom etadi).
- **Xaridlar ro'yxati** va har biri uchun **yulduzlarni qaytarish** tugmasi.
- Umumiy hisobot: tushum, xaridlar soni, o'yinchilar soni.

Narx chegarasi: 1 dan 100000 gacha butun son. O'zgartirish `store.json` ga
yoziladi, ya'ni qayta ishga tushirilgandan keyin ham saqlanadi (agar disk doimiy bo'lsa).

### Narxni koddan o'zgartirish

Boshlang'ich narxlar `public/shared/cosmetics.js` da (`price` maydoni). Panelda
narx o'zgartirilgan bo'lsa, u koddagidan ustun turadi — "Qaytarish" tugmasi
koddagi qiymatga qaytaradi.

## Yangi ko'rinish qo'shish

`public/shared/cosmetics.js` ga yozuv qo'shing:

```js
{
  id: 'token-yangi', slot: 'token', name: 'Yangi fishka',
  rarity: 'nodir', price: 80,
  about: 'Qisqacha tavsif',
  style: { shape: 'star', glow: true },
}
```

- `slot`: `token` | `ladder` | `snake` | `board` | `bundle`
- `rarity`: `free` | `oddiy` | `nodir` | `afsonaviy`
- `style` — chizuvchi (`public/js/board.js`) tushunadigan parametrlar:
  - fishka: `shape` (`circle`, `ring`, `gem`, `star`, `crown`), `glow`, `facets`, `metallic`
  - narvon: `rail` (ikkita rang), `rung`, `wavy`, `glow`, `metallic`
  - ilon: `hue`, `stripes`, `zigzag`, `spikes`, `glow`
  - taxta: `light`, `dark`, `accent`, `grid`, `number`, `dark_ui`
- `grants: [...]` — to'plam yasash uchun (bir xaridda bir nechta narsa ochiladi)

`npm test` katalogni tekshiradi: id takrorlanmasligi, har bo'limda aynan bitta
bepul variant borligi va narxlar butun son ekanligi.

## Do'st chaqirish mukofotlari

To'rtta ko'rinish **sotilmaydi** — ularni faqat do'st chaqirib olish mumkin.
Bu o'yinchilarni yangi odam olib kelishga undaydi (viral o'sish).

| Do'stlar | Mukofot | Bo'lim |
|---|---|---|
| 3 | Do'stlik yuragi | Fishka |
| 5 | Yulduzli narvon | Narvon |
| 7 | Yulduz ilon | Ilon |
| 10 | Do'stlar galaktikasi | Taxta |

Har bir mukofot boshqa bo'limdan — shuning uchun 10 ta do'st chaqirgan o'yinchida
to'liq "do'stlik" to'plami yig'iladi.

### Qanday hisoblanadi

1. O'yinchi "Do'stlar" ekranidan shaxsiy havolasini oladi:
   - `APP_SHORT_NAME` sozlangan bo'lsa: `https://t.me/<bot>/<app>?startapp=r<uning_id>`
   - sozlanmagan bo'lsa: `https://t.me/<bot>?start=r<uning_id>` — bot javob berib,
     o'yinni ochadigan tugmani yuboradi (parametr yo'qolmaydi).
2. Do'st shu havola orqali kiradi — server uni chaqiruvchiga bog'laydi (*kutilmoqda*).
3. Do'st **kamida bitta o'yin boshlaganda** chaqiruv tasdiqlanadi va hisobga qo'shiladi.
4. 3/5/7/10 ga yetganda mukofot avtomatik ochiladi va botdan xabar keladi.

Taklif yo'lda yo'qolmasligi uchun u **uch joyda** biriktiriladi:

- bot `/start r<id>` xabarini olganda (Mini App umuman ochilmasa ham);
- Mini App ochilganda — do'kon va "Do'stlar" so'rovlarida;
- o'yin boshlanganida (`/api/shop/played`).

Havola brauzer xotirasida (`localStorage`) saqlanadi va server "biriktirdim"
(yoki "endi kech") deb javob bergunicha har so'rovda qayta yuboriladi.

### Soxta hisoblarga qarshi qoidalar

- o'zini o'zi chaqira olmaydi;
- bir o'yinchi faqat bitta chaqiruvchiga bog'lanadi va faqat bir marta sanaladi;
- allaqachon o'ynagan odamni keyin "men chaqirdim" deb yozib bo'lmaydi;
- shunchaki havolani ochish yetarli emas — o'yin boshlanishi kerak.

Mukofotlar faqat tashqi ko'rinish bo'lgani uchun aldashdan foyda kam, lekin bu
qoidalar oddiy "havolani 10 marta ochish" usulini butunlay to'sadi.

### Hisob 0 bo'lib turibdimi?

Tartib bilan tekshiring:

1. **Ma'lumot saqlanyaptimi?** `/admin` → "Telegram holati" → *Ma'lumot saqlanishi*.
   Qizil bo'lsa — `DATA_DIR` sozlanmagan va Render har qayta ishga tushganda
   do'st hisobini ham, xaridlarni ham o'chirib tashlaydi. Bu eng ko'p uchraydigan sabab.
2. **Havola to'g'rimi?** O'sha bo'limdagi *Taklif havolasi* qatoriga qarang.
   Bo'sh bo'lsa `BOT_USERNAME` yo'q (bot ulangan bo'lsa server uni o'zi topadi).
3. **Do'st o'ynadimi?** "Do'stlar" ekranida "N ta hali o'ynamagan" deb yozilsa —
   havola ishlagan, lekin do'st hali birorta o'yin boshlamagan. Bitta o'yin
   boshlansa hisob darhol o'sadi.
4. **Admin panelidagi "O'yinchilar"** ro'yxatida do'stni topib, uning yonida
   "N ta do'st" yozuvi bor-yo'qligini ko'ring — bog'lanish bo'lgan-bo'lmagani shu yerda ko'rinadi.

## Bepul berish (admin sovg'asi)

`/admin` → **"🎁 Bepul berish"** bo'limi. Telegram ID va ko'rinishni tanlab,
"Bepul berish" tugmasini bosasiz:

- do'kondagi **istalgan** ko'rinish beriladi — to'plamlar va do'st mukofotlari ham;
- yulduz hisobiga (`starsSpent`) tegmaydi, ya'ni bu xarid emas;
- "Telegram orqali xabar yuborilsin" yoqilgan bo'lsa, o'yinchiga botdan xabar boradi;
- xato berilgan sovg'ani "So'nggi sovg'alar" ro'yxatidan **olib qo'yish** mumkin
  (o'sha ko'rinish kiyilgan bo'lsa, kiyimi bepul variantga qaytadi).

Telegram ID ni bilmasangiz — pastdagi **"O'yinchilar"** ro'yxatidan ismi bo'yicha
qidirib, "Tanlash" tugmasini bosing: ID formaga o'zi tushadi. O'yinchi hali
ilovaga kirmagan bo'lsa ham ID bo'yicha berish mumkin — u kirganda ko'rinish joyida turadi.

## Sayt versiyasidan Telegram'ga yo'naltirish

Stars faqat Telegram ichida ishlagani uchun sayt versiyasidagi o'yinchi uch joyda
Telegram ilovasiga taklif qilinadi:

| Joy | Ko'rinishi |
|---|---|
| Menyu | Yuqorida banner: "Telegram'da ko'proq imkoniyat" + tugma. Yopib qo'ysa 7 kun ko'rinmaydi |
| Do'kon | Har bir pullik kartochkada "⭐ narx · Telegram'da ochish" tugmasi |
| O'yin tugagach | Natijalar oynasida: "Fishkangizni almashtirasizmi?" + Ochish tugmasi |
| Onlayn xona | "Telegram havolasi" tugmasi — do'st havolani bossa, to'g'ridan-to'g'ri o'sha xonaga Telegram ichida kiradi |

Bularning hammasi **faqat** `BOT_USERNAME` sozlangan bo'lsa va o'yinchi Telegram
ichida bo'lmasa ko'rsatiladi. Telegram ichida hech qanday taklif chiqmaydi.

Havola shakli: `https://t.me/<BOT_USERNAME>/<APP_SHORT_NAME>` (xona chaqirig'ida
oxiriga `?startapp=KOD` qo'shiladi).

## Telegram talablari

- **Faqat raqamli tovar** — Stars aynan shu uchun. Jismoniy tovar sotib bo'lmaydi.
- **Qaytarish imkoniyati bo'lishi shart** — bot `/support` buyrug'iga javob
  beradi va admin panelida qaytarish tugmasi bor.
- To'lovdan oldin `pre_checkout_query` ga **10 soniya ichida** javob berish kerak —
  server buni avtomatik qiladi.
- Yulduzlarni pulga aylantirish Telegram tomonidan (Fragment orqali) amalga
  oshiriladi; hozirgi qoida bo'yicha yulduz hisobga tushgach 21 kundan keyin
  yechish mumkin.

## Sinov

Haqiqiy pul sarflamasdan sinash uchun testlar bor:

```bash
npm test
```

`test/payments.test.mjs` soxta Telegram API bilan butun yo'lni tekshiradi:
hisob-faktura → `pre_checkout` → to'lov → narsa ochilishi → narx o'zgarishi →
qaytarish. Ya'ni pul yo'li kodda buzilib qolsa, test darhol ko'rsatadi.
