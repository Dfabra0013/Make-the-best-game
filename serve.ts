import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'game');
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/';
  const decoded = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const safeRel = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const diskPath = resolve(join(ROOT_DIR, safeRel));

  if (!diskPath.startsWith(ROOT_DIR) || !existsSync(diskPath) || !statSync(diskPath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = extname(diskPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const body = readFileSync(diskPath);
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(body);
});

server.listen(PORT, HOST, () => {
  console.log(`Chronodial static server listening on http://${HOST}:${PORT}`);
});
