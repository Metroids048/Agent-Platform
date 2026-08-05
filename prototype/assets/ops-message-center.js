/**
 * 消息中心 drawer（topbar 铃铛）— 运营/专家/团队三视角 + 深链
 */
(function (global) {
  var KEY = 'proto_ops_messages';

  var DEFAULT_MESSAGES = [
    { id: 'msg_001', type: 'todo', role: 'ops', title: '待审核专家任务', body: '分析高峰延迟根因 — 李专家已提交', at: '2026-06-04 09:20', read: false, link: { page: '08-audit-expert.html', params: { taskId: 'task_002' } } },
    { id: 'msg_002', type: 'todo', role: 'expert', title: '新任务已分派', body: '用户反馈：模型回答与文档不一致', at: '2026-06-04 08:45', read: false, link: { page: '12-expert-task-detail.html', params: { taskId: 'task_001' } } },
    { id: 'msg_003', type: 'announce', role: 'all', title: '平台维护通知', body: '6 月 5 日 02:00–04:00 例行维护', at: '2026-06-03 18:00', read: true },
    { id: 'msg_004', type: 'todo', role: 'team', title: '团队待处理反馈', body: '模型团队有 2 条反馈待处理', at: '2026-06-04 10:05', read: false, link: { page: '11-user-feedback-detail.html', params: { id: 'fb_001' } } },
    { id: 'msg_005', type: 'todo', role: 'ops', title: '新用户反馈', body: '夜间模式对比度不足 — 待分派', at: '2026-06-04 11:50', read: false, link: { page: '11-user-feedback-detail.html', params: { id: 'fb_008' } } },
    { id: 'msg_006', type: 'todo', role: 'expert', title: '公共任务池更新', body: '紧急：生产环境接口超时', at: '2026-06-04 07:30', read: false, link: { page: '12-expert-workbench.html', params: {} } },
    { id: 'msg_007', type: 'announce', role: 'team', title: '团队周报提醒', body: '请于周五前提交本周处理摘要', at: '2026-06-02 09:00', read: true },
    { id: 'msg_008', type: 'todo', role: 'team', title: '权限变更待确认', body: '新增开发者账号待团队负责人确认', at: '2026-06-03 15:20', read: false, link: { page: '13-permission-mgmt.html', params: {} } }
  ];

  var ROLE_HEADERS = {
    ops: '（运营）待办与公告',
    expert: '（专家）待办与公告',
    team: '（团队）待办与公告'
  };

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(KEY, JSON.stringify(DEFAULT_MESSAGES)); } catch (e2) {}
    return DEFAULT_MESSAGES.slice();
  }

  function save(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function unreadCount(role) {
    return load().filter(function (m) {
      if (m.read) return false;
      return m.role === role || m.role === 'all';
    }).length;
  }

  function filterForRole(items, role, tab) {
    return items.filter(function (m) {
      if (m.type !== tab) return false;
      if (m.role === 'all') return true;
      if (role === 'ops') return m.role === 'ops' || m.role === 'team';
      return m.role === role;
    });
  }

  function ensureDrawerDom() {
    if (document.getElementById('opsMessageDrawer')) return;
    var html =
      '<div class="drawer-overlay hidden" id="opsMessageDrawer">' +
      '  <div class="drawer-panel">' +
      '    <div class="drawer-head">' +
      '      <h3 id="opsMessageDrawerTitle">消息中心</h3>' +
      '      <button type="button" class="icon-btn" data-close-drawer="opsMessageDrawer">✕</button>' +
      '    </div>' +
      '    <div class="drawer-tabs" id="opsMessageTabs">' +
      '      <button type="button" class="active" data-msg-tab="todo">待办</button>' +
      '      <button type="button" data-msg-tab="announce">公告</button>' +
      '    </div>' +
      '    <div class="drawer-body" id="opsMessageBody"></div>' +
      '  </div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('opsMessageDrawer').addEventListener('click', function (e) {
      if (e.target.id === 'opsMessageDrawer') closeDrawer();
    });
    document.querySelector('[data-close-drawer="opsMessageDrawer"]').addEventListener('click', closeDrawer);
    document.querySelectorAll('#opsMessageTabs [data-msg-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#opsMessageTabs [data-msg-tab]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderList(btn.getAttribute('data-msg-tab'));
      });
    });
  }

  function openDrawer() {
    ensureDrawerDom();
    var role = global.OpsShell ? OpsShell.getRole() : 'ops';
    var titleEl = document.getElementById('opsMessageDrawerTitle');
    if (titleEl) titleEl.textContent = ROLE_HEADERS[role] || '消息中心';
    document.getElementById('opsMessageDrawer').classList.remove('hidden');
    renderList('todo');
  }

  function closeDrawer() {
    var el = document.getElementById('opsMessageDrawer');
    if (el) el.classList.add('hidden');
  }

  function navigateMessage(item) {
    if (!item.link || !item.link.page) {
      if (global.Proto && Proto.toast) Proto.toast('已读：' + item.title);
      return;
    }
    closeDrawer();
    var url = global.OpsShell ? OpsShell.href(item.link.page, item.link.params || {}) : item.link.page;
    window.location.href = url;
  }

  function renderList(tab) {
    var body = document.getElementById('opsMessageBody');
    if (!body) return;
    var role = global.OpsShell ? OpsShell.getRole() : 'ops';
    var items = filterForRole(load(), role, tab);
    if (!items.length) {
      body.innerHTML = '<div class="empty-state" style="border:none;padding:32px 0;">暂无' + (tab === 'todo' ? '待办' : '公告') + '</div>';
      return;
    }
    body.innerHTML = items.map(function (m) {
      var linkHint = m.link ? ' <span style="color:var(--primary);font-size:11px;">→ 前往处理</span>' : '';
      return '<div class="drawer-item' + (m.read ? '' : ' unread') + '" data-msg-id="' + m.id + '" role="button" tabindex="0">' +
        '<div class="di-title">' + m.title + linkHint + '</div>' +
        '<div class="di-meta">' + m.body + ' · ' + m.at + '</div></div>';
    }).join('');
    body.querySelectorAll('[data-msg-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-msg-id');
        var list = load();
        var item = list.find(function (x) { return x.id === id; });
        if (!item) return;
        item.read = true;
        save(list);
        row.classList.remove('unread');
        updateBadge();
        navigateMessage(item);
      });
    });
  }

  function updateBadge() {
    var role = global.OpsShell ? OpsShell.getRole() : 'ops';
    var n = unreadCount(role);
    document.querySelectorAll('.topbar-bell').forEach(function (bell) {
      var dot = bell.querySelector('.badge-dot');
      if (n > 0) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'badge-dot';
          bell.appendChild(dot);
        }
      } else if (dot) {
        dot.remove();
      }
    });
  }

  function wireBellButtons() {
    document.querySelectorAll('.topbar-bell button, button[data-ops-bell]').forEach(function (btn) {
      if (btn.dataset.bellWired) return;
      btn.dataset.bellWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer();
      });
    });
  }

  function mount() {
    ensureDrawerDom();
    wireBellButtons();
    updateBadge();
  }

  function pushTodo(opts) {
    opts = opts || {};
    var list = load();
    list.unshift({
      id: 'msg_' + Date.now().toString(36),
      type: 'todo',
      role: opts.role || 'ops',
      title: opts.title || '新待办',
      body: opts.body || '',
      at: new Date().toLocaleString('zh-CN', { hour12: false }),
      read: false,
      link: opts.link || null
    });
    save(list);
    updateBadge();
  }

  global.OpsMessageCenter = {
    load: load,
    save: save,
    mount: mount,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    unreadCount: unreadCount,
    renderList: renderList,
    pushTodo: pushTodo
  };
})(window);
