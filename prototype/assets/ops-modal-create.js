/** 运营列表页内嵌：新建智能体弹窗 */
(function (global) {
  function mount(root) {
    if (!root || root.dataset.mounted) return;
    root.innerHTML =
      '<div class="ops-modal-container" id="caModal">' +
      '<div class="ops-steps-bar"><span class="st active" data-ca-st="1">1</span><span style="font-size:11px;">填写信息</span>' +
      '<span class="line" data-ca-ln="1"></span><span class="st" data-ca-st="2">2</span><span style="font-size:11px;">创建中</span>' +
      '<span class="line" data-ca-ln="2"></span><span class="st" data-ca-st="3">3</span><span style="font-size:11px;">完成</span></div>' +
      '<div class="ops-modal-head"><h2 data-ca-title>新建智能体</h2><button type="button" class="ops-modal-close" data-ca-close title="关闭">✕</button></div>' +
      '<div class="ops-modal-body">' +
      '<div class="ops-state-view active" data-ca-state="form">' +
      '<div class="form-section">基础信息</div>' +
      '<div class="form-row"><div class="form-label required">智能体图标</div><div class="form-control">' +
      '<div class="icon-picker-row">' +
      '<div class="icon-uploader icon-uploader--empty" data-ca-icon-preview title="点击上传图标">📤</div>' +
      '<button type="button" class="icon-library-btn" data-ca-icon-library title="图标库">' +
      '<svg class="icon-library-btn-svg" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="#8b5cf6" d="M12 3.2 13.55 8.1 18.5 9.6 13.55 11.1 12 16 10.45 11.1 5.5 9.6 10.45 8.1Z"/>' +
      '<circle cx="17.2" cy="5.4" r="1.15" fill="#a78bfa"/><circle cx="19.1" cy="8.2" r="0.75" fill="#c4b5fd"/></svg></button>' +
      '<input type="file" data-ca-icon-file accept="image/png,image/jpeg" hidden></div>' +
      '<div class="help-text">上传 PNG/JPG，或从图标库选择预设图标</div></div></div>' +
      '<div class="form-row"><div class="form-label required">智能体名称</div><div class="form-control">' +
      '<input class="input" data-ca-name placeholder="请输入智能体名称" maxlength="50"><div class="help-text"><span data-ca-name-count>0</span>/50 字符</div></div></div>' +
      '<div class="form-row"><div class="form-label required">智能体描述</div><div class="form-control">' +
      '<textarea class="textarea" data-ca-desc placeholder="请描述智能体的功能和用途" maxlength="500"></textarea>' +
      '<div class="help-text"><span data-ca-desc-count>0</span>/500 字符</div></div></div>' +
      '<div class="form-section" style="margin-top:20px;">智能体类型</div>' +
      '<div class="type-grid" data-ca-types>' +
      typeCard('qa', '💬', '问答型', '一问一答，基于知识库检索和模型推理回答用户问题') +
      typeCard('task', '📋', '任务型', '执行具体任务如合同审查、文件分析，输出结构化结果') +
      typeCard('flow', '🔄', '流程型', '多步骤审批和业务流程自动化，含表单和状态流转') +
      typeCard('multi', '🔗', '多智能体协作型', '多个智能体协同工作，分工完成复杂任务并汇总结果') +
      '</div>' +
      '<div class="form-section" style="margin-top:20px;">访问权限范围</div>' +
      scopeBlock('ca') +
      '<div class="scope-summary" data-ca-scope-summary>未选择部门/用户</div>' +
      '<div class="help-text" style="margin-top:8px;">发布时可重新调整访问范围。</div></div>' +
      '<div class="ops-state-view" data-ca-state="syncing"><div style="text-align:center;padding:32px 0;">' +
      '<div class="spinner" style="margin:0 auto 16px;width:40px;height:40px;border-width:3px;"></div>' +
      '<div style="font-size:16px;font-weight:500;" data-ca-sync-main>正在创建智能体…</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:8px;" data-ca-sync-sub>请稍候，不要关闭</div></div></div>' +
      '<div class="ops-state-view" data-ca-state="success"><div style="text-align:center;padding:40px 0;">' +
      '<div class="check-circle" style="margin:0 auto 16px;width:64px;height:64px;font-size:32px;">✓</div>' +
      '<div style="font-size:18px;font-weight:500;">智能体创建成功</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:12px;line-height:1.6;">请在开发平台完成提示词与模型配置后，前往运营平台发布上线。<br>您也可以先返回列表查看智能体基本信息。</div></div></div>' +
      '<div class="ops-state-view" data-ca-state="failure"><div style="text-align:center;padding:40px 0;">' +
      '<div style="font-size:48px;margin-bottom:12px;">⚠️</div><div style="font-size:16px;font-weight:500;">创建失败</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin:6px 0 24px;" data-ca-fail-detail>创建未完成，请稍后重试</div>' +
      '<button type="button" class="btn btn-primary" data-ca-retry>🔄 重试</button>' +
      '<button type="button" class="btn" data-ca-back-form style="margin-left:8px;">← 返回修改</button></div></div></div>' +
      '<div class="ops-modal-foot" data-ca-foot="form"><button type="button" class="btn" data-ca-cancel>取消</button>' +
      '<button type="button" class="btn btn-primary btn-large" data-ca-submit>创建</button></div>' +
      '<div class="ops-modal-foot" data-ca-foot="syncing" style="display:none;"><span style="font-size:13px;color:var(--text-muted);">请稍候...</span></div>' +
      '<div class="ops-modal-foot" data-ca-foot="success" style="display:none;"><button type="button" class="btn" data-ca-back-list>返回列表</button>' +
      '<a href="06-dev-editor.html" class="btn btn-primary" data-ca-go-config>进入开发平台配置 →</a></div>' +
      '<div class="ops-modal-foot" data-ca-foot="failure" style="display:none;"><button type="button" class="btn" data-ca-fail-back>返回列表</button></div></div>';
    root.dataset.mounted = '1';
    wire(root);
  }

  function typeCard(type, icon, title, desc) {
    return '<div class="type-card" data-type="' + type + '"><div class="ti">' + icon + '</div><div><div class="tn">' + title +
      '</div><div class="td">' + desc + '</div></div></div>';
  }

  function scopeBlock(prefix) {
    return '<div class="scope-options" data-' + prefix + '-scopes>' +
      '<label class="scope-option active" data-scope="private"><input type="radio" name="' + prefix + 'Scope" value="private" checked>' +
      '<span class="so-icon">🔒</span><div><div class="so-title">仅本人</div><div class="so-desc">仅创建者可见和使用，无需审核</div></div></label>' +
      '<label class="scope-option" data-scope="specific"><input type="radio" name="' + prefix + 'Scope" value="specific">' +
      '<span class="so-icon">👥</span><div><div class="so-title">部门共享</div><div class="so-desc">选择指定的用户或部门可见可用</div></div>' +
      '<span class="so-action" data-ca-pick-dept>选择部门/用户 →</span></label>' +
      '<label class="scope-option" data-scope="public"><input type="radio" name="' + prefix + 'Scope" value="public">' +
      '<span class="so-icon">🏢</span><div><div class="so-title">全公司</div><div class="so-desc">全公司可见可用，发布前需经平台审核</div></div></label></div>';
  }

  function wire(root) {
    var state = { selectedType: null, selectedScope: 'private', permissionTargets: [], pendingId: null, alwaysFail: false };

    function q(sel) { return root.querySelector(sel); }
    function qa(sel) { return root.querySelectorAll(sel); }
    function renderScopeSummary() {
      var el = q('[data-ca-scope-summary]');
      if (!el) return;
      if (state.selectedScope !== 'specific' || !global.OrgAccessPicker) {
        el.textContent = '未选择部门/用户';
        return;
      }
      el.textContent = OrgAccessPicker.summarize(state.permissionTargets);
    }

    if (global.AgentIconLibrary) {
      AgentIconLibrary.wireRow({
        preview: q('[data-ca-icon-preview]'),
        libraryBtn: q('[data-ca-icon-library]'),
        fileInput: q('[data-ca-icon-file]')
      });
    }
    q('[data-ca-name]').addEventListener('input', function () {
      q('[data-ca-name-count]').textContent = this.value.length;
    });
    q('[data-ca-desc]').addEventListener('input', function () {
      q('[data-ca-desc-count]').textContent = this.value.length;
    });
    qa('[data-ca-types] .type-card').forEach(function (card) {
      card.onclick = function () {
        qa('[data-ca-types] .type-card').forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        state.selectedType = card.dataset.type;
      };
    });
    qa('[data-ca-scopes] .scope-option').forEach(function (opt) {
      opt.onclick = function (e) {
        if (e.target.closest('[data-ca-pick-dept]')) {
          e.stopPropagation();
          qa('[data-ca-scopes] .scope-option').forEach(function (c) { c.classList.remove('active'); });
          opt.classList.add('active');
          var specificInput = opt.querySelector('input');
          if (specificInput) specificInput.checked = true;
          state.selectedScope = 'specific';
          if (global.OrgAccessPicker) {
            OrgAccessPicker.open({
              title: '选择共享部门/用户',
              selected: state.permissionTargets,
              onConfirm: function (payload) {
                state.permissionTargets = Array.isArray(payload) ? payload : (payload.targets || []);
                renderScopeSummary();
              }
            });
          }
          return;
        }
        qa('[data-ca-scopes] .scope-option').forEach(function (c) { c.classList.remove('active'); });
        opt.classList.add('active');
        var inp = opt.querySelector('input');
        if (inp) inp.checked = true;
        state.selectedScope = opt.dataset.scope;
        if (state.selectedScope !== 'specific') state.permissionTargets = [];
        renderScopeSummary();
      };
    });

    function ensureId() {
      if (!state.pendingId) state.pendingId = 'agt_' + Date.now().toString(36).slice(-8);
      return state.pendingId;
    }

    function show(st) {
      qa('[data-ca-state]').forEach(function (el) { el.classList.toggle('active', el.dataset.caState === st); });
      ['form', 'syncing', 'success', 'failure'].forEach(function (f) {
        var foot = q('[data-ca-foot="' + f + '"]');
        if (foot) foot.style.display = st === f ? 'flex' : 'none';
      });
      var titles = { form: '新建智能体', syncing: '新建智能体', success: '创建完成', failure: '创建失败' };
      q('[data-ca-title]').textContent = titles[st] || '新建智能体';
      qa('[data-ca-st]').forEach(function (el) {
        el.className = 'st';
        var n = el.dataset.caSt;
        if (st === 'form' && n === '1') el.classList.add('active');
        if (st === 'syncing' && n === '1') el.classList.add('done');
        if (st === 'syncing' && n === '2') el.classList.add('active');
        if (st === 'success' && n !== '2') el.classList.add('done');
        if (st === 'success' && n === '3') el.classList.add('done');
        if (st === 'failure' && n === '1') el.classList.add('done');
        if (st === 'failure' && n === '2') el.classList.add('fail');
      });
      qa('[data-ca-ln]').forEach(function (ln) {
        ln.className = 'line';
        if (st === 'syncing' || st === 'success' || st === 'failure') ln.classList.add('done');
        if (st === 'success' && ln.dataset.caLn === '2') ln.classList.add('done');
      });
    }

    function configUrl() {
      var name = q('[data-ca-name]').value.trim() || '新智能体';
      return '06-dev-editor.html?id=' + encodeURIComponent(ensureId()) +
        '&name=' + encodeURIComponent(name) + '&type=' + encodeURIComponent(state.selectedType || 'qa') + '&new=1';
    }

    function runPipeline() {
      ensureId();
      show('syncing');
      var msgs = [{ main: '正在保存基本信息…', sub: '请稍候' }, { main: '正在完成创建…', sub: '即将进入配置页' }];
      var phase = 0;
      function next() {
        if (phase >= msgs.length) {
          var name = q('[data-ca-name]').value.trim();
          var agentId = ensureId();
          var finish = function () {
            if (global.Proto) {
              var iconMeta = global.AgentIconLibrary
                ? AgentIconLibrary.getIcon(q('[data-ca-icon-preview]'))
                : { kind: '', value: '' };
              Proto.onAgentCreated(agentId, name, state.selectedType, state.selectedScope, q('[data-ca-desc]').value.trim(), 'platform', state.permissionTargets, iconMeta);
            }
            q('[data-ca-go-config]').href = configUrl();
            show('success');
          };
          if (global.PlatformApi) {
            PlatformApi.syncCreateAgent({
              agent_id: agentId,
              name: name,
              type: state.selectedType,
              scope: state.selectedScope,
              share_mode: state.selectedScope,
              permission_targets: state.permissionTargets,
              status: 'dev'
            }).then(finish).catch(finish);
            return;
          }
          finish();
          return;
        }
        q('[data-ca-sync-main]').textContent = msgs[phase].main;
        q('[data-ca-sync-sub]').textContent = msgs[phase].sub;
        setTimeout(function () {
          if (phase === 1 && state.alwaysFail) {
            q('[data-ca-fail-detail]').textContent = '创建未完成，请检查网络后重试';
            show('failure');
            return;
          }
          phase++;
          next();
        }, phase === 0 ? 700 : 900);
      }
      next();
    }

    q('[data-ca-submit]').onclick = function () {
      if (!q('[data-ca-name]').value.trim()) { alert('请输入智能体名称'); return; }
      if (!q('[data-ca-desc]').value.trim()) { alert('请输入智能体描述'); return; }
      if (!state.selectedType) { alert('请选择智能体类型'); return; }
      if (global.AgentIconLibrary && !AgentIconLibrary.hasIcon(q('[data-ca-icon-preview]'))) {
        alert('请上传图标或从图标库选择');
        return;
      }
      runPipeline();
    };
    q('[data-ca-retry]').onclick = runPipeline;
    q('[data-ca-back-form]').onclick = function () { state.pendingId = null; show('form'); };

    function close(refresh) {
      if (global.OpsListModals) OpsListModals.close(refresh);
    }
    q('[data-ca-close]').onclick = function () { close(false); };
    q('[data-ca-cancel]').onclick = function () { close(false); };
    q('[data-ca-back-list]').onclick = function () { close(true); };
    q('[data-ca-fail-back]').onclick = function () { close(false); };

    var goCfg = q('[data-ca-go-config]');
    if (goCfg) {
      goCfg.addEventListener('click', function (e) {
        var target = goCfg.getAttribute('href');
        if (!target || target === '#') return;
        e.preventDefault();
        close(false);
        window.location.href = target;
      });
    }

    root._createModal = {
      open: function (opts) {
        opts = opts || {};
        state.alwaysFail = opts.fail === '1' || opts.alwaysFail === '1';
        state.pendingId = null;
        state.selectedType = null;
        state.selectedScope = 'private';
        state.permissionTargets = [];
        q('[data-ca-name]').value = '';
        q('[data-ca-desc]').value = '';
        q('[data-ca-name-count]').textContent = '0';
        q('[data-ca-desc-count]').textContent = '0';
        qa('[data-ca-types] .type-card').forEach(function (c) { c.classList.remove('active'); });
        qa('[data-ca-scopes] .scope-option').forEach(function (c, i) {
          c.classList.toggle('active', i === 0);
          var inp = c.querySelector('input');
          if (inp) inp.checked = i === 0;
        });
        renderScopeSummary();
        show(opts.state === 'failure' ? 'failure' : 'form');
      }
    };
  }

  global.OpsModalCreate = {
    mount: mount,
    open: function (root, opts) {
      mount(root);
      if (root._createModal) root._createModal.open(opts || {});
    }
  };
})(window);
