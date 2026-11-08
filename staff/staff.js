/* 员工端公共脚本：底部导航 / 顶部返回 / 三态 / 数据小工具
   依赖 ../assets/js/lp-api.js（window.LP），不引入任何外部库。 */
(function (global) {
  'use strict';

  var S = global.STAFF = {};

  S.esc = function (v) { return LP.esc(v); };
  S.$ = function (s, r) { return LP.$(s, r); };
  S.$$ = function (s, r) { return LP.$$(s, r); };
  S.money = function (v) { return LP.fmt.money(v); };
  S.month = function (m) { return LP.fmt.month(m); };

  /* 图片地址归一化：接口里存的是站根相对路径（assets/images/x.jpg），
     页面在 /staff/ 下，需要补前导 / 才不会 404。 */
  S.img = function (src) {
    var s = String(src == null ? '' : src).trim();
    if (!s) return '';
    if (/^(https?:)?\/\//i.test(s) || s.charAt(0) === '/' || s.charAt(0) === '.') return s;
    return '/' + s;
  };

  /* 登录守卫：返回 Promise<user> */
  S.guard = function () { return LP.requireRoles(['staff']); };

  /* 底部导航：home|customers|verify|mine */
  S.tab = function (active) {
    var items = [
      ['home', 'home.html', '首页'],
      ['customers', 'customers.html', '客户'],
      ['verify', 'verify-step1.html', '核销'],
      ['mine', 'mine.html', '我的']
    ];
    var html = '<nav class="tab-bar">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '<a class="' + (it[0] === active ? 'active' : '') + '" href="' + it[1] + '">' +
        '<span class="dot"></span>' + it[2] + '</a>';
    }
    return html + '</nav>';
  };
  S.mountTab = function (active) {
    var phone = LP.$('.phone');
    if (!phone) return;
    var box = document.createElement('div');
    box.innerHTML = S.tab(active);
    phone.appendChild(box.firstChild);
    document.body.classList.add('tabbar');
  };

  /* 顶部返回栏 */
  S.nav = function (title, back) {
    return '<div class="nav-bar"><a class="back" href="' + (back || 'home.html') + '">‹</a>' +
      '<h1>' + S.esc(title) + '</h1></div>';
  };

  /* 三态 */
  S.body = function () { return LP.$('#body'); };
  S.loading = function (text) {
    var b = S.body();
    if (b) b.innerHTML = '<div class="st-load">' + S.esc(text || '加载中…') + '</div>';
  };
  S.fail = function (e) {
    var msg = (e && e.message) || '加载失败，请稍后重试';
    var b = S.body();
    if (b) b.innerHTML = '<div class="st-err">' + S.esc(msg) + '</div>';
    try { LP.toast(msg, 'error'); } catch (x) { }
  };

  /* 明细 items 可能是 JSON 字符串（客户详情里的核销记录） */
  S.items = function (v) {
    if (!v) return [];
    if (Object.prototype.toString.call(v) === '[object Array]') return v;
    if (typeof v === 'string') {
      try {
        var p = JSON.parse(v);
        return Object.prototype.toString.call(p) === '[object Array]' ? p : [];
      } catch (e) { return []; }
    }
    return [];
  };

  /* 卡项 */
  S.left = function (card) {
    var t = Number(card.total_times || 0), u = Number(card.used_times || 0);
    var left = t - u;
    return left > 0 ? left : 0;
  };
  S.unit = function (card) {
    var amount = Number(card.amount || 0), t = Number(card.total_times || 0);
    return Math.round(amount / Math.max(1, t));
  };

  /* 标签配色 */
  S.tagClass = function (status) {
    var map = {
      '有效': 'tag-green', '已用完': 'tag-gray', '已过期': 'tag-gray',
      '待核销': 'tag-orange', '已完成': 'tag-green', '已取消': 'tag-gray', '已退款': 'tag-red',
      '待确认': 'tag-orange', '已确认': 'tag-blue', '已改约': 'tag-blue',
      '待服务': 'tag-orange', '正常': 'tag-green', '迟到': 'tag-orange', '缺卡': 'tag-red'
    };
    return map[status] || 'tag-gray';
  };

  /* 预约分组 */
  S.apptGroup = function (status) {
    if (status === '已完成') return '已完成';
    if (status === '已取消') return '已取消';
    return '待服务';
  };

  /* 生日距今天数（birthday: 1990-02-20 / 02-20） */
  S.dayLeft = function (birthday) {
    if (!birthday) return null;
    var s = String(birthday);
    var md = s.length > 5 ? s.slice(5) : s;
    var parts = md.split('-');
    if (parts.length < 2) return null;
    var now = new Date();
    var y = now.getFullYear();
    var t = new Date(y, Number(parts[0]) - 1, Number(parts[1]));
    t.setHours(0, 0, 0, 0);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (t.getTime() < today.getTime()) t = new Date(y + 1, Number(parts[0]) - 1, Number(parts[1]));
    return Math.round((t.getTime() - today.getTime()) / 86400000);
  };
  S.birthdayText = function (days) {
    if (days === null || days === undefined) return '生日未知';
    if (days === 0) return '今天生日';
    if (days === 1) return '明天生日';
    return days + ' 天后生日';
  };

  /* 日期时间 */
  S.dt = function (s) {
    if (!s) return { date: '—', time: '—' };
    var str = String(s).replace('T', ' ');
    var p = str.split(' ');
    return { date: p[0] || '—', time: (p[1] || '').slice(0, 5) || '—' };
  };
  S.toInput = function (s) { /* 'YYYY-MM-DD HH:MM:SS' → datetime-local 值 */
    if (!s) return '';
    var d = S.dt(s);
    return d.date + 'T' + (d.time === '—' ? '00:00' : d.time);
  };
  S.fromInput = function (v) { /* datetime-local → 'YYYY-MM-DD HH:MM:00' */
    if (!v) return '';
    var str = String(v).replace('T', ' ');
    if (str.length === 16) str += ':00';
    return str;
  };

  /* 复制文本 */
  S.copy = function (text) {
    var val = String(text == null ? '' : text);
    var done = function () { LP.toast('已复制到剪贴板', 'success'); };
    var fail = function () {
      LP.toast('复制受限，请长按链接手动复制', 'error');
      var box = document.querySelector('.link-box');
      if (box && window.getSelection && document.createRange) {
        try {
          var r = document.createRange();
          r.selectNodeContents(box);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        } catch (e) { }
      }
    };
    if (!val) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(val).then(done, function () {
        if (legacy()) done(); else fail();
      });
    }
    if (legacy()) done(); else fail();
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = val;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, val.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
  };

  /* chips 选择器 */
  S.chips = function (list, active, attr) {
    var html = '<div class="chips">';
    for (var i = 0; i < list.length; i++) {
      var it = list[i]; /* [value, label] */
      html += '<span class="chip ' + (String(it[0]) === String(active) ? 'on' : '') +
        '" data-' + (attr || 'v') + '="' + S.esc(it[0]) + '">' + S.esc(it[1]) + '</span>';
    }
    return html + '</div>';
  };

  /* 简单并发：顺序执行 Promise 工厂数组 */
  S.series = function (fns) {
    var out = [];
    return fns.reduce(function (p, fn) {
      return p.then(function () { return fn(); }).then(function (r) { out.push(r); return out; });
    }, Promise.resolve()).then(function () { return out; });
  };

  /* 空态卡片 */
  S.empty = function (text, icon) {
    return LP.empty(text || '暂无数据', icon || '📭');
  };
})(window);
