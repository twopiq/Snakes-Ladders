# Telegram Mini App sifatida ishga tushirish

O'yin ikki joyda bir xil kod bilan ishlaydi: oddiy sayt sifatida va Telegram ichida
Mini App sifatida. Quyida Telegram qismini yo'lga qo'yish tartibi.

## 1. Bot yarating

Telegramda [@BotFather](https://t.me/BotFather) ga kiring:

```
/newbot
Nomi:            Ilonlar va Narvonlar
Foydalanuvchi:   ilonlar_narvonlar_bot     (oxiri "bot" bilan tugashi shart)
```

BotFather sizga **token** beradi — `123456789:AAE...` ko'rinishida.
**Bu tokenni hech kimga bermang** va kod ichiga yozmang.

## 2. Mini App'ni ro'yxatdan o'tkazing

Yana BotFather'da:

```
/newapp
→ botni tanlang
→ Title:        Ilonlar va Narvonlar
→ Description:  2-4 kishi onlayn yoki 6 kishi bitta telefonda o'ynaladigan klassik o'yin
→ Photo:        640x360 rasm
→ Web App URL:  https://snakes-ladders-2jjq.onrender.com
→ Short name:   oyin        ← havolada shu ishlatiladi
```

Endi o'yin `https://t.me/ilonlar_narvonlar_bot/oyin` havolasi orqali ochiladi.

Chatdagi pastki "menyu" tugmasi ham o'yinni ochsin desangiz:

```
/mybots → botni tanlang → Bot Settings → Menu Button → URL kiriting
```

## 3. Serverga sozlamalarni bering

Render'da: **Dashboard → xizmatingiz → Environment → Add Environment Variable**

| Kalit | Qiymat | Nima uchun |
|---|---|---|
| `BOT_TOKEN` | BotFather bergan token | O'yinchi haqiqatan o'sha Telegram foydalanuvchisi ekanini tekshirish |
| `BOT_USERNAME` | `ilonlar_narvonlar_bot` | Taklif havolasini yasash uchun (bot ulangan bo'lsa server uni o'zi ham topadi) |
| `APP_SHORT_NAME` | `oyin` | 2-bosqichdagi "Short name". Berilmasa havolalar bot chati orqali ochiladi |
| `DATA_DIR` | doimiy disk yo'li | **Xaridlar va do'st hisobi shu yerda saqlanadi** — berilmasa har deploydan keyin o'chadi |

Saqlagach Render xizmatni qayta ishga tushiradi. Tekshirish:

```
https://sizning-sayt.onrender.com/api/config
```

`"enabled": true` bo'lsa — hammasi joyida.

> `BOT_TOKEN` berilmasa ham o'yin ishlayveradi, faqat Telegram ismini tekshirish
> o'chiq bo'ladi (o'yinchi o'zi kiritgan ism ishlatiladi).

## 4. Bot (ixtiyoriy)

`/start` ga javob beradigan va taklif havolalarini yuboradigan kichik bot ham bor:

```bash
BOT_TOKEN=123:abc WEBAPP_URL=https://sizning-sayt.onrender.com npm run bot
```

Buni Render'da alohida **Background Worker** sifatida ishga tushirsangiz bo'ladi
(Start Command: `npm run bot`). Bot bo'lmasa ham Mini App ishlaydi — u faqat
`/start` tugmasi va inline taklif uchun kerak.

## Telegram ichida nima o'zgaradi

| Xususiyat | Tafsilot |
|---|---|
| Ism | Telegram profilidan olinadi, o'zgartirib bo'lmaydi (server imzoni tekshiradi) |
| Zar tugmasi | Telegram'ning pastki asosiy tugmasiga chiqadi — har doim ko'rinib turadi |
| Orqaga | Telegram'ning o'z "orqaga" tugmasi ishlaydi. O'yin davom etayotgan bo'lsa avval tasdiq so'raydi — tasodifan bosilib o'yindan chiqib ketilmaydi |
| Tebranish | Zar, narvon, ilon, g'alaba — har biriga alohida haptik javob |
| Taklif | "Do'stni chaqirish" tugmasi Telegram ulashish oynasini ochadi |
| Havola bilan kirish | `?startapp=KOD` bo'lsa, o'yinchi to'g'ridan-to'g'ri xonaga tushadi |
| Tasodifan yopish | O'yin davomida Telegram tasdiq so'raydi |

## Sinash

1. Telefonda `https://t.me/<bot>/<short_name>` ni oching.
2. "Xona ochish" → "Do'stni chaqirish" → istalgan chatga yuboring.
3. Do'stingiz havolani bosishi bilan to'g'ridan-to'g'ri o'sha xonaga tushadi.

Kompyuterda sinash uchun (Telegramsiz) havolaga `?room=KOD` qo'shsangiz ham
xuddi shunday ishlaydi: `https://sayt.com/?room=AB12`.

## Tez-tez uchraydigan muammolar

**"Telegram tekshiruvidan o'tmadi" / "Server tokeni bu ilovaning botiga tegishli emas"**

Tartib bilan tekshiring:

1. `https://sizning-sayt.com/admin` ochib, **"Telegram holati"** bo'limiga qarang.
   U yerda token *haqiqatda qaysi botga* tegishli ekani yozilgan (`@...`).
   Agar u Mini App ro'yxatdan o'tgan botdan farq qilsa — `BOT_TOKEN` noto'g'ri.
2. Token nusxalanganda bo'sh joy yoki qator ko'chishi tushib qolmaganiga ishonch
   hosil qiling (server tokenni avtomatik `trim` qiladi, lekin Render'da ba'zan
   qiymat ikki qatorga bo'linib ketadi).
3. Ilovani Telegram'da butunlay yopib, qaytadan oching: `initData` 24 soatdan
   keyin eskiradi.

Eslatma: bu xato **o'yinni to'xtatmaydi** — imzo tekshiruvi o'tmasa, o'yinchi
o'zi kiritgan ism bilan o'ynayveradi. Faqat do'kon (Stars xaridlari) ishlamaydi,
chunki xarid Telegram hisobiga bog'lanishi shart.

**Mini App oq ekran** — Web App URL albatta `https://` bo'lishi kerak, `http://` ishlamaydi.

**Yangi bo'lim bo'sh ko'rinadi (masalan "Do'stlar")** — Telegram ichidagi brauzer
eski JS faylni keshdan olgan, HTML esa yangi. Server endi kod fayllarini
`no-cache` bilan uzatadi va HTML ichidagi manzillarga versiya qo'shadi
(`app.js?v=...`), shuning uchun bu takrorlanmasligi kerak. Agar baribir bo'lsa:
ilovani butunlay yopib qayta oching yoki Telegram sozlamalarida keshni tozalang.
Qaysi versiya ishlayotganini "?" tugmasi ostidagi oynada ko'rish mumkin.

**Taklif havolasi oddiy saytga olib boradi** — `BOT_USERNAME` sozlanmagan va bot ham
ulanmagan; `/api/config` dagi `inviteBase` bo'sh bo'lsa shunday bo'ladi.

**Do'st chaqirdim, lekin hisob 0** — `/admin` dagi "Telegram holati" bo'limiga qarang.
Ko'p hollarda sabab `DATA_DIR` sozlanmagani: Render xizmatni qayta ishga tushirganda
butun hisob o'chib ketadi. Boshqa sabablar va tekshirish tartibi
[docs/monetizatsiya.md](monetizatsiya.md) faylida.

**Render bepul tarifda sekin ochiladi** — xizmat 15 daqiqadan keyin uxlaydi.
Starter tarifga o'tish yoki har 10 daqiqada `/api/health` ga so'rov yuborish yordam beradi.
