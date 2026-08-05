/**
 * 专家工作台与专家任务审核
 */
(function (global) {
  var TASK_KEY = 'proto_ops_tasks';
  var AUDIT_KEY = 'proto_ops_expert_audit';

  var PORTAL_DEMO_TASK = {
    id: 'task_ewb_demo',
    title: '模型回答错误',
    fullTitle: '模型回答错误修正 - 语义理解偏离',
    feedbackType: '答案不正确',
    priority: 'P0',
    priorityLabel: '高',
    rewardPoints: 30,
    claimMethod: '自行领取',
    status: 'in_progress',
    pool: 'assigned',
    urgent: false,
    public: false,
    team: '模型团队',
    deadline: '2026-05-31',
    expert: '当前专家',
    sessionId: '#QX-772',
    feedbackText: '模型在深海钻完井场景下混淆了压力与温度的逻辑，将 psi 用于温度、°C 用于压力，导致风险评估结论错误。',
    correctionDraft: '在 3000m 以深深海钻完井作业中，需分别评估环空压力（psi）与井筒温度（°C）对套管与封隔器的影响。压力评估应依据设计最大关井压力；温度评估应结合地热梯度与循环冷却效应，二者不可互换单位。',
    attachments: [{ name: 'DeepSea_Drilling_Specs_v4.pdf', size: '2.4 MB' }],
    qaThread: [
      { role: 'ai', text: '深海钻完井作业需遵循 QHSE 与钻完井技术规范，作业前须完成 JSA 与风险评估。' },
      { role: 'user', text: '3000m 以深深海钻完井有哪些主要风险？' },
      { role: 'ai', text: '主要风险包括井控失效、高压高温对套管的影响、以及远程后勤保障不足等。' },
      { role: 'user', text: '请给出压力与温度方面的具体风险评估标准。' },
      {
        role: 'ai',
        text: '温度方面建议控制在 85 psi 以内，压力方面建议不超过 120°C。',
        error: '逻辑错误：将 psi（压力单位）用于温度，将 °C（温度单位）用于压力。'
      }
    ]
  };

  var DEFAULT_TASKS = [
    Object.assign({}, PORTAL_DEMO_TASK),
    {
      id: 'task_001', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P0', priorityLabel: '高', rewardPoints: 30, claimMethod: '自行领取',
      status: 'in_progress', pool: 'assigned', urgent: false, public: false,
      team: '模型团队', deadline: '2026-05-31', expert: '李专家'
    },
    {
      id: 'task_002', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P1', priorityLabel: '中', rewardPoints: 20, claimMethod: '指定任务',
      status: 'open', pool: 'public', urgent: true, public: true,
      team: '平台团队', deadline: '2026-05-31', expert: ''
    },
    {
      id: 'task_003', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P2', priorityLabel: '低', rewardPoints: 10, claimMethod: '自行领取',
      status: 'done', pool: 'assigned', urgent: false, public: false,
      team: '应用团队', deadline: '2026-05-31', expert: '王专家'
    },
    {
      id: 'task_004', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P0', priorityLabel: '高', rewardPoints: 30, claimMethod: '指定任务',
      status: 'in_progress', pool: 'assigned', urgent: false, public: false,
      team: '应用团队', deadline: '2026-05-31', expert: '当前专家'
    },
    {
      id: 'task_005', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P1', priorityLabel: '中', rewardPoints: 20, claimMethod: '自行领取',
      status: 'open', pool: 'public', urgent: true, public: true,
      team: '平台团队', deadline: '2026-05-31', expert: ''
    },
    {
      id: 'task_006', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P2', priorityLabel: '低', rewardPoints: 10, claimMethod: '指定任务',
      status: 'done', pool: 'assigned', urgent: false, public: false,
      team: '模型团队', deadline: '2026-05-31', expert: '赵专家'
    },
    {
      id: 'task_007', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P0', priorityLabel: '高', rewardPoints: 30, claimMethod: '自行领取',
      status: 'in_progress', pool: 'assigned', urgent: false, public: false,
      team: '模型团队', deadline: '2026-05-31', expert: '当前专家'
    },
    {
      id: 'task_008', title: '模型回答错误', fullTitle: '模型回答错误', feedbackType: '答案不正确',
      priority: 'P1', priorityLabel: '中', rewardPoints: 20, claimMethod: '自行领取',
      status: 'open', pool: 'public', urgent: false, public: true,
      team: '模型团队', deadline: '2026-05-31', expert: ''
    }
  ];

  var DEFAULT_AUDIT = [
    { id: 'task_002', title: '分析高峰延迟根因', expert: '李专家', submittedAt: '2026-06-04 10:30', status: 'pending', summary: '已完成根因分析：ERP 接口超时导致预算校验失败' }
  ];

  var poolFilter = 'all';
  var portalFilters = { priority: 'all', claim: 'all' };

  function isUserPortal() {
    return document.body && document.body.getAttribute('data-portal-surface') === 'user';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function loadTasks() {
    try {
      var raw = sessionStorage.getItem(TASK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(TASK_KEY, JSON.stringify(DEFAULT_TASKS)); } catch (e2) {}
    return DEFAULT_TASKS.slice();
  }

  function saveTasks(list) {
    try { sessionStorage.setItem(TASK_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function taskById(id) {
    var t = loadTasks().find(function (x) { return x.id === id; });
    if (t) return t;
    if (id === PORTAL_DEMO_TASK.id || !id) return Object.assign({}, PORTAL_DEMO_TASK);
    return loadTasks()[0] || Object.assign({}, PORTAL_DEMO_TASK);
  }

  function loadAudit() {
    try {
      var raw = sessionStorage.getItem(AUDIT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(AUDIT_KEY, JSON.stringify(DEFAULT_AUDIT)); } catch (e2) {}
    return DEFAULT_AUDIT.slice();
  }

  function saveAudit(list) {
    try { sessionStorage.setItem(AUDIT_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function addToAudit(task) {
    var list = loadAudit();
    if (list.some(function (x) { return x.id === task.id; })) return;
    list.push({
      id: task.id,
      title: task.fullTitle || task.title,
      expert: task.expert || '当前专家',
      submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'pending',
      summary: '任务已完成，待运营审核（原型模拟）'
    });
    saveAudit(list);
  }

  function statusTag(status) {
    var map = {
      open: ['待领取', 'tag-warn'],
      in_progress: ['进行中', 'tag-info'],
      done: ['已完成', 'tag-ok'],
      pending: ['待审核', 'tag-review']
    };
    return map[status] || map.open;
  }

  function priorityTag(priority, label) {
    var cls = priority === 'P0' ? 'ops-ewb-p0' : priority === 'P1' ? 'ops-ewb-p1' : 'ops-ewb-p2';
    return '<span class="ops-ewb-priority ' + cls + '">' + escapeHtml(priority) + '（' + escapeHtml(label || '') + '）</span>';
  }

  function portalListTasks() {
    return loadTasks().filter(function (t) {
      if (t.status !== 'in_progress') return false;
      if (portalFilters.priority !== 'all' && t.priority !== portalFilters.priority) return false;
      if (portalFilters.claim === 'self' && t.claimMethod !== '自行领取') return false;
      if (portalFilters.claim === 'assigned' && t.claimMethod !== '指定任务') return false;
      return true;
    });
  }

  function renderPortalTaskRows(tasks) {
    if (!tasks.length) return '';
    return tasks.map(function (t) {
      return '<tr data-task-id="' + escapeHtml(t.id) + '">' +
        '<td><strong>' + escapeHtml(t.title || t.fullTitle) + '</strong></td>' +
        '<td>' + escapeHtml(t.feedbackType || '—') + '</td>' +
        '<td>' + priorityTag(t.priority, t.priorityLabel) + '</td>' +
        '<td>' + escapeHtml(String(t.rewardPoints != null ? t.rewardPoints : '—')) + '</td>' +
        '<td>' + escapeHtml(t.claimMethod || '—') + '</td>' +
        '<td style="color:var(--text-muted);">' + escapeHtml(t.deadline || '—') + '</td>' +
        '<td><button type="button" class="btn btn-sm btn-ghost" data-row-menu title="更多">⋯</button></td>' +
      '</tr>';
    }).join('');
  }

  function wirePortalContextMenus(tbody) {
    if (!tbody || !global.OpsContextMenu) return;
    tbody.querySelectorAll('[data-task-id]').forEach(function (row) {
      var id = row.getAttribute('data-task-id');
      OpsContextMenu.wireRowActions(row, function () {
        return [
          { label: '做任务', onClick: function () { window.location.href = OpsShell.href('task-detail.html', { taskId: id }); } },
          { label: '取消领取', onClick: function () { cancelClaimTask(id); } }
        ];
      });
    });
  }

  function cancelClaimTask(id) {
    var t = taskById(id);
    if (!t || t.status !== 'in_progress') {
      if (global.Proto && Proto.toast) Proto.toast('当前任务不可取消领取');
      return;
    }
    var list = loadTasks().map(function (task) {
      if (task.id !== id) return task;
      return Object.assign({}, task, {
        status: 'open',
        expert: '',
        pool: 'public',
        claimMethod: task.claimMethod || '自行领取'
      });
    });
    saveTasks(list);
    if (global.Proto && Proto.toast) Proto.toast('已取消领取');
    renderPortalList();
  }

  function renderPortalList() {
    var tbody = document.getElementById('expertPortalTasksBody');
    if (!tbody) return;
    var tasks = portalListTasks();
    tbody.innerHTML = renderPortalTaskRows(tasks) ||
      '<tr><td colspan="7" class="empty-state" style="border:none;">暂无进行中的任务</td></tr>';
    wirePortalContextMenus(tbody);
  }

  function initPortalWorkbenchPage() {
    renderPortalList();
    var bar = document.getElementById('ewbFilterBar');
    if (bar && !bar.dataset.wired) {
      bar.dataset.wired = '1';
      var pri = document.getElementById('ewbFilterPriority');
      var claim = document.getElementById('ewbFilterClaim');
      var refresh = document.getElementById('ewbFilterRefresh');
      if (pri) pri.addEventListener('change', function () {
        portalFilters.priority = pri.value;
        renderPortalList();
      });
      if (claim) claim.addEventListener('change', function () {
        portalFilters.claim = claim.value;
        renderPortalList();
      });
      if (refresh) refresh.addEventListener('click', function () {
        renderPortalList();
        if (global.Proto && Proto.toast) Proto.toast('列表已刷新');
      });
    }
  }

  function renderQaThread(thread) {
    if (!thread || !thread.length) return '<p class="ops-ewb-muted">暂无关联问答</p>';
    return thread.map(function (msg) {
      var roleLabel = msg.role === 'user' ? '用户' : '敖钦·智能助手';
      var err = msg.error
        ? '<div class="ops-ewb-error-note"><span aria-hidden="true">⚠</span> ' + escapeHtml(msg.error) + '</div>'
        : '';
      var cls = msg.error ? ' ops-ewb-qa-bubble is-error' : ' ops-ewb-qa-bubble';
      return '<div class="' + cls.trim() + '">' +
        '<strong>' + escapeHtml(roleLabel) + '</strong>' +
        '<p>' + escapeHtml(msg.text) + '</p>' + err +
      '</div>';
    }).join('');
  }

  function renderContextFlow(thread) {
    if (!thread || !thread.length) return '';
    return thread.map(function (msg) {
      var isUser = msg.role === 'user';
      var err = msg.error
        ? '<div class="ops-ewb-error-note"><span aria-hidden="true">⚠</span> ' + escapeHtml(msg.error) + '</div>'
        : '';
      return '<article class="ops-ewb-context-msg ' + (isUser ? 'is-user' : 'is-ai') + (msg.error ? ' is-error' : '') + '">' +
        '<div class="ops-ewb-context-avatar" aria-hidden="true">' + (isUser ? '👤' : 'AI') + '</div>' +
        '<div class="ops-ewb-context-body"><p>' + escapeHtml(msg.text) + '</p>' + err + '</div>' +
      '</article>';
    }).join('');
  }

  function fillPortalTaskDetail(t) {
    if (!t) return;
    var demo = Object.assign({}, PORTAL_DEMO_TASK, t);
    var titleEl = document.getElementById('taskTitle');
    if (titleEl) titleEl.textContent = demo.fullTitle || demo.title;
    var bc = document.getElementById('breadcrumbCurrent');
    if (bc) bc.textContent = demo.fullTitle || demo.title;
    var badges = document.getElementById('taskBadges');
    if (badges) {
      badges.innerHTML =
        '<span class="tag tag-ok">' + escapeHtml(demo.feedbackType || '答案不正确') + '</span>' +
        '<span class="tag tag-info">' + escapeHtml(statusTag(demo.status)[0]) + '</span>';
    }
    var meta = document.getElementById('taskMeta');
    if (meta) {
      meta.innerHTML =
        '<span>优先级：' + priorityTag(demo.priority, demo.priorityLabel) + '</span>' +
        '<span>奖励积分：' + escapeHtml(String(demo.rewardPoints)) + ' 分</span>' +
        '<span>截止时间：' + escapeHtml(demo.deadline) + '</span>';
    }
    var fb = document.getElementById('taskFeedbackText');
    if (fb) fb.textContent = demo.feedbackText || '—';
    var sid = document.getElementById('taskSessionId');
    if (sid) sid.textContent = demo.sessionId || '';
    var qa = document.getElementById('taskQaThread');
    if (qa) qa.innerHTML = renderQaThread(demo.qaThread);
    var draft = document.getElementById('taskCorrectionDraft');
    if (draft) draft.value = demo.correctionDraft || '';
    var attach = document.getElementById('taskAttachments');
    if (attach) {
      attach.innerHTML = (demo.attachments || []).map(function (f) {
        return '<div class="ops-ewb-file-card">' +
          '<span class="ops-ewb-file-icon" aria-hidden="true">📄</span>' +
          '<div><strong>' + escapeHtml(f.name) + '</strong><small>' + escapeHtml(f.size || '') + '</small></div>' +
        '</div>';
      }).join('');
    }
    var upload = document.getElementById('taskUploadZone');
    if (upload && !upload.dataset.wired) {
      upload.dataset.wired = '1';
      upload.addEventListener('click', function () {
        if (global.Proto && Proto.toast) Proto.toast('上传附件（演示占位）');
      });
    }
  }

  function fillPortalContext(t) {
    var demo = Object.assign({}, PORTAL_DEMO_TASK, t);
    var sid = document.getElementById('contextSessionId');
    if (sid) sid.textContent = demo.sessionId || '';
    var chat = document.getElementById('contextChat');
    if (chat) chat.innerHTML = renderContextFlow(demo.qaThread);
  }

  function mineTasks(subtab) {
    var mine = loadTasks().filter(function (t) { return t.status !== 'open' || t.expert; });
    if (subtab === 'in_progress') return mine.filter(function (t) { return t.status === 'in_progress'; });
    if (subtab === 'done') return mine.filter(function (t) { return t.status === 'done'; });
    return mine;
  }

  function poolTasks() {
    var pool = loadTasks().filter(function (t) { return t.pool === 'public' && t.status === 'open'; });
    if (poolFilter === 'urgent') return pool.filter(function (t) { return t.urgent; });
    if (poolFilter === 'public') return pool.filter(function (t) { return t.public; });
    return pool;
  }

  function renderTaskRows(tasks, mode) {
    if (!tasks.length) return '';
    return tasks.map(function (t) {
      var st = statusTag(t.status);
      var actions = [];
      if (mode === 'mine') {
        if (t.status === 'in_progress') {
          actions.push('<a href="' + OpsShell.href('12-expert-task-detail.html', { taskId: t.id }) + '" class="btn btn-sm btn-primary">做任务</a>');
        }
        actions.push('<button type="button" class="btn btn-sm btn-ghost" data-row-menu title="更多">⋯</button>');
      } else if (mode === 'pool') {
        actions.push('<button type="button" class="btn btn-sm btn-primary" data-claim-task="' + t.id + '">领取任务</button>');
        actions.push('<a href="' + OpsShell.href('12-expert-task-view.html', { taskId: t.id }) + '" class="btn btn-sm">查看</a>');
      }
      return '<tr data-task-id="' + t.id + '" data-task-mode="' + mode + '"><td><strong>' + t.title + '</strong>' +
        (t.urgent ? ' <span class="tag tag-danger">紧急</span>' : '') +
        (t.public ? ' <span class="tag tag-info">公共</span>' : '') + '</td>' +
        '<td>' + t.team + '</td>' +
        '<td><span class="tag ' + st[1] + '">' + st[0] + '</span></td>' +
        '<td style="color:var(--text-muted);">' + (t.deadline || '—') + '</td>' +
        '<td class="ops-inline-actions">' + actions.join(' ') + '</td></tr>';
    }).join('');
  }

  function wireTaskContextMenus(tbody, mode) {
    if (!tbody || !global.OpsContextMenu) return;
    tbody.querySelectorAll('[data-task-id]').forEach(function (row) {
      var id = row.getAttribute('data-task-id');
      OpsContextMenu.wireRowActions(row, function () {
        var t = taskById(id);
        if (!t) return [];
        if (mode === 'mine') {
          return [
            { label: '做任务', onClick: function () { window.location.href = OpsShell.href('12-expert-task-detail.html', { taskId: id }); } },
            { label: '查看上下文', onClick: function () { window.location.href = OpsShell.href('12-expert-context.html', { taskId: id }); } },
            { label: '申请延时', onClick: function () { OpsDispatch.openDelay(); } }
          ];
        }
        return [
          { label: '查看详情', onClick: function () { window.location.href = OpsShell.href('12-expert-task-view.html', { taskId: id }); } }
        ];
      });
    });
  }

  function renderMyTasks(subtab) {
    var tbody = document.getElementById('expertMyTasksBody');
    if (!tbody) return;
    var tasks = mineTasks(subtab);
    tbody.innerHTML = renderTaskRows(tasks, 'mine') || '<tr><td colspan="5" class="empty-state" style="border:none;">暂无任务</td></tr>';
    wireTaskContextMenus(tbody, 'mine');
  }

  function renderPool() {
    var tbody = document.getElementById('expertPoolBody');
    if (!tbody) return;
    var tasks = poolTasks();
    tbody.innerHTML = renderTaskRows(tasks, 'pool') || '<tr><td colspan="5" class="empty-state" style="border:none;">任务池为空</td></tr>';
    document.querySelectorAll('[data-claim-task]').forEach(function (btn) {
      if (btn.dataset.claimWired) return;
      btn.dataset.claimWired = '1';
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-claim-task');
        var list = loadTasks().map(function (t) {
          if (t.id !== id) return t;
          return Object.assign({}, t, { status: 'in_progress', expert: '当前专家', pool: 'assigned' });
        });
        saveTasks(list);
        Proto.toast('已领取任务');
        initWorkbenchPage();
      });
    });
  }

  function initWorkbenchPage() {
    OpsShell.initShell({ module: 'expert', subtitle: '专家工作台', tabs: isUserPortal() ? null : '#expertTabs', subtabs: isUserPortal() ? null : '#expertSubTabs' });
    if (isUserPortal()) {
      initPortalWorkbenchPage();
      return;
    }
    OpsDispatch.ensureModals();
    var subtab = 'all';
    var activeSub = document.querySelector('#expertSubTabs [data-ops-subtab].active');
    if (activeSub) subtab = activeSub.getAttribute('data-ops-subtab');
    renderMyTasks(subtab);
    renderPool();

    var poolBar = document.getElementById('poolFilterBar');
    if (poolBar && !poolBar.dataset.wired) {
      poolBar.dataset.wired = '1';
      poolBar.querySelectorAll('[data-pool-filter]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          poolBar.querySelectorAll('[data-pool-filter]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          poolFilter = btn.getAttribute('data-pool-filter');
          renderPool();
        });
      });
    }

    var subTabs = document.getElementById('expertSubTabs');
    if (subTabs && !subTabs.dataset.subRenderWired) {
      subTabs.dataset.subRenderWired = '1';
      subTabs.querySelectorAll('[data-ops-subtab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          renderMyTasks(btn.getAttribute('data-ops-subtab'));
        });
      });
    }
  }

  function fillTaskDetail(id) {
    var t = taskById(id) || loadTasks()[0];
    if (!t) return null;
    if (isUserPortal()) {
      fillPortalTaskDetail(t);
      return t;
    }
    if (document.getElementById('taskTitle')) document.getElementById('taskTitle').textContent = t.title;
    if (document.getElementById('taskTeam')) document.getElementById('taskTeam').textContent = t.team;
    if (document.getElementById('taskDeadline')) document.getElementById('taskDeadline').textContent = t.deadline || '—';
    if (document.getElementById('taskExpert')) document.getElementById('taskExpert').textContent = t.expert || '—';
    if (document.getElementById('taskDesc')) document.getElementById('taskDesc').textContent = '请根据用户反馈与运行日志完成根因分析与修复建议。';
    var stEl = document.getElementById('taskStatus');
    if (stEl) {
      var st = statusTag(t.status);
      stEl.innerHTML = '<span class="tag ' + st[1] + '">' + st[0] + '</span>';
    }
    return t;
  }

  function initTaskDetailPage() {
    OpsShell.initShell({ module: 'expert', subtitle: '做任务' });
    if (!isUserPortal()) OpsDispatch.ensureModals();
    var id = OpsShell.params().get('taskId') || (isUserPortal() ? PORTAL_DEMO_TASK.id : 'task_001');
    fillTaskDetail(id);
    var ctxHref = OpsShell.href(isUserPortal() ? 'context.html' : '12-expert-context.html', { taskId: id });
    var ctxBtn = document.getElementById('btnViewContext');
    if (ctxBtn) ctxBtn.href = ctxHref;
    var wbLink = document.getElementById('breadcrumbWorkbenchLink');
    if (wbLink) wbLink.href = OpsShell.href(isUserPortal() ? 'workbench.html' : '12-expert-workbench.html');
    var taskLink = document.getElementById('breadcrumbTaskLink');
    if (taskLink) taskLink.href = OpsShell.href('task-detail.html', { taskId: id });

    var delayBtn = document.getElementById('btnApplyDelay');
    if (delayBtn) delayBtn.addEventListener('click', function () { OpsDispatch.openDelay(); });
    var deadlineBtn = document.getElementById('btnChangeDeadline');
    if (deadlineBtn) deadlineBtn.addEventListener('click', function () { OpsDispatch.openDeadline(); });
    var completeBtn = document.getElementById('btnCompleteTask');
    if (completeBtn) {
      completeBtn.addEventListener('click', function () {
        var t = taskById(id);
        var list = loadTasks().map(function (task) {
          if (task.id !== id) return task;
          return Object.assign({}, task, { status: 'done' });
        });
        saveTasks(list);
        if (t) {
          addToAudit(Object.assign({}, t, { status: 'done', expert: t.expert || '当前专家' }));
          if (global.OpsFeedbackLoop) {
            var order = OpsFeedbackLoop.createWorkOrderFromTask(id, '专家已完成根因分析，建议回流优化。');
            if (order && Proto) Proto.toast('已生成回流工单 → ' + order.route_label);
          }
        }
        Proto.toast('任务已提交审核');
        if (isUserPortal()) {
          setTimeout(function () { window.location.href = OpsShell.href('workbench.html'); }, 500);
          return;
        }
        setTimeout(function () {
          window.location.href = OpsShell.href('08-audit-expert.html', { taskId: id });
        }, 500);
      });
    }
  }

  function initContextPage() {
    OpsShell.initShell({ module: 'expert', subtitle: '查看上下文' });
    var id = OpsShell.params().get('taskId') || (isUserPortal() ? PORTAL_DEMO_TASK.id : 'task_001');
    var t = taskById(id);
    if (isUserPortal()) {
      fillPortalContext(t);
    } else {
      fillTaskDetail(id);
      document.getElementById('contextChat').innerHTML =
        '<div class="card" style="padding:16px;margin-bottom:12px;background:var(--bg-page);"><strong>用户</strong><p style="margin-top:8px;font-size:13px;">请帮我查一下采购流程里预算校验失败的原因</p></div>' +
        '<div class="card" style="padding:16px;margin-bottom:12px;"><strong>智能体</strong><p style="margin-top:8px;font-size:13px;">根据日志，预算校验失败是因为 ERP 接口返回超时，建议检查网络连通性。</p></div>' +
        '<div class="card" style="padding:16px;"><strong>系统日志</strong><p style="margin-top:8px;font-size:12px;color:var(--text-muted);font-family:monospace;">[ERROR] erp.budget.validate timeout after 30000ms</p></div>';
    }
    var wbLink = document.getElementById('breadcrumbWorkbenchLink');
    var taskLink = document.getElementById('breadcrumbTaskLink');
    var backBtn = document.getElementById('btnContextBack');
    if (wbLink) wbLink.href = OpsShell.href(isUserPortal() ? 'workbench.html' : '12-expert-workbench.html');
    if (taskLink) taskLink.href = OpsShell.href(isUserPortal() ? 'task-detail.html' : '12-expert-task-detail.html', { taskId: id });
    if (backBtn) backBtn.href = OpsShell.href('task-detail.html', { taskId: id });
  }

  function initTaskViewPage() {
    if (isUserPortal()) {
      var portalId = OpsShell.params().get('taskId') || PORTAL_DEMO_TASK.id;
      window.location.replace(OpsShell.href('task-detail.html', { taskId: portalId }));
      return;
    }
    OpsShell.initShell({ module: 'expert', subtitle: '查看任务' });
    var id = OpsShell.params().get('taskId') || 'task_002';
    fillTaskDetail(id);
    var note = document.getElementById('opsViewNote');
    if (note) {
      note.textContent = isUserPortal()
        ? '只读查看任务信息与分派状态'
        : '运营视角只读查看任务详情与分派状态';
    }
    var wbLink = document.getElementById('breadcrumbWorkbenchLink');
    if (wbLink) wbLink.href = OpsShell.href(isUserPortal() ? 'workbench.html' : '12-expert-workbench.html');
  }

  function renderAuditExpertLink() {
    var q = loadAudit();
    var el = document.getElementById('expertAuditLink');
    if (!el || !q.length) return;
    el.href = OpsShell.href('08-audit-expert.html', { taskId: q[0].id });
    el.style.display = 'inline-flex';
  }

  global.OpsExpertWorkbench = {
    loadTasks: loadTasks,
    saveTasks: saveTasks,
    loadAudit: loadAudit,
    saveAudit: saveAudit,
    addToAudit: addToAudit,
    taskById: taskById,
    initWorkbenchPage: initWorkbenchPage,
    initTaskDetailPage: initTaskDetailPage,
    initContextPage: initContextPage,
    initTaskViewPage: initTaskViewPage,
    renderAuditExpertLink: renderAuditExpertLink
  };
})(window);
