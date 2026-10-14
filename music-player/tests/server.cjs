// Offline test fixture: two origins reproduce the production Web Audio CORS path.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { tone } = require('./tone.cjs');
const audio = tone();
const root = path.resolve(__dirname, '..');

http.createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!['index.html', 'script.js', 'styles.css', 'favicon.svg'].includes(file)) {
    res.writeHead(404).end();
    return;
  }
  let body = fs.readFileSync(path.join(root, file), 'utf8');
  if (file === 'script.js') {
    body = body.replace(
      'https://raw.githubusercontent.com/rushiaismywaifu/PageTest/gh-pages/ayame.mp3',
      'http://127.0.0.1:4174/tone.wav',
    );
  }
  res.setHeader('Content-Type', {
    'index.html': 'text/html; charset=utf-8',
    'script.js': 'text/javascript; charset=utf-8',
    'styles.css': 'text/css; charset=utf-8',
    'favicon.svg': 'image/svg+xml',
  }[file]);
  res.end(body);
}).listen(4173, '127.0.0.1');

http.createServer((req, res) => {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'audio/wav',
    'Content-Length': audio.length,
  });
  res.end(audio);
}).listen(4174, '127.0.0.1');
