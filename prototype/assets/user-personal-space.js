/**
 * 用户端个人空间：个人资料、个人笔记、个人智能体配置与基础对话默认项。
 * 所有状态仅保存在用户端原型，不反写运营平台。
 */
(function (global) {
  var KEYS = {
    notes: 'proto_user_notes',
    personalAgents: 'proto_user_personal_agents',
    profile: 'proto_user_profile',
    preferences: 'proto_user_chat_preferences',
    seeded: 'proto_user_personal_space_seeded_v2'
  };

  var ORG_DIRECTORY = {
    org_haineng: {
      id: 'org_haineng',
      name: '海能集团',
      editable: false,
      secondaryOptions: [
        {
          value: '直属单位',
          label: '直属单位',
          tertiary: ['平台团队', 'QHSE 中心', '经营管理部']
        }
      ]
    },
    external: {
      id: 'external',
      name: '组织外部用户',
      editable: true,
      secondaryOptions: [
        {
          value: '合作单位',
          label: '合作单位',
          tertiary: ['技术支持部', '项目管理部', '实施交付部']
        },
        {
          value: '供应商',
          label: '供应商',
          tertiary: ['售前支持组', '驻场服务组', '培训运营组']
        },
        {
          value: '顾问团队',
          label: '顾问团队',
          tertiary: ['解决方案组', '行业研究组', '知识工程组']
        }
      ]
    }
  };

  var pendingDeleteNoteId = null;
  var pendingDeletePersonalAgentId = null;
  var editingNoteId = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } catch (e) {
      return '';
    }
  }

  function readJson(key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function writeJson(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
    return value;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function toast(msg) {
    if (global.Proto && typeof Proto.toast === 'function') Proto.toast(msg);
  }

  function context() {
    return global.UserPortalContext ? UserPortalContext.get() : {
      userId: 'user_zhang',
      userName: '张三',
      departmentName: '平台团队',
      orgId: 'org_haineng',
      orgName: '海能集团',
      roleLabel: '普通用户',
      email: 'zhangsan@cnooc.com.cn',
      avatarText: '张'
    };
  }

  function normalizeProfileData(prof) {
    var ctx = context();
    var next = Object.assign({
      userId: ctx.userId,
      userName: ctx.userName,
      departmentName: ctx.departmentName,
      orgId: ctx.orgId || 'org_haineng',
      orgName: ctx.orgName || '海能集团',
      roleLabel: ctx.roleLabel || '普通用户',
      email: ctx.email || '',
      avatarText: ctx.avatarText || (ctx.userName || '用').slice(0, 1),
      title: '业务使用者',
      phone: '',
      bio: '',
      secondaryUnit: '',
      tertiaryUnit: ''
    }, prof || {});
    if (!next.avatarText) next.avatarText = (next.userName || '用').slice(0, 1);
    return next;
  }

  function seedIfNeeded() {
    try {
      if (sessionStorage.getItem(KEYS.seeded) === '1') return;
      var ctx = context();
      writeJson(KEYS.profile, normalizeProfileData({
        userId: ctx.userId,
        userName: ctx.userName,
        departmentName: ctx.departmentName,
        orgId: ctx.orgId || 'org_haineng',
        orgName: ctx.orgName,
        roleLabel: ctx.roleLabel || '普通用户',
        email: ctx.email || '',
        updatedAt: nowIso()
      }));
      writeJson(KEYS.preferences, {
        deepThinking: false,
        defaultKnowledgeBase: 'kb_enterprise'
      });
      writeJson(KEYS.notes, [
        {
          id: 'note_seed_travel',
          title: '差旅报销材料清单',
          content: '发票、审批单、行程单需要一并上传；如缺少材料需先补充说明。',
          summary: '发票、审批单、行程单需一并上传，缺失材料时先补充说明。',
          source: '历史对话',
          type: 'conversation_summary',
          agentId: 'agt_travel',
          sourceConversationId: 'hist_demo_1',
          createdAt: nowIso(),
          updatedAt: nowIso()
        },
        {
          id: 'note_seed_qhse',
          title: 'QHSE 检查关注点',
          content: '重点关注现场风险识别、整改责任人、整改期限和复查记录。',
          summary: '重点关注风险识别、整改责任、整改期限和复查记录。',
          source: '个人整理',
          type: 'manual_note',
          agentId: 'agt_safe',
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      ]);
      writeJson(KEYS.personalAgents, []);
      sessionStorage.setItem(KEYS.seeded, '1');
    } catch (e) {}
  }

  function notes() {
    seedIfNeeded();
    return readJson(KEYS.notes, []);
  }

  function preferences() {
    seedIfNeeded();
    return readJson(KEYS.preferences, {});
  }

  function savePreferences(prefs) {
    return writeJson(KEYS.preferences, Object.assign({}, preferences(), prefs || {}));
  }

  function profile() {
    seedIfNeeded();
    return normalizeProfileData(readJson(KEYS.profile, {}));
  }

  function saveProfile(prof) {
    var next = normalizeProfileData(Object.assign({}, profile(), prof || {}, { updatedAt: nowIso() }));
    return writeJson(KEYS.profile, next);
  }

  function personalAgents() {
    seedIfNeeded();
    return readJson(KEYS.personalAgents, []);
  }

  function extractAnswerEssence(text) {
    var value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return '';
    value = value
      .replace(/思考完成/g, '')
      .replace(/本轮内部路由[^。！？!?]*[。！？!?]?/g, '')
      .replace(/结合[^。！？!?]*生成回答[。！？!?]?/g, '')
      .replace(/知识库：[^。！？!?]*[。！？!?]?/g, '')
      .replace(/已命中\s*\d+\s*段/g, '')
      .replace(/引用段落|查看原文/g, '')
      .trim();
    var labelIdx = value.indexOf('简要结论：');
    if (labelIdx >= 0) {
      value = value.slice(labelIdx + '简要结论：'.length).trim();
    }
    var sentence = value.match(/[^。！？!?]+[。！？!?]?/);
    return sentence ? sentence[0].trim().slice(0, 80) : value.slice(0, 80);
  }

  function isNoteSummaryBoilerplate(text) {
    return /思考完成|本轮内部路由|DeepSeek-|已命中\s*\d+\s*段|引用段落|查看原文|知识库：/.test(String(text || ''));
  }

  function displayNoteSummary(note) {
    var text = note && note.summary ? String(note.summary).replace(/\s+/g, ' ').trim() : '';
    if (!text && note && note.content) text = String(note.content).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (isNoteSummaryBoilerplate(text)) {
      text = extractAnswerEssence(text) || text;
    }
    return text.length > 120 ? text.slice(0, 117) + '...' : text;
  }

  function buildNoteSummaryFromRounds(item, rounds) {
    if (!rounds || !rounds.length) return '';
    var topic = String((rounds[0] && rounds[0].user) || (item && item.title) || '')
      .replace(/\s+/g, ' ')
      .replace(/[。！？!?]+$/g, '')
      .slice(0, 28);
    var essence = '';
    for (var i = rounds.length - 1; i >= 0; i--) {
      essence = extractAnswerEssence(rounds[i] && rounds[i].assistant);
      if (essence && essence.length >= 8) break;
    }
    if (!essence) {
      var lastUser = String((rounds[rounds.length - 1] && rounds[rounds.length - 1].user) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      essence = lastUser ? '围绕“' + lastUser + '”整理了可复用的处理要点。' : '已整理对话要点，可供后续引用。';
    }
    var summary = topic ? '关于“' + topic + '”：' + essence : essence;
    return summary.length > 120 ? summary.slice(0, 117) + '...' : summary;
  }

  function saveNote(note) {
    seedIfNeeded();
    var list = notes();
    var next = Object.assign({
      id: 'note_' + Date.now().toString(36),
      title: '未命名笔记',
      content: '',
      source: '用户保存',
      createdAt: nowIso()
    }, note || {}, { updatedAt: nowIso() });
    if (!next.summary && next.content) {
      next.summary = extractAnswerEssence(next.content) || String(next.content).replace(/\s+/g, ' ').trim().slice(0, 120);
    }
    list = [next].concat(list.filter(function (item) { return item.id !== next.id; }));
    writeJson(KEYS.notes, list);
    return next;
  }

  function noteById(id) {
    return notes().find(function (item) { return item.id === id; });
  }

  function deleteNote(id) {
    writeJson(KEYS.notes, notes().filter(function (item) { return item.id !== id; }));
  }

  function savePersonalAgent(draft) {
    seedIfNeeded();
    if (!draft || !draft.sourceSessionId) return { ok: false, reason: 'invalid' };
    var list = personalAgents();
    var existing = list.find(function (item) { return item.sourceSessionId === draft.sourceSessionId; });
    if (existing) return { ok: false, reason: 'duplicate', existing: existing };
    var ctx = context();
    var next = Object.assign({
      id: 'pagt_' + Date.now().toString(36),
      status: 'draft',
      shareMode: 'private',
      sourceType: 'history_session',
      ownerId: ctx.userId,
      createdAt: nowIso(),
      updatedAt: nowIso()
    }, draft || {});
    writeJson(KEYS.personalAgents, [next].concat(list));
    return { ok: true, agent: next };
  }

  function deletePersonalAgent(id) {
    writeJson(KEYS.personalAgents, personalAgents().filter(function (item) { return item.id !== id; }));
  }

  function personalAgentIntro(agent) {
    var text = agent && agent.intro ? String(agent.intro).replace(/\s+/g, ' ').trim() : '';
    if (!text) return '';
    return text.length > 80 ? text.slice(0, 77) + '...' : text;
  }

  function currentOrgRule(prof) {
    return ORG_DIRECTORY[prof.orgId] || ORG_DIRECTORY.org_haineng;
  }

  function secondaryOptionsFor(prof) {
    return (currentOrgRule(prof).secondaryOptions || []).slice();
  }

  function tertiaryOptionsFor(prof, secondaryValue) {
    var match = secondaryOptionsFor(prof).find(function (item) {
      return item.value === secondaryValue;
    });
    return match ? (match.tertiary || []).slice() : [];
  }

  function renderProfileHero(el, prof) {
    if (!el) return;
    el.innerHTML =
      '<div class="aioq-space-profile-hero">' +
        '<div class="aioq-space-profile-avatar">' + escapeHtml((prof.avatarText || prof.userName || '用').slice(0, 1)) + '</div>' +
        '<div class="aioq-space-profile-info">' +
          '<h2>' + escapeHtml(prof.userName || '当前用户') + '</h2>' +
          '<p>' + escapeHtml(prof.orgName || '组织待确认') + ' · ' + escapeHtml(prof.departmentName || '部门待确认') + '</p>' +
          '<span class="aioq-space-profile-badge">' + escapeHtml(prof.roleLabel || '普通用户') + '</span>' +
        '</div>' +
      '</div>';
  }

  function renderNotes(el, list) {
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<p class="aioq-space-empty">暂时还没有个人笔记，可以从历史对话中沉淀。</p>';
      return;
    }
    el.innerHTML = list.map(function (note) {
      return '<div class="aioq-space-note-card">' +
        '<div class="aioq-space-note-body">' +
          '<strong>' + escapeHtml(note.title) + '</strong>' +
          '<p>' + escapeHtml(displayNoteSummary(note)) + '</p>' +
          '<small>' + escapeHtml(note.source || '个人笔记') + (note.createdAt ? ' · ' + fmtDate(note.createdAt) : '') + '</small>' +
        '</div>' +
        '<div class="aioq-space-note-actions">' +
          '<button type="button" class="aioq-space-note-edit" data-edit-note="' + escapeHtml(note.id) + '" title="编辑笔记" aria-label="编辑笔记">编辑</button>' +
          '<button type="button" class="aioq-space-note-del" data-delete-note="' + escapeHtml(note.id) + '" title="删除笔记" aria-label="删除笔记">×</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function opsEditHref(agent) {
    return '../05-agent-detail.html?id=' + encodeURIComponent(agent.id || '');
  }

  function myAgents() {
    if (!global.UserAgentResolver || !UserAgentResolver.resolve) return [];
    var grouped = UserAgentResolver.resolve(context());
    return (grouped.personal || []).concat(grouped.org || []).filter(function (agent) {
      return !agent.isSessionDraft && String(agent.id || '').indexOf('pagt_') !== 0;
    });
  }

  function renderAgentCard(agent, options) {
    options = options || {};
    var statusClass = agent.status === 'listed' ? 'listed' : (agent.status === 'draft' ? 'draft' : 'dev');
    var statusText = options.statusText || (agent.groupKey === 'org' ? '组织授权' : '我创建的');
    var actionsHtml = options.actionsHtml != null ? options.actionsHtml : (
      '<a class="aioq-space-agent-edit" href="' + escapeHtml(opsEditHref(agent)) + '" title="查看智能体详情" aria-label="查看智能体详情">' +
        '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 14.5V16h1.5L15 6.5 13.5 5 4 14.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12.5 6l1.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
      '</a>'
    );
    return '<div class="aioq-space-agent-card">' +
      '<div class="aioq-space-agent-icon">' + escapeHtml((agent.name || '?').slice(0, 1)) + '</div>' +
      '<div class="aioq-space-agent-info">' +
        '<strong>' + escapeHtml(agent.name || '未命名智能体') + '</strong>' +
        '<p>' + escapeHtml(options.intro || agent.intro || '') + '</p>' +
        (options.meta ? '<small>' + escapeHtml(options.meta) + '</small>' : '') +
      '</div>' +
      '<span class="aioq-space-status-badge aioq-space-status-badge--' + statusClass + '">' + escapeHtml(statusText) + '</span>' +
      actionsHtml +
    '</div>';
  }

  function renderSessionAgentDrafts(drafts) {
    var draftItems = (drafts || []).filter(function (item) { return item.status === 'draft'; });
    if (!draftItems.length) return '';
    var html = '<div class="aioq-space-agent-section"><h3 class="aioq-space-agent-section-title">会话沉淀</h3>';
    draftItems.forEach(function (agent) {
      var meta = '来源：' + (agent.sourceAgentName || '历史对话') + (agent.createdAt ? ' · ' + fmtDate(agent.createdAt) : '');
      html += renderAgentCard(agent, {
        statusText: '草稿',
        intro: personalAgentIntro(agent),
        meta: meta,
        actionsHtml:
          '<div class="aioq-space-agent-actions">' +
            '<a class="btn btn-sm" href="index.html?id=' + encodeURIComponent(agent.id) + '">立即使用</a>' +
            '<button type="button" class="btn btn-sm btn--ghost" data-show-personal-agent="' + escapeHtml(agent.id) + '">查看配置</button>' +
            '<button type="button" class="btn btn-sm btn--ghost" data-delete-personal-agent="' + escapeHtml(agent.id) + '">删除</button>' +
          '</div>'
      });
    });
    html += '</div>';
    return html;
  }

  function renderAgents(el, list) {
    if (!el) return;
    var draftHtml = renderSessionAgentDrafts(personalAgents());
    var managedList = list || [];
    if (!draftHtml && !managedList.length) {
      el.innerHTML = '<p class="aioq-space-empty">还没有个人智能体配置，可从历史对话中沉淀。</p>';
      return;
    }
    var html = draftHtml;
    if (managedList.length) {
      html += '<div class="aioq-space-agent-section"><h3 class="aioq-space-agent-section-title">我的智能体</h3>';
      html += managedList.map(function (agent) {
        if (agent.groupKey === 'org') {
          return renderAgentCard(agent, {
            statusText: '组织授权',
            meta: '由组织授权使用，不支持个人编辑',
            actionsHtml: '<a class="btn btn-sm btn--ghost" href="index.html?id=' + encodeURIComponent(agent.id) + '">立即使用</a>'
          });
        }
        return renderAgentCard(agent, {
          statusText: '我创建的',
          meta: '点击编辑将进入运营平台-智能体运营'
        });
      }).join('');
      html += '</div>';
    }
    el.innerHTML = html;
  }

  function renderTechInfo(el, prof, prefs) {
    if (!el) return;
    prefs = prefs || preferences();
    var rule = currentOrgRule(prof);
    var secondaryOptions = secondaryOptionsFor(prof);
    var secondaryValue = prof.secondaryUnit || '';
    var tertiaryOptions = tertiaryOptionsFor(prof, secondaryValue || (secondaryOptions[0] && secondaryOptions[0].value));
    var tertiaryValue = prof.tertiaryUnit || '';
    el.innerHTML =
      '<div class="aioq-settings-form">' +
        '<label class="aioq-settings-upload"><span>头像</span><div class="aioq-settings-avatar-row">' +
          '<div class="aioq-space-profile-avatar aioq-space-profile-avatar--sm" id="profileAvatarPreview">' + escapeHtml((prof.avatarText || prof.userName || '用').slice(0, 1)) + '</div>' +
          '<input type="text" id="profileAvatarInput" maxlength="1" value="' + escapeHtml((prof.avatarText || prof.userName || '用').slice(0, 1)) + '" aria-label="头像文本">' +
        '</div></label>' +
        '<label><span>姓名</span><input type="text" id="profileNameInput" maxlength="32" value="' + escapeHtml(prof.userName || '') + '"></label>' +
        '<label><span>邮箱</span><input type="email" id="profileEmailInput" maxlength="80" value="' + escapeHtml(prof.email || '') + '"></label>' +
        '<label><span>个人简介</span><textarea id="profileBioInput" rows="3" maxlength="120" placeholder="这部分信息可作为模型读取的个人背景。">' + escapeHtml(prof.bio || '') + '</textarea></label>' +
        '<label><span>组织类型</span><select id="profileOrgTypeSelect"><option value="org_haineng">海能组织内</option><option value="external">组织外部用户</option></select></label>' +
        '<label><span>所属组织</span><input type="text" id="profileOrgNameInput" maxlength="40" value="' + escapeHtml(prof.orgName || '') + '"' + (rule.editable ? '' : ' readonly') + '></label>' +
        '<label><span>所属部门</span><input type="text" id="profileDeptInput" maxlength="40" value="' + escapeHtml(prof.departmentName || '') + '"' + (rule.editable ? '' : ' readonly') + '></label>' +
        '<label><span>二级单位</span><select id="profileSecondaryUnit"><option value="">请选择二级单位</option>' +
          secondaryOptions.map(function (item) { return '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>'; }).join('') +
        '</select></label>' +
        '<label><span>三级单位</span><select id="profileTertiaryUnit"><option value="">请选择三级单位</option>' +
          tertiaryOptions.map(function (item) { return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>'; }).join('') +
        '</select></label>' +
        '<label class="aioq-settings-check"><input type="checkbox" id="prefDeepThinking" ' + (prefs.deepThinking ? 'checked' : '') + '> 默认开启深度思考</label>' +
        '<label><span>默认知识库</span><select id="prefKnowledgeBase">' +
          '<option value="kb_enterprise">企业知识库</option>' +
          '<option value="kb_qhse">QHSE 知识库</option>' +
          '<option value="kb_personal">个人笔记</option>' +
        '</select></label>' +
        '<div class="aioq-space-settings-actions">' +
          '<button type="button" class="btn btn-sm btn-primary" id="btnSaveProfile">保存基础信息</button>' +
          '<button type="button" class="aioq-space-link-btn" id="btnContactOps">联系运维</button>' +
          '<button type="button" class="aioq-space-logout-btn" id="btnLogout">退出登录</button>' +
        '</div>' +
      '</div>';

    var kb = document.getElementById('prefKnowledgeBase');
    var deep = document.getElementById('prefDeepThinking');
    var orgType = document.getElementById('profileOrgTypeSelect');
    var orgInput = document.getElementById('profileOrgNameInput');
    var deptInput = document.getElementById('profileDeptInput');
    var secondaryInput = document.getElementById('profileSecondaryUnit');
    var tertiaryInput = document.getElementById('profileTertiaryUnit');
    var avatarInput = document.getElementById('profileAvatarInput');
    var avatarPreview = document.getElementById('profileAvatarPreview');

    if (kb) kb.value = prefs.defaultKnowledgeBase || 'kb_enterprise';
    if (orgType) orgType.value = prof.orgId || 'org_haineng';
    if (secondaryInput) secondaryInput.value = secondaryValue;
    if (tertiaryInput) tertiaryInput.value = tertiaryValue;

    function repopulateOrgSelectors(orgId, keepValue) {
      var draft = Object.assign({}, prof, { orgId: orgId });
      var draftRule = ORG_DIRECTORY[orgId] || ORG_DIRECTORY.org_haineng;
      var secondaryList = secondaryOptionsFor(draft);
      var nextSecondary = keepValue ? secondaryValue : '';
      var nextTertiary = keepValue ? tertiaryValue : '';
      if (secondaryInput) {
        secondaryInput.innerHTML = '<option value="">请选择二级单位</option>' + secondaryList.map(function (item) {
          return '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>';
        }).join('');
        if (nextSecondary) secondaryInput.value = nextSecondary;
      }
      var tertiaryList = tertiaryOptionsFor(draft, (secondaryInput && secondaryInput.value) || '');
      if (tertiaryInput) {
        tertiaryInput.innerHTML = '<option value="">请选择三级单位</option>' + tertiaryList.map(function (item) {
          return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>';
        }).join('');
        if (nextTertiary) tertiaryInput.value = nextTertiary;
      }
      if (deptInput) deptInput.readOnly = !draftRule.editable;
      if (orgInput) orgInput.readOnly = !draftRule.editable;
      if (!draftRule.editable) {
        if (orgInput) orgInput.value = context().orgName || prof.orgName || draftRule.name;
        if (deptInput) deptInput.value = context().departmentName || prof.departmentName || '';
      }
    }

    if (orgType) {
      orgType.addEventListener('change', function () {
        repopulateOrgSelectors(orgType.value, false);
      });
    }
    if (secondaryInput) {
      secondaryInput.addEventListener('change', function () {
        var selectedOrgId = orgType ? orgType.value : (prof.orgId || 'org_haineng');
        var tertiaryList = tertiaryOptionsFor({ orgId: selectedOrgId }, secondaryInput.value);
        if (tertiaryInput) {
          tertiaryInput.innerHTML = '<option value="">请选择三级单位</option>' + tertiaryList.map(function (item) {
            return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>';
          }).join('');
        }
      });
    }
    if (avatarInput && avatarPreview) {
      avatarInput.addEventListener('input', function () {
        avatarPreview.textContent = ((avatarInput.value || '用').slice(0, 1) || '用').toUpperCase();
      });
    }

    var btnContactOps = document.getElementById('btnContactOps');
    if (btnContactOps) {
      btnContactOps.addEventListener('click', function () {
        if (global.UserPortalBridge && UserPortalBridge.openHelp) UserPortalBridge.openHelp();
      });
    }

    var btnSaveProfile = document.getElementById('btnSaveProfile');
    if (btnSaveProfile) {
      btnSaveProfile.addEventListener('click', function () {
        var selectedOrgId = orgType ? orgType.value : 'org_haineng';
        var editable = !!((ORG_DIRECTORY[selectedOrgId] || {}).editable);
        var nextProfile = {
          avatarText: ((avatarInput && avatarInput.value) || prof.avatarText || '用').slice(0, 1).toUpperCase(),
          userName: ((document.getElementById('profileNameInput') || {}).value || '').trim(),
          email: ((document.getElementById('profileEmailInput') || {}).value || '').trim(),
          bio: ((document.getElementById('profileBioInput') || {}).value || '').trim(),
          orgId: selectedOrgId,
          orgName: orgInput ? orgInput.value.trim() : prof.orgName,
          departmentName: deptInput ? deptInput.value.trim() : prof.departmentName,
          secondaryUnit: secondaryInput ? secondaryInput.value : '',
          tertiaryUnit: tertiaryInput ? tertiaryInput.value : ''
        };

        if (!nextProfile.userName) {
          toast('请填写姓名。');
          return;
        }
        if (!nextProfile.email) {
          toast('请填写邮箱。');
          return;
        }
        if (editable && (!nextProfile.secondaryUnit || !nextProfile.tertiaryUnit)) {
          toast('组织外部用户需要补全二级、三级单位。');
          return;
        }
        if (!editable) {
          nextProfile.orgName = context().orgName || nextProfile.orgName;
          nextProfile.departmentName = context().departmentName || nextProfile.departmentName;
          nextProfile.secondaryUnit = '';
          nextProfile.tertiaryUnit = '';
        }

        saveProfile(nextProfile);
        savePreferences({
          deepThinking: !!(deep && deep.checked),
          defaultKnowledgeBase: kb ? kb.value : 'kb_enterprise'
        });
        renderMySpace();
        toast('基础信息已保存。');
      });
    }

    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout && global.UserAuth && typeof UserAuth.logout === 'function') {
      btnLogout.addEventListener('click', function () {
        UserAuth.logout();
      });
    }

    repopulateOrgSelectors(prof.orgId || 'org_haineng', true);
  }

  function renderMySpace() {
    seedIfNeeded();
    var root = document.getElementById('mySpaceRoot');
    if (!root) return;
    var prof = profile();
    renderProfileHero(document.getElementById('myProfileCard'), prof);
    renderNotes(document.getElementById('myNotesList'), notes());
    renderAgents(document.getElementById('myPersonalAgentsList'), myAgents());
    renderTechInfo(document.getElementById('myTechInfo'), prof, preferences());
  }

  function showNewNoteForm() {
    var formEl = document.getElementById('newNoteForm');
    var btn = document.getElementById('btnNewNote');
    if (!formEl) return;
    if (!formEl.classList.contains('hidden')) {
      formEl.classList.add('hidden');
      formEl.innerHTML = '';
      if (btn) btn.textContent = '+ 新建笔记';
      return;
    }
    formEl.classList.remove('hidden');
    if (btn) btn.textContent = '收起';
    formEl.innerHTML =
      '<div class="aioq-space-new-note">' +
        '<input type="text" id="newNoteTitle" placeholder="笔记标题" maxlength="60">' +
        '<textarea id="newNoteContent" placeholder="笔记内容，可从对话中复制粘贴。" rows="3"></textarea>' +
        '<div class="aioq-space-new-note-actions">' +
          '<button type="button" class="btn btn-sm btn--ghost" id="btnCancelNote">取消</button>' +
          '<button type="button" class="btn btn-sm" id="btnSaveNote">保存笔记</button>' +
        '</div>' +
      '</div>';
    var titleInput = document.getElementById('newNoteTitle');
    if (titleInput) setTimeout(function () { titleInput.focus(); }, 30);
    document.getElementById('btnCancelNote').addEventListener('click', function () {
      formEl.classList.add('hidden');
      formEl.innerHTML = '';
      if (btn) btn.textContent = '+ 新建笔记';
    });
    document.getElementById('btnSaveNote').addEventListener('click', function () {
      var title = ((document.getElementById('newNoteTitle') || {}).value || '').trim();
      var content = ((document.getElementById('newNoteContent') || {}).value || '').trim();
      if (!title) {
        toast('请输入笔记标题。');
        return;
      }
      saveNote({ title: title, content: content, source: '手动创建', type: 'manual_note' });
      formEl.classList.add('hidden');
      formEl.innerHTML = '';
      if (btn) btn.textContent = '+ 新建笔记';
      renderNotes(document.getElementById('myNotesList'), notes());
    });
  }

  function openNoteDeleteConfirm(id) {
    pendingDeleteNoteId = id;
    var modal = document.getElementById('noteDeleteConfirmModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeNoteDeleteConfirm() {
    pendingDeleteNoteId = null;
    var modal = document.getElementById('noteDeleteConfirmModal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmNoteDelete() {
    if (!pendingDeleteNoteId) return;
    deleteNote(pendingDeleteNoteId);
    closeNoteDeleteConfirm();
    renderNotes(document.getElementById('myNotesList'), notes());
  }

  function openNoteEdit(noteId) {
    var note = noteById(noteId);
    if (!note) return;
    editingNoteId = noteId;
    var titleInput = document.getElementById('editNoteTitle');
    var contentInput = document.getElementById('editNoteContent');
    var modal = document.getElementById('noteEditModal');
    if (titleInput) titleInput.value = note.title || '';
    if (contentInput) contentInput.value = note.content || note.markdown || '';
    if (modal) modal.classList.remove('hidden');
    setTimeout(function () { if (titleInput) titleInput.focus(); }, 30);
  }

  function closeNoteEdit() {
    editingNoteId = null;
    var modal = document.getElementById('noteEditModal');
    if (modal) modal.classList.add('hidden');
  }

  function saveEditedNote() {
    if (!editingNoteId) return;
    var title = ((document.getElementById('editNoteTitle') || {}).value || '').trim();
    var content = ((document.getElementById('editNoteContent') || {}).value || '').trim();
    var current = noteById(editingNoteId);
    if (!current) return;
    if (!title) {
      toast('请输入笔记标题。');
      return;
    }
    saveNote(Object.assign({}, current, {
      title: title,
      content: content,
      markdown: current.markdown ? content : current.markdown,
      summary: extractAnswerEssence(content) || content.replace(/\s+/g, ' ').slice(0, 120),
      source: current.source || '个人编辑'
    }));
    closeNoteEdit();
    renderNotes(document.getElementById('myNotesList'), notes());
    toast('笔记已更新。');
  }

  function openPersonalAgentDeleteConfirm(id) {
    pendingDeletePersonalAgentId = id;
    var modal = document.getElementById('personalAgentDeleteConfirmModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closePersonalAgentDeleteConfirm() {
    pendingDeletePersonalAgentId = null;
    var modal = document.getElementById('personalAgentDeleteConfirmModal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmPersonalAgentDelete() {
    if (!pendingDeletePersonalAgentId) return;
    deletePersonalAgent(pendingDeletePersonalAgentId);
    closePersonalAgentDeleteConfirm();
    renderAgents(document.getElementById('myPersonalAgentsList'), myAgents());
    if (global.UserPortalBridge && typeof UserPortalBridge.renderSidebarAgents === 'function') {
      UserPortalBridge.renderSidebarAgents();
    }
  }

  function updateProfileFromAuth(session) {
    if (!session) return;
    saveProfile({
      userId: session.userId,
      userName: session.userName,
      avatarText: session.avatarText,
      orgId: session.orgId || 'org_haineng',
      orgName: session.orgName,
      departmentName: session.departmentName,
      roleLabel: session.roleLabel,
      email: session.email
    });
    renderMySpace();
  }

  function showPersonalAgentConfig(agentId) {
    var current = personalAgents().find(function (item) { return item.id === agentId; });
    if (!current) return;
    var lines = [
      '名称：' + (current.name || '未命名配置'),
      current.intro ? '简介：' + current.intro : '',
      current.systemPrompt ? '系统提示语：' + current.systemPrompt : '',
      current.sourceAgentName ? '来源智能体：' + current.sourceAgentName : ''
    ].filter(Boolean);
    toast(lines.join(' / ').slice(0, 120));
  }

  function bindMySpaceEvents() {
    var btnNewNote = document.getElementById('btnNewNote');
    if (btnNewNote) btnNewNote.addEventListener('click', showNewNoteForm);

    var btnCloseNoteDelete = document.getElementById('btnCloseNoteDelete');
    var btnCancelNoteDelete = document.getElementById('btnCancelNoteDelete');
    var btnConfirmNoteDelete = document.getElementById('btnConfirmNoteDelete');
    var noteDeleteModal = document.getElementById('noteDeleteConfirmModal');
    if (btnCloseNoteDelete) btnCloseNoteDelete.addEventListener('click', closeNoteDeleteConfirm);
    if (btnCancelNoteDelete) btnCancelNoteDelete.addEventListener('click', closeNoteDeleteConfirm);
    if (btnConfirmNoteDelete) btnConfirmNoteDelete.addEventListener('click', confirmNoteDelete);
    if (noteDeleteModal) {
      noteDeleteModal.addEventListener('click', function (event) {
        if (event.target.id === 'noteDeleteConfirmModal') closeNoteDeleteConfirm();
      });
    }

    var btnCloseNoteEdit = document.getElementById('btnCloseNoteEdit');
    var btnCancelNoteEdit = document.getElementById('btnCancelNoteEdit');
    var btnSaveNoteEdit = document.getElementById('btnSaveNoteEdit');
    var noteEditModal = document.getElementById('noteEditModal');
    if (btnCloseNoteEdit) btnCloseNoteEdit.addEventListener('click', closeNoteEdit);
    if (btnCancelNoteEdit) btnCancelNoteEdit.addEventListener('click', closeNoteEdit);
    if (btnSaveNoteEdit) btnSaveNoteEdit.addEventListener('click', saveEditedNote);
    if (noteEditModal) {
      noteEditModal.addEventListener('click', function (event) {
        if (event.target.id === 'noteEditModal') closeNoteEdit();
      });
    }

    var btnCloseAgentDelete = document.getElementById('btnClosePersonalAgentDelete');
    var btnCancelAgentDelete = document.getElementById('btnCancelPersonalAgentDelete');
    var btnConfirmAgentDelete = document.getElementById('btnConfirmPersonalAgentDelete');
    var agentDeleteModal = document.getElementById('personalAgentDeleteConfirmModal');
    if (btnCloseAgentDelete) btnCloseAgentDelete.addEventListener('click', closePersonalAgentDeleteConfirm);
    if (btnCancelAgentDelete) btnCancelAgentDelete.addEventListener('click', closePersonalAgentDeleteConfirm);
    if (btnConfirmAgentDelete) btnConfirmAgentDelete.addEventListener('click', confirmPersonalAgentDelete);
    if (agentDeleteModal) {
      agentDeleteModal.addEventListener('click', function (event) {
        if (event.target.id === 'personalAgentDeleteConfirmModal') closePersonalAgentDeleteConfirm();
      });
    }

    var helpModal = document.getElementById('helpModal');
    var btnCloseHelp = document.getElementById('btnCloseHelp');
    var btnDismissHelp = document.getElementById('btnDismissHelp');
    function closeHelpModal() {
      if (helpModal) helpModal.classList.add('hidden');
    }
    if (btnCloseHelp) btnCloseHelp.addEventListener('click', closeHelpModal);
    if (btnDismissHelp) btnDismissHelp.addEventListener('click', closeHelpModal);
    if (helpModal) {
      helpModal.addEventListener('click', function (event) {
        if (event.target.id === 'helpModal') closeHelpModal();
      });
    }

    document.addEventListener('click', function (event) {
      var noteDel = event.target.closest('[data-delete-note]');
      if (noteDel) {
        event.preventDefault();
        openNoteDeleteConfirm(noteDel.getAttribute('data-delete-note'));
        return;
      }
      var noteEdit = event.target.closest('[data-edit-note]');
      if (noteEdit) {
        event.preventDefault();
        openNoteEdit(noteEdit.getAttribute('data-edit-note'));
        return;
      }
      var agentDel = event.target.closest('[data-delete-personal-agent]');
      if (agentDel) {
        event.preventDefault();
        openPersonalAgentDeleteConfirm(agentDel.getAttribute('data-delete-personal-agent'));
        return;
      }
      var showAgent = event.target.closest('[data-show-personal-agent]');
      if (showAgent) {
        event.preventDefault();
        showPersonalAgentConfig(showAgent.getAttribute('data-show-personal-agent'));
        return;
      }
      if (event.target.closest('#btnHelp')) {
        if (global.UserPortalBridge && typeof UserPortalBridge.openHelp === 'function') {
          UserPortalBridge.openHelp();
        }
      }
    });

    if (global.UserMessageCenter && typeof UserMessageCenter.mount === 'function') {
      UserMessageCenter.mount();
    }
  }

  function init() {
    renderMySpace();
    bindMySpaceEvents();
  }

  global.UserPersonalSpace = {
    KEYS: KEYS,
    seedIfNeeded: seedIfNeeded,
    getNotes: notes,
    saveNote: saveNote,
    deleteNote: deleteNote,
    getPersonalAgents: personalAgents,
    savePersonalAgent: savePersonalAgent,
    deletePersonalAgent: deletePersonalAgent,
    personalAgentIntro: personalAgentIntro,
    getProfile: profile,
    saveProfile: saveProfile,
    getPreferences: preferences,
    savePreferences: savePreferences,
    renderMySpace: renderMySpace,
    displayNoteSummary: displayNoteSummary,
    buildNoteSummaryFromRounds: buildNoteSummaryFromRounds,
    extractAnswerEssence: extractAnswerEssence,
    updateProfileFromAuth: updateProfileFromAuth,
    currentOrgRule: currentOrgRule,
    secondaryOptionsFor: secondaryOptionsFor,
    tertiaryOptionsFor: tertiaryOptionsFor
  };

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})(window);
