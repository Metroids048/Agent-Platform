/**
 * 智能体核心配置（运营平台与开发平台共用，与开发平台 UI 一致）
 */
(function (global) {
  function devManageUrl(res, q) {
    q = q || (global.Proto ? Proto.qs().slice(1) : '');
    if (res === 'skills') {
      return '10-skills-management.html' + (q ? '?' + q : '');
    }
    return '06-dev-resources.html?res=' + res + (q ? '&' + q : '');
  }

  function devEditorUrl(q) {
    return global.Proto ? Proto.href('06-dev-editor.html') : '06-dev-editor.html';
  }

  function jumpBtn(res, q, extra) {
    extra = extra || '';
    return '<a href="' + devManageUrl(res, q) + '" class="core-jump" title="添加或管理" ' + extra + '>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a>';
  }

  function buildCoreConfigHTML(q) {
    q = q || '';
    return (
      '<div class="core-config">' +

      '<div class="core-section">' +
      '<div class="core-section-head" onclick="EditorShell.toggleCore(this)">' +
      '<span class="core-chevron">▼</span><span class="core-title">模型配置</span></div>' +
      '<div class="core-section-body">' +
      '<div class="core-field"><label>模型</label>' +
      '<div class="core-select-wrap"><select class="select core-select"><option selected>GPT-4o</option><option>GPT-4o mini</option><option>Claude 3.5</option></select>' +
      jumpBtn('models', q, 'data-dev-res="models"') + '</div></div>' +
      '<div class="core-field"><label>生成多样性</label>' +
      '<div class="segmented core-seg"><button class="active" type="button">精确模式</button><button type="button">平衡模式</button>' +
      '<button type="button">创意模式</button><button type="button">自定义</button></div></div>' +
      '<div class="core-field core-slider"><label>随机性</label>' +
      '<input type="range" value="30"><input class="num-input" value="0.3"></div>' +
      '<div class="core-subhead">输入/输出</div>' +
      '<div class="core-field core-slider"><label>携带上下文轮数</label>' +
      '<input type="range" value="50"><input class="num-input" value="5"></div>' +
      '<div class="core-field core-slider"><label>最大回复长度</label>' +
      '<input type="range" value="60"><input class="num-input" value="1024"></div>' +
      '<div class="core-subhead">默认指令</div>' +
      '<div class="toggle-row"><span class="lbl">当前时间</span><label class="switch"><input type="checkbox"><span class="slider"></span></label></div>' +
      '</div></div>' +

      '<div class="core-section">' +
      '<div class="core-section-head" onclick="EditorShell.toggleCore(this)">' +
      '<span class="core-chevron">▼</span><span class="core-title">输入/输出配置</span></div>' +
      '<div class="core-section-body">' +
      '<div class="core-row-link"><span>变量配置</span><span class="core-row-actions">' +
      '<button type="button" class="core-icon-btn" title="添加变量" onclick="Proto.toast(\'请在开发平台添加变量\')">+</button>' +
      jumpBtn('tools', q, 'data-dev-res="tools"') + '</span></div>' +
      '<div class="core-row-link"><span>结构化输出</span><span class="core-row-actions">' +
      '<label class="switch switch-sm"><input type="checkbox"><span class="slider"></span></label>' +
      jumpBtn('tools', q, 'data-dev-res="tools"') + '</span></div>' +
      '</div></div>' +

      '<div class="core-section">' +
      '<div class="core-section-head" onclick="EditorShell.toggleCore(this)">' +
      '<span class="core-chevron">▼</span><span class="core-title">能力配置</span></div>' +
      '<div class="core-section-body">' +
      '<div class="core-row-link"><span>工具调用</span><span class="core-row-actions">' + jumpBtn('tools', q, 'data-dev-res="tools"') + '</span></div>' +
      '<div class="core-row-link"><span>工作流调用</span><span class="core-row-actions">' +
      '<button type="button" class="core-icon-btn" title="添加工作流" onclick="Proto.toast(\'请在开发平台添加工作流\')">+</button>' +
      jumpBtn('workflow', q, 'data-dev-res="workflow"') + '</span></div>' +
      '<div class="core-row-link"><span>MCP 服务</span><span class="core-row-actions">' + jumpBtn('tools', q, 'data-dev-res="tools"') + '</span></div>' +
      '<div class="core-row-link"><span>Skills</span><span class="core-row-actions">' +
      '<button type="button" class="core-icon-btn" title="选择 Skills（智能体配置）" data-action="open-skill-bind" onclick="window.Proto&&Proto.openSkillBindModal()">+</button>' +
      jumpBtn('skills', q, 'data-dev-res="skills"') + '</span></div>' +
      '<div class="core-tags" data-skill-bindings></div>' +
      '</div></div>' +

      '<div class="core-section">' +
      '<div class="core-section-head" onclick="EditorShell.toggleCore(this)">' +
      '<span class="core-chevron">▼</span><span class="core-title">知识库配置</span></div>' +
      '<div class="core-section-body">' +
      '<div class="core-row-link"><span>引用知识库</span><span class="core-row-actions">' + jumpBtn('knowledge', q, 'data-dev-res="knowledge"') + '</span></div>' +
      '<div class="core-tags"><span class="core-tag">产品使用手册</span><span class="core-tag">常见问题 FAQ</span></div>' +
      '</div></div>' +

      '<div class="core-section collapsed">' +
      '<div class="core-section-head" onclick="EditorShell.toggleCore(this)">' +
      '<span class="core-chevron">▼</span><span class="core-title">多智能体协作</span></div>' +
      '<div class="core-section-body">' +
      '<div class="core-row-link"><span>智能体调用</span><span class="core-row-actions">' +
      jumpBtn('workflow', q, 'data-dev-res="workflow"') + '</span></div>' +
      '</div></div>' +

      '</div>'
    );
  }

  function buildPromptColumn() {
    return (
      '<div class="dev-col">' +
      '<div class="dev-col-header dev-col-header-p2"><span class="dev-col-title">💡 智能体画像</span></div>' +
      '<div class="dev-col-body dev-col-persona">' +
      '<textarea class="textarea persona-textarea" id="promptText" placeholder="在此处填入固定 Prompt 以引导模型对话方向，支持使用 {{变量}} 引用输入输出配置中的变量…">' +
      '企业产品咨询客服助手，专注于解答产品使用问题、处理售后咨询、创建工单。语气友好专业，无法回答时引导转人工。</textarea>' +
      '</div></div>'
    );
  }

  function buildTestColumn() {
    return (
      '<div class="dev-col dev-col-preview">' +
      '<div class="dev-col-header dev-col-header-p2 dev-col-header-split">' +
      '<span class="dev-col-title">预览与调试</span>' +
      '<button type="button" class="dev-col-refresh" id="debugRefresh" title="清空对话">↻</button></div>' +
      '<div class="dev-col-body debug-panel debug-panel-p2">' +
      '<div id="debugMsgs" class="debug-msgs">' +
      '<div class="debug-empty debug-empty-p2">' +
      '<div class="debug-empty-illus" aria-hidden="true"></div>' +
      '<div>暂无内容</div></div></div>' +
      '<div class="debug-composer-p2">' +
      '<button type="button" class="debug-attach" title="附件" onclick="Proto.toast(\'附件上传（原型）\')">📎</button>' +
      '<input type="text" id="debugInput" class="debug-input-p2" placeholder="开始对话吧">' +
      '<button type="button" class="debug-send-p2" id="debugSend" title="发送">➤</button></div>' +
      '<p class="debug-disclaimer">AI 生成的内容可能会有错误或与事实有偏差，仅供参考</p>' +
      '</div></div>'
    );
  }

  function buildMiddleColumn(q) {
    return (
      '<div class="dev-col dev-col-core">' +
      '<div class="dev-col-header">智能体核心配置</div>' +
      '<div class="dev-col-body core-config-scroll" id="coreConfigRoot">' +
      buildCoreConfigHTML(q) +
      '</div></div>'
    );
  }

  function buildHTML(q) {
    return buildPromptColumn() + buildMiddleColumn(q) + buildTestColumn();
  }

  function wireDevLinks(root, q) {
    q = q || (global.Proto ? Proto.qs().slice(1) : '');
    var scope = root || document;
    scope.querySelectorAll('[data-dev-res]').forEach(function (a) {
      a.href = devManageUrl(a.getAttribute('data-dev-res'), q);
    });
  }

  global.AgentCoreConfig = {
    buildCoreConfigHTML: buildCoreConfigHTML,
    buildHTML: buildHTML,
    wireDevLinks: wireDevLinks,
    devManageUrl: devManageUrl,
    devEditorUrl: devEditorUrl
  };
})(window);
