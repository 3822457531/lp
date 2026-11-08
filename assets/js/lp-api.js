/* 兰瓶美业 · 前端 API 客户端与 UI 工具（零依赖）
 * 页面引入：<script src=".../assets/js/lp-api.js"></script>
 * 约定：所有接口返回 {ok:true,data} / {ok:false,error}，本文件返回 data，异常抛 Error(message)
 */
(function (global) {
  'use strict';
  var LP = (global.LP = global.LP || {});
  var TOKEN_KEY = 'lp_token';
  var USER_KEY = 'lp_user';

  /* ============================== 会话 ============================== */
  LP.token = function () { return localStorage.getItem(TOKEN_KEY) || ''; };
  LP.user = function () {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  };
  LP.saveSession = function (token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  };
  LP.clearSession = function () {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  /* ============================== 请求 ============================== */
  function qs(obj) {
    if (!obj) return '';
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === undefined || v === null || v === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }
  LP.qs = qs;

  LP.request = function (method, path, body, query) {
    var url = path + qs(query);
    var headers = { 'Content-Type': 'application/json' };
    var token = LP.token();
    if (token) headers.Authorization = 'Bearer ' + token;
    var init = { method: method, headers: headers };
    if (body !== undefined && body !== null) init.body = JSON.stringify(body);
    return fetch(url, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (json) {
        if (res.status === 401) {
          LP.clearSession();
          var next = encodeURIComponent(location.pathname + location.search);
          if (location.pathname !== '/login.html') location.replace('/login.html?next=' + next);
          throw new Error('登录已过期，请重新登录');
        }
        if (!json || json.ok !== true) {
          throw new Error((json && json.error) || ('请求失败（' + res.status + '）'));
        }
        return json.data;
      });
    });
  };
  LP.get = function (path, query) { return LP.request('GET', path, null, query); };
  LP.post = function (path, body) { return LP.request('POST', path, body || {}); };
  LP.put = function (path, body) { return LP.request('PUT', path, body || {}); };
  LP.del = function (path, body) { return LP.request('DELETE', path, body || {}); };

  /* ============================== 认证 ============================== */
  LP.login = function (phone, password) {
    return LP.post('/api/auth/login', { phone: phone, password: password }).then(function (d) {
      LP.saveSession(d.token, d.user);
      return d.user;
    });
  };
  LP.register = function (payload) {
    return LP.post('/api/auth/register', payload);
  };
  LP.homeFor = function (role) {
    if (role === 'admin') return '/admin/dashboard.html';
    if (role === 'manager') return '/manager/home.html';
    return '/staff/home.html';
  };
  LP.logout = function () {
    LP.clearSession();
    location.href = '/login.html';
  };
  /* 角色守卫：roles 传数组，不匹配则跳转到自己的首页 */
  LP.requireRoles = function (roles) {
    var u = LP.user();
    if (!u || !LP.token()) {
      location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
      return Promise.reject(new Error('未登录'));
    }
    if (roles && roles.length && roles.indexOf(u.role) < 0) {
      location.replace(LP.homeFor(u.role));
      return Promise.reject(new Error('无权访问'));
    }
    return LP.get('/api/auth/me').then(function (me) {
      LP.saveSession(null, me);
      return me;
    }).catch(function (e) {
      LP.clearSession();
      location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
      throw e;
    });
  };

  /* ============================== 格式化 ============================== */
  var money0 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  LP.fmt = {
    money: function (n) {
      n = Number(n) || 0;
      return '¥' + (Math.abs(n % 1) < 0.005 ? money0.format(n) : money2.format(n));
    },
    num: function (n) { return money0.format(Number(n) || 0); },
    pct: function (n, digits) { return (Number(n) || 0).toFixed(digits === undefined ? 1 : digits) + '%'; },
    date: function (s) { return s ? String(s).slice(0, 10) : '—'; },
    time: function (s) { return s ? String(s).slice(11, 16) : '—'; },
    datetime: function (s) { return s ? String(s).slice(0, 16) : '—'; },
    month: function (s) { return s ? String(s).slice(0, 7) : '—'; },
    /* 今天 / 昨天 / 3 天前 / 2026-09-01 */
    ago: function (s) {
      if (!s) return '—';
      var d = new Date(String(s).replace(/-/g, '/'));
      var diff = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (diff <= 0) return '今天 ' + LP.fmt.time(s);
      if (diff === 1) return '昨天 ' + LP.fmt.time(s);
      if (diff < 7) return diff + ' 天前';
      return LP.fmt.date(s);
    },
    /* 距生日天数 → 文案 */
    birthday: function (days) {
      if (days === 0) return '今天生日';
      if (days === 1) return '明天生日';
      return days + ' 天后生日';
    },
    phone: function (p) { return p ? String(p).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '—'; },
  };
  LP.today = function () {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  LP.nowMonth = function () { return LP.today().slice(0, 7); };
  LP.monthsBack = function (n) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  /* ============================== DOM ============================== */
  LP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  LP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  LP.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  LP.mount = function (sel, html) {
    var el = typeof sel === 'string' ? LP.$(sel) : sel;
    if (el) el.innerHTML = html;
    return el;
  };
  /* 事件委托：LP.on(document, 'click', '[data-act="del"]', fn) */
  LP.on = function (root, ev, selector, fn) {
    (typeof root === 'string' ? LP.$(root) : root).addEventListener(ev, function (e) {
      var t = e.target.closest(selector);
      if (t && this.contains(t)) fn.call(t, e, t);
    });
  };
  LP.debounce = function (fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 300);
    };
  };
  LP.param = function (name) {
    return new URL(location.href).searchParams.get(name);
  };
  LP.query = function () {
    var o = {};
    new URL(location.href).searchParams.forEach(function (v, k) { o[k] = v; });
    return o;
  };

  /* ============================== 反馈组件 ============================== */
  LP.toast = function (msg, type) {
    var box = LP.$('.lp-toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'lp-toasts';
      document.body.appendChild(box);
    }
    var el = document.createElement('div');
    el.className = 'lp-toast ' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
  };

  LP.modal = function (opts) {
    opts = opts || {};
    var mask = document.createElement('div');
    mask.className = 'lp-mask';
    mask.innerHTML =
      '<div class="lp-modal" style="' + (opts.width ? 'max-width:' + opts.width + 'px' : '') + '">' +
      '<div class="lp-modal-hd"><h3>' + LP.esc(opts.title || '') + '</h3><button class="lp-x" data-close>×</button></div>' +
      '<div class="lp-modal-bd">' + (opts.body || '') + '</div>' +
      (opts.footer === null ? '' :
        '<div class="lp-modal-ft">' +
        '<button class="btn-ghost" data-close>' + LP.esc(opts.cancelText || '取消') + '</button>' +
        '<button class="btn-ok">' + LP.esc(opts.okText || '确定') + '</button></div>') +
      '</div>';
    document.body.appendChild(mask);
    document.body.classList.add('lp-noscroll');
    var api = {
      el: mask,
      body: mask.querySelector('.lp-modal-bd'),
      close: function () {
        mask.remove();
        if (!LP.$('.lp-mask')) document.body.classList.remove('lp-noscroll');
        if (opts.onClose) opts.onClose();
      },
      setLoading: function (on, text) {
        var b = mask.querySelector('.btn-ok');
        if (!b) return;
        b.disabled = !!on;
        b.textContent = on ? (text || '处理中…') : (opts.okText || '确定');
      },
    };
    mask.addEventListener('click', function (e) {
      if (e.target.matches('[data-close]') || e.target === mask) api.close();
    });
    var okBtn = mask.querySelector('.btn-ok');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        if (!opts.onOk) return api.close();
        var r = opts.onOk(api);
        if (r && r.preventDefault) r.preventDefault();
      });
    }
    if (opts.onMount) opts.onMount(api);
    return api;
  };

  LP.confirm = function (msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      var m = LP.modal({
        title: opts.title || '确认操作',
        body: '<p class="lp-confirm-text">' + LP.esc(msg) + '</p>',
        okText: opts.okText || '确定',
        cancelText: opts.cancelText || '取消',
        width: 400,
        onOk: function (api) { done = true; api.close(); resolve(true); },
        onClose: function () { if (!done) resolve(false); },
      });
      if (opts.danger) {
        var b = m.el.querySelector('.btn-ok');
        if (b) b.classList.add('danger');
      }
    });
  };

  /* 表单弹窗：schema=[{name,label,type,value,options,placeholder,required,hint,full}] */
  LP.formModal = function (opts) {
    var schema = opts.schema || [];
    var html = '<div class="lp-form">' + schema.map(function (f) {
      var v = f.value === undefined || f.value === null ? '' : f.value;
      var input;
      if (f.type === 'select') {
        input = '<select class="lp-field" name="' + f.name + '">' + (f.options || []).map(function (o) {
          var val = typeof o === 'object' ? o.value : o;
          var label = typeof o === 'object' ? o.label : o;
          return '<option value="' + LP.esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + LP.esc(label) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        input = '<textarea class="lp-field" name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + LP.esc(f.placeholder || '') + '">' + LP.esc(v) + '</textarea>';
      } else if (f.type === 'radio') {
        input = '<div class="lp-radio-row">' + (f.options || []).map(function (o) {
          var val = typeof o === 'object' ? o.value : o;
          var label = typeof o === 'object' ? o.label : o;
          return '<label><input type="radio" name="' + f.name + '" value="' + LP.esc(val) + '"' +
            (String(val) === String(v) ? ' checked' : '') + ' /> ' + LP.esc(label) + '</label>';
        }).join('') + '</div>';
      } else if (f.type === 'checks') {
        var arr = Array.isArray(v) ? v : String(v || '').split(',');
        input = '<div class="lp-check-row">' + (f.options || []).map(function (o) {
          var val = typeof o === 'object' ? o.value : o;
          var label = typeof o === 'object' ? o.label : o;
          return '<label><input type="checkbox" name="' + f.name + '" value="' + LP.esc(val) + '"' +
            (arr.indexOf(val) >= 0 ? ' checked' : '') + ' /> ' + LP.esc(label) + '</label>';
        }).join('') + '</div>';
      } else {
        input = '<input class="lp-field" type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + LP.esc(v) +
          '" placeholder="' + LP.esc(f.placeholder || '') + '"' + (f.step ? ' step="' + f.step + '"' : '') + ' />';
      }
      return '<div class="lp-form-item' + (f.full ? ' full' : '') + '"><label>' + LP.esc(f.label) +
        (f.required ? ' <em>*</em>' : '') + '</label>' + input +
        (f.hint ? '<p class="hint">' + LP.esc(f.hint) + '</p>' : '') + '</div>';
    }).join('') + '</div>';

    return LP.modal({
      title: opts.title,
      body: (opts.desc ? '<p class="lp-modal-desc">' + LP.esc(opts.desc) + '</p>' : '') + html,
      okText: opts.okText || '保存',
      width: opts.width || 560,
      onOk: function (api) {
        var out = {};
        var invalid = null;
        schema.forEach(function (f) {
          var el = api.body.querySelector('[name="' + f.name + '"]');
          if (f.type === 'checks') {
            out[f.name] = LP.$$('input[name="' + f.name + '"]:checked', api.body).map(function (i) { return i.value; });
            out[f.name + '_str'] = out[f.name].join(',');
          } else if (f.type === 'radio') {
            var r = api.body.querySelector('input[name="' + f.name + '"]:checked');
            out[f.name] = r ? r.value : '';
          } else {
            out[f.name] = el ? el.value.trim() : '';
          }
          var val = out[f.name];
          if (f.required && !invalid && (val === '' || val === undefined || (Array.isArray(val) && !val.length))) {
            invalid = f;
          }
          if (f.type === 'number' && val !== '' && isNaN(Number(val))) invalid = invalid || f;
          if (f.name.endsWith('_str') === false && f.type === 'checks') out[f.name] = out[f.name];
        });
        if (invalid) {
          LP.toast('请填写「' + invalid.label + '」', 'error');
          return;
        }
        api.setLoading(true);
        Promise.resolve()
          .then(function () { return opts.onSubmit ? opts.onSubmit(out, api) : null; })
          .then(function () { api.close(); })
          .catch(function (e) { api.setLoading(false); LP.toast(e.message, 'error'); });
      },
    });
  };

  /* 底部选择：items=[{label,value,desc}] → Promise<value|null> */
  LP.sheet = function (title, items) {
    return new Promise(function (resolve) {
      var m = LP.modal({
        title: title,
        body: '<div class="lp-sheet">' + items.map(function (it, i) {
          return '<button data-i="' + i + '"><span>' + LP.esc(it.label) + '</span>' +
            (it.desc ? '<em>' + LP.esc(it.desc) + '</em>' : '') + '</button>';
        }).join('') + '</div>',
        footer: null,
        width: 460,
        onClose: function () { if (!m._picked) resolve(null); },
      });
      m.body.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (!b) return;
        m._picked = true;
        resolve(items[Number(b.dataset.i)].value);
        m.close();
      });
    });
  };

  /* ============================== 展示组件 ============================== */
  var TAG_MAP = {
    '营业中': 'green', '已启用': 'green', '启用': 'green', '有效': 'green', '正常': 'green',
    '已完成': 'green', '已入库': 'green', '合格': 'green', '通过': 'green', '已发送': 'green',
    '在售': 'green', '在职': 'green', '已领取': 'green', '已使用': 'blue',
    '待审核': 'orange', '待确认': 'orange', '待付款': 'orange', '待收库': 'orange', '待入库': 'orange',
    '待核销': 'orange', '迟到': 'orange', '已发货': 'orange', '部分使用': 'orange',
    '缺勤': 'red', '已取消': 'gray', '已拒绝': 'red', '失败': 'red', '停用': 'gray', '禁用': 'gray',
    '已过期': 'gray', '未使用': 'blue', '已退回': 'red', '离职': 'gray', '待出库': 'orange',
  };
  LP.tag = function (text, color) {
    var c = color || TAG_MAP[text] || 'gray';
    return '<span class="tag tag-' + c + '">' + LP.esc(text) + '</span>';
  };
  LP.empty = function (text, icon) {
    return '<div class="lp-empty"><div class="ico">' + (icon || '🗂') + '</div><p>' + LP.esc(text || '暂无数据') + '</p></div>';
  };
  LP.avatar = function (name, src) {
    if (src) return '<img class="avatar-sm" src="' + LP.esc(src) + '" alt="" />';
    return '<span class="avatar-sm">' + LP.esc(String(name || '兰').slice(-1)) + '</span>';
  };

  /* 表格：columns=[{key,title,render(row),width,align,cls}] */
  LP.table = function (opts) {
    var cols = opts.columns || [];
    var rows = opts.rows || [];
    if (!rows.length) return LP.empty(opts.emptyText || '暂无数据');
    return '<table class="data-table"><thead><tr>' + cols.map(function (c) {
      return '<th' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + LP.esc(c.title || '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r, i) {
      return '<tr' + (opts.onRow ? ' data-idx="' + i + '"' : '') + '>' + cols.map(function (c) {
        var v = c.render ? c.render(r, i) : LP.esc(r[c.key] === undefined || r[c.key] === null ? '—' : r[c.key]);
        return '<td' + (c.align ? ' style="text-align:' + c.align + '"' : '') + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + v + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  };

  /* 分页器：返回 HTML，配合 LP.bindPager(el, {page,total,size,onChange}) */
  LP.pagerHtml = function (o) {
    var pages = Math.max(1, Math.ceil((o.total || 0) / (o.size || 10)));
    var cur = o.page || 1;
    var btns = [];
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - cur) > 1) {
        if (btns[btns.length - 1] !== '…') btns.push('…');
        continue;
      }
      btns.push(i);
    }
    return '<div class="pagination"><span>共 ' + LP.fmt.num(o.total || 0) + ' 条</span><div class="page-btns">' +
      '<span data-page="' + Math.max(1, cur - 1) + '">上一页</span>' +
      btns.map(function (b) {
        return b === '…' ? '<span class="dot">…</span>'
          : '<span data-page="' + b + '"' + (b === cur ? ' class="active"' : '') + '>' + b + '</span>';
      }).join('') +
      '<span data-page="' + Math.min(pages, cur + 1) + '">下一页</span></div></div>';
  };
  LP.bindPager = function (el, o) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      var s = e.target.closest('[data-page]');
      if (!s) return;
      var p = Number(s.dataset.page);
      if (!p || p === o.page) return;
      o.onChange(p);
    });
  };

  /* 柱状图（对应 admin.css .chart-bars） */
  LP.bars = function (data, opt) {
    opt = opt || {};
    var max = Math.max.apply(null, data.map(function (d) { return Number(d.value) || 0; }).concat([1]));
    return '<div class="chart-bars">' + data.map(function (d) {
      var h = Math.max(3, Math.round((Number(d.value) || 0) / max * 100));
      var t = opt.money === false ? LP.fmt.num(d.value) : LP.fmt.money(d.value);
      return '<div class="bar-wrap" title="' + LP.esc(d.label + ' ' + t) + '">' +
        '<div class="bar" style="height:' + h + '%"></div><span class="bar-label">' + LP.esc(d.label) + '</span></div>';
    }).join('') + '</div>';
  };

  var DONUT_COLORS = ['#9a7d6f', '#c9a882', '#e5ddd4', '#7b9e89', '#d8a48f', '#b8a9c9', '#8fa8bf'];
  /* 环形图：data=[{label,value}] → {html, legend} ; 用 conic-gradient 实现 */
  LP.donut = function (data) {
    var total = data.reduce(function (s, d) { return s + (Number(d.value) || 0); }, 0) || 1;
    var acc = 0;
    var stops = data.map(function (d, i) {
      var from = acc / total * 100;
      acc += Number(d.value) || 0;
      var to = acc / total * 100;
      return DONUT_COLORS[i % DONUT_COLORS.length] + ' ' + from.toFixed(2) + '% ' + to.toFixed(2) + '%';
    }).join(',');
    return '<div class="donut-row"><div class="donut" style="background:conic-gradient(' + stops + ');"></div>' +
      '<ul class="legend-list">' + data.map(function (d, i) {
        var p = (Number(d.value) || 0) / total * 100;
        return '<li><i style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></i>' +
          LP.esc(d.label) + ' ' + p.toFixed(0) + '%</li>';
      }).join('') + '</ul></div>';
  };

  /* 骨架屏 */
  LP.skeleton = function (n) {
    return '<div class="lp-skeleton">' + new Array(n || 4).join('<div></div>') + '</div>';
  };

  /* 简易 SVG 折线（移动端首页趋势） */
  LP.spark = function (values, opt) {
    opt = opt || {};
    var w = opt.width || 320, h = opt.height || 64, pad = 4;
    var max = Math.max.apply(null, values.concat([1]));
    var step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
    var pts = values.map(function (v, i) {
      return [pad + i * step, h - pad - (Number(v) || 0) / max * (h - pad * 2)];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + (w - pad) + ' ' + (h - pad) + ' L' + pad + ' ' + (h - pad) + ' Z';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:' + h + 'px;">' +
      '<path d="' + area + '" fill="rgba(232,90,122,.12)"/>' +
      '<path d="' + line + '" fill="none" stroke="#e85a7a" stroke-width="2" stroke-linejoin="round"/></svg>';
  };

  global.LP = LP;
})(window);
