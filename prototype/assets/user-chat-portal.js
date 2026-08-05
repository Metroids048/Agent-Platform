/**
 * Web 用户端对话门户。
 * 负责智能体选择、对话、输入区上下文、附件占位、历史恢复与反馈入口。
 */
(function (global) {
  var STORAGE_KEY = 'proto_user_chat_state';
  var FEEDBACK_KEY = 'proto_user_answer_feedback';
  var PREVIEW_CACHE_KEY = 'proto_user_render_preview_cache_v11';
  var BRANCH_KEY = 'proto_user_chat_branches_v11';
  var SOURCE_SELECTION_KEY = 'proto_user_active_source_v11';
  var MODEL_STATE_VERSION = 7;
  var DEFAULT_MODEL = 'DeepSeek-V4-Flash 模型';
  var DEEP_THINKING_MODEL = 'DeepSeek-R1-671B 模型';
  var MODELS = [
    'DeepSeek-V4-Flash 模型',
    'DeepSeek-V4-Pro 模型',
    'DeepSeek-R1-32B 模型',
    'DeepSeek-R1-671B 模型'
  ];
  var MODEL_TIERS = [
    { tier: 'flash', model: 'DeepSeek-V4-Flash 模型' },
    { tier: 'standard', model: 'DeepSeek-V4-Pro 模型' },
    { tier: 'deep', model: 'DeepSeek-R1-32B 模型' },
    { tier: 'expert', model: 'DeepSeek-R1-671B 模型' }
  ];
  var CN_MODEL_ALIASES = {
    '标准模型': 'DeepSeek-V4-Flash 模型',
    '增强模型': 'DeepSeek-V4-Pro 模型',
    '专业模型': 'DeepSeek-R1-32B 模型',
    '旗舰模型': 'DeepSeek-R1-671B 模型',
    '轻量模型': 'DeepSeek-V4-Flash 模型',
    '经济模型': 'DeepSeek-V4-Flash 模型',
    'DeepSeek-V4-Flash Model': 'DeepSeek-V4-Flash 模型',
    'DeepSeek-V4-Pro Model': 'DeepSeek-V4-Pro 模型',
    'DeepSeek-R1-32B Model': 'DeepSeek-R1-32B 模型',
    'DeepSeek-R1-671B Model': 'DeepSeek-R1-671B 模型',
    'DeepSeek-V4-Flash模型': 'DeepSeek-V4-Flash 模型',
    'DeepSeek-V4-Pro模型': 'DeepSeek-V4-Pro 模型',
    'DeepSeek-R1-32B模型': 'DeepSeek-R1-32B 模型',
    'DeepSeek-R1-671B模型': 'DeepSeek-R1-671B 模型'
  };

  var DEFAULT_AGENTS = [
    agent('agt_ocean', '敖钦智能助手', '企业智能问答入口，可结合制度、知识库和历史问答记录处理通用业务问题。', ['平台有哪些知识库来源？', '帮我总结这份材料的重点', '这件事应该找哪个智能体处理？'], ['企业知识库', '制度文档库', '历史问答记录'], '结构化回答'),
    agent('agt_travel', '差旅报销助手', '解答差旅报销、费用标准、材料要求，并生成报销说明。', ['报销流程有哪些？', '发票缺失怎么办？', '帮我写一段报销说明'], ['财务制度', '差旅手册', '常见问题库'], '报销说明'),
    agent('agt_jsa', 'JSA 文档生成', '根据作业信息生成作业安全分析表，补全风险点和控制措施。', ['生成空压机检修 JSA', '补全控制措施', '把步骤整理成表格'], ['JSA 模板', 'QHSE 制度', '历史作业记录'], 'DOCX 文档'),
    agent('agt_party', '党建智能助手', '整理党建材料、会议纪要、学习记录和通知文稿。', ['生成会议纪要', '把文字改成通知', '提炼学习材料要点'], ['党建材料库', '通知模板库', '会议纪要样例'], '文稿草稿'),
    agent('agt_shift', '值班安排助手', '查询值班记录、整理排班信息并生成交接摘要。', ['查询明天值班记录', '汇总本周交接异常', '生成值班交接摘要'], ['值班台账', '排班表', '交接记录'], '表格回答'),
    agent('agt_safe', '钻完井安全助手', '围绕钻完井安全制度、现场风险和整改建议提供问答与材料整理。', ['解释安全要求', '找出记录里的风险点', '生成整改建议'], ['钻完井安全制度', '现场风险案例库', 'QHSE 知识库'], '风险清单'),
    agent('agt_report', '钻完井报告助手', '根据日报、完井资料和附件生成标准化报告，并保留引用来源。', ['生成完工报告', '提取日报关键风险', '整理报告目录'], ['钻完井资料库', '日报归档', '报告模板'], 'DOCX 文档'),
    agent('agt_waste', '废旧物资清单助手', '读取表格或图片材料，整理废旧物资清单并提示缺失字段。', ['整理物资清单', '找出缺少编号的物资', '生成核对表'], ['物资目录', '历史清单', '字段映射规则'], 'Excel 表格'),
    agent('agt_building', '智慧楼宇助手', '查询楼宇设备、工单处理和常见运维问题。', ['空调报修流程是什么？', '生成巡检记录摘要', '解释设备告警'], ['设备台账', '运维工单', '巡检规范'], '运维建议'),
    agent('agt_explore', '勘探井资料助手', '辅助检索勘探井资料、整理关键信息并形成摘要。', ['提取资料重点', '整理井史摘要', '列出待补充材料'], ['勘探井资料库', '项目档案', '历史摘要'], '资料摘要')
  ];

  var ICONS = {
    bot: '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#e8f3ff"/><path d="M8 22c3-4 6-6 8-6s5 2 8 6" stroke="#0f5c8c" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="13" r="3" fill="#0f5c8c"/></svg>',
    file: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M6 3.5h5.5L14 6v10.5H6V3.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.5 3.5V6H14" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    download: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M10 4v8M10 12l-3-3M10 12l3-3M5 16h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><rect x="6.5" y="6.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M13.5 6.5V5a1.5 1.5 0 00-1.5-1.5H5A1.5 1.5 0 003.5 5v7a1.5 1.5 0 001.5 1.5h1.5" stroke="currentColor" stroke-width="1.4"/></svg>',
    retry: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 10a6 6 0 0110.2-4.2M16 10a6 6 0 01-10.2 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M14.5 3.5V6h-2.5M5.5 16.5V14H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    like: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M10 17s-6-3.6-6-8.2c0-2.2 1.8-3.8 4-3.8 1.3 0 2 .7 2 .7s.7-.7 2-.7c2.2 0 4 1.6 4 3.8C16 13.4 10 17 10 17z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    dislike: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M10 3s6 3.6 6 8.2c0 2.2-1.8 3.8-4 3.8-1.3 0-2-.7-2-.7s-.7.7-2 .7c-2.2 0-4-1.6-4-3.8C4 6.6 10 3 10 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    feedback: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 5.5h12v7H7.5L5 15V5.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  };

  var KNOWLEDGE_LABELS = {
    kb_enterprise: '企业知识库',
    kb_qhse: 'QHSE 知识库',
    kb_docs: '制度文档库',
    kb_personal: '个人笔记'
  };

  var state = null;
  var els = {};
  var opts = {};
  var runtimeAgents = DEFAULT_AGENTS.slice();
  var groupedAgents = null;
  var sessionMessages = [];
  var scrollAutoResume = true;
  var currentBranchId = 'main';
  var composerContext = {
    deepThinking: false,
    knowledgeBase: 'kb_enterprise',
    noteIds: [],
    personalAgentIds: [],
    attachments: []
  };

  function agent(id, name, intro, suggestions, sources, output) {
    return {
      id: id,
      name: name,
      group: '企业智能体',
      groupKey: 'enterprise',
      intro: intro,
      suggestions: suggestions,
      sources: sources,
      output: output,
      shareMode: 'public',
      status: 'listed',
      models: MODELS.slice()
    };
  }

  function normalizeModel(model) {
    if (CN_MODEL_ALIASES[model]) model = CN_MODEL_ALIASES[model];
    if (!model || MODELS.indexOf(model) < 0) return DEFAULT_MODEL;
    return model;
  }

  function tierForModel(model) {
    for (var i = 0; i < MODEL_TIERS.length; i++) {
      if (MODEL_TIERS[i].model === model) return MODEL_TIERS[i];
    }
    return MODEL_TIERS[0];
  }

  function modelForCurrentContext() {
    if (composerContext.deepThinking) return DEEP_THINKING_MODEL;
    return normalizeModel(state && state.model ? state.model : DEFAULT_MODEL);
  }

  function loadState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return {
        agentId: saved.agentId || 'agt_ocean',
        model: normalizeModel(saved.model),
        modelVersion: MODEL_STATE_VERSION
      };
    } catch (e) {
      return { agentId: 'agt_ocean', model: DEFAULT_MODEL, modelVersion: MODEL_STATE_VERSION };
    }
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        agentId: state.agentId,
        model: state.model,
        modelVersion: MODEL_STATE_VERSION
      }));
    } catch (e) {}
  }

  function allAgents() {
    if (groupedAgents) return (groupedAgents.personal || []).concat(groupedAgents.org || [], groupedAgents.enterprise || []);
    return runtimeAgents;
  }

  function agentById(id) {
    return allAgents().find(function (item) { return item.id === id; }) || allAgents()[0] || DEFAULT_AGENTS[0];
  }

  function activeAgent() {
    return agentById(state.agentId);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function getSkillIds() {
    return opts.sessionSkills && typeof opts.sessionSkills.getActiveIds === 'function'
      ? opts.sessionSkills.getActiveIds()
      : [];
  }

  function getSkillNames() {
    return opts.sessionSkills && typeof opts.sessionSkills.getActiveNames === 'function'
      ? opts.sessionSkills.getActiveNames()
      : [];
  }

  function flashButton(btn) {
    if (!btn) return;
    btn.classList.add('is-active');
    setTimeout(function () { btn.classList.remove('is-active'); }, 900);
  }

  function toast(msg) {
    if (global.Proto && typeof Proto.toast === 'function') Proto.toast(msg);
  }

  function downloadBlob(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  function answerBodyText(answerEl) {
    var body = answerEl && answerEl.querySelector('.aioq-answer-body');
    return body ? body.innerText.replace(/\s+/g, '\n').trim() : '';
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
  }

  function previewCache() {
    return readJson(PREVIEW_CACHE_KEY, {});
  }

  function savePreviewCache(cache) {
    writeJson(PREVIEW_CACHE_KEY, cache || {});
  }

  function cachePreview(id, payload) {
    var cache = previewCache();
    cache[id] = Object.assign({ updatedAt: new Date().toISOString() }, payload || {});
    savePreviewCache(cache);
  }

  function branchStore() {
    return readJson(BRANCH_KEY, { activeId: 'main', branches: [{ id: 'main', label: '原始对话', messages: [] }] });
  }

  function saveBranchStore(store) {
    if (!store || !Array.isArray(store.branches)) return;
    writeJson(BRANCH_KEY, store);
  }

  function resetBranchStore() {
    currentBranchId = 'main';
    saveBranchStore({ activeId: 'main', branches: [{ id: 'main', label: '原始对话', messages: [] }] });
  }

  function cacheCurrentBranch() {
    var store = branchStore();
    var branch = store.branches.find(function (item) { return item.id === currentBranchId; });
    if (!branch) {
      branch = { id: currentBranchId, label: currentBranchId === 'main' ? '原始对话' : '编辑分支', messages: [] };
      store.branches.unshift(branch);
    }
    branch.messages = compactSessionMessages();
    branch.updatedAt = new Date().toISOString();
    store.activeId = currentBranchId;
    saveBranchStore(store);
  }

  function isNearBottom() {
    if (!els.stageScroll) return true;
    return els.stageScroll.scrollHeight - els.stageScroll.scrollTop - els.stageScroll.clientHeight < 80;
  }

  function scrollToBottom(force) {
    if (!els.stageScroll) return;
    if (force || scrollAutoResume) {
      els.stageScroll.scrollTop = els.stageScroll.scrollHeight;
    }
    renderScrollResume();
  }

  function renderScrollResume() {
    if (!els.btnScrollResume) return;
    var show = !scrollAutoResume && !isNearBottom();
    els.btnScrollResume.classList.toggle('hidden', !show);
  }

  function updateTurnNavigator() {
    if (!els.turnNavigator) return;
    var users = Array.prototype.slice.call(document.querySelectorAll('.aioq-user-bubble[data-turn-index]'));
    if (users.length <= 2) {
      els.turnNavigator.classList.add('hidden');
      els.turnNavigator.innerHTML = '';
      return;
    }
    els.turnNavigator.classList.remove('hidden');
    els.turnNavigator.innerHTML = '<strong>定位</strong>' + users.map(function (node, idx) {
      return '<button type="button" data-jump-turn="' + escapeHtml(node.getAttribute('data-turn-index')) + '">' + (idx + 1) + '</button>';
    }).join('');
  }

  function renderBranchSwitcher() {
    if (!els.branchSwitcher) return;
    var store = branchStore();
    var branches = store.branches || [];
    if (branches.length <= 1) {
      els.branchSwitcher.classList.add('hidden');
      els.branchSwitcher.innerHTML = '';
      return;
    }
    els.branchSwitcher.classList.remove('hidden');
    els.branchSwitcher.innerHTML = branches.map(function (branch) {
      return '<button type="button" class="' + (branch.id === currentBranchId ? 'active' : '') + '" data-branch-id="' + escapeHtml(branch.id) + '">' + escapeHtml(branch.label || '分支') + '</button>';
    }).join('');
  }

  function feedbackKeyForPrompt(prompt) {
    return String(prompt || '').slice(0, 120);
  }

  function readAnswerFeedback() {
    try {
      var raw = sessionStorage.getItem(FEEDBACK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function writeAnswerFeedback(map) {
    try { sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(map || {})); } catch (e) {}
  }

  function applyFeedbackState(answerEl, prompt) {
    if (!answerEl) return;
    var key = feedbackKeyForPrompt(prompt);
    var fb = readAnswerFeedback()[key];
    var likeBtn = answerEl.querySelector('[data-like-answer]');
    var dislikeBtn = answerEl.querySelector('[data-dislike-answer]');
    if (likeBtn) likeBtn.classList.toggle('is-active', fb === 'like');
    if (dislikeBtn) dislikeBtn.classList.toggle('is-active', fb === 'dislike');
  }

  function setAnswerFeedback(answerEl, prompt, value) {
    var key = feedbackKeyForPrompt(prompt);
    var map = readAnswerFeedback();
    if (value) map[key] = value;
    else delete map[key];
    writeAnswerFeedback(map);
    applyFeedbackState(answerEl, prompt);
  }

  function closeNoteRefPopover() {
    if (els.noteRefPopover) els.noteRefPopover.classList.add('hidden');
  }

  function noteSummaryText(note) {
    if (global.UserPersonalSpace && UserPersonalSpace.displayNoteSummary) {
      return UserPersonalSpace.displayNoteSummary(note);
    }
    var text = note && note.summary ? String(note.summary).replace(/\s+/g, ' ').trim() : '';
    return text.length > 120 ? text.slice(0, 117) + '…' : text;
  }

  function openNoteRefPopover(note, anchor) {
    if (!els.noteRefPopover || !note || !anchor) return;
    els.noteRefPopover.innerHTML =
      '<strong>' + escapeHtml(note.title) + '</strong>' +
      '<p>' + escapeHtml(noteSummaryText(note)) + '</p>';
    var rect = anchor.getBoundingClientRect();
    els.noteRefPopover.style.left = Math.max(12, rect.left) + 'px';
    els.noteRefPopover.style.top = (rect.top - 8) + 'px';
    els.noteRefPopover.classList.remove('hidden');
    requestAnimationFrame(function () {
      var popRect = els.noteRefPopover.getBoundingClientRect();
      var top = rect.top - popRect.height - 8;
      if (top < 12) top = rect.bottom + 8;
      els.noteRefPopover.style.top = top + 'px';
    });
  }

  function agentLinkHtml(item) {
    return '<button type="button" class="aioq-agent-link ' + (item.id === state.agentId ? 'active' : '') + '" data-agent-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</button>';
  }

  function filterAgents(list, query) {
    return list.filter(function (item) {
      return !query || [item.name, item.intro, item.group].join(' ').toLowerCase().indexOf(query) >= 0;
    });
  }

  function renderAgentList() {
    var query = (els.agentSearch && els.agentSearch.value || '').trim().toLowerCase();
    var allEl = els.agentListAll;
    if (!allEl) return;
    var agents = groupedAgents
      ? (groupedAgents.personal || []).concat(groupedAgents.org || [], groupedAgents.enterprise || [])
      : runtimeAgents;
    var visible = filterAgents(agents, query);
    allEl.innerHTML = visible.length
      ? visible.map(agentLinkHtml).join('')
      : '<p class="aioq-agent-empty">暂无可用智能体</p>';
  }

  function renderWelcome() {
    var item = activeAgent();
    if (!item) return;
    if (els.welcomeName) els.welcomeName.textContent = item.name;
    if (els.welcomeDesc) els.welcomeDesc.textContent = item.intro;
    if (els.promptSuggestions) {
      els.promptSuggestions.innerHTML = (item.suggestions || []).map(function (text) {
        return '<button type="button" class="aioq-suggest-chip" data-prompt="' + escapeHtml(text) + '">' + escapeHtml(text) + '</button>';
      }).join('');
    }
    renderAgentList();
  }

  function renderModelMenu() {
    var activeModel = normalizeModel(state.model);
    if (els.modelLabel) els.modelLabel.textContent = activeModel;
    if (els.modelMenu) {
      els.modelMenu.innerHTML = MODEL_TIERS.map(function (tier) {
        return '<button type="button" role="option" data-model="' + escapeHtml(tier.model) + '" class="' + (tier.model === activeModel ? 'active' : '') + '">' + escapeHtml(tier.model) + '</button>';
      }).join('');
    }
    if (els.btnModel) els.btnModel.setAttribute('aria-expanded', els.modelMenu && !els.modelMenu.classList.contains('hidden') ? 'true' : 'false');
  }

  function toggleModelMenu(forceClose) {
    if (!els.modelMenu || !els.btnModel) return;
    if (forceClose) {
      els.modelMenu.classList.add('hidden');
      els.btnModel.classList.remove('is-open');
      els.btnModel.setAttribute('aria-expanded', 'false');
      return;
    }
    var open = els.modelMenu.classList.toggle('hidden');
    els.btnModel.classList.toggle('is-open', !open);
    els.btnModel.setAttribute('aria-expanded', open ? 'false' : 'true');
  }

  function clearChat() {
    sessionMessages = [];
    resetBranchStore();
    if (els.chatMsgs) els.chatMsgs.innerHTML = '';
    if (els.welcomePanel) els.welcomePanel.classList.remove('hidden');
    updateTurnNavigator();
    renderBranchSwitcher();
  }

  function resetComposerContext(options) {
    options = options || {};
    composerContext.attachments = [];
    composerContext.noteIds = [];
    composerContext.personalAgentIds = [];
    if (options.keepPreferences !== true) {
      composerContext.deepThinking = false;
      composerContext.knowledgeBase = 'kb_enterprise';
      if (els.knowledgeSelect) els.knowledgeSelect.value = composerContext.knowledgeBase;
    }
    renderComposerContext();
  }

  function selectAgent(id) {
    state.agentId = id;
    saveState();
    clearChat();
    resetComposerContext();
    renderWelcome();
    var agent = agentById(id);
    if (typeof opts.onAgentChange === 'function') opts.onAgentChange(agent);
  }

  function compactSessionMessages() {
    return sessionMessages.map(function (msg) {
      if (msg.role === 'user') return { role: 'user', text: msg.text, context: msg.context, turnIndex: msg.turnIndex };
      return { role: 'assistant', text: msg.text, html: msg.html, prompt: msg.prompt };
    });
  }

  function currentBranchSnapshot() {
    cacheCurrentBranch();
    var store = branchStore();
    return {
      activeId: currentBranchId,
      branches: (store.branches || []).map(function (branch) {
        return {
          id: branch.id,
          label: branch.label || (branch.id === 'main' ? '原始对话' : '编辑分支'),
          messages: branch.messages || [],
          updatedAt: branch.updatedAt || ''
        };
      })
    };
  }

  function appendMessage(html) {
    if (els.welcomePanel) els.welcomePanel.classList.add('hidden');
    if (!els.chatMsgs) return;
    els.chatMsgs.insertAdjacentHTML('beforeend', html);
    updateTurnNavigator();
    scrollToBottom();
  }

  function userBubbleHtml(text, turnIndex) {
    return '<div class="aioq-user-bubble" data-turn-index="' + escapeHtml(turnIndex) + '">' +
      '<span>' + escapeHtml(text) + '</span>' +
      '<div class="aioq-user-bubble-actions">' +
        '<button type="button" data-edit-user-message="' + escapeHtml(turnIndex) + '">编辑</button>' +
      '</div>' +
    '</div>';
  }

  function renderMarkdown(md) {
    var text = String(md || '');
    var html = escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre class="aioq-md-code"><code>' + code + '</code></pre>';
    });
    html = html.replace(/\$\$([^$]+)\$\$/g, '<span class="aioq-latex-block">$1</span>');
    html = html.replace(/`([^`]+)`/g, '<code class="aioq-inline-code">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = '<p>' + html.replace(/\n/g, '<br>') + '</p>';
    html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
    return html;
  }

  function previewBlockHtml(kind, source) {
    var id = 'pv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    cachePreview(id, { kind: kind, source: source, mode: 'preview' });
    var title = kind === 'mermaid' ? 'Mermaid preview' : (kind === 'echarts' ? 'ECharts preview' : 'Code runner');
    var preview = kind === 'mermaid'
      ? '<div class="aioq-mermaid-preview"><div>Start</div><span>&rarr;</span><div>Retrieve</div><span>&rarr;</span><div>Answer</div></div>'
      : kind === 'echarts'
        ? chartBlockHtml()
        : '<div class="aioq-code-result">Run result: demo logic completed and returned 3 structured items.</div>';
    return '<section class="aioq-render-preview" data-render-preview="' + escapeHtml(id) + '">' +
      '<div class="aioq-render-preview-head"><strong>' + title + '</strong><span>cached in this session</span></div>' +
      '<div class="aioq-render-preview-toolbar">' +
        '<button type="button" class="active" data-preview-mode="preview">Preview</button>' +
        '<button type="button" data-preview-mode="source">Source</button>' +
        '<button type="button" data-preview-run>Run</button>' +
      '</div>' +
      '<div class="aioq-render-preview-body">' + preview + '</div>' +
      '<textarea class="aioq-render-preview-source hidden" rows="5">' + escapeHtml(source) + '</textarea>' +
    '</section>';
  }

  function complexPreviewHtml(prompt) {
    var p = String(prompt || '').toLowerCase();
    var blocks = [];
    if (/mermaid|flowchart|diagram/.test(p) || p.indexOf('??') >= 0 || p.indexOf('??') >= 0) {
      blocks.push(previewBlockHtml('mermaid', 'flowchart LR\n  A[User question] --> B[Knowledge retrieval]\n  B --> C[Answer]'));
    }
    if (/echarts|chart|visual|bar|line/.test(p) || p.indexOf('??') >= 0 || p.indexOf('??') >= 0 || p.indexOf('??') >= 0 || p.indexOf('???') >= 0) {
      blocks.push(previewBlockHtml('echarts', 'option = { xAxis: {}, yAxis: {}, series: [{ type: "bar", data: [12, 18, 25, 31] }] };'));
    }
    if (/code|runner|script|function|javascript|python/.test(p) || p.indexOf('??') >= 0 || p.indexOf('??') >= 0 || p.indexOf('??') >= 0) {
      blocks.push(previewBlockHtml('code', 'function main() { return ["retrieve", "analyze", "answer"]; }'));
    }
    return blocks.join('');
  }

  function renderHistoryMessages(messages, options) {
    options = options || {};
    sessionMessages = [];
    if (options.keepBranches !== true) resetBranchStore();
    if (els.chatMsgs) els.chatMsgs.innerHTML = '';
    if (els.welcomePanel) els.welcomePanel.classList.remove('hidden');
    (messages || []).forEach(function (msg) {
      if (msg.role === 'user') {
        var turnIndex = msg.turnIndex || (sessionMessages.filter(function (m) { return m.role === 'user'; }).length + 1);
        sessionMessages.push({ role: 'user', text: msg.text, context: msg.context, turnIndex: turnIndex });
        appendMessage(userBubbleHtml(msg.text, turnIndex));
        return;
      }
      var answerHtml = msg.html || '<article class="aioq-answer"><div class="aioq-answer-body"><p>' + escapeHtml(msg.text || '') + '</p></div></article>';
      sessionMessages.push({ role: 'assistant', text: msg.text || '', html: answerHtml, prompt: msg.prompt || msg.text || '' });
      appendMessage(answerHtml);
    });
    cacheCurrentBranch();
  }

  function restoreSession(entry) {
    if (!entry) return false;
    state.agentId = entry.agentId || state.agentId;
    state.model = normalizeModel(entry.model);
    saveState();
    resetComposerContext();
    renderWelcome();
    renderAgentList();
    if (entry.branches && Array.isArray(entry.branches.branches)) {
      saveBranchStore(entry.branches);
      currentBranchId = entry.branches.activeId || 'main';
    }
    renderHistoryMessages(entry.messages || [], { keepBranches: !!entry.branches });
    renderBranchSwitcher();
    return true;
  }

  function selectedNoteTitles() {
    if (!global.UserPersonalSpace) return [];
    return UserPersonalSpace.getNotes().filter(function (note) {
      return composerContext.noteIds.indexOf(note.id) >= 0;
    }).map(function (note) { return note.title; });
  }

  function selectedNotes() {
    if (!global.UserPersonalSpace) return [];
    return UserPersonalSpace.getNotes().filter(function (note) {
      return composerContext.noteIds.indexOf(note.id) >= 0;
    }).map(function (note) {
      return {
        id: note.id,
        title: note.title,
        summary: noteSummaryText(note),
        type: note.type || 'note',
        sourceConversationId: note.sourceConversationId || '',
        sourceAgentId: note.sourceAgentId || note.agentId || '',
        content: note.markdown || note.content || ''
      };
    });
  }

  function selectedPersonalAgents() {
    if (!global.UserPersonalSpace) return [];
    return UserPersonalSpace.getPersonalAgents().filter(function (agent) {
      return composerContext.personalAgentIds.indexOf(agent.id) >= 0;
    }).map(function (agent) {
      return {
        id: agent.id,
        title: agent.name || '个人智能体配置',
        summary: UserPersonalSpace.personalAgentIntro ? UserPersonalSpace.personalAgentIntro(agent) : (agent.intro || ''),
        systemPrompt: agent.systemPrompt || '',
        sourceSessionId: agent.sourceSessionId || ''
      };
    });
  }

  function selectedPersonalAgentTitles() {
    return selectedPersonalAgents().map(function (agent) { return agent.title; });
  }

  function renderFileChips() {
    if (!els.sessionActiveFiles) return;
    var chips = composerContext.attachments.map(function (file) {
      return '<span class="skill-chip aioq-file-chip">' + escapeHtml(file.name) +
        '<button type="button" data-remove-attachment="' + escapeHtml(file.id) + '" aria-label="移除附件">×</button></span>';
    });
    els.sessionActiveFiles.classList.toggle('hidden', chips.length === 0);
    els.sessionActiveFiles.innerHTML = chips.join('');
  }

  function renderNoteChips() {
    if (!els.attachChip) return;
    var chips = [];
    selectedNotes().forEach(function (note) {
      chips.push(
        '<span class="aioq-context-token aioq-context-token--note" data-note-ref="' + escapeHtml(note.id) + '" tabindex="0" role="button" title="查看笔记摘要">' +
          escapeHtml(note.title) +
          '<button type="button" data-remove-note="' + escapeHtml(note.id) + '" aria-label="移除笔记">×</button>' +
        '</span>'
      );
    });
    selectedPersonalAgents().forEach(function (agent) {
      chips.push(
        '<span class="aioq-context-token aioq-context-token--agent" data-personal-agent-ref="' + escapeHtml(agent.id) + '" tabindex="0" role="button" title="查看个人智能体配置">' +
          escapeHtml(agent.title) +
          '<button type="button" data-remove-personal-agent="' + escapeHtml(agent.id) + '" aria-label="移除个人智能体配置">×</button>' +
        '</span>'
      );
    });
    els.attachChip.classList.toggle('hidden', chips.length === 0);
    els.attachChip.innerHTML = chips.join('');
  }

  function renderAttachChip() {
    renderFileChips();
    renderNoteChips();
  }

  function renderComposerContext() {
    if (els.btnDeepThinking) {
      els.btnDeepThinking.classList.toggle('active', composerContext.deepThinking);
      els.btnDeepThinking.classList.toggle('aioq-toolbar-pill', true);
      els.btnDeepThinking.setAttribute('aria-pressed', composerContext.deepThinking ? 'true' : 'false');
    }
    if (els.knowledgeSelect) composerContext.knowledgeBase = els.knowledgeSelect.value || composerContext.knowledgeBase;
    var kbLabelEl = document.getElementById('kbLabel');
    if (kbLabelEl) kbLabelEl.textContent = KNOWLEDGE_LABELS[composerContext.knowledgeBase] || '企业知识库';
    if (els.composerContextStatus) {
      var parts = [KNOWLEDGE_LABELS[composerContext.knowledgeBase] || '企业知识库'];
      if (composerContext.deepThinking) parts.unshift('深度思考');
      if (composerContext.noteIds.length) parts.push('已引用 ' + composerContext.noteIds.length + ' 条笔记');
      if (composerContext.personalAgentIds.length) parts.push('已添加 ' + composerContext.personalAgentIds.length + ' 个个人智能体配置');
      if (composerContext.attachments.length) parts.push('已上传 ' + composerContext.attachments.length + ' 个附件');
      els.composerContextStatus.textContent = parts.join(' · ');
    }
    if (global.UserPersonalSpace) {
      UserPersonalSpace.savePreferences({
        deepThinking: composerContext.deepThinking,
        defaultKnowledgeBase: composerContext.knowledgeBase
      });
    }
    renderAttachChip();
  }

  function ensurePersonalAgentEntry() {
    if (!els.composerContextStatus) return;
    if (document.getElementById('btnComposerPersonalAgent')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnComposerPersonalAgent';
    btn.className = 'aioq-composer-context-entry';
    btn.textContent = '添加个人智能体配置';
    btn.addEventListener('click', openPersonalAgentPicker);
    els.composerContextStatus.insertAdjacentElement('afterend', btn);
  }

  function contextSummaryHtml() {
    var rows = ['知识库：' + (KNOWLEDGE_LABELS[composerContext.knowledgeBase] || '企业知识库')];
    if (composerContext.deepThinking) rows.push('已开启深度思考');
    if (composerContext.noteIds.length) rows.push('引用个人笔记：' + selectedNoteTitles().join('、'));
    if (composerContext.personalAgentIds.length) rows.push('个人智能体配置：' + selectedPersonalAgentTitles().join('、'));
    if (composerContext.attachments.length) rows.push('附件：' + composerContext.attachments.map(function (f) { return f.name; }).join('、'));
    return '<div class="aioq-answer-context">' + rows.map(function (row) {
      return '<span>' + escapeHtml(row) + '</span>';
    }).join('') + '</div>';
  }

  var RESPONSE_OPENERS = [
    { words: ['报告', '总结', '摘要', '概括'], text: '已根据知识库内容整理好分析报告，以下是核心内容。' },
    { words: ['差旅', '报销', '费用', '发票'], text: '已核对差旅费用相关政策，以下是关键信息和注意事项。' },
    { words: ['查', '找', '有没有', '是否', '存在', '搜索'], text: '经企业知识库检索，共命中 3 条相关内容，以下是最相关结果。' },
    { words: ['分析', '评估', '对比', '比较'], text: '已对相关数据进行分析，以下是核心发现。' },
    { words: ['步骤', '流程', '怎么', '如何', '申请', '办理'], text: '以下是处理该事项的参考步骤，请按实际情况调整。' },
    { words: ['计划', '方案', '建议', '规划'], text: '结合当前情况，以下是初步建议方案。' },
    { words: ['风险', '合规', '安全', '隐患'], text: '已识别出以下风险点，建议逐项核查并制定应对措施。' }
  ];

  var RESPONSE_FALLBACKS = [
    '已根据知识库和智能体能力处理该问题，以下是回答。',
    '已为您生成初步分析结果，可进一步细化。',
    '以下是针对该问题的分析和建议。',
    '结合业务场景和知识库内容，以下是处理建议。'
  ];

  function pickOpener(prompt) {
    var p = (prompt || '').toLowerCase();
    for (var i = 0; i < RESPONSE_OPENERS.length; i++) {
      var entry = RESPONSE_OPENERS[i];
      for (var j = 0; j < entry.words.length; j++) {
        if (p.indexOf(entry.words[j]) !== -1) return entry.text;
      }
    }
    var hash = p.split('').reduce(function (a, c) { return ((a * 31) + c.charCodeAt(0)) & 0xffff; }, 0);
    return RESPONSE_FALLBACKS[hash % RESPONSE_FALLBACKS.length];
  }

  function shouldShowFileCard(prompt, agent) {
    if (!agent.output) return false;
    var p = (prompt || '').toLowerCase();
    var docWords = ['报告', '总结', '生成', '写', '起草', '分析报告', '文件', '方案', '汇总'];
    for (var i = 0; i < docWords.length; i++) {
      if (p.indexOf(docWords[i]) !== -1) return true;
    }
    return false;
  }

  function shouldShowChart(prompt) {
    var p = (prompt || '').toLowerCase();
    var words = ['图表', '趋势', '统计', '分析图', '柱状', '折线', '可视化'];
    for (var i = 0; i < words.length; i++) {
      if (p.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function chartBlockHtml() {
    return '<div class="aioq-answer-chart" aria-label="数据趋势图">' +
      '<div class="aioq-answer-chart-head"><strong>趋势概览</strong><span>mock · 原型数据</span></div>' +
      '<svg viewBox="0 0 360 160" class="aioq-answer-chart-svg" aria-hidden="true">' +
        '<rect x="0" y="0" width="360" height="160" fill="#f8fbff"/>' +
        '<line x1="40" y1="130" x2="340" y2="130" stroke="#cbd5e1" stroke-width="1"/>' +
        '<rect x="60" y="90" width="36" height="40" rx="4" fill="#0f5c8c" opacity="0.85"/>' +
        '<rect x="120" y="70" width="36" height="60" rx="4" fill="#1d7fc4" opacity="0.85"/>' +
        '<rect x="180" y="55" width="36" height="75" rx="4" fill="#0f5c8c" opacity="0.85"/>' +
        '<rect x="240" y="40" width="36" height="90" rx="4" fill="#003da6" opacity="0.9"/>' +
        '<rect x="300" y="65" width="36" height="65" rx="4" fill="#1d7fc4" opacity="0.85"/>' +
        '<polyline points="78,90 138,70 198,55 258,40 318,65" fill="none" stroke="#003da6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="78" cy="90" r="4" fill="#003da6"/><circle cx="138" cy="70" r="4" fill="#003da6"/>' +
        '<circle cx="198" cy="55" r="4" fill="#003da6"/><circle cx="258" cy="40" r="4" fill="#003da6"/>' +
        '<circle cx="318" cy="65" r="4" fill="#003da6"/>' +
      '</svg></div>';
  }

  function citationHitCount(item) {
    var base = (item.sources || []).length || 1;
    return Math.max(1, Math.min(5, base + 2));
  }

  function buildAnswer(prompt) {
    var item = activeAgent();
    var skills = getSkillNames();
    var usedSkills = skills.length ? skills.join('、') : '默认问答能力';
    var activeModel = modelForCurrentContext();
    var sourceName = (item.sources || [])[0] || KNOWLEDGE_LABELS[composerContext.knowledgeBase] || '企业知识库';
    var hitCount = citationHitCount(item);
    var expertBtn = opts.mode === 'web'
      ? '<button type="button" class="aioq-expert-link" data-request-expert title="请求专家复核">请求专家复核</button>'
      : '';
    var fileName = escapeHtml(item.output || '回答') + '结果.docx';
    return '<article class="aioq-answer" data-prompt="' + escapeHtml(prompt) + '">' +
      '<div class="aioq-answer-title"><div class="aioq-mini-avatar" aria-hidden="true">' + ICONS.bot + '</div><strong>' + escapeHtml(item.name) + '</strong></div>' +
      '<div class="aioq-thinking"><span></span><strong>思考完成</strong><button type="button" data-toggle-thinking aria-label="展开思考过程">⌄</button></div>' +
      '<div class="aioq-thinking-detail hidden"><p>本轮内部路由到 ' + escapeHtml(activeModel) + '，结合 ' + escapeHtml(usedSkills) + '、当前知识库和用户选择的上下文生成回答。</p></div>' +
      contextSummaryHtml() +
      '<div class="aioq-answer-body">' +
        renderMarkdown(pickOpener(prompt) + '\n\n**简要结论：**' + item.intro + '\n\n- 先确认业务场景、所需材料和输出格式。\n- 再生成可复核的结果。\n\n$$命中率 = 有效段落 / 召回段落$$') +
        '<p>针对「' + escapeHtml(prompt) + '」，建议先确认业务场景、所需材料和输出格式，再生成可复核的结果。</p>' +
        (shouldShowChart(prompt) ? chartBlockHtml() : '') +
        complexPreviewHtml(prompt) +
      '</div>' +
      '<div class="aioq-citations"><button type="button" class="active" data-cite-mode="excerpt">引用段落</button><button type="button" data-cite-mode="source" data-view-source>查看原文</button><span>' + escapeHtml(sourceName) + ' · 已命中 ' + hitCount + ' 段</span></div>' +
      '<div class="aioq-source-hit-list">' +
        '<button type="button" data-source-hit data-source-title="' + escapeHtml(sourceName) + '">段落 1 · ' + escapeHtml(sourceName) + ' · 第 12 页</button>' +
        '<button type="button" data-source-hit data-source-title="' + escapeHtml(sourceName) + '">段落 2 · ' + escapeHtml(sourceName) + ' · 第 18 页</button>' +
      '</div>' +
      (shouldShowFileCard(prompt, item) ? '<div class="aioq-file-card" data-file-card data-file-name="' + fileName + '"><span class="aioq-file-icon">' + ICONS.file + '</span><div><strong>' + fileName + '</strong><small>文件生成完成</small></div><button type="button" data-download-file title="下载" aria-label="下载">' + ICONS.download + '</button></div>' : '') +
      '<div class="aioq-answer-actions">' +
        '<button type="button" data-copy-answer title="复制" aria-label="复制">' + ICONS.copy + '</button>' +
        '<button type="button" data-retry-answer title="重新生成" aria-label="重新生成">' + ICONS.retry + '</button>' +
        '<button type="button" data-like-answer title="点赞" aria-label="点赞">' + ICONS.like + '</button>' +
        '<button type="button" data-dislike-answer title="点踩" aria-label="点踩">' + ICONS.dislike + '</button>' +
        '<button type="button" data-open-feedback title="反馈" aria-label="反馈">' + ICONS.feedback + '</button>' +
        expertBtn +
      '</div>' +
    '</article>';
  }

  function regenerateAnswer(article) {
    if (!article) return;
    var prompt = article.getAttribute('data-prompt') || '';
    if (!prompt) return;
    if (sessionMessages.length && sessionMessages[sessionMessages.length - 1].role === 'assistant') {
      sessionMessages.pop();
    }
    article.remove();
    var item = activeAgent();
    var activeModel = modelForCurrentContext();
    var answerHtml = buildAnswer(prompt);
    sessionMessages.push({ role: 'assistant', text: prompt, html: answerHtml, prompt: prompt });
    appendMessage(answerHtml);
    var lastAnswer = els.chatMsgs && els.chatMsgs.lastElementChild;
    applyFeedbackState(lastAnswer, prompt);
    if (typeof opts.onChatComplete === 'function') {
      opts.onChatComplete({ agent: item, model: activeModel, text: prompt, messages: compactSessionMessages(), branches: currentBranchSnapshot(), context: composerContext, regenerated: true });
    }
    toast('已重新生成回答');
  }

  function sendChat() {
    var text = (els.chatInput && els.chatInput.value || '').trim();
    if (!text) return;
    var turnIndex = sessionMessages.filter(function (m) { return m.role === 'user'; }).length + 1;
    var context = {
      deepThinking: composerContext.deepThinking,
      knowledgeBase: composerContext.knowledgeBase,
      noteIds: composerContext.noteIds.slice(),
      personalAgentIds: composerContext.personalAgentIds.slice(),
      notes: selectedNotes(),
      personalAgents: selectedPersonalAgents(),
      attachments: composerContext.attachments.slice()
    };
    appendMessage(userBubbleHtml(text, turnIndex));
    sessionMessages.push({ role: 'user', text: text, context: context, turnIndex: turnIndex });
    var item = activeAgent();
    var overlay = getSkillIds();
    var activeModel = modelForCurrentContext();
    if (typeof opts.onChatStart === 'function') {
      opts.onChatStart({ agent: item, model: activeModel, text: text, skillIds: overlay, context: context });
    }
    function finish() {
      var answerHtml = buildAnswer(text);
      sessionMessages.push({ role: 'assistant', text: text, html: answerHtml, prompt: text });
      appendMessage(answerHtml);
      var lastAnswer = els.chatMsgs && els.chatMsgs.lastElementChild;
      applyFeedbackState(lastAnswer, text);
      cacheCurrentBranch();
      if (typeof opts.onChatComplete === 'function') {
        opts.onChatComplete({ agent: item, model: activeModel, text: text, messages: compactSessionMessages(), branches: currentBranchSnapshot(), context: context });
      }
    }
    var apiMessages = context.notes.length || context.personalAgents.length
      ? [{
          role: 'system',
          content: [
            context.notes.length ? '?????????????????????\n\n' + context.notes.map(function (note) {
              return '# ' + note.title + '\n' + note.content;
            }).join('\n\n') : '',
            context.personalAgents.length ? '???????????????????????????????\n\n' + context.personalAgents.map(function (agent) {
              return '# ' + agent.title + '\n' + (agent.systemPrompt || agent.summary || '');
            }).join('\n\n') : ''
          ].filter(Boolean).join('\n\n')
        }, { role: 'user', content: text }]
      : [{ role: 'user', content: text }];
    if (global.PlatformApi) {
      PlatformApi.startChat({
        agent_id: item.id,
        model_tier: activeModel,
        messages: apiMessages,
        skill_overlay: overlay,
        context: context
      }).then(finish);
    } else {
      finish();
    }
    els.chatInput.value = '';
    resetComposerContext({ keepPreferences: true });
    scrollAutoResume = true;
    renderScrollResume();
  }

  function openFeedback() {
    if (global.UserFeedbackForm) UserFeedbackForm.reset(UserFeedbackForm.CHAT);
    if (els.feedbackModal) els.feedbackModal.classList.remove('hidden');
    var ta = document.getElementById('feedbackText');
    if (ta) ta.focus();
  }

  function closeFeedback() {
    if (els.feedbackModal) els.feedbackModal.classList.add('hidden');
    if (global.UserFeedbackForm) UserFeedbackForm.reset(UserFeedbackForm.CHAT);
  }

  function toggleSidebar() {
    if (!els.root) return;
    els.root.classList.toggle('is-sidebar-collapsed');
    var collapsed = els.root.classList.contains('is-sidebar-collapsed');
    if (els.btnCollapseSidebar) {
      els.btnCollapseSidebar.setAttribute('aria-label', collapsed ? '展开侧栏' : '收起侧栏');
      els.btnCollapseSidebar.setAttribute('title', collapsed ? '展开侧栏' : '收起侧栏');
    }
  }

  function bindAgentListClicks(root) {
    if (!root) return;
    root.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-agent-id]');
      if (btn) selectAgent(btn.dataset.agentId);
    });
  }

  function openNotePicker() {
    if (!els.notePickerModal || !els.notePickerList || !global.UserPersonalSpace) return;
    var notes = UserPersonalSpace.getNotes();
    els.notePickerList.innerHTML = notes.length ? notes.map(function (note) {
      var preview = noteSummaryText(note);
      return '<button type="button" class="aioq-note-picker-item" data-pick-note="' + escapeHtml(note.id) + '"><strong>' + escapeHtml(note.title) + '</strong><span>' + escapeHtml(preview) + '</span></button>';
    }).join('') : '<p class="aioq-space-empty">暂无个人笔记</p>';
    els.notePickerModal.classList.remove('hidden');
  }

  function closeNotePicker() {
    if (els.notePickerModal) els.notePickerModal.classList.add('hidden');
  }

  function openPersonalAgentPicker() {
    if (!els.personalAgentPickerModal || !els.personalAgentPickerList || !global.UserPersonalSpace) return;
    var agents = UserPersonalSpace.getPersonalAgents();
    els.personalAgentPickerList.innerHTML = agents.length ? agents.map(function (agent) {
      var preview = UserPersonalSpace.personalAgentIntro ? UserPersonalSpace.personalAgentIntro(agent) : (agent.intro || '');
      return '<button type="button" class="aioq-note-picker-item" data-pick-personal-agent="' + escapeHtml(agent.id) + '"><strong>' + escapeHtml(agent.name || '个人智能体配置') + '</strong><span>' + escapeHtml(preview || '已保存的私有配置，可作为本轮对话上下文') + '</span></button>';
    }).join('') : '<p class="aioq-space-empty">暂无个人智能体配置，可先从历史对话保存</p>';
    els.personalAgentPickerModal.classList.remove('hidden');
  }

  function closePersonalAgentPicker() {
    if (els.personalAgentPickerModal) els.personalAgentPickerModal.classList.add('hidden');
  }

  function closeFloatingPanels(event) {
    if (!els.attachMenu || !els.btnAttachMenu) return;
    if (event && (els.attachMenu.contains(event.target) || els.btnAttachMenu.contains(event.target))) return;
    els.attachMenu.classList.add('hidden');
    els.btnAttachMenu.setAttribute('aria-expanded', 'false');
  }

  function toggleAttachMenu() {
    if (!els.attachMenu || !els.btnAttachMenu) return;
    var open = els.attachMenu.classList.toggle('hidden');
    els.btnAttachMenu.setAttribute('aria-expanded', open ? 'false' : 'true');
  }

  function startInlineEdit(turnIndex) {
    var bubble = els.chatMsgs && els.chatMsgs.querySelector('.aioq-user-bubble[data-turn-index="' + String(turnIndex) + '"]');
    var msg = sessionMessages.find(function (item) { return item.role === 'user' && String(item.turnIndex) === String(turnIndex); });
    if (!bubble || !msg || bubble.querySelector('textarea')) return;
    bubble.classList.add('is-editing');
    bubble.innerHTML = '<textarea rows="3">' + escapeHtml(msg.text) + '</textarea>' +
      '<div class="aioq-inline-edit-actions">' +
        '<button type="button" data-cancel-user-edit>取消</button>' +
        '<button type="button" data-save-user-edit="' + escapeHtml(turnIndex) + '">发送并生成分支</button>' +
      '</div>';
    var textarea = bubble.querySelector('textarea');
    if (textarea) textarea.focus();
  }

  function cancelInlineEdit(bubble, turnIndex) {
    var msg = sessionMessages.find(function (item) { return item.role === 'user' && String(item.turnIndex) === String(turnIndex); });
    if (!bubble || !msg) return;
    bubble.classList.remove('is-editing');
    bubble.outerHTML = userBubbleHtml(msg.text, msg.turnIndex);
  }

  function saveInlineEdit(bubble, turnIndex) {
    var textarea = bubble && bubble.querySelector('textarea');
    var nextText = textarea ? textarea.value.trim() : '';
    if (!nextText) return;
    var idx = sessionMessages.findIndex(function (item) {
      return item.role === 'user' && String(item.turnIndex) === String(turnIndex);
    });
    if (idx < 0) return;
    cacheCurrentBranch();
    sessionMessages = sessionMessages.slice(0, idx);
    currentBranchId = 'branch_' + Date.now().toString(36);
    var store = branchStore();
    store.activeId = currentBranchId;
    store.branches.unshift({ id: currentBranchId, label: '编辑分支 ' + (store.branches.length), messages: [] });
    saveBranchStore(store);
    if (els.chatMsgs) els.chatMsgs.innerHTML = '';
    var replay = sessionMessages.slice();
    sessionMessages = [];
    renderHistoryMessages(replay);
    if (els.chatInput) els.chatInput.value = nextText;
    sendChat();
    renderBranchSwitcher();
  }

  function rerenderPreview(section) {
    if (!section) return;
    var id = section.getAttribute('data-render-preview');
    var source = section.querySelector('.aioq-render-preview-source');
    var body = section.querySelector('.aioq-render-preview-body');
    if (!body) return;
    var text = source ? source.value : '';
    cachePreview(id, { source: text, mode: 'preview' });
    body.innerHTML = '<div class="aioq-code-result">Run result: preview refreshed at ' + new Date().toLocaleTimeString() + '.</div>';
  }

  function setPreviewMode(section, mode) {
    if (!section) return;
    var body = section.querySelector('.aioq-render-preview-body');
    var source = section.querySelector('.aioq-render-preview-source');
    section.querySelectorAll('[data-preview-mode]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-preview-mode') === mode);
    });
    if (body) body.classList.toggle('hidden', mode === 'source');
    if (source) source.classList.toggle('hidden', mode !== 'source');
  }

  function bindEvents() {
    if (els.agentSearch) els.agentSearch.addEventListener('input', renderAgentList);
    bindAgentListClicks(els.agentListAll);

    if (els.btnNewChat) els.btnNewChat.addEventListener('click', function () { clearChat(); resetComposerContext(); renderWelcome(); });
    if (els.btnCollapseSidebar) els.btnCollapseSidebar.addEventListener('click', function (event) { event.stopPropagation(); toggleSidebar(); });

    if (els.promptSuggestions) els.promptSuggestions.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-prompt]');
      if (!btn) return;
      els.chatInput.value = btn.dataset.prompt;
      els.chatInput.focus();
    });
    if (els.chatSend) els.chatSend.addEventListener('click', sendChat);
    if (els.chatInput) els.chatInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChat();
      }
    });
    if (els.stageScroll) {
      els.stageScroll.addEventListener('scroll', function () {
        scrollAutoResume = isNearBottom();
        renderScrollResume();
      });
    }
    if (els.btnScrollResume) {
      els.btnScrollResume.addEventListener('click', function () {
        scrollAutoResume = true;
        scrollToBottom(true);
      });
    }
    if (els.turnNavigator) {
      els.turnNavigator.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-jump-turn]');
        if (!btn) return;
        var node = els.chatMsgs && els.chatMsgs.querySelector('.aioq-user-bubble[data-turn-index="' + btn.getAttribute('data-jump-turn') + '"]');
        if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    if (els.branchSwitcher) {
      els.branchSwitcher.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-branch-id]');
        if (!btn) return;
        cacheCurrentBranch();
        var id = btn.getAttribute('data-branch-id');
        var store = branchStore();
        var branch = (store.branches || []).find(function (item) { return item.id === id; });
        if (!branch) return;
        currentBranchId = id;
        renderHistoryMessages(branch.messages || []);
        renderBranchSwitcher();
      });
    }
    if (els.chatMsgs) els.chatMsgs.addEventListener('click', function (event) {
      var editBtn = event.target.closest('[data-edit-user-message]');
      if (editBtn) {
        startInlineEdit(editBtn.getAttribute('data-edit-user-message'));
        return;
      }
      var cancelEdit = event.target.closest('[data-cancel-user-edit]');
      if (cancelEdit) {
        var cancelBubble = event.target.closest('.aioq-user-bubble');
        cancelInlineEdit(cancelBubble, cancelBubble && cancelBubble.getAttribute('data-turn-index'));
        return;
      }
      var saveEdit = event.target.closest('[data-save-user-edit]');
      if (saveEdit) {
        saveInlineEdit(event.target.closest('.aioq-user-bubble'), saveEdit.getAttribute('data-save-user-edit'));
        return;
      }
      var previewModeBtn = event.target.closest('[data-preview-mode]');
      if (previewModeBtn) {
        setPreviewMode(previewModeBtn.closest('[data-render-preview]'), previewModeBtn.getAttribute('data-preview-mode'));
        return;
      }
      if (event.target.closest('[data-preview-run]')) {
        rerenderPreview(event.target.closest('[data-render-preview]'));
        return;
      }
      if (event.target.closest('[data-source-hit]')) {
        var hit = event.target.closest('[data-source-hit]');
        writeJson(SOURCE_SELECTION_KEY, { title: hit.getAttribute('data-source-title') || '', text: hit.textContent || '' });
        if (typeof opts.onViewSource === 'function') opts.onViewSource();
        return;
      }
      if (event.target.closest('[data-toggle-thinking]')) {
        var answer = event.target.closest('.aioq-answer');
        var detail = answer && answer.querySelector('.aioq-thinking-detail');
        if (detail) detail.classList.toggle('hidden');
      }
      var answerArticle = event.target.closest('.aioq-answer');
      var promptForAnswer = answerArticle ? answerArticle.getAttribute('data-prompt') : '';
      if (event.target.closest('[data-view-source]')) {
        if (typeof opts.onViewSource === 'function') opts.onViewSource();
        else if (els.sourcePanel) els.sourcePanel.classList.remove('hidden');
      }
      if (event.target.closest('[data-download-file]')) {
        var card = event.target.closest('[data-file-card]');
        var fname = (card && card.getAttribute('data-file-name')) || '回答结果.docx';
        var body = answerBodyText(answerArticle) || '（原型 mock 文件内容）';
        if (downloadBlob(fname.replace(/\.docx$/i, '.txt'), body + '\n\n—— 敖钦 AI 工作台 · 原型导出')) toast('文件已开始下载');
        else toast('下载失败，请重试');
        flashButton(event.target.closest('[data-download-file]'));
      }
      if (event.target.closest('[data-copy-answer]')) {
        var text = answerBodyText(answerArticle);
        if (text && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { toast('已复制回答'); }).catch(function () { toast('复制失败'); });
        } else if (text) {
          toast(text.slice(0, 80) + (text.length > 80 ? '…' : ''));
        }
        flashButton(event.target.closest('[data-copy-answer]'));
      }
      if (event.target.closest('[data-retry-answer]')) {
        regenerateAnswer(answerArticle);
        flashButton(event.target.closest('[data-retry-answer]'));
      }
      if (event.target.closest('[data-like-answer]')) {
        var likeBtn = event.target.closest('[data-like-answer]');
        var next = likeBtn.classList.contains('is-active') ? null : 'like';
        setAnswerFeedback(answerArticle, promptForAnswer, next);
        toast(next ? '已点赞' : '已取消点赞');
      }
      if (event.target.closest('[data-dislike-answer]')) {
        var dislikeBtn = event.target.closest('[data-dislike-answer]');
        var nextDis = dislikeBtn.classList.contains('is-active') ? null : 'dislike';
        setAnswerFeedback(answerArticle, promptForAnswer, nextDis);
        if (nextDis) openFeedback();
        else toast('已取消点踩');
      }
      if (event.target.closest('[data-open-feedback]')) openFeedback();
      if (event.target.closest('[data-request-expert]') && typeof opts.onRequestExpert === 'function') opts.onRequestExpert();
      if (event.target.closest('[data-cite-mode]')) {
        var citeBtn = event.target.closest('[data-cite-mode]');
        var citeAnswer = citeBtn.closest('.aioq-answer');
        if (citeAnswer) {
          citeAnswer.querySelectorAll('[data-cite-mode]').forEach(function (btn) { btn.classList.remove('active'); });
          citeBtn.classList.add('active');
        }
        var mode = citeBtn.getAttribute('data-cite-mode');
        if (mode === 'excerpt' && typeof opts.onCiteExcerpt === 'function') opts.onCiteExcerpt();
        else if (mode === 'source' && typeof opts.onViewSource === 'function') opts.onViewSource();
        else if (els.sourcePanel) els.sourcePanel.classList.remove('hidden');
      }
    });
    if (els.btnCloseSource) els.btnCloseSource.addEventListener('click', function () { els.sourcePanel.classList.add('hidden'); });
    if (els.btnFeedbackEntry) els.btnFeedbackEntry.addEventListener('click', openFeedback);
    if (els.btnCloseFeedback) els.btnCloseFeedback.addEventListener('click', closeFeedback);
    if (els.btnCancelFeedback) els.btnCancelFeedback.addEventListener('click', closeFeedback);
    if (els.btnSubmitFeedback) els.btnSubmitFeedback.addEventListener('click', function () {
      if (typeof opts.onSubmitFeedback === 'function') opts.onSubmitFeedback();
      else closeFeedback();
    });
    if (els.btnAttachMenu && els.attachMenu) {
      els.btnAttachMenu.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleAttachMenu();
      });
      els.attachMenu.addEventListener('click', function (event) {
        var item = event.target.closest('[data-attach-action]');
        if (!item) return;
        var action = item.getAttribute('data-attach-action');
        els.attachMenu.classList.add('hidden');
        els.btnAttachMenu.setAttribute('aria-expanded', 'false');
        if (action === 'file' && els.chatFileInput) els.chatFileInput.click();
        else if (action === 'note') openNotePicker();
      });
    }
    if (els.chatFileInput) {
      els.chatFileInput.addEventListener('change', function () {
        Array.prototype.slice.call(els.chatFileInput.files || []).forEach(function (file) {
          composerContext.attachments.push({ id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: file.name, type: file.type || 'file', size: file.size || 0 });
        });
        els.chatFileInput.value = '';
        renderComposerContext();
      });
    }
    if (els.sessionActiveFiles) els.sessionActiveFiles.addEventListener('click', function (event) {
      var attachBtn = event.target.closest('[data-remove-attachment]');
      if (!attachBtn) return;
      composerContext.attachments = composerContext.attachments.filter(function (file) {
        return file.id !== attachBtn.getAttribute('data-remove-attachment');
      });
      renderComposerContext();
    });
    if (els.attachChip) els.attachChip.addEventListener('click', function (event) {
      var noteBtn = event.target.closest('[data-remove-note]');
      if (noteBtn) {
        var noteId = noteBtn.getAttribute('data-remove-note');
        composerContext.noteIds = composerContext.noteIds.filter(function (id) { return id !== noteId; });
        closeNoteRefPopover();
        renderComposerContext();
        return;
      }
      var agentRemove = event.target.closest('[data-remove-personal-agent]');
      if (agentRemove) {
        var agentId = agentRemove.getAttribute('data-remove-personal-agent');
        composerContext.personalAgentIds = composerContext.personalAgentIds.filter(function (id) { return id !== agentId; });
        closeNoteRefPopover();
        renderComposerContext();
        return;
      }
      var noteRef = event.target.closest('[data-note-ref]');
      if (noteRef) {
        event.preventDefault();
        var refId = noteRef.getAttribute('data-note-ref');
        var note = selectedNotes().find(function (n) { return n.id === refId; });
        if (note) openNoteRefPopover(note, noteRef);
      }
      var agentRef = event.target.closest('[data-personal-agent-ref]');
      if (agentRef) {
        event.preventDefault();
        var paId = agentRef.getAttribute('data-personal-agent-ref');
        var agent = selectedPersonalAgents().find(function (n) { return n.id === paId; });
        if (agent) openNoteRefPopover({ title: agent.title, summary: agent.summary }, agentRef);
      }
    });
    if (els.btnModel) els.btnModel.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleModelMenu();
    });
    if (els.modelMenu) els.modelMenu.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-model]');
      if (!btn) return;
      state.model = normalizeModel(btn.getAttribute('data-model'));
      saveState();
      renderModelMenu();
      toggleModelMenu(true);
    });
    if (els.btnDeepThinking) els.btnDeepThinking.addEventListener('click', function () {
      composerContext.deepThinking = !composerContext.deepThinking;
      renderComposerContext();
    });
    if (els.knowledgeSelect) els.knowledgeSelect.addEventListener('change', function () {
      composerContext.knowledgeBase = els.knowledgeSelect.value || 'kb_enterprise';
      renderComposerContext();
    });
    if (els.btnCloseNotePicker) els.btnCloseNotePicker.addEventListener('click', closeNotePicker);
    if (els.btnClosePersonalAgentPicker) els.btnClosePersonalAgentPicker.addEventListener('click', closePersonalAgentPicker);
    if (els.notePickerModal) els.notePickerModal.addEventListener('click', function (event) {
      if (event.target.id === 'notePickerModal') closeNotePicker();
      var btn = event.target.closest('[data-pick-note]');
      if (!btn) return;
      var id = btn.getAttribute('data-pick-note');
      if (composerContext.noteIds.indexOf(id) < 0) composerContext.noteIds.push(id);
      closeNotePicker();
      renderComposerContext();
    });
    if (els.personalAgentPickerModal) els.personalAgentPickerModal.addEventListener('click', function (event) {
      if (event.target.id === 'personalAgentPickerModal') closePersonalAgentPicker();
      var btn = event.target.closest('[data-pick-personal-agent]');
      if (!btn) return;
      var id = btn.getAttribute('data-pick-personal-agent');
      if (composerContext.personalAgentIds.indexOf(id) < 0) composerContext.personalAgentIds.push(id);
      closePersonalAgentPicker();
      renderComposerContext();
    });
    document.addEventListener('click', function (event) {
      closeFloatingPanels(event);
      if (els.modelMenu && !event.target.closest('#modelPickerWrap')) toggleModelMenu(true);
      if (els.noteRefPopover && !event.target.closest('[data-note-ref]') && !event.target.closest('#noteRefPopover')) closeNoteRefPopover();
    });
  }

  function applyUrlAgent() {
    try {
      var params = new URLSearchParams(global.location.search);
      var id = params.get('id');
      if (id && agentById(id)) {
        state.agentId = id;
        saveState();
      }
    } catch (e) {}
  }

  function init(options) {
    opts = options || {};
    if (opts.groupedAgents) {
      groupedAgents = opts.groupedAgents;
      runtimeAgents = allAgents();
    } else if (opts.agents) {
      runtimeAgents = opts.agents.slice();
      groupedAgents = null;
    } else {
      runtimeAgents = DEFAULT_AGENTS.slice();
      groupedAgents = null;
    }
    opts.mode = opts.mode || 'lite';
    state = loadState();
    applyUrlAgent();
    if (!agentById(state.agentId)) state.agentId = allAgents()[0] ? allAgents()[0].id : 'agt_ocean';
    saveState();

    els = {
      root: document.getElementById('userChatRoot'),
      agentListAll: document.getElementById('agentListAll') || document.getElementById('agentList'),
      agentSearch: document.getElementById('agentSearch'),
      btnNewChat: document.getElementById('btnNewChat'),
      btnCollapseSidebar: document.getElementById('btnCollapseSidebar'),
      stageScroll: document.querySelector('.aioq-stage-scroll'),
      welcomePanel: document.getElementById('welcomePanel'),
      welcomeName: document.getElementById('welcomeName'),
      welcomeDesc: document.getElementById('welcomeDesc'),
      chatMsgs: document.getElementById('chatMsgs'),
      chatInput: document.getElementById('chatInput'),
      chatSend: document.getElementById('chatSend'),
      promptSuggestions: document.getElementById('promptSuggestions'),
      sourcePanel: document.getElementById('sourcePanel'),
      btnCloseSource: document.getElementById('btnCloseSource'),
      feedbackModal: document.getElementById('chatFeedbackModal'),
      btnFeedbackEntry: document.getElementById('btnFeedbackEntry'),
      btnCloseFeedback: document.getElementById('btnCloseFeedback'),
      btnCancelFeedback: document.getElementById('btnCancelFeedback'),
      btnSubmitFeedback: document.getElementById('btnSubmitFeedback'),
      btnAttachMenu: document.getElementById('btnAttachMenu'),
      attachMenu: document.getElementById('attachMenu'),
      chatFileInput: document.getElementById('chatFileInput'),
      attachChip: document.getElementById('attachChip'),
      sessionActiveFiles: document.getElementById('sessionActiveFiles'),
      btnDeepThinking: document.getElementById('btnDeepThinking'),
      knowledgeSelect: document.getElementById('knowledgeSelect'),
      notePickerModal: document.getElementById('notePickerModal'),
      notePickerList: document.getElementById('notePickerList'),
      btnCloseNotePicker: document.getElementById('btnCloseNotePicker'),
      personalAgentPickerModal: document.getElementById('personalAgentPickerModal'),
      personalAgentPickerList: document.getElementById('personalAgentPickerList'),
      btnClosePersonalAgentPicker: document.getElementById('btnClosePersonalAgentPicker'),
      btnModel: document.getElementById('btnModel'),
      modelMenu: document.getElementById('modelMenu'),
      modelLabel: document.getElementById('modelLabel'),
      composerContextStatus: document.getElementById('composerContextStatus'),
      noteRefPopover: document.getElementById('noteRefPopover'),
      turnNavigator: document.getElementById('turnNavigator'),
      branchSwitcher: document.getElementById('branchSwitcher'),
      btnScrollResume: document.getElementById('btnScrollResume')
    };

    if (global.UserPersonalSpace) {
      var prefs = UserPersonalSpace.getPreferences();
      composerContext.deepThinking = !!prefs.deepThinking;
      composerContext.knowledgeBase = prefs.defaultKnowledgeBase || 'kb_enterprise';
      if (els.knowledgeSelect) els.knowledgeSelect.value = composerContext.knowledgeBase;
    }
    if (els.btnToggleAgents) els.btnToggleAgents.setAttribute('aria-expanded', 'true');
    if (els.agentMenuBlock) els.agentMenuBlock.classList.remove('is-agents-collapsed');
    if (els.groupEnterprise) els.groupEnterprise.classList.remove('is-group-collapsed');
    if (els.btnToggleEnterprise) els.btnToggleEnterprise.setAttribute('aria-expanded', 'true');

    renderModelMenu();
    renderWelcome();
    renderComposerContext();
    ensurePersonalAgentEntry();
    bindEvents();
  }

  global.UserChatPortal = {
    init: init,
    getAgents: function () { return allAgents().slice(); },
    getDefaultAgents: function () { return DEFAULT_AGENTS.slice(); },
    getModelTiers: function () { return MODEL_TIERS.slice(); },
    getState: function () { return state; },
    normalizeModel: normalizeModel,
    selectAgent: selectAgent,
    clearChat: clearChat,
    restoreSession: restoreSession,
    getSessionMessages: compactSessionMessages,
    getBranchSnapshot: currentBranchSnapshot,
    getComposerContext: function () { return Object.assign({}, composerContext); },
    appendMessage: appendMessage,
    buildAnswer: buildAnswer,
    activeAgent: activeAgent,
    openFeedback: openFeedback,
    closeFeedback: closeFeedback,
    getEls: function () { return els; }
  };
})(window);
