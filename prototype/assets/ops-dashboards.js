/**
 * 运营看板四件套：业务 / 模型 / 资源 / 用户与智能体画像
 */
(function (global) {
  var DEMO = {
    business: {
      kpis: [
        { label: '日活用户', value: '1,284', delta: '+12%' },
        { label: '智能体会话', value: '8,420', delta: '+8%' },
        { label: '待处理反馈', value: '18', delta: '-3' },
        { label: '回流工单', value: '6', delta: '+2' }
      ],
      topAgents: [
        { name: '敖钦·智能助手', calls: 3240, satisfaction: '92%' },
        { name: '党建智能助手', calls: 1820, satisfaction: '88%' },
        { name: '钻完井报告助手', calls: 960, satisfaction: '85%' }
      ]
    },
    model: {
      kpis: [
        { label: '总调用量', value: '42.6K', delta: '+5%' },
        { label: '平均 Token/次', value: '1,240', delta: '-2%' },
        { label: '失败率', value: '1.2%', delta: '-0.3%' },
        { label: '旗舰档占比', value: '18%', delta: '+1%' }
      ],
      tiers: [
        { tier: '标准模型', calls: 18200, pct: 43 },
        { tier: '增强模型', calls: 12400, pct: 29 },
        { tier: '专业模型', calls: 8200, pct: 19 },
        { tier: '旗舰模型', calls: 3800, pct: 9 }
      ]
    },
    resource: {
      kpis: [
        { label: 'Token 消耗', value: '12.8M', delta: '+6%' },
        { label: 'P95 延迟', value: '820ms', delta: '-40ms' },
        { label: 'GPU 利用率', value: '67%', delta: '+4%' },
        { label: '配额告警', value: '2', delta: '0' }
      ],
      pools: [
        { pool: 'haineng-general-7b', util: 54, tokens: '4.2M' },
        { pool: 'haineng-general-32b', util: 72, tokens: '5.1M' },
        { pool: 'haineng-domain-ft', util: 61, tokens: '2.4M' },
        { pool: 'haineng-flagship', util: 83, tokens: '1.1M' }
      ]
    },
    profile: {
      kpis: [
        { label: '画像覆盖用户', value: '892', delta: '+15' },
        { label: '高频用户', value: '126', delta: '+4' },
        { label: '沉默用户', value: '48', delta: '-6' },
        { label: '跨智能体用户', value: '203', delta: '+11' }
      ],
      segments: [
        { name: '财务报销高频', users: 86, agents: ['差旅报销助手'] },
        { name: 'QHSE 专业', users: 64, agents: ['钻完井安全', 'jsa文档生成'] },
        { name: '党建材料', users: 112, agents: ['党建智能助手'] }
      ]
    }
  };

  function renderKpis(containerId, kpis) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = kpis.map(function (k) {
      return '<div class="ops-dash-kpi"><div class="ops-dash-kpi-label">' + k.label + '</div>' +
        '<div class="ops-dash-kpi-val">' + k.value + '</div>' +
        '<div class="ops-dash-kpi-delta" style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + k.delta + '</div></div>';
    }).join('');
  }

  function renderBarRows(containerId, rows, labelKey, valueKey, pctKey) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = rows.map(function (r) {
      var pct = pctKey ? r[pctKey] : 0;
      return '<div class="ops-dash-bar-row">' +
        '<div class="ops-dash-bar-head"><span>' + r[labelKey] + '</span><span>' + r[valueKey] + '</span></div>' +
        (pctKey ? '<div class="ops-dash-bar-track"><div class="ops-dash-bar-fill" style="width:' + pct + '%"></div></div>' : '') +
        '</div>';
    }).join('');
  }

  function renderWorkOrders(containerId) {
    var el = document.getElementById(containerId);
    if (!el || !global.OpsFeedbackLoop) return;
    var orders = OpsFeedbackLoop.getOrders(8);
    if (!orders.length) {
      el.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">暂无回流工单。完成专家任务后将自动生成。</p>';
      return;
    }
    el.innerHTML = '<table class="data-table"><thead><tr><th>工单</th><th>回流目标</th><th>状态</th><th>时间</th><th></th></tr></thead><tbody>' +
      orders.map(function (o) {
        return '<tr><td><strong>' + o.title + '</strong><div style="font-size:11px;color:var(--text-muted);">' + (o.agent || '—') + '</div></td>' +
          '<td><span class="tag tag-info">' + o.route_label + '</span></td>' +
          '<td><span class="tag tag-warn">' + o.status + '</span></td>' +
          '<td style="color:var(--text-muted);font-size:12px;">' + o.created_at + '</td>' +
          '<td><a href="' + OpsFeedbackLoop.deepLinkForOrder(o) + '" class="btn btn-sm">前往</a></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function mergePlatformMetrics() {
    if (!global.PlatformApi) return;
    var all = PlatformApi.reportMetricsAll();
    var totalCalls = 0;
    Object.keys(all).forEach(function (k) { totalCalls += all[k].calls || 0; });
    if (totalCalls > 0) {
      DEMO.business.kpis[1].value = String(totalCalls);
      DEMO.model.kpis[0].value = String(totalCalls);
    }
  }

  function initBusinessPage() {
    OpsShell.initShell({ module: 'dashboard', subtitle: '业务看板' });
    mergePlatformMetrics();
    renderKpis('dashKpis', DEMO.business.kpis);
    renderBarRows('dashTopAgents', DEMO.business.topAgents.map(function (a) {
      return { name: a.name, calls: a.calls + ' 次 / ' + a.satisfaction, pct: Math.min(100, Math.round(a.calls / 40)) };
    }), 'name', 'calls', 'pct');
    renderWorkOrders('dashWorkOrders');
  }

  function initModelPage() {
    OpsShell.initShell({ module: 'dashboard', subtitle: '模型看板' });
    mergePlatformMetrics();
    renderKpis('dashKpis', DEMO.model.kpis);
    renderBarRows('dashTiers', DEMO.model.tiers, 'tier', 'calls', 'pct');
  }

  function initResourcePage() {
    OpsShell.initShell({ module: 'dashboard', subtitle: '资源看板' });
    renderKpis('dashKpis', DEMO.resource.kpis);
    renderBarRows('dashPools', DEMO.resource.pools.map(function (p) {
      return { pool: p.pool, meta: p.tokens + ' · ' + p.util + '%', pct: p.util };
    }), 'pool', 'meta', 'pct');
  }

  function initProfilePage() {
    OpsShell.initShell({ module: 'dashboard', subtitle: '用户与智能体画像' });
    renderKpis('dashKpis', DEMO.profile.kpis);
    var el = document.getElementById('dashSegments');
    if (el) {
      el.innerHTML = DEMO.profile.segments.map(function (s) {
        return '<div class="card" style="padding:14px;margin-bottom:10px;">' +
          '<strong>' + s.name + '</strong> <span class="tag tag-info">' + s.users + ' 人</span>' +
          '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">常用：' + s.agents.join('、') + '</p></div>';
      }).join('');
    }
  }

  global.OpsDashboards = {
    initBusinessPage: initBusinessPage,
    initModelPage: initModelPage,
    initResourcePage: initResourcePage,
    initProfilePage: initProfilePage
  };
})(window);
