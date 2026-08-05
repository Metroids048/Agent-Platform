/** 运营列表页内嵌：第三方接入弹窗 */
(function (global) {
  function mount(root) {
    if (!root || root.dataset.mounted) return;
    root.innerHTML =
      '<div class="ops-modal-container">' +
      '<div class="ops-steps-bar"><span class="st active" data-tp-st="1">1</span><span style="font-size:11px;">填写接入信息</span>' +
      '<span class="line" data-tp-ln="1"></span><span class="st" data-tp-st="2">2</span><span style="font-size:11px;">生成凭证</span>' +
      '<span class="line" data-tp-ln="2"></span><span class="st" data-tp-st="3">3</span><span style="font-size:11px;">完成</span></div>' +
      '<div class="ops-modal-head"><h2 data-tp-title>第三方智能体接入</h2><button type="button" class="ops-modal-close" data-tp-close title="关闭">✕</button></div>' +
      '<div class="ops-modal-body">' +
      '<div class="ops-state-view active" data-tp-state="form">' +
      '<p class="help-text" style="margin-bottom:16px;">第三方智能体接入后，运营平台将统一管理其审核、上架、监控和下架流程。平台将自动生成 API Key 作为第三方接入凭证，请在线下安全分发给第三方。</p>' +
      '<div class="form-section">基础信息</div>' +
      '<div class="form-row"><div class="form-label required">智能体名称</div><div class="form-control">' +
      '<input class="input" data-tp-name placeholder="请输入智能体名称" maxlength="50" style="width:100%;box-sizing:border-box;">' +
      '<div class="help-text"><span data-tp-name-count>0</span>/50 字符</div></div></div>' +
      '<div class="form-row"><div class="form-label required">智能体描述</div><div class="form-control">' +
      '<textarea class="textarea" data-tp-desc placeholder="请描述第三方智能体的功能和用途" maxlength="500" style="width:100%;box-sizing:border-box;min-height:60px;"></textarea>' +
      '<div class="help-text"><span data-tp-desc-count>0</span>/500 字符</div></div></div>' +
      '<div class="form-section" style="margin-top:16px;">智能体类型</div>' +
      '<div class="type-grid" data-tp-types>' + typeCards() + '</div>' +
      '<div class="form-section" style="margin-top:16px;">接入配置</div>' +
      '<div class="form-row"><div class="form-label required">服务地址</div><div class="form-control">' +
      '<input class="input" data-tp-endpoint placeholder="https://api.example.com/v1/chat" style="width:100%;box-sizing:border-box;">' +
      '<div class="help-text">第三方智能体的 API 访问地址（需支持 HTTPS）</div></div></div>' +
      '<div class="form-row"><div class="form-label required">鉴权方式</div><div class="form-control">' +
      '<select class="select" data-tp-auth style="width:100%;box-sizing:border-box;">' +
      '<option value="api_key">API Key</option><option value="bearer_token">Bearer Token</option><option value="none">无鉴权（仅内网）</option></select>' +
      '<div class="help-text">平台将在调用第三方智能体时携带鉴权信息</div></div></div>' +
      '<div class="form-row" data-tp-upstream-row><div class="form-label required" data-tp-upstream-label>API Key</div><div class="form-control">' +
      '<input class="input" data-tp-upstream type="password" placeholder="请输入第三方提供的 API Key" autocomplete="off" style="width:100%;box-sizing:border-box;">' +
      '<div class="help-text" data-tp-upstream-help>平台调用第三方服务地址时将携带此密钥，仅 URL 无法完成鉴权</div></div></div>' +
      '<div class="form-row"><div class="form-label">示例提示</div><div class="form-control">' +
      '<textarea class="textarea" data-tp-examples placeholder="列出用户可以对该智能体说的示例问题，用换行分隔" style="width:100%;box-sizing:border-box;min-height:50px;"></textarea>' +
      '<div class="help-text">帮助用户在智能体广场了解适用场景，每行一个示例</div></div></div>' +
      '<div class="form-section" style="margin-top:16px;">可见范围</div>' + scopes() +
      '<div class="help-text" style="margin-top:8px;">个人范围免审核直接上架；组织/全公司须运营审核通过后上架。</div></div>' +
      '<div class="ops-state-view" data-tp-state="generating"><div style="text-align:center;padding:32px 0;">' +
      '<div class="spinner" style="margin:0 auto 16px;width:40px;height:40px;border-width:3px;"></div>' +
      '<div style="font-size:16px;font-weight:500;">正在生成接入凭证…</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:8px;">请稍候，不要关闭</div></div></div>' +
      '<div class="ops-state-view" data-tp-state="credential"><div style="padding:8px 0;">' +
      '<div style="font-size:15px;font-weight:500;margin-bottom:4px;">接入凭证已生成</div>' +
      '<div class="help-text" style="margin-bottom:16px;">请立即保存以下 API Key，关闭后将无法再次查看。</div>' +
      '<div class="credential-box"><div class="cred-label">api_key</div><div class="cred-value" data-tp-cred-key>—</div>' +
      '<button type="button" class="btn-copy" data-tp-copy>📋 复制</button></div>' +
      '<div class="cred-warning">⚠️ API Key 仅展示一次，请立即复制并安全保存</div></div></div>' +
      '<div class="ops-state-view" data-tp-state="complete"><div style="text-align:center;padding:40px 0;">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#fff;font-size:32px;">✓</div>' +
      '<div style="font-size:18px;font-weight:500;">第三方智能体接入成功</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:12px;" data-tp-complete-sub>接入信息已保存，可在运营列表中查看和管理。</div>' +
      '<div style="text-align:left;margin-top:20px;padding:16px;background:#f8f9fa;border-radius:8px;">' +
      '<div class="summary-kv"><span class="k">名称</span><span data-tp-sum-name>—</span></div>' +
      '<div class="summary-kv"><span class="k">智能体 ID</span><span data-tp-sum-id>—</span></div>' +
      '<div class="summary-kv"><span class="k">可见范围</span><span data-tp-sum-scope>—</span></div>' +
      '<div class="summary-kv"><span class="k">下一步</span><span data-tp-sum-next>—</span></div></div></div></div></div>' +
      '<div class="ops-modal-foot" data-tp-foot="form"><button type="button" class="btn" data-tp-cancel>取消</button>' +
      '<button type="button" class="btn btn-primary btn-large" data-tp-submit>生成凭证</button></div>' +
      '<div class="ops-modal-foot" data-tp-foot="generating" style="display:none;"><span style="font-size:13px;color:var(--text-muted);">请稍候...</span></div>' +
      '<div class="ops-modal-foot" data-tp-foot="credential" style="display:none;"><button type="button" class="btn" data-tp-saved>已保存，继续 →</button></div>' +
      '<div class="ops-modal-foot" data-tp-foot="complete" style="display:none;"><button type="button" class="btn" data-tp-back-list>返回列表</button>' +
      '<a href="#" class="btn btn-primary" data-tp-go-detail>查看智能体详情 →</a></div></div>';
    root.dataset.mounted = '1';
    wire(root);
  }

  function typeCards() {
    var items = [
      ['qa', '💬', '问答型', '一问一答，基于知识库检索和模型推理回答用户问题'],
      ['task', '📋', '任务型', '执行具体任务如合同审查、文件分析，输出结构化结果'],
      ['flow', '🔄', '流程型', '多步骤审批和业务流程自动化，含表单和状态流转'],
      ['multi', '🔗', '多智能体协作型', '多个智能体协同工作，分工完成复杂任务并汇总结果']
    ];
    return items.map(function (x) {
      return '<div class="type-card" data-type="' + x[0] + '"><div class="ti">' + x[1] + '</div><div><div class="tn">' + x[2] +
        '</div><div class="td">' + x[3] + '</div></div></div>';
    }).join('');
  }

  function scopes() {
    return '<div class="scope-options" data-tp-scopes>' +
      '<label class="scope-option active" data-scope="private"><input type="radio" name="tpScope" value="private" checked>' +
      '<span class="so-icon">🔒</span><div><div class="so-title">仅本人</div><div class="so-desc">仅创建者可见和使用，无需审核</div></div></label>' +
      '<label class="scope-option" data-scope="specific"><input type="radio" name="tpScope" value="specific">' +
      '<span class="so-icon">👥</span><div><div class="so-title">指定人员</div><div class="so-desc">选择指定的用户或部门可见可用</div></div>' +
      '<span class="so-action" data-tp-pick>选择部门/用户 →</span></label>' +
      '<label class="scope-option" data-scope="public"><input type="radio" name="tpScope" value="public">' +
      '<span class="so-icon">🏢</span><div><div class="so-title">全公司</div><div class="so-desc">全公司可见可用，需经平台审核</div></div></label></div>';
  }

  function wire(root) {
    var state = { selectedType: null, selectedScope: 'private', pendingId: null };

    function q(sel) { return root.querySelector(sel); }
    function qa(sel) { return root.querySelectorAll(sel); }

    function toggleUpstream() {
      var auth = q('[data-tp-auth]').value;
      var row = q('[data-tp-upstream-row]');
      var label = q('[data-tp-upstream-label]');
      var help = q('[data-tp-upstream-help]');
      var input = q('[data-tp-upstream]');
      if (auth === 'none') { row.style.display = 'none'; input.value = ''; return; }
      row.style.display = 'flex';
      if (auth === 'bearer_token') {
        label.textContent = 'Bearer Token';
        input.placeholder = '请输入第三方提供的 Bearer Token';
        help.textContent = '平台调用第三方服务时将携带此 Token';
      } else {
        label.textContent = 'API Key';
        input.placeholder = '请输入第三方提供的 API Key';
        help.textContent = '平台调用第三方服务地址时将携带此密钥，仅 URL 无法完成鉴权';
      }
    }

    q('[data-tp-auth]').onchange = toggleUpstream;
    toggleUpstream();

    q('[data-tp-name]').addEventListener('input', function () { q('[data-tp-name-count]').textContent = this.value.length; });
    q('[data-tp-desc]').addEventListener('input', function () { q('[data-tp-desc-count]').textContent = this.value.length; });

    qa('[data-tp-types] .type-card').forEach(function (card) {
      card.onclick = function () {
        qa('[data-tp-types] .type-card').forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        state.selectedType = card.dataset.type;
      };
    });
    qa('[data-tp-scopes] .scope-option').forEach(function (opt) {
      opt.onclick = function (e) {
        if (e.target.closest('[data-tp-pick]')) {
          e.stopPropagation();
          if (global.Proto) Proto.toast('选择部门/用户（占位）');
          return;
        }
        qa('[data-tp-scopes] .scope-option').forEach(function (c) { c.classList.remove('active'); });
        opt.classList.add('active');
        var inp = opt.querySelector('input');
        if (inp) inp.checked = true;
        state.selectedScope = opt.dataset.scope;
      };
    });

    function ensureId() {
      if (!state.pendingId) state.pendingId = 'agt_third_' + Date.now().toString(36).slice(-6);
      return state.pendingId;
    }

    function show(st) {
      qa('[data-tp-state]').forEach(function (el) { el.classList.toggle('active', el.dataset.tpState === st); });
      ['form', 'generating', 'credential', 'complete'].forEach(function (f) {
        var foot = q('[data-tp-foot="' + f + '"]');
        if (foot) foot.style.display = st === f ? 'flex' : 'none';
      });
      var titles = { form: '第三方智能体接入', generating: '正在生成凭证', credential: '接入凭证', complete: '接入完成' };
      q('[data-tp-title]').textContent = titles[st] || titles.form;
      qa('[data-tp-st]').forEach(function (el) {
        el.className = 'st';
        var n = el.dataset.tpSt;
        if (st === 'form' && n === '1') el.classList.add('active');
        if (st !== 'form' && n === '1') el.classList.add('done');
        if (st === 'generating' && n === '2') el.classList.add('active');
        if ((st === 'credential' || st === 'complete') && n === '2') el.classList.add('done');
        if (st === 'complete' && n === '3') el.classList.add('done');
      });
      qa('[data-tp-ln]').forEach(function (ln) {
        ln.className = 'line';
        if (st !== 'form') ln.classList.add('done');
      });
    }

    function close(refresh) {
      if (global.OpsListModals) OpsListModals.close(refresh);
    }

    q('[data-tp-close]').onclick = function () { close(false); };
    q('[data-tp-cancel]').onclick = function () { close(false); };
    q('[data-tp-back-list]').onclick = function () { close(true); };
    q('[data-tp-saved]').onclick = function () { show('complete'); };

    q('[data-tp-copy]').onclick = function () {
      var text = q('[data-tp-cred-key]').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { if (global.Proto) Proto.toast('已复制到剪贴板'); });
      }
    };

    q('[data-tp-submit]').onclick = function () {
      var name = q('[data-tp-name]').value.trim();
      var desc = q('[data-tp-desc]').value.trim();
      var endpoint = q('[data-tp-endpoint]').value.trim();
      var authType = q('[data-tp-auth]').value;
      var upstream = q('[data-tp-upstream]').value.trim();
      if (!name) { alert('请输入智能体名称'); return; }
      if (!desc) { alert('请输入智能体描述'); return; }
      if (!state.selectedType) { alert('请选择智能体类型'); return; }
      if (!endpoint) { alert('请输入服务地址'); return; }
      if (authType !== 'none' && !upstream) {
        alert(authType === 'bearer_token' ? '请输入 Bearer Token' : '请输入 API Key');
        return;
      }
      show('generating');
      setTimeout(function () {
        var id = ensureId();
        var result = {};
        if (global.Proto) {
          result = Proto.onThirdPartyRegistered(id, name, state.selectedType, state.selectedScope, desc, endpoint, authType, upstream);
        }
        var apiKey = result.apiKey || ('ak_' + Date.now().toString(36).toUpperCase());
        q('[data-tp-cred-key]').textContent = apiKey;
        var scopeLabels = { private: '仅本人（免审核，直接上架）', specific: '指定人员（需审核）', public: '全公司（需审核）' };
        var scopeSteps = { private: '可直接使用，无需审核', specific: '等待运营审核通过后上架', public: '等待运营审核通过后上架' };
        q('[data-tp-sum-name]').textContent = name;
        q('[data-tp-sum-id]').textContent = id;
        q('[data-tp-sum-scope]').textContent = scopeLabels[state.selectedScope] || state.selectedScope;
        q('[data-tp-sum-next]').textContent = scopeSteps[state.selectedScope] || '—';
        q('[data-tp-complete-sub]').textContent = state.selectedScope === 'private'
          ? '私有智能体免审核，已直接上架，可在运营列表中查看。'
          : '已提交审核，审核通过后将自动上架。';
        q('[data-tp-go-detail]').href = '05-agent-detail.html?id=' + encodeURIComponent(id) +
          '&name=' + encodeURIComponent(name) + '&type=' + encodeURIComponent(state.selectedType);
        show('credential');
      }, 1200);
    };

    root._thirdPartyModal = {
      open: function () {
        state.pendingId = null;
        state.selectedType = null;
        state.selectedScope = 'private';
        q('[data-tp-name]').value = '';
        q('[data-tp-desc]').value = '';
        q('[data-tp-endpoint]').value = '';
        q('[data-tp-upstream]').value = '';
        q('[data-tp-name-count]').textContent = '0';
        q('[data-tp-desc-count]').textContent = '0';
        qa('[data-tp-types] .type-card').forEach(function (c) { c.classList.remove('active'); });
        qa('[data-tp-scopes] .scope-option').forEach(function (c, i) {
          c.classList.toggle('active', i === 0);
          var inp = c.querySelector('input');
          if (inp) inp.checked = i === 0;
        });
        q('[data-tp-auth]').value = 'api_key';
        toggleUpstream();
        show('form');
      }
    };
  }

  global.OpsModalThirdParty = {
    mount: mount,
    open: function (root) {
      mount(root);
      if (root._thirdPartyModal) root._thirdPartyModal.open();
    }
  };
})(window);
