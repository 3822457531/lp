/* 兰瓶管理后台 · 侧栏与顶栏布局（依赖 ../assets/js/lp-api.js 暴露的 window.LP） */
(function () {
  'use strict';
  var page = document.body.getAttribute('data-page') || '';
  var items = [
    { group: '概览', links: [
      { id: 'dashboard', href: 'dashboard.html', label: '数据看板', ico: 'grid' }
    ]},
    { group: '业务管理', links: [
      { id: 'customers', href: 'customers.html', label: '客户管理', ico: 'user' },
      { id: 'employees', href: 'employees.html', label: '员工管理', ico: 'users' },
      { id: 'projects', href: 'projects.html', label: '项目管理', ico: 'sparkle' },
      { id: 'recharge', href: 'recharge.html', label: '充值开卡', ico: 'card' },
      { id: 'verify', href: 'verify.html', label: '核销列表', ico: 'scan' },
      { id: 'appointments', href: 'appointments.html', label: '预约列表', ico: 'calendar' }
    ]},
    { group: '组织与绩效', links: [
      { id: 'audit', href: 'audit.html', label: '审核管理', ico: 'clipboard', badge: true },
      { id: 'salary', href: 'salary.html', label: '薪资情况', ico: 'chart' },
      { id: 'assessment', href: 'assessment.html', label: '考核设置', ico: 'target' }
    ]},
    { group: '系统', links: [
      { id: 'welfare', href: 'welfare.html', label: '福利设置', ico: 'gift' },
      { id: 'settings', href: 'settings.html', label: '系统设置', ico: 'settings' }
    ]}
  ];

  function svgIcon(name) {
    return '<svg class="nav-ico" aria-hidden="true"><use href="../assets/icons.svg#icon-' + name + '"></use></svg>';
  }

  var navHtml = items.map(function (g) {
    return (
      '<div class="nav-group"><div class="nav-label">' + g.group + '</div>' +
      g.links.map(function (l) {
        var active = l.id === page ? ' active' : '';
        var badge = l.badge ? '<span class="badge" data-audit-badge style="display:none;"></span>' : '';
        return (
          '<a class="nav-item' + active + '" href="' + l.href + '">' +
          '<span class="ico">' + svgIcon(l.ico) + '</span>' + l.label + badge + '</a>'
        );
      }).join('') +
      '</div>'
    );
  }).join('');

  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
      '<div class="logo">兰</div>' +
      '<div><div class="name">兰瓶</div><div class="sub">管理后台</div></div>' +
      '</div>' +
      navHtml +
      '<div class="sidebar-foot">兰瓶美肤 · Admin v1.0<br/><a href="../index.html" style="color:#9a7d6f;">返回总览</a></div>';
  }

  var ROLE_TEXT = { admin: '超级管理员', manager: '店长', staff: '美业员工' };

  function paintTop(u) {
    var box = document.getElementById('top-user');
    if (!box) return;
    if (!u || !u.id) {
      box.innerHTML = '';
      return;
    }
    var name = u.name || '管理员';
    var role = u.role_name || ROLE_TEXT[u.role] || u.position || '管理员';
    var store = u.store_name || '总部';
    var av = u.avatar
      ? '<img class="av" src="../' + String(u.avatar).replace(/^\.?\//, '') + '" alt="" style="object-fit:cover;" />'
      : '<div class="av">' + LP.esc(String(name).slice(-1)) + '</div>';
    box.innerHTML =
      '<div class="store-select">门店：' + LP.esc(store) + '</div>' +
      '<div class="user-chip">' + av +
      '<div>' + LP.esc(name) +
      '<br/><span style="color:#9ca3af;font-size:11px;">' + LP.esc(role) + '</span></div></div>' +
      '<a class="btn-link" data-logout style="margin-left:14px;cursor:pointer;">退出</a>';
    var out = box.querySelector('[data-logout]');
    if (out) {
      out.addEventListener('click', function () {
        LP.confirm('确定退出当前账号？', { okText: '退出' }).then(function (ok) {
          if (ok) LP.logout();
        });
      });
    }
  }

  function paintBadge(n) {
    var b = document.querySelector('[data-audit-badge]');
    if (!b) return;
    if (n > 0) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.style.display = '';
    } else {
      b.style.display = 'none';
    }
  }

  /* 页面在 requireRoles 之后 dispatch('lp:user')，这里同步真实用户 */
  document.addEventListener('lp:user', function (e) { paintTop(e.detail); });

  if (window.LP) {
    paintTop(LP.user());
    if (LP.token()) {
      LP.get('/api/audits').then(function (list) {
        paintBadge((list || []).length);
      }).catch(function () {});
    }
  }
})();
