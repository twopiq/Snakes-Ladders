/**
 * Uch tilli lug'at: o'zbekcha, ruscha va inglizcha.
 *
 * Har bir kalit uchun uchala til bir joyda turadi — shunda tarjima tushib
 * qolganini ko'rish oson (test buni tekshiradi ham).
 *
 * Foydalanish:
 *   t('menu.online.title')                  → joriy tildagi matn
 *   t('game.rank', { name: 'Ali', rank: 2 }) → o'rniga qo'yiladigan qiymatlar
 *
 * Bu modul ham brauzerda, ham serverda ishlaydi: server botga javob yozganda
 * o'yinchining Telegram tilini beradi — t(key, params, 'ru').
 */

export const LANGS = [
  { code: 'uz', name: "O'zbekcha", short: 'UZ' },
  { code: 'ru', name: 'Русский', short: 'RU' },
  { code: 'en', name: 'English', short: 'EN' },
];

export const LANG_CODES = LANGS.map((l) => l.code);
export const DEFAULT_LANG = 'uz';

const T = {
  // ---------------------------------------------------------------- umumiy
  'app.title': { uz: 'Ilonlar va Narvonlar', ru: 'Змеи и Лестницы', en: 'Snakes & Ladders' },
  'app.tagline': { uz: 'onlayn · oflayn · 5 ta xarita', ru: 'онлайн · офлайн · 5 карт', en: 'online · offline · 5 maps' },
  'common.menu': { uz: 'Menyu', ru: 'Меню', en: 'Menu' },
  'common.back': { uz: '← Menyu', ru: '← Меню', en: '← Menu' },
  'common.cancel': { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  'common.gotIt': { uz: 'Tushunarli', ru: 'Понятно', en: 'Got it' },
  'common.copy': { uz: 'Nusxalash', ru: 'Копировать', en: 'Copy' },
  'common.copied': { uz: 'Nusxalandi', ru: 'Скопировано', en: 'Copied' },
  'common.or': { uz: 'yoki', ru: 'или', en: 'or' },
  'common.error': { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
  'common.open': { uz: 'Ochish →', ru: 'Открыть →', en: 'Open →' },
  'common.start': { uz: 'Boshlash →', ru: 'Начать →', en: 'Start →' },
  'common.view': { uz: "Ko'rish →", ru: 'Смотреть →', en: 'View →' },
  'common.openInTelegram': { uz: "Telegram'da ochish", ru: 'Открыть в Telegram', en: 'Open in Telegram' },

  // ---------------------------------------------------------------- yuqori panel
  'top.friends': { uz: "Do'stlar", ru: 'Друзья', en: 'Friends' },
  'top.mine': { uz: "Mening ko'rinishlarim", ru: 'Мои скины', en: 'My skins' },
  'top.shop': { uz: "Do'kon", ru: 'Магазин', en: 'Shop' },
  'top.sound': { uz: 'Ovoz', ru: 'Звук', en: 'Sound' },
  'top.rules': { uz: 'Qoidalar', ru: 'Правила', en: 'Rules' },
  'top.lang': { uz: 'Til', ru: 'Язык', en: 'Language' },

  // ---------------------------------------------------------------- menyu
  'menu.lead': {
    uz: "Qo'lda chizilgan taxtaning elektron ko'rinishi. Do'stlaringiz bilan internet orqali yoki bitta qurilmada o'ynang.",
    ru: 'Электронная версия нарисованной от руки доски. Играйте с друзьями через интернет или на одном устройстве.',
    en: 'A digital version of a hand-drawn board. Play with friends over the internet or on a single device.',
  },
  'menu.online.title': { uz: "Onlayn o'yin", ru: 'Онлайн игра', en: 'Online game' },
  'menu.online.text': {
    uz: "2 dan 4 kishigacha, real vaqtda. Xona kodini do'stlaringizga yuboring yoki tezkor raqib toping.",
    ru: 'От 2 до 4 игроков в реальном времени. Отправьте код комнаты друзьям или найдите соперника быстро.',
    en: '2 to 4 players in real time. Send the room code to friends or find a quick opponent.',
  },
  'menu.offline.title': { uz: "Oflayn o'yin", ru: 'Офлайн игра', en: 'Offline game' },
  'menu.offline.text': {
    uz: "Bitta qurilmada 2 dan 6 kishigacha. Navbat bilan zar tashlanadi, internet shart emas.",
    ru: 'От 2 до 6 игроков на одном устройстве. Кубик бросают по очереди, интернет не нужен.',
    en: '2 to 6 players on one device. Take turns rolling the die — no internet needed.',
  },
  'menu.mine.title': { uz: "Mening ko'rinishlarim", ru: 'Мои скины', en: 'My skins' },
  'menu.mine.text': {
    uz: "Ochilgan fishka, narvon, ilon va taxtalar. Bir bosishda kiyiladi va o'yinda darhol ko'rinadi.",
    ru: 'Открытые фишки, лестницы, змеи и доски. Надеваются одним нажатием и сразу видны в игре.',
    en: 'Unlocked tokens, ladders, snakes and boards. One tap to wear — visible in the game right away.',
  },
  'menu.shop.title': { uz: "Do'kon", ru: 'Магазин', en: 'Shop' },
  'menu.shop.text': {
    uz: "Fishka, narvon, ilon va taxta ko'rinishlari. Telegram Stars (⭐) orqali ochiladi.",
    ru: 'Скины фишек, лестниц, змей и досок. Открываются за Telegram Stars (⭐).',
    en: 'Token, ladder, snake and board skins. Unlocked with Telegram Stars (⭐).',
  },
  'menu.friends.title': { uz: "Do'stlarni chaqiring", ru: 'Пригласите друзей', en: 'Invite friends' },
  'menu.friends.text': {
    uz: "3, 5, 7 va 10 ta do'st uchun maxsus ko'rinishlar — ularni yulduz bilan sotib bo'lmaydi.",
    ru: 'Особые скины за 3, 5, 7 и 10 друзей — их нельзя купить за звёзды.',
    en: 'Special skins for 3, 5, 7 and 10 friends — they cannot be bought with stars.',
  },
  'menu.friends.go': { uz: 'Mukofotlar →', ru: 'Награды →', en: 'Rewards →' },

  // ---------------------------------------------------------------- oflayn sozlama
  'offline.title': { uz: "Oflayn o'yin sozlamalari", ru: 'Настройки офлайн игры', en: 'Offline game setup' },
  'offline.step1': { uz: '1. Xaritani tanlang', ru: '1. Выберите карту', en: '1. Choose a map' },
  'offline.step2': { uz: "2. O'yinchilar", ru: '2. Игроки', en: '2. Players' },
  'offline.step3': { uz: '3. Qoidalar', ru: '3. Правила', en: '3. Rules' },
  'offline.howMany': { uz: "Nechta o'yinchi?", ru: 'Сколько игроков?', en: 'How many players?' },
  'offline.start': { uz: "O'yinni boshlash", ru: 'Начать игру', en: 'Start game' },
  'offline.player': { uz: "o'yinchi", ru: 'игрок', en: 'player' },

  // ---------------------------------------------------------------- onlayn lobbi
  'online.title': { uz: "Onlayn o'yin — 2-4 kishi, real vaqtda", ru: 'Онлайн игра — 2-4 игрока в реальном времени', en: 'Online game — 2-4 players in real time' },
  'online.yourName': { uz: 'Ismingiz', ru: 'Ваше имя', en: 'Your name' },
  'online.mapForHost': { uz: 'Xarita (xona ochuvchi uchun)', ru: 'Карта (для создателя комнаты)', en: 'Map (for the room host)' },
  'online.rulesForHost': { uz: 'Qoidalar (xona ochuvchi uchun)', ru: 'Правила (для создателя комнаты)', en: 'Rules (for the room host)' },
  'online.newRoom': { uz: 'Yangi xona ochish', ru: 'Создать комнату', en: 'Create a room' },
  'online.roomHint': {
    uz: "Xona kodi hosil bo'ladi — uni do'stlaringizga yuboring. Hamma yig'ilmasa ham, xona egasi o'yinni erta boshlashi mumkin.",
    ru: 'Появится код комнаты — отправьте его друзьям. Хозяин комнаты может начать игру, не дожидаясь всех.',
    en: 'A room code will appear — send it to your friends. The host can start early without waiting for everyone.',
  },
  'online.create': { uz: 'Xona ochish', ru: 'Создать комнату', en: 'Create room' },
  'online.joinByCode': { uz: "Kod bilan qo'shilish", ru: 'Войти по коду', en: 'Join with a code' },
  'online.codePlaceholder': { uz: 'XONA', ru: 'КОД', en: 'CODE' },
  'online.join': { uz: "Qo'shilish", ru: 'Войти', en: 'Join' },
  'online.quick': { uz: "Tezkor o'yin", ru: 'Быстрая игра', en: 'Quick game' },
  'online.quickHint': {
    uz: 'Navbatdagi birinchi raqib bilan avtomatik juftlanasiz.',
    ru: 'Вас автоматически объединят с первым свободным соперником.',
    en: 'You will be matched automatically with the first waiting opponent.',
  },
  'online.findOpponent': { uz: 'Raqib topish', ru: 'Найти соперника', en: 'Find an opponent' },
  'online.notConnected': { uz: 'Ulanmagan', ru: 'Нет подключения', en: 'Not connected' },
  'online.connected': { uz: 'Serverga ulandi', ru: 'Подключено к серверу', en: 'Connected to the server' },
  'online.connError': { uz: 'Ulanishda xatolik', ru: 'Ошибка подключения', en: 'Connection error' },
  'online.lost': { uz: 'Aloqa uzildi', ru: 'Связь потеряна', en: 'Connection lost' },
  'online.reconnecting': { uz: 'Qayta ulanmoqda...', ru: 'Переподключение...', en: 'Reconnecting...' },
  'online.checking': { uz: 'Aloqa tekshirilmoqda...', ru: 'Проверка связи...', en: 'Checking the connection...' },
  'online.syncing': { uz: 'Javob kelmadi — sinxronlanmoqda...', ru: 'Нет ответа — синхронизация...', en: 'No response — syncing...' },
  'online.refreshing': { uz: 'Ulanish yangilanmoqda...', ru: 'Обновление соединения...', en: 'Refreshing the connection...' },

  // ---------------------------------------------------------------- xona oynasi
  'room.ready': { uz: 'Xona tayyor', ru: 'Комната готова', en: 'Room is ready' },
  'room.sendCode': {
    uz: "Do'stlaringizga shu kodni yuboring — ular \"Kod bilan qo'shilish\" bo'limiga kiritadi.",
    ru: 'Отправьте этот код друзьям — они введут его в разделе «Войти по коду».',
    en: 'Send this code to your friends — they enter it under “Join with a code”.',
  },
  'room.map': { uz: 'Xarita', ru: 'Карта', en: 'Map' },
  'room.players': { uz: "O'yinchilar", ru: 'Игроки', en: 'Players' },
  'room.startEarlyHint': {
    uz: "Hamma yig'ilishini kutmasdan boshlasangiz ham bo'ladi.",
    ru: 'Можно начать, не дожидаясь всех.',
    en: 'You can start without waiting for everyone.',
  },
  'room.startNow': { uz: 'Hozir boshlash', ru: 'Начать сейчас', en: 'Start now' },
  'room.invite': { uz: "Do'stni chaqirish", ru: 'Пригласить друга', en: 'Invite a friend' },
  'room.copyCode': { uz: 'Kodni nusxalash', ru: 'Копировать код', en: 'Copy the code' },
  'room.tgLink': { uz: 'Telegram havolasi', ru: 'Ссылка Telegram', en: 'Telegram link' },
  'room.disconnected': { uz: '{name} aloqadan uzilgan...', ru: '{name} потерял связь...', en: '{name} lost connection...' },
  'room.searching': { uz: 'Raqib qidirilmoqda...', ru: 'Ищем соперника...', en: 'Looking for an opponent...' },
  'room.searchingText': {
    uz: "Boshqa o'yinchi \"Raqib topish\" tugmasini bosishi bilan o'yin boshlanadi.",
    ru: 'Игра начнётся, как только другой игрок нажмёт «Найти соперника».',
    en: 'The game starts as soon as another player taps “Find an opponent”.',
  },

  // ---------------------------------------------------------------- o'yin ekrani
  'game.exit': { uz: '← Chiqish', ru: '← Выход', en: '← Leave' },
  'game.turn': { uz: 'Navbat', ru: 'Ход', en: 'Turn' },
  'game.dice': { uz: 'Zar', ru: 'Кубик', en: 'Die' },
  'game.roll': { uz: 'Zar tashlash', ru: 'Бросить кубик', en: 'Roll the die' },
  'game.rollWait': { uz: 'Yurish...', ru: 'Ход идёт...', en: 'Moving...' },
  'game.opponentTurn': { uz: 'Raqib navbati', ru: 'Ход соперника', en: 'Opponent’s turn' },
  'game.over': { uz: "O'yin tugadi", ru: 'Игра окончена', en: 'Game over' },
  'game.yourTurn': { uz: 'Sizning navbatingiz!', ru: 'Ваш ход!', en: 'Your turn!' },
  'game.wait': { uz: 'Kuting...', ru: 'Ждите...', en: 'Please wait...' },
  'game.turnOf': { uz: 'Navbat: {name}', ru: 'Ходит: {name}', en: 'Turn: {name}' },
  'game.overHint': {
    uz: "Natijalar uchun \"Qayta o'ynash\"ni bosing",
    ru: 'Нажмите «Играть снова», чтобы сыграть ещё',
    en: 'Tap “Play again” for another round',
  },
  'game.you': { uz: 'siz', ru: 'вы', en: 'you' },
  'game.log': { uz: 'Jurnal', ru: 'Журнал', en: 'Log' },
  'game.chat': { uz: 'Chat', ru: 'Чат', en: 'Chat' },
  'game.chatPlaceholder': { uz: 'Xabar yozing...', ru: 'Напишите сообщение...', en: 'Type a message...' },
  'game.rematch': { uz: "Qayta o'ynash", ru: 'Играть снова', en: 'Play again' },
  'game.room': { uz: 'Xona: {code}', ru: 'Комната: {code}', en: 'Room: {code}' },
  'game.cells': { uz: '{n} katak', ru: '{n} клеток', en: '{n} cells' },
  'game.left': { uz: 'chiqib ketdi 🚪', ru: 'вышел 🚪', en: 'left 🚪' },
  'game.place': { uz: "{rank}-o'rin 🏁", ru: '{rank}-е место 🏁', en: 'place {rank} 🏁' },
  'game.skips': { uz: "{n} yurish o'tkazadi", ru: 'пропустит ходов: {n}', en: 'skips {n} turn(s)' },

  // ---------------------------------------------------------------- chiqish tasdig'i
  'leave.title': { uz: "O'yindan chiqasizmi?", ru: 'Выйти из игры?', en: 'Leave the game?' },
  'leave.online': {
    uz: "O'yin davom etmoqda. Chiqsangiz o'rningiz bo'shaydi va qaytib kira olmaysiz — qolganlar davom etadi.",
    ru: 'Игра ещё идёт. Если выйдете, ваше место освободится и вернуться не получится — остальные продолжат.',
    en: 'The game is still on. If you leave, your seat is freed and you cannot come back — the others keep playing.',
  },
  'leave.offline': {
    uz: "O'yin davom etmoqda. Chiqsangiz joriy o'yin yo'qoladi.",
    ru: 'Игра ещё идёт. Если выйдете, текущая партия будет потеряна.',
    en: 'The game is still on. If you leave, the current match is lost.',
  },
  'leave.stay': { uz: "Yo'q, davom etaman", ru: 'Нет, продолжу', en: 'No, keep playing' },
  'leave.go': { uz: 'Ha, chiqaman', ru: 'Да, выйти', en: 'Yes, leave' },

  // ---------------------------------------------------------------- natijalar
  'results.winner': { uz: "🏆 {name} g'olib!", ru: '🏆 {name} побеждает!', en: '🏆 {name} wins!' },
  'results.stats': { uz: '🪜 {ladders} narvon · 🐍 {snakes} ilon · {rolls} zar', ru: '🪜 лестниц: {ladders} · 🐍 змей: {snakes} · бросков: {rolls}', en: '🪜 {ladders} ladders · 🐍 {snakes} snakes · {rolls} rolls' },

  // ---------------------------------------------------------------- qoidalar oynasi
  'rules.title': { uz: 'Qoidalar', ru: 'Правила', en: 'Rules' },
  'rules.l1': {
    uz: "Har bir o'yinchi navbat bilan zar tashlaydi va donasini shuncha katak oldinga suradi.",
    ru: 'Игроки по очереди бросают кубик и передвигают фишку на столько клеток.',
    en: 'Players take turns rolling the die and move their token that many cells forward.',
  },
  'rules.l2': {
    uz: "<b>Narvon</b> (🪜 yashil) tepasiga ko'taradi, <b>ilon</b> (🐍) boshiga tushsangiz dumigacha tushirasiz.",
    ru: '<b>Лестница</b> (🪜 зелёная) поднимает наверх, а <b>змея</b> (🐍) спускает от головы к хвосту.',
    en: 'A <b>ladder</b> (🪜 green) lifts you up; a <b>snake</b> (🐍) slides you from its head down to its tail.',
  },
  'rules.l3': {
    uz: "<b>★ bonus</b> katak qo'shimcha zar beradi, <b>✖ tuzoq</b> katak bir yurishni o'tkazib yuboradi.",
    ru: 'Клетка <b>★ бонус</b> даёт лишний бросок, клетка <b>✖ ловушка</b> пропускает ход.',
    en: 'A <b>★ bonus</b> cell grants an extra roll; a <b>✖ trap</b> cell makes you skip a turn.',
  },
  'rules.l4': {
    uz: "6 tashlagan o'yinchi yana zar tashlaydi. Ketma-ket 3 ta 6 — yurish bekor bo'ladi.",
    ru: 'Выпала 6 — бросаете ещё раз. Три шестёрки подряд — ход отменяется.',
    en: 'Roll a 6 and you roll again. Three sixes in a row cancels the move.',
  },
  'rules.l5': {
    uz: "Finishga aniq tushish kerak: ortiqcha qadamlar orqaga qaytaradi.",
    ru: 'На финиш нужно попасть точно: лишние шаги отбрасывают назад.',
    en: 'You must land exactly on the finish: extra steps bounce you back.',
  },
  'rules.l6': {
    uz: "Birinchi bo'lib oxirgi katakka yetgan o'yinchi g'olib.",
    ru: 'Побеждает тот, кто первым дойдёт до последней клетки.',
    en: 'The first player to reach the last cell wins.',
  },
  'rules.modes': { uz: 'Rejimlar', ru: 'Режимы', en: 'Modes' },
  'rules.online': {
    uz: "<b>Onlayn:</b> 2 dan 4 kishigacha, real vaqtda. Xona kodi yoki tezkor juftlash orqali. Aloqa uzilsa 60 soniya ichida qaytish mumkin.",
    ru: '<b>Онлайн:</b> от 2 до 4 игроков в реальном времени — по коду комнаты или быстрый подбор. При обрыве связи можно вернуться в течение 60 секунд.',
    en: '<b>Online:</b> 2 to 4 players in real time — by room code or quick match. If the connection drops you can return within 60 seconds.',
  },
  'rules.offline': {
    uz: "<b>Oflayn:</b> bitta qurilmada 2–6 kishi navbat bilan.",
    ru: '<b>Офлайн:</b> от 2 до 6 игроков по очереди на одном устройстве.',
    en: '<b>Offline:</b> 2–6 players taking turns on one device.',
  },
  'rules.space': {
    uz: "Zar tashlash uchun <b>Bo'sh joy</b> tugmasini ham bosish mumkin.",
    ru: 'Бросить кубик можно и клавишей <b>Пробел</b>.',
    en: 'You can also roll with the <b>Space</b> key.',
  },
  'rules.version': { uz: 'Versiya: {v}', ru: 'Версия: {v}', en: 'Version: {v}' },

  // ---------------------------------------------------------------- qoidalar ro'yxati
  'rule.exactFinish.title': { uz: 'Finishga aniq tushish', ru: 'Точное попадание на финиш', en: 'Exact finish' },
  'rule.exactFinish.note': { uz: 'Ortiqcha qadamlar orqaga qaytariladi', ru: 'Лишние шаги отбрасывают назад', en: 'Extra steps bounce back' },
  'rule.sixExtraTurn.title': { uz: '6 tashlasa — yana tashlaydi', ru: 'Шестёрка — ещё бросок', en: 'Six rolls again' },
  'rule.sixExtraTurn.note': { uz: "Qo'shimcha yurish huquqi", ru: 'Право на лишний ход', en: 'Grants an extra turn' },
  'rule.tripleSixPenalty.title': { uz: 'Ketma-ket 3 ta 6 — yurish bekor', ru: 'Три шестёрки подряд — ход отменён', en: 'Three sixes cancel the move' },
  'rule.tripleSixPenalty.note': { uz: 'Omadga qarshi muvozanat', ru: 'Баланс против везения', en: 'A balance against luck' },
  'rule.specialCells.title': { uz: '★ bonus va ✖ tuzoq kataklari', ru: 'Клетки ★ бонус и ✖ ловушка', en: '★ bonus and ✖ trap cells' },
  'rule.specialCells.note': { uz: "Bonus qayta zar, tuzoq bir yurish", ru: 'Бонус — лишний бросок, ловушка — пропуск', en: 'Bonus gives a roll, trap skips a turn' },
  'rule.playToLast.title': { uz: "Barcha o'rinlar aniqlanguncha", ru: 'До распределения всех мест', en: 'Play until every place is decided' },
  'rule.playToLast.note': { uz: "Birinchi g'olibdan keyin ham davom etadi", ru: 'Игра продолжается после первого победителя', en: 'The game continues after the first winner' },

  // ---------------------------------------------------------------- o'yin jurnali
  'log.start': { uz: "O'yin boshlandi — {map}", ru: 'Игра началась — {map}', en: 'Game started — {map}' },
  'log.tripleSix': { uz: '{name} ketma-ket 3 ta 6 tashladi — yurish bekor!', ru: '{name} выбросил три шестёрки подряд — ход отменён!', en: '{name} rolled three sixes in a row — move cancelled!' },
  'log.trap': { uz: "{name} tuzoqqa tushdi — bir yurish o'tkazib yuboriladi", ru: '{name} попал в ловушку — пропускает ход', en: '{name} hit a trap — skips a turn' },
  'log.finish': { uz: "🏁 {name} marraga yetdi — {rank}-o'rin!", ru: '🏁 {name} дошёл до финиша — {rank}-е место!', en: '🏁 {name} reached the finish — place {rank}!' },
  'log.left': { uz: "{name} o'yinni tark etdi", ru: '{name} покинул игру', en: '{name} left the game' },
  'log.skipped': { uz: "{name} bu yurishni o'tkazib yubordi", ru: '{name} пропустил ход', en: '{name} skipped this turn' },
  'log.roll': { uz: '{name} — zar: {dice}', ru: '{name} — кубик: {dice}', en: '{name} — die: {dice}' },
  'log.bounce': { uz: '{name} finishdan oshib ketdi — {cell}-katakka qaytdi', ru: '{name} перебросил финиш — вернулся на клетку {cell}', en: '{name} overshot the finish — bounced back to cell {cell}' },
  'log.ladder': { uz: "{name} narvondan ko'tarildi: {from} → {to}", ru: '{name} поднялся по лестнице: {from} → {to}', en: '{name} climbed a ladder: {from} → {to}' },
  'log.snake': { uz: '{name} ilonga yutildi: {from} → {to}', ru: '{name} проглочен змеёй: {from} → {to}', en: '{name} was swallowed by a snake: {from} → {to}' },
  'log.bonus': { uz: "{name} bonus katakka tushdi — qo'shimcha zar!", ru: '{name} попал на бонусную клетку — лишний бросок!', en: '{name} landed on a bonus cell — extra roll!' },
  'log.again': { uz: '{name} yana tashlaydi', ru: '{name} бросает ещё раз', en: '{name} rolls again' },
  'log.over': { uz: "O'yin tugadi", ru: 'Игра окончена', en: 'Game over' },

  // ---------------------------------------------------------------- hodisa xabarlari
  'ev.ladder': { uz: "{name} narvondan {from} → {to} ko'tarildi 🪜", ru: '{name} поднялся по лестнице {from} → {to} 🪜', en: '{name} climbed a ladder {from} → {to} 🪜' },
  'ev.snake': { uz: '{name} ilonga tushdi: {from} → {to} 🐍', ru: '{name} съеден змеёй: {from} → {to} 🐍', en: '{name} hit a snake: {from} → {to} 🐍' },
  'ev.bonus': { uz: "{name} bonus katak — qo'shimcha zar! ★", ru: '{name} на бонусной клетке — лишний бросок! ★', en: '{name} landed on a bonus — extra roll! ★' },
  'ev.trap': { uz: "{name} tuzoqqa tushdi — bir yurish yo'q ✖", ru: '{name} в ловушке — пропуск хода ✖', en: '{name} is trapped — turn skipped ✖' },
  'ev.penalty': { uz: '{name}: ketma-ket 3 ta 6 — yurish bekor', ru: '{name}: три шестёрки подряд — ход отменён', en: '{name}: three sixes in a row — move cancelled' },
  'ev.rank': { uz: "🏁 {name} — {rank}-o'rin!", ru: '🏁 {name} — {rank}-е место!', en: '🏁 {name} — place {rank}!' },

  // ---------------------------------------------------------------- do'kon
  'shop.title': { uz: "Do'kon", ru: 'Магазин', en: 'Shop' },
  'shop.spent': { uz: '⭐ {n} sarflangan', ru: '⭐ потрачено: {n}', en: '⭐ {n} spent' },
  'shop.siteNote': {
    uz: "Pullik ko'rinishlar Telegram Stars (⭐) orqali sotiladi — xarid faqat Telegram ilovasida ishlaydi.",
    ru: 'Платные скины продаются за Telegram Stars (⭐) — покупка работает только в приложении Telegram.',
    en: 'Paid skins are sold for Telegram Stars (⭐) — purchases only work inside the Telegram app.',
  },
  'shop.siteNotePlain': {
    uz: "Pullik ko'rinishlar Telegram ilovasi ichida sotiladi. Bepul variantlar bu yerda ham tanlanadi.",
    ru: 'Платные скины продаются внутри приложения Telegram. Бесплатные можно выбрать и здесь.',
    en: 'Paid skins are sold inside the Telegram app. Free ones can be chosen here too.',
  },
  'shop.wear': { uz: 'Kiyish', ru: 'Надеть', en: 'Wear' },
  'shop.worn': { uz: 'Kiyilgan ✓', ru: 'Надето ✓', en: 'Worn ✓' },
  'shop.owned': { uz: 'Sizda bor ✓', ru: 'У вас есть ✓', en: 'You own it ✓' },
  'shop.wearAll': { uz: 'Hammasini kiyish', ru: 'Надеть всё', en: 'Wear all' },
  'shop.buy': { uz: '⭐ {price} — olish', ru: '⭐ {price} — купить', en: '⭐ {price} — get it' },
  'shop.inTelegram': { uz: "⭐ {price} · Telegram'da", ru: '⭐ {price} · в Telegram', en: '⭐ {price} · in Telegram' },
  'shop.rewardBtn': { uz: "🎁 {n} ta do'st chaqiring", ru: '🎁 Пригласите {n} друзей', en: '🎁 Invite {n} friends' },
  'shop.bundles': { uz: "To'plamlar", ru: 'Наборы', en: 'Bundles' },
  'shop.needTelegram': { uz: 'Telegram kerak', ru: 'Нужен Telegram', en: 'Telegram required' },
  'shop.needTelegramText': {
    uz: "Ko'rinishlar Telegram Stars (⭐) orqali sotiladi, shuning uchun xarid faqat Telegram ilovasi ichida ishlaydi. O'yinni Telegram'da oching va do'konga kiring.",
    ru: 'Скины продаются за Telegram Stars (⭐), поэтому покупка работает только внутри приложения Telegram. Откройте игру в Telegram и зайдите в магазин.',
    en: 'Skins are sold for Telegram Stars (⭐), so purchases only work inside the Telegram app. Open the game in Telegram and go to the shop.',
  },

  // ---------------------------------------------------------------- mening ko'rinishlarim
  'mine.title': { uz: "Mening ko'rinishlarim", ru: 'Мои скины', en: 'My skins' },
  'mine.subtitle': {
    uz: "Kiyilgan ko'rinish o'yinda darhol qo'llanadi — taxtada ham, fishkangizda ham.",
    ru: 'Надетый скин сразу применяется в игре — и к доске, и к вашей фишке.',
    en: 'The skin you wear applies to the game right away — both the board and your token.',
  },
  'mine.worn': { uz: 'Hozir kiyilgan', ru: 'Сейчас надето', en: 'Currently worn' },
  'mine.count': { uz: '{n} ta', ru: '{n} шт.', en: '{n}' },
  'mine.hint': {
    uz: "Yangi ko'rinishlar do'konda va do'st chaqirish mukofotlarida.",
    ru: 'Новые скины — в магазине и в наградах за приглашение друзей.',
    en: 'New skins are in the shop and in the friend-invite rewards.',
  },
  'mine.toShop': { uz: "Do'kon →", ru: 'Магазин →', en: 'Shop →' },
  'mine.emptyTitle': { uz: "Hali yangi ko'rinish yo'q", ru: 'Пока нет новых скинов', en: 'No new skins yet' },
  'mine.emptyText': {
    uz: "Fishka, narvon, ilon va taxta ko'rinishlarini ikki yo'l bilan ochish mumkin: do'kondan yulduz (⭐) bilan sotib olish yoki do'st chaqirib mukofot yig'ish.",
    ru: 'Скины фишек, лестниц, змей и досок открываются двумя способами: покупкой за звёзды (⭐) в магазине или наградами за приглашённых друзей.',
    en: 'Token, ladder, snake and board skins unlock two ways: buy them with stars (⭐) in the shop, or earn them by inviting friends.',
  },
  'mine.goShop': { uz: "Do'konga o'tish", ru: 'Перейти в магазин', en: 'Go to the shop' },
  'mine.goFriends': { uz: "Do'st chaqirish", ru: 'Пригласить друга', en: 'Invite a friend' },

  // ---------------------------------------------------------------- do'stlar
  'friends.title': { uz: "Do'stlarni chaqiring", ru: 'Пригласите друзей', en: 'Invite friends' },
  'friends.subtitle': {
    uz: "Bu ko'rinishlarni yulduz bilan sotib bo'lmaydi — faqat do'st chaqirib olinadi.",
    ru: 'Эти скины нельзя купить за звёзды — только пригласив друзей.',
    en: 'These skins cannot be bought with stars — only earned by inviting friends.',
  },
  'friends.played': { uz: "do'st o'ynadi", ru: 'друзей сыграли', en: 'friends played' },
  'friends.pending': { uz: "{n} ta hali o'ynamagan", ru: '{n} ещё не сыграли', en: '{n} have not played yet' },
  'friends.next': { uz: 'Keyingi mukofotgacha yana <b>{n}</b> ta do\'st', ru: 'До следующей награды ещё <b>{n}</b> друзей', en: '<b>{n}</b> more friends until the next reward' },
  'friends.allDone': { uz: 'Barcha mukofotlar ochildi — rahmat! 🎉', ru: 'Все награды открыты — спасибо! 🎉', en: 'All rewards unlocked — thank you! 🎉' },
  'friends.invite': { uz: "Do'stni chaqirish", ru: 'Пригласить друга', en: 'Invite a friend' },
  'friends.copyLink': { uz: 'Havolani nusxalash', ru: 'Копировать ссылку', en: 'Copy the link' },
  'friends.linkNotReady': {
    uz: "Taklif havolasi tayyor emas: serverda bot nomi (<code>BOT_USERNAME</code>) sozlanmagan.",
    ru: 'Ссылка-приглашение не готова: на сервере не задано имя бота (<code>BOT_USERNAME</code>).',
    en: 'The invite link is not ready: the bot username (<code>BOT_USERNAME</code>) is not configured on the server.',
  },
  'friends.rule': {
    uz: "Do'st havolangiz orqali kirib, kamida bitta o'yin boshlasa — hisobga qo'shiladi. Havolani ochgan, lekin hali o'ynamaganlar \"kutilmoqda\" da turadi.",
    ru: 'Друг засчитывается, если зашёл по вашей ссылке и начал хотя бы одну игру. Те, кто открыл ссылку, но ещё не играл, остаются «в ожидании».',
    en: 'A friend counts once they open your link and start at least one game. Those who opened the link but have not played stay “pending”.',
  },
  'friends.tier': { uz: "{n} ta do'st", ru: '{n} друзей', en: '{n} friends' },
  'friends.siteTitle': { uz: "Do'stlarni chaqirish", ru: 'Приглашение друзей', en: 'Inviting friends' },
  'friends.siteText': {
    uz: "Taklif havolasi va mukofotlar Telegram ilovasida ishlaydi — chaqirilgan do'st sizning Telegram hisobingizga bog'lanadi.",
    ru: 'Ссылка-приглашение и награды работают в приложении Telegram — приглашённый друг привязывается к вашему аккаунту Telegram.',
    en: 'The invite link and rewards work inside the Telegram app — an invited friend is linked to your Telegram account.',
  },
  'friends.linkNotReadyShort': { uz: 'Havola tayyor emas', ru: 'Ссылка не готова', en: 'The link is not ready' },
  'friends.inviteText': {
    uz: "Ilonlar va Narvonlar o'ynaymizmi? Men bilan o'ynasang, menga mukofot ochiladi 🎁",
    ru: 'Сыграем в «Змеи и Лестницы»? Если сыграешь со мной, мне откроется награда 🎁',
    en: 'Fancy a game of Snakes & Ladders? If you play with me, I unlock a reward 🎁',
  },
  'friends.openFail': { uz: "Ekranni ochib bo'lmadi", ru: 'Не удалось открыть экран', en: 'Could not open this screen' },
  'friends.openFailText': {
    uz: "Ilovani yopib, qaytadan oching. Muammo qolsa — botga /support yozing.",
    ru: 'Закройте приложение и откройте снова. Если не поможет — напишите боту /support.',
    en: 'Close the app and open it again. If it persists, message the bot with /support.',
  },

  // ---------------------------------------------------------------- yo'naltirish
  'promo.title': { uz: "Telegram'da ko'proq imkoniyat", ru: 'Больше возможностей в Telegram', en: 'More in Telegram' },
  'promo.text': {
    uz: "Ko'rinishlar do'koni (fishka, narvon, ilon, taxta), do'stni bir bosishda chaqirish va ismingiz avtomatik — hammasi Telegram ilovasida.",
    ru: 'Магазин скинов (фишки, лестницы, змеи, доски), приглашение друга одним нажатием и автоматическое имя — всё в приложении Telegram.',
    en: 'The skin shop (tokens, ladders, snakes, boards), one-tap friend invites and your name filled in automatically — all in the Telegram app.',
  },
  'promo.swapTitle': { uz: 'Fishkangizni almashtirasizmi?', ru: 'Хотите сменить фишку?', en: 'Want to change your token?' },
  'promo.swapText': {
    uz: "Toj, olmos, ajdaho, oltin narvon va boshqa ko'rinishlar Telegram ilovasida.",
    ru: 'Корона, алмаз, дракон, золотая лестница и другие скины — в приложении Telegram.',
    en: 'Crown, gem, dragon, golden ladder and more skins are in the Telegram app.',
  },

  // ---------------------------------------------------------------- xabarlar (toast)
  'msg.noConnection': { uz: "Serverga ulanib bo'lmadi", ru: 'Не удалось подключиться к серверу', en: 'Could not connect to the server' },
  'msg.linkLost': { uz: 'Aloqa uzilgan — qayta ulanmoqda...', ru: 'Связь потеряна — переподключаемся...', en: 'Connection lost — reconnecting...' },
  'msg.reconnecting': { uz: 'Aloqa uzildi — qayta ulanmoqda...', ru: 'Связь прервалась — переподключаемся...', en: 'Connection dropped — reconnecting...' },
  'msg.codeLength': { uz: 'Xona kodi 4 ta belgidan iborat', ru: 'Код комнаты состоит из 4 символов', en: 'A room code has 4 characters' },
  'msg.joining': { uz: "Xonaga qo'shilmoqda...", ru: 'Входим в комнату...', en: 'Joining the room...' },
  'msg.newGame': { uz: "Yangi o'yin boshlandi", ru: 'Началась новая игра', en: 'A new game has started' },
  'msg.rematchAsked': { uz: "Qayta o'ynash so'raldi — raqib tasdiqlashi kerak", ru: 'Запрошен реванш — соперник должен подтвердить', en: 'Rematch requested — the opponent must confirm' },
  'msg.roomGone': { uz: '{msg} — yangi xona oching', ru: '{msg} — создайте новую комнату', en: '{msg} — create a new room' },
  'msg.codeCopied': { uz: 'Kod nusxalandi', ru: 'Код скопирован', en: 'Code copied' },
  'msg.roomCodeCopied': { uz: 'Xona kodi nusxalandi: {code}', ru: 'Код комнаты скопирован: {code}', en: 'Room code copied: {code}' },
  'msg.code': { uz: 'Kod: {code}', ru: 'Код: {code}', en: 'Code: {code}' },
  'msg.tgLinkCopied': { uz: 'Telegram havolasi nusxalandi', ru: 'Ссылка Telegram скопирована', en: 'Telegram link copied' },
  'msg.inviteCopied': { uz: 'Taklif havolasi nusxalandi', ru: 'Ссылка-приглашение скопирована', en: 'Invite link copied' },
  'msg.linkCopied': { uz: 'Havola nusxalandi', ru: 'Ссылка скопирована', en: 'Link copied' },
  'msg.shopLoadFail': { uz: "Do'konni yuklab bo'lmadi", ru: 'Не удалось загрузить магазин', en: 'Could not load the shop' },
  'msg.wearFail': { uz: "Kiyib bo'lmadi", ru: 'Не удалось надеть', en: 'Could not wear it' },
  'msg.notOwned': { uz: "Bu ko'rinish hali sizda yo'q", ru: 'У вас пока нет этого скина', en: 'You do not own this skin yet' },
  'msg.wornOk': { uz: '{name} kiyildi', ru: '{name} — надето', en: '{name} equipped' },
  'msg.buyOk': { uz: 'Xarid muvaffaqiyatli! Ochilmoqda...', ru: 'Покупка прошла успешно! Открываем...', en: 'Purchase complete! Unlocking...' },
  'msg.buyCancelled': { uz: 'Xarid bekor qilindi', ru: 'Покупка отменена', en: 'Purchase cancelled' },
  'msg.oldTelegram': { uz: 'Telegram ilovangiz eskiroq — yangilang', ru: 'Ваш Telegram устарел — обновите его', en: 'Your Telegram app is outdated — please update' },
  'msg.payFail': { uz: "To'lov amalga oshmadi", ru: 'Платёж не прошёл', en: 'The payment did not go through' },
  'msg.buyNotSynced': {
    uz: "Xarid qayd etildi, lekin ro'yxat yangilanmadi — do'konni qayta oching",
    ru: 'Покупка записана, но список не обновился — откройте магазин заново',
    en: 'The purchase was recorded but the list did not refresh — reopen the shop',
  },

  // ---------------------------------------------------------------- bot xabarlari
  'bot.lead': { uz: "Klassik taxta o'yinining elektron ko'rinishi.", ru: 'Электронная версия классической настольной игры.', en: 'A digital version of the classic board game.' },
  'bot.online': { uz: "<b>Onlayn</b> — 2 dan 4 kishigacha, real vaqtda", ru: '<b>Онлайн</b> — от 2 до 4 игроков в реальном времени', en: '<b>Online</b> — 2 to 4 players in real time' },
  'bot.offline': { uz: "<b>Oflayn</b> — bitta telefonda 2-6 kishi", ru: '<b>Офлайн</b> — 2-6 игроков на одном телефоне', en: '<b>Offline</b> — 2-6 players on one phone' },
  'bot.shop': { uz: "Do'konda fishka, narvon, ilon va taxta ko'rinishlari", ru: 'В магазине — скины фишек, лестниц, змей и досок', en: 'The shop has token, ladder, snake and board skins' },
  'bot.press': { uz: "Pastdagi tugmani bosing va o'ynang!", ru: 'Нажмите кнопку ниже и играйте!', en: 'Tap the button below and play!' },
  'bot.pressShort': { uz: "O'ynash uchun pastdagi tugmani bosing 👇", ru: 'Нажмите кнопку ниже, чтобы играть 👇', en: 'Tap the button below to play 👇' },
  'bot.play': { uz: "🎮 O'ynash", ru: '🎮 Играть', en: '🎮 Play' },
  'bot.open': { uz: "🎮 O'yinni ochish", ru: '🎮 Открыть игру', en: '🎮 Open the game' },
  'bot.joinRoom': { uz: '🎮 {code} xonasiga kirish', ru: '🎮 Войти в комнату {code}', en: '🎮 Join room {code}' },
  'bot.roomCode': { uz: '🎟 Xona kodi: <code>{code}</code>', ru: '🎟 Код комнаты: <code>{code}</code>', en: '🎟 Room code: <code>{code}</code>' },
  'bot.refOk': {
    uz: "Sizni do'stingiz chaqirdi — bitta o'yin o'ynasangiz, unga mukofot ochiladi 🎁",
    ru: 'Вас пригласил друг — сыграйте одну партию, и ему откроется награда 🎁',
    en: 'A friend invited you — play one game and they unlock a reward 🎁',
  },
  'bot.refSelf': { uz: "O'z havolangiz orqali kirdingiz — bu hisobga olinmaydi.", ru: 'Вы зашли по своей же ссылке — это не засчитывается.', en: 'You opened your own link — that does not count.' },
  'bot.refAlready': { uz: "Siz allaqachon boshqa do'stning taklifi bilan kirgansiz.", ru: 'Вы уже пришли по приглашению другого друга.', en: 'You already joined through another friend’s invite.' },
  'bot.refLate': {
    uz: "Siz o'yinni avval o'ynagansiz, shuning uchun bu taklif hisobga olinmaydi.",
    ru: 'Вы уже играли раньше, поэтому это приглашение не засчитывается.',
    en: 'You have played before, so this invite does not count.',
  },
  'bot.rulesTitle': { uz: '<b>Qoidalar</b>', ru: '<b>Правила</b>', en: '<b>Rules</b>' },
  'bot.r1': { uz: 'Navbat bilan zar tashlanadi.', ru: 'Кубик бросают по очереди.', en: 'Players take turns rolling the die.' },
  'bot.r2': { uz: '🪜 narvon yuqoriga, 🐍 ilon pastga tushiradi.', ru: '🪜 лестница поднимает, 🐍 змея опускает.', en: '🪜 ladders lift you up, 🐍 snakes drag you down.' },
  'bot.r3': { uz: "★ bonus — qo'shimcha zar, ✖ tuzoq — bir yurish yo'q.", ru: '★ бонус — лишний бросок, ✖ ловушка — пропуск хода.', en: '★ bonus — an extra roll, ✖ trap — skip a turn.' },
  'bot.r4': { uz: 'Finishga aniq tushish kerak.', ru: 'На финиш нужно попасть точно.', en: 'You must land exactly on the finish.' },
  'bot.shopLine': { uz: "<b>Do'kon</b>: ko'rinishlar Telegram Stars (⭐) orqali olinadi.", ru: '<b>Магазин</b>: скины покупаются за Telegram Stars (⭐).', en: '<b>Shop</b>: skins are bought with Telegram Stars (⭐).' },
  'bot.supportLine': { uz: "Muammo bo'lsa /support yozing.", ru: 'Если возникла проблема — напишите /support.', en: 'If something goes wrong, send /support.' },
  'bot.supportTitle': { uz: "Xarid bilan bog'liq muammo bormi?", ru: 'Проблема с покупкой?', en: 'Trouble with a purchase?' },
  'bot.supportText': {
    uz: "Xarid raqamingizni (<code>charge id</code>) shu yerga yuboring — tekshirib, kerak bo'lsa yulduzlarni qaytaramiz.",
    ru: 'Отправьте сюда номер покупки (<code>charge id</code>) — мы проверим и при необходимости вернём звёзды.',
    en: 'Send your purchase id (<code>charge id</code>) here — we will check it and refund the stars if needed.',
  },
  'bot.paid': { uz: '✅ <b>{name}</b> ochildi!', ru: '✅ <b>{name}</b> открыт!', en: '✅ <b>{name}</b> unlocked!' },
  'bot.paidHint': {
    uz: "O'yinni oching va \"Do'kon\" bo'limidan kiying.",
    ru: 'Откройте игру и наденьте скин в разделе «Магазин».',
    en: 'Open the game and wear it from the “Shop” section.',
  },
  'bot.chargeId': { uz: '<i>Xarid raqami: <code>{id}</code></i>', ru: '<i>Номер покупки: <code>{id}</code></i>', en: '<i>Purchase id: <code>{id}</code></i>' },
  'bot.rewardTitle': { uz: "🎁 <b>Yangi ko'rinish ochildi!</b>", ru: '🎁 <b>Открыт новый скин!</b>', en: '🎁 <b>A new skin is unlocked!</b>' },
  'bot.rewardText': {
    uz: "Do'stlaringiz uchun rahmat — sizga {items} berildi.",
    ru: 'Спасибо за друзей — вам открыто: {items}.',
    en: 'Thanks for inviting friends — you received {items}.',
  },
  'bot.rewardHint': { uz: "O'yinni ochib, do'kondan kiyib oling.", ru: 'Откройте игру и наденьте в магазине.', en: 'Open the game and wear it from the shop.' },
  'bot.giftTitle': { uz: "🎁 <b>Sizga sovg'a!</b>", ru: '🎁 <b>Вам подарок!</b>', en: '🎁 <b>A gift for you!</b>' },
  'bot.giftText': { uz: '<b>{name}</b> ochildi — hech qanday yulduz kerak emas.', ru: '<b>{name}</b> открыт — звёзды не нужны.', en: '<b>{name}</b> is unlocked — no stars needed.' },
  'bot.notForSale': { uz: "Bu ko'rinish hozir sotuvda emas. Yulduzlaringiz saqlanib qoladi.", ru: 'Этот скин сейчас не продаётся. Ваши звёзды останутся при вас.', en: 'This skin is not on sale right now. Your stars stay with you.' },
  'bot.inviteTitle': { uz: "Ilonlar va Narvonlar — o'ynashga taklif", ru: 'Змеи и Лестницы — приглашение в игру', en: 'Snakes & Ladders — an invitation to play' },
  'bot.inviteDesc': { uz: "Do'stingizni o'yinga chaqirish", ru: 'Пригласите друга в игру', en: 'Invite a friend to play' },
  'bot.inviteMsg': {
    uz: "🐍 <b>Ilonlar va Narvonlar</b>\nQani, kim tezroq marraga yetadi?",
    ru: '🐍 <b>Змеи и Лестницы</b>\nНу что, кто первым доберётся до финиша?',
    en: '🐍 <b>Snakes & Ladders</b>\nSo, who reaches the finish first?',
  },
  'bot.cmdStart': { uz: "O'yinni boshlash", ru: 'Начать игру', en: 'Start the game' },
  'bot.cmdHelp': { uz: 'Qoidalar', ru: 'Правила', en: 'Rules' },
  'bot.cmdSupport': { uz: "Xarid bo'yicha yordam", ru: 'Помощь с покупкой', en: 'Purchase support' },
  'bot.menuButton': { uz: "O'ynash", ru: 'Играть', en: 'Play' },

  // ---------------------------------------------------------------- nodirlik va bo'limlar
  'rarity.free': { uz: 'Bepul', ru: 'Бесплатно', en: 'Free' },
  'rarity.oddiy': { uz: 'Oddiy', ru: 'Обычный', en: 'Common' },
  'rarity.nodir': { uz: 'Nodir', ru: 'Редкий', en: 'Rare' },
  'rarity.afsonaviy': { uz: 'Afsonaviy', ru: 'Легендарный', en: 'Legendary' },
  'rarity.dostlik': { uz: "Do'stlik", ru: 'Дружба', en: 'Friendship' },
  'color.qizil': { uz: 'Qizil', ru: 'Красный', en: 'Red' },
  'color.kok': { uz: "Ko'k", ru: 'Синий', en: 'Blue' },
  'color.yashil': { uz: 'Yashil', ru: 'Зелёный', en: 'Green' },
  'color.sariq': { uz: 'Sariq', ru: 'Жёлтый', en: 'Yellow' },
  'color.binafsha': { uz: 'Binafsha', ru: 'Фиолетовый', en: 'Purple' },
  'color.firuza': { uz: 'Firuza', ru: 'Бирюзовый', en: 'Turquoise' },
  'slot.token': { uz: 'Fishka', ru: 'Фишка', en: 'Token' },
  'slot.ladder': { uz: 'Narvon', ru: 'Лестница', en: 'Ladder' },
  'slot.snake': { uz: 'Ilon', ru: 'Змея', en: 'Snake' },
  'slot.board': { uz: "Xarita ko'rinishi", ru: 'Оформление доски', en: 'Board theme' },
  'slot.bundle': { uz: "To'plamlar", ru: 'Наборы', en: 'Bundles' },

  // ---------------------------------------------------------------- xaritalar
  'map.klassik130.name': { uz: 'Klassik 130', ru: 'Классика 130', en: 'Classic 130' },
  'map.klassik130.about': {
    uz: "Qo'lda chizilgan asl taxta uslubida: 10 × 13 katak, muvozanatli ilon va narvonlar.",
    ru: 'В стиле оригинальной рисованной доски: 10 × 13 клеток, змеи и лестницы в балансе.',
    en: 'In the style of the original hand-drawn board: 10 × 13 cells, snakes and ladders in balance.',
  },
  'map.zumrad144.name': { uz: 'Zumrad vodiysi 144', ru: 'Изумрудная долина 144', en: 'Emerald Valley 144' },
  'map.zumrad144.about': {
    uz: "12 × 12 katak. Narvonlar ko'p, ilonlar qisqa — hujumkor o'yin uchun.",
    ru: '12 × 12 клеток. Много лестниц, змеи короткие — для атакующей игры.',
    en: '12 × 12 cells. Plenty of ladders, short snakes — made for aggressive play.',
  },
  'map.olov180.name': { uz: "Olov cho'qqisi 180", ru: 'Огненная вершина 180', en: 'Fire Peak 180' },
  'map.olov180.about': {
    uz: '12 × 15 katak — uzun va shafqatsiz yo\'l. Yuqorida ilonlar poylab turadi.',
    ru: '12 × 15 клеток — длинный и жестокий путь. Наверху поджидают змеи.',
    en: '12 × 15 cells — a long, merciless climb. Snakes wait near the top.',
  },
  'map.koinot196.name': { uz: 'Koinot 196', ru: 'Космос 196', en: 'Cosmos 196' },
  'map.koinot196.about': {
    uz: '14 × 14 — eng katta taxta. Uzoq safar, katta sakrashlar va chuqur tushishlar.',
    ru: '14 × 14 — самая большая доска. Долгий путь, большие прыжки и глубокие падения.',
    en: '14 × 14 — the largest board. A long journey with big climbs and deep falls.',
  },
  'map.tezkor120.name': { uz: 'Tezkor 120', ru: 'Быстрая 120', en: 'Rapid 120' },
  'map.tezkor120.about': {
    uz: "10 × 12 katak. Uzun narvonlar, kam ilon — qisqa va shiddatli o'yin.",
    ru: '10 × 12 клеток. Длинные лестницы, мало змей — короткая и динамичная партия.',
    en: '10 × 12 cells. Long ladders, few snakes — a short and intense match.',
  },

  // ---------------------------------------------------------------- ko'rinishlar
  'item.token-classic.name': { uz: 'Klassik dona', ru: 'Классическая фишка', en: 'Classic token' },
  'item.token-classic.about': { uz: "Oddiy yaltiroq dona — boshlang'ich ko'rinish.", ru: 'Простая блестящая фишка — стартовый скин.', en: 'A simple glossy token — the starter skin.' },
  'item.token-ring.name': { uz: 'Neon halqa', ru: 'Неоновое кольцо', en: 'Neon ring' },
  'item.token-ring.about': { uz: "Ichi bo'sh, chekkasi yorqin nur bilan yonadi.", ru: 'Полая внутри, край горит ярким светом.', en: 'Hollow inside, with a brightly glowing rim.' },
  'item.token-gem.name': { uz: 'Qimmatbaho tosh', ru: 'Драгоценный камень', en: 'Gemstone' },
  'item.token-gem.about': { uz: 'Qirralari yaltiraydigan olmos shaklidagi dona.', ru: 'Фишка в форме алмаза со сверкающими гранями.', en: 'A diamond-shaped token with sparkling facets.' },
  'item.token-star.name': { uz: 'Yulduz', ru: 'Звезда', en: 'Star' },
  'item.token-star.about': { uz: "Besh qirrali yulduz — taxtada darrov ko'zga tashlanadi.", ru: 'Пятиконечная звезда — сразу бросается в глаза на доске.', en: 'A five-pointed star — instantly visible on the board.' },
  'item.token-crown.name': { uz: 'Shohona toj', ru: 'Королевская корона', en: 'Royal crown' },
  'item.token-crown.about': { uz: "Boshida oltin toji bor dona. G'oliblar uchun.", ru: 'Фишка с золотой короной. Для победителей.', en: 'A token wearing a golden crown. For winners.' },
  'item.token-dostlik.name': { uz: "Do'stlik yuragi", ru: 'Сердце дружбы', en: 'Heart of friendship' },
  'item.token-dostlik.about': {
    uz: "3 ta do'st chaqirganingiz uchun. Yurak shaklidagi, yulduzcha bilan yaltiraydigan dona.",
    ru: 'За 3 приглашённых друзей. Фишка в форме сердца, сверкающая звёздочкой.',
    en: 'For inviting 3 friends. A heart-shaped token sparkling with a little star.',
  },
  'item.ladder-wood.name': { uz: "Yog'och narvon", ru: 'Деревянная лестница', en: 'Wooden ladder' },
  'item.ladder-wood.about': { uz: 'Klassik yashil-jigarrang narvon.', ru: 'Классическая зелёно-коричневая лестница.', en: 'The classic green-and-brown ladder.' },
  'item.ladder-rope.name': { uz: 'Arqon narvon', ru: 'Верёвочная лестница', en: 'Rope ladder' },
  'item.ladder-rope.about': { uz: "Eshilgan arqon va yog'och pog'onalar.", ru: 'Витая верёвка и деревянные перекладины.', en: 'Twisted rope with wooden rungs.' },
  'item.ladder-crystal.name': { uz: 'Billur narvon', ru: 'Хрустальная лестница', en: 'Crystal ladder' },
  'item.ladder-crystal.about': { uz: "Shaffof muz-billur, ichidan nur o'tadi.", ru: 'Прозрачный ледяной хрусталь, сквозь который проходит свет.', en: 'Translucent ice crystal that lets the light through.' },
  'item.ladder-gold.name': { uz: 'Oltin narvon', ru: 'Золотая лестница', en: 'Golden ladder' },
  'item.ladder-gold.about': { uz: "Sof oltin — har ko'tarilish bayramdek.", ru: 'Чистое золото — каждый подъём как праздник.', en: 'Pure gold — every climb feels like a celebration.' },
  'item.ladder-yulduz.name': { uz: 'Yulduzli narvon', ru: 'Звёздная лестница', en: 'Starlit ladder' },
  'item.ladder-yulduz.about': {
    uz: "5 ta do'st uchun. Pog'onalari yulduzchalardan yasalgan, tunda yonadi.",
    ru: 'За 5 друзей. Перекладины из звёздочек, светятся в темноте.',
    en: 'For 5 friends. Its rungs are made of little stars that glow at night.',
  },
  'item.snake-classic.name': { uz: 'Oddiy ilon', ru: 'Обычная змея', en: 'Classic snake' },
  'item.snake-classic.about': { uz: 'Rang-barang klassik ilonlar.', ru: 'Разноцветные классические змеи.', en: 'Colourful classic snakes.' },
  'item.snake-candy.name': { uz: 'Konfet ilon', ru: 'Конфетная змея', en: 'Candy snake' },
  'item.snake-candy.about': { uz: 'Chiziqli shirinlik ilonlari — bolalar uchun.', ru: 'Полосатые сладкие змеи — для детей.', en: 'Striped sweet-shop snakes — great for kids.' },
  'item.snake-electric.name': { uz: 'Chaqmoq ilon', ru: 'Электрическая змея', en: 'Electric snake' },
  'item.snake-electric.about': { uz: 'Elektr yoyi kabi keskin va yorqin.', ru: 'Резкая и яркая, как электрическая дуга.', en: 'Sharp and bright like an electric arc.' },
  'item.snake-dragon.name': { uz: 'Ajdaho', ru: 'Дракон', en: 'Dragon' },
  'item.snake-dragon.about': { uz: 'Qirrali tikanlari va olovli nafasi bor ajdaho.', ru: 'Дракон с гребнем шипов и огненным дыханием.', en: 'A dragon with a ridge of spikes and fiery breath.' },
  'item.snake-yulduz.name': { uz: 'Yulduz ilon', ru: 'Звёздная змея', en: 'Star snake' },
  'item.snake-yulduz.about': {
    uz: "7 ta do'st uchun. Gavdasi yulduzlar bilan qoplangan koinot iloni.",
    ru: 'За 7 друзей. Космическая змея, тело которой усыпано звёздами.',
    en: 'For 7 friends. A cosmic snake with a body covered in stars.',
  },
  'item.board-default.name': { uz: 'Xarita rangi', ru: 'Цвета карты', en: 'Map colours' },
  'item.board-default.about': { uz: "Har bir xaritaning o'z rangi.", ru: 'У каждой карты свои цвета.', en: 'Each map keeps its own colours.' },
  'item.board-papirus.name': { uz: 'Qadimiy papirus', ru: 'Древний папирус', en: 'Ancient papyrus' },
  'item.board-papirus.about': { uz: "Sarg'aygan qog'oz — qo'lda chizilgandek.", ru: 'Пожелтевшая бумага — будто нарисовано от руки.', en: 'Yellowed paper — as if drawn by hand.' },
  'item.board-tun.name': { uz: 'Tungi neon', ru: 'Ночной неон', en: 'Night neon' },
  'item.board-tun.about': { uz: "Qorong'i taxta va neon chiziqlar.", ru: 'Тёмная доска и неоновые линии.', en: 'A dark board with neon lines.' },
  'item.board-muz.name': { uz: 'Muzlik', ru: 'Ледник', en: 'Glacier' },
  'item.board-muz.about': { uz: 'Muz ranglari, sovuq va tiniq.', ru: 'Ледяные цвета — холодно и прозрачно.', en: 'Icy colours, cold and clear.' },
  'item.board-oltin.name': { uz: 'Oltin saroy', ru: 'Золотой дворец', en: 'Golden palace' },
  'item.board-oltin.about': { uz: 'Qora marmar ustida oltin naqshlar.', ru: 'Золотые узоры на чёрном мраморе.', en: 'Golden patterns on black marble.' },
  'item.board-dostlar.name': { uz: "Do'stlar galaktikasi", ru: 'Галактика друзей', en: 'Galaxy of friends' },
  'item.board-dostlar.about': {
    uz: "10 ta do'st uchun — eng nodir taxta. Yulduzli osmon ustida o'ynaysiz.",
    ru: 'За 10 друзей — самая редкая доска. Играете на звёздном небе.',
    en: 'For 10 friends — the rarest board. You play on a starry sky.',
  },
  'item.bundle-afsona.name': { uz: "Afsonaviy to'plam", ru: 'Легендарный набор', en: 'Legendary bundle' },
  'item.bundle-afsona.about': {
    uz: 'Shohona toj + Oltin narvon + Ajdaho + Oltin saroy. Alohida olgandan arzon.',
    ru: 'Королевская корона + Золотая лестница + Дракон + Золотой дворец. Дешевле, чем по отдельности.',
    en: 'Royal crown + Golden ladder + Dragon + Golden palace. Cheaper than buying separately.',
  },
  'item.bundle-boshlash.name': { uz: "Boshlovchi to'plam", ru: 'Стартовый набор', en: 'Starter bundle' },
  'item.bundle-boshlash.about': {
    uz: 'Neon halqa + Arqon narvon + Konfet ilon + Papirus taxta.',
    ru: 'Неоновое кольцо + Верёвочная лестница + Конфетная змея + Доска-папирус.',
    en: 'Neon ring + Rope ladder + Candy snake + Papyrus board.',
  },
};

export const KEYS = Object.keys(T);

let current = DEFAULT_LANG;
const listeners = new Set();

/** Joriy til kodi. */
export const getLang = () => current;

/** Tilni almashtiradi va obunachilarga xabar beradi. */
export function setLang(code) {
  const next = LANG_CODES.includes(code) ? code : DEFAULT_LANG;
  if (next === current) return current;
  current = next;
  for (const fn of listeners) {
    try {
      fn(current);
    } catch {
      /* bitta obunachi yiqilsa qolganlari ishlayversin */
    }
  }
  return current;
}

/** Til o'zgarganda chaqiriladi. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Berilgan taxminlardan tilni aniqlaydi.
 * Masalan: detectLang(['ru-RU', 'en']) → 'ru'
 */
export function detectLang(hints = []) {
  for (const hint of hints) {
    const code = String(hint || '').slice(0, 2).toLowerCase();
    if (LANG_CODES.includes(code)) return code;
  }
  return DEFAULT_LANG;
}

/**
 * Tarjima.
 * Kalit topilmasa — o'zbekchasi, u ham bo'lmasa kalitning o'zi qaytadi
 * (ilova hech qachon bo'sh matn ko'rsatmasin).
 */
export function t(key, params = null, lang = null) {
  const row = T[key];
  const code = lang && LANG_CODES.includes(lang) ? lang : current;
  let text = row ? (row[code] ?? row[DEFAULT_LANG]) : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Katalogdagi narsaning tarjimasi (tarjima bo'lmasa katalogdagi matn qoladi). */
export function itemText(item, field = 'name', lang = null) {
  const key = `item.${item?.id}.${field}`;
  return T[key] ? t(key, null, lang) : (item?.[field === 'name' ? 'name' : 'about'] || '');
}

/** Xarita nomi/tavsifi. */
export function mapText(map, field = 'name', lang = null) {
  const key = `map.${map?.id}.${field}`;
  return T[key] ? t(key, null, lang) : (map?.[field] || '');
}
