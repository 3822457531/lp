/* 兰瓶美业 · 数据层（localStorage 持久化 + 种子数据）
 * 用法：页面先引 lp-store.js，再引 lp-ui.js，然后直接用 LP.db / LP.api
 */
(function (global) {
  "use strict";

  var KEY = "lanping.db.v1";
  var S = global.LP = global.LP || {};

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function daysAgo(n){ var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function uid(prefix){ return prefix + "_" + Math.random().toString(36).slice(2, 8); }

  /* ---------------- 种子数据 ---------------- */
  function seed() {
    var stores = [
      { id: "st1", name: "兰瓶总店", manager: "张美丽", phone: "13800001111", opened: "2019-03-01", status: "营业中" },
      { id: "st2", name: "万象城店", manager: "李悦", phone: "13800002222", opened: "2021-06-18", status: "营业中" },
      { id: "st3", name: "天河店", manager: "王芳", phone: "13800003333", opened: "2023-09-09", status: "营业中" }
    ];

    var staff = [
      { id: "sf1", name: "张美丽", role: "店长", storeId: "st1", phone: "13800001111", status: "在职", joined: "2019-03-01", base: 5200 },
      { id: "sf2", name: "李悦", role: "店长", storeId: "st2", phone: "13800002222", status: "在职", joined: "2021-06-18", base: 4800 },
      { id: "sf3", name: "王芳", role: "店长", storeId: "st3", phone: "13800003333", status: "在职", joined: "2023-09-09", base: 4600 },
      { id: "sf4", name: "陈静", role: "员工", storeId: "st1", phone: "13800004444", status: "在职", joined: "2022-02-14", base: 3600 },
      { id: "sf5", name: "赵敏", role: "员工", storeId: "st1", phone: "13800005555", status: "在职", joined: "2023-05-06", base: 3400 },
      { id: "sf6", name: "周雪", role: "员工", storeId: "st2", phone: "13800006666", status: "在职", joined: "2023-11-20", base: 3400 },
      { id: "sf7", name: "孙萌萌", role: "员工", storeId: "st3", phone: "13800007777", status: "试用", joined: "2025-03-02", base: 3200 },
      { id: "sf8", name: "刘思琪", role: "员工", storeId: "st2", phone: "13800008888", status: "在职", joined: "2024-08-15", base: 3400 }
    ];

    var projects = [
      { id: "pj1", name: "深层毛孔清洁", price: 398, times: 10, duration: 60, type: "清洁", img: "../assets/images/project-clean.jpg", status: "上架" },
      { id: "pj2", name: "水光补水", price: 468, times: 10, duration: 75, type: "补水", img: "../assets/images/project-hydrate.jpg", status: "上架" },
      { id: "pj3", name: "小气泡净肤", price: 268, times: 6, duration: 45, type: "清洁", img: "../assets/images/project-bubble.jpg", status: "上架" },
      { id: "pj4", name: "黑头管理", price: 218, times: 6, duration: 40, type: "清洁", img: "../assets/images/project-blackhead.jpg", status: "上架" },
      { id: "pj5", name: "祛痘修护", price: 528, times: 8, duration: 60, type: "控油", img: "../assets/images/project-acne.jpg", status: "上架" },
      { id: "pj6", name: "美白焕肤", price: 698, times: 10, duration: 80, type: "美白", img: "../assets/images/project-whiten.jpg", status: "上架" },
      { id: "pj7", name: "抗初老紧致", price: 888, times: 12, duration: 90, type: "抗老", img: "../assets/images/project-antiaging.jpg", status: "上架" },
      { id: "pj8", name: "舒敏修护", price: 358, times: 8, duration: 50, type: "修护", img: "../assets/images/project-hydrate.jpg", status: "下架" }
    ];

    var names = ["王小美", "李婷婷", "陈静", "周雪", "赵梦琪", "孙悦", "钱多多", "林小婉", "吴倩", "郑雅", "冯宝宝", "许曼"];
    var levels = ["钻石会员", "金卡会员", "银卡会员"];
    var customers = names.map(function (n, i) {
      var st = stores[i % 3];
      return {
        id: "cu" + (i + 1),
        code: "LP" + (202500000000 + (i + 1) * 137),
        name: n,
        phone: "13" + (700000000 + i * 1234567).toString().slice(0, 9),
        level: levels[i % 3],
        storeId: st.id,
        remain: [8, 5, 2, 12, 6, 3, 9, 4, 7, 1, 10, 5][i],
        spent: [12680, 6420, 2180, 18960, 8600, 3200, 15200, 5900, 7600, 1200, 21400, 6800][i],
        birthday: ["04-28", "04-29", "05-01", "07-12", "03-15", "09-08", "11-23", "02-06", "12-31", "06-19", "08-08", "10-10"][i],
        lastVisit: daysAgo([1, 6, 39, 2, 12, 55, 3, 9, 21, 70, 1, 15][i]),
        status: i === 2 || i === 9 ? "休眠" : "正常",
        avatar: ["avatar-customer.jpg", "avatar-customer2.jpg", "avatar-customer3.jpg"][i % 3]
      };
    });

    var cards = [];
    customers.forEach(function (c, i) {
      var p = projects[i % 7];
      var total = p.times;
      var used = Math.min(total, [2, 3, 1, 5, 2, 0, 4, 1, 3, 2, 5, 2][i]);
      cards.push({
        id: "cd" + (i + 1), customerId: c.id, projectId: p.id, storeId: c.storeId,
        total: total, used: used, amount: p.price * total, staffId: staff[i % 8].id,
        payMethod: i % 2 ? "微信" : "刷卡",
        createdAt: daysAgo(30 + i * 4), status: used >= total ? "已完成" : "使用中"
      });
    });

    var verifies = [];
    cards.forEach(function (c, i) {
      for (var k = 0; k < Math.min(c.used, 3); k++) {
        verifies.push({
          id: uid("vf"), cardId: c.id, customerId: c.customerId, projectId: c.projectId,
          storeId: c.storeId, staffId: c.staffId, price: Math.round(c.amount / c.total),
          at: daysAgo(i + k * 3), status: "已完成", note: ""
        });
      }
    });

    var appointments = [];
    for (var a = 0; a < 9; a++) {
      var cu = customers[a];
      var pj = projects[a % 7];
      appointments.push({
        id: uid("ap"), customerId: cu.id, projectId: pj.id, storeId: cu.storeId,
        staffId: staff[((a + 1) % 6) + 1].id, date: daysAgo(-(a % 5)),
        time: ["10:00", "11:30", "14:00", "15:30", "17:00"][a % 5],
        status: ["已确认", "待确认", "已完成", "已取消"][a % 4], note: ""
      });
    }

    var inventory = [
      { id: uid("iv"), name: "玻尿酸补水面膜", sku: "M-001", storeId: "st1", qty: 120, unit: "片", direction: "入库", channel: "系统分发", at: daysAgo(3), operator: "张美丽" },
      { id: uid("iv"), name: "玻尿酸补水面膜", sku: "M-001", storeId: "st1", qty: 18, unit: "片", direction: "出库", channel: "门店调度", at: daysAgo(2), operator: "陈静" },
      { id: uid("iv"), name: "水杨酸精华", sku: "S-014", storeId: "st2", qty: 60, unit: "瓶", direction: "入库", channel: "门店调度", at: daysAgo(5), operator: "李悦" },
      { id: uid("iv"), name: "水杨酸精华", sku: "S-014", storeId: "st2", qty: 12, unit: "瓶", direction: "出库", channel: "系统分发", at: daysAgo(1), operator: "周雪" },
      { id: uid("iv"), name: "舒缓修护乳", sku: "C-007", storeId: "st3", qty: 40, unit: "瓶", direction: "入库", channel: "系统分发", at: daysAgo(7), operator: "王芳" }
    ];

    var assessments = [];
    staff.forEach(function (s, i) {
      var target = s.role === "店长" ? 20000 : 8000;
      var done = Math.round(target * [1.15, 0.98, 1.05, 0.82, 1.22, 1.31, 0.64, 1.08][i]);
      assessments.push({
        id: uid("as"), staffId: s.id, storeId: s.storeId, month: today().slice(0, 7),
        metric: "月度业绩（元）", target: target, done: done, pass: done >= target
      });
    });

    var audit = [
      { id: uid("au"), name: "何佳", phone: "13800009901", storeId: "st2", role: "员工", applyAt: daysAgo(1), status: "待审核" },
      { id: uid("au"), name: "邓超群", phone: "13800009902", storeId: "st1", role: "员工", applyAt: daysAgo(2), status: "待审核" },
      { id: uid("au"), name: "苏晴", phone: "13800009903", storeId: "st3", role: "店长", applyAt: daysAgo(4), status: "待审核" },
      { id: uid("au"), name: "方琳", phone: "13800009904", storeId: "st1", role: "员工", applyAt: daysAgo(9), status: "已通过" }
    ];

    var welfare = [
      { id: uid("wf"), name: "新客首单立减", type: "优惠券", value: 100, qty: 500, used: 213, validDays: 30, status: "进行中" },
      { id: uid("wf"), name: "生日礼券", type: "抵扣卡", value: 200, qty: 1000, used: 87, validDays: 15, status: "进行中" },
      { id: uid("wf"), name: "老客回购 8 折", type: "折扣卡", value: 8, qty: 300, used: 156, validDays: 60, status: "已结束" }
    ];

    var sms = [
      { id: uid("sm"), phone: "138****8888", type: "核销码", content: "您的深层毛孔清洁核销链接：https://lanping.vip/hv/a8f3k2m9", at: daysAgo(1), status: "发送成功" },
      { id: uid("sm"), phone: "139****6621", type: "生日提醒", content: "王女士，生日快乐！本月到店可领取生日礼券一张。", at: daysAgo(2), status: "发送成功" },
      { id: uid("sm"), phone: "136****1099", type: "核销完成", content: "您的 小气泡净肤 已核销 1 次，剩余 4 次。", at: daysAgo(3), status: "发送成功" }
    ];

    var settings = {
      birthdayEnabled: true, birthdayDays: 7,
      smsEnabled: true, smsProvider: "阿里云", smsKey: "LTAI5tQe...9xZ",
      smsTemplateVerify: "您的{项目}核销链接：{链接}",
      smsTemplateBirthday: "{姓名}，生日快乐！",
      clockMode: "两段卡", clockInStart: "08:30", clockInEnd: "09:30",
      clockOutStart: "17:30", clockOutEnd: "21:00",
      clockMethod: "WiFi + 人脸", wifi: "LanPing-Office", radius: 200
    };

    var salaryRules = { baseRatio: 1, commission: 0.02, passBonus: 500, absenteeDeduct: 150 };

    return {
      version: 1, stores: stores, staff: staff, customers: customers, projects: projects,
      cards: cards, verifies: verifies, appointments: appointments, inventory: inventory,
      assessments: assessments, audit: audit, welfare: welfare, sms: sms,
      settings: settings, salaryRules: salaryRules
    };
  }

  /* ---------------- 持久化 ---------------- */
  function read() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.version === 1) return d;
      }
    } catch (e) { /* 隐私模式等场景降级为内存 */ }
    var fresh = seed();
    write(fresh);
    return fresh;
  }

  function write(db) {
    try { global.localStorage && global.localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    return db;
  }

  S.db = read();

  var listeners = [];
  function emit(table, action, rec) {
    listeners.forEach(function (fn) { try { fn(table, action, rec); } catch (e) {} });
  }

  S.on = function (fn) { listeners.push(fn); };
  S.save = function () { write(S.db); };
  S.reset = function () { S.db = write(seed()); emit("*", "reset"); return S.db; };

  /* ---------------- 通用 CRUD ---------------- */
  S.all = function (table) { return S.db[table] || []; };

  S.find = function (table, id) {
    return S.all(table).filter(function (r) { return r.id === id; })[0] || null;
  };

  S.query = function (table, fn) {
    var rows = S.all(table);
    return fn ? rows.filter(fn) : rows.slice();
  };

  S.insert = function (table, rec) {
    if (!rec.id) rec.id = uid(table.slice(0, 2));
    S.db[table] = S.all(table).concat([rec]);
    S.save(); emit(table, "insert", rec);
    return rec;
  };

  S.update = function (table, id, patch) {
    var hit = null;
    S.db[table] = S.all(table).map(function (r) {
      if (r.id !== id) return r;
      hit = Object.assign({}, r, patch);
      return hit;
    });
    S.save(); emit(table, "update", hit);
    return hit;
  };

  S.remove = function (table, id) {
    S.db[table] = S.all(table).filter(function (r) { return r.id !== id; });
    S.save(); emit(table, "remove", { id: id });
  };

  /* ---------------- 业务查询 ---------------- */
  S.storeName = function (id) { var s = S.find("stores", id); return s ? s.name : "-"; };
  S.staffName = function (id) { var s = S.find("staff", id); return s ? s.name : "-"; };
  S.projectName = function (id) { var p = S.find("projects", id); return p ? p.name : "-"; };
  S.customerName = function (id) { var c = S.find("customers", id); return c ? c.name : "-"; };

  S.stats = function () {
    var cards = S.all("cards");
    var verifies = S.all("verifies");
    return {
      revenue: cards.reduce(function (a, c) { return a + (c.amount || 0); }, 0),
      cardAmount: cards.reduce(function (a, c) { return a + (c.amount || 0); }, 0),
      verifyCount: verifies.length,
      newCustomers: S.all("customers").filter(function (c) { return c.status === "正常"; }).length,
      customers: S.all("customers").length,
      staff: S.all("staff").length,
      pendingAudit: S.all("audit").filter(function (a) { return a.status === "待审核"; }).length
    };
  };

  /* 核销：扣次 + 写核销记录 */
  S.consume = function (cardId, staffId, note) {
    var card = S.find("cards", cardId);
    if (!card) return { ok: false, msg: "卡项不存在" };
    if (card.used >= card.total) return { ok: false, msg: "该卡项次数已用完" };
    var used = card.used + 1;
    S.update("cards", cardId, { used: used, status: used >= card.total ? "已完成" : "使用中" });
    var rec = S.insert("verifies", {
      cardId: cardId, customerId: card.customerId, projectId: card.projectId,
      storeId: card.storeId, staffId: staffId || card.staffId,
      price: Math.round(card.amount / card.total), at: today(), status: "已完成",
      note: note || ""
    });
    return { ok: true, rec: rec, remain: card.total - used };
  };

  /* 薪资：底薪 + 提成 + 考核奖 - 缺勤 */
  S.salaryOf = function (staffId, month) {
    var s = S.find("staff", staffId);
    if (!s) return null;
    var rule = S.db.salaryRules;
    var perf = S.all("verifies").filter(function (v) {
      return v.staffId === staffId && (!month || (v.at || "").slice(0, 7) === month);
    }).reduce(function (a, v) { return a + (v.price || 0); }, 0);
    var asm = S.all("assessments").filter(function (a) {
      return a.staffId === staffId && (!month || a.month === month);
    })[0];
    var commission = Math.round(perf * rule.commission);
    var bonus = asm && asm.pass ? rule.passBonus : 0;
    var absent = 0;
    return {
      staffId: staffId, name: s.name, role: s.role, month: month || today().slice(0, 7),
      base: s.base, performance: perf, commission: commission, bonus: bonus,
      deduct: absent, total: s.base + commission + bonus - absent
    };
  };

  S.money = function (n) { return "¥" + (n || 0).toLocaleString("zh-CN"); };
  S.maskPhone = function (p) { return p ? p.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "-"; };
  S.today = today;
})(typeof window !== "undefined" ? window : globalThis);
