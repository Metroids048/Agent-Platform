/**
 * 用户端消息中心 — 公告 / 待办 / 意见箱（Figma 376:984 / 377:1665）
 * 消息中心 z-index 1300；提建议/详情叠层 z-index 1400，保留 Tab 标签与 p2 表单文案。
 */
(function (global) {
  var KEY = 'proto_user_messages';
  var FEEDBACK_KEY = 'proto_user_feedback_box';
  var ANNOUNCE_RULE_KEY = 'proto_user_announce_rule';
  var ANNOUNCE_STATE_KEY = 'proto_user_announce_state';
  var stackWired = false;

  var DEFAULT_TODOS = [
    {
      id: 'utodo_001',
      type: 'todo',
      tag: '专家任务',
      title: '专家任务审核',
      body: '专家任务【模型输出错误修正】处理完毕，待审核',
      at: '2026-05-28 12:00:00',
      read: false,
      link: { page: '专家工作台/workbench.html', params: { taskId: 'task_002' } }
    },
    {
      id: 'utodo_002',
      type: 'todo',
      tag: '专家任务',
      title: '申请延时处理',
      body: '智能体 #402 输出语义明显错误的内容，需要更新知库，请求延长任务处理时间。',
      at: '2026-05-28 12:00:00',
      read: false,
      link: { page: '专家工作台/task-detail.html', params: { taskId: 'task_001' } }
    },
    {
      id: 'utodo_003',
      type: 'todo',
      tag: '专家任务',
      title: '申请专家协助',
      body: '用户反馈【模型输出错误】申请专家协助。',
      at: '2026-05-28 12:00:00',
      read: false,
      link: { page: '专家工作台/workbench.html', params: {} }
    }
  ];

  var DEFAULT_ANNOUNCE = [
    {
      id: 'uann_001',
      type: 'announce',
      title: '平台维护通知',
      body: '6 月 5 日 02:00–04:00 例行维护，期间对话可能短暂不可用。',
      at: '2026-06-03 18:00',
      read: true
    },
    {
      id: 'uann_002',
      type: 'announce',
      title: '新智能体上架',
      body: '企业智能体「钻完井报告助手」已上架，可在智能体中心使用。',
      at: '2026-06-01 10:00',
      read: false
    }
  ];

  var DEFAULT_ANNOUNCE_RULE = {
    mode: 'daily_once',
    version: '2026-06-18',
    title: '公告提醒',
    summary: '前端 2.0 已支持 Markdown 渲染、原文侧栏、笔记沉淀与个人智能体配置。',
    detail: '本次更新重点覆盖 0409 文档中的交互重构：复杂回答预览、查看原文、问题编辑分支、快速定位、用户设置与公告频控。'
  };

  var DEFAULT_FEEDBACK = [
    {
      id: 'ufb_submitted_demo',
      kind: 'feedback',
      title: '您的反馈已收到，我们会尽快处理',
      agent: '敖钦·智能助手',
      feedbackType: '答案不正确',
      content: '模型在回答设备采购流程时遗漏了审批节点说明。',
      at: '2026-06-15',
      status: '已提交'
    },
    {
      id: 'ufb_001',
      kind: 'feedback',
      title: '您提交的问题已修复，感谢反馈帮助我们持续完善',
      agent: '敖钦·智能助手',
      feedbackType: '答案不正确',
      content: '模型在回答关于深海钻井风险评估时，混淆了压力阈值和温度阈值的逻辑关系。',
      at: '2026-06-04',
      status: '已完成'
    },
    {
      id: 'ufb_002',
      kind: 'suggestion',
      title: '已认真查阅您的提议，我们将结合产品规划评估落地',
      content: '建议在对话页增加夜间模式，提升长时间使用舒适度。',
      suggestionType: '体验优化',
      feedbackType: '体验优化',
      agent: '敖钦·智能助手',
      at: '2026-06-04',
      status: '已查看'
    }
  ];

  var activeTab = 'todo';

  function loadTodos() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(KEY, JSON.stringify(DEFAULT_TODOS)); } catch (e2) {}
    return DEFAULT_TODOS.slice();
  }

  function saveTodos(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function loadAnnounce() {
    try {
      var raw = sessionStorage.getItem(KEY + '_announce');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(KEY + '_announce', JSON.stringify(DEFAULT_ANNOUNCE)); } catch (e2) {}
    return DEFAULT_ANNOUNCE.slice();
  }

  function loadFeedbackBox() {
    try {
      var raw = sessionStorage.getItem(FEEDBACK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(DEFAULT_FEEDBACK)); } catch (e2) {}
    return DEFAULT_FEEDBACK.slice();
  }

  function saveFeedbackBox(list) {
    try { sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function readJson(key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    return value;
  }

  function announceRule() {
    return readJson(ANNOUNCE_RULE_KEY, DEFAULT_ANNOUNCE_RULE);
  }

  function announceState() {
    return readJson(ANNOUNCE_STATE_KEY, {
      lastShownAt: '',
      lastShownDate: '',
      shownVersions: [],
      sessionShown: false
    });
  }

  function todayYmd() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function shouldShowAnnouncement(rule, state) {
    if (!rule || !rule.mode) return false;
    if (rule.mode === 'always') return true;
    if (rule.mode === 'first_only') return !state.lastShownAt;
    if (rule.mode === 'session_once') return !state.sessionShown;
    if (rule.mode === 'daily_once') return state.lastShownDate !== todayYmd();
    if (rule.mode === 'after_update') return (state.shownVersions || []).indexOf(rule.version) < 0;
    return false;
  }

  function markAnnouncementShown() {
    var rule = announceRule();
    var state = announceState();
    state.lastShownAt = new Date().toISOString();
    state.lastShownDate = todayYmd();
    state.sessionShown = true;
    if ((state.shownVersions || []).indexOf(rule.version) < 0) {
      state.shownVersions = (state.shownVersions || []).concat(rule.version);
    }
    writeJson(ANNOUNCE_STATE_KEY, state);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function todoUnreadCount() {
    return loadTodos().filter(function (m) { return !m.read; }).length;
  }

  function resolveHref(link) {
    if (!link || !link.page) return '#';
    var base = link.page;
    var inExpert = (global.location.pathname || '').indexOf('专家工作台') >= 0;
    if (inExpert && base.indexOf('专家工作台/') === 0) {
      base = base.slice('专家工作台/'.length);
    } else if (!inExpert && base.indexOf('专家工作台/') !== 0 && base.indexOf('12-expert') === 0) {
      base = '专家工作台/' + base.replace(/^12-expert-/, '').replace('.html', '.html');
    }
    var q = new URLSearchParams(link.params || {});
    var qs = q.toString();
    return base + (qs ? '?' + qs : '');
  }

  function ensureStackModalsDom() {
    if (document.getElementById('userSuggestModal') && document.getElementById('userSuggestImageInput')) return;
    var oldSuggest = document.getElementById('userSuggestModal');
    var oldDetail = document.getElementById('userFeedbackDetailModal');
    if (oldSuggest) oldSuggest.remove();
    if (oldDetail) oldDetail.remove();
    stackWired = false;

    var suggestFormHtml = global.UserFeedbackForm
      ? UserFeedbackForm.markup({
          hint: '',
          placeholder: '请描述你的建议，我们会认真查阅…',
          textId: UserFeedbackForm.SUGGEST.textId,
          fileId: UserFeedbackForm.SUGGEST.fileId,
          listId: UserFeedbackForm.SUGGEST.listId
        })
      : '<textarea class="textarea" id="userSuggestText" rows="6" placeholder="请描述你的建议，我们会认真查阅…"></textarea>';

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay hidden aioq-portal-stack-overlay" id="userSuggestModal">' +
      '  <div class="modal-box modal-md aioq-stack-modal">' +
      '    <div class="aioq-stack-modal-head">' +
      '      <button type="button" class="aioq-msg-back-btn" data-close-suggest aria-label="返回">←</button>' +
      '      <h2>提建议</h2>' +
      '      <span class="aioq-stack-head-spacer" aria-hidden="true"></span>' +
      '    </div>' +
      '    <div class="modal-body">' + suggestFormHtml + '</div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" data-close-suggest>取消</button>' +
      '      <button type="button" class="btn btn-primary" id="btnSubmitSuggest">提交</button>' +
      '    </div></div></div>' +
      '<div class="modal-overlay hidden aioq-portal-stack-overlay" id="userFeedbackDetailModal">' +
      '  <div class="modal-box modal-md aioq-stack-modal">' +
      '    <div class="aioq-stack-modal-head">' +
      '      <button type="button" class="aioq-msg-back-btn" id="btnCloseFeedbackDetail" aria-label="返回">←</button>' +
      '      <h2 id="userFeedbackDetailTitle">意见详情</h2>' +
      '      <span class="aioq-stack-head-spacer" aria-hidden="true"></span>' +
      '    </div>' +
      '    <div class="modal-body aioq-msg-detail-body" id="userFeedbackDetailBody"></div>' +
      '  </div></div>'
    );
  }

  function resetSuggestForm() {
    if (global.UserFeedbackForm) {
      UserFeedbackForm.reset(UserFeedbackForm.SUGGEST);
      return;
    }
    var ta = document.getElementById('userSuggestText');
    if (ta) ta.value = '';
  }

  function wireStackModals() {
    if (stackWired) return;
    stackWired = true;
    ensureStackModalsDom();
    if (global.UserFeedbackForm) UserFeedbackForm.wire(UserFeedbackForm.SUGGEST);

    var suggestOverlay = document.getElementById('userSuggestModal');
    var suggestBox = suggestOverlay && suggestOverlay.querySelector('.modal-box');
    if (suggestOverlay) {
      suggestOverlay.addEventListener('click', function (e) {
        if (e.target.id === 'userSuggestModal') closeSuggestModal();
      });
    }
    if (suggestBox) suggestBox.addEventListener('click', function (e) { e.stopPropagation(); });
    document.querySelectorAll('[data-close-suggest]').forEach(function (btn) {
      btn.addEventListener('click', closeSuggestModal);
    });
    document.getElementById('btnSubmitSuggest').addEventListener('click', submitSuggestion);

    var detailOverlay = document.getElementById('userFeedbackDetailModal');
    var detailBox = detailOverlay && detailOverlay.querySelector('.modal-box');
    if (detailOverlay) {
      detailOverlay.addEventListener('click', function (e) {
        if (e.target.id === 'userFeedbackDetailModal') closeFeedbackDetailModal();
      });
    }
    if (detailBox) detailBox.addEventListener('click', function (e) { e.stopPropagation(); });
    document.getElementById('btnCloseFeedbackDetail').addEventListener('click', closeFeedbackDetailModal);
  }

  function ensureDrawerDom() {
    ensureStackModalsDom();
    wireStackModals();
    ensureAnnouncementModal();

    if (document.getElementById('userMessageDrawer')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay hidden aioq-msg-center-overlay" id="userMessageDrawer">' +
      '  <div class="modal-box aioq-msg-center-modal" role="dialog" aria-labelledby="userMsgCenterTitle" aria-modal="true">' +
      '    <div class="aioq-msg-center-head">' +
      '      <h3 id="userMsgCenterTitle">消息中心</h3>' +
      '      <button type="button" class="icon-btn" data-close-user-msg aria-label="关闭">✕</button>' +
      '    </div>' +
      '    <div class="aioq-msg-center-tabs" id="userMessageTabs">' +
      '      <button type="button" data-user-msg-tab="announce">公告</button>' +
      '      <button type="button" class="active" data-user-msg-tab="todo">待办<span id="userTodoCount"></span></button>' +
      '    </div>' +
      '    <div class="aioq-msg-center-body" id="userMessageBody"></div>' +
      '    <div class="aioq-msg-center-foot">' +
      '      <button type="button" class="btn-link" id="btnMarkAllRead">全部标记已读</button>' +
      '    </div>' +
      '  </div></div>'
    );

    document.getElementById('userMessageDrawer').addEventListener('click', function (e) {
      if (e.target.id === 'userMessageDrawer') closeDrawer();
    });
    var modalBox = document.querySelector('#userMessageDrawer .aioq-msg-center-modal');
    if (modalBox) {
      modalBox.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    document.querySelector('[data-close-user-msg]').addEventListener('click', closeDrawer);
    document.querySelectorAll('#userMessageTabs [data-user-msg-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-user-msg-tab');
        document.querySelectorAll('#userMessageTabs [data-user-msg-tab]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderBody();
      });
    });
    document.getElementById('btnMarkAllRead').addEventListener('click', markAllRead);
  }

  function ensureAnnouncementModal() {
    if (document.getElementById('userAnnouncementModal')) return;
    var rule = announceRule();
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay hidden aioq-msg-center-overlay" id="userAnnouncementModal">' +
      '  <div class="modal-box aioq-msg-center-modal aioq-announce-modal" role="dialog" aria-labelledby="userAnnouncementTitle" aria-modal="true">' +
      '    <div class="aioq-msg-center-head">' +
      '      <h3 id="userAnnouncementTitle">' + escapeHtml(rule.title || '公告提醒') + '</h3>' +
      '      <button type="button" class="icon-btn" id="btnCloseAnnouncement" aria-label="关闭">✕</button>' +
      '    </div>' +
      '    <div class="aioq-msg-center-body">' +
      '      <p class="aioq-announce-summary">' + escapeHtml(rule.summary || '') + '</p>' +
      '      <p class="aioq-announce-detail">' + escapeHtml(rule.detail || '') + '</p>' +
      '      <div class="aioq-announce-meta">' +
      '        <span>频控策略：' + escapeHtml(rule.mode || 'daily_once') + '</span>' +
      '        <span>版本：' + escapeHtml(rule.version || '') + '</span>' +
      '      </div>' +
      '    </div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" id="btnLaterAnnouncement">稍后再看</button>' +
      '      <button type="button" class="btn btn-primary" id="btnReadAnnouncement">我知道了</button>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
    var overlay = document.getElementById('userAnnouncementModal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target.id === 'userAnnouncementModal') closeAnnouncementModal();
      });
    }
    var closeBtn = document.getElementById('btnCloseAnnouncement');
    if (closeBtn) closeBtn.addEventListener('click', closeAnnouncementModal);
    var laterBtn = document.getElementById('btnLaterAnnouncement');
    if (laterBtn) laterBtn.addEventListener('click', closeAnnouncementModal);
    var readBtn = document.getElementById('btnReadAnnouncement');
    if (readBtn) readBtn.addEventListener('click', function () {
      markAnnouncementShown();
      closeAnnouncementModal();
    });
  }

  function openAnnouncementModal() {
    ensureAnnouncementModal();
    var overlay = document.getElementById('userAnnouncementModal');
    if (overlay) overlay.classList.remove('hidden');
  }

  function closeAnnouncementModal() {
    var overlay = document.getElementById('userAnnouncementModal');
    if (overlay) overlay.classList.add('hidden');
  }

  function renderTodoList(body) {
    var items = loadTodos();
    if (!items.length) {
      body.innerHTML = '<div class="empty-state" style="border:none;padding:32px 0;">暂无待办</div>';
      return;
    }
    body.innerHTML = items.map(function (m) {
      return '<div class="aioq-msg-card' + (m.read ? '' : ' unread') + '" data-todo-id="' + m.id + '">' +
        '<div class="aioq-msg-card-main">' +
          '<div class="aioq-msg-card-tags"><span class="aioq-msg-tag">' + escapeHtml(m.tag || '待办') + '</span></div>' +
          '<strong>' + escapeHtml(m.title) + '</strong>' +
          '<p>' + escapeHtml(m.body) + '</p>' +
        '</div>' +
        '<div class="aioq-msg-card-side">' +
          '<small>' + escapeHtml(m.at) + '</small>' +
          (m.link ? '<a href="' + escapeHtml(resolveHref(m.link)) + '" class="btn btn-sm btn-primary" data-todo-action="' + m.id + '">立即处理</a>' : '') +
        '</div></div>';
    }).join('');

    body.querySelectorAll('[data-todo-id]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-todo-action]')) return;
        var id = card.getAttribute('data-todo-id');
        var list = loadTodos();
        var item = list.find(function (x) { return x.id === id; });
        if (item) { item.read = true; saveTodos(list); card.classList.remove('unread'); updateTodoBadge(); }
      });
    });
    body.querySelectorAll('[data-todo-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-todo-action');
        var list = loadTodos();
        var item = list.find(function (x) { return x.id === id; });
        if (item) { item.read = true; saveTodos(list); updateTodoBadge(); }
        closeDrawer();
      });
    });
  }

  function renderAnnounceList(body) {
    var items = loadAnnounce();
    body.innerHTML = items.length
      ? items.map(function (m) {
        return '<div class="aioq-msg-card' + (m.read ? '' : ' unread') + '">' +
          '<div class="aioq-msg-card-main"><strong>' + escapeHtml(m.title) + '</strong><p>' + escapeHtml(m.body) + '</p></div>' +
          '<div class="aioq-msg-card-side"><small>' + escapeHtml(m.at) + '</small></div></div>';
      }).join('')
      : '<div class="empty-state" style="border:none;padding:32px 0;">暂无公告</div>';
  }

  function feedbackStatusBadge(status) {
    var label = status || '—';
    var cls = 'aioq-feedback-status-badge';
    if (label === '已提交') cls += ' aioq-feedback-status-badge--submitted';
    else if (label === '处理中') cls += ' aioq-feedback-status-badge--processing';
    else if (label === '已完成' || label === '已查看') cls += ' aioq-feedback-status-badge--done';
    return '<span class="' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function renderFeedbackList(body) {
    var items = loadFeedbackBox();
    body.innerHTML =
      '<div class="aioq-msg-feedback-actions">' +
      '  <button type="button" class="btn btn-primary btn-sm" id="btnOpenSuggest">提建议</button>' +
      '</div>' +
      (items.length
        ? items.map(function (m) {
          var submittedClass = m.status === '已提交' ? ' is-submitted' : '';
          return '<button type="button" class="aioq-msg-feedback-item' + submittedClass + '" data-fb-id="' + m.id + '">' +
            '<div class="aioq-msg-feedback-item-main">' +
              feedbackStatusBadge(m.status) +
              '<span>' + escapeHtml(m.title) + '</span>' +
            '</div>' +
            '<small>' + escapeHtml(m.at) + '</small></button>';
        }).join('')
        : '<p class="aioq-muted" style="padding:12px 0;">暂无意见记录</p>');

    var suggestBtn = document.getElementById('btnOpenSuggest');
    if (suggestBtn) suggestBtn.addEventListener('click', openSuggestModal);
    body.querySelectorAll('[data-fb-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showFeedbackDetail(btn.getAttribute('data-fb-id'));
      });
    });
  }

  function showFeedbackDetail(id) {
    var item = loadFeedbackBox().find(function (x) { return x.id === id; });
    if (!item) return;
    ensureDrawerDom();
    var body = document.getElementById('userFeedbackDetailBody');
    var title = document.getElementById('userFeedbackDetailTitle');
    if (!body) return;
    var attachHtml = global.UserFeedbackForm && item.attachments && item.attachments.length
      ? UserFeedbackForm.detailAttachmentsHtml(item.attachments)
      : '';
    if (title) title.textContent = item.kind === 'feedback' ? '反馈详情' : '建议详情';
    if (item.kind === 'feedback') {
      body.innerHTML =
        '<p><strong>关联智能体：</strong>' + escapeHtml(item.agent || '—') + '</p>' +
        '<p><strong>反馈内容：</strong>' + escapeHtml(item.content || '') + '</p>' +
        attachHtml +
        '<p><strong>提交时间：</strong>' + escapeHtml(item.at) + '</p>' +
        '<p><strong>状态：</strong>' + escapeHtml(item.status || '—') + '</p>';
    } else {
      body.innerHTML =
        '<p><strong>建议内容：</strong>' + escapeHtml(item.content || item.title) + '</p>' +
        attachHtml +
        '<p><strong>提交时间：</strong>' + escapeHtml(item.at) + '</p>' +
        '<p><strong>状态：</strong>' + escapeHtml(item.status || '—') + '</p>';
    }
    document.getElementById('userFeedbackDetailModal').classList.remove('hidden');
  }

  function closeFeedbackDetailModal() {
    var el = document.getElementById('userFeedbackDetailModal');
    if (el) el.classList.add('hidden');
  }

  function ensureFeedbackDrawerDom() {
    ensureStackModalsDom();
    wireStackModals();
    if (document.getElementById('userFeedbackDrawer')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay hidden aioq-msg-center-overlay" id="userFeedbackDrawer">' +
      '  <div class="modal-box aioq-msg-center-modal" role="dialog" aria-labelledby="userFeedbackTitle" aria-modal="true">' +
      '    <div class="aioq-msg-center-head">' +
      '      <h3 id="userFeedbackTitle">意见箱</h3>' +
      '      <button type="button" class="icon-btn" data-close-user-feedback aria-label="关闭">✕</button>' +
      '    </div>' +
      '    <div class="aioq-msg-center-body" id="userFeedbackBody"></div>' +
      '  </div></div>'
    );
    document.getElementById('userFeedbackDrawer').addEventListener('click', function (e) {
      if (e.target.id === 'userFeedbackDrawer') closeFeedbackDrawer();
    });
    var modalBox = document.querySelector('#userFeedbackDrawer .aioq-msg-center-modal');
    if (modalBox) modalBox.addEventListener('click', function (e) { e.stopPropagation(); });
    document.querySelector('[data-close-user-feedback]').addEventListener('click', closeFeedbackDrawer);
  }

  function isFeedbackDrawerOpen() {
    var el = document.getElementById('userFeedbackDrawer');
    return el && !el.classList.contains('hidden');
  }

  function openFeedbackDrawer() {
    ensureFeedbackDrawerDom();
    document.getElementById('userFeedbackDrawer').classList.remove('hidden');
    var body = document.getElementById('userFeedbackBody');
    if (body) renderFeedbackList(body);
  }

  function closeFeedbackDrawer() {
    closeSuggestModal();
    closeFeedbackDetailModal();
    var el = document.getElementById('userFeedbackDrawer');
    if (el) el.classList.add('hidden');
  }

  function renderBody() {
    var body = document.getElementById('userMessageBody');
    if (!body) return;
    if (activeTab === 'todo') renderTodoList(body);
    else if (activeTab === 'announce') renderAnnounceList(body);
    updateTodoBadge();
  }

  function updateTodoBadge() {
    var n = todoUnreadCount();
    var el = document.getElementById('userTodoCount');
    if (el) el.textContent = n > 0 ? '（' + n + '）' : '';
  }

  function markAllRead() {
    if (activeTab === 'todo') {
      saveTodos(loadTodos().map(function (m) { return Object.assign({}, m, { read: true }); }));
    }
    renderBody();
  }

  function openDrawer(tab) {
    ensureDrawerDom();
    activeTab = tab || 'todo';
    document.querySelectorAll('#userMessageTabs [data-user-msg-tab]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-user-msg-tab') === activeTab);
    });
    document.getElementById('userMessageDrawer').classList.remove('hidden');
    renderBody();
  }

  function closeDrawer() {
    closeSuggestModal();
    closeFeedbackDetailModal();
    var el = document.getElementById('userMessageDrawer');
    if (el) el.classList.add('hidden');
  }

  function openSuggestModal() {
    ensureDrawerDom();
    resetSuggestForm();
    document.getElementById('userSuggestModal').classList.remove('hidden');
    var ta = document.getElementById('userSuggestText');
    if (ta) ta.focus();
  }

  function closeSuggestModal() {
    var el = document.getElementById('userSuggestModal');
    if (el) el.classList.add('hidden');
    resetSuggestForm();
  }

  function submitSuggestion() {
    var data = global.UserFeedbackForm
      ? UserFeedbackForm.collect(UserFeedbackForm.SUGGEST)
      : { text: String((document.getElementById('userSuggestText') || {}).value || '').trim(), images: [] };
    if (global.UserFeedbackForm ? UserFeedbackForm.isEmpty(data) : !data.text) {
      if (global.Proto && Proto.toast) Proto.toast('请填写建议内容或上传图片');
      return;
    }
    var images = (data.images || []).map(function (img) { return { name: img.name }; });
    var titleSeed = data.text || (images[0] && images[0].name) || '建议';
    var list = loadFeedbackBox();
    list.unshift({
      id: 'ufb_' + Date.now().toString(36),
      kind: 'suggestion',
      title: titleSeed.slice(0, 60),
      content: data.text,
      attachments: images,
      at: new Date().toISOString().slice(0, 10),
      status: '已提交'
    });
    saveFeedbackBox(list);
    closeSuggestModal();
    if (global.Proto && Proto.toast) Proto.toast('建议已提交');
    if (isFeedbackDrawerOpen()) {
      var fbBody = document.getElementById('userFeedbackBody');
      if (fbBody) renderFeedbackList(fbBody);
    }
  }

  function pushFeedbackFromChat(payload) {
    payload = payload || {};
    var images = payload.images || [];
    var titleSeed = payload.text || (images[0] && images[0].name) || '对话反馈';
    var list = loadFeedbackBox();
    list.unshift({
      id: 'ufb_' + Date.now().toString(36),
      kind: 'feedback',
      title: titleSeed.slice(0, 60),
      agent: payload.agent || '—',
      content: payload.text || '',
      attachments: images,
      at: new Date().toISOString().slice(0, 10),
      status: '已提交'
    });
    saveFeedbackBox(list);
    updateTodoBadge();
    openFeedbackDrawer();
  }

  function pushTodo(opts) {
    var list = loadTodos();
    list.unshift({
      id: 'utodo_' + Date.now().toString(36),
      type: 'todo',
      tag: opts.tag || '专家任务',
      title: opts.title || '新待办',
      body: opts.body || '',
      at: new Date().toLocaleString('zh-CN', { hour12: false }),
      read: false,
      link: opts.link || null
    });
    saveTodos(list);
    updateTodoBadge();
  }

  function wireFeedbackEntryButtons() {
    document.querySelectorAll('#btnFeedbackBox, [data-user-feedback-box]').forEach(function (btn) {
      if (btn.dataset.feedbackBoxWired) return;
      btn.dataset.feedbackBoxWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openFeedbackDrawer();
      });
    });
  }

  function wireEntryButtons() {
    document.querySelectorAll('#btnMessageCenter, [data-user-message-center]').forEach(function (btn) {
      if (btn.dataset.msgCenterWired) return;
      btn.dataset.msgCenterWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer('todo');
      });
    });
  }

  function mount() {
    ensureDrawerDom();
    wireEntryButtons();
    wireFeedbackEntryButtons();
    updateTodoBadge();
    var rule = announceRule();
    var state = announceState();
    if (shouldShowAnnouncement(rule, state)) {
      openAnnouncementModal();
    }
  }

  global.UserMessageCenter = {
    mount: mount,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    openAnnouncementModal: openAnnouncementModal,
    openFeedbackDrawer: openFeedbackDrawer,
    closeFeedbackDrawer: closeFeedbackDrawer,
    pushFeedbackFromChat: pushFeedbackFromChat,
    pushTodo: pushTodo,
    loadFeedbackBox: loadFeedbackBox
  };
})(window);
