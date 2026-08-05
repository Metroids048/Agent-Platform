/**
 * 用户端智能体聚合：个人 / 组织 / 企业三组
 * 数据源：proto_ops_v11_agents → Proto registry → DEMO_LIST → 默认 AGENTS
 */
(function (global) {
  var V11_KEY = 'proto_ops_v11_agents';
  var GROUP_LABELS = {
    personal: '个人智能体',
    org: '组织智能体',
    enterprise: '企业智能体'
  };

  var LEGACY_AGENTS = [
    { id: 'agt_ocean', name: '敖钦·智能助手', intro: '您好！我是基于敖钦平台搭建的企业 AI 助手，可结合企业知识库为您解答党建、财务、QHSE、勘探开发、钻完井等业务问题，很高兴为您服务。', suggestions: ['平台有哪些知识库来源？', '帮我写一段 QHSE 巡检摘要', '这份报告的关键风险是什么？'], sources: ['企业制度库', '企业知识库', '历史问答记录'], output: '结构化回答' },
    { id: 'agt_travel', name: '差旅报销助手', intro: '我可以帮您解答公司差旅报销、费用标准、材料要求等问题，并整理报销说明与材料清单。', suggestions: ['报销流程有哪些', '差旅发票缺失怎么办', '帮我写一段报销说明'], sources: ['财务报销制度', '差旅操作手册', '常见问题库'], output: '报销说明' },
    { id: 'agt_party', name: '党建智能助手', intro: '我可以协助整理党建材料、会议纪要、学习记录和常用通知文案。', suggestions: ['生成一份会议纪要', '把这段文字改成通知', '提炼学习材料要点'], sources: ['党建材料库', '通知模板库', '会议纪要样例'], output: '文案草稿' }
  ];

  var DEMO_INTROS = {
    agt_demo_001: '企业产品咨询、问题解答与工单创建，支持多轮对话和知识库检索。',
    agt_contract: '上传合同文件，识别风险条款并生成审查意见书。',
    agt_medical: '根据主诉进行初步分诊，推荐科室和检查项目。',
    agt_multi: '协同 ERP、CRM 和邮件系统，完成跨平台数据同步。'
  };

  var GENERIC_SUGGESTIONS = ['介绍一下你的能力', '帮我处理一个常见问题', '生成一份说明材料'];

  var SUGGESTION_CATALOG = {
    agt_demo_001: ['介绍一下你的服务能力', '帮我创建一条工单', '查一下产品常见问题'],
    agt_contract: ['这份合同有哪些高风险条款', '生成审查意见摘要', '对比标准条款差异'],
    agt_medical: ['根据主诉推荐就诊科室', '常见症状该做哪些检查', '生成分诊说明摘要'],
    agt_multi: ['同步 ERP 与 CRM 销售数据', '跨系统任务进度在哪看', '生成协同处理清单']
  };

  function isGenericSuggestions(list) {
    if (!Array.isArray(list) || !list.length) return true;
    return list.length === GENERIC_SUGGESTIONS.length &&
      list.every(function (item, idx) { return item === GENERIC_SUGGESTIONS[idx]; });
  }

  function resolveSuggestions(id, raw) {
    if (raw.suggestions && raw.suggestions.length && !isGenericSuggestions(raw.suggestions)) {
      return raw.suggestions.slice();
    }
    if (SUGGESTION_CATALOG[id]) return SUGGESTION_CATALOG[id].slice();
    if (global.UserChatPortal && UserChatPortal.getDefaultAgents) {
      var match = UserChatPortal.getDefaultAgents().find(function (a) { return a.id === id; });
      if (match && match.suggestions && match.suggestions.length) return match.suggestions.slice();
    }
    var legacy = LEGACY_AGENTS.find(function (a) { return a.id === id; });
    if (legacy && legacy.suggestions) return legacy.suggestions.slice();
    return GENERIC_SUGGESTIONS.slice();
  }

  function normalizeTargets(targets) {
    if (global.OrgAccessPicker && OrgAccessPicker.normalizeTargets) {
      return OrgAccessPicker.normalizeTargets(targets || []);
    }
    return targets || [];
  }

  function isListed(status) {
    return status === 'listed' || status === 'published';
  }

  function loadV11Agents() {
    try {
      var raw = sessionStorage.getItem(V11_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function matchesTargets(targets, ctx) {
    var list = normalizeTargets(targets);
    if (!list.length) return false;
    return list.some(function (t) {
      if (t.type === 'user' && t.id === ctx.userId) return true;
      if (t.type !== 'user' && ctx.departmentIds && ctx.departmentIds.indexOf(t.id) >= 0) return true;
      return false;
    });
  }

  function toPortalAgent(raw, group) {
    var agent = {
      id: raw.id,
      name: raw.name || raw.id,
      group: GROUP_LABELS[group] || group,
      groupKey: group,
      intro: raw.intro || raw.desc || DEMO_INTROS[raw.id] || '智能体简介待补充。',
      suggestions: resolveSuggestions(raw.id, raw),
      sources: raw.sources || ['企业知识库', '制度文档库'],
      output: raw.output || '结构化回答',
      shareMode: raw.shareMode || 'private',
      status: raw.status || 'listed',
      ownerId: raw.ownerId || '',
      applicant: raw.applicant || '',
      skillIds: raw.boundSkillIds || raw.skillIds || [],
      models: [
        'DeepSeek-V4-Flash 模型',
        'DeepSeek-V4-Pro 模型',
        'DeepSeek-R1-32B 模型',
        'DeepSeek-R1-671B 模型'
      ]
    };
    if (raw.systemPrompt) agent.systemPrompt = raw.systemPrompt;
    if (raw.isSessionDraft) agent.isSessionDraft = true;
    if (raw.sourceSessionId) agent.sourceSessionId = raw.sourceSessionId;
    if (raw.sourceAgentId) agent.sourceAgentId = raw.sourceAgentId;
    return agent;
  }

  function fromV11Item(item) {
    if (!item || !isListed(item.status)) return null;
    return {
      id: item.id,
      name: item.name,
      desc: item.desc,
      shareMode: item.shareMode || 'private',
      status: item.status,
      permissionTargets: item.permissionTargets || [],
      applicant: item.applicant || '',
      ownerId: item.ownerId || item.applicant || ''
    };
  }

  var DEMO_SHARE = {
    agt_demo_001: { shareMode: 'private', applicant: '张三', ownerId: 'user_zhang', permissionTargets: [] },
    agt_contract: { shareMode: 'specific', applicant: '运营', permissionTargets: [{ id: 'team_platform', type: 'department', name: '平台团队' }] },
    agt_medical: { shareMode: 'public', applicant: '运营', permissionTargets: [] },
    agt_multi: { shareMode: 'org', applicant: '运营', permissionTargets: [] }
  };

  function fromDemoItem(item) {
    if (!item) return null;
    var share = DEMO_SHARE[item.id] || { shareMode: 'public', applicant: '运营', permissionTargets: [] };
    return {
      id: item.id,
      name: item.name,
      desc: DEMO_INTROS[item.id] || item.desc || '演示智能体。',
      shareMode: item.shareMode || share.shareMode || 'public',
      status: 'listed',
      permissionTargets: share.permissionTargets || item.permissionTargets || [],
      applicant: share.applicant || '运营',
      ownerId: share.ownerId || item.ownerId || ''
    };
  }

  function classifyGroup(item, ctx) {
    if (item.ownerId === ctx.userId || item.applicant === ctx.userName) {
      return 'personal';
    }
    if (item.shareMode === 'private') return null;
    if (item.shareMode === 'specific' && matchesTargets(item.permissionTargets, ctx)) {
      return 'org';
    }
    if (item.shareMode === 'specific') return null;
    if (item.shareMode === 'org') {
      return 'org';
    }
    if (item.shareMode === 'public') {
      return 'enterprise';
    }
    return null;
  }

  function dedupeById(list) {
    var seen = {};
    return list.filter(function (item) {
      if (!item || !item.id || seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    });
  }

  function collectRawAgents() {
    var raw = [];
    var v11 = loadV11Agents();
    if (Array.isArray(v11)) {
      v11.forEach(function (item) {
        var mapped = fromV11Item(item);
        if (mapped) raw.push(mapped);
      });
    }
    if (global.Proto && Array.isArray(Proto.DEMO_LIST_AGENTS)) {
      Proto.DEMO_LIST_AGENTS.forEach(function (item) {
        var mapped = fromDemoItem(item);
        if (mapped && isListed(mapped.status)) raw.push(mapped);
      });
    }
    if (global.Proto && Proto.getRegistry) {
      Proto.getRegistry().forEach(function (item) {
        var st = Proto.getState ? Proto.getState(item.id) : {};
        var status = st.status || item.status;
        if (!isListed(status === 'published' ? 'listed' : status)) return;
        raw.push({
          id: item.id,
          name: item.name,
          desc: item.desc || st.desc,
          shareMode: st.shareMode || item.shareMode || st.scope || 'private',
          status: 'listed',
          permissionTargets: st.permissionTargets || item.permissionTargets || [],
          applicant: st.applicant || '运营',
          ownerId: st.ownerId || ''
        });
      });
    }
    return dedupeById(raw);
  }

  function loadSessionDraftAgents(ctx) {
    if (!global.UserPersonalSpace || !UserPersonalSpace.getPersonalAgents) return [];
    return UserPersonalSpace.getPersonalAgents().map(function (item) {
      if (!item || !item.id) return null;
      if (item.ownerId && ctx.userId && item.ownerId !== ctx.userId) return null;
      return {
        id: item.id,
        name: item.name,
        intro: item.intro,
        desc: item.intro,
        suggestions: item.suggestions || [],
        shareMode: 'private',
        status: 'draft',
        systemPrompt: item.systemPrompt || '',
        isSessionDraft: true,
        sourceSessionId: item.sourceSessionId,
        sourceAgentId: item.sourceAgentId
      };
    }).filter(Boolean);
  }

  function resolve(ctx) {
    ctx = ctx || (global.UserPortalContext ? UserPortalContext.get() : {});
    var grouped = { personal: [], org: [], enterprise: [] };
    var seen = {};

    loadSessionDraftAgents(ctx).forEach(function (item) {
      if (!item || seen[item.id]) return;
      seen[item.id] = true;
      grouped.personal.push(toPortalAgent(item, 'personal'));
    });

    collectRawAgents().forEach(function (item) {
      var group = classifyGroup(item, ctx);
      if (!group || seen[item.id]) return;
      seen[item.id] = true;
      grouped[group].push(toPortalAgent(item, group));
    });

    if (global.UserChatPortal && UserChatPortal.getDefaultAgents) {
      UserChatPortal.getDefaultAgents().forEach(function (agent) {
        if (seen[agent.id]) return;
        seen[agent.id] = true;
        grouped.enterprise.push(toPortalAgent(Object.assign({}, agent, { status: 'listed', shareMode: 'public' }), 'enterprise'));
      });
    }

    LEGACY_AGENTS.forEach(function (agent) {
      if (seen[agent.id]) return;
      seen[agent.id] = true;
      grouped.enterprise.push(toPortalAgent(Object.assign({}, agent, { status: 'listed', shareMode: 'public' }), 'enterprise'));
    });

    return grouped;
  }

  global.UserAgentResolver = {
    resolve: resolve,
    GROUP_LABELS: GROUP_LABELS
  };
})(window);
