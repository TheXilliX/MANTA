import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const port = Number(process.env.PORT || 4173);
const index = resolve(root, 'index.html');
try { await stat(index); } catch {
  console.error('Сначала собери сайт командой npm run build.');
  process.exit(1);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      response.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': data.length});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'}).end('Страница не найдена');
  }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));

