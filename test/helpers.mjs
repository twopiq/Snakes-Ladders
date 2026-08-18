/** Testlar uchun umumiy yordamchilar. */

import crypto from 'node:crypto';

export const TEST_BOT_TOKEN = '123456:TEST-TOKEN-FOR-UNIT-TESTS';

/** Telegram yasagandek imzolangan initData satrini quradi. */
export function makeInitData({
  token = TEST_BOT_TOKEN,
  user = { id: 42, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' },
  authDate = Math.floor(Date.now() / 1000),
  omitSignature = false,
  extra = {},
} = {}) {
  const params = {
    auth_date: String(authDate),
    query_id: 'AAE',
    user: JSON.stringify(user),
    // Yangi Telegram versiyalari shu maydonni ham yuboradi va u HMAC ichida qoladi
    ...(omitSignature ? {} : { signature: 'ZmFrZS1lZDI1NTE5LXNpZ25hdHVyZQ' }),
    ...extra,
  };
  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}
