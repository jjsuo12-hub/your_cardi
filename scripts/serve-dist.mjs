import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.argv[2] ?? 8080);
const root = path.resolve('dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const requestedPath = path.resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);

  if (!requestedPath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const file = await readFile(requestedPath);
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(requestedPath)] ?? 'application/octet-stream',
    });
    response.end(file);
  } catch {
    const fallback = await readFile(path.join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
    response.end(fallback);
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving dist at http://localhost:${port}`);
});
