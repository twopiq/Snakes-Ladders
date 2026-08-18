import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/**
 * Ilova versiyasi — public/ ichidagi eng yangi kod faylining vaqti.
 * HTML ichidagi __V__ shu qiymatga almashtiriladi, ya'ni har deploydan keyin
 * skript manzili o'zgaradi va brauzer eski nusxani ishlatmaydi.
 */
export const BUILD_ID = computeBuildId();

function computeBuildId() {
  let newest = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|css|html)$/.test(entry.name)) {
        const { mtimeMs } = fs.statSync(full);
        if (mtimeMs > newest) newest = mtimeMs;
      }
    }
  };
  walk(ROOT);
  return Math.floor(newest / 1000).toString(36);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/** public/ katalogidan statik fayllarni xavfsiz uzatadi. */
export function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, urlPath);

  // Katalogdan chiqib ketishga yo'l qo'ymaymiz
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA emas — noma'lum yo'llar uchun bosh sahifani qaytaramiz
      const fallback = path.join(ROOT, 'index.html');
      fs.readFile(fallback, (e2, buf) => {
        if (e2) res.writeHead(404).end('Topilmadi');
        else res.writeHead(404, { 'Content-Type': MIME['.html'] }).end(buf);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();

    // Kod fayllari (html/js/css) uchun "no-cache": brauzer har safar so'raydi,
    // lekin fayl o'zgarmagan bo'lsa server 304 qaytaradi — trafik ham tejaladi.
    // Aks holda deploydan keyin eski JS qolib ketadi va yangi HTML bilan mos kelmaydi
    // (Telegram ichidagi brauzer ayniqsa uzoq keshlaydi).
    const isCode = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': isCode ? 'no-cache' : 'public, max-age=86400' });
      return res.end();
    }

    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isCode ? 'no-cache' : 'public, max-age=86400',
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
    };

    // HTML ichidagi __V__ belgisini joriy versiyaga almashtiramiz
    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (e3, text) => {
        if (e3) return res.writeHead(500).end('Xatolik');
        res.writeHead(200, headers);
        res.end(text.replaceAll('__V__', BUILD_ID));
      });
      return;
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}
