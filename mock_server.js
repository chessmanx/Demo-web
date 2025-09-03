const http = require('http');

const port = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/predict') {
    // Consume request body (we don't parse multipart here)
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      // Return a dummy prediction
      const response = { ok: true, label: 'mock-pattern', score: 0.92 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
    return;
  }
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mock server running');
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(port, () => console.log(`Mock server listening on http://localhost:${port}`));
