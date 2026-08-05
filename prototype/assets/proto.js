/**
 * 原型共享：URL、顶栏、Toast、智能体状态（闭环 sessionStorage）
 */
(function (global) {
  var DEFAULT_AGENT = { id: 'agt_demo_001', name: '客服助手', type: 'qa' };

  var DEMO_LIST_AGENTS = [
    { id: 'agt_demo_001', name: '客服助手', type: 'qa', source: 'platform' },
    { id: 'agt_contract', name: '合同审查师', type: 'task', source: 'platform' },
    { id: 'agt_medical', name: '医疗分诊助手', type: 'qa', source: 'platform' },
    { id: 'agt_multi', name: '多系统集成助手', type: 'multi', source: 'platform' },
    { id: 'agt_analytics', name: '数据分析助手', type: 'qa', source: 'platform' },
    { id: 'agt_procure', name: '采购申请助手', type: 'flow', source: 'platform' },
    { id: 'agt_daily', name: '日报生成器', type: 'qa', source: 'platform' },
    { id: 'agt_leave', name: '请假审批流程', type: 'flow', source: 'platform' }
  ];

  function params() {
    var loc = global.location || (typeof window !== 'undefined' && window.location);
    return new URLSearchParams((loc && loc.search) || '');
  }

  function agentId() {
    return params().get('id') || params().get('agentId') || DEFAULT_AGENT.id;
  }

  function agentName() {
    var p = params();
    if (p.get('name')) return decodeURIComponent(p.get('name'));
    var reg = getRegistry().find(function (x) { return x.id === agentId(); });
    if (reg && reg.name) return reg.name;
    var demo = DEMO_LIST_AGENTS.find(function (x) { return x.id === agentId(); });
    if (demo) return demo.name;
    return agentId() === DEFAULT_AGENT.id ? DEFAULT_AGENT.name : '智能体';
  }

  function agentType() {
    var p = params();
    if (p.get('type')) return p.get('type');
    var reg = getRegistry().find(function (x) { return x.id === agentId(); });
    if (reg && reg.type) return reg.type;
    var demo = DEMO_LIST_AGENTS.find(function (x) { return x.id === agentId(); });
    if (demo) return demo.type;
    return DEFAULT_AGENT.type;
  }

  function storeKey(id) {
    return 'proto_agent_' + (id || agentId());
  }

  function defaultState() {
    return {
      status: 'dev',
      scope: 'private',
      debugOk: false,
      linked: true,
      calls7d: 0,
      tokens7d: 0,
      skillsSelected7d: 0,
      skillsInvoked7d: 0,
      createdAt: null,
      boundSkillIds: ['sk_report', 'sk_risk']
    };
  }

  function hasStoredState(id) {
    try { return !!sessionStorage.getItem(storeKey(id)); } catch (e) { return false; }
  }

  function getState(id) {
    try {
      var raw = sessionStorage.getItem(storeKey(id));
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {}
    return defaultState();
  }

  var REGISTRY_KEY = 'proto_agent_registry';

  function getRegistry() {
    try {
      var raw = sessionStorage.getItem(REGISTRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function upsertRegistry(entry) {
    var list = getRegistry().filter(function (x) { return x.id !== entry.id; });
    list.unshift(Object.assign({ updatedAt: Date.now() }, entry));
    try { sessionStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  function syncRegistryFromState(id) {
    id = id || agentId();
    var st = getState(id);
    var list = getRegistry();
    var idx = list.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    list[idx] = Object.assign(list[idx], {
      status: st.status,
      scope: st.scope,
      updatedAt: Date.now()
    });
    try { sessionStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function setState(partial, id) {
    var s = Object.assign(getState(id), partial || {});
    try {
      sessionStorage.setItem(storeKey(id), JSON.stringify(s));
    } catch (e) {}
    syncRegistryFromState(id);
    syncOpsV11FromState(id);
    return s;
  }

  function qs(extra) {
    var q = new URLSearchParams({ id: agentId(), name: agentName(), type: agentType() });
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null) q.set(k, extra[k]);
      });
    }
    return '?' + q.toString();
  }

  function href(page, extra) {
    return page + qs(extra);
  }

  function toast(msg, ms) {
    var el = document.getElementById('protoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'protoToast';
      el.className = 'proto-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, ms || 2400);
  }

  function statusLabel(status) {
    var map = {
      dev: ['草稿', 'tag-dev'],
      pending: ['待审核', 'tag-pending'],
      review: ['审核中', 'tag-review'],
      published: ['已上架', 'tag-published'],
      disabled: ['已停用', 'tag-offline'],
      offline: ['已下架', 'tag-offline'],
      rejected: ['已驳回', 'tag-offline']
    };
    return map[status] || map.dev;
  }

  function initTopbar(ctx) {
    ctx = ctx || 'ops';
    var devLink = document.querySelector('[data-nav-dev]');
    var opsLink = document.querySelector('[data-nav-ops]');
    if (devLink) devLink.href = '06-dev-platform.html' + qs();
    if (opsLink) opsLink.href = 'index.html';
    document.querySelectorAll('.topbar-modules a, .topbar-modules span').forEach(function (el) {
      el.classList.remove('active');
    });
    if (ctx === 'dev' && devLink) devLink.classList.add('active');
    else if (opsLink) opsLink.classList.add('active');
  }

  function applyAgentHeader() {
    var name = agentName();
    document.querySelectorAll('[data-agent-name]').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('[data-agent-id]').forEach(function (el) {
      el.textContent = agentId();
    });
    if (document.title.indexOf('客服助手') >= 0) {
      document.title = document.title.replace(/客服助手/, name);
    }
  }

  function applyStatusTags() {
    var st = getState();
    var pair = statusLabel(st.status);
    document.querySelectorAll('[data-status-tag]').forEach(function (el) {
      el.textContent = pair[0];
      el.className = 'tag ' + pair[1];
    });
  }

  function bindTabs(containerSel) {
    var root = document.querySelector(containerSel);
    if (!root) return;

    function activateTab(tab, btn) {
      if (isFirstConfig() && tab !== 'config') {
        toast('请先完成配置并保存，或点击「知道了」后再查看其他 Tab');
        return;
      }
      root.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.agent-tab-panel').forEach(function (p) {
        p.classList.toggle('active', p.id === 'tab-' + tab);
      });
      if (history.replaceState) {
        var u = new URL(window.location.href);
        u.searchParams.set('tab', tab);
        history.replaceState(null, '', u);
      }
    }

    if (root.dataset.tabsWired !== '1') {
      root.dataset.tabsWired = '1';
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-tab]');
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        activateTab(btn.getAttribute('data-tab'), btn);
      });
    }

    var initial = params().get('tab');
    if (initial && !(isFirstConfig() && initial !== 'config')) {
      var t = root.querySelector('[data-tab="' + initial + '"]');
      if (t) activateTab(initial, t);
    }
  }

  function markDebugOk() {
    setState({ debugOk: true });
  }

  function getTokens7d(state) {
    state = state || getState();
    if (state.tokens7d != null && state.tokens7d > 0) return state.tokens7d;
    return Math.round((state.calls7d || 0) * 1280);
  }

  function formatTokens(n) {
    n = n || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function addTokenUsage(delta, id) {
    delta = delta || 0;
    if (!delta) return getState(id);
    var st = getState(id);
    return setState({ tokens7d: (st.tokens7d || 0) + delta }, id);
  }

  function recordSessionUsage(id) {
    id = id || agentId();
    var st = getState(id);
    var delta = 800 + Math.floor(Math.random() * 700);
    var boundIds = Array.isArray(st.boundSkillIds) ? st.boundSkillIds.filter(Boolean) : [];
    var boundCount = Math.max(boundIds.length, 1);
    var selectedInc = Math.min(boundCount, 1 + Math.floor(Math.random() * boundCount));
    var invokedInc = Math.max(0, selectedInc - Math.floor(Math.random() * 2));
    return setState({
      calls7d: (st.calls7d || 0) + 1,
      tokens7d: (st.tokens7d || 0) + delta,
      skillsSelected7d: (st.skillsSelected7d || 0) + selectedInc,
      skillsInvoked7d: (st.skillsInvoked7d || 0) + invokedInc
    }, id);
  }

  function getSkillsHitMetrics(state) {
    state = state || getState();
    var selected = state.skillsSelected7d || 0;
    var invoked = state.skillsInvoked7d || 0;
    var calls = state.calls7d || 0;
    if (!selected && calls > 0) {
      var boundCount = Math.max(getAgentSkillIds().length, 1);
      selected = calls * boundCount;
      invoked = Math.round(selected * 0.67);
    }
    return { selected: selected, invoked: Math.min(invoked, selected) };
  }

  function formatSkillsHitRate(state) {
    var m = getSkillsHitMetrics(state);
    if (!m.selected) return { rate: '—', detail: '' };
    var pct = Math.round((m.invoked / m.selected) * 100);
    return {
      rate: pct + '%',
      detail: '调用 ' + m.invoked + ' / 选中 ' + m.selected
    };
  }

  var TYPE_LABELS = { qa: '问答型', task: '任务型', flow: '流程型', multi: '多智能体' };

  function typeLabel(type) {
    return TYPE_LABELS[type] || type || '问答型';
  }

  function scopePill(scope) {
    if (scope === 'public') return ['🏢 全公司', 'scope-public'];
    if (scope === 'specific') return ['👥 部门共享', 'scope-specific'];
    return ['🔒 仅本人', 'scope-private'];
  }

  function sourceLabel(source) {
    if (source === 'third_party') return '第三方';
    if (source === 'stock') return '存量迁移';
    return '平台创建';
  }

  function sourceBadge(source) {
    if (source === 'third_party') return ['🔗 ' + sourceLabel(source), 'source-third'];
    if (source === 'stock') return ['📋 ' + sourceLabel(source), 'source-stock'];
    return ['🏗️ ' + sourceLabel(source), 'source-platform'];
  }

  var SKILL_CATALOG = [
    {
      id: 'sk_report',
      name: '报告结构化',
      category: '输出规范',
      status: 'enabled',
      version: 'v1.2.0',
      scope: '全公司',
      authorized: true,
      scenario: '总结、汇报、复盘',
      prompt: '将回复整理为：结论、依据、下一步。适合总结类问题。',
      content: '在回答前先识别用户问题的目标；输出时严格分为三段：结论（一句话）、依据（要点列表，引用对话或知识库内容）、下一步（行动建议）。若依据不足，须显式说明并请用户补充。',
      examples: '问：本季度客服投诉为何上升？\n答：结论：客诉同比上升 18%，主因物流时效下降。\n依据：① 物流团队 5 月平均时效 2.4 天 → 3.6 天；② 客诉标签中"物流"占比 47%。\n下一步：与物流方对齐改进 SLA，并在客服端预告时效。',
      output: '结论 / 依据 / 下一步',
      updatedAt: '2026-05-22'
    },
    {
      id: 'sk_risk',
      name: '风险审查',
      category: '审查方法',
      status: 'enabled',
      version: 'v1.0.3',
      scope: '指定组织',
      authorized: true,
      scenario: '合同、制度、流程审查',
      prompt: '优先识别风险等级、影响范围和规避建议。',
      content: '逐条扫描文本，识别合规、财务、声誉、操作四类风险；对每条风险标注严重程度（高/中/低）、影响范围、是否阻断签署；最后给出可执行的规避建议。',
      examples: '风险：合同未约定数据所有权\n等级：高 · 影响：知识产权 · 阻断：是\n建议：补充"乙方在履约过程中产生的数据归甲方所有"条款。',
      output: '风险等级 / 影响 / 建议',
      updatedAt: '2026-05-10'
    },
    {
      id: 'sk_meeting',
      name: '会议纪要整理',
      category: '办公效率',
      status: 'enabled',
      version: 'v0.4.0',
      scope: '指定用户',
      authorized: true,
      scenario: '会议录音、聊天记录、会议原文',
      prompt: '按议题、决议、待办和责任人输出会议纪要。',
      content: '先识别会议讨论的主要议题，按议题归并讨论要点；提炼明确的决议（不含"可能/或许"等模糊语）；提取所有待办事项并归属责任人与截止日期。',
      examples: '议题：Q3 营销预算分配\n决议：抖音渠道占比 35%，B 站 20%，其余沿用上季度比例。\n待办：① 张三 5 月 30 日前提交抖音投放计划；② 李四 6 月 5 日前完成 B 站 KOL 名单。',
      output: '议题 / 决议 / 待办 / 责任人',
      updatedAt: '2026-04-18'
    },
    {
      id: 'sk_policy',
      name: '政策条款解读',
      category: '知识辅助',
      status: 'enabled',
      version: 'v1.1.0',
      scope: '全公司',
      authorized: true,
      scenario: '制度、政策、公告解释',
      prompt: '用背景、要点、适用对象和注意事项解释政策条款。',
      content: '先用 1-2 句话说明政策出台背景；列出 3-5 条核心要点；明确适用对象（部门、岗位、场景）；最后给出执行时需特别注意的事项与例外。',
      examples: '背景：贯彻总部数据合规要求。\n要点：① 个人数据出境需走专项审批；② 留存日志 6 个月。\n适用对象：所有涉及海外用户的业务部门。\n注意：审批通道每月底统一开放。',
      output: '背景 / 要点 / 适用对象 / 注意事项',
      updatedAt: '2026-05-02'
    },
    {
      id: 'sk_draft',
      name: '投标响应检查',
      category: '审查方法',
      status: 'draft',
      version: 'v0.2.0',
      scope: '指定用户',
      authorized: true,
      scenario: '投标文件自查',
      prompt: '草稿 Skill，仅管理员调试，不允许用户绑定。',
      content: '对照招标文件需求清单，逐项检查投标响应是否覆盖；标记缺失项、模糊项；输出风险提示与补充建议。',
      examples: '需求 3.2 性能要求：未在响应文件正文出现，建议补充至 P12。',
      output: '缺口 / 风险 / 建议',
      updatedAt: '2026-05-25'
    },
    {
      id: 'sk_private',
      name: '财务测算说明',
      category: '专业模板',
      status: 'enabled',
      version: 'v1.0.0',
      scope: '财务部',
      authorized: false,
      scenario: '财务测算报告',
      prompt: '当前账号无权限，列表中仅用于演示权限边界。',
      content: '按口径说明、计算过程、结论三段输出，要求标注每个数据来源与假设。',
      examples: '口径：FY26 全口径营收。\n计算：基础盘 1.2B × (1+12%) + 新业务 0.18B = 1.524B。\n结论：FY26 预算 1.52B。',
      output: '口径 / 计算 / 结论',
      updatedAt: '2026-03-08'
    }
  ];

  var CUSTOM_SKILL_KEY = 'proto_custom_skills';
  var DELETED_SKILL_KEY = 'proto_deleted_skill_ids';

  function getDeletedSkillIds() {
    try {
      var raw = sessionStorage.getItem(DELETED_SKILL_KEY);
      var ids = raw ? JSON.parse(raw) : [];
      if (ids.indexOf('sk_legacy') < 0) ids.push('sk_legacy');
      return ids;
    } catch (e) { return ['sk_legacy']; }
  }

  function addDeletedSkillId(id) {
    var ids = getDeletedSkillIds();
    if (ids.indexOf(id) < 0) ids.push(id);
    try { sessionStorage.setItem(DELETED_SKILL_KEY, JSON.stringify(ids)); } catch (e) {}
  }

  function getCustomSkills() {
    try {
      var raw = sessionStorage.getItem(CUSTOM_SKILL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function setCustomSkills(list) {
    try { sessionStorage.setItem(CUSTOM_SKILL_KEY, JSON.stringify(list || [])); } catch (e) {}
  }

  function getSkillCatalog() {
    var deleted = getDeletedSkillIds();
    var custom = getCustomSkills();
    var customIds = custom.map(function (s) { return s.id; });
    return SKILL_CATALOG.filter(function (s) {
      return deleted.indexOf(s.id) < 0 && customIds.indexOf(s.id) < 0;
    }).concat(custom.filter(function (s) {
      return deleted.indexOf(s.id) < 0;
    }));
  }

  function incrementPatchVersion(version) {
    var ver = (version || 'v0.1.0').replace(/^v/i, '').split('.').map(function (x) { return parseInt(x, 10) || 0; });
    while (ver.length < 3) ver.push(0);
    ver[2] += 1;
    return 'v' + ver.join('.');
  }

  function formatDateTime(ts) {
    if (!ts) return '—';
    var d = typeof ts === 'number' ? new Date(ts) : new Date(String(ts).replace(/-/g, '/'));
    if (isNaN(d.getTime())) return '—';
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function getLastModifiedText(st) {
    st = st || getState();
    var ts = st.lastSavedAt || st.createdAt;
    return '最后修改时间: ' + (ts ? formatDateTime(ts) : '—');
  }

  function isFirstPublish(st) {
    st = st || getState();
    return !st.releaseVersion && !st.lastPublishedAt;
  }

  function suggestPublishVersion(st) {
    st = st || getState();
    if (isFirstPublish(st)) return 'v1';
    if (st.releaseVersion) return incrementPatchVersion(st.releaseVersion);
    if (st.version) return st.version;
    return 'v1';
  }

  function requiresPublishAudit(scope) {
    return scope === 'public' || scope === 'specific' || scope === 'org' || scope === 'department';
  }

  var OPS_V11_STORE = 'proto_ops_v11_agents_v4';

  function mapStateToV11Status(protoStatus) {
    if (protoStatus === 'published') return 'listed';
    if (protoStatus === 'review') return 'reviewing';
    if (protoStatus === 'offline') return 'offline';
    if (protoStatus === 'rejected') return 'rejected';
    if (protoStatus === 'disabled') return 'disabled';
    return 'dev';
  }

  function syncOpsV11FromState(id) {
    id = id || agentId();
    var st = getState(id);
    try {
      var raw = sessionStorage.getItem(OPS_V11_STORE);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      var idx = list.findIndex(function (a) { return a.id === id; });
      if (idx < 0) {
        var reg = getRegistry().find(function (x) { return x.id === id; });
        var demo = (DEMO_LIST_AGENTS || []).find(function (x) { return x.id === id; });
        var base = reg || demo;
        if (!base) return;
        list.unshift({
          id: id,
          name: base.name || agentName(),
          type: base.type || agentType(),
          desc: base.desc || '',
          source: base.source || 'platform',
          version: st.releaseVersion || st.version || 'v1',
          releaseNote: st.releaseNote || '',
          updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          listedAt: '',
          submittedAt: '',
          approvedAt: '',
          rejectionReason: '',
          applicant: '运营',
          shareMode: 'private',
          permissionTargets: []
        });
        idx = 0;
      }
      var patch = {
        status: mapStateToV11Status(st.status),
        shareMode: st.shareMode || st.scope || list[idx].shareMode,
        permissionTargets: st.permissionTargets || list[idx].permissionTargets || [],
        version: st.releaseVersion || st.version || list[idx].version,
        releaseNote: st.releaseNote != null ? st.releaseNote : list[idx].releaseNote,
        rejectionReason: st.rejectionReason || '',
        updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
      };
      if (st.auditSubmittedAt) patch.submittedAt = st.auditSubmittedAt;
      if (st.status === 'published') patch.listedAt = st.lastPublishedAt || list[idx].listedAt || patch.updatedAt;
      list[idx] = Object.assign({}, list[idx], patch);
      sessionStorage.setItem(OPS_V11_STORE, JSON.stringify(list));
    } catch (e) {}
  }

  function runAgentPublish(opts) {
    opts = opts || {};
    var scope = opts.scope || 'private';
    var version = (opts.version || 'v1').trim();
    var note = (opts.releaseNote || '').trim();
    var permissionTargets = global.OrgAccessPicker && OrgAccessPicker.normalizeTargets
      ? OrgAccessPicker.normalizeTargets(opts.permissionTargets || [])
      : (opts.permissionTargets || []);
    var now = new Date().toLocaleString('zh-CN', { hour12: false });
    var patch = { releaseVersion: version, releaseNote: note, lastPublishedAt: now, version: version, shareMode: scope, permissionTargets: permissionTargets };
    if (requiresPublishAudit(scope)) {
      if (scope === 'specific' && !permissionTargets.length) {
        return { status: 'error', toast: '请选择组织范围' };
      }
      setState(Object.assign({}, patch, { status: 'review', scope: scope, auditStep: 1, auditSubmittedAt: now }));
      addToAuditQueue({
        id: agentId(), name: agentName(), type: agentType(),
        at: now, auditStep: 1, releaseVersion: version, releaseNote: note, scope: scope
      });
      return { status: 'review', redirect: href('08-audit-status.html'), toast: '已提交审核，智能体已进入审核流程' };
    }
    setState(Object.assign({}, patch, { status: 'published', scope: 'private' }));
    return { status: 'published', scope: 'private', toast: '发布成功，已上架' };
  }

  function skillContentChanged(existing, data) {
    if (!existing || !existing.id) return true;
    var fields = ['name', 'category', 'prompt', 'scenario', 'scope', 'content', 'output'];
    return fields.some(function (key) {
      return String(existing[key] || '') !== String((data && data[key]) || '');
    });
  }

  function saveSkill(data, targetStatus) {
    var list = getCustomSkills();
    var now = new Date();
    var id = (data && data.id) || ('sk_custom_' + now.getTime());
    var status = targetStatus === 'enabled' ? 'enabled' : 'draft';
    var existing = skillById(id) || {};
    var version = existing.version || 'v0.1.0';
    var versionBumped = false;
    var unchanged = false;
    if (data && data.id && existing.status === 'enabled' && targetStatus === 'enabled') {
      if (skillContentChanged(existing, data)) {
        version = incrementPatchVersion(existing.version);
        versionBumped = true;
      } else {
        unchanged = true;
      }
    }
    var next = Object.assign({
      id: id,
      version: version,
      authorized: true
    }, existing, data || {}, {
      id: id,
      status: status,
      version: version,
      authorized: true,
      updatedAt: unchanged ? (existing.updatedAt || now.toISOString().slice(0, 10)) : now.toISOString().slice(0, 10)
    });
    next._versionBumped = versionBumped;
    next._unchanged = unchanged;
    list = list.filter(function (s) { return s.id !== id; });
    list.unshift(next);
    setCustomSkills(list);
    return next;
  }

  function saveSkillDraft(data) {
    return saveSkill(data, 'draft');
  }

  function updateSkillStatus(id, status) {
    var list = getCustomSkills();
    var changed = null;
    list = list.map(function (s) {
      if (s.id !== id) return s;
      changed = Object.assign({}, s, { status: status, updatedAt: new Date().toISOString().slice(0, 10) });
      return changed;
    });
    setCustomSkills(list);
    if (!changed) {
      SKILL_CATALOG.forEach(function (s) {
        if (s.id === id) {
          s.status = status;
          s.updatedAt = new Date().toISOString().slice(0, 10);
          changed = s;
        }
      });
    }
    return changed || skillById(id);
  }

  function deleteSkill(id) {
    if (!id) return false;
    var list = getCustomSkills().filter(function (s) { return s.id !== id; });
    setCustomSkills(list);
    addDeletedSkillId(id);
    return true;
  }

  function mockParseSkillFile(fileName) {
    var raw = (fileName || 'imported-skill').replace(/\.[^.]+$/, '');
    var name = raw.replace(/[-_]/g, ' ').trim() || '导入的 Skill';
    return {
      name: name,
      category: '专业模板',
      scope: '全公司',
      scenario: '从 SKILL.md 解析',
      prompt: '由 ' + fileName + ' 解析而来的 Skill，请确认描述与技能内容后再保存。',
      content: '# 技能内容（来自 SKILL.md）\n\n- 步骤 1：根据用户问题与上下文识别意图\n- 步骤 2：按照 SKILL.md frontmatter 的 instructions 执行\n- 步骤 3：结合 references/ 目录补充资料\n\n保存前请按本项目语境修订。'
    };
  }

  function skillById(id) {
    return getSkillCatalog().find(function (s) { return s.id === id; });
  }

  function skillStatusLabel(status) {
    var map = {
      enabled: ['已启用', 'tag-published'],
      draft: ['草稿', 'tag-dev'],
      disabled: ['已停用', 'tag-offline']
    };
    return map[status] || map.enabled;
  }

  function isSkillUsable(skill) {
    return !!skill && skill.authorized && skill.status === 'enabled';
  }

  function getAgentSkillIds() {
    var st = getState();
    var ids = Array.isArray(st.boundSkillIds) ? st.boundSkillIds.filter(Boolean) : [];
    if (!ids.length && !st.skillsCleared) {
      ids = defaultState().boundSkillIds.slice();
      setState({ boundSkillIds: ids });
    }
    return ids;
  }

  function setAgentSkillIds(ids) {
    ids = ids || [];
    return setState({ boundSkillIds: ids, skillsCleared: ids.length === 0 });
  }

  function renderSkillTags(container, ids, options) {
    if (!container) return;
    options = options || {};
    ids = ids || [];
    if (!ids.length) {
      container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">暂未选择 Skill</span>';
      return;
    }
    container.innerHTML = ids.map(function (id) {
      var s = skillById(id);
      if (!s) {
        return '<span class="skill-chip skill-chip-deleted" title="该 Skill 已被删除">' +
          '引用失效' +
          (options.removable ? '<button type="button" title="移除" data-remove-skill="' + id + '">×</button>' : '') +
        '</span>';
      }
      var risky = !isSkillUsable(s);
      return '<span class="skill-chip ' + (risky ? 'skill-chip-risk' : '') + '" title="' + (s.prompt || '').replace(/"/g, '&quot;') + '">' +
        s.name + (risky ? ' · ' + skillStatusLabel(s.status)[0] : '') +
        (options.removable ? '<button type="button" title="移除" data-remove-skill="' + id + '">×</button>' : '') +
      '</span>';
    }).join('');
    if (options.removable) {
      container.querySelectorAll('[data-remove-skill]').forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.getAttribute('data-remove-skill');
          options.onRemove && options.onRemove(id);
        };
      });
    }
  }

  function renderBoundSkillTags(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-skill-bindings]').forEach(function (box) {
      var ids = getAgentSkillIds();
      if (!ids.length) {
        box.innerHTML = '<span class="core-tag core-tag-empty" style="font-size:12px;color:var(--text-muted);border-style:dashed;">暂未选择 Skill，点击 + 添加</span>';
        return;
      }
      box.innerHTML = ids.map(function (id) {
        var s = skillById(id);
        if (!s) {
          return '<span class="core-tag core-tag-deleted" title="该 Skill 已被删除，引用失效">' +
            '<span class="core-tag-name">引用失效</span>' +
            '<span class="core-tag-risk-label">已删除</span>' +
            '<button type="button" class="core-tag-remove" data-remove-skill="' + id + '" title="移除">×</button>' +
          '</span>';
        }
        var risky = !isSkillUsable(s);
        var st = skillStatusLabel(s.status);
        var title = risky
          ? (s.name + '：' + st[0] + ' · ' + (s.prompt || ''))
          : (s.name + '：' + (s.prompt || ''));
        return '<span class="core-tag ' + (risky ? 'core-tag-risk' : '') + '" title="' + title.replace(/"/g, '&quot;') + '">' +
          '<span class="core-tag-name">' + s.name + '</span>' +
          (risky ? '<span class="core-tag-risk-label">' + st[0] + '</span>' : '') +
          '<button type="button" class="core-tag-remove" data-remove-skill="' + id + '" title="移除">×</button>' +
        '</span>';
      }).join('');
      box.querySelectorAll('[data-remove-skill]').forEach(function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute('data-remove-skill');
          setAgentSkillIds(getAgentSkillIds().filter(function (x) { return x !== id; }));
          renderBoundSkillTags(scope);
          toast('已移除智能体绑定 Skill');
        };
      });
    });
  }

  function ensureSkillBindModal() {
    var modal = document.getElementById('skillBindModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'skillBindModal';
    modal.className = 'publish-modal-mask';
    modal.innerHTML =
      '<div class="publish-modal skill-bind-modal">' +
        '<div class="pm-head"><div><h3>选择 Skills</h3><p class="pm-sub">从智能体开发平台已启用且已授权的 Skills 中选择，保存后成为智能体长期配置。</p></div><button class="icon-btn" type="button" data-close-skill-bind>✕</button></div>' +
        '<div class="pm-body">' +
          '<div class="skill-modal-toolbar">' +
            '<input class="filter-search" id="skillBindSearch" placeholder="搜索名称、分类、场景...">' +
            '<select class="select" id="skillBindCategory"><option value="">全部分类</option><option>输出规范</option><option>审查方法</option><option>办公效率</option><option>知识辅助</option><option>专业模板</option></select>' +
            '<span class="skill-scope-note">仅展示可新增选择的 Skills</span>' +
          '</div>' +
          '<div class="skill-modal-layout">' +
            '<div class="skill-choice-list" id="skillBindList"></div>' +
            '<div class="skill-detail-panel" id="skillBindDetail"></div>' +
          '</div>' +
        '</div>' +
        '<div class="pm-foot">' +
          '<a class="res-link skill-manage-link" href="' + href('10-skills-management.html') + '">去开发平台管理</a>' +
          '<span class="skill-modal-count" id="skillBindCount">已选 0 个</span>' +
          '<button class="btn" type="button" data-close-skill-bind>取消</button>' +
          '<button class="btn btn-primary" type="button" id="skillBindConfirm">确认选择</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-skill-bind]').forEach(function (btn) {
      btn.onclick = function () { hideModal(modal); };
    });
    return modal;
  }

  function openSkillBindModal() {
    var modal = ensureSkillBindModal();
    var temp = getAgentSkillIds().slice();
    var detailId = temp[0] || 'sk_report';
    function renderDetail(id) {
      var s = skillById(id) || SKILL_CATALOG[0];
      var st = skillStatusLabel(s.status);
      document.getElementById('skillBindDetail').innerHTML =
        '<div class="skill-detail-title">' + s.name + '</div>' +
        '<p class="skill-detail-desc">' + s.prompt + '</p>' +
        '<div class="skill-detail-meta"><span>' + st[0] + '</span><span>' + s.category + '</span><span>' + s.version + '</span></div>' +
        '<div class="skill-prompt-preview">' + s.scenario + ' · ' + s.output + '</div>';
    }
    function renderList() {
      var q = (document.getElementById('skillBindSearch').value || '').trim();
      var category = document.getElementById('skillBindCategory').value;
      var list = getSkillCatalog().filter(function (s) {
        var hit = !q || (s.name + s.category + s.scenario + s.prompt).indexOf(q) >= 0;
        return hit && (!category || s.category === category) && isSkillUsable(s);
      });
      document.getElementById('skillBindList').innerHTML = list.map(function (s) {
        var checked = temp.indexOf(s.id) >= 0;
        var st = skillStatusLabel(s.status);
        return '<label class="skill-choice-row ' + (checked ? 'selected ' : '') + '" data-skill-row="' + s.id + '">' +
          '<input type="checkbox" data-skill-bind="' + s.id + '" ' + (checked ? 'checked ' : '') + '>' +
          '<div><div class="skill-choice-title">' + s.name + '</div>' +
          '<div class="skill-choice-desc">' + s.prompt + '</div>' +
          '<div class="skill-choice-note muted">' + st[0] + ' · ' + s.category + ' · ' + s.scope + '</div></div>' +
        '</label>';
      }).join('') || '<div class="empty-state" style="padding:24px;">暂无匹配 Skill</div>';
      document.getElementById('skillBindCount').textContent = '已选 ' + temp.length + ' 个';
      document.querySelectorAll('[data-skill-row]').forEach(function (row) {
        row.onclick = function () { detailId = row.getAttribute('data-skill-row'); renderDetail(detailId); };
      });
      document.querySelectorAll('[data-skill-bind]').forEach(function (input) {
        input.onchange = function () {
          var id = input.getAttribute('data-skill-bind');
          if (input.checked && temp.indexOf(id) < 0) temp.push(id);
          if (!input.checked) temp = temp.filter(function (x) { return x !== id; });
          renderList();
          renderDetail(id);
        };
      });
    }
    showModal(modal);
    ['skillBindSearch', 'skillBindCategory'].forEach(function (id) {
      document.getElementById(id).oninput = renderList;
      document.getElementById(id).onchange = renderList;
    });
    document.getElementById('skillBindConfirm').onclick = function () {
      setAgentSkillIds(temp);
      renderBoundSkillTags(document);
      hideModal(modal);
      toast('已更新智能体 Skills 绑定');
    };
    renderList();
    renderDetail(detailId);
  }

  function ensureSessionSkillModal() {
    var modal = document.getElementById('sessionSkillModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'sessionSkillModal';
    modal.className = 'publish-modal-mask';
    modal.innerHTML =
      '<div class="publish-modal skill-session-modal">' +
        '<div class="pm-head"><div><h3>选择临时 Skill</h3><p class="pm-sub">仅对当前会话生效，不回写智能体配置。</p></div><button class="icon-btn" type="button" data-close-session-skill>✕</button></div>' +
        '<div class="pm-body">' +
          '<div class="skill-modal-toolbar skill-session-toolbar">' +
            '<input class="filter-search" id="sessionSkillModalSearch" placeholder="搜索可用 Skills...">' +
            '<span class="skill-scope-note">已授权 · 已启用</span>' +
          '</div>' +
          '<div class="skill-choice-list compact" id="sessionSkillModalList"></div>' +
        '</div>' +
        '<div class="pm-foot">' +
          '<span class="skill-modal-count" id="sessionSkillModalCount">已选 0 个</span>' +
          '<button class="btn" type="button" data-close-session-skill>取消</button>' +
          '<button class="btn btn-primary" type="button" id="sessionSkillModalConfirm">完成</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-session-skill]').forEach(function (btn) {
      btn.onclick = function () { hideModal(modal); };
    });
    return modal;
  }

  function openSessionSkillModal(active, onDone) {
    var modal = ensureSessionSkillModal();
    var temp = (active || []).slice();
    var usable = getSkillCatalog().filter(isSkillUsable);
    var search = modal.querySelector('#sessionSkillModalSearch');
    var listBox = modal.querySelector('#sessionSkillModalList');
    var countBox = modal.querySelector('#sessionSkillModalCount');

    function renderList() {
      var q = (search.value || '').trim();
      var list = usable.filter(function (s) {
        return !q || (s.name + s.category + s.scenario + s.prompt).indexOf(q) >= 0;
      });
      listBox.innerHTML = list.map(function (s) {
        var checked = temp.indexOf(s.id) >= 0;
        return '<label class="skill-choice-row ' + (checked ? 'selected' : '') + '" data-session-skill-row="' + s.id + '">' +
          '<input type="checkbox" data-session-skill-pick="' + s.id + '" ' + (checked ? 'checked ' : '') + '>' +
          '<div><div class="skill-choice-title">' + s.name + '</div>' +
          '<div class="skill-choice-desc">' + s.prompt + '</div></div>' +
        '</label>';
      }).join('') || '<div class="empty-state" style="padding:24px;">暂无匹配 Skill</div>';
      countBox.textContent = '已选 ' + temp.length + ' 个';
      listBox.querySelectorAll('[data-session-skill-row]').forEach(function (row) {
        row.onclick = function () {};
      });
      listBox.querySelectorAll('[data-session-skill-pick]').forEach(function (input) {
        input.onchange = function () {
          var id = input.getAttribute('data-session-skill-pick');
          if (input.checked && temp.indexOf(id) < 0) temp.push(id);
          if (!input.checked) temp = temp.filter(function (x) { return x !== id; });
          renderList();
        };
      });
    }

    search.value = '';
    search.oninput = renderList;
    modal.querySelector('#sessionSkillModalConfirm').onclick = function () {
      hideModal(modal);
      if (onDone) onDone(temp.slice());
    };
    showModal(modal);
    renderList();
  }

  function bindSkillConfig(root) {
    var scope = root || document;
    renderBoundSkillTags(scope);
  }

  var skillBindClickHandler = null;

  function wireSkillBindButtons() {
    if (skillBindClickHandler) {
      document.removeEventListener('click', skillBindClickHandler, true);
    }
    skillBindClickHandler = function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-action="open-skill-bind"]') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openSkillBindModal();
    };
    document.addEventListener('click', skillBindClickHandler, true);
  }

  function migrateAgentSession() {
    getAgentSkillIds();
    var st = getState();
    if (!Array.isArray(st.boundSkillIds)) {
      setState({ boundSkillIds: defaultState().boundSkillIds.slice() });
    }
  }

  function showModal(elOrId) {
    var el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('active');
  }

  function hideModal(elOrId) {
    var el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.classList.remove('active');
    if (el.classList.contains('proto-overlay') || el.classList.contains('publish-modal-mask')) {
      el.classList.add('hidden');
    }
  }

  function ensureOverlaysClosed() {
    ['resourceOverlay', 'skillBindModal', 'publishModal', 'offlineModal', 'editNameModal'].forEach(hideModal);
    document.querySelectorAll('.publish-modal-mask.active').forEach(hideModal);
    var ov = document.getElementById('resourceOverlay');
    if (ov) {
      hideModal(ov);
      if (params().get('new') !== '1') ov.classList.add('hidden');
    }
  }

  function resolveFirstConfigMode() {
    if (params().get('new') === '1') return;
    if (getState().firstConfig === true) {
      setState({ firstConfig: false });
    }
  }

  function applyFirstConfigUi() {
    var setup = isFirstConfig();
    if (document.body) document.body.classList.toggle('mode-setup', setup);
    if (document.documentElement) document.documentElement.classList.toggle('mode-setup', setup);
    var banner = document.getElementById('firstConfigBanner');
    if (banner) banner.style.display = setup ? '' : 'none';
  }

  function initAgentDetailPage(options) {
    options = options || {};
    var tabsSel = options.tabs || '#agentTabs';

    migrateAgentSession();
    ensureOverlaysClosed();
    resolveFirstConfigMode();

    bindTabs(tabsSel);
    applyFirstConfigUi();

    if (params().get('new') === '1') {
      var ov = document.getElementById('resourceOverlay');
      if (ov) {
        ov.classList.remove('hidden');
        setTimeout(function () { ov.classList.add('hidden'); }, 900);
      }
    }

    var picked = params().get('picked');
    if (picked) {
      applyPickedResources(picked, params().get('pick'));
      if (history.replaceState) {
        var u = new URL(window.location.href);
        u.searchParams.delete('picked');
        u.searchParams.delete('pick');
        history.replaceState(null, '', u);
      }
    }
    if (params().get('skillBind') === '1') {
      openSkillBindModal();
      if (history.replaceState) {
        var u2 = new URL(window.location.href);
        u2.searchParams.delete('skillBind');
        history.replaceState(null, '', u2);
      }
    }

    return {
      applyFirstConfigUi: applyFirstConfigUi,
      migrateAgentSession: migrateAgentSession,
      ensureOverlaysClosed: ensureOverlaysClosed
    };
  }

  function bindSessionSkills(options) {
    options = options || {};
    var active = [];
    var root = options.root || document;
    var chips = root.querySelector(options.chips || '#sessionActiveSkills');
    var toggle = root.querySelector(options.toggle || '#sessionSkillToggle');
    if (!chips || !toggle) return null;
    function renderActive() {
      renderSkillTags(chips, active, { removable: true, onRemove: function (id) {
        active = active.filter(function (x) { return x !== id; });
        renderActive();
        toast('已从当前会话移除');
      }});
      if (!active.length) {
      chips.innerHTML = '';
      chips.style.display = 'none';
    } else {
      chips.style.display = '';
    }
      if (options.onChange) options.onChange(active.slice());
    }
    toggle.onclick = function () {
      openSessionSkillModal(active, function (ids) {
        active = ids;
        renderActive();
        toast(active.length ? '已更新当前会话 Skills' : '当前会话未选择 Skill');
      });
    };
    renderActive();
    return {
      getActiveIds: function () { return active.slice(); },
      getActiveNames: function () {
        return active.map(function (id) { return skillById(id); }).filter(Boolean).map(function (s) { return s.name; });
      }
    };
  }

  /** 阶段一创建成功 */
  function onAgentCreated(id, name, type, scope, desc, source, permissionTargets, iconMeta) {
    source = source || 'platform';
    permissionTargets = global.OrgAccessPicker && OrgAccessPicker.normalizeTargets
      ? OrgAccessPicker.normalizeTargets(permissionTargets || [])
      : (permissionTargets || []);
    var icon = '';
    var iconKind = '';
    if (iconMeta && typeof iconMeta === 'object') {
      icon = iconMeta.value || '';
      iconKind = iconMeta.kind || '';
    } else if (typeof iconMeta === 'string') {
      icon = iconMeta;
      iconKind = 'emoji';
    }
    if (global.PlatformApi) {
      global.PlatformApi.syncCreateAgent({
        agent_id: id,
        name: name,
        type: type || 'qa',
        scope: scope || 'private',
        share_mode: scope || 'private',
        permission_targets: permissionTargets,
        status: 'dev',
        source: source
      });
    }
    setState({
      status: 'dev',
      scope: scope || 'private',
      debugOk: false,
      linked: true,
      calls7d: 0,
      createdAt: Date.now(),
      firstConfig: true,
      desc: desc || '',
      source: source,
      shareMode: scope || 'private',
      permissionTargets: permissionTargets,
      icon: icon,
      iconKind: iconKind
    }, id);
    upsertRegistry({
      id: id,
      name: name,
      type: type || 'qa',
      desc: desc || '',
      status: 'dev',
      scope: scope || 'private',
      shareMode: scope || 'private',
      permissionTargets: permissionTargets,
      userCreated: true,
      source: source,
      icon: icon,
      iconKind: iconKind
    });
    syncRegistryFromState(id);
  }

  /** 第三方接入注册 */
  function onThirdPartyRegistered(id, name, type, scope, desc, endpoint, authType, upstreamApiKey) {
    var apiKey = 'ak_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setState({
      status: scope === 'private' ? 'published' : 'review',
      scope: scope || 'public',
      debugOk: false,
      linked: true,
      calls7d: 0,
      createdAt: Date.now(),
      desc: desc || '',
      source: 'third_party',
      endpoint: endpoint || '',
      authType: authType || 'api_key',
      upstreamApiKey: upstreamApiKey || '',
      apiKey: apiKey
    }, id);
    upsertRegistry({
      id: id,
      name: name,
      type: type || 'qa',
      desc: desc || '',
      status: scope === 'private' ? 'published' : 'review',
      scope: scope || 'public',
      userCreated: true,
      source: 'third_party',
      endpoint: endpoint || '',
      authType: authType || 'api_key'
    });
    syncRegistryFromState(id);
    if (scope === 'public' || scope === 'department') {
      addToAuditQueue({ id: id, name: name, type: type || 'qa', at: new Date().toLocaleString('zh-CN', { hour12: false }), auditStep: 1, source: 'third_party' });
    }
    return { id: id, apiKey: apiKey };
  }

  function isFirstConfig() {
    return params().get('new') === '1';
  }

  function finishFirstConfig() {
    setState({ firstConfig: false });
    if (history.replaceState) {
      var u = new URL(window.location.href);
      u.searchParams.delete('new');
      history.replaceState(null, '', u);
    }
  }

  function getAuditQueue() {
    try {
      var raw = sessionStorage.getItem('proto_audit_queue');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function getAuditItem(id) {
    if (!id) return null;
    var item = getAuditQueue().find(function (x) { return x.id === id; });
    if (item) return item;
    var idx = DEMO_LIST_AGENTS.findIndex(function (x) { return x.id === id; });
    var demo = idx >= 0 ? DEMO_LIST_AGENTS[idx] : null;
    if (!demo) return null;
    var status = resolveAgentListStatus(id, idx >= 0 ? idx : undefined);
    if (status !== 'review') return null;
    var st = getState(id);
    return {
      id: demo.id,
      name: demo.name,
      type: demo.type || 'qa',
      source: demo.source || 'platform',
      applicant: '张三',
      at: st.auditSubmittedAt || '2026-05-21 15:33',
      auditStep: st.auditStep != null ? st.auditStep : 1,
      scope: st.scope || 'public',
      releaseVersion: st.releaseVersion || 'v1.0.0',
      releaseNote: st.releaseNote || '全公司可见发布申请'
    };
  }

  function ensureDemoAuditQueue() {
    DEMO_LIST_AGENTS.forEach(function (a, i) {
      if (resolveAgentListStatus(a.id, i) !== 'review') return;
      if (getAuditQueue().some(function (x) { return x.id === a.id; })) return;
      var st = getState(a.id);
      addToAuditQueue({
        id: a.id,
        name: a.name,
        type: a.type || 'qa',
        source: a.source || 'platform',
        applicant: '张三',
        at: st.auditSubmittedAt || '2026-05-21 15:33',
        auditStep: st.auditStep != null ? st.auditStep : 1
      });
    });
  }

  function getAuditApprovedToday() {
    try {
      var n = parseInt(sessionStorage.getItem('proto_audit_approved_today') || '0', 10);
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  }

  function incrementAuditApprovedToday() {
    try {
      sessionStorage.setItem('proto_audit_approved_today', String(getAuditApprovedToday() + 1));
    } catch (e) {}
  }

  function renderAuditStepper(step, containerSel) {
    var root = typeof containerSel === 'string' ? document.querySelector(containerSel) : containerSel;
    if (!root) return;
    root.querySelectorAll('.audit-step').forEach(function (el) {
      var s = parseInt(el.getAttribute('data-step'), 10);
      el.classList.remove('done', 'current');
      if (s < step) el.classList.add('done');
      else if (s === step) el.classList.add('current');
      var dot = el.querySelector('.dot');
      if (dot) dot.textContent = s < step ? '✓' : String(s + 1);
    });
  }

  function hrefAuditReview(agent) {
    return href('audit-review.html', agent);
  }

  function addToAuditQueue(entry) {
    var q = getAuditQueue().filter(function (x) { return x.id !== entry.id; });
    q.push(entry);
    try { sessionStorage.setItem('proto_audit_queue', JSON.stringify(q)); } catch (e) {}
  }

  function removeFromAuditQueue(id) {
    var q = getAuditQueue().filter(function (x) { return x.id !== id; });
    try { sessionStorage.setItem('proto_audit_queue', JSON.stringify(q)); } catch (e) {}
  }

  function rejectAuditItem(id, reason) {
    removeFromAuditQueue(id);
    setState({
      status: 'rejected',
      rejectionReason: reason || '未提供原因',
      rejectionCount: (getState(id).rejectionCount || 0) + 1,
      rejectedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      auditStep: 0
    }, id);
    syncRegistryFromState(id);
  }

  function approveAuditItem(id) {
    removeFromAuditQueue(id);
    incrementAuditApprovedToday();
    var st = getState(id);
    setState({
      status: 'published',
      auditStep: 2,
      publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      scope: st.scope || 'public'
    }, id);
    syncRegistryFromState(id);
  }

  function updateHealthStatus(id, status) {
    setState({
      healthStatus: status,
      healthCheckedAt: Date.now()
    }, id);
  }

  function isThirdParty(id) {
    var st = getState(id);
    return st.source === 'third_party';
  }

  function getAgentSource(id) {
    var st = getState(id);
    return st.source || 'platform';
  }

  function initCrossLinks(map) {
    if (!map) return;
    Object.keys(map).forEach(function (sel) {
      var target = map[sel];
      document.querySelectorAll(sel).forEach(function (el) {
        if (!el || el.tagName !== 'A') return;
        if (el.getAttribute('data-fixed-link')) return;
        el.href = typeof target === 'function' ? target() : href(target);
      });
    });
  }

  function initOpsListPage() {
    initTopbar('ops');
    wireAgentListRows();
    wirePlaceholderLinks();
    if (global.OpsListDashboard && OpsListDashboard.init) OpsListDashboard.init();
    if (global.OpsListModals && OpsListModals.init) OpsListModals.init();
  }

  function wireAgentListRows(containerSel) {
    var tbody = document.querySelector(containerSel || '.data-table tbody');
    if (!tbody) return;
    var staticRows = tbody.querySelectorAll('tr:not([data-user-agent])');
    staticRows.forEach(function (tr, i) {
      var demo = DEMO_LIST_AGENTS[i];
      if (!demo) return;
      tr.dataset.agentId = demo.id;
      var status = resolveAgentListStatus(demo.id, i);
      tr.dataset.agentStatus = status;
      var statusTd = tr.querySelector('td:nth-child(3)');
      if (statusTd) {
        var sl = statusLabel(status);
        statusTd.innerHTML = '<span class="tag ' + sl[1] + '">' + sl[0] + '</span>';
      }
      var actionsTd = tr.querySelector('td.ops-actions-cell, td:last-child');
      if (actionsTd) {
        actionsTd.classList.add('ops-actions-cell');
        actionsTd.innerHTML = buildAgentListActionsHtml(demo, status);
      }
      var sourceCell = tr.querySelector('td.source-cell');
      if (sourceCell && demo.source) {
        var badge = sourceBadge(demo.source);
        sourceCell.innerHTML = '<span class="source-badge ' + badge[1] + '">' + badge[0] + '</span>';
      }
    });
    wireAgentListActions(tbody);
  }

  var DEMO_LIST_STATUSES = ['published', 'published', 'published', 'published', 'review', 'review', 'dev', 'offline'];

  function resolveAgentListStatus(agentId, fallbackIndex) {
    if (hasStoredState(agentId)) {
      return getState(agentId).status || 'dev';
    }
    if (typeof fallbackIndex === 'number') return DEMO_LIST_STATUSES[fallbackIndex] || 'dev';
    return 'dev';
  }

  function buildAgentListActionsHtml(agent, status) {
    agent = agent || {};
    var id = agent.id;
    var detailHref = href('05-agent-detail.html', agent);
    var parts = ['<div class="ops-row-actions">'];
    parts.push('<a href="' + detailHref + '" class="btn btn-sm ops-act-view">查看</a>');
    if (status === 'published') {
      parts.push('<button type="button" class="btn btn-sm ops-act-warn" data-agent-action="disable" data-agent-id="' + id + '">停用</button>');
      parts.push('<button type="button" class="btn btn-sm ops-act-danger" data-agent-action="offline" data-agent-id="' + id + '">下架</button>');
    } else if (status === 'disabled') {
      parts.push('<button type="button" class="btn btn-sm ops-act-primary" data-agent-action="enable" data-agent-id="' + id + '">启用</button>');
    } else if (status === 'offline') {
      parts.push('<a href="' + href('05-agent-detail.html', Object.assign({}, agent, { tab: 'release' })) + '" class="btn btn-sm ops-act-primary">重新发布</a>');
    } else if (status === 'review') {
      parts.push('<a href="' + href('08-audit-status.html', { id: id }) + '" class="btn btn-sm ops-act-primary">审核进度</a>');
    } else if (status === 'dev' || status === 'pending') {
      parts.push('<a href="' + detailHref + '" class="btn btn-sm ops-act-primary">发布</a>');
    } else if (status === 'rejected') {
      parts.push('<a href="index.html?open=create" class="btn btn-sm ops-act-muted">重新注册</a>');
    }
    parts.push('</div>');
    return parts.join('');
  }

  function refreshAgentListRow(agentId) {
    var tr = document.querySelector('tr[data-agent-id="' + agentId + '"]');
    if (!tr) return;
    var demo = DEMO_LIST_AGENTS.find(function (x) { return x.id === agentId; });
    var reg = getRegistry().find(function (x) { return x.id === agentId; });
    var agent = demo || reg || { id: agentId, name: agentName(), type: agentType() };
    var status = resolveAgentListStatus(agentId);
    tr.dataset.agentStatus = status;
    var statusTd = tr.querySelector('td:nth-child(3)');
    if (statusTd) {
      var sl = statusLabel(status);
      statusTd.innerHTML = '<span class="tag ' + sl[1] + '">' + sl[0] + '</span>';
    }
    var actionsTd = tr.querySelector('td.ops-actions-cell');
    if (actionsTd) actionsTd.innerHTML = buildAgentListActionsHtml(agent, status);
    wireAgentListActions(tr);
    if (global.OpsListDashboard && OpsListDashboard.refresh) OpsListDashboard.refresh();
  }

  function wireAgentListActions(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    (scope && scope.querySelectorAll ? scope : document).querySelectorAll('[data-agent-action]').forEach(function (btn) {
      if (btn.dataset.actionWired) return;
      btn.dataset.actionWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-agent-id');
        var action = btn.getAttribute('data-agent-action');
        if (!id || !action) return;
        if (action === 'offline') {
          if (global.OpsListDashboard && OpsListDashboard.confirmOffline) {
            OpsListDashboard.confirmOffline(id);
          } else {
            setState({ status: 'offline' }, id);
            toast('已下架');
            refreshAgentListRow(id);
          }
          return;
        }
        if (action === 'disable') {
          setState({ status: 'disabled' }, id);
          toast('已停用');
          refreshAgentListRow(id);
          return;
        }
        if (action === 'enable') {
          setState({ status: 'published' }, id);
          toast('已启用');
          refreshAgentListRow(id);
        }
      });
    });
  }

  function wireFlowMapLinks() {
    document.querySelectorAll('.flow-step a[href]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (raw === '05-agent-detail.html') a.href = href('05-agent-detail.html');
      else if (raw === '05-agent-detail.html?new=1') a.href = href('05-agent-detail.html', { new: '1' });
      else if (raw === '05-agent-detail.html?tab=release') a.href = href('05-agent-detail.html', { tab: 'release' });
      else if (raw === 'agent-detail.html') a.href = href('agent-detail.html');
      else if (raw === '06-dev-platform.html') a.href = href('06-dev-platform.html');
      else if (raw === '10-skills-management.html') a.href = href('10-skills-management.html');
      else if (raw === '06-dev-editor.html?new=1') a.href = href('06-dev-editor.html', { new: '1' });
    });
  }

  function wirePlaceholderLinks(root) {
    (root || document).querySelectorAll('a[href="#"]:not([data-no-placeholder])').forEach(function (a) {
      if (a.id === 'opsMonitorLink' || a.id === 'editNameLink') return;
      if (a.getAttribute('data-dev-res') || a.getAttribute('data-action')) return;
      if (a.dataset.placeholderWired) return;
      a.dataset.placeholderWired = '1';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        toast('原型占位：' + (a.textContent.trim() || '功能'));
      });
    });
  }

  function skillIdsFromNames(names) {
    var catalog = getSkillCatalog();
    return (names || []).map(function (n) {
      var s = catalog.find(function (x) { return x.name === n; });
      return s ? s.id : null;
    }).filter(Boolean);
  }

  function applyPickedResources(pickedRaw, pickType) {
    if (!pickedRaw) return;
    var names = decodeURIComponent(pickedRaw).split('、').filter(Boolean);
    if (!names.length) return;
    if (pickType === 'skills' || skillIdsFromNames(names).length) {
      var ids = skillIdsFromNames(names);
      if (ids.length) {
        var merged = getAgentSkillIds().slice();
        ids.forEach(function (id) {
          if (merged.indexOf(id) < 0) merged.push(id);
        });
        setAgentSkillIds(merged);
        renderBoundSkillTags(document);
        toast('已绑定 Skills：' + names.join('、'));
        return;
      }
    }
    toast('已关联资源：' + names.join('、'));
  }

  function wireStandardLinks() {
    initCrossLinks({
      '#backConfig': '05-agent-detail.html',
      '#backDetail': '05-agent-detail.html',
      '#btnBackDetail': '05-agent-detail.html',
      '#creatorLink': '05-agent-detail.html'
    });
  }

  function wireDevPlatformRows() {
    var rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach(function (row) {
      var dev = row.querySelector('.dev-edit-link');
      var ops = row.querySelector('.ops-config-link');
      if (dev && !dev.getAttribute('data-fixed-link')) dev.href = href('06-dev-editor.html');
      if (ops && !ops.getAttribute('data-fixed-link')) ops.href = href('05-agent-detail.html');
      // Check if this row is for a third-party agent
      var opsHref = ops ? (ops.getAttribute('href') || '') : '';
      if (opsHref.indexOf('id=') >= 0) {
        var idMatch = opsHref.match(/id=([^&]+)/);
        if (idMatch) {
          var st = getState(idMatch[1]);
          if (st.source === 'third_party' && dev) {
            dev.style.opacity = '0.4';
            dev.style.pointerEvents = 'none';
            dev.title = '第三方智能体无法在开发平台编辑';
            dev.textContent = '—';
            dev.style.cursor = 'not-allowed';
          }
        }
      }
    });
  }

  function selfCheck() {
    if (params().get('debug') !== '1') return;
    var bad = [];
    document.querySelectorAll('a[href="#"]').forEach(function (a) {
      if (a.id === 'opsMonitorLink' || a.id === 'editNameLink') return;
      if (a.getAttribute('data-dev-res') || a.getAttribute('data-action')) return;
      if (a.classList.contains('ops-back-link') || a.classList.contains('dev-edit-link') ||
          a.classList.contains('ops-config-link')) return;
      if (a.dataset.placeholderWired) return;
      bad.push(a.textContent.trim() || a.id || 'link');
    });
    if (bad.length) console.warn('[Proto.selfCheck] 仍为 # 且无占位的链接:', bad);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', selfCheck);
  } else {
    selfCheck();
  }
  global.Proto = {
    params: params,
    agentId: agentId,
    agentName: agentName,
    agentType: agentType,
    storeKey: storeKey,
    getState: getState,
    hasStoredState: hasStoredState,
    setState: setState,
    qs: qs,
    href: href,
    toast: toast,
    statusLabel: statusLabel,
    initTopbar: initTopbar,
    applyAgentHeader: applyAgentHeader,
    applyStatusTags: applyStatusTags,
    bindTabs: bindTabs,
    markDebugOk: markDebugOk,
    getTokens7d: getTokens7d,
    formatTokens: formatTokens,
    getSkillsHitMetrics: getSkillsHitMetrics,
    formatSkillsHitRate: formatSkillsHitRate,
    addTokenUsage: addTokenUsage,
    recordSessionUsage: recordSessionUsage,
    onAgentCreated: onAgentCreated,
    onThirdPartyRegistered: onThirdPartyRegistered,
    isFirstConfig: isFirstConfig,
    finishFirstConfig: finishFirstConfig,
    getAuditQueue: getAuditQueue,
    getAuditItem: getAuditItem,
    ensureDemoAuditQueue: ensureDemoAuditQueue,
    getAuditApprovedToday: getAuditApprovedToday,
    renderAuditStepper: renderAuditStepper,
    hrefAuditReview: hrefAuditReview,
    addToAuditQueue: addToAuditQueue,
    removeFromAuditQueue: removeFromAuditQueue,
    rejectAuditItem: rejectAuditItem,
    approveAuditItem: approveAuditItem,
    updateHealthStatus: updateHealthStatus,
    isThirdParty: isThirdParty,
    getAgentSource: getAgentSource,
    getRegistry: getRegistry,
    upsertRegistry: upsertRegistry,
    typeLabel: typeLabel,
    scopePill: scopePill,
    sourceLabel: sourceLabel,
    sourceBadge: sourceBadge,
    skillCatalog: SKILL_CATALOG,
    getSkillCatalog: getSkillCatalog,
    saveSkill: saveSkill,
    saveSkillDraft: saveSkillDraft,
    updateSkillStatus: updateSkillStatus,
    deleteSkill: deleteSkill,
    mockParseSkillFile: mockParseSkillFile,
    skillById: skillById,
    skillStatusLabel: skillStatusLabel,
    isSkillUsable: isSkillUsable,
    getAgentSkillIds: getAgentSkillIds,
    setAgentSkillIds: setAgentSkillIds,
    renderSkillTags: renderSkillTags,
    renderBoundSkillTags: renderBoundSkillTags,
    bindSkillConfig: bindSkillConfig,
    wireSkillBindButtons: wireSkillBindButtons,
    migrateAgentSession: migrateAgentSession,
    showModal: showModal,
    hideModal: hideModal,
    ensureOverlaysClosed: ensureOverlaysClosed,
    resolveFirstConfigMode: resolveFirstConfigMode,
    applyFirstConfigUi: applyFirstConfigUi,
    initAgentDetailPage: initAgentDetailPage,
    bindSessionSkills: bindSessionSkills,
    openSkillBindModal: openSkillBindModal,
    initCrossLinks: initCrossLinks,
    initOpsListPage: initOpsListPage,
    wireAgentListRows: wireAgentListRows,
    wireAgentListActions: wireAgentListActions,
    buildAgentListActionsHtml: buildAgentListActionsHtml,
    refreshAgentListRow: refreshAgentListRow,
    resolveAgentListStatus: resolveAgentListStatus,
    wireFlowMapLinks: wireFlowMapLinks,
    wirePlaceholderLinks: wirePlaceholderLinks,
    skillIdsFromNames: skillIdsFromNames,
    applyPickedResources: applyPickedResources,
    wireStandardLinks: wireStandardLinks,
    wireDevPlatformRows: wireDevPlatformRows,
    selfCheck: selfCheck,
    formatDateTime: formatDateTime,
    getLastModifiedText: getLastModifiedText,
    isFirstPublish: isFirstPublish,
    suggestPublishVersion: suggestPublishVersion,
    runAgentPublish: runAgentPublish,
    requiresPublishAudit: requiresPublishAudit,
    incrementPatchVersion: incrementPatchVersion,
    DEMO_LIST_AGENTS: DEMO_LIST_AGENTS,
    DEFAULT_AGENT: DEFAULT_AGENT
  };
})(window);
