/* 进度盘点：后端路由 vs 前端实际调用 vs mock 覆盖 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');          // D:\workSpace\lp
const SERVER = path.join(ROOT, '..', 'lp-server', 'server.js');

/* ---------- 1. 后端路由 ---------- */
const src = fs.readFileSync(SERVER, 'utf8');
const routes = [];
const re = /route\('([A-Z]+)',\s*'([^']+)'/g;
let m;
while ((m = re.exec(src))) routes.push({ method: m[1], path: m[2] });

/* ---------- 2. 前端调用 ---------- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|assets\\images/.test(p)) walk(p, out); }
    else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(ROOT).filter(f => !f.includes(path.join('tests', '')));
const calls = []; // {file, method, path}
const callRe = /LP\.(get|post|put|del)\(\s*['"`]([^'"`]+)['"`]/g;
const callRe2 = /LP\.request\(\s*['"]([A-Z]+)['"]\s*,\s*['"`]([^'"`]+)['"`]/g;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let c;
  while ((c = callRe.exec(t))) calls.push({ file: path.relative(ROOT, f), method: c[1].toUpperCase(), path: c[2] });
  while ((c = callRe2.exec(t))) calls.push({ file: path.relative(ROOT, f), method: c[1], path: c[2] });
}

/* ---------- 3. mock 层覆盖 ---------- */
const mockSrc = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'lp-mock.js'), 'utf8');
const mockRoutes = [...new Set((mockSrc.match(/r0 === "([a-z\-]+)"/g) || []).map(s => s.replace(/r0 === "|"/g, '')))];

/* ---------- 4. 匹配 ---------- */
const norm = p => p.replace(/\/:[a-zA-Z_]+/g, '/:id').replace(/\?.*$/, '');
const routeSet = new Set(routes.map(r => r.method + ' ' + norm(r.path)));
function matched(method, p) {
  const base = norm(p);
  if (routeSet.has(method + ' ' + base)) return true;
  // 参数化替换：/api/customers/123 -> /api/customers/:id
  const gen = base.replace(/\/[0-9a-zA-Z_\-]{1,40}(?=\/|$)/g, '/:id');
  if (routeSet.has(method + ' ' + gen)) return true;
  const gen2 = base.replace(/\/(\d+|[a-z]+_[0-9a-z]+)(?=\/|$)/g, '/:id');
  return routeSet.has(method + ' ' + gen2);
}

const uniq = [...new Set(calls.map(c => c.method + ' ' + c.path))].sort();
const miss = uniq.filter(u => { const [a, b] = u.split(' '); return !matched(a, b); });
const used = new Set(uniq.map(u => { const [a, b] = u.split(' '); return a + ' ' + norm(b); }));

/* ---------- 5. 输出 ---------- */
console.log('# 后端路由总数:', routes.length);
console.log('# 前端调用点:', calls.length, ' 唯一:', uniq.length);
console.log('# 前端调用未命中后端路由:', miss.length);
miss.forEach(x => console.log('   MISS', x));
const pageCount = {};
for (const c of calls) {
  const k = c.file.split(path.sep)[0] || 'root';
  pageCount[k] = (pageCount[k] || 0) + 1;
}
console.log('# 各端调用点:', JSON.stringify(pageCount));
console.log('# mock 覆盖的资源前缀:', mockRoutes.join(', '));
fs.writeFileSync(path.join(__dirname, 'progress-matrix.json'), JSON.stringify({ routes, uniq, miss, pageCount }, null, 2));
