(function (global) {
  var STORE_KEY = 'proto_ops_v11_agents_v4';
  var FILTERS = { type: '', status: '', permission: '', keyword: '' };

  var STATUS_FILTERS = [
    { value: '', label: '全部' },
    { value: 'dev', label: '草稿' },
    { value: 'reviewing', label: '审核中' },
    { value: 'listed', label: '已上架' },
    { value: 'disabled', label: '已停用' },
    { value: 'offline', label: '已下架' },
    { value: 'rejected', label: '已驳回' }
  ];

  var PERMISSION_FILTERS = [
    { value: '', label: '全部' },
    { value: 'private', label: '个人' },
    { value: 'org', label: '组织' },
    { value: 'public', label: '公开' }
  ];

  var STATUS_ORDER = ['dev', 'reviewing', 'listed', 'disabled', 'offline', 'rejected'];

  var STATUS = {
    dev: {
      label: '草稿',
      cls: 'tag-dev',
      order: 1,
      hint: '未对外，配置未完成或驳回后修改中',
      cardActions: '删除'
    },
    published_pending_review: {
      label: '审核中',
      cls: 'tag-review',
      order: 2,
      hint: '已提交发布申请，等审批',
      cardActions: '撤回、删除'
    },
    reviewing: {
      label: '审核中',
      cls: 'tag-review',
      order: 2,
      hint: '已提交发布申请，等审批',
      cardActions: '撤回、删除'
    },
    listed: {
      label: '已上架',
      cls: 'tag-listed',
      order: 3,
      hint: '已对目标范围用户可用',
      cardActions: '停用、下架、权限'
    },
    disabled: {
      label: '已停用',
      cls: 'tag-disabled',
      order: 4,
      hint: '暂停用户访问，版本和范围保留，可再次启用',
      cardActions: '启用、下架、删除'
    },
    offline: {
      label: '已下架',
      cls: 'tag-offline',
      order: 5,
      hint: '已从用户可用入口移除，但历史记录保留',
      cardActions: '重新发布、删除'
    },
    rejected: {
      label: '已驳回',
      cls: 'tag-rejected',
      order: 6,
      hint: '审核未通过，需修改后再发布或删除',
      cardActions: '重新发布、删除'
    }
  };

  var TYPES = {
    qa: '问答型',
    task: '任务型',
    flow: '流程型',
    multi: '多智能体'
  };

  var TYPE_KEYS = Object.keys(TYPES);

  var ICONS = {
    qa: '🤖',
    task: '📄',
    flow: '🛒',
    multi: '🔗'
  };

  var COPY = {
    index: {
      title: '智能体运营',
      desc: '管理智能体从创建、发布审核到运行观察与下架治理的全生命周期。运营平台负责业务状态与访问范围，底层能力配置在开发平台完成。'
    },
    dashboard: {
      title: '运营仪表盘',
      desc: '面向全公司开放的运营可视窗口：汇总运行规模、合规检测与任务调度趋势，辅助日常巡检与运营决策。'
    },
    audit: {
      title: '审核工作台',
      desc: '个人范围免审；组织/公开范围须审核，通过后直接上架。'
    },
    auditReview: {
      title: '审核详情',
      desc: '运营管理员审核发布申请，核对配置摘要后做出审核决定。'
    },
    detail: {
      title: '智能体详情',
      desc: '查看配置摘要、发布候选版本，并维护可见范围。'
    }
  };

  function nowText() {
    return new Date().toLocaleString('zh-CN', { hour12: false });
  }

  function params() {
    return new URLSearchParams(global.location.search || '');
  }

  function pageName() {
    return (global.location.pathname || '').split('/').pop() || 'index.html';
  }

  function href(page, extra) {
    var q = new URLSearchParams();
    Object.keys(extra || {}).forEach(function (key) {
      if (extra[key] != null && extra[key] !== '') q.set(key, extra[key]);
    });
    var s = q.toString();
    return page + (s ? '?' + s : '');
  }

  function rootHref(page, extra) {
    return href(page, extra);
  }

  /** 运营详情统一走 05（基本信息 / 运行数据 / 版本与发布 Tab） */
  function detailPageHref(item, extra) {
    return rootHref('05-agent-detail.html', Object.assign({
      id: item.id,
      name: item.name,
      type: item.type || 'qa'
    }, extra || {}));
  }

  function navigateToAgentDetail(item, extra) {
    if (!item) return;
    syncProtoState(item);
    global.location.href = detailPageHref(item, extra);
  }

  function statusMeta(status) {
    return STATUS[status] || STATUS.dev;
  }

  function displayStatusKey(status) {
    if (status === 'published_pending_review') return 'reviewing';
    return status;
  }

  function statusTag(status) {
    var meta = statusMeta(displayStatusKey(status));
    return '<span class="tag ' + meta.cls + '">' + meta.label + '</span>';
  }

  function permissionBucket(shareMode) {
    if (shareMode === 'public') return 'public';
    if (shareMode === 'org' || shareMode === 'specific') return 'org';
    return 'private';
  }

  function permissionLabel(shareMode) {
    var bucket = permissionBucket(shareMode);
    if (bucket === 'public') return '公开';
    if (bucket === 'org') return '组织';
    return '个人';
  }

  function permissionTag(shareMode) {
    return '<span class="tag tag-perm">' + permissionLabel(shareMode) + '</span>';
  }

  function matchStatusFilter(item, filterValue) {
    if (!filterValue) return true;
    if (filterValue === 'reviewing') {
      return item.status === 'reviewing' || item.status === 'published_pending_review';
    }
    return item.status === filterValue;
  }

  function typeLabel(type) {
    return TYPES[type] || '问答型';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeTargets(targets) {
    if (global.OrgAccessPicker && OrgAccessPicker.normalizeTargets) {
      return OrgAccessPicker.normalizeTargets(targets || []);
    }
    var seen = {};
    return (targets || []).filter(function (item) {
      if (!item || !item.id || seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    }).map(function (item) {
      return Object.assign({ type: 'department', name: item.id, path: '' }, item);
    });
  }

  function permissionSummary(item) {
    if (!item || item.shareMode === 'private') return '仅创建者可见可用';
    if (item.shareMode === 'public') return '全公司可见可用';
    if (global.OrgAccessPicker && OrgAccessPicker.summarize) {
      return OrgAccessPicker.summarize(item.permissionTargets || []);
    }
    var targets = normalizeTargets(item.permissionTargets || []);
    return targets.length ? targets.length + ' 个对象' : '未选择部门/用户';
  }

  function toast(message) {
    var el = document.getElementById('v11Toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'v11Toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function baseAgents() {
    var desc = {
      agt_demo_001: '企业产品咨询、问题解答与工单创建，支持多轮对话和知识库检索。',
      agt_contract: '上传合同文件，识别风险条款并生成审查意见书。',
      agt_medical: '根据主诉进行初步分诊，推荐科室和检查项目。',
      agt_multi: '协同 ERP、CRM 和邮件系统，完成跨平台数据同步。',
      agt_analytics: '用自然语言查询数据并生成图表和洞察报告。',
      agt_procure: '管理采购申请全流程，包含审批、预算校验和供应商匹配。',
      agt_daily: '根据工作记录自动生成日报，支持模板化输出。',
      agt_leave: '处理请假申请、审批流转和假期余额校验。'
    };
    var statusMap = {
      agt_demo_001: 'listed',
      agt_contract: 'disabled',
      agt_medical: 'rejected',
      agt_multi: 'listed',
      agt_analytics: 'dev',
      agt_procure: 'reviewing',
      agt_daily: 'dev',
      agt_leave: 'offline'
    };
    var rejectionMap = {
      agt_medical: '可见范围与合规材料不完整，请补充后重新提交。'
    };
    var list = [];
    var shareMap = {
      agt_demo_001: { shareMode: 'private', applicant: '张三', ownerId: 'user_zhang', permissionTargets: [] },
      agt_contract: { shareMode: 'specific', applicant: '运营', permissionTargets: [{ id: 'team_platform', type: 'department', name: '平台团队' }] },
      agt_medical: { shareMode: 'public', applicant: '运营', permissionTargets: [] },
      agt_multi: { shareMode: 'org', applicant: '运营', permissionTargets: [] }
    };
    if (global.Proto && Array.isArray(Proto.DEMO_LIST_AGENTS)) {
      list = Proto.DEMO_LIST_AGENTS.map(function (item) {
        var share = shareMap[item.id] || { shareMode: 'private', applicant: '运营', permissionTargets: [] };
        return {
          id: item.id,
          name: item.name,
          type: item.type || 'qa',
          desc: desc[item.id] || '智能体原型条目。',
          status: statusMap[item.id] || 'dev',
          source: item.source || 'platform',
          version: item.id === 'agt_daily' ? 'v0.9' : 'v1.0',
          releaseNote: '',
          updatedAt: '2026-06-09 10:00:00',
          listedAt: statusMap[item.id] === 'listed' ? '2026-06-08 17:30:00' : '',
          submittedAt: statusMap[item.id] === 'reviewing' ? '2026-06-09 09:30:00' : '',
          approvedAt: '',
          rejectionReason: rejectionMap[item.id] || '',
          applicant: share.applicant || '运营',
          ownerId: share.ownerId || '',
          shareMode: share.shareMode || 'private',
          permissionTargets: normalizeTargets(share.permissionTargets || [])
        };
      });
    }
    if (global.Proto && Proto.getRegistry) {
      Proto.getRegistry().filter(function (x) { return x.userCreated; }).forEach(function (item) {
        var st = Proto.getState ? Proto.getState(item.id) : {};
        list.unshift({
          id: item.id,
          name: item.name,
          type: item.type || 'qa',
          desc: item.desc || '由运营侧新建或第三方接入的智能体。',
          status: mapProtoStatus(st.status || item.status),
          source: item.source || st.source || 'platform',
          version: st.releaseVersion || st.version || 'v1',
          releaseNote: st.releaseNote || '',
          updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN', { hour12: false }) : nowText(),
          listedAt: st.publishedAt || '',
          submittedAt: st.auditSubmittedAt || '',
          approvedAt: '',
          rejectionReason: st.rejectionReason || '',
          applicant: '运营',
          shareMode: st.shareMode || item.shareMode || st.scope || item.scope || 'private',
          permissionTargets: normalizeTargets(st.permissionTargets || item.permissionTargets || [])
        });
      });
    }
    return list;
  }

  function mapProtoStatus(status) {
    if (status === 'published') return 'listed';
    if (status === 'review') return 'reviewing';
    if (status === 'pending') return 'dev';
    if (status === 'offline') return 'offline';
    if (status === 'rejected') return 'rejected';
    if (status === 'disabled') return 'disabled';
    return 'dev';
  }

  function loadAgents() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var seeded = baseAgents();
    saveAgents(seeded);
    return seeded;
  }

  function saveAgents(list) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function getAgents() {
    return loadAgents().sort(function (a, b) {
      return (statusMeta(a.status).order - statusMeta(b.status).order) ||
        String(a.name).localeCompare(String(b.name), 'zh-CN');
    });
  }

  function getAgent(id) {
    return getAgents().find(function (item) { return item.id === id; }) || getAgents()[0];
  }

  function updateAgent(id, patch) {
    var list = loadAgents();
    var idx = list.findIndex(function (item) { return item.id === id; });
    if (idx < 0) return null;
    list[idx] = Object.assign({}, list[idx], patch || {}, { updatedAt: nowText() });
    saveAgents(list);
    syncProtoState(list[idx]);
    return list[idx];
  }

  function deleteAgent(id) {
    var list = loadAgents().filter(function (item) { return item.id !== id; });
    saveAgents(list);
  }

  function addAgent(data) {
    var id = 'v11_' + Date.now().toString(36);
    var item = Object.assign({
      id: id,
      name: '新建智能体',
      type: 'qa',
      desc: '待完善配置摘要。',
      status: 'dev',
      source: 'platform',
      version: 'v0.1',
      releaseNote: '',
      updatedAt: nowText(),
      listedAt: '',
      submittedAt: '',
      approvedAt: '',
      rejectionReason: '',
      applicant: '运营',
      shareMode: 'private',
      permissionTargets: []
    }, data || {});
    var list = loadAgents();
    list.unshift(item);
    saveAgents(list);
    if (global.Proto && Proto.upsertRegistry && Proto.setState) {
      Proto.upsertRegistry({
        id: item.id,
        name: item.name,
        type: item.type,
        desc: item.desc,
        status: 'dev',
        scope: item.shareMode || 'private',
        shareMode: item.shareMode || 'private',
        permissionTargets: normalizeTargets(item.permissionTargets || []),
        userCreated: true,
        source: item.source
      });
      Proto.setState({
        status: 'dev',
        scope: item.shareMode || 'private',
        desc: item.desc,
        source: item.source,
        shareMode: item.shareMode || 'private',
        permissionTargets: normalizeTargets(item.permissionTargets || [])
      }, item.id);
    }
    return item;
  }

  function syncProtoState(agent) {
    if (!global.Proto || !Proto.setState) return;
    var protoStatus = 'dev';
    if (agent.status === 'listed') protoStatus = 'published';
    else if (agent.status === 'disabled') protoStatus = 'disabled';
    else if (agent.status === 'offline') protoStatus = 'offline';
    else if (agent.status === 'rejected') protoStatus = 'rejected';
    else if (agent.status === 'pending_publish') protoStatus = 'pending';
    else if (agent.status === 'reviewing' || agent.status === 'published_pending_review') protoStatus = 'review';
    Proto.setState({
      status: protoStatus,
      scope: agent.shareMode || (agent.status === 'listed' ? 'public' : 'private'),
      shareMode: agent.shareMode || (agent.status === 'listed' ? 'public' : 'private'),
      permissionTargets: normalizeTargets(agent.permissionTargets || []),
      releaseVersion: agent.version,
      releaseNote: agent.releaseNote || '',
      rejectionReason: agent.rejectionReason || '',
      auditSubmittedAt: agent.submittedAt || ''
    }, agent.id);
  }

  function auditQueueItems() {
    return getAgents().filter(function (item) {
      return ['published_pending_review', 'reviewing'].indexOf(item.status) >= 0;
    });
  }

  function v11ActivePage(active) {
    var pages = {
      index: 'index.html',
      dashboard: 'dashboard.html',
      audit: 'audit-workbench.html',
      auditReview: 'audit-review.html',
      detail: 'agent-detail.html'
    };
    return pages[active] || pages.index;
  }

  function renderPageChrome(active) {
    var main = document.getElementById('pageMain');
    if (!main) return;
    var labels = COPY[active] || COPY.index;
    var headerActions = active === 'index'
      ? '<button type="button" class="btn" data-open-third style="border:1px solid var(--primary);color:var(--primary);background:var(--primary-light);">🔗 第三方接入</button>' +
        '<button type="button" class="btn btn-primary btn-large" data-open-create>＋ 新建智能体</button>'
      : '';
    main.innerHTML =
      '<div class="page-header v11-page-header">' +
        '<div><h1>' + labels.title + '</h1><p>' + labels.desc + '</p></div>' +
        headerActions +
      '</div>' +
      '<div id="pageContent"></div>';
    bindTopActions();
    if (global.OpsShell && OpsShell.initShell) {
      var module = (active === 'audit' || active === 'auditReview') ? 'audit' : (active === 'dashboard' ? 'ops-dash' : 'ops');
      OpsShell.initShell({ module: module, activePage: v11ActivePage(active) });
    }
  }

  function bindTopActions() {
    document.querySelectorAll('[data-open-create]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (global.OpsListModals && OpsListModals.openCreate) OpsListModals.openCreate({});
        else openAgentModal('create');
      });
    });
    document.querySelectorAll('[data-open-third]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (global.OpsListModals && OpsListModals.openThirdParty) OpsListModals.openThirdParty();
        else openAgentModal('third');
      });
    });
  }

  function renderIndex() {
    renderPageChrome('index');
    var content = document.getElementById('pageContent');
    content.innerHTML =
      '<section class="panel toolbar toolbar-p1">' +
        '<div class="filter-dropdowns">' +
          filterDropdown('类型', 'type', [{ value: '', label: '全部' }].concat(TYPE_KEYS.map(function (key) {
            return { value: key, label: TYPES[key] };
          }))) +
          filterDropdown('状态', 'status', STATUS_FILTERS) +
          filterDropdown('权限', 'permission', PERMISSION_FILTERS) +
        '</div>' +
        '<input class="search" id="agentSearch" placeholder="搜索智能体名称或描述">' +
      '</section>' +
      '<section class="agent-grid" id="agentGrid"></section>' +
      '<div class="panel empty" id="agentEmpty">没有匹配的智能体。</div>';
    bindFilters();
    renderAgentGrid();
  }

  function filterDropdown(label, key, options) {
    return '<label class="filter-select-wrap"><span class="filter-label">' + label + '</span>' +
      '<select class="filter-select" data-filter-select="' + key + '">' +
      options.map(function (opt) {
        return '<option value="' + escapeHtml(opt.value) + '">' + escapeHtml(opt.label) + '</option>';
      }).join('') +
      '</select></label>';
  }

  function bindFilters() {
    document.querySelectorAll('[data-filter-select]').forEach(function (select) {
      select.addEventListener('change', function () {
        var key = select.getAttribute('data-filter-select');
        FILTERS[key] = select.value || '';
        renderAgentGrid();
      });
    });
    var search = document.getElementById('agentSearch');
    if (search) {
      search.addEventListener('input', function () {
        FILTERS.keyword = search.value.trim();
        renderAgentGrid();
      });
    }
  }

  function filteredAgents() {
    var kw = FILTERS.keyword.toLowerCase();
    return getAgents().filter(function (item) {
      if (FILTERS.type && item.type !== FILTERS.type) return false;
      if (!matchStatusFilter(item, FILTERS.status)) return false;
      if (FILTERS.permission && permissionBucket(item.shareMode) !== FILTERS.permission) return false;
      if (kw) {
        var hay = [item.name, item.desc, typeLabel(item.type), permissionLabel(item.shareMode)].join(' ').toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
  }

  function renderAgentGrid() {
    var grid = document.getElementById('agentGrid');
    if (!grid) return;
    var list = filteredAgents();
    grid.innerHTML = list.map(agentCard).join('');
    var empty = document.getElementById('agentEmpty');
    if (empty) empty.style.display = list.length ? 'none' : 'block';
    bindCardInteractions();
  }

  function agentCard(item) {
    var menu = cardMenuItems(item);
    var menuBtn = menu.length
      ? '<button type="button" class="card-menu-btn" data-card-menu="' + escapeHtml(item.id) + '" title="操作" aria-label="操作">⋯</button>'
      : '';
    return '<article class="agent-card agent-card-p1" data-agent-id="' + escapeHtml(item.id) + '" data-agent-status="' + escapeHtml(item.status) + '" tabindex="0" role="link">' +
      '<div class="card-head"><div class="card-copy"><h3>' + escapeHtml(item.name) + '</h3><p>' + escapeHtml(item.desc) + '</p></div>' +
      '<div class="agent-icon" aria-hidden="true">' + (ICONS[item.type] || '🤖') + '</div></div>' +
      '<div class="card-foot-p1"><div class="card-tags">' + statusTag(item.status) +
      '<span class="tag tag-type">' + typeLabel(item.type) + '</span>' + permissionTag(item.shareMode) + '</div>' + menuBtn + '</div>' +
    '</article>';
  }

  /** 卡片 ⋯ 菜单（点卡片=查看详情；审核通过/驳回=审核工作台） */
  function cardMenuItems(item) {
    var status = item.status;
    var items = [];
    if (status === 'dev') {
      items.push({ label: '删除', action: 'delete', danger: true });
    } else if (status === 'reviewing' || status === 'published_pending_review') {
      items.push({ label: '撤回', action: 'withdraw' });
      items.push({ label: '删除', action: 'delete', danger: true });
    } else if (status === 'listed') {
      items.push({ label: '停用', action: 'disable' });
      items.push({ label: '下架', action: 'offline', danger: true });
      if (item.source !== 'third_party') {
        items.push({ label: '权限', action: 'permission' });
      }
    } else if (status === 'disabled') {
      items.push({ label: '启用', action: 'enable' });
      items.push({ label: '下架', action: 'offline', danger: true });
      items.push({ label: '删除', action: 'delete', danger: true });
    } else if (status === 'offline') {
      items.push({ label: '重新发布', action: 'publish' });
      items.push({ divider: true });
      items.push({ label: '删除', action: 'delete', danger: true });
    } else if (status === 'rejected') {
      items.push({ label: '重新发布', action: 'publish' });
      items.push({ divider: true });
      items.push({ label: '删除', action: 'delete', danger: true });
    }
    return items;
  }

  function bindCardInteractions() {
    document.querySelectorAll('.agent-card-p1').forEach(function (card) {
      if (card.dataset.wired) return;
      card.dataset.wired = '1';
      var id = card.getAttribute('data-agent-id');
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-card-menu]')) return;
        var item = getAgent(id);
        if (item) navigateToAgentDetail(item);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var item = getAgent(id);
          if (item) navigateToAgentDetail(item);
        }
      });
    });
    document.querySelectorAll('[data-card-menu]').forEach(function (btn) {
      if (btn.dataset.menuWired) return;
      btn.dataset.menuWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-card-menu');
        var item = getAgent(id);
        if (!item) return;
        openCardMenu(btn, item);
      });
    });
  }

  function openCardMenu(anchor, item) {
    closeCardMenu();
    var menu = document.createElement('div');
    menu.className = 'card-menu open';
    menu.id = 'v11CardMenu';
    menu.innerHTML = cardMenuItems(item).map(function (entry) {
      if (entry.divider) return '<hr class="card-menu-divider">';
      var cls = entry.danger ? ' card-menu-item-danger' : '';
      return '<button type="button" class="card-menu-item' + cls + '" data-menu-action="' + entry.action + '">' + entry.label + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var rect = anchor.getBoundingClientRect();
    menu.style.left = Math.min(rect.right - 148, window.innerWidth - 168) + 'px';
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.querySelectorAll('[data-menu-action]').forEach(function (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleCardAction(item, actionBtn.getAttribute('data-menu-action'));
        closeCardMenu();
      });
    });
    setTimeout(function () {
      document.addEventListener('click', closeCardMenu, { once: true });
    }, 0);
  }

  function closeCardMenu() {
    var menu = document.getElementById('v11CardMenu');
    if (menu) menu.remove();
  }

  function handleCardAction(item, action) {
    if (action === 'publish') {
      openPublishModal(item);
      return;
    }
    if (action === 'permission') {
      openPermissionModal(item, renderAgentGrid);
      return;
    }
    if (action === 'withdraw') {
      updateAgent(item.id, { status: 'dev', submittedAt: '', rejectionReason: '' });
      toast('已撤回');
      renderAgentGrid();
      return;
    }
    if (action === 'disable') {
      updateAgent(item.id, { status: 'disabled' });
      toast('已停用');
      renderAgentGrid();
      return;
    }
    if (action === 'offline') {
      updateAgent(item.id, { status: 'offline' });
      toast('已下架');
      renderAgentGrid();
      return;
    }
    if (action === 'enable') {
      updateAgent(item.id, { status: 'listed' });
      toast('已启用');
      renderAgentGrid();
      return;
    }
    if (action === 'delete') {
      if (!global.confirm('确认删除「' + item.name + '」？此操作仅影响运营原型列表。')) return;
      deleteAgent(item.id);
      toast('已删除');
      renderAgentGrid();
    }
  }

  function requiresAuditForScope(mode) {
    if (global.Proto && Proto.requiresPublishAudit) return Proto.requiresPublishAudit(mode);
    return mode === 'public' || mode === 'specific' || mode === 'org';
  }

  function applyPublishWithScope(item, draft, payload, onDone) {
    var mode = payload.shareMode || 'private';
    var targets = normalizeTargets(payload.targets || []);
    if (mode === 'specific' && !targets.length) {
      toast('请选择组织范围');
      return;
    }
    var patch = {
      version: draft.version,
      releaseNote: draft.releaseNote,
      shareMode: mode,
      permissionTargets: mode === 'specific' ? targets : []
    };
    if (requiresAuditForScope(mode)) {
      updateAgent(item.id, Object.assign({}, patch, {
        status: 'reviewing',
        submittedAt: nowText(),
        approvedAt: '',
        listedAt: '',
        rejectionReason: ''
      }));
      toast('已提交审核，请在工作台处理');
    } else {
      updateAgent(item.id, Object.assign({}, patch, {
        status: 'listed',
        listedAt: nowText(),
        approvedAt: nowText(),
        submittedAt: '',
        rejectionReason: ''
      }));
      toast('已上架（个人范围，免审核）');
    }
    if (typeof onDone === 'function') onDone();
  }

  function renderDashboard() {
    renderPageChrome('dashboard');
    var content = document.getElementById('pageContent');
    content.innerHTML =
      '<section class="card ops-dashboard v11-ops-dashboard">' +
        '<div class="ops-dash-head">' +
          '<h2 class="ops-dash-title">运营概览</h2>' +
        '</div>' +
        '<p class="ops-dash-intro">本仪表盘面向平台开放后的日常运营：指标卡展示运行规模与异常概况；合规环图反映检测类型分布；趋势图展示近 7 日任务调度情况。下方数据为原型演示，正式环境将对接监控与审计服务。</p>' +
        '<div class="ops-dash-kpis" id="opsDashKpis"></div>' +
        '<div class="ops-dash-panels">' +
          '<div class="ops-dash-panel ops-dash-panel-chart">' +
            '<div class="ops-dash-panel-head"><h3>安全与合规监控</h3><span class="ops-dash-live">实时检测更新</span></div>' +
            '<div id="opsDashCompliance"></div>' +
          '</div>' +
          '<div class="ops-dash-panel ops-dash-panel-chart">' +
            '<div class="ops-dash-panel-head"><h3>任务调度趋势（7日）</h3></div>' +
            '<div id="opsDashSchedule"></div>' +
          '</div>' +
        '</div>' +
      '</section>';
    if (global.OpsListDashboard) {
      if (OpsListDashboard.refresh) OpsListDashboard.refresh({ hideQuickLinks: true, hideInterceptEvents: true });
      else if (OpsListDashboard.init) OpsListDashboard.init({ hideQuickLinks: true, hideInterceptEvents: true });
    }
  }

  function renderAudit() {
    renderPageChrome('audit');
    var content = document.getElementById('pageContent');
    var list = auditQueueItems();
    content.innerHTML =
      '<section class="panel table-wrap"><table class="table"><thead><tr>' +
        '<th>智能体</th><th>类型</th><th>来源</th><th>申请人</th><th>提交时间</th><th>操作</th>' +
      '</tr></thead><tbody id="auditBody">' +
      list.map(function (item) {
        var src = item.source === 'third_party' ? ['🔗 第三方', 'source-third'] : ['🏗️ 平台创建', 'source-platform'];
        return '<tr><td><strong>' + escapeHtml(item.name) + '</strong></td>' +
          '<td>' + typeLabel(item.type) + '</td>' +
          '<td><span class="source-badge ' + src[1] + '">' + src[0] + '</span></td>' +
          '<td>' + escapeHtml(item.applicant || '运营') + '</td>' +
          '<td>' + escapeHtml(item.submittedAt || item.updatedAt || '—') + '</td>' +
          '<td><a class="btn btn-sm btn-primary" href="' + href('audit-review.html', { id: item.id }) + '">去审核</a></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div class="empty" id="auditEmpty" style="display:' + (list.length ? 'none' : 'block') + ';">暂无待审核项 · 在详情页发布候选版本后会出现在此</div></section>';
  }

  function renderAuditReview() {
    renderPageChrome('auditReview');
    var id = params().get('id');
    var item = getAgent(id);
    var content = document.getElementById('pageContent');
    if (!item || ['published_pending_review', 'reviewing'].indexOf(item.status) < 0) {
      content.innerHTML = '<section class="panel panel-pad" style="text-align:center;">' +
        '<p>未找到待审核项或该智能体不在审核中。</p>' +
        '<a class="btn btn-primary" href="audit-workbench.html" style="margin-top:12px;">返回审核工作台</a></section>';
      return;
    }
    var titleEl = document.querySelector('.v11-page-header h1');
    if (titleEl) titleEl.textContent = item.name + ' · 发布审核';
    var src = item.source === 'third_party' ? ['🔗 第三方', 'source-third'] : ['🏗️ 平台创建', 'source-platform'];
    content.innerHTML =
      '<div class="audit-stepper" id="auditStepper">' +
        stepItem('done', '✓', '提交申请', (item.submittedAt || '').split(' ')[0] || '—') +
        stepItem('current', '2', '平台审核', '待处理') +
        stepItem('', '3', '已上架', '通过后自动开放') +
      '</div>' +
      '<section class="panel panel-pad audit-review-summary">' +
        '<h2 style="margin:0 0 12px;font-size:15px;">申请摘要</h2>' +
        '<div class="info-grid">' +
          info('智能体', item.name) +
          info('类型', typeLabel(item.type)) +
          info('来源', src[0]) +
          info('版本号', item.version || 'v1.0') +
          info('发版描述', item.releaseNote || '—') +
          info('申请人', item.applicant || '运营') +
          info('提交时间', item.submittedAt || '—') +
        '</div>' +
        '<div class="notice" style="margin-top:14px;">配置摘要：' + escapeHtml(item.desc) + '</div>' +
      '</section>' +
      '<section class="panel panel-pad audit-next-card">' +
        '<h3 style="margin:0 0 8px;font-size:15px;">当前节点：平台审核</h3>' +
        '<p style="margin:0;color:var(--muted);font-size:13px;line-height:1.7;">平台审核通过后将直接上架开放。请核对申请信息、配置摘要与可见范围后做出审核决定。</p>' +
      '</section>' +
      '<div class="audit-review-actions">' +
        '<button type="button" class="btn btn-primary" data-approve-review="' + escapeHtml(item.id) + '">审核通过</button>' +
        '<button type="button" class="btn btn-danger" data-reject-review="' + escapeHtml(item.id) + '">驳回</button>' +
        '<a class="btn" href="audit-workbench.html">返回审核工作台</a>' +
      '</div>';
    document.querySelector('[data-approve-review]').addEventListener('click', function () {
      var now = nowText();
      updateAgent(item.id, { status: 'listed', approvedAt: now, listedAt: now, rejectionReason: '' });
      toast('审核通过，已上架');
      global.location.href = 'audit-workbench.html';
    });
    document.querySelector('[data-reject-review]').addEventListener('click', function () {
      openRejectModal(item.id, function () { global.location.href = 'audit-workbench.html'; });
    });
  }

  function stepItem(state, no, label, sub) {
    return '<div class="audit-step ' + state + '"><div class="dot">' + no + '</div><div class="label">' + label + '</div><div class="sub">' + sub + '</div></div>';
  }

  function renderDetail() {
    renderPageChrome('detail');
    var id = params().get('id');
    var item = getAgent(id);
    if (!item) {
      document.getElementById('pageContent').innerHTML = '<section class="panel panel-pad">未找到智能体。</section>';
      return;
    }
    var titleEl = document.querySelector('.v11-page-header h1');
    var descEl = document.querySelector('.v11-page-header p');
    if (titleEl) titleEl.textContent = item.name;
    if (descEl) descEl.textContent = item.desc;
    var content = document.getElementById('pageContent');
    content.innerHTML =
      '<section class="detail-layout">' +
        '<div class="panel panel-pad">' +
          '<div class="row-between"><h2>配置摘要</h2>' + statusTag(item.status) + '</div>' +
          '<div class="info-grid">' +
            info('智能体类型', typeLabel(item.type)) +
            info('当前版本', item.version || 'v1') +
            info('来源', item.source === 'third_party' ? '第三方接入' : '平台创建') +
            info('使用权限', permissionSummary(item)) +
            info('提交审核', item.submittedAt || '未提交') +
            info('上架时间', item.listedAt || '未上架') +
          '</div>' +
          renderFlow(item) +
        '</div>' +
        '<aside class="panel panel-pad">' +
          '<h2>运营操作</h2>' +
          renderDetailNotice(item) +
          '<div class="actions-stack">' + detailActions(item) + '</div>' +
        '</aside>' +
      '</section>';
    bindDetailActions(item);
  }

  function info(k, v) {
    return '<div class="info"><span>' + escapeHtml(k) + '</span><strong>' + escapeHtml(v || '-') + '</strong></div>';
  }

  function renderFlow(item) {
    var steps = [
      ['dev', '草稿', '未对外，完成开发平台配置。'],
      ['reviewing', '审核中', '组织/公开范围须审批（个人免审）。'],
      ['listed', '已上架', '目标范围用户可使用。']
    ];
    var currentIndex = 0;
    if (item.status === 'reviewing' || item.status === 'published_pending_review') currentIndex = 1;
    else if (item.status === 'listed' || item.status === 'disabled') currentIndex = 2;
    else if (item.status === 'offline' || item.status === 'rejected') currentIndex = 0;
    return '<div class="flow">' + steps.map(function (s, i) {
      var cls = i < currentIndex ? 'done' : (i === currentIndex ? 'current' : '');
      return '<div class="flow-step ' + cls + '"><div class="flow-no">' + (i < currentIndex ? '✓' : i + 1) + '</div><div><strong>' + s[1] + '</strong><span>' + s[2] + '</span></div></div>';
    }).join('') + '</div>';
  }

  function renderDetailNotice(item) {
    var meta = STATUS[displayStatusKey(item.status)] || STATUS.dev;
    if (item.status === 'rejected') {
      return '<div class="notice red">已驳回（终态）：' + escapeHtml(item.rejectionReason || '未填写原因') + ' · 请修改后重新提交审核。</div>';
    }
    if (item.status === 'listed') {
      return '<div class="notice" style="background:var(--green-soft);color:var(--green);">该智能体已上架，用户端可见。</div>';
    }
    if (item.status === 'disabled') {
      return '<div class="notice">已停用：用户暂不可访问，启用后恢复上架状态。</div>';
    }
    if (item.status === 'offline') {
      return '<div class="notice">已下架：用户入口已关闭，可重新选择范围提交发布。</div>';
    }
    return '<div class="notice">' + escapeHtml(meta.hint) + '</div>';
  }

  function detailActions(item) {
    var parts = [];
    parts.push('<a class="btn" href="' + rootHref('06-dev-editor.html', { id: item.id, name: item.name, type: item.type }) + '">前往开发配置</a>');
    if (item.status === 'dev' || item.status === 'offline' || item.status === 'rejected') {
      parts.push('<button class="btn btn-primary" data-publish="' + item.id + '">' + (item.status === 'dev' ? '发布' : '重新发布') + '</button>');
    }
    if (item.status === 'published_pending_review' || item.status === 'reviewing') {
      parts.push('<a class="btn btn-soft" href="' + href('audit-review.html', { id: item.id }) + '">查看审核详情</a>');
      parts.push('<button class="btn btn-soft" data-withdraw="' + item.id + '">撤回</button>');
      parts.push('<button class="btn btn-danger" data-delete="' + item.id + '">删除</button>');
    }
    if (item.source !== 'third_party' && item.status === 'listed') {
      parts.push('<button class="btn btn-soft" data-permission="' + item.id + '">权限</button>');
    }
    if (item.status === 'disabled') {
      parts.push('<button class="btn btn-primary" data-enable="' + item.id + '">启用</button>');
      parts.push('<button class="btn btn-danger" data-offline="' + item.id + '">下架</button>');
      parts.push('<button class="btn btn-danger" data-delete="' + item.id + '">删除</button>');
    }
    if (item.status === 'listed') {
      parts.push('<a class="btn btn-soft" href="' + rootHref('web端/index.html', { id: item.id, name: item.name, type: item.type }) + '">打开用户对话页</a>');
      parts.push('<button class="btn btn-soft" data-disable="' + item.id + '">停用</button>');
      parts.push('<button class="btn btn-danger" data-offline="' + item.id + '">下架</button>');
    }
    if (item.status === 'dev' || item.status === 'offline' || item.status === 'rejected') {
      parts.push('<button class="btn btn-danger" data-delete="' + item.id + '">删除</button>');
    }
    parts.push('<a class="btn" href="index.html">返回智能体管理</a>');
    return parts.join('');
  }

  function bindDetailActions(item) {
    document.querySelectorAll('[data-publish]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPublishModal(item); });
    });
    document.querySelectorAll('[data-permission]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPermissionModal(item, renderDetail); });
    });
    document.querySelectorAll('[data-offline]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updateAgent(btn.getAttribute('data-offline'), { status: 'offline' });
        toast('已下架');
        renderDetail();
      });
    });
    document.querySelectorAll('[data-enable]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updateAgent(btn.getAttribute('data-enable'), { status: 'listed' });
        toast('已启用');
        renderDetail();
      });
    });
    document.querySelectorAll('[data-disable]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updateAgent(btn.getAttribute('data-disable'), { status: 'disabled' });
        toast('已停用');
        renderDetail();
      });
    });
    document.querySelectorAll('[data-withdraw]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updateAgent(btn.getAttribute('data-withdraw'), { status: 'dev', submittedAt: '', rejectionReason: '' });
        toast('已撤回');
        renderDetail();
      });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete');
        if (!global.confirm('确认删除该智能体？')) return;
        deleteAgent(id);
        toast('已删除');
        global.location.href = 'index.html';
      });
    });
  }

  function openAgentModal(kind) {
    showModal('新建智能体' + (kind === 'third' ? '（第三方接入）' : ''), agentForm(kind), function () {
      var name = document.getElementById('modalAgentName').value.trim();
      if (!name) { toast('请填写智能体名称'); return false; }
      var item = addAgent({
        name: name,
        type: document.getElementById('modalAgentType').value,
        desc: document.getElementById('modalAgentDesc').value.trim() || '待完善配置摘要。',
        source: kind === 'third' ? 'third_party' : 'platform'
      });
      toast(kind === 'third' ? '第三方智能体已接入' : '智能体已创建');
      navigateToAgentDetail(item);
      return true;
    });
  }

  function agentForm(kind) {
    return '<div class="field"><label>智能体名称</label><input id="modalAgentName" placeholder="例如：合同审查助手"></div>' +
      '<div class="field"><label>类型</label><select id="modalAgentType">' +
      TYPE_KEYS.map(function (key) {
        return '<option value="' + key + '">' + TYPES[key] + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>描述</label><textarea id="modalAgentDesc" placeholder="简要说明智能体用途"></textarea></div>' +
      (kind === 'third' ? '<div class="notice">第三方接入将标记来源，配置仍在开发平台完成。</div>' : '');
  }

  function isAgentFirstPublish(item) {
    if (!item) return true;
    return !item.listedAt && !item.approvedAt && !item.publishedAt;
  }

  function openPublishModal(item) {
    var first = isAgentFirstPublish(item);
    var versionBlock = first
      ? '<div class="notice" id="modalVersionHint">首次发布将自动使用版本 <strong>v1</strong>，无需填写版本号。</div>'
      : '<div class="field" id="modalVersionRow"><label>版本号 <span style="color:var(--danger);">*</span></label><input id="modalVersion" value="' + escapeHtml(nextVersion(item.version)) + '"></div>';
    showModal('发布智能体',
      versionBlock +
      '<div class="field"><label>发布说明</label><textarea id="modalReleaseNote" placeholder="说明本次发布的能力变化和审核要点"></textarea></div>' +
      '<div class="notice">下一步选择可见范围：<strong>个人</strong>免审直接上架；<strong>组织/公开</strong>须审核。</div>',
      function () {
        var note = document.getElementById('modalReleaseNote').value.trim();
        if (!note) { toast('请填写发布说明'); return false; }
        var version;
        if (first) {
          version = 'v1';
        } else {
          version = (document.getElementById('modalVersion') && document.getElementById('modalVersion').value.trim()) || '';
          if (!version) { toast('请填写版本号'); return false; }
        }
        var draft = {
          version: version,
          releaseNote: note
        };
        closeModal();
        openPublishScopePicker(item, draft, pageName() === 'agent-detail.html' ? renderDetail : renderAgentGrid);
        return true;
      });
  }

  function openPublishScopePicker(item, draft, onDone) {
    if (!global.OrgAccessPicker || !OrgAccessPicker.open) {
      toast('组织架构选择器未加载');
      return;
    }
    OrgAccessPicker.open({
      title: '选择可见范围',
      subtitle: '个人：仅您可用，免审核。组织/公开：提交后进入审核工作台。',
      shareMode: item.shareMode === 'org' ? 'specific' : (item.shareMode || 'private'),
      selected: normalizeTargets(item.permissionTargets || []),
      onConfirm: function (payload) {
        applyPublishWithScope(item, draft, payload, onDone);
      }
    });
  }

  function openPermissionModal(item, onDone) {
    if (item.source === 'third_party') {
      toast('第三方智能体暂不支持调整可见范围');
      return;
    }
    if (item.status !== 'listed') {
      toast('请先发布上架后再调整可见范围');
      return;
    }
    if (!global.OrgAccessPicker || !OrgAccessPicker.open) {
      toast('组织架构选择器未加载');
      return;
    }
    OrgAccessPicker.open({
      title: '权限',
      subtitle: '个人：仅创建者可用。组织/公开：变更后须重新审核。',
      shareMode: item.shareMode === 'org' ? 'specific' : (item.shareMode || 'private'),
      selected: normalizeTargets(item.permissionTargets || []),
      onConfirm: function (payload) {
        var mode = payload.shareMode || 'private';
        var normalized = normalizeTargets(payload.targets || []);
        if (requiresAuditForScope(mode)) {
          updateAgent(item.id, {
            shareMode: mode,
            permissionTargets: mode === 'specific' ? normalized : [],
            status: 'reviewing',
            submittedAt: nowText(),
            rejectionReason: ''
          });
          toast('范围变更已提交审核');
        } else {
          updateAgent(item.id, {
            shareMode: mode,
            permissionTargets: []
          });
          toast('可见范围已更新：仅创建者可见');
        }
        if (typeof onDone === 'function') onDone();
      }
    });
  }

  function nextVersion(version) {
    var raw = String(version || 'v1.0').replace(/^v/i, '');
    var parts = raw.split('.').map(function (x) { return parseInt(x, 10); });
    if (parts.length < 2 || isNaN(parts[0])) return 'v1.0';
    if (isNaN(parts[1])) parts[1] = 0;
    parts[1] += 1;
    return 'v' + parts[0] + '.' + parts[1];
  }

  function openRejectModal(id, onDone) {
    showModal('驳回审核', '<div class="field"><label>驳回原因</label><textarea id="modalRejectReason" placeholder="说明需要修改的配置、合规或说明问题"></textarea></div>', function () {
      var reason = document.getElementById('modalRejectReason').value.trim();
      if (!reason) { toast('请填写驳回原因'); return false; }
      updateAgent(id, { status: 'rejected', rejectionReason: reason });
      toast('已驳回，详情页可查看原因');
      if (typeof onDone === 'function') onDone();
      else if (pageName() === 'audit-workbench.html') renderAudit();
      return true;
    });
  }

  function showModal(title, body, onConfirm) {
    closeModal();
    var mask = document.createElement('div');
    mask.className = 'modal-mask show';
    mask.id = 'v11Modal';
    mask.innerHTML =
      '<div class="modal"><div class="modal-head"><h3>' + title + '</h3><button class="btn btn-sm" data-modal-close>关闭</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn" data-modal-close>取消</button><button class="btn btn-primary" data-modal-confirm>确定</button></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.hasAttribute('data-modal-close')) closeModal();
      if (e.target.hasAttribute('data-modal-confirm')) {
        if (!onConfirm || onConfirm() !== false) closeModal();
      }
    });
  }

  function closeModal() {
    var old = document.getElementById('v11Modal');
    if (old) old.remove();
  }

  function init() {
    if (global.OpsListModals && OpsListModals.init && document.getElementById('opsModalOverlay')) {
      OpsListModals.init();
    }
    var page = pageName();
    if (page === 'dashboard.html') renderDashboard();
    else if (page === 'audit-workbench.html') renderAudit();
    else if (page === 'audit-review.html') renderAuditReview();
    else if (page === 'agent-detail.html') renderDetail();
    else renderIndex();
  }

  global.OpsV11 = {
    init: init,
    loadAgents: loadAgents,
    getAgents: getAgents,
    getAgent: getAgent,
    updateAgent: updateAgent,
    addAgent: addAgent,
    deleteAgent: deleteAgent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
