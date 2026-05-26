const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const WWW_DIR = path.join(__dirname, 'www');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

async function proxyRequest(req, res, targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const headers = {};

    req.rawHeaders.forEach((val, i) => {
      if (i % 2 === 0 && val.toLowerCase() !== 'host') {
        headers[val] = req.rawHeaders[i + 1];
      }
    });

    headers['Host'] = parsed.host;

    const body = ['PUT', 'POST'].includes(req.method) ? await readBody(req) : undefined;

    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    const resBody = Buffer.from(await fetchRes.arrayBuffer());

    const respHeaders = {};
    fetchRes.headers.forEach((val, key) => {
      if (!['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        respHeaders[key] = val;
      }
    });

    respHeaders['Access-Control-Allow-Origin'] = '*';
    respHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL';
    respHeaders['Access-Control-Allow-Headers'] = '*';

    res.writeHead(fetchRes.status, respHeaders);
    res.end(resBody);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error: ' + err.message);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/webdav') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    return proxyRequest(req, res, targetUrl);
  }

  if (url.pathname === '/api/github') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    return proxyRequest(req, res, targetUrl);
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  let filePath = path.join(WWW_DIR, url.pathname);
  if (url.pathname === '/') {
    filePath = path.join(WWW_DIR, 'index.html');
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`CC Toolbox dev server running at http://localhost:${PORT}`);
  console.log(`WebDAV proxy at /api/webdav?url=<encoded_url>`);
  console.log(`GitHub proxy at /api/github?url=<encoded_url>`);
});
