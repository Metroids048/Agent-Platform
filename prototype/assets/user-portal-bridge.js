/**
 * Web 用户端桥接层：历史、引用原文、反馈闭环、消息中心、用户资产。
 */
(function (global) {
  var HISTORY_KEY = 'proto_user_chat_history';
  var HISTORY_SEED_FLAG = 'proto_user_chat_history_seeded_v3';
  var EVENTS_KEY = 'platform_api_portal_events';
  var HISTORY_PAGE_SIZE = 15;
  var HISTORY_MAX = 100;

  var historyVisibleCount = HISTORY_PAGE_SIZE;
  var historySearchQuery = '';
  var sourceState = 'failed';
  var summaryState = {
    item: null,
    selected: {}
  };
  var AGENT_PREPARE_MS = 1200;
  var agentState = {
    item: null,
    draft: null,
    preparing: false
  };
  var pendingDeleteId = null;
  var RECENT_AGENT_KEY = 'proto_user_agent_square_recent';
  var FAVORITE_KEY = 'proto_user_agent_square_favorites';
  var PINNED_KEY = 'proto_user_sidebar_pinned';
  var REMOVED_KEY = 'proto_user_sidebar_removed';
  var uiBound = false;

  var ICON_NOTE = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M3 3.5h7l3 3V12.5a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M10 3.5V6.5h3" stroke="currentColor" stroke-width="1.3"/></svg>';
  var ICON_RENAME = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M10.5 3.5l2 2-7 7H3.5v-2l7-7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  var ICON_DELETE = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M4 5.5h8M6 5.5V4.5h4v1M6.5 8v3M9.5 8v3M5 5.5l.5 7h5l.5-7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var ICON_PIN = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M8 2.5l1.5 3 3.3.5-2.4 2.3.6 3.3L8 10.2 4 11.6l.6-3.3-2.4-2.3 3.3-.5L8 2.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var ICON_REMOVE = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 8h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var ICON_AGENT = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><rect x="3" y="4" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="8" r="1" fill="currentColor"/><circle cx="10" cy="8" r="1" fill="currentColor"/><path d="M8 4V2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  function readIdList(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function writeIdList(key, list) {
    try { sessionStorage.setItem(key, JSON.stringify(list || [])); } catch (e) {}
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.aioq-sidebar-dropdown:not(.hidden)').forEach(function (el) {
      el.classList.add('hidden');
    });
  }

  function toggleDropdown(menuBtn) {
    var wrap = menuBtn.closest('.aioq-sidebar-more-wrap');
    if (!wrap) return;
    var dropdown = wrap.querySelector('.aioq-sidebar-dropdown');
    if (!dropdown) return;
    var wasOpen = !dropdown.classList.contains('hidden');
    closeAllDropdowns();
    if (!wasOpen) dropdown.classList.remove('hidden');
  }

  function historyMoreMenuHtml(id, mode) {
    var summaryAttr = mode === 'modal' ? 'data-history-summary' : 'data-history-summary-sidebar';
    var agentAttr = mode === 'modal' ? 'data-history-agent' : 'data-history-agent-sidebar';
    var renameAttr = mode === 'modal' ? 'data-history-rename' : 'data-history-rename-sidebar';
    var deleteAttr = mode === 'modal' ? 'data-history-delete' : 'data-history-delete-sidebar';
    return '<div class="aioq-sidebar-more-wrap">' +
      '<button type="button" class="aioq-sidebar-more-btn" aria-label="更多" data-history-menu="' + escapeHtml(id) + '">⋯</button>' +
      '<div class="aioq-sidebar-dropdown hidden" role="menu">' +
        '<button type="button" role="menuitem" ' + summaryAttr + '="' + escapeHtml(id) + '">' + ICON_NOTE + '<span>保存笔记</span></button>' +
        '<button type="button" role="menuitem" ' + agentAttr + '="' + escapeHtml(id) + '">' + ICON_AGENT + '<span>保存个人智能体</span></button>' +
        '<button type="button" role="menuitem" ' + renameAttr + '="' + escapeHtml(id) + '">' + ICON_RENAME + '<span>重命名</span></button>' +
        '<button type="button" role="menuitem" class="is-danger" ' + deleteAttr + '="' + escapeHtml(id) + '">' + ICON_DELETE + '<span>删除</span></button>' +
      '</div></div>';
  }

  function agentMoreMenuHtml(id) {
    return '<div class="aioq-sidebar-more-wrap">' +
      '<button type="button" class="aioq-sidebar-more-btn" aria-label="更多" data-agent-menu="' + escapeHtml(id) + '">⋯</button>' +
      '<div class="aioq-sidebar-dropdown hidden" role="menu">' +
        '<button type="button" role="menuitem" data-agent-pin="' + escapeHtml(id) + '">' + ICON_PIN + '<span>置顶对话</span></button>' +
        '<button type="button" role="menuitem" data-agent-remove="' + escapeHtml(id) + '">' + ICON_REMOVE + '<span>移除智能体</span></button>' +
      '</div></div>';
  }

  function handleHistoryMenuClick(event) {
    var menuBtn = event.target.closest('[data-history-menu]');
    if (menuBtn) {
      event.stopPropagation();
      event.preventDefault();
      toggleDropdown(menuBtn);
      return true;
    }
    var summaryBtn = event.target.closest('[data-history-summary-sidebar], [data-history-summary]');
    if (summaryBtn) {
      event.stopPropagation();
      closeAllDropdowns();
      var sid = summaryBtn.getAttribute('data-history-summary-sidebar') || summaryBtn.getAttribute('data-history-summary');
      openHistorySummary(readHistory().find(function (item) { return item.id === sid; }));
      return true;
    }
    var agentBtn = event.target.closest('[data-history-agent-sidebar], [data-history-agent]');
    if (agentBtn) {
      event.stopPropagation();
      closeAllDropdowns();
      var aid = agentBtn.getAttribute('data-history-agent-sidebar') || agentBtn.getAttribute('data-history-agent');
      var historyItem = readHistory().find(function (item) { return item.id === aid; });
      if (!historyItem) return true;
      if (!isHistoryAgentReady(historyItem)) {
        toast('对话内容太少，请多聊几轮后再保存，或改用保存笔记');
        return true;
      }
      prepareHistoryAgent(historyItem);
      return true;
    }
    var renameBtn = event.target.closest('[data-history-rename-sidebar], [data-history-rename]');
    if (renameBtn) {
      event.stopPropagation();
      closeAllDropdowns();
      var rid = renameBtn.getAttribute('data-history-rename-sidebar') || renameBtn.getAttribute('data-history-rename');
      renameHistoryItem(readHistory().find(function (item) { return item.id === rid; }));
      return true;
    }
    var deleteBtn = event.target.closest('[data-history-delete-sidebar], [data-history-delete]');
    if (deleteBtn) {
      event.stopPropagation();
      closeAllDropdowns();
      openDeleteConfirm(deleteBtn.getAttribute('data-history-delete-sidebar') || deleteBtn.getAttribute('data-history-delete'));
      return true;
    }
    return false;
  }

  function pinSidebarAgent(id) {
    if (!id) return;
    var pinned = readIdList(PINNED_KEY).filter(function (x) { return x !== id; });
    pinned.unshift(id);
    writeIdList(PINNED_KEY, pinned.slice(0, 20));
    writeIdList(REMOVED_KEY, readIdList(REMOVED_KEY).filter(function (x) { return x !== id; }));
    renderSidebarAgents();
    toast('已置顶智能体');
  }

  function removeSidebarAgent(id) {
    if (!id) return;
    var removed = readIdList(REMOVED_KEY);
    if (removed.indexOf(id) < 0) removed.push(id);
    writeIdList(REMOVED_KEY, removed);
    writeIdList(PINNED_KEY, readIdList(PINNED_KEY).filter(function (x) { return x !== id; }));
    renderSidebarAgents();
    toast('已从侧栏移除');
  }

  function readHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function writeHistory(list) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list || [])); } catch (e) {}
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function messageText(msg) {
    if (!msg) return '';
    if (msg.role === 'assistant' && msg.html) {
      return stripHtml(msg.html) || msg.text || msg.prompt || '';
    }
    return msg.text || msg.prompt || '';
  }

  function roundLabel(index) {
    var labels = ['第一轮', '第二轮', '第三轮', '第四轮', '第五轮', '第六轮', '第七轮', '第八轮', '第九轮', '第十轮'];
    return labels[index] || ('第' + (index + 1) + '轮');
  }

  function inferRoundEvaluation(round, idx, rounds) {
    if (idx < rounds.length - 1) {
      var nextUser = rounds[idx + 1] && rounds[idx + 1].user ? rounds[idx + 1].user : '';
      if (/不满意|不对|不准确|错误|不是|不行|重新|再|具体|详细|补充|追问/.test(nextUser)) {
        return '用户对当前结果不满意或需要更具体的信息，因此继续追问。';
      }
      return '用户基于当前结果继续推进问题，因此进入下一轮对话。';
    }
    return '当前轮次形成阶段性结果，可作为后续对话的引用上下文。';
  }

  function deriveRoundsFromMessages(messages) {
    var rounds = [];
    var pendingUser = null;
    (messages || []).forEach(function (msg) {
      if (msg.role === 'user') {
        if (pendingUser) {
          rounds.push({ index: rounds.length, user: pendingUser, assistant: '', evaluation: '' });
        }
        pendingUser = messageText(msg);
        return;
      }
      if (msg.role === 'assistant') {
        rounds.push({
          index: rounds.length,
          user: pendingUser || '',
          assistant: messageText(msg),
          evaluation: ''
        });
        pendingUser = null;
      }
    });
    if (pendingUser) rounds.push({ index: rounds.length, user: pendingUser, assistant: '', evaluation: '' });
    return rounds;
  }

  function normalizeRound(round, idx, branch) {
    return {
      index: round.index != null ? round.index : idx,
      selectId: branch ? (branch.id + ':' + idx) : String(round.index != null ? round.index : idx),
      branchId: branch ? branch.id : '',
      branchLabel: branch ? (branch.label || '历史分支') : '',
      user: round.user || round.userText || '',
      assistant: round.assistant || round.assistantText || '',
      evaluation: round.evaluation || ''
    };
  }

  function deriveRounds(item) {
    if (!item) return [];
    if (item.branches && Array.isArray(item.branches.branches) && item.branches.branches.length > 1) {
      var all = [];
      item.branches.branches.forEach(function (branch) {
        var branchRounds = Array.isArray(branch.rounds) && branch.rounds.length
          ? branch.rounds
          : deriveRoundsFromMessages(branch.messages || []);
        branchRounds.forEach(function (round, idx) {
          all.push(normalizeRound(round, idx, branch));
        });
      });
      return all.map(function (round, idx, list) {
        return Object.assign({}, round, {
          evaluation: round.evaluation || inferRoundEvaluation(round, idx, list)
        });
      });
    }
    if (Array.isArray(item.rounds) && item.rounds.length) {
      return item.rounds.map(function (round, idx) {
        return normalizeRound(round, idx, null);
      });
    }
    var rounds = deriveRoundsFromMessages(item.messages || []);
    return rounds.map(function (round, idx, list) {
      return {
        index: idx,
        selectId: String(idx),
        branchId: '',
        branchLabel: '',
        user: round.user,
        assistant: round.assistant,
        evaluation: round.evaluation || inferRoundEvaluation(round, idx, list)
      };
    });
  }

  function selectedSummaryRounds() {
    if (!summaryState.item) return [];
    return deriveRounds(summaryState.item).filter(function (round) {
      return summaryState.selected[round.selectId || round.index];
    });
  }

  function buildSummaryMarkdown(item, rounds) {
    var title = (document.getElementById('historySummaryTitle') || {}).value || item.title || '历史对话总结';
    var lines = [
      '# ' + title.trim(),
      '',
      '- 来源对话：' + (item.title || item.id || '历史对话'),
      '- 来源智能体：' + (item.agentName || item.agentId || '未知智能体'),
      '- 来源会话 ID：' + (item.id || ''),
      '- 生成时间：' + new Date().toISOString(),
      ''
    ];
    rounds.forEach(function (round, idx) {
      var label = round.branchLabel ? (round.branchLabel + ' · ' + roundLabel(round.index)) : roundLabel(round.index);
      lines.push('------' + label + '-----');
      lines.push('用户:');
      lines.push(round.user || '（无用户问题）');
      lines.push('');
      lines.push('智能体:');
      lines.push(round.assistant || '（无智能体回答）');
      lines.push('');
      lines.push('AI总结与评价:');
      lines.push(round.evaluation || inferRoundEvaluation(round, idx, rounds));
      lines.push('------以上为' + label + '对话----');
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function buildCompactSummary(rounds) {
    return rounds.map(function (round, idx) {
      return roundLabel(round.index) + '：用户提出“' + (round.user || '').slice(0, 40) + '”，智能体给出对应回答。';
    }).join(' ');
  }

  function buildShortNoteSummary(item, rounds) {
    if (global.UserPersonalSpace && UserPersonalSpace.buildNoteSummaryFromRounds) {
      return UserPersonalSpace.buildNoteSummaryFromRounds(item, rounds);
    }
    if (!rounds.length) return '';
    var lastRound = rounds[rounds.length - 1];
    var lastAssistant = (lastRound.assistant || '').replace(/\s+/g, ' ').trim();
    if (lastAssistant) return lastAssistant.slice(0, 120);
    var firstUser = (rounds[0].user || '').replace(/\s+/g, ' ').trim();
    if (firstUser) return firstUser.slice(0, 120);
    return String(item && item.title ? item.title : '历史对话总结').slice(0, 120);
  }

  var HELP_MODAL_HTML =
    '<div class="modal-overlay hidden aioq-portal-stack-overlay" id="helpModal">' +
      '<div class="modal-box modal-sm aioq-contact-modal">' +
        '<div class="modal-header">' +
          '<h2>联系运维</h2>' +
          '<button type="button" class="close" id="btnCloseHelp" aria-label="关闭">×</button>' +
        '</div>' +
        '<div class="modal-body aioq-contact-body">' +
          '<div class="aioq-contact-row">' +
            '<span class="aioq-contact-icon" aria-hidden="true">📞</span>' +
            '<div><span class="aioq-contact-label">电话</span>' +
            '<a class="aioq-contact-value" href="tel:0755-26023001">0755-26023001</a></div>' +
          '</div>' +
          '<div class="aioq-contact-row">' +
            '<span class="aioq-contact-icon" aria-hidden="true">✉</span>' +
            '<div><span class="aioq-contact-label">邮箱</span>' +
            '<a class="aioq-contact-value" href="mailto:lixf69@cnooc.com.cn">lixf69@cnooc.com.cn</a></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function ensureHelpModal() {
    if (document.getElementById('helpModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = HELP_MODAL_HTML;
    var modal = wrap.firstElementChild;
    if (modal) document.body.appendChild(modal);
  }

  function openHelp() {
    ensureHelpModal();
    var helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.classList.remove('hidden');
    else if (global.Proto && Proto.toast) Proto.toast('联系运维：0755-26023001');
  }

  function closeHelp() {
    var helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.classList.add('hidden');
  }

  function buildRefinedSummary(item, rounds) {
    if (!rounds.length) return '';
    var agentName = item.agentName || '智能体';
    var firstUser = (rounds[0].user || '').replace(/\s+/g, ' ').slice(0, 72);
    var lastRound = rounds[rounds.length - 1];
    var lastAssistant = (lastRound.assistant || '').replace(/\s+/g, ' ').slice(0, 140);
    var opener = '与「' + agentName + '」围绕「' + firstUser + '」共 ' + rounds.length + ' 轮对话。';
    var closer = lastAssistant ? '结论要点：' + lastAssistant : '';
    var roundSummaries = rounds.map(function (round, idx) {
      return roundLabel(idx) + '：' + inferRoundEvaluation(round, idx, rounds);
    });
    return [opener, closer].filter(Boolean).join(' ') + ' ' + roundSummaries.join(' ');
  }

  function toast(msg) {
    if (global.Proto && Proto.toast) Proto.toast(msg);
  }

  function buildDemoHistory() {
    var seed = [
      ['agt_ocean', '敖钦智能助手', '平台知识库来源说明', '平台有哪些知识库来源？'],
      ['agt_travel', '差旅报销助手', '差旅报销材料清单', '报销流程有哪些？'],
      ['agt_safe', '钻完井安全助手', '井场风险点梳理', '找出这段记录里的风险点'],
      ['agt_report', '钻完井报告助手', '完工报告目录结构', '生成完工报告目录'],
      ['agt_waste', '废旧物资清单助手', '物资清单字段核对', '整理这份废旧物资清单'],
      ['agt_party', '党建智能助手', '会议纪要整理', '生成一份会议纪要']
    ];
    var now = Date.now();
    var models = ['DeepSeek-V4-Flash 模型', 'DeepSeek-V4-Pro 模型', 'DeepSeek-R1-32B 模型', 'DeepSeek-R1-671B 模型'];
    var list = [];
    for (var i = 0; i < 30; i++) {
      var item = seed[i % seed.length];
      var title = item[2];
      var prompt = item[3];
      list.push({
        id: 'hist_demo_' + i,
        agentId: item[0],
        agentName: item[1],
        model: models[i % models.length],
        title: title,
        preview: prompt,
        messageCount: 4,
        messages: [
          { role: 'user', text: prompt },
          { role: 'assistant', text: '已根据当前智能体能力给出结构化处理建议。', prompt: prompt },
          { role: 'user', text: '能不能再具体一点？' },
          { role: 'assistant', text: '可以，我会补充步骤、注意事项和可复核的输出格式。', prompt: title }
        ],
        updatedAt: new Date(now - i * 4 * 3600000).toISOString()
      });
    }
    return list;
  }

  function seedHistoryIfNeeded() {
    try {
      if (sessionStorage.getItem(HISTORY_SEED_FLAG) === '1') return;
      writeHistory(buildDemoHistory());
      sessionStorage.setItem(HISTORY_SEED_FLAG, '1');
    } catch (e) {}
  }

  function trackEvent(name, payload) {
    var list = [];
    try {
      var raw = sessionStorage.getItem(EVENTS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch (e) {}
    list.push({ event: name, at: new Date().toISOString(), payload: payload || {} });
    if (list.length > 300) list = list.slice(-300);
    try { sessionStorage.setItem(EVENTS_KEY, JSON.stringify(list)); } catch (e2) {}
  }

  function saveHistoryEntry(agent, model, preview, messages, branches) {
    var compactMessages = (messages || []).map(function (msg) {
      if (msg.role === 'user') return { role: 'user', text: msg.text, context: msg.context };
      return { role: 'assistant', text: msg.text, html: msg.html, prompt: msg.prompt };
    });
    var entry = {
      id: 'hist_' + Date.now().toString(36),
      agentId: agent.id,
      agentName: agent.name,
      model: model,
      title: (preview || '').slice(0, 40) || '新对话',
      preview: (preview || '').slice(0, 80),
      messageCount: compactMessages.length,
      messages: compactMessages,
      branches: branches && Array.isArray(branches.branches) ? branches : null,
      updatedAt: new Date().toISOString()
    };
    entry.rounds = deriveRounds(entry);
    var list = [entry].concat(readHistory().filter(function (x) {
      return !(x.agentId === entry.agentId && x.title === entry.title);
    })).slice(0, HISTORY_MAX);
    writeHistory(list);
    renderHistoryModal();
    renderSidebarHistory();
    renderSidebarAgents();
  }

  function restoreHistoryItem(item) {
    if (!item) return;
    if (!document.getElementById('chatMsgs') || !global.UserChatPortal || !UserChatPortal.restoreSession) {
      global.location.href = 'index.html?history=' + encodeURIComponent(item.id) + '&id=' + encodeURIComponent(item.agentId);
      return;
    }
    UserChatPortal.restoreSession(item);
    closeHistoryModal();
  }

  function renderSummaryTranscript() {
    var el = document.getElementById('historySummaryTranscript');
    if (!el || !summaryState.item) return;
    var rounds = deriveRounds(summaryState.item);
    el.innerHTML = rounds.length ? rounds.map(function (round, idx) {
      var selectId = round.selectId || String(round.index);
      var checked = summaryState.selected[selectId] ? ' checked' : '';
      var branch = round.branchLabel ? '<em>' + escapeHtml(round.branchLabel) + '</em>' : '';
      return '<label class="aioq-summary-round-item">' +
        '<input type="checkbox" data-summary-round="' + escapeHtml(selectId) + '"' + checked + '>' +
        '<span>' +
          '<strong>' + escapeHtml(roundLabel(round.index)) + branch + '</strong>' +
          '<em>用户：' + escapeHtml((round.user || '（无用户问题）').slice(0, 90)) + '</em>' +
          '<em>智能体：' + escapeHtml((round.assistant || '（无智能体回答）').slice(0, 120)) + '</em>' +
        '</span>' +
      '</label>';
    }).join('') : '<p class="aioq-space-empty">该历史对话暂无可总结内容</p>';
  }

  function openHistorySummary(item) {
    if (!item) return;
    summaryState.item = item;
    summaryState.selected = {};
    deriveRounds(item).forEach(function (round) { summaryState.selected[round.selectId || String(round.index)] = true; });
    var title = document.getElementById('historySummaryTitle');
    if (title) title.value = (item.title || '历史对话') + ' - 总结笔记';
    renderSummaryTranscript();
    var modal = document.getElementById('historySummaryModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeHistorySummary() {
    var modal = document.getElementById('historySummaryModal');
    if (modal) modal.classList.add('hidden');
    summaryState.item = null;
    summaryState.selected = {};
  }

  function saveHistorySummaryNote() {
    if (!summaryState.item || !global.UserPersonalSpace) return;
    var rounds = selectedSummaryRounds();
    if (!rounds.length) {
      toast('请至少选择一轮对话后再保存笔记');
      return;
    }
    var titleInput = document.getElementById('historySummaryTitle');
    var title = (titleInput && titleInput.value ? titleInput.value : summaryState.item.title || '历史对话总结').trim();
    var markdown = buildSummaryMarkdown(summaryState.item, rounds);
    UserPersonalSpace.saveNote({
      title: title,
      type: 'conversation_summary',
      sourceConversationId: summaryState.item.id,
      sourceAgentId: summaryState.item.agentId,
      selectedRounds: rounds.map(function (round) { return round.selectId || round.index; }),
      markdown: markdown,
      summary: buildShortNoteSummary(summaryState.item, rounds),
      content: markdown,
      source: '历史总结',
      agentId: summaryState.item.agentId,
      createdFrom: 'history_summary'
    });
    trackEvent('history_summary_note_save', {
      agent_id: summaryState.item.agentId,
      session_id: summaryState.item.id,
      selected_rounds: rounds.map(function (round) { return round.selectId || round.index; })
    });
    closeHistorySummary();
    toast('已保存总结笔记');
  }

  function portalContext() {
    return global.UserPortalContext ? UserPortalContext.get() : { userId: 'user_zhang', userName: '张三' };
  }

  function validRounds(item) {
    return deriveRounds(item).filter(function (round) {
      var user = String(round.user || '').replace(/\s+/g, ' ').trim();
      var assistant = String(round.assistant || '').replace(/\s+/g, ' ').trim();
      return user.length >= 4 && assistant.length >= 4;
    });
  }

  function isHistoryAgentReady(item) {
    return validRounds(item).length >= 2;
  }

  function uniqueUserQuestions(rounds, limit) {
    var seen = {};
    var list = [];
    rounds.forEach(function (round) {
      var text = String(round.user || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!text || seen[text]) return;
      seen[text] = true;
      list.push(text);
    });
    return list.slice(0, limit || 3);
  }

  function inferConversationTopic(rounds) {
    var first = String(rounds[0] && rounds[0].user ? rounds[0].user : '').replace(/\s+/g, ' ').trim();
    return first.replace(/[？?。！!，,；;：:]+$/g, '').slice(0, 36) || '业务咨询';
  }

  function inferOutputStyle(rounds) {
    var corpus = rounds.map(function (round) { return round.assistant || ''; }).join(' ');
    if (/步骤|流程|清单|列表|表格|逐项/.test(corpus)) return '采用分步骤或清单形式输出，条目清晰、可逐项核对。';
    if (/报告|摘要|总结|要点/.test(corpus)) return '先给出结论摘要，再展开关键要点与依据。';
    if (/注意|风险|材料|缺失|补充/.test(corpus)) return '突出注意事项、材料要求与合规检查点。';
    return '结构清晰、重点前置，必要时使用分点说明。';
  }

  function inferCapabilityBullets(rounds) {
    var hints = [];
    var corpus = rounds.map(function (round) {
      return (round.user || '') + ' ' + (round.assistant || '');
    }).join(' ');
    if (/知识库|制度|规范|政策|手册/.test(corpus)) hints.push('结合相关制度、知识库或业务规范组织回答');
    if (/步骤|流程|怎么|如何|办理|申请/.test(corpus)) hints.push('将复杂事项拆解为可执行步骤与检查清单');
    if (/材料|清单|字段|表格|核对/.test(corpus)) hints.push('整理材料清单、字段要求与常见缺失项');
    if (/风险|隐患|合规|安全/.test(corpus)) hints.push('识别风险点并给出可落地的整改或规避建议');
    if (/说明|文案|纪要|通知|报告/.test(corpus)) hints.push('生成结构化说明、纪要或报告草稿');
    var seen = {};
    return hints.filter(function (item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    }).slice(0, 4);
  }

  function buildTaskScenarios(rounds) {
    return uniqueUserQuestions(rounds, 5).map(function (question, idx) {
      return (idx + 1) + '. 当用户询问「' + question + '」时，给出准确、可执行、可复核的解答。';
    });
  }

  function buildStandardSystemPrompt(name, rounds) {
    var topic = inferConversationTopic(rounds);
    var capabilities = inferCapabilityBullets(rounds);
    if (!capabilities.length) capabilities.push('基于对话中已验证的信息与通用业务规范作答');
    var scenarios = buildTaskScenarios(rounds);
    var outputStyle = inferOutputStyle(rounds);
    var lastAssistant = String(rounds[rounds.length - 1] && rounds[rounds.length - 1].assistant ? rounds[rounds.length - 1].assistant : '')
      .replace(/\s+/g, ' ').trim().slice(0, 160);
    var evidenceLine = lastAssistant
      ? '- 回答风格应对齐以下有效范例的核心做法：' + lastAssistant
      : '- 回答风格应专业、简洁、可执行。';

    return [
      '# 角色',
      '你是「' + name + '」，一名专注于「' + topic + '」场景的专业智能助手。',
      '',
      '# 任务',
      '理解用户意图，围绕「' + topic + '」相关问题提供准确、可落地的解答与行动建议。',
      '',
      '# 核心能力',
      capabilities.map(function (item) { return '- ' + item; }).join('\n'),
      '',
      '# 典型场景与响应要求',
      scenarios.join('\n'),
      '',
      '# 工作流程',
      '1. 澄清用户目标，识别问题边界与缺失信息。',
      '2. 调用与场景匹配的知识与经验，组织结构化回答。',
      '3. 输出时遵循：' + outputStyle,
      '4. 若信息不足，列出需补充的材料或前提条件。',
      '',
      '# 输出规范',
      '- 语言简洁专业，避免空话、套话与重复。',
      '- 先给结论，再补充步骤、依据、示例或注意事项。',
      evidenceLine,
      '',
      '# 约束',
      '- 不编造未经验证的政策、数据或结论。',
      '- 不确定时明确说明信息缺口，并提示用户如何补充。',
      '- 不复述对话过程或元信息，始终以该角色直接服务用户。'
    ].join('\n');
  }

  function buildAgentIntroFromRounds(rounds) {
    var topic = inferConversationTopic(rounds);
    var styleHint = inferOutputStyle(rounds).replace(/。$/, '');
    var intro = '专注「' + topic + '」相关咨询，' + styleHint;
    return intro.length > 80 ? intro.slice(0, 77) + '…' : intro;
  }

  function buildPersonalAgentDraft(item) {
    var rounds = validRounds(item);
    var ctx = portalContext();
    var name = String(item.title || '历史对话').trim().slice(0, 40) || '个人智能体';
    var intro = buildAgentIntroFromRounds(rounds);
    return {
      name: name,
      intro: intro,
      systemPrompt: buildStandardSystemPrompt(name, rounds),
      suggestions: [],
      model: item.model || 'DeepSeek-V4-Flash 模型',
      sourceSessionId: item.id,
      sourceAgentId: item.agentId || '',
      sourceAgentName: item.agentName || item.agentId || '智能体',
      sourceType: 'history_session',
      status: 'draft',
      shareMode: 'private',
      ownerId: ctx.userId || 'user_zhang'
    };
  }

  function renderHistoryAgentSource() {
    var el = document.getElementById('historyAgentSource');
    if (!el || !agentState.item) return;
    var rounds = validRounds(agentState.item);
    el.textContent = (agentState.item.title || '历史对话') + ' · ' +
      (agentState.item.agentName || '智能体') + ' · ' + rounds.length + ' 轮有效对话';
  }

  function fillHistoryAgentForm(draft) {
    var nameEl = document.getElementById('historyAgentName');
    var introEl = document.getElementById('historyAgentIntro');
    var promptEl = document.getElementById('historyAgentPrompt');
    if (nameEl) nameEl.value = draft.name || '';
    if (introEl) introEl.value = draft.intro || '';
    if (promptEl) promptEl.value = draft.systemPrompt || '';
    renderHistoryAgentSource();
  }

  function ensureHistoryAgentPreparingOverlay() {
    var el = document.getElementById('historyAgentPreparingOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'historyAgentPreparingOverlay';
    el.className = 'modal-overlay aioq-agent-preparing-overlay hidden';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="modal-box modal-lg aioq-summary-modal aioq-agent-modal aioq-agent-preparing-box">' +
      '<div class="spinner" aria-hidden="true"></div>' +
      '<p class="title">正在分析对话，生成智能体草稿…</p>' +
      '<p class="sub">请稍候</p>' +
    '</div>';
    document.body.appendChild(el);
    return el;
  }

  function showHistoryAgentPreparing() {
    ensureHistoryAgentPreparingOverlay().classList.remove('hidden');
  }

  function hideHistoryAgentPreparing() {
    var overlay = document.getElementById('historyAgentPreparingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function openHistoryAgent(item) {
    if (!item) return;
    var modal = document.getElementById('historyAgentModal');
    if (!modal) {
      toast('请到对话工作台使用此功能');
      return;
    }
    agentState.item = item;
    agentState.draft = buildPersonalAgentDraft(item);
    fillHistoryAgentForm(agentState.draft);
    modal.classList.remove('hidden');
  }

  function prepareHistoryAgent(item) {
    if (!item || agentState.preparing) return;
    if (!document.getElementById('historyAgentModal')) {
      toast('请到对话工作台使用此功能');
      return;
    }
    agentState.preparing = true;
    showHistoryAgentPreparing();
    setTimeout(function () {
      try {
        openHistoryAgent(item);
      } finally {
        agentState.preparing = false;
        hideHistoryAgentPreparing();
      }
    }, AGENT_PREPARE_MS);
  }

  function closeHistoryAgent() {
    var modal = document.getElementById('historyAgentModal');
    if (modal) modal.classList.add('hidden');
    agentState.item = null;
    agentState.draft = null;
  }

  function saveHistoryAgent() {
    if (!agentState.item || !global.UserPersonalSpace) return;
    var nameEl = document.getElementById('historyAgentName');
    var introEl = document.getElementById('historyAgentIntro');
    var promptEl = document.getElementById('historyAgentPrompt');
    var name = (nameEl && nameEl.value ? nameEl.value : agentState.draft.name || '').trim();
    if (!name) {
      toast('请输入智能体名称');
      return;
    }
    var intro = (introEl && introEl.value ? introEl.value : agentState.draft.intro || '').trim();
    var systemPrompt = (promptEl && promptEl.value ? promptEl.value : agentState.draft.systemPrompt || '').trim();
    var payload = Object.assign({}, agentState.draft, {
      name: name.slice(0, 40),
      intro: intro.slice(0, 80),
      systemPrompt: systemPrompt,
      suggestions: []
    });
    var result = UserPersonalSpace.savePersonalAgent(payload);
    if (!result.ok) {
      if (result.reason === 'duplicate') toast('该对话已保存为个人智能体');
      else toast('保存失败，请稍后重试');
      return;
    }
    trackEvent('history_session_agent_save', {
      agent_id: agentState.item.agentId,
      session_id: agentState.item.id,
      personal_agent_id: result.agent && result.agent.id
    });
    closeHistoryAgent();
    toast('已保存个人智能体');
    if (result.agent) recordSidebarRecentAgent(result.agent);
    if (global.UserPersonalSpace.renderMySpace) UserPersonalSpace.renderMySpace();
    renderSidebarAgents();
  }

  function renameHistoryItem(item) {
    if (!item) return;
    var next = global.prompt ? global.prompt('重命名历史对话', item.title || '') : '';
    if (!next || !next.trim()) return;
    var list = readHistory().map(function (entry) {
      if (entry.id !== item.id) return entry;
      return Object.assign({}, entry, { title: next.trim(), updatedAt: new Date().toISOString() });
    });
    writeHistory(list);
    renderHistoryModal();
    renderSidebarHistory();
    renderSidebarAgents();
    toast('已重命名历史对话');
  }

  function historyGroupLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '更早';
    var now = new Date();
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    var startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - 7);
    if (d >= startToday) return '今天';
    if (d >= startYesterday) return '昨天';
    if (d >= startWeek) return '近 7 天';
    return '更早';
  }

  function filterHistory(list) {
    var q = historySearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (item) {
      return [item.title, item.preview, item.agentName, item.model].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function formatHistoryTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var label = historyGroupLabel(iso);
    if (label === '今天') return hh + ':' + mm;
    if (label === '昨天') return '昨天 ' + hh + ':' + mm;
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hh + ':' + mm;
  }

  function renderHistoryModal() {
    var listEl = document.getElementById('historyList');
    var loadMore = document.getElementById('btnHistoryLoadMore');
    if (!listEl) return;
    var all = filterHistory(readHistory());
    var visible = all.slice(0, historyVisibleCount);
    if (!visible.length) {
      listEl.innerHTML = '<p class="aioq-muted">暂无历史记录</p>';
      if (loadMore) loadMore.classList.add('hidden');
      return;
    }
    var groups = {};
    visible.forEach(function (item) {
      var label = historyGroupLabel(item.updatedAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    var html = '';
    ['今天', '昨天', '近 7 天', '更早'].forEach(function (label) {
      if (!groups[label] || !groups[label].length) return;
      html += '<div class="aioq-history-group-title">' + label + '</div><div class="aioq-history-list">';
      html += groups[label].map(function (item) {
        var roundCount = deriveRounds(item).length;
        var rounds = roundCount ? roundCount + ' 轮对话' : '';
        return '<div class="aioq-history-item-wrap">' +
          '<button type="button" class="aioq-history-item" data-history-id="' + escapeHtml(item.id) + '">' +
          '<div class="aioq-history-item-head"><strong>' + escapeHtml(item.title) + '</strong><time class="aioq-history-time">' + escapeHtml(formatHistoryTime(item.updatedAt)) + '</time></div>' +
          '<span>' + escapeHtml(item.agentName) + ' · ' + escapeHtml(item.model) + (rounds ? ' · ' + escapeHtml(rounds) : '') + '</span>' +
          '<small>' + escapeHtml(item.preview) + '</small></button>' +
          historyMoreMenuHtml(item.id, 'modal') +
        '</div>';
      }).join('');
      html += '</div>';
    });
    listEl.innerHTML = html;
    if (loadMore) {
      if (all.length > historyVisibleCount) {
        loadMore.classList.remove('hidden');
        loadMore.textContent = '加载更多（' + (all.length - historyVisibleCount) + ' 条）';
      } else {
        loadMore.classList.add('hidden');
      }
    }
  }

  function openHistoryModal() {
    var modal = document.getElementById('historyModal');
    if (!modal) return;
    historyVisibleCount = HISTORY_PAGE_SIZE;
    historySearchQuery = '';
    var search = document.getElementById('historySearchInput');
    if (search) search.value = '';
    renderHistoryModal();
    modal.classList.remove('hidden');
  }

  function closeHistoryModal() {
    var modal = document.getElementById('historyModal');
    if (modal) modal.classList.add('hidden');
  }

  function readRecentAgents() {
    try {
      var raw = sessionStorage.getItem(RECENT_AGENT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function writeRecentAgents(list) {
    try { sessionStorage.setItem(RECENT_AGENT_KEY, JSON.stringify(list || [])); } catch (e) {}
  }

  function recordSidebarRecentAgent(agent) {
    if (!agent || !agent.id) return;
    var existing = readRecentAgents().find(function (entry) { return entry.id === agent.id; });
    var next = {
      id: agent.id,
      name: agent.name || agent.id,
      lastUsedAt: new Date().toISOString(),
      usageCount: existing ? (existing.usageCount || 0) + 1 : 1
    };
    writeRecentAgents([next].concat(readRecentAgents().filter(function (entry) {
      return entry.id !== agent.id;
    })).slice(0, 20));
  }

  function activeAgentId() {
    try {
      var params = new URLSearchParams(global.location.search);
      var id = params.get('id');
      if (id) return id;
    } catch (e) {}
    if (global.UserChatPortal && UserChatPortal.activeAgent) {
      try { return UserChatPortal.activeAgent().id || ''; } catch (e2) {}
    }
    return '';
  }

  function renderSidebarAgents() {
    var el = document.getElementById('sidebarAgentList');
    if (!el) return;
    var ctx = global.UserPortalContext ? UserPortalContext.get() : {};
    var grouped = global.UserAgentResolver ? UserAgentResolver.resolve(ctx) : { personal: [], org: [], enterprise: [] };
    var all = grouped.personal.concat(grouped.org, grouped.enterprise);
    if (!all.length && global.UserChatPortal && UserChatPortal.getDefaultAgents) {
      all = UserChatPortal.getDefaultAgents().slice();
    }
    var recent = readRecentAgents();
    var favorites = readIdList(FAVORITE_KEY);
    var removed = readIdList(REMOVED_KEY);
    var pinned = readIdList(PINNED_KEY);
    var orderedIds = [];
    var seen = {};
    pinned.forEach(function (id) {
      if (removed.indexOf(id) >= 0) return;
      if (!seen[id]) { seen[id] = true; orderedIds.push(id); }
    });
    recent.forEach(function (entry) {
      var id = entry.id;
      if (removed.indexOf(id) >= 0) return;
      if (!seen[id]) { seen[id] = true; orderedIds.push(id); }
    });
    favorites.forEach(function (id) {
      if (removed.indexOf(id) >= 0) return;
      if (!seen[id]) { seen[id] = true; orderedIds.push(id); }
    });
    var picked = orderedIds.map(function (id) {
      return all.find(function (a) { return a.id === id; });
    }).filter(Boolean);
    var currentId = activeAgentId();
    if (currentId && removed.indexOf(currentId) < 0) {
      var currentAgent = all.find(function (a) { return a.id === currentId; });
      if (currentAgent) {
        picked = [currentAgent].concat(picked.filter(function (agent) { return agent.id !== currentId; }));
      }
    }
    picked = picked.slice(0, 12);
    el.innerHTML = picked.length ? picked.map(function (agent) {
      var activeClass = agent.id === currentId ? ' active' : '';
      return '<div class="aioq-sidebar-agent-item">' +
        '<a class="aioq-sidebar-agent-link' + activeClass + '" href="index.html?id=' + encodeURIComponent(agent.id) + '">' +
          '<span class="aioq-sidebar-agent-avatar" aria-hidden="true">' + escapeHtml((agent.name || '?').slice(0, 1)) + '</span>' +
          '<span>' + escapeHtml(agent.name) + '</span>' +
        '</a>' +
        agentMoreMenuHtml(agent.id) +
      '</div>';
    }).join('') : '<p class="aioq-sidebar-empty">暂无智能体，去广场使用或收藏</p>';
  }

  function renderSidebarHistory() {
    var el = document.getElementById('sidebarHistoryList');
    if (!el) return;
    var list = readHistory().slice(0, 8);
    el.innerHTML = list.length ? list.map(function (item) {
      var id = escapeHtml(item.id);
      return '<div class="aioq-sidebar-history-item">' +
        '<button type="button" class="aioq-history-item-body" data-sidebar-history="' + id + '">' +
          '<strong>' + escapeHtml(item.title || '未命名对话') + '</strong>' +
          '<span>' + escapeHtml(item.agentName || '智能体') + ' · ' + escapeHtml(formatHistoryTime(item.updatedAt)) + '</span>' +
        '</button>' +
        historyMoreMenuHtml(item.id, 'sidebar') +
      '</div>';
    }).join('') : '<p class="aioq-sidebar-empty">暂无历史对话</p>';
  }

  function openDeleteConfirm(id) {
    pendingDeleteId = id;
    var modal = document.getElementById('historyDeleteConfirmModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeDeleteConfirm() {
    pendingDeleteId = null;
    var modal = document.getElementById('historyDeleteConfirmModal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmDeleteHistory(id) {
    if (!id) return;
    writeHistory(readHistory().filter(function (item) { return item.id !== id; }));
    renderHistoryModal();
    renderSidebarHistory();
    toast('已删除该历史对话');
    closeDeleteConfirm();
  }

  function renderSourcePanel(mode) {
    var body = document.getElementById('sourcePanelBody');
    if (!body) return;
    if (sourceState === 'loading') {
      body.innerHTML = '<div class="aioq-source-loading">原文加载中...</div>';
      return;
    }
    if (sourceState === 'failed') {
      body.innerHTML = '<div class="aioq-source-loading">原文暂未加载，点击查看原文后重试。</div>';
      return;
    }
    if (mode === 'excerpt') {
      body.innerHTML = '<ol class="aioq-source-excerpts"><li>引用段落 1：制度条款与现场要求一致。</li><li>引用段落 2：风险分级需要结合业务场景复核。</li></ol>';
    } else {
      body.innerHTML = '<div class="aioq-source-doc"><p>原文预览（原型）：企业知识库文档全文占位。</p></div>';
    }
  }

  function loadSourceDocument() {
    sourceState = 'loading';
    renderSourcePanel('doc');
    setTimeout(function () {
      sourceState = 'ready';
      renderSourcePanel('doc');
    }, 350);
  }

  function ensureChatFeedbackForm() {
    var mount = document.getElementById('chatFeedbackFormMount');
    if (!mount || mount.dataset.feedbackFormMounted) return;
    if (!global.UserFeedbackForm) return;
    mount.innerHTML = UserFeedbackForm.markup({
      hint: '你的反馈会进入运营闭环，帮助智能体持续优化。',
      placeholder: '你认为更好的答案或处理方式是什么？',
      textId: UserFeedbackForm.CHAT.textId,
      fileId: UserFeedbackForm.CHAT.fileId,
      listId: UserFeedbackForm.CHAT.listId
    });
    UserFeedbackForm.wire(UserFeedbackForm.CHAT);
    mount.dataset.feedbackFormMounted = '1';
  }

  function collectFeedbackPayload() {
    var data = global.UserFeedbackForm
      ? UserFeedbackForm.collect(UserFeedbackForm.CHAT)
      : { text: String((document.getElementById('feedbackText') || {}).value || '').trim(), images: [] };
    var agent = UserChatPortal.activeAgent();
    return {
      text: data.text,
      images: (data.images || []).map(function (img) { return { name: img.name }; }),
      agent: agent.name,
      agentId: agent.id
    };
  }

  function closeFeedbackModal() {
    var modal = document.getElementById('chatFeedbackModal');
    if (modal) modal.classList.add('hidden');
    if (global.UserFeedbackForm) UserFeedbackForm.reset(UserFeedbackForm.CHAT);
  }

  function submitFeedbackFromModal() {
    var payload = collectFeedbackPayload();
    if (global.UserFeedbackForm ? UserFeedbackForm.isEmpty(payload) : !payload.text.trim()) {
      toast('请填写反馈说明或上传图片');
      return;
    }
    if (global.UserMessageCenter && UserMessageCenter.pushFeedbackFromChat) {
      UserMessageCenter.pushFeedbackFromChat(payload);
    }
    var fbId = global.OpsUserFeedback && OpsUserFeedback.createFromChat
      ? OpsUserFeedback.createFromChat(payload)
      : null;
    if (fbId && global.OpsFeedbackLoop && OpsFeedbackLoop.createTaskFromFeedback) {
      OpsFeedbackLoop.createTaskFromFeedback(fbId);
    }
    trackEvent('feedback_submit', { agent_id: payload.agentId, feedback_id: fbId, image_count: (payload.images || []).length });
    toast('反馈已提交');
    closeFeedbackModal();
  }

  function requestExpert() {
    var agent = UserChatPortal.activeAgent();
    var payload = { reasons: ['请求专家复核'], text: '用户请求专家复核当前回答', agent: agent.name, agentId: agent.id };
    var fbId = global.OpsUserFeedback && OpsUserFeedback.createFromChat ? OpsUserFeedback.createFromChat(payload) : null;
    if (fbId && global.OpsFeedbackLoop && OpsFeedbackLoop.createTaskFromFeedback) {
      OpsFeedbackLoop.createTaskFromFeedback(fbId);
    }
    trackEvent('expert_request', { agent_id: agent.id, feedback_id: fbId });
    toast('已提交专家复核请求');
  }

  function bindUi() {
    if (!uiBound) {
      uiBound = true;
      document.addEventListener('click', function (event) {
        if (!event.target.closest('.aioq-sidebar-more-wrap')) closeAllDropdowns();
      });
    }
    var btnHistory = document.getElementById('btnHistory');
    var historyModal = document.getElementById('historyModal');
    var btnCloseHistory = document.getElementById('btnCloseHistory');
    var sidebarHistoryList = document.getElementById('sidebarHistoryList');
    var sidebarAgentList = document.getElementById('sidebarAgentList');
    if (btnHistory) btnHistory.addEventListener('click', function (event) {
      event.preventDefault();
      openHistoryModal();
    });
    if (sidebarHistoryList) sidebarHistoryList.addEventListener('click', function (event) {
      if (handleHistoryMenuClick(event)) return;
      var btn = event.target.closest('[data-sidebar-history]');
      if (!btn) return;
      restoreHistoryItem(readHistory().find(function (item) { return item.id === btn.getAttribute('data-sidebar-history'); }));
    });
    if (sidebarAgentList) sidebarAgentList.addEventListener('click', function (event) {
      var menuBtn = event.target.closest('[data-agent-menu]');
      if (menuBtn) {
        event.stopPropagation();
        event.preventDefault();
        toggleDropdown(menuBtn);
        return;
      }
      var pinBtn = event.target.closest('[data-agent-pin]');
      if (pinBtn) {
        event.stopPropagation();
        closeAllDropdowns();
        pinSidebarAgent(pinBtn.getAttribute('data-agent-pin'));
        return;
      }
      var removeBtn = event.target.closest('[data-agent-remove]');
      if (removeBtn) {
        event.stopPropagation();
        closeAllDropdowns();
        removeSidebarAgent(removeBtn.getAttribute('data-agent-remove'));
      }
    });
    var deleteModal = document.getElementById('historyDeleteConfirmModal');
    if (deleteModal) deleteModal.addEventListener('click', function (event) {
      if (event.target.id === 'historyDeleteConfirmModal') closeDeleteConfirm();
    });
    var btnCloseHistoryDelete = document.getElementById('btnCloseHistoryDelete');
    if (btnCloseHistoryDelete) btnCloseHistoryDelete.addEventListener('click', closeDeleteConfirm);
    var btnCancelHistoryDelete = document.getElementById('btnCancelHistoryDelete');
    if (btnCancelHistoryDelete) btnCancelHistoryDelete.addEventListener('click', closeDeleteConfirm);
    var btnConfirmHistoryDelete = document.getElementById('btnConfirmHistoryDelete');
    if (btnConfirmHistoryDelete) btnConfirmHistoryDelete.addEventListener('click', function () {
      if (pendingDeleteId) confirmDeleteHistory(pendingDeleteId);
    });
    if (historyModal) historyModal.addEventListener('click', function (event) {
      if (event.target.id === 'historyModal') closeHistoryModal();
    });
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeHistoryModal);
    var summaryModal = document.getElementById('historySummaryModal');
    if (summaryModal) summaryModal.addEventListener('click', function (event) {
      if (event.target.id === 'historySummaryModal') closeHistorySummary();
      var roundInput = event.target.closest('[data-summary-round]');
      if (roundInput) {
        summaryState.selected[roundInput.getAttribute('data-summary-round')] = roundInput.checked;
        return;
      }
    });
    var closeSummary = document.getElementById('btnCloseHistorySummary');
    if (closeSummary) closeSummary.addEventListener('click', closeHistorySummary);
    var cancelSummary = document.getElementById('btnCancelHistorySummary');
    if (cancelSummary) cancelSummary.addEventListener('click', closeHistorySummary);
    var saveSummary = document.getElementById('btnSaveHistorySummary');
    if (saveSummary) saveSummary.addEventListener('click', saveHistorySummaryNote);
    var selectAllSummary = document.getElementById('btnSelectAllHistorySummary');
    if (selectAllSummary) selectAllSummary.addEventListener('click', function () {
      if (!summaryState.item) return;
      deriveRounds(summaryState.item).forEach(function (round) {
        summaryState.selected[round.selectId || String(round.index)] = true;
      });
      renderSummaryTranscript();
    });
    var clearSummary = document.getElementById('btnClearHistorySummary');
    if (clearSummary) clearSummary.addEventListener('click', function () {
      summaryState.selected = {};
      renderSummaryTranscript();
    });
    var agentModal = document.getElementById('historyAgentModal');
    if (agentModal) agentModal.addEventListener('click', function (event) {
      if (event.target.id === 'historyAgentModal') closeHistoryAgent();
    });
    var closeAgent = document.getElementById('btnCloseHistoryAgent');
    if (closeAgent) closeAgent.addEventListener('click', closeHistoryAgent);
    var cancelAgent = document.getElementById('btnCancelHistoryAgent');
    if (cancelAgent) cancelAgent.addEventListener('click', closeHistoryAgent);
    var saveAgent = document.getElementById('btnSaveHistoryAgent');
    if (saveAgent) saveAgent.addEventListener('click', saveHistoryAgent);
    var historySearch = document.getElementById('historySearchInput');
    if (historySearch) historySearch.addEventListener('input', function () {
      historySearchQuery = historySearch.value || '';
      historyVisibleCount = HISTORY_PAGE_SIZE;
      renderHistoryModal();
    });
    var btnLoadMore = document.getElementById('btnHistoryLoadMore');
    if (btnLoadMore) btnLoadMore.addEventListener('click', function () {
      historyVisibleCount += HISTORY_PAGE_SIZE;
      renderHistoryModal();
    });
    var historyList = document.getElementById('historyList');
    if (historyList) historyList.addEventListener('click', function (event) {
      if (handleHistoryMenuClick(event)) return;
      var btn = event.target.closest('[data-history-id]');
      if (!btn) return;
      restoreHistoryItem(readHistory().find(function (item) { return item.id === btn.getAttribute('data-history-id'); }));
    });

    var sourceDownload = document.getElementById('btnSourceDownload');
    if (sourceDownload) sourceDownload.addEventListener('click', function () {
      var agent = UserChatPortal.activeAgent();
      trackEvent('file_download', { agent_id: agent.id, kind: 'source_doc' });
      var body = document.getElementById('sourcePanelBody');
      var text = body ? body.innerText : '（原型 mock 原文）';
      try {
        var blob = new Blob([text + '\n\n—— 敖钦 AI 工作台 · 知识库原文导出'], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (agent.name || '知识库') + '-原文.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('原文下载已开始');
      } catch (e) {
        toast('原文下载已开始（原型）');
      }
    });

    var submit = document.getElementById('btnSubmitFeedback');
    ensureChatFeedbackForm();
    if (submit) submit.addEventListener('click', submitFeedbackFromModal);
    var cancel = document.getElementById('btnCancelFeedback');
    if (cancel) cancel.addEventListener('click', closeFeedbackModal);
    var close = document.getElementById('btnCloseFeedback');
    if (close) close.addEventListener('click', closeFeedbackModal);
    if (global.UserMessageCenter && UserMessageCenter.mount) UserMessageCenter.mount();
    var btnHelp = document.getElementById('btnHelp');
    ensureHelpModal();
    if (btnHelp) btnHelp.addEventListener('click', openHelp);
    var btnCloseHelp = document.getElementById('btnCloseHelp');
    var btnDismissHelp = document.getElementById('btnDismissHelp');
    if (btnCloseHelp) btnCloseHelp.addEventListener('click', closeHelp);
    if (btnDismissHelp) btnDismissHelp.addEventListener('click', closeHelp);
    var helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.addEventListener('click', function (event) {
      if (event.target.id === 'helpModal') closeHelp();
    });
    var btnCollapse = document.getElementById('btnCollapseSidebar');
    if (btnCollapse) btnCollapse.addEventListener('click', function () {
      var shell = document.querySelector('.aioq-user-shell');
      if (shell) shell.classList.toggle('is-sidebar-collapsed');
    });
    sourceState = 'failed';
    renderSourcePanel('excerpt');
  }

  function init(sessionSkills) {
    if (global.UserPersonalSpace) UserPersonalSpace.seedIfNeeded();
    var ctx = UserPortalContext.get();
    var grouped = UserAgentResolver.resolve(ctx);
    var all = grouped.personal.concat(grouped.org, grouped.enterprise);
    if (!all.length) grouped.enterprise = UserChatPortal.getDefaultAgents().slice(0, 3);

    UserChatPortal.init({
      mode: 'web',
      groupedAgents: grouped,
      sessionSkills: sessionSkills,
      onAgentChange: function (agent) {
        if (agent) recordSidebarRecentAgent(agent);
        renderSidebarAgents();
      },
      onChatStart: function (info) {
        trackEvent('chat_start', { agent_id: info.agent.id, model_tier: info.model, skills_hit: info.skillIds || [], context: info.context || {} });
      },
      onChatComplete: function (info) {
        saveHistoryEntry(
          info.agent,
          info.model,
          info.text,
          info.messages || UserChatPortal.getSessionMessages(),
          info.branches || (UserChatPortal.getBranchSnapshot && UserChatPortal.getBranchSnapshot())
        );
      },
      onViewSource: function () {
        var panel = document.getElementById('sourcePanel');
        if (panel) panel.classList.remove('hidden');
        loadSourceDocument();
      },
      onCiteExcerpt: function () {
        sourceState = 'ready';
        var panel = document.getElementById('sourcePanel');
        if (panel) panel.classList.remove('hidden');
        renderSourcePanel('excerpt');
      },
      onRequestExpert: requestExpert
    });

    bindUi();
    seedHistoryIfNeeded();
    renderHistoryModal();
    renderSidebarHistory();
    if (global.UserChatPortal && UserChatPortal.activeAgent) {
      try { recordSidebarRecentAgent(UserChatPortal.activeAgent()); } catch (e) {}
    }
    renderSidebarAgents();

    try {
      var params = new URLSearchParams(global.location.search);
      var historyId = params.get('history');
      if (historyId) {
        var item = readHistory().find(function (x) { return x.id === historyId; });
        if (item && UserChatPortal.restoreSession(item)) { /* silent restore */ }
      }
    } catch (e) {}
    if (global.location && global.location.hash === '#history') openHistoryModal();
  }

  function mountSidebar() {
    if (global.UserPersonalSpace) UserPersonalSpace.seedIfNeeded();
    bindUi();
    seedHistoryIfNeeded();
    renderHistoryModal();
    renderSidebarHistory();
    renderSidebarAgents();
    if (global.location && global.location.hash === '#history') openHistoryModal();
  }

  global.UserPortalBridge = {
    init: init,
    mountSidebar: mountSidebar,
    openHistory: openHistoryModal,
    closeHistory: closeHistoryModal,
    trackEvent: trackEvent,
    renderSidebarAgents: renderSidebarAgents,
    renderSidebarHistory: renderSidebarHistory,
    recordSidebarRecentAgent: recordSidebarRecentAgent,
    openHelp: openHelp,
    ensureHelpModal: ensureHelpModal
  };
})(window);
