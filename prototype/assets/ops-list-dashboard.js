/**
 * 智能体运营列表页 — 看板 + 列表筛选 + 下架确认
 */
(function (global) {
  var pendingOfflineId = null;

  function countByStatus() {
    var counts = { published: 0, disabled: 0, review: 0, dev: 0, pending: 0, offline: 0, rejected: 0 };
    var total = 0;
    var calls7d = 0;
    Proto.DEMO_LIST_AGENTS.forEach(function (a, i) {
      var st = Proto.resolveAgentListStatus(a.id, i);
      counts[st] = (counts[st] || 0) + 1;
      if (st === 'published') calls7d += Proto.getState(a.id).calls7d || 0;
      total++;
    });
    Proto.getRegistry().filter(function (x) { return x.userCreated; }).forEach(function (a) {
      var st = Proto.resolveAgentListStatus(a.id);
      counts[st] = (counts[st] || 0) + 1;
      if (st === 'published') calls7d += Proto.getState(a.id).calls7d || 0;
      total++;
    });
    if ((counts.published || 0) > 0 && calls7d === 0) calls7d = counts.published * 128;
    return { counts: counts, total: total, calls7d: calls7d };
  }

  function computeMetrics() {
    var c = countByStatus();
    var published = c.counts.published || 0;
    var review = c.counts.review || 0;
    var alerts = (c.counts.review || 0) + (c.counts.rejected || 0) + (c.counts.disabled || 0);
    var calls7d = c.calls7d || 0;
    return {
      total: c.total,
      published: published,
      review: review,
      running: published,
      calls7d: calls7d,
      calls7dDelta: calls7d > 0 ? '+18%' : '',
      alerts: Math.max(alerts, 1),
      alertLevel: alerts >= 3 ? '紧急' : '正常',
      latency: published > 0 ? '42ms' : '—',
      latencyDelta: published > 0 ? '-5ms' : '',
      runningDelta: published >= 4 ? '+12%' : '+8%',
      maxConcurrency: published > 0 ? 94 : 0,
      successRate: published > 0 ? '88.5%' : '—',
      detectTotal: published > 0 ? '1.4k' : '0'
    };
  }

  function kpiCard(opts) {
    var pill = opts.pill
      ? (opts.pillHref
        ? '<a href="' + opts.pillHref + '" class="ops-dash-pill ' + opts.pillClass + '">' + opts.pill + '</a>'
        : '<span class="ops-dash-pill ' + opts.pillClass + '">' + opts.pill + '</span>')
      : '';
    var attrs = opts.action ? ' data-kpi-action="' + opts.action + '"' + (opts.status ? ' data-status="' + opts.status + '"' : '') : '';
    var clickable = opts.action ? ' ops-dash-kpi-click' : '';
    return '<div class="ops-dash-kpi ops-dash-kpi-' + opts.tone + clickable + '"' + attrs + '>' +
      '<div class="ops-dash-kpi-icon">' + opts.icon + '</div>' +
      '<div class="ops-dash-kpi-body">' +
        '<div class="ops-dash-kpi-label">' + opts.label + '</div>' +
        '<div class="ops-dash-kpi-val">' + opts.val + '</div>' +
      '</div>' + pill + '</div>';
  }

  function renderKpis(m) {
    var el = document.getElementById('opsDashKpis');
    if (!el) return;
    el.innerHTML =
      kpiCard({
        tone: 'blue', icon: '🤖', label: '运行中智能体', val: m.running.toLocaleString(),
        pill: m.runningDelta, pillClass: 'ops-dash-pill-blue', action: 'filter', status: 'published'
      }) +
      kpiCard({
        tone: 'red', icon: '⚠️', label: '异常监控', val: m.alerts,
        pill: m.alertLevel, pillClass: m.alerts >= 3 ? 'ops-dash-pill-red' : 'ops-dash-pill-green',
        action: 'filter', status: 'review'
      }) +
      kpiCard({
        tone: 'yellow', icon: '⏱️', label: '平均调度延迟', val: m.latency,
        pill: m.latencyDelta, pillClass: 'ops-dash-pill-yellow'
      }) +
      kpiCard({
        tone: 'purple', icon: '💬', label: '近 7 日对话量', val: m.calls7d > 0 ? m.calls7d.toLocaleString() : '—',
        pill: m.calls7dDelta, pillClass: 'ops-dash-pill-purple',
        action: 'filter', status: 'published'
      });
    wireKpiClicks(el);
  }

  var dashOptions = { hideQuickLinks: false, hideInterceptEvents: false };

  function renderCompliance(m) {
    var el = document.getElementById('opsDashCompliance');
    if (!el) return;
    var eventsBlock = dashOptions.hideInterceptEvents
      ? ''
      : '<div class="ops-dash-events">' +
          '<div class="ops-dash-events-title">最近拦截记录</div>' +
          '<div class="ops-dash-event">' +
            '<div class="ops-dash-event-icon ops-dash-event-icon-warn">🚫</div>' +
            '<div class="ops-dash-event-body">' +
              '<div class="ops-dash-event-title">敏感词触发：外部通信拦截</div>' +
              '<div class="ops-dash-event-meta">采购申请助手 · 14:32:10</div>' +
            '</div>' +
            '<a href="' + Proto.hrefAuditReview({ id: 'agt_procure', name: '采购申请助手', type: 'flow' }) + '" class="ops-dash-event-link">详情</a>' +
          '</div>' +
          '<div class="ops-dash-event">' +
            '<div class="ops-dash-event-icon ops-dash-event-icon-danger">🛡️</div>' +
            '<div class="ops-dash-event-body">' +
              '<div class="ops-dash-event-title">越权访问尝试：API 403</div>' +
              '<div class="ops-dash-event-meta">第三方凭证校验 · 14:15:22</div>' +
            '</div>' +
            '<a href="audit-workbench.html" class="ops-dash-event-link">详情</a>' +
          '</div>' +
        '</div>';
    el.innerHTML =
      '<div class="ops-dash-compliance-body' + (dashOptions.hideInterceptEvents ? ' ops-dash-compliance-body--compact' : '') + '">' +
        '<div class="ops-dash-donut-wrap">' +
          '<div class="ops-dash-donut" aria-hidden="true">' +
            '<div class="ops-dash-donut-ring"></div>' +
            '<div class="ops-dash-donut-center">' + m.detectTotal + '<small>总检测次数</small></div>' +
          '</div>' +
          '<ul class="ops-dash-legend">' +
            '<li><span><i class="ops-dash-legend-dot" style="background:#3b82f6;"></i>数据隐私</span><strong>35%</strong></li>' +
            '<li><span><i class="ops-dash-legend-dot" style="background:#f472b6;"></i>内容安全</span><strong>35%</strong></li>' +
            '<li><span><i class="ops-dash-legend-dot" style="background:#34d399;"></i>接口合规</span><strong>30%</strong></li>' +
          '</ul>' +
        '</div>' +
        eventsBlock +
      '</div>';
  }

  function renderSchedule(m) {
    var el = document.getElementById('opsDashSchedule');
    if (!el) return;
    el.innerHTML =
      '<div class="ops-dash-schedule-chart">' +
        '<div class="ops-dash-chart-legend-top">' +
          '<span class="legend-rt"><i></i>实时任务</span>' +
          '<span class="legend-batch"><i></i>批处理任务</span>' +
        '</div>' +
        '<svg class="ops-dash-trend-chart" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.18"/>' +
              '<stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path fill="url(#rtGrad)" d="M0,110 L57,100 L114,78 L171,62 L228,38 L285,48 L342,58 L400,52 L400,140 L0,140 Z"/>' +
          '<polyline fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="7 5" stroke-linecap="round"' +
            ' points="0,105 57,95 114,88 171,80 228,72 285,78 342,82 400,85"/>' +
          '<polyline fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"' +
            ' points="0,110 57,100 114,78 171,62 228,38 285,48 342,58 400,52"/>' +
          '<circle cx="228" cy="38" r="4" fill="#fff" stroke="#3b82f6" stroke-width="2"/>' +
        '</svg>' +
        '<div class="ops-dash-chart-labels">' +
          '<span>05-18</span><span>05-19</span><span>05-20</span><span>05-21</span>' +
          '<span>05-22</span><span>05-23</span><span>05-24</span>' +
        '</div>' +
      '</div>' +
      '<div class="ops-dash-stat-cards">' +
        '<div class="ops-dash-stat-card">' +
          '<div class="ops-dash-stat-val">' + (m.maxConcurrency || '—') + '</div>' +
          '<div class="ops-dash-stat-lbl">最大并发</div>' +
        '</div>' +
        '<div class="ops-dash-stat-card">' +
          '<div class="ops-dash-stat-val">' + m.successRate + '</div>' +
          '<div class="ops-dash-stat-lbl">任务成功率</div>' +
        '</div>' +
      '</div>';
  }

  function wireKpiClicks(root) {
    root.querySelectorAll('[data-kpi-action]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a.ops-dash-pill')) return;
        var action = card.getAttribute('data-kpi-action');
        if (action === 'scroll-list') scrollToAgentList(null);
        else if (action === 'filter') scrollToAgentList(card.getAttribute('data-status'));
      });
    });
  }

  function scrollToAgentList(statusKey) {
    var section = document.getElementById('agentListSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (statusKey) applyStatusFilter(statusKey);
  }

  function applyStatusFilter(statusKey) {
    var group = document.querySelector('[data-status-filter-group]');
    if (!group) return;
    group.querySelectorAll('.filter-pills button').forEach(function (btn) {
      var f = btn.getAttribute('data-status-filter') || '';
      btn.classList.toggle('active', f === (statusKey || ''));
    });
    filterListRows(statusKey);
  }

  function filterListRows(statusKey) {
    document.querySelectorAll('.data-table tbody tr').forEach(function (tr) {
      if (!statusKey) tr.classList.remove('ops-row-hidden');
      else tr.classList.toggle('ops-row-hidden', tr.getAttribute('data-agent-status') !== statusKey);
    });
  }

  function wireListFilters() {
    var group = document.querySelector('[data-status-filter-group]');
    if (!group || group.dataset.wired) return;
    group.dataset.wired = '1';
    group.querySelectorAll('.filter-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        group.querySelectorAll('.filter-pills button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filterListRows(btn.getAttribute('data-status-filter') || null);
      });
    });
  }

  function renderQuickLinks(m) {
    var el = document.getElementById('opsDashQuickLinks');
    if (!el) return;
    if (dashOptions.hideQuickLinks) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = '<a href="audit-workbench.html" class="ops-dash-quick">审核工作台' + (m.review ? ' (' + m.review + ')' : '') + '</a>';
  }

  function refresh(options) {
    dashOptions = Object.assign({ hideQuickLinks: false, hideInterceptEvents: false }, options || {});
    if (Proto.ensureDemoAuditQueue) Proto.ensureDemoAuditQueue();
    var m = computeMetrics();
    renderKpis(m);
    renderCompliance(m);
    renderSchedule(m);
    renderQuickLinks(m);
  }

  function confirmOffline(agentId) {
    pendingOfflineId = agentId;
    var mask = document.getElementById('opsOfflineModal');
    if (!mask) {
      Proto.setState({ status: 'offline' }, agentId);
      Proto.toast('已下架');
      Proto.refreshAgentListRow(agentId);
      return;
    }
    mask.classList.add('show');
    mask.setAttribute('aria-hidden', 'false');
  }

  function hideOfflineModal() {
    pendingOfflineId = null;
    var mask = document.getElementById('opsOfflineModal');
    if (mask) {
      mask.classList.remove('show');
      mask.setAttribute('aria-hidden', 'true');
    }
  }

  function wireOfflineModal() {
    var mask = document.getElementById('opsOfflineModal');
    if (!mask || mask.dataset.wired) return;
    mask.dataset.wired = '1';
    mask.querySelectorAll('[data-offline-cancel]').forEach(function (btn) {
      btn.addEventListener('click', hideOfflineModal);
    });
    var confirm = mask.querySelector('[data-offline-confirm]');
    if (confirm) {
      confirm.addEventListener('click', function () {
        if (!pendingOfflineId) return hideOfflineModal();
        Proto.setState({ status: 'offline' }, pendingOfflineId);
        Proto.toast('已下架');
        Proto.refreshAgentListRow(pendingOfflineId);
        hideOfflineModal();
      });
    }
    mask.addEventListener('click', function (e) {
      if (e.target === mask) hideOfflineModal();
    });
  }

  function init(options) {
    refresh(options);
    wireOfflineModal();
    wireListFilters();
    if (global.location && global.location.hash === '#agent-list') {
      var params = new URLSearchParams(global.location.search);
      var st = params.get('status');
      if (st) applyStatusFilter(st);
      else scrollToAgentList(null);
    }
  }

  global.OpsListDashboard = {
    init: init,
    refresh: refresh,
    confirmOffline: confirmOffline,
    computeMetrics: computeMetrics,
    applyStatusFilter: applyStatusFilter,
    scrollToAgentList: scrollToAgentList
  };
})(typeof window !== 'undefined' ? window : global);
