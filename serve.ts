// A static server for the game, so `npm run serve` opens it on localhost.
//
// It serves the repository root and nothing above it, with the MIME types the
// game needs (`text/javascript` for .js, `font/woff2` for the faces in
// game/assets/fonts, which browsers refuse to load when they arrive as
// application/octet-stream). Everything is served no-store: this is a dev
// server, and a stale module cache while tuning the game costs more than a
// few kilobytes of bandwidth.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname);
const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** The path on disk a request means, or null when it would leave the root. */
function fileFor(url) {
  const path = decodeURIComponent(url.split('?')[0].split('#')[0]);
  const clean = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const target = join(ROOT, clean);
  if (!target.startsWith(ROOT + sep) && target !== ROOT) return null;
  if (!existsSync(target)) return null;
  const stats = statSync(target);
  if (stats.isDirectory()) {
    const index = join(target, 'index.html');
    return existsSync(index) ? index : null;
  }
  return stats.isFile() ? target : null;
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end('Only GET and HEAD are served here.\n');
    return;
  }
  const file = fileFor(request.url ?? '/');
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Not here: ${request.url}\nTry /game/ for the game, or /screenshots/ for its shots.\n`);
    return;
  }
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  response.writeHead(200, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Wispwood is served from ${ROOT}`);
  console.log(`  game:  http://localhost:${PORT}/game/`);
  console.log(`  shots: http://localhost:${PORT}/screenshots/`);
});
