// Local preview only: bind to loopback and serve files from this directory.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer((request, response) => {
    let file;
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
        if (!file.startsWith(root + path.sep)) throw new Error('Outside preview root');
    } catch {
        response.writeHead(400).end('Invalid path'); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404).end('Not found'); return; }
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : data);
    });
});
const port = process.env.PORT === undefined ? 8124 : Number(process.env.PORT);
server.listen(port, '127.0.0.1', () => console.log('Quiz preview: http://127.0.0.1:' + server.address().port));
