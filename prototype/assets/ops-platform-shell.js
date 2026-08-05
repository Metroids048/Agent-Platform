/**
 * 运营平台共享壳 — 对齐 Figma TopNav + 侧栏（与 index.html 一致）
 */
(function (global) {
  var SIDEBAR = [
    { section: '数据', links: [
      { href: '11-user-feedback.html', icon: '💬', label: '用户反馈', module: 'feedback' },
      { href: '12-expert-workbench.html', icon: '👥', label: '专家工作台', module: 'expert' }
    ]},
    { section: '分析', links: [
      { href: '14-business-dashboard.html', icon: '📊', label: '业务看板', module: 'dashboard' },
      { href: '14-model-dashboard.html', icon: '🧠', label: '模型看板', module: 'dashboard' },
      { href: '14-resource-dashboard.html', icon: '📈', label: '资源看板', module: 'dashboard' },
      { href: '14-user-agent-profile.html', icon: '👤', label: '用户与智能体画像', module: 'dashboard' }
    ]},
    { section: '管理', links: [
      { href: '#', icon: '⚙️', label: '模型运营', placeholder: true },
      {
        group: 'ops-v11',
        href: 'index.html',
        icon: '📦',
        label: '智能体运营',
        module: 'ops',
        children: [
          { href: 'dashboard.html', label: '运营概览', module: 'ops-dash' },
          { href: 'audit-workbench.html', label: '审核工作台', module: 'audit' },
          { href: '旧页面/index-v1.0.html', label: '旧版页面归档', module: 'ops' }
        ]
      },
      { href: '#', icon: '💰', label: '资源与成本管理', placeholder: true },
      { href: '13-permission-mgmt.html', icon: '🛡️', label: '权限与开发者管理', module: 'permission' }
    ]}
  ];

  var ROLE_LABELS = { ops: '运营视角', expert: '专家视角', team: '团队视角' };

  function params() {
    return new URLSearchParams((global.location && global.location.search) || '');
  }

  function decodePathSegment(seg) {
    try { return decodeURIComponent(seg); } catch (e) { return seg; }
  }

  function decodedPathname() {
    return decodePathSegment((global.location && global.location.pathname) || '');
  }

  function isUserPortalSurface() {
    return document.body && document.body.getAttribute('data-portal-surface') === 'user';
  }

  function mapExpertPage(page) {
    if (!isUserPortalSurface()) return page;
    var inExpertFolder = decodedPathname().indexOf('专家工作台') >= 0;
    var map = inExpertFolder ? {
      '12-expert-workbench.html': 'workbench.html',
      '12-expert-task-detail.html': 'task-detail.html',
      '12-expert-task-view.html': 'task-view.html',
      '12-expert-context.html': 'context.html',
      '专家工作台/workbench.html': 'workbench.html',
      '专家工作台/task-detail.html': 'task-detail.html',
      '专家工作台/task-view.html': 'task-view.html',
      '专家工作台/context.html': 'context.html'
    } : {
      '12-expert-workbench.html': '专家工作台/workbench.html',
      '12-expert-task-detail.html': '专家工作台/task-detail.html',
      '12-expert-task-view.html': '专家工作台/task-view.html',
      '12-expert-context.html': '专家工作台/context.html'
    };
    return map[page] || page;
  }

  function currentPage() {
    var path = decodedPathname();
    var parts = path.split('/').filter(Boolean).map(decodePathSegment);
    if (parts.length >= 2 && parts[parts.length - 2] === '专家工作台') {
      return '专家工作台/' + parts[parts.length - 1].split('?')[0];
    }
    if (parts.length >= 2 && parts[parts.length - 2] === 'web端') {
      return 'web端/' + parts[parts.length - 1].split('?')[0];
    }
    return (parts.pop() || 'index.html').split('?')[0];
  }

  function getRole() {
    var r = params().get('role');
    if (r === 'expert' || r === 'team' || r === 'ops') return r;
    var page = currentPage();
    if (page.indexOf('12-expert') >= 0) return 'expert';
    return 'ops';
  }

  function resolveSidebarHref(page) {
    return page;
  }

  function href(page, extra) {
    var q = new URLSearchParams();
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] != null && extra[k] !== '') q.set(k, extra[k]);
    });
    if (!q.has('role')) q.set('role', getRole());
    var qs = q.toString();
    var base = resolveSidebarHref(mapExpertPage(page));
    return base + (qs ? '?' + qs : '');
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function bindModalClose(root) {
    (root || document).querySelectorAll('[data-close-modal]').forEach(function (btn) {
      if (btn.dataset.modalCloseWired) return;
      btn.dataset.modalCloseWired = '1';
      btn.addEventListener('click', function () {
        closeModal(btn.getAttribute('data-close-modal'));
      });
    });
    (root || document).querySelectorAll('.modal-overlay').forEach(function (overlay) {
      if (overlay.dataset.overlayWired) return;
      overlay.dataset.overlayWired = '1';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  function bindTabs(containerSel) {
    var root = typeof containerSel === 'string' ? document.querySelector(containerSel) : containerSel;
    if (!root) return;
    root.querySelectorAll('[data-ops-tab]').forEach(function (btn) {
      if (btn.dataset.tabWired) return;
      btn.dataset.tabWired = '1';
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-ops-tab');
        root.querySelectorAll('[data-ops-tab]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        document.querySelectorAll('[data-ops-panel]').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-ops-panel') === tab);
        });
      });
    });
  }

  function bindSubTabs(containerSel) {
    var root = typeof containerSel === 'string' ? document.querySelector(containerSel) : containerSel;
    if (!root) return;
    root.querySelectorAll('[data-ops-subtab]').forEach(function (btn) {
      if (btn.dataset.subtabWired) return;
      btn.dataset.subtabWired = '1';
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-ops-subtab');
        root.querySelectorAll('[data-ops-subtab]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        var panelRoot = root.closest('[data-ops-panel]') || document;
        panelRoot.querySelectorAll('[data-ops-subpanel]').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-ops-subpanel') === tab);
        });
      });
    });
  }

  var OPS_PAGES = ['index.html', 'dashboard.html', 'audit-workbench.html', 'audit-review.html', 'agent-detail.html', '05-agent-detail.html', '08-audit-status.html'];

  function isOpsV11Page(page) {
    return OPS_PAGES.indexOf(page || '') >= 0;
  }

  function renderNavGroup(link, activeModule, activePage) {
    var childPages = [link.href].concat((link.children || []).map(function (c) { return c.href; }));
    var inGroup = childPages.indexOf(activePage) >= 0 || (isOpsV11Page(activePage) && link.module === activeModule);
    var openClass = inGroup ? ' open' : '';
    var headActive = activePage === link.href ? ' active' : '';
    var children = (link.children || []).map(function (child) {
      var childActive = activePage === child.href ? ' active' : '';
      return '<a href="' + href(child.href) + '" class="sidebar-sub' + (childActive ? ' active' : '') + '">' + child.label + '</a>';
    }).join('');
    return '<div class="sidebar-nav-group' + openClass + '" data-ops-nav-group>' +
      '<div class="sidebar-group-row">' +
      '<a href="' + href(link.href) + '" class="sidebar-group-head' + headActive + '">' +
      '<span class="icon">' + link.icon + '</span> ' + link.label + '</a>' +
      '<button type="button" class="sidebar-group-toggle" aria-expanded="' + (inGroup ? 'true' : 'false') + '" aria-label="展开子菜单">▾</button>' +
      '</div><div class="sidebar-subnav">' + children + '</div></div>';
  }

  function renderSidebar(activeModule, activePage) {
    activePage = activePage || currentPage();
    return SIDEBAR.map(function (sec) {
      var links = sec.links.map(function (link) {
        if (link.group) return renderNavGroup(link, activeModule, activePage);
        var isActive = link.href === activePage || link.module === activeModule;
        var ph = link.placeholder ? ' data-ops-placeholder' : '';
        var h = link.placeholder ? '#' : href(link.href);
        return '<a href="' + h + '" class="' + (isActive ? 'active' : '') + '"' + ph + '><span class="icon">' + link.icon + '</span> ' + link.label + '</a>';
      }).join('');
      return '<div class="sidebar-section"><div class="sidebar-title">' + sec.section + '</div>' + links + '</div>';
    }).join('') +
      '<div class="sidebar-footer">' +
      '<a href="#" data-ops-placeholder>帮助文档</a>' +
      '<a href="' + href('11-user-feedback.html') + '">反馈建议</a>' +
      '</div>';
  }

  function renderTopbar(subtitle, showRoleBadge) {
    var role = getRole();
    var roleBadge = showRoleBadge && role !== 'ops'
      ? '<span class="ops-role-badge">' + (ROLE_LABELS[role] || role) + '</span>'
      : '';
    var userBack = isUserPortalSurface()
      ? '<a href="../index.html" class="btn btn-soft btn-sm" style="margin-right:12px;flex-shrink:0;">返回用户对话</a>'
      : '';
    return '<div class="topbar-inner" style="max-width:var(--frame);margin:0 auto;display:flex;align-items:center;width:100%;">' +
      userBack +
      '<div class="topbar-brand">' +
      '<div class="topbar-logo">A</div>' +
      '<div class="topbar-brand-text"><strong>敖钦 AI</strong><span>企业级中台</span></div>' +
      '</div>' +
      '<div class="topbar-modules">' +
      '<span>智能编码伙伴</span>' +
      '<span>资源服务中心</span>' +
      '<span>模型服务</span>' +
      '<a href="06-dev-platform.html" data-nav-dev>智能体开发</a>' +
      '<span>智能编码</span>' +
      '<span>知识中心</span>' +
      '<a href="' + href('index.html') + '" class="active" data-nav-ops>运营平台</a>' +
      '</div>' +
      '<div class="topbar-right">' + roleBadge +
      '<input class="topbar-search" placeholder="搜索模型或任务..." aria-label="搜索">' +
      '<span class="topbar-bell"><button class="icon-btn" type="button" data-ops-bell title="消息中心">🔔</button></span>' +
      '<div class="avatar"></div></div></div>';
  }

  function renderLayout(opts) {
    opts = opts || {};
    var body = document.body;
    var module = opts.module || body.getAttribute('data-ops-module') || 'ops';
    var page = opts.activePage || body.getAttribute('data-ops-page') || currentPage();
    var topbar = document.querySelector('.topbar');
    if (topbar) topbar.innerHTML = renderTopbar(opts.subtitle, opts.showRoleBadge !== false);
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.innerHTML = renderSidebar(module, page);
    wireBreadcrumbs();
    wireOpsSidebarLinks();
    wireNavGroups();
    wirePlaceholders();
  }

  function wirePlaceholders() {
    document.querySelectorAll('[data-ops-placeholder]').forEach(function (a) {
      if (a.dataset.placeholderWired) return;
      a.dataset.placeholderWired = '1';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (global.Proto && Proto.toast) Proto.toast('演示占位：该模块尚未开放');
      });
    });
  }

  function wireBreadcrumbs() {
    document.querySelectorAll('.breadcrumb a[href]').forEach(function (a) {
      if (a.dataset.bcWired) return;
      var raw = a.getAttribute('href');
      if (!raw || raw === '#' || raw.indexOf('http') === 0) return;
      a.dataset.bcWired = '1';
      a.href = href(raw.split('?')[0]);
    });
  }

  function wireOpsSidebarLinks() {
    document.querySelectorAll('.sidebar a[href]').forEach(function (a) {
      if (a.dataset.opsSidebarWired || a.hasAttribute('data-ops-placeholder')) return;
      a.dataset.opsSidebarWired = '1';
      var base = a.getAttribute('href').split('?')[0];
      if (base && base !== '#') a.href = href(base);
    });
  }

  function wireNavGroups() {
    document.querySelectorAll('[data-ops-nav-group]').forEach(function (group) {
      if (group.dataset.navGroupWired) return;
      group.dataset.navGroupWired = '1';
      var toggle = group.querySelector('.sidebar-group-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = group.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function hasUserPortalV2Sidebar() {
    return !!document.getElementById('sidebarAgentList') ||
      !!document.querySelector('.aioq-user-sidebar');
  }

  function initShell(opts) {
    opts = opts || {};
    if (isUserPortalSurface() && global.UserPortalShell) {
      if (!hasUserPortalV2Sidebar()) {
        UserPortalShell.render({
          activeNav: document.body.getAttribute('data-user-nav') || (opts.module === 'expert' ? 'expert' : 'chat')
        });
      }
      bindModalClose(document);
      if (opts.tabs) bindTabs(opts.tabs);
      if (opts.subtabs) bindSubTabs(opts.subtabs);
      if (global.UserMessageCenter && UserMessageCenter.mount) UserMessageCenter.mount();
      return;
    }
    if (document.body.getAttribute('data-ops-module') || opts.module) {
      renderLayout(opts);
    } else {
      wireOpsSidebarLinks();
      wireNavGroups();
      wireBreadcrumbs();
      wirePlaceholders();
    }
    if (global.Proto && Proto.initTopbar) Proto.initTopbar('ops');
    bindModalClose(document);
    if (opts.tabs) bindTabs(opts.tabs);
    if (opts.subtabs) bindSubTabs(opts.subtabs);
    if (global.OpsMessageCenter && OpsMessageCenter.mount) OpsMessageCenter.mount(getRole());
  }

  global.OpsShell = {
    params: params,
    currentPage: currentPage,
    getRole: getRole,
    href: href,
    openModal: openModal,
    closeModal: closeModal,
    bindModalClose: bindModalClose,
    bindTabs: bindTabs,
    bindSubTabs: bindSubTabs,
    renderLayout: renderLayout,
    wireBreadcrumbs: wireBreadcrumbs,
    wireNavGroups: wireNavGroups,
    initShell: initShell
  };
})(window);
