/**
 * 双平台 + 敖钦基座 API 契约（原型 mock 层）
 * ADR-008 五环节：创建 / 资源 / 配置同步 / 对话 / 指标回传
 */
(function (global) {
  var KEYS = {
    registry: 'platform_api_agents',
    configs: 'platform_api_configs',
    metrics: 'platform_api_metrics',
    chats: 'platform_api_chats'
  };

  var TIER_MAP = {
    'DeepSeek-V4-Flash 模型': { pool: 'deepseek-v4-flash', max_tokens: 4096 },
    'DeepSeek-V4-Pro 模型': { pool: 'deepseek-v4-pro', max_tokens: 8192 },
    'DeepSeek-R1-32B 模型': { pool: 'deepseek-r1-32b', max_tokens: 8192 },
    'DeepSeek-R1-671B 模型': { pool: 'deepseek-r1-671b', max_tokens: 32768 }
  };

  var useMock = true;

  function read(key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (fallback !== undefined) {
      try { sessionStorage.setItem(key, JSON.stringify(fallback)); } catch (e2) {}
      return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback));
    }
    return null;
  }

  function write(key, val) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function nextId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /** ① 同步创建智能体 */
  function syncCreateAgent(payload) {
    payload = payload || {};
    var id = payload.agent_id || nextId('agt');
    var record = {
      agent_id: id,
      name: payload.name || '新智能体',
      type: payload.type || 'qa',
      owner_id: payload.owner_id || 'user_demo',
      scope: payload.scope || 'private',
      share_mode: payload.share_mode || payload.scope || 'private',
      permission_targets: payload.permission_targets || [],
      status: payload.status || 'dev',
      source: payload.source || 'platform',
      linked: true,
      dev_agent_id: id,
      created_at: new Date().toISOString()
    };
    var list = read(KEYS.registry, []);
    var idx = list.findIndex(function (x) { return x.agent_id === id; });
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], record);
    else list.push(record);
    write(KEYS.registry, list);
    return delay(useMock ? 400 : 0).then(function () {
      return { ok: true, agent_id: id, dev_agent_id: id, linked: true };
    });
  }

  /** ② 获取可用资源 */
  function getAvailableResources(agentId, userId) {
    return delay(useMock ? 200 : 0).then(function () {
      return {
        agent_id: agentId,
        user_id: userId || 'user_demo',
        models: Object.keys(TIER_MAP).map(function (tier) {
          return { tier: tier, quota_remaining: 10000, allowed: true, pool: TIER_MAP[tier].pool };
        }),
        knowledge_bases: [
          { id: 'kb_corp', name: '企业知识库', source: 'haineng' },
          { id: 'kb_party', name: '党建材料库', source: 'haineng' },
          { id: 'kb_qhse', name: 'QHSE制度库', source: 'haineng' }
        ],
        tools: [
          { id: 'tool_erp', name: 'ERP 预算校验', enabled: true }
        ],
        skills: global.Proto && global.Proto.getSkillCatalog
          ? global.Proto.getSkillCatalog().filter(function (s) { return s.status === 'enabled'; }).map(function (s) {
            return { id: s.id, name: s.name };
          })
          : []
      };
    });
  }

  /** ③ 同步配置摘要 */
  function syncConfig(agentId, summary) {
    var map = read(KEYS.configs, {});
    map[agentId] = Object.assign({}, summary || {}, {
      agent_id: agentId,
      synced_at: new Date().toISOString()
    });
    write(KEYS.configs, map);
    return delay(useMock ? 150 : 0).then(function () {
      return { ok: true, agent_id: agentId, summary: map[agentId] };
    });
  }

  function getConfigSummary(agentId) {
    var map = read(KEYS.configs, {});
    return map[agentId] || null;
  }

  /** ④ 发起对话（经敖钦推理 mock） */
  function startChat(payload) {
    payload = payload || {};
    var traceId = payload.trace_id || nextId('tr');
    var tier = payload.model_tier || 'DeepSeek-R1-671B 模型';
    var tierInfo = TIER_MAP[tier] || TIER_MAP['DeepSeek-R1-671B 模型'];
    var log = read(KEYS.chats, []);
    log.push({
      trace_id: traceId,
      agent_id: payload.agent_id,
      model_tier: tier,
      pool: tierInfo.pool,
      at: new Date().toISOString(),
      message_count: (payload.messages || []).length
    });
    if (log.length > 200) log = log.slice(-200);
    write(KEYS.chats, log);
    bumpMetrics(payload.agent_id, { calls: 1, tokens_in: 120, tokens_out: 280, latency_ms: 640 });
    return delay(useMock ? 300 : 0).then(function () {
      return {
        ok: true,
        trace_id: traceId,
        model_tier: tier,
        pool: tierInfo.pool,
        reply: '（敖钦推理 mock）已基于「' + tier + '」与智能体配置生成回答。'
      };
    });
  }

  /** ⑤ 回传/读取运行指标 */
  function bumpMetrics(agentId, delta) {
    if (!agentId) return;
    var map = read(KEYS.metrics, {});
    var cur = map[agentId] || { calls: 0, tokens_in: 0, tokens_out: 0, latency_ms: 0, error_rate: 0 };
    cur.calls += delta.calls || 0;
    cur.tokens_in += delta.tokens_in || 0;
    cur.tokens_out += delta.tokens_out || 0;
    if (delta.latency_ms) cur.latency_ms = Math.round((cur.latency_ms + delta.latency_ms) / 2);
    cur.updated_at = new Date().toISOString();
    map[agentId] = cur;
    write(KEYS.metrics, map);
  }

  function reportMetrics(agentId, range) {
    var map = read(KEYS.metrics, {});
    var m = map[agentId] || { calls: 0, tokens_in: 0, tokens_out: 0, latency_ms: 0, error_rate: 0.01 };
    return delay(useMock ? 100 : 0).then(function () {
      return Object.assign({}, m, {
        agent_id: agentId,
        range: range || '7d',
        p95_latency_ms: Math.max(m.latency_ms, 820)
      });
    });
  }

  function reportMetricsAll() {
    return read(KEYS.metrics, {});
  }

  global.PlatformApi = {
    useMock: function (v) { useMock = v !== false; },
    TIER_MAP: TIER_MAP,
    syncCreateAgent: syncCreateAgent,
    getAvailableResources: getAvailableResources,
    syncConfig: syncConfig,
    getConfigSummary: getConfigSummary,
    startChat: startChat,
    reportMetrics: reportMetrics,
    reportMetricsAll: reportMetricsAll,
    bumpMetrics: bumpMetrics
  };
})(window);
