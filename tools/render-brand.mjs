/**
 * Brend rasmlarini SVG dan PNG ga o'giradi.
 *
 *   npx playwright install --with-deps chromium   (bir marta, kerak bo'lsa)
 *   node tools/render-brand.mjs
 *
 * Natija: assets/brand/png/*.png
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const SRC = 'assets/brand';
const OUT = path.join(SRC, 'png');

const JOBS = [
  { file: 'icon-emblem.svg', w: 512, h: 512, scale: 2 },
  { file: 'icon-minimal.svg', w: 512, h: 512, scale: 2 },
  { file: 'icon-dice.svg', w: 512, h: 512, scale: 2 },
  { file: 'cover.svg', w: 640, h: 360, scale: 2 },
  { file: 'og.svg', w: 1200, h: 630, scale: 1 },
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const job of JOBS) {
  const src = path.join(SRC, job.file);
  if (!fs.existsSync(src)) {
    console.log(`o'tkazib yuborildi (yo'q): ${job.file}`);
    continue;
  }
  const svg = fs.readFileSync(src, 'utf8');
  const page = await browser.newPage({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: job.scale,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${svg}`,
    { waitUntil: 'load' },
  );
  const out = path.join(OUT, job.file.replace('.svg', `-${job.w}x${job.h}.png`));
  await page.screenshot({ path: out });
  await page.close();
  console.log(`${out}  (${job.w}x${job.h} @${job.scale}x)`);
}

await browser.close();
