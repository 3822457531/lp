/* 顾客端公共脚本：登录守卫 / 底部导航 / 三态 / 格式化
   依赖 ../assets/js/lp-api.js（window.LP），无第三方库。 */
(function (global) {
  'use strict';

  var C = global.CUST = {};

  C.esc = function (v) { return LP.esc(v); };
  C.$ = function (s, r) { return LP.$(s, r); };
  C.$$ = function (s, r) { return LP.$$(s, r); };
  C.money = function (v) { return LP.fmt.money(v); };
  C.date = function (v) { return LP.fmt.date(v); };
  C.phone = function (v) { return LP.fmt.phone(v); };

  /* 当前顾客（localStorage 里的 lp_user，role=customer） */
  C.me = function () {
    var u = LP.user ? LP.user() : null;
    try { u = u || JSON.parse(localStorage.getItem('lp_user') || 'null'); } catch (e) { u = null; }
    return u && u.role === 'customer' ? u : null;
  };

  /* 守卫：未登录先去登录页；带 ?demo=1 时免登录（演示/截图用） */
  C.guard = function () {
    var u = C.me();
    if (u) return Promise.resolve(u);
    var demo = /[?&]demo=1/.test(location.search);
    if (demo) {
      return LP.request('POST', '/api/auth/login', { phone: '13700000000', role: 'customer' }).then(function (res) {
        var user = (res && res.user) || {};
        user.role = 'customer';
        try {
          localStorage.setItem('lp_token', res.token || 'mock-token-customer');
          localStorage.setItem('lp_user', JSON.stringify(user));
        } catch (e) { }
        return user;
      });
    }
    var back = location.pathname.split('/').pop() + location.search;
    location.replace('login.html?back=' + encodeURIComponent(back));
    return Promise.reject(new Error('need-login'));
  };

  /* 底部导航：home | cards | records | mine */
  C.tab = function (active) {
    var items = [
      ['home', 'home.html', '首页', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
      ['cards', 'cards.html', '我的卡', 'M3 7h18v10H3zM3 11h18'],
      ['records', 'records.html', '记录', 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5'],
      ['mine', 'profile.html', '我的', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-3.3 3.6-6 8-6s8 2.7 8 6']
    ];
    var html = '<nav class="tab-bar">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '<a class="' + (it[0] === active ? 'active' : '') + '" href="' + it[1] + '">' +
        '<svg class="tb-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="' + it[3] + '"/></svg>' +
        '<span>' + it[2] + '</span></a>';
    }
    return html + '</nav>';
  };

  C.mountTab = function (active) {
    var phone = C.$('.phone');
    if (!phone) return;
    var box = document.createElement('div');
    box.innerHTML = C.tab(active);
    phone.appendChild(box.firstChild);
    document.body.classList.add('tabbar');
  };

  /* 顶部返回栏 */
  C.nav = function (title, back) {
    return '<div class="nav-bar"><a class="back" href="' + (back || 'home.html') + '">‹</a>' +
      '<h1>' + C.esc(title) + '</h1></div>';
  };

  C.body = function () { return C.$('#body'); };
  C.loading = function (t) {
    var b = C.body(); if (b) b.innerHTML = '<div class="st-load">' + C.esc(t || '加载中…') + '</div>';
  };
  C.fail = function (e) {
    var msg = (e && e.message) || '加载失败，请稍后重试';
    var b = C.body(); if (b) b.innerHTML = '<div class="st-err">' + C.esc(msg) + '</div>';
    try { LP.toast(msg, 'error'); } catch (x) { }
  };
  C.empty = function (text) {
    return '<div class="cust-empty"><div class="ico">◌</div><p>' + C.esc(text || '暂无数据') + '</p></div>';
  };

  /* 卡项 / 预约 / 核销的状态色 */
  C.tagClass = function (s) {
    var m = {
      '生效中': 'tag-green', '已完成': 'tag-green', '已确认': 'tag-blue', '正常': 'tag-green',
      '待核销': 'tag-orange', '待确认': 'tag-orange', '待使用': 'tag-orange',
      '已失效': 'tag-gray', '已取消': 'tag-gray', '已完成核销': 'tag-green',
      '已过期': 'tag-gray', '已拒绝': 'tag-red'
    };
    return m[s] || 'tag-blue';
  };
  C.tag = function (s) {
    if (!s) return '';
    return '<span class="tag ' + C.tagClass(s) + '">' + C.esc(s) + '</span>';
  };

  C.items = function (v) {
    if (!v) return [];
    if (Object.prototype.toString.call(v) === '[object Array]') return v;
    if (typeof v === 'string') {
      try { var p = JSON.parse(v); return Object.prototype.toString.call(p) === '[object Array]' ? p : []; } catch (e) { return []; }
    }
    return [];
  };
})(window);
