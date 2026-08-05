/**
 * 用户端共享壳 — aioq 侧栏（对话页 / 专家工作台共用）
 */
(function (global) {
  function isExpertFolder() {
    if (document.body && document.body.getAttribute('data-user-nav') === 'expert') return true;
    var pathname = global.location.pathname || '';
    var href = global.location.href || '';
    return pathname.indexOf('专家工作台') >= 0 ||
      href.indexOf('专家工作台') >= 0 ||
      href.indexOf('%E4%B8%93%E5%AE%B6') >= 0;
  }

  function prefix() {
    return isExpertFolder() ? '../' : '';
  }

  function chatPageHref(opts) {
    var base = prefix() + 'index.html';
    if (!opts) return base;
    if (typeof opts === 'string') {
      if (opts.charAt(0) === '#') return base + opts;
      if (opts.charAt(0) === '?') return base + opts;
      return base + '?' + opts;
    }
    var query = [];
    if (opts.id) query.push('id=' + encodeURIComponent(opts.id));
    if (opts.history) query.push('history=' + encodeURIComponent(opts.history));
    var qs = query.length ? '?' + query.join('&') : '';
    var hash = opts.hash ? ('#' + opts.hash) : '';
    return base + qs + hash;
  }

  function expertHref(page) {
    page = page || 'workbench.html';
    return isExpertFolder() ? page : '专家工作台/' + page;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function agentLinkHtml(agent, activeId) {
    return '<button type="button" class="aioq-agent-link ' + (agent.id === activeId ? 'active' : '') + '" data-agent-id="' + escapeHtml(agent.id) + '">' +
      escapeHtml(agent.name) + '</button>';
  }

  function renderAgentLists(activeAgentId) {
    var grouped = global.UserAgentResolver ? UserAgentResolver.resolve(UserPortalContext ? UserPortalContext.get() : {}) : { personal: [], org: [], enterprise: [] };
    var map = [
      { key: 'personal', id: 'agentListPersonal' },
      { key: 'org', id: 'agentListOrg' },
      { key: 'enterprise', id: 'agentListEnterprise' }
    ];
    map.forEach(function (m) {
      var el = document.getElementById(m.id);
      if (!el) return;
      var list = grouped[m.key] || [];
      el.innerHTML = list.length
        ? list.map(function (a) { return agentLinkHtml(a, activeAgentId); }).join('')
        : '<p class="aioq-agent-empty">暂无可用智能体</p>';
    });
  }

  function sidebarHtml(activeNav) {
    var chatActive = activeNav === 'chat' ? ' active' : '';
    var expertActive = activeNav === 'expert' ? ' active' : '';
    return (
      '<div class="aioq-brand">' +
        '<div class="aioq-brand-mark aioq-brand-mark--ao" aria-hidden="true">敖</div>' +
        '<div><strong>敖钦</strong><span>企业级中台</span></div></div>' +
      '<a class="aioq-nav-item' + chatActive + '" href="' + chatPageHref() + '"><span class="aioq-nav-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span>新对话</span></a>' +
      '<div class="aioq-search-wrap"><input class="aioq-search" id="agentSearch" placeholder="搜索智能体" aria-label="搜索智能体"></div>' +
      '<div class="aioq-menu-block" id="agentMenuBlock">' +
        '<button class="aioq-menu-head" type="button" id="btnToggleAgents" aria-expanded="true">' +
          '<span class="aioq-menu-head-label"><span class="aioq-nav-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>' +
            '<rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>' +
            '<rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>' +
            '<rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg></span>智能体中心</span>' +
          '<span class="aioq-chevron" aria-hidden="true">⌄</span></button>' +
        '<div class="aioq-agent-groups" id="agentGroups">' +
          '<div class="aioq-agent-group is-group-collapsed" id="groupPersonal">' +
            '<button class="aioq-menu-head sub" type="button" id="btnTogglePersonal" aria-expanded="false"><span>个人智能体</span><span class="aioq-chevron">⌄</span></button>' +
            '<div class="aioq-agent-list" id="agentListPersonal"></div></div>' +
          '<div class="aioq-agent-group is-group-collapsed" id="groupOrg">' +
            '<button class="aioq-menu-head sub" type="button" id="btnToggleOrg" aria-expanded="false"><span>组织智能体</span><span class="aioq-chevron">⌄</span></button>' +
            '<div class="aioq-agent-list" id="agentListOrg"></div></div>' +
          '<div class="aioq-agent-group" id="groupEnterprise">' +
            '<button class="aioq-menu-head sub" type="button" id="btnToggleEnterprise" aria-expanded="true"><span>企业智能体</span><span class="aioq-chevron">⌄</span></button>' +
            '<div class="aioq-agent-list" id="agentListEnterprise"></div></div>' +
        '</div></div>' +
      '<div class="aioq-sidebar-bottom">' +
        '<button class="aioq-footer-row" type="button" id="btnHistory" data-user-history><span>历史记录</span><span class="aioq-chevron">›</span></button>' +
        '<a class="aioq-footer-row' + expertActive + '" href="' + expertHref('workbench.html') + '" id="btnExpertWorkbench">专家工作台</a>' +
        '<button class="aioq-footer-row" type="button" id="btnMessageCenter" data-user-message-center>消息中心</button>' +
        '<button class="aioq-footer-row" type="button" data-user-help>帮助</button>' +
      '</div>'
    );
  }

  function bindSidebarNav() {
    var menuBlock = document.getElementById('agentMenuBlock');
    var btnToggleAgents = document.getElementById('btnToggleAgents');
    if (btnToggleAgents && menuBlock) {
      btnToggleAgents.addEventListener('click', function (e) {
        e.stopPropagation();
        var collapsed = menuBlock.classList.toggle('is-agents-collapsed');
        btnToggleAgents.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    }
    function bindGroup(id, btnId) {
      var block = document.getElementById(id);
      var btn = document.getElementById(btnId);
      if (!block || !btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (block.classList.contains('is-group-collapsed') && menuBlock) {
          menuBlock.classList.remove('is-agents-collapsed');
          if (btnToggleAgents) btnToggleAgents.setAttribute('aria-expanded', 'true');
        }
        var collapsed = block.classList.toggle('is-group-collapsed');
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    }
    bindGroup('groupPersonal', 'btnTogglePersonal');
    bindGroup('groupOrg', 'btnToggleOrg');
    bindGroup('groupEnterprise', 'btnToggleEnterprise');

    var search = document.getElementById('agentSearch');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        if (q && menuBlock) {
          menuBlock.classList.remove('is-agents-collapsed');
          if (btnToggleAgents) btnToggleAgents.setAttribute('aria-expanded', 'true');
        }
        renderAgentLists('');
        ['personal', 'org', 'enterprise'].forEach(function (key, i) {
          var ids = ['groupPersonal', 'groupOrg', 'groupEnterprise'];
          var btnIds = ['btnTogglePersonal', 'btnToggleOrg', 'btnToggleEnterprise'];
          var listEl = document.getElementById(['agentListPersonal', 'agentListOrg', 'agentListEnterprise'][i]);
          var block = document.getElementById(ids[i]);
          var btn = document.getElementById(btnIds[i]);
          if (!listEl || !block) return;
          var grouped = UserAgentResolver.resolve(UserPortalContext.get());
          var agents = (grouped[key] || []).filter(function (a) {
            return !q || [a.name, a.intro].join(' ').toLowerCase().indexOf(q) >= 0;
          });
          if (q && agents.length) {
            block.classList.remove('is-group-collapsed');
            if (btn) btn.setAttribute('aria-expanded', 'true');
          }
          listEl.innerHTML = agents.length
            ? agents.map(function (a) { return agentLinkHtml(a, ''); }).join('')
            : '<p class="aioq-agent-empty">暂无可用智能体</p>';
        });
      });
    }

    document.querySelectorAll('[data-agent-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-agent-id');
        window.location.href = chatPageHref({ id: id });
      });
    });

    document.querySelectorAll('[data-user-help]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (global.Proto && Proto.toast) Proto.toast('帮助文档（演示占位）');
      });
    });

    document.querySelectorAll('[data-user-history]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (global.UserPortalBridge && UserPortalBridge.openHistory) {
          UserPortalBridge.openHistory();
          return;
        }
        window.location.href = chatPageHref({ hash: 'history' });
      });
    });

    if (global.UserMessageCenter && UserMessageCenter.mount) UserMessageCenter.mount();
  }

  function render(opts) {
    opts = opts || {};
    var activeNav = opts.activeNav || document.body.getAttribute('data-user-nav') || 'chat';
    var sidebar = document.getElementById('userPortalSidebar');
    if (!sidebar) sidebar = document.querySelector('.aioq-sidebar[data-user-portal]');
    if (!sidebar) return;
    sidebar.innerHTML = sidebarHtml(activeNav);
    renderAgentLists('');
    bindSidebarNav();
  }

  global.UserPortalShell = {
    render: render,
    prefix: prefix,
    expertHref: expertHref,
    chatPageHref: chatPageHref,
    isExpertFolder: isExpertFolder
  };
})(window);
