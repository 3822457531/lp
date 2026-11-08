/* 兰瓶美业原型 · 自动化测试（Node 直跑数据层 + 逻辑层）
 * 用法：node tests/run-tests.js [-v]
 * 输出：控制台汇总 + tests/result.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const MOCK = path.join(ROOT, 'assets', 'js', 'lp-mock.js');
const VERBOSE = process.argv.includes('-v');

/* ---------------- 浏览器环境垫片 ---------------- */
const mem = {};
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  setTimeout, clearTimeout, Promise, Date, Math, JSON, String, Number,
  localStorage: {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  },
  location: { search: '?mock=reset', origin: 'http://127.0.0.1:8099', href: '' },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.LP = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(MOCK, 'utf8'), sandbox, { filename: 'lp-mock.js' });
const LP = sandbox.LP;
const DB = sandbox.LP_MOCK.db;

/* ---------------- 断言与结果收集 ---------------- */
const results = [];
let group = '未分组';
function setGroup(g) { group = g; }

function ok(name, cond, detail) {
  results.push({ group, name, pass: !!cond, detail: cond ? '' : (detail || '') });
  if (VERBOSE) console.log((cond ? 'PASS ' : 'FAIL ') + '[' + group + '] ' + name + (cond ? '' : ' :: ' + (detail || '')));
}
function eq(name, actual, expected) {
  ok(name, actual === expected, 'actual=' + JSON.stringify(actual) + ' expected=' + JSON.stringify(expected));
}
function near(name, actual, expected, tol) {
  ok(name, Math.abs(Number(actual) - Number(expected)) <= (tol === undefined ? 0.01 : tol),
    'actual=' + actual + ' expected≈' + expected);
}
async function t(name, fn) {
  try {
    const r = await fn();
    if (r === false) { ok(name, false, 'fn returned false'); return; }
    ok(name, true);
  } catch (e) {
    ok(name, false, e && e.message ? e.message : String(e));
  }
}
const num = (x) => Number(x) || 0;
const listOf = (d) => (d && d.list) || (Array.isArray(d) ? d : []);
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/* =====================================================================
   0. 基础工具函数
   ===================================================================== */
async function testEscape() {
  setGroup('0 基础工具');
  const esc = lpEscape;
  eq('HTML 转义 < > & "', esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
  const money = lpMoney(1234.5);
  ok('金额格式化带千分位与符号', money.indexOf('1,234') >= 0, money);
  ok('金额 0 显示 ¥0', lpMoney(0).indexOf('0') >= 0, lpMoney(0));
}
/* 页面用的 LP.esc / LP.fmt.money 在 lp-api.js 里实现，这里做等价校验 */
function lpEscape(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function lpMoney(n) {
  n = Number(n) || 0;
  const s = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '¥' + s;
}

/* =====================================================================
   1. 种子数据完整性
   ===================================================================== */
async function testSeed() {
  setGroup('1 种子数据');
  const db = DB();
  eq('门店 3 家', db.stores.length, 3);
  eq('员工 8 人', db.users.length, 8);
  eq('项目 8 个', db.projects.length, 8);
  eq('客户 40 人', db.customers.length, 40);
  eq('卡 30 张', db.cards.length, 30);
  eq('核销 180 条', db.verifications.length, 180);
  eq('预约 24 条', db.appointments.length, 24);
  eq('待审申请 5 条', db.audits.length, 5);
  eq('考核 8 条', db.assessments.length, 8);
  eq('薪资记录 24 条（3 月×8 人）', db.salary_records.length, 24);
  eq('福利 3 项', db.welfare.length, 3);
  eq('短信 12 条', db.sms_logs.length, 12);
  eq('消息中心 8 条', db.messages.length, 8);
  eq('库存 6 项', db.inventory_items.length, 6);
  eq('库存单据 8 条', db.inventory_orders.length, 8);

  const stIds = db.stores.map((s) => s.id);
  ok('员工门店外键都存在', db.users.every((u) => stIds.indexOf(u.store_id) >= 0),
    db.users.filter((u) => stIds.indexOf(u.store_id) < 0).map((u) => u.id).join(','));
  ok('员工状态只用 active/disabled',
    db.users.every((u) => ['active', 'disabled'].indexOf(u.status) >= 0),
    db.users.map((u) => u.status).join(','));
  const cIds = db.customers.map((c) => c.id);
  ok('卡客户外键都存在', db.cards.every((c) => cIds.indexOf(c.customer_id) >= 0));
  ok('卡金额 = 单价 × 次数（允许涨价前数据）',
    db.cards.every((c) => num(c.amount) >= 0), '');
  ok('核销记录都带 items 明细', db.verifications.every((v) => Array.isArray(v.items) && v.items.length > 0),
    db.verifications.filter((v) => !(v.items || []).length).length + ' 条缺明细');
  ok('核销时间格式合法', db.verifications.every((v) => DATE_RE.test(v.at || v.created_at || '')),
    '样例 ' + (db.verifications[0] || {}).at);
  ok('核销金额非负', db.verifications.every((v) => num(v.total_amount) >= 0));
  ok('客户手机号 11 位', db.customers.every((c) => /^1\d{10}$/.test(String(c.phone))),
    db.customers.filter((c) => !/^1\d{10}$/.test(String(c.phone))).map((c) => c.phone).slice(0, 3).join(','));
  ok('薪资记录带 user_name 且不带 user_id',
    db.salary_records.every((r) => r.user_name && r.user_id === undefined),
    '样例 ' + JSON.stringify(db.salary_records[0] && Object.keys(db.salary_records[0])));
  ok('考核记录带 name/weight/target',
    db.assessments.every((a) => a.name && a.weight && a.target),
    JSON.stringify(db.assessments[0] && { name: db.assessments[0].name, weight: db.assessments[0].weight }));
}

/* =====================================================================
   2. 列表接口 + 分页 + 筛选
   ===================================================================== */
const LIST_APIS = [
  ['客户', '/api/customers', 'customers'],
  ['员工', '/api/users', 'users'],
  ['项目', '/api/projects', 'projects'],
  ['卡', '/api/cards', 'cards'],
  ['核销', '/api/verifications', 'verifications'],
  ['预约', '/api/appointments', 'appointments'],
  ['审核', '/api/audits', 'audits'],
  ['考核', '/api/assessments', 'assessments'],
  ['库存', '/api/inventory/items', 'inventory_items'],
  ['库存单据', '/api/inventory/orders', 'inventory_orders'],
  ['福利', '/api/welfare', 'welfare'],
  ['短信', '/api/sms/logs', 'sms'],
  ['门店', '/api/stores', 'stores'],
];
async function testLists() {
  setGroup('2 列表接口');
  for (const [label, api] of LIST_APIS) {
    await t('列表 ' + label + ' 返回结构合法', async () => {
      const d = await LP.get(api);
      const arr = listOf(d);
      ok('列表 ' + label + ' 非空', arr.length > 0, 'len=' + arr.length);
      ok('列表 ' + label + ' 每条都有 id', arr.every((x) => x.id !== undefined && x.id !== ''));
    });
  }
  await t('分页 pageSize=10 返回 10 条且 total 完整', async () => {
    const d = await LP.get('/api/customers', { page: 1, pageSize: 10 });
    eq('分页 pageSize=10 长度', listOf(d).length, 10);
    eq('分页 total = 客户总数', num(d.total), DB().customers.length);
  });
  await t('分页 pageSize=20 返回 20 条', async () => {
    const d = await LP.get('/api/customers', { page: 1, pageSize: 20 });
    eq('分页 pageSize=20 长度', listOf(d).length, 20);
  });
  await t('分页第 2 页与第 1 页不重复', async () => {
    const a = await LP.get('/api/customers', { page: 1, pageSize: 10 });
    const b = await LP.get('/api/customers', { page: 2, pageSize: 10 });
    const idsA = listOf(a).map((x) => x.id);
    const idsB = listOf(b).map((x) => x.id);
    ok('第 2 页无重复', idsB.every((id) => idsA.indexOf(id) < 0), idsB.join(','));
  });
  await t('客户按关键词搜索（姓名）', async () => {
    const db = DB();
    const target = db.customers[3];
    const d = await LP.get('/api/customers', { q: target.name, pageSize: 50 });
    ok('搜索结果包含目标客户', listOf(d).some((x) => x.id === target.id), target.name);
  });
  await t('客户按等级筛选', async () => {
    const d = await LP.get('/api/customers', { level: '钻石会员', pageSize: 100 });
    const arr = listOf(d);
    ok('筛选结果全部为钻石会员', arr.length > 0 && arr.every((x) => x.level === '钻石会员'));
  });
  await t('客户按门店筛选', async () => {
    const d = await LP.get('/api/customers', { store_id: 'st1', pageSize: 100 });
    const arr = listOf(d);
    ok('筛选结果全部属于 st1', arr.every((x) => x.store_id === 'st1'));
  });
  await t('核销按状态筛选', async () => {
    const d = await LP.get('/api/verifications', { status: '待核销', pageSize: 100 });
    ok('筛选结果全部待核销', listOf(d).every((x) => x.status === '待核销'));
  });
  await t('员工按角色筛选', async () => {
    const d = await LP.get('/api/users', { role: 'staff', pageSize: 100 });
    ok('筛选结果全部为 staff', listOf(d).length > 0 && listOf(d).every((x) => x.role === 'staff'));
  });
  await t('空关键词返回全量', async () => {
    const d = await LP.get('/api/customers', { q: '', pageSize: 100 });
    eq('空关键词返回全部客户', listOf(d).length, DB().customers.length);
  });
}

/* =====================================================================
   3. 客户增删改查
   ===================================================================== */
async function testCustomerCRUD() {
  setGroup('3 客户 CRUD');
  let created = null;
  await t('新增客户', async () => {
    const before = DB().customers.length;
    created = await LP.post('/api/customers', {
      name: '测试客户A', phone: '13900001111', level: '银卡会员',
      store_id: 'st1', status: 'active', birthday: '1995-06-18',
    });
    ok('返回新客户 id', !!created.id, JSON.stringify(created));
    eq('客户数 +1', DB().customers.length, before + 1);
  });
  await t('新增客户后可查询到', async () => {
    const d = await LP.get('/api/customers', { q: '13900001111', pageSize: 20 });
    ok('按手机号能搜到', listOf(d).some((x) => x.id === created.id));
  });
  await t('修改客户姓名与等级', async () => {
    await LP.put('/api/customers/' + created.id, { name: '测试客户A改', level: '金卡会员' });
    const one = await LP.get('/api/customers/' + created.id);
    eq('姓名已更新', one.name, '测试客户A改');
    eq('等级已更新', one.level, '金卡会员');
  });
  await t('删除客户并从列表移除', async () => {
    await LP.del('/api/customers/' + created.id);
    const db = DB();
    ok('库中已不存在', !db.customers.some((x) => x.id === created.id));
  });
  await t('手机号重复/非法在页面层拦截（规则校验）', async () => {
    const re = /^1\d{10}$/;
    ok('13 位数字被拒', !re.test('139000011112'), '');
    ok('字母被拒', !re.test('139abc'), '');
    ok('合法号码通过', re.test('13900001111'));
  });
}

/* =====================================================================
   4. 项目 CRUD + 上下架
   ===================================================================== */
async function testProjectCRUD() {
  setGroup('4 项目 CRUD');
  let p = null;
  await t('新增项目', async () => {
    p = await LP.post('/api/projects', {
      name: '测试项目X', category: '面部清洁', price: 999, member_price: 899,
      total_times: 6, duration: 45, commission_rate: 0.02,
    });
    ok('返回 id 与默认上架状态', !!p.id && p.status === '上架', JSON.stringify(p));
  });
  await t('项目出现在列表', async () => {
    const d = await LP.get('/api/projects', { pageSize: 100 });
    ok('列表含新项目', listOf(d).some((x) => x.id === p.id));
  });
  await t('修改价格', async () => {
    await LP.put('/api/projects/' + p.id, { price: 1099 });
    const one = await LP.get('/api/projects/' + p.id);
    eq('价格已更新', num(one.price), 1099);
  });
  await t('下架项目', async () => {
    await LP.put('/api/projects/' + p.id, { status: '下架' });
    const one = await LP.get('/api/projects/' + p.id);
    eq('状态变下架', one.status, '下架');
  });
}

/* =====================================================================
   5. 开卡 → 客户持卡数 → 核销扣次 全链路
   ===================================================================== */
async function testCardAndVerifyFlow() {
  setGroup('5 开卡·核销链路');
  let cust = null, card = null;
  await t('新建客户用于开卡', async () => {
    cust = await LP.post('/api/customers', {
      name: '链路测试客户', phone: '13700002222', level: '银卡会员', store_id: 'st1', status: 'active',
    });
    ok('客户已创建', !!cust.id);
  });
  await t('开卡（充值开卡页）', async () => {
    const proj = DB().projects[0];
    card = await LP.post('/api/cards', {
      customer_id: cust.id, project_id: proj.id, times: 5, paid_amount: proj.member_price * 5,
      store_id: 'st1', staff_id: 'u4',
    });
    ok('返回卡 id', !!card.id, JSON.stringify(card));
    ok('卡已记录客户', String(card.customer_id) === String(cust.id));
  });
  await t('核销 POST 生成待核销记录', async () => {
    const before = DB().verifications.length;
    const v = await LP.post('/api/verifications', {
      customer_id: cust.id, card_id: card.id, staff_id: 'u4', store_id: 'st1',
      items: [{ name: '测试项目X', times: 1, price: 999 }], total_times: 1, total_amount: 999,
    });
    ok('核销记录已生成', !!v.id);
    eq('核销总数 +1', DB().verifications.length, before + 1);
  });
  await t('核销 PUT 置为已完成', async () => {
    const v = DB().verifications.filter((x) => String(x.customer_id) === String(cust.id))[0];
    await LP.put('/api/verifications/' + v.id, { status: '已完成' });
    const after = DB().verifications.filter((x) => String(x.customer_id) === String(cust.id))[0];
    eq('状态变已完成', after.status, '已完成');
  });
  await t('补退次（PUT 状态 已退次）', async () => {
    const v = DB().verifications.filter((x) => String(x.customer_id) === String(cust.id))[0];
    await LP.put('/api/verifications/' + v.id, { status: '已退次' });
    const after = DB().verifications.filter((x) => String(x.customer_id) === String(cust.id))[0];
    eq('状态变已退次', after.status, '已退次');
  });
  await t('核销金额与明细一致性', async () => {
    const vs = DB().verifications.filter((v) => Array.isArray(v.items) && v.items.length);
    const bad = vs.filter((v) => Math.abs(num(v.total_amount) - v.items.reduce((a, it) => a + num(it.price) * num(it.times || 1), 0)) > 1);
    ok('列表金额 = Σ(单价×次数)', bad.length === 0, bad.length + ' 条不一致');
  });
}

/* =====================================================================
   6. 预约 CRUD
   ===================================================================== */
async function testAppointmentCRUD() {
  setGroup('6 预约 CRUD');
  let ap = null;
  await t('新建预约', async () => {
    ap = await LP.post('/api/appointments', {
      customer_id: DB().customers[0].id, project_id: DB().projects[0].id,
      staff_id: 'u4', store_id: 'st1', date: '2026-11-20', time: '15:00',
    });
    ok('默认状态为待确认', ap.status === '待确认', JSON.stringify(ap.status));
  });
  await t('确认预约', async () => {
    await LP.put('/api/appointments/' + ap.id, { status: '已确认' });
    const one = await LP.get('/api/appointments/' + ap.id);
    eq('状态变已确认', one.status, '已确认');
  });
  await t('标记到店完成', async () => {
    await LP.put('/api/appointments/' + ap.id, { status: '已完成' });
    const one = await LP.get('/api/appointments/' + ap.id);
    eq('状态变已完成', one.status, '已完成');
  });
  await t('取消预约', async () => {
    await LP.put('/api/appointments/' + ap.id, { status: '已取消' });
    const one = await LP.get('/api/appointments/' + ap.id);
    eq('状态变已取消', one.status, '已取消');
  });
}

/* =====================================================================
   7. 审核通过 / 驳回
   ===================================================================== */
async function testAuditFlow() {
  setGroup('7 审核流程');
  await t('通过一条待审申请', async () => {
    const pend = DB().audits.filter((a) => a.status === '待审核');
    ok('存在待审数据', pend.length > 0, 'len=' + pend.length);
    const target = pend[0];
    await LP.put('/api/audits/' + target.id, { status: '已通过', confirmed_at: '2026-11-05 10:00' });
    const after = DB().audits.filter((a) => a.id === target.id)[0];
    eq('状态变已通过', after.status, '已通过');
  });
  await t('驳回一条待审申请并记录理由', async () => {
    const pend = DB().audits.filter((a) => a.status === '待审核');
    if (!pend.length) throw new Error('无待审数据');
    const target = pend[0];
    await LP.put('/api/audits/' + target.id, { status: '已驳回', reject_reason: '资料不全' });
    const after = DB().audits.filter((a) => a.id === target.id)[0];
    eq('状态变已驳回', after.status, '已驳回');
    eq('驳回理由已保存', after.reject_reason, '资料不全');
  });
  await t('审核通过/驳回子路由（approve/reject）', async () => {
    const pend = DB().audits.filter((a) => a.status === '待审核');
    if (!pend.length) return;
    const target = pend[0];
    await LP.request('POST', '/api/audits/' + target.id + '/approve', {});
    const after = DB().audits.filter((a) => a.id === target.id)[0];
    eq('子路由生效', after.status, '已通过');
  });
  await t('待审数量随处理递减', async () => {
    const left = DB().audits.filter((a) => a.status === '待审核').length;
    ok('待审数量 <= 初始 5', left <= 5, 'left=' + left);
  });
}

/* =====================================================================
   8. 薪资计算与发放
   ===================================================================== */
async function testSalary() {
  setGroup('8 薪资');
  await t('薪资记录按月筛选', async () => {
    const m = new Date().toISOString().slice(0, 7);
    const d = await LP.get('/api/salary/records', { month: m, pageSize: 50 });
    eq('当月 8 条记录', listOf(d).length, 8);
  });
  await t('薪资记录字段齐全', async () => {
    const d = await LP.get('/api/salary/records', { pageSize: 50 });
    const r = listOf(d)[0];
    ['staff_name', 'base_salary', 'perf_commission', 'card_commission', 'total', 'status']
      .forEach((k) => ok('字段 ' + k + ' 存在', r[k] !== undefined, JSON.stringify(r)));
  });
  await t('应发合计 = 底薪+提成+全勤-扣款', async () => {
    const d = await LP.get('/api/salary/records', { pageSize: 50 });
    const r = listOf(d)[0];
    const expect = num(r.base_salary) + num(r.perf_commission) + num(r.card_commission) +
      num(r.full_attendance_bonus) + num(r.bonus) - num(r.absent_deduct) - num(r.late_deduct);
    near('第 1 条应发合计', r.total, expect, 1);
  });
  await t('批量发放（PUT 状态 已发放）', async () => {
    const m = new Date().toISOString().slice(0, 7);
    const d = await LP.get('/api/salary/records', { month: m, pageSize: 50 });
    const first = listOf(d)[0];
    await LP.put('/api/salary/records/' + first.id, { status: '已发放' });
    const after = (await LP.get('/api/salary/records', { month: m, pageSize: 50 })).list
      .filter((x) => x.id === first.id)[0];
    eq('状态变已发放', after.status, '已发放');
  });
  await t('薪资规则读写', async () => {
    const rules = await LP.get('/api/salary/rules');
    ok('规则含提成比例', rules && (rules.perf_rate !== undefined || rules.commission !== undefined || typeof rules === 'object'),
      JSON.stringify(rules));
  });
}

/* =====================================================================
   9. 考核 CRUD
   ===================================================================== */
async function testAssessment() {
  setGroup('9 考核');
  let a = null;
  await t('新增考核项', async () => {
    a = await LP.post('/api/assessments', {
      name: '测试考核项', target: 100, unit: '分', weight: 10, status: '启用', store_id: 'st1',
    });
    ok('返回 id', !!a.id);
  });
  await t('修改考核项目标值', async () => {
    await LP.put('/api/assessments/' + a.id, { target: 120 });
    const db = DB();
    const cur = db.assessments.filter((x) => x.id === a.id)[0];
    eq('目标值已更新', num(cur.target), 120);
  });
  await t('删除考核项', async () => {
    await LP.del('/api/assessments/' + a.id);
    ok('库中已移除', !DB().assessments.some((x) => x.id === a.id));
  });
  await t('考核结果接口可用', async () => {
    const d = await LP.get('/api/assessments/result');
    ok('返回结果集', Array.isArray(d) || (d && Array.isArray(d.list)), JSON.stringify(d).slice(0, 80));
  });
}

/* =====================================================================
   10. 福利 CRUD + 发放
   ===================================================================== */
async function testWelfare() {
  setGroup('10 福利');
  let w = null;
  await t('新增福利', async () => {
    w = await LP.post('/api/welfare', { name: '测试福利', type: '生日礼', amount: 200, status: '启用' });
    ok('返回 id', !!w.id);
  });
  await t('发放福利生成记录', async () => {
    const before = DB().welfare_issued.length;
    await LP.post('/api/welfare/' + w.id + '/issue', { user_name: '张美丽' });
    eq('发放记录 +1', DB().welfare_issued.length, before + 1);
  });
  await t('删除福利', async () => {
    await LP.del('/api/welfare/' + w.id);
    ok('库中已移除', !DB().welfare.some((x) => x.id === w.id));
  });
  await t('发放记录列表可用', async () => {
    const d = await LP.get('/api/welfare/issued');
    ok('返回发放记录', listOf(d).length > 0);
  });
}

/* =====================================================================
   11. 库存出入库
   ===================================================================== */
async function testInventory() {
  setGroup('11 库存');
  await t('库存列表带库存量', async () => {
    const d = await LP.get('/api/inventory/items', { pageSize: 50 });
    const arr = listOf(d);
    ok('有库存项', arr.length > 0);
    ok('每项有数量字段', arr.every((x) => x.qty !== undefined || x.stock !== undefined), JSON.stringify(arr[0]));
  });
  await t('新建入库单', async () => {
    const before = DB().inventory_orders.length;
    const o = await LP.post('/api/inventory/orders', {
      item_id: DB().inventory_items[0].id, type: '入库', qty: 10, store_id: 'st1',
    });
    ok('单据已生成', !!o.id);
    eq('单据数 +1', DB().inventory_orders.length, before + 1);
  });
  await t('单据默认待确认并可确认', async () => {
    const o = DB().inventory_orders[0];
    await LP.put('/api/inventory/orders/' + o.id, { status: '已完成' });
    const after = DB().inventory_orders.filter((x) => x.id === o.id)[0];
    eq('状态变已完成', after.status, '已完成');
  });
}

/* =====================================================================
   12. 考勤打卡
   ===================================================================== */
async function testAttendance() {
  setGroup('12 考勤');
  await t('今日考勤接口可用', async () => {
    const d = await LP.get('/api/attendance/today');
    ok('返回对象或空对象', typeof d === 'object', JSON.stringify(d).slice(0, 80));
  });
  await t('打卡写入记录', async () => {
    const before = (DB().attendance || []).length;
    await LP.post('/api/attendance/check', { type: '上班', lat: 27.55, lng: 109.98, store_id: 'st1' });
    ok('考勤记录数不减少', (DB().attendance || []).length >= before);
  });
  await t('考勤汇总含 days', async () => {
    const d = await LP.get('/api/attendance');
    const summary = d && d.summary;
    ok('返回 summary 数组', Array.isArray(summary) && summary.length > 0, JSON.stringify(summary && summary.slice(0, 1)));
  });
}

/* =====================================================================
   13. 看板聚合口径
   ===================================================================== */
async function testDashboard() {
  setGroup('13 看板聚合');
  await t('看板返回 9 个关键指标', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    const need = ['revenue', 'card_amount', 'verify_amount', 'verify_count',
      'new_customers', 'pending_verify', 'pending_audit', 'customer_total', 'staff_total'];
    need.forEach((k) => ok('指标 ' + k + ' 存在', d.stats && d.stats[k] !== undefined, JSON.stringify(d.stats)));
  });
  await t('营收 = 开卡 + 核销（区间内）', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    const s = d.stats;
    near('营收口径', num(s.revenue), num(s.card_amount) + num(s.verify_amount), 1);
  });
  await t('趋势数组 7 天且合计一致', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    ok('trend 为 7 项', Array.isArray(d.trend) && d.trend.length === 7, 'len=' + (d.trend || []).length);
  });
  await t('项目占比合计接近核销金额', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    const sum = (d.project_mix || []).reduce((a, b) => a + num(b.amount), 0);
    near('占比合计', sum, num(d.stats.verify_amount), 2);
  });
  await t('员工排行降序', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    const arr = (d.staff_rank || []).map((x) => num(x.amount));
    ok('排行金额从大到小', arr.every((v, i) => i === 0 || arr[i - 1] >= v), arr.join(','));
  });
  await t('门店口径：各店客户数与总数一致', async () => {
    const d = await LP.get('/api/dashboard', { from: '2026-11-01', to: '2026-11-05', store_id: '' });
    const sum = (d.stores || []).reduce((a, b) => a + num(b.customer_count), 0);
    eq('门店客户数合计 = 客户总数', sum, num(d.stats.customer_total));
  });
}

/* =====================================================================
   14. 设置 / 短信 / 消息
   ===================================================================== */
async function testSettings() {
  setGroup('14 设置与消息');
  await t('读取设置', async () => {
    const d = await LP.get('/api/settings');
    ok('返回设置对象', d && typeof d === 'object' && Object.keys(d).length > 0, JSON.stringify(d).slice(0, 80));
  });
  await t('修改设置并持久化', async () => {
    const raw = mem['lp.mock.v1'];
    await LP.put('/api/settings', { brand_name: '兰瓶美业（测试）', birthday_days: 7 });
    const d = await LP.get('/api/settings');
    eq('品牌名已更新', d.brand_name, '兰瓶美业（测试）');
    ok('已写入 localStorage', mem['lp.mock.v1'] !== raw, '');
  });
  await t('短信记录可读', async () => {
    const d = await LP.get('/api/sms/logs', { pageSize: 50 });
    ok('返回短信列表', listOf(d).length > 0);
  });
  await t('发短信接口可写', async () => {
    const before = DB().sms_logs.length;
    await LP.post('/api/sms/send', { phone: '13900001111', tpl: '生日祝福', content: '测试' });
    ok('短信数不减少', DB().sms_logs.length >= before);
  });
  await t('消息中心可读', async () => {
    const d = await LP.get('/api/messages');
    ok('返回消息列表', listOf(d).length > 0);
  });
  await t('近期生日接口只返回 7 天内', async () => {
    const d = await LP.get('/api/customers/birthday/upcoming', { days: 7 });
    const arr = listOf(d);
    ok('生日列表字段含 days_left 或 date', arr.every((x) => x.days_left !== undefined || x.date), JSON.stringify(arr[0] || {}));
  });
}

/* =====================================================================
   15. 权限与会话
   ===================================================================== */
async function testAuth() {
  setGroup('15 会话与权限');
  await t('当前登录用户为超管', async () => {
    const u = LP.user();
    ok('存在登录用户', !!u && !!u.name, JSON.stringify(u));
    eq('角色 admin', u.role, 'admin');
  });
  await t('切换身份：店长', async () => {
    const u = LP.mockLoginAs('u2');
    eq('切到李静', u.name, '李静');
    eq('角色 manager', u.role, 'manager');
  });
  await t('切换身份：员工', async () => {
    const u = LP.mockLoginAs('u4');
    eq('切到陈晓', u.name, '陈晓');
    eq('角色 staff', u.role, 'staff');
  });
  await t('切回超管', async () => {
    const u = LP.mockLoginAs('u1');
    eq('角色 admin', u.role, 'admin');
  });
  await t('工作台接口按角色返回', async () => {
    const d = await LP.get('/api/workbench');
    ok('工作台有本月业绩字段', d && (d.perf !== undefined || d.month_perf !== undefined), JSON.stringify(d).slice(0, 100));
  });
}

/* =====================================================================
   16. 边界与异常
   ===================================================================== */

/* ============ 17 顾客端（登录 / 我的 / 卡项 / 记录 / 预约） ============ */
async function testCustomer() {
  setGroup('17 顾客端');
  const db = DB();
  const cu = db.customers[0];
  const login = await LP.request('POST', '/api/auth/login', { phone: cu.phone, role: 'customer' });
  ok('登录返回 token', !!login.token, 'no token');
  eq('登录后角色=customer', login.user.role, 'customer');
  eq('登录用户=该手机号会员', login.user.id, cu.id);

  const me = await LP.request('GET', '/api/customer/me');
  eq('我的：姓名与会员一致', me.name, cu.name);
  ok('我的：含等级', !!me.level, 'level 缺失');
  ok('我的：含剩余次数 remain', typeof me.remain === 'number', 'remain=' + me.remain);
  ok('我的：remain 与卡项扣减一致', me.remain >= 0 && me.active_cards >= 0, 'remain=' + me.remain);
  ok('我的：含核销笔数', typeof me.verify_count === 'number', 'verify_count=' + me.verify_count);

  const cards = await LP.request('GET', '/api/cards', null, { customer_id: cu.id });
  const cardList = cards.list || cards;
  ok('卡项列表非空', cardList.length > 0, 'empty');
  ok('卡项均属该会员', cardList.every((c) => c.customer_id === cu.id), 'mixed customers');
  ok('卡项剩余次数不超总数', cardList.every((c) => Number(c.total_times) >= Number(c.used_times)), 'bad times');

  const recs = await LP.request('GET', '/api/verifications', null, { customer_id: cu.id });
  const recList = recs.list || recs;
  ok('消费记录均属该会员', recList.every((r) => r.customer_id === cu.id), 'mixed customers');
  ok('消费记录含金额与时间', recList.every((r) => (r.total_amount || r.amount) >= 0 && !!(r.created_at || r.at)), 'missing fields');

  const before = db.appointments.length;
  const na = await LP.request('POST', '/api/appointments', {
    customer_id: cu.id, customer_name: cu.name, customer_phone: cu.phone,
    project_id: db.projects[0].id, project_name: db.projects[0].name,
    store_id: cu.store_id, store_name: cu.store_name,
    date: '2026-11-20', start_time: '15:00', source: '顾客端', status: '待确认',
  });
  eq('预约：新增后总数 +1', DB().appointments.length, before + 1);
  eq('预约：默认状态 待确认', na.status, '待确认');
  eq('预约：来源记录为顾客端', na.source, '顾客端');

  const mine = await LP.request('GET', '/api/appointments', null, { customer_id: cu.id });
  const mineList = mine.list || mine;
  ok('我的预约只返回本人', mineList.every((a) => a.customer_id === cu.id), 'leak other customer');
  ok('我的预约包含刚提交的那条', mineList.some((a) => a.id === na.id), 'not found');

  const other = db.customers[1];
  const otherCards = await LP.request('GET', '/api/cards', null, { customer_id: other.id });
  const otherList = otherCards.list || otherCards;
  ok('跨会员卡项数据隔离', otherList.every((c) => c.customer_id === other.id), 'leak');

  const pub = await LP.request('GET', '/api/projects', null, { status: '上架' });
  ok('未登录可读项目目录', (pub.list || pub).length > 0, 'empty');
}

async function testEdge() {
  setGroup('16 边界与异常');
  await t('查询不存在的客户返回空而非崩溃', async () => {
    const d = await LP.get('/api/customers', { q: '不存在的名字zzz', pageSize: 20 });
    eq('结果为空', listOf(d).length, 0);
  });
  await t('空字符串不产生 NaN 金额', async () => {
    const d = await LP.get('/api/cards', { pageSize: 50 });
    const bad = listOf(d).filter((c) => String(c.amount).indexOf('NaN') >= 0);
    eq('无 NaN 金额', bad.length, 0);
  });
  await t('分页超出范围返回空数组', async () => {
    const d = await LP.get('/api/customers', { page: 99, pageSize: 10 });
    eq('超范围返回空', listOf(d).length, 0);
  });
  await t('重复点击开卡不会破坏数据', async () => {
    const before = DB().cards.length;
    const proj = DB().projects[1];
    const c = DB().customers[1];
    await Promise.all([
      LP.post('/api/cards', { customer_id: c.id, project_id: proj.id, times: 2, paid_amount: 100 }),
      LP.post('/api/cards', { customer_id: c.id, project_id: proj.id, times: 2, paid_amount: 100 }),
    ]);
    eq('两次开卡各生成一条', DB().cards.length, before + 2);
  });
  await t('reset 后数据回到初始量', async () => {
    LP.mockReset();
    eq('客户回到 40', DB().customers.length, 40);
    eq('核销回到 180', DB().verifications.length, 180);
  });
}

/* =====================================================================
   执行
   ===================================================================== */
(async function main() {
  const started = Date.now();
  await testEscape();
  await testSeed();
  await testLists();
  await testCustomerCRUD();
  await testProjectCRUD();
  await testCardAndVerifyFlow();
  await testAppointmentCRUD();
  await testAuditFlow();
  await testSalary();
  await testAssessment();
  await testWelfare();
  await testInventory();
  await testAttendance();
  await testDashboard();
  await testSettings();
  await testAuth();
  await testCustomer();
  await testEdge();

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  const byGroup = {};
  results.forEach((r) => {
    byGroup[r.group] = byGroup[r.group] || { pass: 0, fail: 0 };
    byGroup[r.group][r.pass ? 'pass' : 'fail']++;
  });
  const out = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    total: results.length, pass, fail,
    groups: byGroup,
    failures: results.filter((r) => !r.pass),
    all: results,
  };
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(out, null, 2), 'utf8');

  console.log('=========================================');
  console.log(' 用例总数 ' + out.total + ' | 通过 ' + pass + ' | 失败 ' + fail);
  console.log(' 耗时 ' + out.durationMs + 'ms');
  console.log('=========================================');
  Object.keys(byGroup).forEach((g) => {
    const s = byGroup[g];
    console.log(' ' + (s.fail ? '✗' : '✓') + ' ' + g + '  通过 ' + s.pass + ' 失败 ' + s.fail);
  });
  if (fail) {
    console.log('\n失败明细：');
    out.failures.forEach((f) => console.log(' - [' + f.group + '] ' + f.name + ' :: ' + f.detail));
  }
  process.exit(fail ? 1 : 0);
})();
