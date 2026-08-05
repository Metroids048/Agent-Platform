/**
 * 用户反馈模块 — 对齐 Figma 243:955 / 243:6859 文案与布局
 */
(function (global) {
  var KEY = 'proto_ops_feedback';

  var FIGMA_AGENTS = [
    '党建知识问答', '智能排期助手', '值班助手', '海域知识助手',
    '生产分析助手', '巡检助手', '生产安全顾问'
  ];

  var FIGMA_DETAIL = {
    title: '用户反映在执行复杂逻辑推理时，模型出现明显的时序因果倒置现象',
    badges: [
      { text: '待处理', cls: 'tag-warn' },
      { text: '逻辑推理', cls: 'tag-info' }
    ],
    attrs: [
      { label: '反馈用户', primary: '张智远 (账号:8921)', secondary: '高级逻辑分析师' },
      { label: '提交时间', primary: '2026-05-24 14:30:00', secondary: '12 小时前提交' },
      { label: '关联智能体', primary: '推理链校验引擎v2.0', secondary: 'Agent ID: AG-882-QX' },
      { label: '基础模型', primary: 'Aoqin-Large-Preview', secondary: 'Llama-3-Enhanced Architecture' }
    ],
    messages: [
      {
        role: 'user',
        label: '用户提问',
        text: '请分析以下三段事件的因果关系：A 发生在 B 之前，B 导致 C，但模型回答称 C 发生在 A 之前。'
      },
      {
        role: 'assistant',
        label: '智能体回答',
        text: '根据现有信息，事件 C 先于事件 A 发生，因此 A 不可能是 C 的直接原因。'
      }
    ],
    diagnosis: '根据历史 Feedback 数据集 (FB-441,\nFB-502)，该问题极高概率与“多轮长文本注意力漂移”相关。建议执行 Attention Map 可视化分析。',
    attachments: [
      { name: '错误日志', meta: 'error_trace.log · 24 KB', icon: '📄' },
      { name: '截图', meta: 'screenshot_0524.png · 156 KB', icon: '🖼' }
    ],
    timeline: [
      {
        title: '系统自动完成初步诊断',
        time: '2026-05-24 14:35:00',
        desc: '已关联历史 Feedback 样本，生成 Attention Map 分析建议。',
        dim: false
      },
      {
        title: '用户提交反馈',
        time: '2026-05-24 14:30:00',
        desc: '张智远通过推理链校验引擎提交逻辑推理类问题反馈。',
        dim: true
      }
    ]
  };

  var DEFAULT = [
    {
      id: 'fb_001',
      title: FIGMA_DETAIL.title,
      user: '张智远',
      team: '模型团队',
      status: 'pending',
      type: '逻辑推理',
      agent: '推理链校验引擎v2.0',
      createdAt: '2026-05-24',
      desc: '复杂逻辑推理出现时序因果倒置',
      figmaDetail: true
    },
    { id: 'fb_002', title: '排期结果与日历冲突', user: '用户B', team: '应用团队', status: 'processing', type: '功能', agent: '智能排期助手', createdAt: '2026-06-03', desc: '自动排期未考虑节假日调休' },
    { id: 'fb_003', title: '值班提醒未推送', user: '用户C', team: '平台团队', status: 'pending', type: '稳定性', agent: '值班助手', createdAt: '2026-06-03', desc: '换班后 2 小时仍未收到提醒' },
    { id: 'fb_004', title: '海域法规引用错误', user: '用户D', team: '模型团队', status: 'resolved', type: '准确性', agent: '海域知识助手', createdAt: '2026-06-02', desc: '引用了已废止的海域管理条例' },
    { id: 'fb_005', title: '生产指标计算偏差', user: '用户E', team: '应用团队', status: 'processing', type: '数据', agent: '生产分析助手', createdAt: '2026-06-02', desc: 'OEE 计算与 MES 系统不一致' },
    { id: 'fb_006', title: '巡检路线遗漏点位', user: '用户F', team: '平台团队', status: 'pending', type: '功能', agent: '巡检助手', createdAt: '2026-06-01', desc: '新增设备未纳入默认巡检路线' },
    { id: 'fb_007', title: '安全规范问答不完整', user: '用户G', team: '模型团队', status: 'resolved', type: '准确性', agent: '生产安全顾问', createdAt: '2026-05-31', desc: '未提及 PPE 佩戴要求' },
    { id: 'fb_008', title: '多轮对话上下文丢失', user: '用户H', team: '模型团队', status: 'pending', type: '体验', agent: '党建知识问答', createdAt: '2026-05-30', desc: '第 3 轮无法引用前文' },
    { id: 'fb_009', title: '响应超时超过 30s', user: '用户I', team: '平台团队', status: 'processing', type: '性能', agent: '生产分析助手', createdAt: '2026-05-29', desc: '高峰时段频繁超时' },
    { id: 'fb_010', title: '导出报告字段缺失', user: '用户J', team: '应用团队', status: 'pending', type: '功能', agent: '智能排期助手', createdAt: '2026-05-28', desc: 'PDF 缺少负责人列' }
  ];

  var filterState = { query: '', scope: 'agent' };

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(KEY, JSON.stringify(DEFAULT)); } catch (e2) {}
    return DEFAULT.slice();
  }

  function save(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function byId(id) {
    return load().find(function (x) { return x.id === id; });
  }

  function nextFeedbackId() {
    return 'fb_' + Date.now().toString(36);
  }

  function mapReasonToType(reasons) {
    var list = reasons || [];
    if (list.indexOf('内容生成慢') >= 0) return '性能';
    if (list.indexOf('生成内容错误') >= 0) return '准确性';
    if (list.indexOf('未关联上下文') >= 0) return '体验';
    return '功能';
  }

  /** 用户端对话页提交反馈 */
  function createFromChat(payload) {
    payload = payload || {};
    var id = nextFeedbackId();
    var images = payload.images || payload.attachments || [];
    var text = String(payload.text || '').trim();
    var record = {
      id: id,
      title: (text || (images[0] && images[0].name) || '用户对话反馈').slice(0, 80),
      user: payload.user || '用户',
      team: '模型团队',
      status: 'pending',
      type: '体验',
      agent: payload.agent || '—',
      agentId: payload.agentId || '',
      model: payload.model || '',
      createdAt: new Date().toISOString().slice(0, 10),
      desc: (text || (images.length ? '含 ' + images.length + ' 张图片' : '用户端反馈')).slice(0, 200),
      source: 'user_chat',
      attachments: images.map(function (img) {
        return { name: img.name || '图片', meta: '用户上传', icon: '🖼' };
      })
    };
    var list = load();
    list.unshift(record);
    save(list);
    return id;
  }

  function statusTag(status) {
    var map = {
      pending: ['待处理', 'tag-warn'],
      processing: ['处理中', 'tag-info'],
      resolved: ['已解决', 'tag-ok']
    };
    return map[status] || map.pending;
  }

  function filteredList() {
    return load().filter(function (fb) {
      if (filterState.query) {
        var q = filterState.query.toLowerCase();
        var hay = (fb.title + fb.agent + fb.type + fb.user).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function buildDetailView(fb) {
    if (fb.figmaDetail) return FIGMA_DETAIL;
    var st = statusTag(fb.status);
    return {
      title: fb.title,
      badges: [
        { text: st[0], cls: st[1] },
        { text: fb.type || '反馈', cls: 'tag-info' }
      ],
      attrs: [
        { label: '反馈用户', primary: fb.user || '—', secondary: fb.team || '—' },
        { label: '提交时间', primary: fb.createdAt || '—', secondary: '—' },
        { label: '关联智能体', primary: fb.agent || '—', secondary: '—' },
        { label: '反馈类型', primary: fb.type || '—', secondary: fb.team || '—' }
      ],
      messages: [
        { role: 'user', label: '问题描述', text: fb.desc || fb.title }
      ],
      diagnosis: '暂无自动诊断。可在处理反馈时分派至专家团队进一步分析。',
      attachments: (fb.attachments && fb.attachments.length)
        ? fb.attachments.map(function (a) {
          return { name: a.name || '图片', meta: a.meta || '用户上传', icon: a.icon || '🖼' };
        })
        : [],
      timeline: [
        {
          title: '反馈已收录',
          time: fb.createdAt || '—',
          desc: (fb.user || '用户') + ' 提交反馈，当前状态：' + st[0] + '。',
          dim: false
        }
      ]
    };
  }

  function renderTrendChart() {
    var el = document.getElementById('feedbackTrendChart');
    if (!el) return;
    var colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
    var months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    var legend = FIGMA_AGENTS.map(function (name, i) {
      return '<span class="ops-fb-legend-item"><i style="background:' + colors[i % colors.length] + '"></i>' + name + '</span>';
    }).join('');
    var bars = months.map(function (m, mi) {
      var segs = FIGMA_AGENTS.map(function (_, ai) {
        var h = 20 + ((mi + ai) * 7) % 55;
        return '<span class="ops-fb-bar-seg" style="height:' + h + '%;background:' + colors[ai % colors.length] + '"></span>';
      }).join('');
      return '<div class="ops-fb-bar-col"><div class="ops-fb-bar-stack">' + segs + '</div><span class="ops-fb-bar-label">' + m + '</span></div>';
    }).join('');
    el.innerHTML =
      '<div class="ops-fb-chart-legend">' + legend + '</div>' +
      '<div class="ops-fb-chart-bars">' + bars + '</div>';
  }

  function renderTable() {
    var tbody = document.getElementById('feedbackListBody');
    if (!tbody) return;
    var list = filteredList();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="border:none;">暂无匹配的反馈</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (fb) {
      var st = statusTag(fb.status);
      var detailUrl = OpsShell.href('11-user-feedback-detail.html', { id: fb.id });
      return '<tr data-fb-id="' + fb.id + '">' +
        '<td><strong>' + fb.title + '</strong></td>' +
        '<td>' + (fb.agent || '—') + '</td>' +
        '<td>' + (fb.type || '—') + '</td>' +
        '<td><span class="tag ' + st[1] + '">' + st[0] + '</span></td>' +
        '<td style="color:var(--text-muted);">' + fb.createdAt + '</td>' +
        '<td class="ops-inline-actions">' +
        '<a href="' + detailUrl + '" class="btn btn-sm btn-primary">查看</a>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-row-menu title="更多">⋯</button></td></tr>';
    }).join('');
    list.forEach(function (fb) {
      var row = tbody.querySelector('[data-fb-id="' + fb.id + '"]');
      if (!row || !global.OpsContextMenu) return;
      OpsContextMenu.wireRowActions(row, function () {
        var detailUrl = OpsShell.href('11-user-feedback-detail.html', { id: fb.id });
        return [
          { label: '查看', onClick: function () { window.location.href = detailUrl; } },
          { label: '分派任务', onClick: function () { window.location.href = detailUrl + '&action=dispatch'; } },
          { label: '运营审核', onClick: function () { Proto.toast('已加入运营处理队列（演示）'); } }
        ];
      });
    });
  }

  function wireFilters() {
    var search = document.getElementById('feedbackSearchInput');
    if (search && !search.dataset.wired) {
      search.dataset.wired = '1';
      search.addEventListener('input', function () {
        filterState.query = search.value.trim();
        renderTable();
      });
    }
    var tabs = document.getElementById('feedbackScopeTabs');
    if (tabs && !tabs.dataset.wired) {
      tabs.dataset.wired = '1';
      tabs.querySelectorAll('[data-scope-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          tabs.querySelectorAll('[data-scope-tab]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          filterState.scope = btn.getAttribute('data-scope-tab');
          Proto.toast('已切换至「' + btn.textContent.trim() + '」视图（演示）');
        });
      });
    }
  }

  var PROCESS_ROLE_CONFIG = {
    expert: { frameBase: '243:7114', widthClass: 'modal-w519', options: ['已完成', '无需处理', '专家处理'] },
    team: { frameBase: '243:7143', widthClass: 'modal-w647', options: ['已完成', '无需处理', '成员处理', '专家处理'] },
    ops: { frameBase: '243:7175', widthClass: 'modal-w647', options: ['已完成', '无需处理', '团队处理', '专家处理'] }
  };

  var PROCESS_MEMBERS = ['张三', '李四', '王五', '赵六'];
  var PROCESS_TEAMS = ['开发团队', '智能体团队', '模型团队', '数据团队'];
  var PROCESS_DOMAINS = ['领域1', '领域2', '领域3', '领域4', '领域5'];

  function effectiveProcessRole(role) {
    return role === 'team' ? 'team' : (role === 'expert' ? 'expert' : 'ops');
  }

  function selectedProcessStatus() {
    var el = document.querySelector('input[name="processStatus"]:checked');
    return el ? el.value : '已完成';
  }

  function processStatusRadios(role) {
    var cfg = PROCESS_ROLE_CONFIG[effectiveProcessRole(role)];
    return '<div class="form-row"><span class="form-label">处理状态</span><div class="form-control">' +
      '<div class="ops-process-radios" id="processStatusRadios">' +
      cfg.options.map(function (l, i) {
        return '<label class="ops-radio-pill"><input type="radio" name="processStatus" value="' + l + '"' + (i === 0 ? ' checked' : '') + '><span>' + l + '</span></label>';
      }).join('') +
      '</div></div></div>';
  }

  function renderReasonPanel() {
    return '<div class="ops-process-reason">' +
      '<label class="form-label" for="processReasonInput">请说明理由</label>' +
      '<textarea class="textarea" id="processReasonInput" placeholder="请说明理由"></textarea></div>';
  }

  function renderPickerPanel(items, groupName) {
    return '<div class="ops-process-picker-grid" data-picker-group="' + groupName + '">' +
      items.map(function (name, i) {
        return '<button type="button" class="ops-process-picker-item' + (i === 0 ? ' selected' : '') + '" data-picker-value="' + name + '">' + name + '</button>';
      }).join('') + '</div>';
  }

  function renderExpertTaskPanel(fb) {
    var taskName = fb && fb.title ? fb.title.slice(0, 24) : '模型回答错误修正';
    return '<div class="ops-process-expert-form">' +
      '<div class="ops-process-domain-tags" id="processDomainTags">' +
      PROCESS_DOMAINS.map(function (d, i) {
        return '<button type="button" class="ops-process-domain-tag' + (i === 0 ? ' selected' : '') + '" data-domain="' + d + '">' + d + '</button>';
      }).join('') +
      '</div>' +
      '<label class="ops-process-expert-card selected"><input type="radio" name="processExpertPick" value="赵二" checked> 赵二（职位）</label>' +
      '<label class="ops-process-expert-card"><input type="radio" name="processExpertPick" value="姓名"> 姓名（职位）</label>' +
      '<h4 style="font-size:14px;margin:16px 0 12px;">创建专家任务</h4>' +
      '<div class="ops-expert-form-grid">' +
      '<div class="form-row"><span class="form-label">任务名称*</span><div class="form-control"><input class="input" id="processTaskName" value="' + taskName + '"></div></div>' +
      '<div class="form-row"><span class="form-label">反馈类型</span><div class="form-control"><input class="input" value="答案不准确" readonly></div></div>' +
      '<div class="form-row"><span class="form-label">优先级*</span><div class="form-control"><select class="select" id="processTaskPriority"><option>P0（高）</option><option>P1（中）</option><option>P2（低）</option></select></div></div>' +
      '<div class="form-row"><span class="form-label">奖励积分*</span><div class="form-control"><input class="input" id="processTaskPoints" value="30"></div></div>' +
      '<div class="form-row"><span class="form-label">截止时间*</span><div class="form-control"><input class="input" type="date" id="processTaskDeadline"></div></div>' +
      '<div class="form-row"><span class="form-label">所需专家数*</span><div class="form-control"><input class="input" id="processExpertCount" value="1"></div></div>' +
      '</div></div>';
  }

  function wirePickerItems(container) {
    if (!container) return;
    container.querySelectorAll('.ops-process-picker-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.ops-process-picker-item').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });
  }

  function wireDomainTags(container) {
    if (!container) return;
    container.querySelectorAll('.ops-process-domain-tag').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.ops-process-domain-tag').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });
  }

  function wireExpertCards(container) {
    if (!container) return;
    container.querySelectorAll('.ops-process-expert-card').forEach(function (card) {
      card.addEventListener('click', function () {
        container.querySelectorAll('.ops-process-expert-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        var radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  function applyProcessModalSize(box, role, status) {
    if (!box) return;
    box.classList.remove('modal-w519', 'modal-w647', 'modal-w928', 'modal-compact');
    var effectiveRole = effectiveProcessRole(role);
    if (status === '专家处理' && effectiveRole !== 'expert') {
      box.classList.add('modal-w928');
      return;
    }
    if (status === '成员处理' || status === '团队处理') {
      box.classList.add('modal-w647', 'modal-compact');
      return;
    }
    var cfg = PROCESS_ROLE_CONFIG[effectiveRole];
    box.classList.add(cfg.widthClass);
  }

  function renderProcessDynamicPanel(role, fb) {
    var panel = document.getElementById('processDynamicPanel');
    var box = document.getElementById('feedbackProcessModalBox');
    if (!panel) return;
    var status = selectedProcessStatus();
    var effectiveRole = effectiveProcessRole(role);
    applyProcessModalSize(box, role, status);

    if (status === '已完成' || status === '无需处理') {
      panel.innerHTML = renderReasonPanel();
      return;
    }
    if (status === '成员处理') {
      panel.innerHTML = renderPickerPanel(PROCESS_MEMBERS, 'member');
      wirePickerItems(panel.querySelector('.ops-process-picker-grid'));
      return;
    }
    if (status === '团队处理') {
      panel.innerHTML = renderPickerPanel(PROCESS_TEAMS, 'team');
      wirePickerItems(panel.querySelector('.ops-process-picker-grid'));
      return;
    }
    if (status === '专家处理') {
      if (effectiveRole === 'expert') {
        panel.innerHTML = renderReasonPanel();
      } else {
        panel.innerHTML = renderExpertTaskPanel(fb);
        wireDomainTags(panel.querySelector('#processDomainTags'));
        wireExpertCards(panel);
      }
      return;
    }
    panel.innerHTML = '';
  }

  function wireProcessModalRadios(role, fb) {
    document.querySelectorAll('input[name="processStatus"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        renderProcessDynamicPanel(role, fb);
      });
    });
    renderProcessDynamicPanel(role, fb);
  }

  function processModalVariant(role, fb) {
    var modal = document.getElementById('feedbackProcessModal');
    if (!modal) return;
    var box = document.getElementById('feedbackProcessModalBox');
    var titleEl = modal.querySelector('.modal-header h2');
    var extraEl = document.getElementById('processExtraFields');
    var effectiveRole = effectiveProcessRole(role);
    if (titleEl) titleEl.textContent = '处理反馈';
    if (extraEl) extraEl.innerHTML = processStatusRadios(role);
    if (box) {
      box.classList.remove('modal-sm-variant', 'modal-w519', 'modal-w647', 'modal-w928', 'modal-compact');
      box.classList.add(PROCESS_ROLE_CONFIG[effectiveRole].widthClass);
    }
    wireProcessModalRadios(role, fb);
  }

  function renderDetailDom(fb, view) {
    var heroTitle = document.getElementById('fbHeroTitle');
    if (heroTitle) heroTitle.textContent = view.title;

    var badgesEl = document.getElementById('fbHeroBadges');
    if (badgesEl) {
      badgesEl.innerHTML = view.badges.map(function (b) {
        return '<span class="tag ' + b.cls + '">' + b.text + '</span>';
      }).join('');
    }

    var gridEl = document.getElementById('fbAttrGrid');
    if (gridEl) {
      gridEl.innerHTML = view.attrs.map(function (a) {
        return '<div class="ops-fb-bento-cell">' +
          '<div class="ops-fb-bento-label"><span aria-hidden="true">◆</span>' + a.label + '</div>' +
          '<div class="ops-fb-bento-primary">' + a.primary + '</div>' +
          '<div class="ops-fb-bento-secondary">' + a.secondary + '</div>' +
          '</div>';
      }).join('');
    }

    var originalEl = document.getElementById('feedbackOriginalBody');
    if (originalEl) {
      originalEl.innerHTML = view.messages.map(function (m) {
        return '<div class="ops-fb-chat-bubble ' + m.role + '">' +
          '<div class="ops-fb-chat-role">' + m.label + '</div>' +
          m.text + '</div>';
      }).join('');
    }

    var diagEl = document.getElementById('fbDiagnosisText');
    if (diagEl) diagEl.textContent = view.diagnosis;

    var attachEl = document.getElementById('attachList');
    if (attachEl) {
      attachEl.innerHTML = view.attachments.map(function (a) {
        return '<div class="ops-fb-attach-item" role="button" tabindex="0" data-attach="' + a.name + '">' +
          '<div class="ops-fb-attach-icon">' + a.icon + '</div>' +
          '<div class="ops-fb-attach-meta"><strong>' + a.name + '</strong><span>' + a.meta + '</span></div>' +
          '</div>';
      }).join('');
      attachEl.querySelectorAll('.ops-fb-attach-item').forEach(function (item) {
        item.addEventListener('click', function () {
          Proto.toast('打开附件「' + item.getAttribute('data-attach') + '」（演示）');
        });
      });
    }

    var timelineEl = document.getElementById('processTimeline');
    if (timelineEl) {
      timelineEl.innerHTML = view.timeline.map(function (step) {
        return '<div class="ops-fb-timeline-item' + (step.dim ? ' is-dim' : '') + '">' +
          '<div class="ops-fb-timeline-head"><strong>' + step.title + '</strong><time>' + step.time + '</time></div>' +
          '<p class="ops-fb-timeline-desc">' + step.desc + '</p></div>';
      }).join('');
    }

    var priEl = document.getElementById('fbPriority');
    if (priEl) priEl.textContent = '类型：' + (fb.type || '—');
  }

  function initListPage() {
    OpsShell.initShell({ module: 'feedback' });
    OpsDispatch.ensureModals();
    renderTrendChart();
    wireFilters();
    renderTable();
  }

  function initDetailPage() {
    OpsShell.initShell({ module: 'feedback' });
    OpsDispatch.ensureModals();
    var id = OpsShell.params().get('id') || 'fb_001';
    var fb = byId(id);
    if (!fb) {
      document.querySelector('.main').innerHTML = '<div class="card" style="padding:24px;text-align:center;">未找到反馈记录<a href="' + OpsShell.href('11-user-feedback.html') + '" class="btn btn-primary" style="margin-left:12px;">返回列表</a></div>';
      return;
    }

    var view = buildDetailView(fb);
    renderDetailDom(fb, view);

    var listLink = document.getElementById('breadcrumbListLink');
    if (listLink) listLink.href = OpsShell.href('11-user-feedback.html');

    document.getElementById('btnProcessFeedback').addEventListener('click', function () {
      processModalVariant(OpsShell.getRole(), fb);
      OpsShell.openModal('feedbackProcessModal');
    });

    var diagBtn = document.getElementById('btnViewDiagnosis');
    if (diagBtn) {
      diagBtn.addEventListener('click', function () {
        Proto.toast('正在打开详细诊断报告（演示）');
      });
    }

    document.getElementById('btnDispatchTeam').addEventListener('click', function () { OpsDispatch.openTeam(fb); });
    document.getElementById('btnDispatchExpert').addEventListener('click', function () { OpsDispatch.openExpert(fb); });
    document.getElementById('btnMultiExpert').addEventListener('click', function () { OpsDispatch.openMultiExpert(); });

    document.getElementById('confirmProcessFeedback').addEventListener('click', function () {
      var selected = document.querySelector('input[name="processStatus"]:checked');
      var statusVal = selected ? selected.value : '';
      var reasonEl = document.getElementById('processReasonInput');
      if ((statusVal === '已完成' || statusVal === '无需处理') && reasonEl && !reasonEl.value.trim()) {
        Proto.toast('请说明理由');
        return;
      }
      if (statusVal === '已完成') fb.status = 'resolved';
      else if (statusVal) fb.status = 'processing';
      save(load().map(function (x) { return x.id === fb.id ? fb : x; }));
      OpsShell.closeModal('feedbackProcessModal');
      Proto.toast('处理状态已更新：' + (statusVal || '已保存'));
      var updatedView = buildDetailView(fb);
      renderDetailDom(fb, updatedView);
    });

    if (OpsShell.params().get('action') === 'dispatch') {
      setTimeout(function () { OpsDispatch.openTeam(fb); }, 300);
    }
  }

  global.OpsUserFeedback = {
    load: load,
    save: save,
    byId: byId,
    createFromChat: createFromChat,
    FIGMA_AGENTS: FIGMA_AGENTS,
    FIGMA_DETAIL: FIGMA_DETAIL,
    buildDetailView: buildDetailView,
    initListPage: initListPage,
    initDetailPage: initDetailPage
  };
})(window);
