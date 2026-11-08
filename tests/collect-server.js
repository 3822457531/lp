/* 测试结果收集服务：POST /save 写文件，GET /ping 探活
 * 用法：node tests/collect-server.js   （监听 127.0.0.1:8100）
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'ui-result.json');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url.indexOf('/ping') === 0) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }

  if (req.method === 'POST' && req.url.indexOf('/save') === 0) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        JSON.parse(body);
        fs.writeFileSync(OUT, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, bytes: body.length, file: OUT }));
        console.log('[save] ' + body.length + ' bytes -> ' + OUT);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(8100, '127.0.0.1', () => console.log('collect-server on http://127.0.0.1:8100'));
