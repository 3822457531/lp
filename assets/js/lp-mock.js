/* 兰瓶美业 · 本地 Mock 数据层（可点原型用，零后端）
 * 用法：在 lp-api.js 之后引入。会接管 LP.request / 会话，全部数据存 localStorage。
 * 清库：localStorage.removeItem('lp.mock.v1') 或地址后加 ?mock=reset
 */
(function (global) {
  "use strict";
  var LP = global.LP;
  if (!LP) { console.warn("lp-mock.js 需要先引入 lp-api.js"); return; }

  var KEY = "lp.mock.v1";
  var PAGE_SIZE = 10;

  /* ------------------------------ 工具 ------------------------------ */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function d2(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d2(d); }
  function daysLater(n) { var d = new Date(); d.setDate(d.getDate() + n); return d2(d); }
  function pick(a, i) { return a[i % a.length]; }
  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  /* ------------------------------ 种子数据 ------------------------------ */
  var STORES = [
    { id: "st1", name: "兰瓶总店", address: "怀化市鹤城区人民路 88 号", phone: "0745-2288001", manager: "张美丽", staff_count: 4, status: "营业中" },
    { id: "st2", name: "万象城店", address: "怀化市鹤城区万象城 3F", phone: "0745-2288002", manager: "李静", staff_count: 3, status: "营业中" },
    { id: "st3", name: "天河店", address: "怀化市鹤城区天河北路 12 号", phone: "0745-2288003", manager: "王芳", staff_count: 2, status: "营业中" }
  ];

  var STAFF = [
    { id: "u1", name: "张美丽", phone: "13800000001", role: "admin", role_name: "超级管理员", store_id: "st1", store_name: "兰瓶总店", position: "总经理", hire_date: "2021-03-01", status: "active", level: "P7", work_start: "09:00", work_end: "18:00", base_salary: 5200, avatar: "" },
    { id: "u2", name: "李静", phone: "13800000002", role: "manager", role_name: "店长", store_id: "st2", store_name: "万象城店", position: "店长", hire_date: "2022-05-12", status: "active", level: "P5", work_start: "09:00", work_end: "18:00", base_salary: 4600, avatar: "" },
    { id: "u3", name: "王芳", phone: "13800000003", role: "manager", role_name: "店长", store_id: "st3", store_name: "天河店", position: "店长", hire_date: "2022-08-20", status: "active", level: "P5", work_start: "10:00", work_end: "19:00", base_salary: 4500, avatar: "" },
    { id: "u4", name: "陈晓", phone: "13800000004", role: "staff", role_name: "美业员工", store_id: "st1", store_name: "兰瓶总店", position: "高级美容师", hire_date: "2023-02-06", status: "active", level: "P3", work_start: "10:00", work_end: "19:00", base_salary: 3800, avatar: "" },
    { id: "u5", name: "刘婷", phone: "13800000005", role: "staff", role_name: "美业员工", store_id: "st1", store_name: "兰瓶总店", position: "美容师", hire_date: "2023-06-15", status: "active", level: "P2", work_start: "10:00", work_end: "19:00", base_salary: 3400, avatar: "" },
    { id: "u6", name: "赵敏", phone: "13800000006", role: "staff", role_name: "美业员工", store_id: "st2", store_name: "万象城店", position: "美容师", hire_date: "2024-01-08", status: "active", level: "P2", work_start: "10:00", work_end: "19:00", base_salary: 3400, avatar: "" },
    { id: "u7", name: "周雨", phone: "13800000007", role: "staff", role_name: "美业员工", store_id: "st2", store_name: "万象城店", position: "皮肤管理师", hire_date: "2024-03-18", status: "active", level: "P3", work_start: "10:00", work_end: "19:00", base_salary: 3600, avatar: "" },
    { id: "u8", name: "孙悦", phone: "13800000008", role: "staff", role_name: "美业员工", store_id: "st3", store_name: "天河店", position: "美容师", hire_date: "2024-09-02", status: "disabled", level: "P1", work_start: "10:00", work_end: "19:00", base_salary: 3200, avatar: "" }
  ];

  var PROJECTS = [
    { id: "pj1", name: "小气泡深层清洁", category: "面部清洁", price: 398, member_price: 358, total_times: 10, valid_days: 365, commission_rate: 0.02, duration: 60, status: "上架" },
    { id: "pj2", name: "水光补水护理", category: "面部护理", price: 698, member_price: 628, total_times: 10, valid_days: 365, commission_rate: 0.02, duration: 75, status: "上架" },
    { id: "pj3", name: "光子嫩肤", category: "光电项目", price: 1980, member_price: 1780, total_times: 5, valid_days: 365, commission_rate: 0.03, duration: 45, status: "上架" },
    { id: "pj4", name: "肩颈舒缓", category: "身体护理", price: 298, member_price: 268, total_times: 10, valid_days: 365, commission_rate: 0.02, duration: 45, status: "上架" },
    { id: "pj5", name: "背部精油SPA", category: "身体护理", price: 458, member_price: 418, total_times: 8, valid_days: 365, commission_rate: 0.02, duration: 60, status: "上架" },
    { id: "pj6", name: "热玛吉紧致", category: "光电项目", price: 6800, member_price: 6200, total_times: 3, valid_days: 540, commission_rate: 0.04, duration: 90, status: "上架" },
    { id: "pj7", name: "脱毛（腋下）", category: "光电项目", price: 1280, member_price: 1180, total_times: 6, valid_days: 365, commission_rate: 0.03, duration: 30, status: "上架" },
    { id: "pj8", name: "头皮养护", category: "头皮管理", price: 588, member_price: 528, total_times: 10, valid_days: 365, commission_rate: 0.02, duration: 50, status: "下架" }
  ];

  var SURNAMES = "王李张刘陈杨黄周吴徐孙马朱胡林何郭罗高赵".split("");
  var GIVEN = ["小美", "婉婷", "丽娟", "静怡", "慧敏", "雅琴", "思颖", "梦琪", "雨欣", "佳怡", "文静", "晓芸", "诗涵", "若彤", "紫萱", "嘉怡"];
  var LEVELS = ["钻石会员", "金卡会员", "银卡会员"];

  function seed() {
    var db = {
      stores: STORES,
      users: STAFF,
      projects: PROJECTS,
      customers: [],
      cards: [],
      verifications: [],
      appointments: [],
      audits: [],
      assessments: [],
      inventory_items: [],
      inventory_orders: [],
      salary_rules: { base_ratio: 1, commission_rate: 0.02, pass_bonus: 500, absent_deduct: 150, full_attendance_bonus: 200, late_deduct: 50, late_days: 0 },
      salary_records: [],
      welfare: [],
      welfare_issued: [],
      sms_logs: [],
      attendance: [],
      messages: [],
      settings: {
        birthday_remind: true, birthday_days: 7, sms_enabled: true, sms_provider: "阿里云",
        sms_sign: "兰瓶美业", sms_template_birthday: "SMS_100001", sms_template_verify: "SMS_100002",
        clockin_wifi: "LanPing-Office", clockin_range: 200, clockin_face: true
      }
    };

    /* 客户 40 */
    for (var i = 0; i < 40; i++) {
      var st = pick(STORES, i);
      db.customers.push({
        id: "cu" + (i + 1),
        code: "LP2025" + String(100000 + i * 137).slice(0, 6),
        name: pick(SURNAMES, i) + pick(GIVEN, i * 3 + 1),
        phone: "137" + String(10000000 + i * 8123).slice(0, 8),
        gender: i % 4 === 0 ? "男" : "女",
        level: pick(LEVELS, i),
        store_id: st.id, store_name: st.name,
        remain: 2 + (i * 3) % 11,
        spent: [12680, 6420, 2180, 18960, 8600, 3200, 15200, 4680][i % 8],
        birthday: i < 6
          ? (function () { var d = new Date(); d.setDate(d.getDate() + i + 1); return pad(d.getMonth() + 1) + "-" + pad(d.getDate()); })()
          : pad((i % 12) + 1) + "-" + pad(((i * 7) % 27) + 1),
        last_visit: daysAgo(i % 40),
        visit_count: 3 + (i % 17),
        status: i % 9 === 0 ? "sleep" : "active",
        avatar: ""
      });
    }

    /* 卡项 30 */
    for (var j = 0; j < 30; j++) {
      var cu = db.customers[j % 40];
      var pj = db.projects[j % 8];
      var used = j % 4;
      db.cards.push({
        id: "cd" + (j + 1),
        card_no: "CD" + String(250000 + j * 11),
        customer_id: cu.id, customer_name: cu.name, customer_phone: cu.phone,
        project_id: pj.id, project_name: pj.name,
        store_id: cu.store_id, store_name: cu.store_name,
        total_times: pj.total_times, used_times: used,
        amount: pj.price * pj.total_times,
        start_date: daysAgo(j % 28),
        expire_at: daysLater(337 + (j % 28)),
        valid_days: pj.valid_days,
        status: "生效中"
      });
    }

    /* 核销记录 180（近 90 天） */
    for (var k = 0; k < 180; k++) {
      var card = db.cards[k % 30];
      var staff = pick(STAFF, k + 3);
      db.verifications.push({
        id: "vf" + (k + 1),
        verify_no: "VF" + String(300000 + k * 7),
        card_id: card.id, card_no: card.card_no,
        customer_id: card.customer_id, customer_name: card.customer_name,
        customer_phone: card.customer_phone,
        project_id: card.project_id, project_name: card.project_name,
        store_id: card.store_id, store_name: card.store_name,
        staff_id: staff.id, staff_name: staff.name,
        times: 1,
        total_times: 1,
        amount: Math.round(card.amount / card.total_times),
        verify_amount: Math.round(card.amount / card.total_times),
        total_amount: Math.round(card.amount / card.total_times),
        items: [{ name: card.project_name, times: 1, price: Math.round(card.amount / card.total_times) }],
        at: daysAgo(k % 30) + " " + pad(9 + (k % 10)) + ":" + pad((k * 7) % 60),
        created_at: daysAgo(k % 30) + " " + pad(9 + (k % 10)) + ":" + pad((k * 7) % 60) + ":00",
        used_at: daysAgo(k % 30),
        status: k < 6 ? "待核销" : (k % 41 === 0 ? "已退次" : "已完成"),
        channel: pick(["扫码核销", "员工代核销"], k),
        note: ""
      });
    }

    /* 预约 24 */
    for (var m = 0; m < 24; m++) {
      var cu2 = db.customers[(m * 3) % 40];
      var st2 = pick(STORES, m);
      db.appointments.push({
        id: "ap" + (m + 1),
        customer_id: cu2.id, customer_name: cu2.name, customer_phone: cu2.phone,
        store_id: st2.id, store_name: st2.name,
        staff_id: pick(STAFF, m + 3).id, staff_name: pick(STAFF, m + 3).name,
        project_id: pick(PROJECTS, m).id, project_name: pick(PROJECTS, m).name,
        date: m % 2 ? daysLater(m % 9) : daysAgo(m % 6),
        start_time: pad(10 + (m % 8)) + ":00",
        duration: 60,
        status: m % 5 === 0 ? "待确认" : (m % 2 ? "已预约" : "已完成"),
        source: pick(["小程序", "电话", "到店"], m),
        note: m % 7 === 0 ? "客户要求女技师" : ""
      });
    }

    /* 待审核 5 */
    var AUDIT_KINDS = [
      { type: "补次", desc: "客户反馈上次项目未做完，申请补 1 次" },
      { type: "退次", desc: "客户搬家，申请退剩余 2 次" },
      { type: "改约", desc: "临时出差，申请改到下周三" },
      { type: "开卡", desc: "团购渠道特殊折扣，需审批" },
      { type: "请假", desc: "家中有事，申请调休 1 天" }
    ];
    for (var a = 0; a < 5; a++) {
      var ka = AUDIT_KINDS[a];
      var ap = db.appointments[a];
      db.audits.push({
        id: "ad" + (a + 1),
        apply_type: ka.type, type: ka.type,
        description: ka.desc, detail: ka.desc,
        apply_role: a % 2 ? "staff" : "manager",
        created_by_name: pick(STAFF, a + 2).name,
        store_id: pick(STORES, a).id, store_name: pick(STORES, a).name,
        customer_name: ap.customer_name,
        amount: a === 3 ? 3980 : 0,
        status: "待审核",
        created_at: daysAgo(a) + " 10:0" + a
      });
    }

    /* 考核 8 */
    db.users.forEach(function (u, idx) {
      var target = 20000 + idx * 1000;
      var actual = target * (0.6 + (idx % 5) * 0.15);
      db.assessments.push({
        id: "as" + (idx + 1),
        name: u.name + " · " + new Date().toISOString().slice(0, 7) + " 月度考核",
        item_name: u.name + " · 月度考核",
        type: idx % 4 === 0 ? "季度考核" : "月度作业",
        weight: 100, unit: "元",
        staff_id: u.id, staff_name: u.name, user_name: u.name, user_id: u.id, store_id: u.store_id, store_name: u.store_name,
        month: new Date().toISOString().slice(0, 7),
        target: target, actual: Math.round(actual),
        percent: Math.round((actual / target) * 1000) / 10,
        qualified: actual >= target * 0.8,
        metric: "业绩额", metric_label: "月业绩",
        reward: actual >= target * 0.8 ? 500 : 0,
        status: actual >= target * 0.8 ? "合格" : "不合格",
        items: [
          { name: "月业绩额", target: target, actual: Math.round(actual), weight: 60, score: Math.min(100, Math.round(actual / target * 100)), metric_label: "业绩额" },
          { name: "核销笔数", target: 60, actual: 40 + (idx % 6) * 5, weight: 25, score: Math.round((40 + (idx % 6) * 5) / 60 * 100), metric_label: "笔数" },
          { name: "客户满意度", target: 100, actual: 88 + (idx % 8), weight: 15, score: 88 + (idx % 8), metric_label: "评分" }
        ],
        score: Math.round(Math.min(100, actual / target * 100) * 0.6 + 80 * 0.4)
      });
    });

    /* 库存 6 项 + 单据 8 */
    ["医用修复面膜", "玻尿酸原液", "一次性洁面巾", "光子凝胶", "精油（薰衣草）", "消毒酒精 75%"].forEach(function (nm, idx) {
      db.inventory_items.push({
        id: "it" + (idx + 1), item_name: nm, name: nm,
        spec: ["盒/10片", "30ml/支", "100抽/包", "250ml/瓶", "100ml/瓶", "500ml/瓶"][idx],
        unit: "件", qty: 20 + idx * 13, used_qty: 5 + idx * 4,
        store_id: pick(STORES, idx).id, store_name: pick(STORES, idx).name,
        min_amount: 10, status: idx === 2 ? "库存偏低" : "正常"
      });
    });
    for (var o = 0; o < 8; o++) {
      db.inventory_orders.push({
        id: "io" + (o + 1), order_no: "IO" + String(900000 + o * 3),
        type: o % 2 ? "系统分发" : "门店调度",
        from_store_id: pick(STORES, o).id, from_name: pick(STORES, o).name,
        to_store_id: pick(STORES, o + 1).id, to_name: pick(STORES, o + 1).name,
        item_name: pick(db.inventory_items, o).item_name,
        qty: 2 + o, unit: "件",
        status: o % 4 === 0 ? "待确认" : "已完成",
        created_at: daysAgo(o) + " 14:20",
        operator_name: pick(STAFF, o).name
      });
    }

    /* 薪资规则已给，记录 3 个月 × 8 人 */
    var nowM = new Date();
    for (var mo = 0; mo < 3; mo++) {
      var dt = new Date(nowM.getFullYear(), nowM.getMonth() - mo, 1);
      var month = dt.getFullYear() + "-" + pad(dt.getMonth() + 1);
      STAFF.forEach(function (u, idx) {
        var perf = 6000 + idx * 1800;                 // 本月业绩
        var perfComm = Math.round(perf * 0.05);       // 业绩提成 5%
        var cardAmount = 12000 + idx * 800;           // 本月开卡
        var cardComm = Math.round(cardAmount * 0.02); // 开卡提成 2%
        var fullBonus = idx % 4 === 0 ? 0 : 500;      // 全勤奖 500
        var absent = idx % 5 === 0 ? 1 : 0;
        var deduct = absent * 150;                    // 缺勤扣 150/天
        var total = u.base_salary + perfComm + cardComm + fullBonus - deduct;
        db.salary_records.push({
          id: "sr" + month + idx, month: month,
          staff_id: u.id, staff_name: u.name, staff_rank: u.position,
          user_name: u.name,
          store_id: u.store_id, store_name: u.store_name,
          base_salary: u.base_salary, base: u.base_salary,
          perf_amount: perf, month_perf: perf,
          perf_commission: perfComm, perf_commission_rate: 0.05,
          card_amount: cardAmount, card_commission: cardComm, commission_rate: 0.02,
          attendance_days: 20 + (idx % 8),
          verify_amount: perf, verify_count: 30 + idx * 3,
          full_attendance_bonus: fullBonus, bonus: 0,
          absent_days: absent, absent_deduct: deduct,
          late_days: 0, late_deduct: 0,
          deduction: deduct,
          net_pay: total, salary: total, total: total,
          status: mo === 0 ? "待发放" : "已发放",
          computed: true
        });
      });
    }

    /* 福利 3 + 发放记录 */
    [
      { id: "wf1", name: "生日礼金", type: "现金", amount: 200, min_amount: 0, welfare_discount: 0, description: "生日当月发放", status: "启用" },
      { id: "wf2", name: "全勤奖", type: "现金", amount: 200, min_amount: 0, welfare_discount: 0, description: "无迟到缺勤", status: "启用" },
      { id: "wf3", name: "员工亲友折扣", type: "折扣", amount: 0, min_amount: 0, welfare_discount: 0.8, description: "自家项目 8 折", status: "启用" }
    ].forEach(function (w) {
      db.welfare.push(w);
      db.welfare_issued.push({ id: "wi" + w.id, welfare_id: w.id, welfare_name: w.name, staff_name: pick(STAFF, 3).name, issued_at: daysAgo(10), issued_real: w.amount || 0, amount: w.amount || 0, status: "已发放" });
    });

    /* 消息中心 8 */
    var MSG_TPL = [
      { type: "系统", title: "系统升级通知", content: "核销链接有效期已调整为 5 分钟，请提醒客户及时打开。" },
      { type: "预约", title: "新预约待确认", content: "客户王婉婷预约了 11:00 的小气泡深层清洁，请及时确认。" },
      { type: "审核", title: "有待审批申请", content: "陈晓提交了一条退次申请，请到审核管理处理。" },
      { type: "库存", title: "库存预警", content: "一次性洁面巾低于安全库存，建议尽快补货。" },
      { type: "生日", title: "今日生日客户", content: "有 2 位会员今天生日，记得发送祝福。" },
      { type: "绩效", title: "本月业绩提醒", content: "距本月结束还有 5 天，当前完成度 78%。" },
      { type: "系统", title: "打卡提醒", content: "今日尚未打卡，上班时间 09:30。" },
      { type: "活动", title: "冬季活动上线", content: "水光补水护理买 10 送 2，可在项目管理查看。" }
    ];
    MSG_TPL.forEach(function (m, i) {
      db.messages.push({
        id: "msg" + (i + 1), type: m.type, title: m.title, content: m.content,
        read: i > 4, created_at: daysAgo(i) + " 09:" + pad(10 + i),
        user_id: STAFF[0].id
      });
    });

    /* 短信 12 */
    for (var s = 0; s < 12; s++) {
      db.sms_logs.push({
        id: "sms" + (s + 1), phone: db.customers[s].phone, customer_name: db.customers[s].name,
        channel: pick(["生日提醒", "核销链接", "活动通知"], s),
        content: pick(["【兰瓶美业】亲爱的会员，生日快乐，本月到店可领生日礼。", "【兰瓶美业】您的项目核销链接已生成，点击查看。", "【兰瓶美业】冬季补水套餐上新，会员 8 折。"], s),
        status: "已发送", created_at: daysAgo(s) + " 11:05"
      });
    }

    /* 打卡：近 12 天，全员（含当前登录人） */
    for (var dIdx = 0; dIdx < 12; dIdx++) {
      STAFF.forEach(function (u, idx) {
        if (u.status === "disabled") return;
        if ((dIdx + idx) % 7 === 3) return; /* 制造少量缺勤 */
        db.attendance.push({
          id: "at" + dIdx + "_" + idx, staff_id: u.id, staff_name: u.name, store_id: u.store_id,
          date: daysAgo(dIdx), check_in: "09:" + pad(40 + (idx % 19)), check_out: dIdx === 0 ? "" : "18:" + pad(20 + (idx % 30)),
          method: pick(["WiFi", "定位", "人脸"], idx), coords: "27.55,109.99",
          status: dIdx === 0 ? "已上班" : ((dIdx + idx) % 9 === 0 ? "迟到" : "正常")
        });
      });
    }

    /* 字段别名：不同页面读法不同，统一补齐 */
    db.customers.forEach(function (c) {
      c.total_spend = c.spent;
      c.total_amount = c.spent;
      c.spend = c.spent;
      if (!c.last_visit) c.last_visit = c.last_at || daysAgo(1 + (c.remain % 9));
      if (c.active_cards === undefined) c.active_cards = c.remain > 0 ? 1 : 0;
    });

    db.me = STAFF[0];
    return db;
  }

  /* ------------------------------ 存储 ------------------------------ */
  var db;
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
    if (!db) { db = seed(); save(); }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  load();
  if (/[?&]mock=reset/.test(location.search)) { db = seed(); save(); }

  /* ------------------------------ 查询助手 ------------------------------ */
  /* 返回「数组 + 分页字段」的混合体：既支持 (data || []).map，也支持 data.list / data.total */
  function arr(list) {
    var a = list.slice();
    a.list = a;
    a.total = a.length;
    a.page = 1;
    a.pageSize = a.length || 1;
    a.pages = 1;
    return a;
  }
  function pageOf(list, q) {
    q = q || {};
    var page = parseInt(q.page || 1, 10) || 1;
    var size = parseInt(q.pageSize || q.size || PAGE_SIZE, 10) || PAGE_SIZE;
    var total = list.length;
    var sliced = list.slice((page - 1) * size, page * size);
    var out = arr(sliced);
    out.total = total;
    out.page = page;
    out.pageSize = size;
    out.pages = Math.max(1, Math.ceil(total / size));
    return out;
  }
  function kw(item, q, fields) {
    if (!q.keyword && !q.q) return true;
    var k = String(q.keyword || q.q).toLowerCase();
    return fields.some(function (f) { return String(item[f] == null ? "" : item[f]).toLowerCase().indexOf(k) > -1; });
  }
  /* 员工月度聚合：业绩 / 核销笔数 / 开卡金额 */
  function enrichUser(u) {
    if (!u) return u;
    var month = new Date().toISOString().slice(0, 7);
    var mine = db.verifications.filter(function (v) { return v.staff_id === u.id && String(v.at).slice(0, 7) === month; });
    var cards = db.cards.filter(function (c) { return c.store_id === u.store_id && String(c.start_date).slice(0, 7) === month; });
    var out = Object.assign({}, u);
    out.month_perf = mine.reduce(function (s, v) { return s + (v.verify_amount || 0); }, 0);
    out.month_verify = mine.length;
    out.month_card = cards.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
    out.staff_total = db.users.length;
    return out;
  }  function byId(name, id) { return (db[name] || []).filter(function (x) { return x.id === id; })[0]; }
  function nextId(prefix, name) { return prefix + ((db[name] || []).length + 1) + "_" + Date.now().toString(36).slice(-4); }

  /* ------------------------------ 业务计算 ------------------------------ */
  function dashboard(q) {
    q = q || {};
    var from = q.from || daysAgo(29);
    var to = q.to || d2(new Date());
    function inRange(s) { var d = String(s).slice(0, 10); return d >= from && d <= to; }
    var month = new Date().toISOString().slice(0, 7);

    var vAll = db.verifications.filter(function (v) { return inRange(v.at); });
    var cAll = db.cards.filter(function (c) { return inRange(c.start_date); });
    var verifyAmount = vAll.reduce(function (s, v) { return s + (v.verify_amount || 0); }, 0);
    var cardAmount = cAll.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
    var newCustomers = db.customers.filter(function (c) {
      var idx = parseInt(String(c.id).replace(/\D/g, ""), 10) || 0;
      return idx > 28;
    }).length;
    var pendingVerify = db.appointments.filter(function (a) { return a.status === "待确认"; }).length;

    var trend = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d2(d);
      var day = db.verifications.filter(function (v) { return String(v.at).slice(0, 10) === key; });
      trend.push({
        date: key, label: (d.getMonth() + 1) + "/" + d.getDate(),
        total: day.reduce(function (s, v) { return s + (v.verify_amount || 0); }, 0),
        value: day.length, count: day.length
      });
    }

    var mixMap = {};
    vAll.forEach(function (v) { mixMap[v.project_name] = (mixMap[v.project_name] || 0) + (v.verify_amount || 0); });
    var project_mix = Object.keys(mixMap).map(function (k) {
      return { name: k, label: k, amount: mixMap[k], value: mixMap[k] };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var rankMap = {};
    vAll.forEach(function (v) { rankMap[v.staff_name] = (rankMap[v.staff_name] || 0) + (v.verify_amount || 0); });
    var staff_rank = Object.keys(rankMap).map(function (k) {
      return { name: k, label: k, amount: rankMap[k], value: rankMap[k] };
    }).sort(function (a, b) { return b.amount - a.amount; }).slice(0, 6);

    var stores = db.stores.map(function (s) {
      var sv = vAll.filter(function (v) { return v.store_id === s.id; });
      return {
        id: s.id, name: s.name, status: s.status,
        customer_count: db.customers.filter(function (c) { return c.store_id === s.id; }).length,
        staff_count: db.users.filter(function (u) { return u.store_id === s.id; }).length,
        revenue: sv.reduce(function (a, v) { return a + (v.verify_amount || 0); }, 0),
        verify_count: sv.length
      };
    });

    var stats = {
      revenue: verifyAmount + cardAmount,
      card_amount: cardAmount,
      verify_amount: verifyAmount,
      verify_count: vAll.length,
      new_customers: newCustomers,
      pending_verify: pendingVerify,
      pending_audit: db.audits.filter(function (a) { return a.status === "待审核"; }).length,
      customer_total: db.customers.length,
      staff_total: db.users.length,
      active_cards: db.cards.length,
      month: month
    };
    return {
      stats: stats, range: { from: from, to: to },
      trend: trend, project_mix: project_mix, staff_rank: staff_rank, stores: stores,
      /* 兼容直读写法 */
      revenue: stats.revenue, verify_amount: verifyAmount, card_amount: cardAmount,
      verify_count: stats.verify_count, customers: db.customers.length, customer_total: stats.customer_total
    };
  }

  function workbench(u) {
    u = u || db.me || db.users[0];
    var month = new Date().toISOString().slice(0, 7);
    var mine = db.verifications.filter(function (v) { return v.staff_id === u.id; });
    var mineMonth = mine.filter(function (v) { return String(v.at).slice(0, 7) === month; });
    var storeCards = db.cards.filter(function (c) {
      return c.store_id === u.store_id && String(c.start_date).slice(0, 7) === month;
    });
    var today = d2(new Date());
    var perf = mineMonth.reduce(function (s, v) { return s + (v.verify_amount || 0); }, 0);
    var cardAmount = storeCards.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
    var pending = db.appointments.filter(function (a) { return a.status === "待确认"; }).length;
    var att = db.attendance.filter(function (a) { return a.staff_id === u.id; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return {
      month: month, month_label: month,
      perf: perf, month_perf: perf,
      verify_count: mineMonth.length, month_verify: mineMonth.length,
      card_amount: cardAmount,
      pending_verify: pending,
      customers: db.customers.filter(function (c) { return c.store_id === u.store_id; }).length,
      today_appointments: db.appointments.filter(function (a) { return a.date === today; }).length,
      attendance: att,
      checks: att.filter(function (a) { return a.date === today; })[0] || null,
      assessment: db.assessments.filter(function (a) { return a.staff_id === u.id; })[0] || null,
      user: u, staff_name: u.name, store_name: u.store_name, store_id: u.store_id
    };
  }

  function salaryCompute(q) {
    var month = (q && q.month) || new Date().toISOString().slice(0, 7);
    var staffId = q && q.staff_id;
    var list = db.salary_records.filter(function (r) { return r.month === month && (!staffId || r.staff_id === staffId); });
    var sc = arr(list); sc.month = month; sc.total_amount = list.reduce(function (s, r) { return s + (r.net_pay || 0); }, 0); return sc;
  }

  /* ------------------------------ 路由 ------------------------------ */
  function route(method, path, body, query) {
    body = body || {};
    query = query || {};
    var p = path.split("?")[0].replace(/\/+$/, "");
    var seg = p.split("/").filter(Boolean);       /* api / customers / cu1 */
    var res = seg[0] === "api" ? seg.slice(1) : seg;
    var r0 = res[0] || "", r1 = res[1] || "", r2 = res[2] || "";

    /* 认证 */
    if (r0 === "auth") {
      if (r1 === "login") {
        var cm = db.customers.filter(function (x) { return x.phone === body.phone; })[0];
        if (cm || body.role === "customer") {
          var cu0 = cm || db.customers[0];
          var cuUser = {
            id: cu0.id, name: cu0.name, phone: cu0.phone,
            role: "customer", role_name: "会员", level: cu0.level || "银卡会员",
            store_id: cu0.store_id, store_name: cu0.store_name,
            code: cu0.code, birthday: cu0.birthday, avatar: cu0.avatar || ""
          };
          db.me = cuUser; save();
          return { token: "mock-token-customer", user: cuUser };
        }
        var u = db.users.filter(function (x) { return x.phone === body.phone; })[0] || db.users[0];
        db.me = u; save();
        return { token: "mock-token", user: u };
      }
      if (r1 === "me") return db.me && db.me.role === "customer" ? db.me : enrichUser(db.me || db.users[0]);
      if (r1 === "register") { return { ok: true }; }
    }

    /* 顾客端「我的」聚合：会员信息 + 卡项 + 消费统计 */
    if (r0 === "customer" && r1 === "me") {
      var mid = query.customer_id || (db.me && db.me.role === "customer" ? db.me.id : db.customers[0].id);
      var me = db.customers.filter(function (x) { return x.id === mid; })[0] || db.customers[0];
      var myCards = db.cards.filter(function (x) { return x.customer_id === me.id; });
      var live = myCards.filter(function (x) { return x.status !== "已失效" && Number(x.used_times) < Number(x.total_times); });
      var myRecs = db.verifications.filter(function (x) { return x.customer_id === me.id; });
      var next = db.appointments.filter(function (x) {
        return x.customer_id === me.id && ["待确认", "已确认"].indexOf(x.status) >= 0;
      }).sort(function (a, b) { return String(a.date + a.time) < String(b.date + b.time) ? -1 : 1; })[0] || null;
      return Object.assign({}, me, {
        card_count: myCards.length,
        active_cards: live.length,
        remain: live.reduce(function (s, x) { return s + (Number(x.total_times) - Number(x.used_times)); }, 0),
        verify_count: myRecs.length,
        next_appointment: next
      });
    }

    if (r0 === "dashboard") return dashboard(query);
    if (r0 === "workbench") return workbench(db.me || db.users[0]);

    /* 客户 */
    if (r0 === "customers") {
      if (r1 === "birthday") {
        var days = query.days || 30;
        var t0 = new Date();
        var up = db.customers.map(function (c) {
          var md = c.birthday || "";
          for (var n = 0; n < days; n++) {
            var dd = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + n);
            if (pad(dd.getMonth() + 1) + "-" + pad(dd.getDate()) === md) {
              return Object.assign({}, c, { days_left: n, date: d2(dd), birthday_text: n === 0 ? "今天生日" : n + " 天后生日" });
            }
          }
          return null;
        }).filter(Boolean).sort(function (a, b) { return a.days_left - b.days_left; });
        return arr(up);
      }
      if (method === "GET" && !r1) {
        var cl = db.customers.filter(function (c) {
          if (query.store_id && c.store_id !== query.store_id) return false;
          if (query.level && c.level !== query.level) return false;
          if (query.status && c.status !== query.status) return false;
          return kw(c, query, ["name", "phone", "code"]);
        }).map(function (c) {
          var cs = db.cards.filter(function (x) { return x.customer_id === c.id; });
          var live = cs.filter(function (x) {
            return x.status !== "已失效" && Number(x.used_times) < Number(x.total_times);
          });
          var out = Object.assign({}, c);
          out.active_cards = live.length;
          out.card_count = cs.length;
          out.remain = live.reduce(function (s, x) { return s + (Number(x.total_times) - Number(x.used_times)); }, 0) || c.remain;
          return out;
        });
        return pageOf(cl, query);
      }
      if (method === "GET" && r1) return byId("customers", r1);
      if (method === "POST") {
        var nc = Object.assign({ id: nextId("cu", "customers"), code: "LP2025" + Date.now().toString().slice(-6), remain: 0, spent: 0, visit_count: 0, last_visit: d2(new Date()), status: "正常", avatar: "" }, body);
        db.customers.unshift(nc); save(); return nc;
      }
      if (method === "PUT") { var ec = byId("customers", r1); Object.assign(ec, body); save(); return ec; }
      if (method === "DELETE") { db.customers = db.customers.filter(function (x) { return x.id !== r1; }); save(); return { ok: true }; }
    }

    /* 员工 / 用户 */
    if (r0 === "users") {
      if (method === "GET" && !r1) {
        var ul = db.users.filter(function (u2) {
          if (query.store_id && u2.store_id !== query.store_id) return false;
          if (query.role && u2.role !== query.role) return false;
          if (query.status && u2.status !== query.status) return false;
          return kw(u2, query, ["name", "phone", "position"]);
        });
        return pageOf(ul.map(enrichUser), query);
      }
      if (method === "GET" && r1) return enrichUser(byId("users", r1));
      if (method === "POST") {
        var nu = Object.assign({ id: nextId("u", "users"), role: "staff", role_name: "美业员工", status: "试用", avatar: "", hire_date: d2(new Date()) }, body);
        var s4 = db.stores.filter(function (s) { return s.id === nu.store_id; })[0];
        if (s4) nu.store_name = s4.name;
        db.users.push(nu); save(); return nu;
      }
      if (method === "PUT") { var eu = byId("users", r1); Object.assign(eu, body); save(); return eu; }
    }

    /* 项目 */
    if (r0 === "projects") {
      if (method === "GET" && !r1) {
        var pl = db.projects.filter(function (x) { if (query.status && x.status !== query.status) return false; return kw(x, query, ["name", "category"]); });
        return pageOf(pl, query);
      }
      if (method === "GET" && r1) return byId("projects", r1);
      if (method === "POST") { var np = Object.assign({ id: nextId("pj", "projects"), status: "上架" }, body); db.projects.push(np); save(); return np; }
      if (method === "PUT") { var ep = byId("projects", r1); Object.assign(ep, body); save(); return ep; }
    }

    /* 门店 */
    if (r0 === "stores") return arr(db.stores);

    /* 卡项 */
    if (r0 === "cards") {
      if (method === "GET" && !r1) {
        var kl = db.cards.filter(function (c) {
          if (query.customer_id && c.customer_id !== query.customer_id) return false;
          if (query.store_id && c.store_id !== query.store_id) return false;
          if (query.status && c.status !== query.status) return false;
          return kw(c, query, ["customer_name", "project_name", "card_no"]);
        });
        var pg = pageOf(kl, query);
        pg.amount = kl.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
        pg.paid_amount = kl.reduce(function (s, c) { return s + (Number(c.paid_amount !== undefined ? c.paid_amount : c.amount) || 0); }, 0);
        return pg;
      }
      if (method === "GET" && r1) return byId("cards", r1);
      if (method === "POST") {
        var pj2 = (db.projects.filter(function (x) { return x.id === body.project_id; })[0]) || db.projects[0];
        var cu3 = (db.customers.filter(function (x) { return x.id === body.customer_id; })[0]) || db.customers[0];
        var stA = db.stores.filter(function (s) { return s.id === cu3.store_id; })[0] || db.stores[0];
        var nk = {
          id: nextId("cd", "cards"), card_no: "CD" + Date.now().toString().slice(-8),
          customer_id: cu3.id, customer_name: cu3.name, customer_phone: cu3.phone,
          project_id: pj2.id, project_name: pj2.name,
          store_id: stA.id, store_name: stA.name,
          total_times: body.total_times || pj2.total_times, used_times: 0,
          amount: body.amount || (pj2.price * pj2.total_times),
          start_date: d2(new Date()), expire_at: daysLater(pj2.valid_days || 365),
          valid_days: pj2.valid_days || 365, status: "生效中"
        };
        db.cards.unshift(nk);
        cu3.spent = (cu3.spent || 0) + nk.amount;
        cu3.remain = (cu3.remain || 0) + nk.total_times;
        save(); return nk;
      }
    }

    /* 核销 */
    if (r0 === "verifications") {
      if (r1 === "draft") {
        var dcard = db.cards.filter(function (c) { return c.id === body.card_id; })[0];
        return { token: "vt_" + Date.now().toString(36), card_id: body.card_id, card: dcard, expires_in: 300, link: (location.origin || "") + "/customer/verify.html?token=vt_demo" };
      }
      if (method === "GET" && !r1) {
        var vl = db.verifications.filter(function (v) {
          if (query.customer_id && v.customer_id !== query.customer_id) return false;
          if (query.store_id && v.store_id !== query.store_id) return false;
          if (query.staff_id && v.staff_id !== query.staff_id) return false;
          if (query.month && String(v.at).slice(0, 7) !== query.month) return false;
          if (query.status && v.status !== query.status) return false;
          return kw(v, query, ["customer_name", "project_name", "staff_name", "verify_no"]);
        });
        return pageOf(vl, query);
      }
      if (method === "POST") {
        var card2 = (db.cards.filter(function (c) { return c.id === body.card_id; })[0]) || db.cards[0];
        var stf = db.me || db.users[0];
        var rec = {
          id: nextId("vf", "verifications"), verify_no: "VF" + Date.now().toString().slice(-8),
          card_id: card2.id, card_no: card2.card_no,
          customer_id: card2.customer_id, customer_name: card2.customer_name, customer_phone: card2.customer_phone,
          project_id: card2.project_id, project_name: card2.project_name,
          store_id: card2.store_id, store_name: card2.store_name,
          staff_id: stf.id, staff_name: stf.name, times: body.times || 1,
          amount: Math.round(card2.amount / card2.total_times),
          verify_amount: Math.round(card2.amount / card2.total_times),
          at: d2(new Date()) + " " + pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()),
          used_at: d2(new Date()), status: "已完成", channel: "扫码核销", note: body.note || ""
        };
        card2.used_times = Math.min(card2.total_times, (card2.used_times || 0) + rec.times);
        db.verifications.unshift(rec); save(); return rec;
      }
      if (method === "PUT") { var ev = byId("verifications", r1); Object.assign(ev, body); save(); return ev; }
    }

    /* 顾客端核销链接（v1.0 顾客唯一入口）：token → 核销单 */
    if (r0 === "public" && r1 === "verification") {
      var tk = r2 || query.token || "";
      var pool = db.verifications;
      var hit = null;
      if (!tk) throw new Error("404 缺少核销参数");
      if (tk === "demo" || tk === "vt_demo") {
        hit = pool.filter(function (x) { return x.status === "待核销"; })[0] || pool[0];
      } else {
        hit = pool.filter(function (x) {
          return x.token === tk || x.verify_no === tk || x.id === tk;
        })[0] || null;
      }
      if (!hit) throw new Error("404 链接无效或已失效");
      return Object.assign({}, hit, { code: hit.verify_no, expire_minutes: 30 });
    }

    if (r0 === "public") return { ok: true, card: db.cards[0], verification: db.cards[0] };

    /* 预约 */
    if (r0 === "appointments") {
      if (method === "GET" && !r1) {
        var al = db.appointments.filter(function (a2) {
          if (query.customer_id && a2.customer_id !== query.customer_id) return false;
          if (query.store_id && a2.store_id !== query.store_id) return false;
          if (query.date && a2.date !== query.date) return false;
          if (query.status && a2.status !== query.status) return false;
          return kw(a2, query, ["customer_name", "project_name", "staff_name"]);
        }).sort(function (x, y) { return (y.date + y.start_time).localeCompare(x.date + x.start_time); });
        return pageOf(al, query);
      }
      if (method === "GET" && r1) return byId("appointments", r1);
      if (method === "POST") { var na = Object.assign({ id: nextId("ap", "appointments"), status: "待确认", source: "后台" }, body); db.appointments.unshift(na); save(); return na; }
      if (method === "PUT") { var ea = byId("appointments", r1); Object.assign(ea, body); save(); return ea; }
    }

    /* 审核 */
    if (r0 === "audits") {
      if (method === "GET" && !r1) {
        var dl = db.audits.filter(function (a3) { if (query.status && a3.status !== query.status) return false; return kw(a3, query, ["apply_type", "created_by_name", "customer_name"]); });
        return pageOf(dl, query);
      }
      if ((r2 === "approve" || r2 === "reject") && (method === "POST" || method === "PUT")) {
        var adx = byId("audits", r1);
        if (adx) { adx.status = r2 === "approve" ? "已通过" : "已驳回"; adx.confirmed_at = d2(new Date()); if (body && body.reason) adx.reject_reason = body.reason; save(); }
        return adx;
      }
      if (method === "PUT") { var ed = byId("audits", r1); Object.assign(ed, body, { confirmed_at: d2(new Date()) }); save(); return ed; }
      if (method === "POST") { var nd = Object.assign({ id: nextId("ad", "audits"), status: "待审核", created_at: d2(new Date()) }, body); db.audits.unshift(nd); save(); return nd; }
    }

    /* 薪资 */
    if (r0 === "salary") {
      if (r1 === "rules") {
        if (method === "GET" && !r2) return db.salary_rules;
        if (method === "PUT") { Object.assign(db.salary_rules, body); save(); return db.salary_rules; }
        if (method === "POST") { Object.assign(db.salary_rules, body); save(); return db.salary_rules; }
      }
      if (r1 === "compute") return salaryCompute(body || query);
      if (r1 === "records") {
        if (method === "GET" && !r2) {
          var sl = db.salary_records.filter(function (r) {
            if (query.month && r.month !== query.month) return false;
            if (query.store_id && r.store_id !== query.store_id) return false;
            if (query.staff_id && r.staff_id !== query.staff_id) return false;
            return kw(r, query, ["staff_name"]);
          });
          return pageOf(sl, query);
        }
        if (method === "PUT" && r2) { var es = db.salary_records.filter(function (x) { return x.id === r2; })[0]; if (es) { Object.assign(es, body); save(); } return es; }
        if (method === "POST") { var ns = Object.assign({ id: "sr" + Date.now() }, body); db.salary_records.unshift(ns); save(); return ns; }
      }
    }

    /* 考核 */
    if (r0 === "assessments") {
      if (r1 === "result") {
        var ar = db.assessments.filter(function (a4) { if (query.store_id && a4.store_id !== query.store_id) return false; return true; });
        var arOut = arr(ar); arOut.qualified = ar.filter(function (a) { return a.qualified; }).length; return arOut;
      }
      if (method === "GET") { var ag = db.assessments.filter(function (a5) { if (query.store_id && a5.store_id !== query.store_id) return false; if (query.staff_id && a5.staff_id !== query.staff_id) return false; return true; }); return pageOf(ag, query); }
      if (method === "DELETE") { db.assessments = db.assessments.filter(function (x) { return x.id !== r1; }); save(); return { ok: true }; }
      if (method === "PUT") { var ae = db.assessments.filter(function (x) { return x.id === r1; })[0]; if (ae) { Object.assign(ae, body); save(); } return ae; }
      if (method === "POST") { var an = Object.assign({ id: nextId("as", "assessments") }, body); db.assessments.unshift(an); save(); return an; }
    }

    /* 库存 */
    if (r0 === "inventory") {
      if (r1 === "items") {
        if (method === "GET") { var il = db.inventory_items.filter(function (x) { if (query.store_id && x.store_id !== query.store_id) return false; return kw(x, query, ["item_name"]); }); return pageOf(il, query); }
        if (method === "POST") { var ni = Object.assign({ id: nextId("it", "inventory_items"), unit: "件" }, body); db.inventory_items.push(ni); save(); return ni; }
      }
      if (r1 === "orders") {
        if (method === "GET") { var ol = db.inventory_orders.filter(function (x) { if (query.status && x.status !== query.status) return false; return kw(x, query, ["item_name", "order_no"]); }); return pageOf(ol, query); }
        if (method === "POST") { var no = Object.assign({ id: nextId("io", "inventory_orders"), order_no: "IO" + Date.now().toString().slice(-6), status: "待确认", created_at: d2(new Date()) }, body); db.inventory_orders.unshift(no); save(); return no; }
        if (method === "PUT" && r2) { var eo = db.inventory_orders.filter(function (x) { return x.id === r2; })[0]; if (eo) { Object.assign(eo, body); save(); } return eo; }
      }
      if (r1 === "stock") return arr(db.inventory_items);
    }

    /* 打卡 */
    if (r0 === "attendance") {
      if (r1 === "today") {
        var tk = d2(new Date());
        return db.attendance.filter(function (a6) { return a6.date === tk; });
      }
      if (r1 === "check") {
        var me = db.me || db.users[0];
        var tk2 = d2(new Date());
        var rec2 = db.attendance.filter(function (a7) { return a7.staff_id === me.id && a7.date === tk2; })[0];
        if (!rec2) {
          rec2 = { id: nextId("at", "attendance"), staff_id: me.id, staff_name: me.name, store_id: me.store_id, date: tk2, check_in: pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()), check_out: "", method: body.method || "WiFi", coords: body.coords || "27.55,109.99", status: "已上班" };
          db.attendance.unshift(rec2);
        } else if (!rec2.check_out) {
          rec2.check_out = pad(new Date().getHours()) + ":" + pad(new Date().getMinutes());
          rec2.status = "正常";
        }
        save(); return rec2;
      }
      if (method === "GET") {
        var atl = db.attendance.filter(function (a8) {
          if (query.staff_id && a8.staff_id !== query.staff_id) return false;
          if (query.date && a8.date !== query.date) return false;
          if (query.month && String(a8.date).slice(0, 7) !== query.month) return false;
          if (query.store_id && a8.store_id !== query.store_id) return false;
          return true;
        });
        var apg = pageOf(atl, query);
        apg.rows = atl;
        apg.summary = db.users.map(function (u9) {
          var mine2 = atl.filter(function (a9) { return a9.staff_id === u9.id; });
          return {
            user_id: u9.id, user_name: u9.name, staff_name: u9.name,
            days: mine2.filter(function (a10) { return a10.check_in; }).length,
            late: mine2.filter(function (a11) { return a11.status === "迟到"; }).length,
            absent: mine2.filter(function (a12) { return a12.status === "缺勤"; }).length,
            overtime: 0
          };
        }).filter(function (s) { return s.days > 0 || s.absent > 0; });
        return apg;
      }
    }

    /* 福利 */
    if (r0 === "welfare") {
      if (r1 === "issued") return arr(db.welfare_issued);
      if (r2 === "issue" && method === "POST") {
        var wi = db.welfare.filter(function (x) { return x.id === r1; })[0] || {};
        var wrec = Object.assign({ id: nextId("wo", "welfare_issued"), welfare_id: r1, welfare_name: wi.name, user_name: (db.me || {}).name || "张美丽", issued_at: d2(new Date()), status: "已发放" }, body);
        db.welfare_issued.unshift(wrec); save(); return wrec;
      }
      if (method === "GET") return arr(db.welfare);
      if (method === "POST") { var nw = Object.assign({ id: nextId("wf", "welfare"), status: "启用" }, body); db.welfare.push(nw); save(); return nw; }
      if (method === "PUT") { var ew = db.welfare.filter(function (x) { return x.id === r1; })[0]; if (ew) { Object.assign(ew, body); save(); } return ew; }
      if (method === "DELETE") { db.welfare = db.welfare.filter(function (x) { return x.id !== r1; }); save(); return { ok: true }; }
    }

    /* 短信 */
    if (r0 === "sms") {
      if (r1 === "logs") return pageOf(db.sms_logs.filter(function (x) { return kw(x, query, ["phone", "customer_name", "content"]); }), query);
      if (r1 === "send") {
        var lg = { id: nextId("sms", "sms_logs"), phone: body.phone || "", customer_name: body.customer_name || "", channel: body.channel || "手动发送", content: body.content || "", status: "已发送", created_at: d2(new Date()) + " " + pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()) };
        db.sms_logs.unshift(lg); save(); return lg;
      }
    }

    /* 设置 / 消息 */
    if (r0 === "settings") {
      if (method === "GET") return db.settings;
      if (method === "PUT" || method === "POST") { Object.assign(db.settings, body); save(); return db.settings; }
    }
    if (r0 === "messages") return arr(db.messages);

    return { list: [], total: 0, ok: true };
  }

  /* ------------------------------ 接管请求 ------------------------------ */
  LP.mockReset = function () { db = seed(); save(); };

  LP.request = function (method, path, body, query) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(route(method, path, body, query)); }
        catch (e) { reject(e); }
      }, 60);
    });
  };
  LP.get = function (p, q) { return LP.request("GET", p, null, q); };
  LP.post = function (p, b) { return LP.request("POST", p, b || {}); };
  LP.put = function (p, b) { return LP.request("PUT", p, b || {}); };
  LP.del = function (p, b) { return LP.request("DELETE", p, b || {}); };

  /* 会话：默认已登录管理员，避免被 requireRoles 踢到登录页 */
  DB_me();
  function DB_me() {
    if (!db.me) { db.me = db.users[0]; save(); }
    localStorage.setItem("lp_token", "mock-token");
    localStorage.setItem("lp_user", JSON.stringify(db.me));
  }
  LP.token = function () { return "mock-token"; };
  LP.user = function () { return db.me || db.users[0]; };
  LP.saveSession = function (t, u) { if (u) { db.me = u; localStorage.setItem("lp_user", JSON.stringify(u)); save(); } };
  LP.clearSession = function () {};
  LP.logout = function () { location.href = "/login.html"; };
  LP.requireRoles = function () { return Promise.resolve(db.me || db.users[0]); };
  LP.login = function (phone) {
    var u = db.users.filter(function (x) { return x.phone === phone; })[0] || db.users[0];
    db.me = u; save();
    localStorage.setItem("lp_user", JSON.stringify(u));
    return Promise.resolve(u);
  };
  LP.mockLoginAs = function (id) { var u = byId("users", id) || db.users[0]; db.me = u; save(); localStorage.setItem("lp_user", JSON.stringify(u)); return u; };

  global.LP_MOCK = { db: function () { return db; }, reset: LP.mockReset };
})(typeof window !== "undefined" ? window : globalThis);
