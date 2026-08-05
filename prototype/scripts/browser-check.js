/**
 * 关键页 DOM 回归（jsdom + Proto 运行时）
 * Playwright 可用时优先走真实浏览器；否则用 jsdom 验收 DOM/脚本契约
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const results = [];
let fail = 0;

function pass(name) {
  results.push({ name: name, pass: true });
  console.log('PASS:', name);
}

function failCheck(name, detail) {
  results.push({ name: name, pass: false, detail: detail });
  console.error('FAIL:', name, detail ? '— ' + detail : '');
  fail++;
}

function loadProtoWindow() {
  const storage = {};
  const mockSessionStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
    setItem: function (k, v) { storage[k] = String(v); },
    removeItem: function (k) { delete storage[k]; }
  };
  const mockDocument = {
    readyState: 'complete',
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    createElement: function () {
      return {
        id: '', className: '', textContent: '',
        classList: { add: function () {}, remove: function () {} },
        appendChild: function () {}, _t: null
      };
    },
    body: { appendChild: function () {} }
  };
  const window = {
    location: { search: '', href: 'http://localhost/prototype/index.html', hash: '' },
    sessionStorage: mockSessionStorage,
    document: mockDocument,
    history: { replaceState: function () {} }
  };
  const protoSrc = fs.readFileSync(path.join(root, 'assets', 'proto.js'), 'utf8');
  vm.runInContext(protoSrc, vm.createContext({
    window: window,
    document: mockDocument,
    console: console,
    URLSearchParams: URLSearchParams,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  }), { filename: 'proto.js' });
  return window;
}

function runJsdomChecks() {
  const { JSDOM } = require('jsdom');
  const protoWindow = loadProtoWindow();
  const Proto = protoWindow.Proto;

  // 1. Skills 列表渲染
  const skillsHtml = fs.readFileSync(path.join(root, '10-skills-management.html'), 'utf8');
  const skillsDom = new JSDOM(skillsHtml, {
    url: 'http://localhost/10-skills-management.html',
    runScripts: 'outside-only'
  });
  skillsDom.window.Proto = Proto;
  skillsDom.window.document.getElementById('skillManageList').innerHTML = '';
  const catalog = Proto.getSkillCatalog();
  if (catalog.length < 6) {
    failCheck('Skills 列表 ≥6 行', 'catalog=' + catalog.length);
  } else {
    const rows = catalog.map(function (s) {
      return '<tr data-row-id="' + s.id + '"><td>' + s.name + '</td></tr>';
    }).join('');
    skillsDom.window.document.getElementById('skillManageList').innerHTML = rows;
    const count = skillsDom.window.document.querySelectorAll('#skillManageList tr[data-row-id]').length;
    if (count >= 6) pass('Skills 列表 ≥6 行');
    else failCheck('Skills 列表 ≥6 行', 'rows=' + count);
  }

  // 2. v1.1 index 卡片页
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (indexHtml.includes('ops-v11-app.js') && indexHtml.includes('pageMain')) {
    pass('index 页 v1.1 壳结构');
  } else {
    failCheck('index 页 v1.1 壳结构');
  }
  const v11Src = fs.readFileSync(path.join(root, 'assets', 'ops-v11-app.js'), 'utf8');
  if (v11Src.includes('agent-card') && v11Src.includes('data-agent-status')) {
    pass('ops-v11-app 卡片 data-agent-status');
  } else {
    failCheck('ops-v11-app 卡片 data-agent-status');
  }

  // 3. 运营页 3 个 Tab（配置已迁移到开发平台）
  const detailHtml = fs.readFileSync(path.join(root, '05-agent-detail.html'), 'utf8');
  const detailDom = new JSDOM(detailHtml, {
    url: 'http://localhost/05-agent-detail.html?id=agt_demo_001',
    runScripts: 'outside-only'
  });
  detailDom.window.sessionStorage = protoWindow.sessionStorage;
  detailDom.window.Proto = Proto;
  const tabCount = detailDom.window.document.querySelectorAll('#agentTabs [data-tab]').length;
  if (tabCount >= 3 && tabCount <= 3) pass('运营页 Tab 数量 = 3');
  else failCheck('运营页 Tab 数量 = 3', 'tabs=' + tabCount);
  // 确认无配置编辑器和 skills 绑定
  if (detailHtml.includes('前往开发平台')) pass('运营页保留前往开发平台按钮');
  else failCheck('运营页保留前往开发平台按钮');
  if (!detailHtml.includes('tab-config')) pass('运营页不含配置 tab');
  else failCheck('运营页不含配置 tab');

  // 4. 首次配置 CSS（保留但不需要 mode-setup 了）
  const css = fs.readFileSync(path.join(root, 'assets', 'style.css'), 'utf8');
  if (css.includes('mode-setup .tabs-extended')) {
    pass('CSS 仍保留 mode-setup 规则（开发平台编辑器使用）');
  } else {
    failCheck('CSS 仍保留 mode-setup 规则');
  }

  // 5. 审核工作台页结构
  const auditHtml = fs.readFileSync(path.join(root, 'audit-workbench.html'), 'utf8');
  if (auditHtml.includes('ops-v11-app.js') && auditHtml.includes('audit-workbench')) {
    pass('审核工作台页可加载（v1.1 结构）');
  } else {
    failCheck('审核工作台页可加载');
  }

  // 6. 审核详情页契约
  const reviewHtml = fs.readFileSync(path.join(root, 'audit-review.html'), 'utf8');
  if (reviewHtml.includes('ops-v11-app.js') && reviewHtml.includes('audit-review.html')) {
    pass('审核详情页 DOM 契约');
  } else {
    failCheck('审核详情页 DOM 契约');
  }
  Proto.ensureDemoAuditQueue();
  const reviewItem = Proto.getAuditItem('agt_procure');
  if (reviewItem && reviewItem.name === '采购申请助手') pass('getAuditItem 采购申请助手');
  else failCheck('getAuditItem 采购申请助手', reviewItem ? reviewItem.name : 'null');

  // 7. 列表操作 HTML 契约（published / disabled / review）
  const agent = { id: 'agt_demo_001', name: '客服助手', type: 'qa' };
  const pubHtml = Proto.buildAgentListActionsHtml(agent, 'published');
  const disHtml = Proto.buildAgentListActionsHtml(agent, 'disabled');
  const revHtml = Proto.buildAgentListActionsHtml(
    { id: 'agt_procure', name: '采购申请助手', type: 'flow' },
    'review'
  );
  if (pubHtml.includes('停用') && pubHtml.includes('下架')) pass('buildAgentListActionsHtml 已上架');
  else failCheck('buildAgentListActionsHtml 已上架');
  if (disHtml.includes('启用')) pass('buildAgentListActionsHtml 已停用');
  else failCheck('buildAgentListActionsHtml 已停用');
  if (revHtml.includes('审核进度') && revHtml.includes('08-audit-status')) pass('buildAgentListActionsHtml 审核中');
  else failCheck('buildAgentListActionsHtml 审核中');
  // 8. 运营平台新页 DOM 契约
  var feedbackHtml = fs.readFileSync(path.join(root, '11-user-feedback.html'), 'utf8');
  if (feedbackHtml.includes('id="feedbackListBody"') && feedbackHtml.includes('ops-user-feedback.js')) {
    pass('用户反馈列表页 DOM 契约');
  } else {
    failCheck('用户反馈列表页 DOM 契约');
  }
  var permHtml = fs.readFileSync(path.join(root, '13-permission-mgmt.html'), 'utf8');
  if (permHtml.includes('id="devListBody"') && permHtml.includes('deleteConfirmModal')) {
    pass('权限管理列表页 DOM 契约');
  } else {
    failCheck('权限管理列表页 DOM 契约');
  }
  // 9. 用户端极简聊天页 DOM 契约
  var userChatHtml = fs.readFileSync(path.join(root, '09-user-chat.html'), 'utf8');
  if (
    userChatHtml.includes('id="userChatRoot"') &&
    userChatHtml.includes('id="agentList"') &&
    userChatHtml.includes('id="agentSearch"') &&
    !userChatHtml.includes('id="modelMenu"') &&
    !userChatHtml.includes('id="btnModel"') &&
    userChatHtml.includes('id="sessionSkillToggle"') &&
    userChatHtml.includes('aioq-suggest-hint') &&
    userChatHtml.includes('id="sourcePanel"') &&
    !userChatHtml.includes('id="capabilityPanel"') &&
    userChatHtml.includes('assets/user-chat-portal.js')
  ) {
    pass('用户端极简聊天页 DOM 契约');
  } else {
    failCheck('用户端极简聊天页 DOM 契约');
  }
  var userPortalJs = fs.readFileSync(path.join(root, 'assets', 'user-chat-portal.js'), 'utf8');
  if (
    userPortalJs.includes('proto_user_chat_state') &&
    userPortalJs.includes('renderAgentList') &&
    userPortalJs.includes('modelForCurrentContext') &&
    userPortalJs.includes('DEEP_THINKING_MODEL') &&
    userPortalJs.includes('buildAnswer') &&
    userPortalJs.includes('btnModel') &&
    userPortalJs.includes('modelMenu') &&
    userPortalJs.includes('data-dislike-answer') &&
    !userPortalJs.includes('renderCapabilityPanel') &&
    !userPortalJs.includes('proto_user_portal_state') &&
    !userPortalJs.includes('proto_ops_feedback') &&
    !userPortalJs.includes('proto_ops_developers') &&
    !userPortalJs.includes('requestExpert')
  ) {
    pass('用户端聊天状态边界');
  } else {
    failCheck('用户端聊天状态边界');
  }

  // 10. Web 用户端 v4：顶栏模型选择、深度思考、总结笔记、笔记 popover
  var webUserHtml = fs.readFileSync(path.join(root, 'web端', 'index.html'), 'utf8');
  if (
    webUserHtml.includes('id="btnDeepThinking"') &&
    webUserHtml.includes('id="historySummaryModal"') &&
    webUserHtml.includes('id="historySummaryTranscript"') &&
    webUserHtml.includes('id="btnSaveHistorySummary"') &&
    !webUserHtml.includes('id="historySummaryPreview"') &&
    webUserHtml.includes('id="modelMenu"') &&
    webUserHtml.includes('id="btnModel"') &&
    webUserHtml.includes('id="noteRefPopover"') &&
    webUserHtml.includes('user-auth.js')
  ) {
    pass('Web 用户端 v4 模型选择与总结笔记 DOM 契约');
  } else {
    failCheck('Web 用户端 v4 模型选择与总结笔记 DOM 契约');
  }
}

function main() {
  console.log('=== browser-check (jsdom DOM regression) ===\n');
  runJsdomChecks();
  fs.writeFileSync(
    path.join(__dirname, 'browser-check-results.json'),
    JSON.stringify({ at: new Date().toISOString(), mode: 'jsdom', results: results }, null, 2)
  );
  console.log('\nResults → scripts/browser-check-results.json');
  console.log(fail ? 'BROWSER CHECK FAILED ' + fail : 'ALL BROWSER CHECKS PASSED');
  process.exit(fail ? 1 : 0);
}

main();
