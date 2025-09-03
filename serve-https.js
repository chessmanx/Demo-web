// Minimal HTTPS static server (no external deps).
// Usage:
// 1) Generate cert.pem and key.pem (see README or instructions below).
// 2) node serve-https.js
// Then open https://localhost:8443/

const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8443;
const HOST = '0.0.0.0';
const ROOT = path.resolve(__dirname);

const certPath = path.join(ROOT, 'cert.pem');
const keyPath = path.join(ROOT, 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('Missing cert.pem or key.pem in project root.');
  console.error('Generate them with mkcert (recommended) or OpenSSL. See project README/instructions.');
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

const server = https.createServer(options, (req, res) => {
  try {
    const parsed = url.parse(req.url || '/');
    let pathname = decodeURIComponent(parsed.pathname || '/');
    if (pathname === '/') pathname = '/analyzer.html';
    // Prevent path traversal
    const safePath = path.normalize(path.join(ROOT, pathname));
    if (!safePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const data = fs.readFileSync(safePath);
      res.writeHead(200, { 'Content-Type': contentType(safePath) });
      res.end(data);
      return;
    }
    // Not a file -> 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HTTPS static server serving ${ROOT} at https://localhost:${PORT}/`);
  console.log('Make sure your browser trusts the certificate (mkcert recommended).');
});
