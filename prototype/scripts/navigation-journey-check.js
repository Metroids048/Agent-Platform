/**
 * 导航旅程回归：index ↔ 05 二次进入、firstConfig 残留、proto 双次加载
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
  results.push({ name: name, pass: false, detail: detail || '' });
  console.error('FAIL:', name, detail ? '— ' + detail : '');
  fail++;
}

function createSessionStorage() {
  const data = {};
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) {
      data[k] = String(v);
    },
    removeItem: function (k) {
      delete data[k];
    }
  };
}

function injectProto(domWindow) {
  domWindow.AgentCoreConfig = { wireDevLinks: function () {} };
  domWindow.EditorShell = { bindDebug: function () {}, bindSegmented: function () {} };
  const protoSrc = fs.readFileSync(path.join(root, 'assets', 'proto.js'), 'utf8');
  vm.runInContext(protoSrc, domWindow, { filename: 'proto.js' });
  return domWindow.Proto;
}

function openDetailPage(sessionStorage, search) {
  const { JSDOM } = require('jsdom');
  const html = fs.readFileSync(path.join(root, '05-agent-detail.html'), 'utf8');
  const url = 'http://localhost/05-agent-detail.html' + search;
  const dom = new JSDOM(html, { url: url, runScripts: 'outside-only' });
  dom.window.sessionStorage = sessionStorage;
  dom.window.history = { replaceState: function () {} };
  dom.window.window = dom.window;
  const Proto = injectProto(dom.window);
  Proto.initAgentDetailPage({ tabs: '#agentTabs' });
  return { dom: dom, Proto: Proto, doc: dom.window.document, win: dom.window };
}

function runJourneyChecks() {
  const storage = createSessionStorage();
  const search = '?id=agt_demo_001&name=%E5%AE%A2%E6%9C%8D%E5%8A%A9%E6%89%8B&type=qa';

  // 旅程 A：首次进入运营详情页 —— 3 个 Tab 正常显示
  const pageA = openDetailPage(storage, search);
  const tabCountA = pageA.doc.querySelectorAll('#agentTabs [data-tab]').length;
  if (tabCountA === 3) pass('旅程 A：运营页 Tab 数量 = 3');
  else failCheck('旅程 A：运营页 Tab 数量 = 3', 'tabs=' + tabCountA);

  const opsTabA = pageA.doc.querySelector('#agentTabs [data-tab="ops"]');
  if (opsTabA) {
    opsTabA.click();
    const opsPanelA = pageA.doc.getElementById('tab-ops');
    if (opsPanelA && opsPanelA.classList.contains('active')) pass('旅程 A：Tab 可切换到基本信息');
    else failCheck('旅程 A：Tab 可切换到基本信息');
  } else {
    failCheck('旅程 A：基本信息 Tab 按钮存在');
  }

  // 旅程 B：污染 session 后二次进入 —— firstConfig 残留被清除
  storage.setItem('proto_agent_agt_demo_001', JSON.stringify({
    status: 'dev',
    scope: 'private',
    firstConfig: true
  }));

  if (pageA.win.__protoSkillBindWired !== undefined) {
    failCheck('旅程 B：无 __protoSkillBindWired 全局标志');
  } else {
    pass('旅程 B：无 __protoSkillBindWired 全局标志');
  }

  const pageB = openDetailPage(storage, search);
  if (!pageB.Proto.isFirstConfig()) pass('旅程 B：列表再进清除 firstConfig 残留');
  else failCheck('旅程 B：列表再进清除 firstConfig 残留');

  const monitorTabB = pageB.doc.querySelector('#agentTabs [data-tab="monitor"]');
  if (monitorTabB) {
    monitorTabB.click();
    const monitorPanelB = pageB.doc.getElementById('tab-monitor');
    if (monitorPanelB && monitorPanelB.classList.contains('active')) pass('旅程 B：二次进入 Tab 可切换');
    else failCheck('旅程 B：二次进入 Tab 可切换');
  } else {
    failCheck('旅程 B：monitor Tab 存在');
  }

  // 旅程 C：?new=1（运营页不再拦截 Tab，首配由开发平台处理）
  storage.setItem('proto_agent_agt_new_001', JSON.stringify({
    status: 'dev',
    firstConfig: true
  }));
  const pageC = openDetailPage(storage, '?id=agt_new_001&name=New&type=qa&new=1');
  if (pageC.Proto.isFirstConfig()) pass('旅程 C：?new=1 仍为首次配置');
  else failCheck('旅程 C：?new=1 仍为首次配置');

  const opsTabC = pageC.doc.querySelector('#agentTabs [data-tab="ops"]');
  if (opsTabC) {
    opsTabC.click();
    const opsPanelC = pageC.doc.getElementById('tab-ops');
    // 运营页不再锁定 Tab（no config tab to lock to）
    if (opsPanelC && opsPanelC.classList.contains('active')) pass('旅程 C：运营页 Tab 自由切换');
    else failCheck('旅程 C：运营页 Tab 自由切换');
  }

  // 旅程 D：publishModal 仍可打开（hidden + active 回归）
  const pageD = openDetailPage(storage, '?id=agt_new_001&name=New&type=qa&new=1');
  pageD.Proto.showModal('publishModal');
  const pmD = pageD.doc.getElementById('publishModal');
  if (pmD && pmD.classList.contains('active') && !pmD.classList.contains('hidden')) {
    pass('旅程 D：publishModal 可打开');
  } else {
    failCheck('旅程 D：publishModal 须 active 且非 hidden');
  }

  // 旅程 E：前往开发平台链接存在
  const devLink = pageD.doc.getElementById('btnOpenDev');
  if (devLink && devLink.href && devLink.href.includes('06-dev-editor.html')) {
    pass('旅程 E：前往开发平台链接正确');
  } else {
    failCheck('旅程 E：前往开发平台链接正确', devLink ? devLink.href : 'no link');
  }

  // 旅程 F：v1.1 index 卡片 + proto 列表操作 HTML
  const { JSDOM } = require('jsdom');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (indexHtml.includes('ops-v11-app.js') && indexHtml.includes('pageMain')) {
    pass('旅程 F：index 为 v1.1 卡片列表');
  } else {
    failCheck('旅程 F：index 为 v1.1 卡片列表');
  }
  const auditDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/index.html',
    runScripts: 'outside-only'
  });
  auditDom.window.sessionStorage = createSessionStorage();
  auditDom.window.history = { replaceState: function () {} };
  auditDom.window.window = auditDom.window;
  const ProtoIndex = injectProto(auditDom.window);
  const revActions = ProtoIndex.buildAgentListActionsHtml({ id: 'agt_procure', name: '采购申请助手', type: 'flow' }, 'review');
  if (revActions.includes('审核进度') && revActions.includes('08-audit-status')) {
    pass('旅程 F：审核中操作含审核进度链');
  } else {
    failCheck('旅程 F：审核中操作含审核进度链', revActions.slice(0, 80));
  }

  // 旅程 G：审核链
  const auditStorage = createSessionStorage();
  const ProtoAudit = ProtoIndex;
  ProtoAudit.ensureDemoAuditQueue();
  const auditItem = ProtoAudit.getAuditItem('agt_procure');
  if (auditItem && auditItem.id === 'agt_procure') pass('旅程 G：getAuditItem(agt_procure)');
  else failCheck('旅程 G：getAuditItem(agt_procure)');
  const reviewUrl = ProtoAudit.hrefAuditReview({ id: 'agt_procure', name: '采购申请助手', type: 'flow' });
  if (reviewUrl.indexOf('audit-review') >= 0 && reviewUrl.indexOf('agt_procure') >= 0) {
    pass('旅程 G：hrefAuditReview 含 review 与 id');
  } else {
    failCheck('旅程 G：hrefAuditReview 含 review 与 id', reviewUrl);
  }

  // 旅程 H：dev-editor 返回运营链接
  const devHtml = fs.readFileSync(path.join(root, '06-dev-editor.html'), 'utf8');
  const devDom = new JSDOM(devHtml, {
    url: 'http://localhost/06-dev-editor.html?id=agt_demo_001&name=Test&type=qa',
    runScripts: 'outside-only'
  });
  devDom.window.sessionStorage = createSessionStorage();
  devDom.window.history = { replaceState: function () {} };
  devDom.window.window = devDom.window;
  devDom.window.AgentCoreConfig = { wireDevLinks: function () {}, buildHTML: function () { return ''; } };
  const ProtoDev = injectProto(devDom.window);
  ProtoDev.initCrossLinks({ '#devBackOps': '05-agent-detail.html' });
  const backOps = devDom.window.document.getElementById('devBackOps');
  if (backOps && backOps.href && backOps.href.indexOf('agt_demo_001') >= 0) {
    pass('旅程 H：devBackOps href 含 agent id');
  } else {
    failCheck('旅程 H：devBackOps href 含 agent id', backOps ? backOps.href : 'no link');
  }

  // 旅程 I：pick skills 回写
  const pickStorage = createSessionStorage();
  pickStorage.setItem('proto_agent_agt_demo_001', JSON.stringify({ status: 'dev', boundSkillIds: [] }));
  const pickDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/05-agent-detail.html?id=agt_demo_001&name=Test&type=qa',
    runScripts: 'outside-only'
  });
  pickDom.window.sessionStorage = pickStorage;
  pickDom.window.history = { replaceState: function () {} };
  pickDom.window.window = pickDom.window;
  const ProtoPick = injectProto(pickDom.window);
  ProtoPick.applyPickedResources(encodeURIComponent('报告结构化'), 'skills');
  const idsAfter = ProtoPick.getAgentSkillIds();
  if (idsAfter && idsAfter.length > 0) pass('旅程 I：applyPickedResources 写入 boundSkillIds');
  else failCheck('旅程 I：applyPickedResources 写入 boundSkillIds');

  // 旅程 J：monitor 重定向 stub
  const monitorHtml = fs.readFileSync(path.join(root, '08-agent-monitor.html'), 'utf8');
  if (monitorHtml.includes('05-agent-detail.html') && monitorHtml.includes("tab: 'monitor'")) {
    pass('旅程 J：08-agent-monitor 重定向至 05 monitor Tab');
  } else {
    failCheck('旅程 J：08-agent-monitor 重定向至 05 monitor Tab');
  }

  // 旅程 K：02-sequence 首配链不再指向 05?new=1
  const seqHtml = fs.readFileSync(path.join(root, '02-sequence-create.html'), 'utf8');
  if (seqHtml.includes('06-dev-editor.html?new=1') && !/05-agent-detail\.html\?new=1/.test(seqHtml)) {
    pass('旅程 K：02-sequence 首配指向开发平台');
  } else {
    failCheck('旅程 K：02-sequence 首配指向开发平台');
  }

  // bindTabs 双次 init 不重复绑定
  const pageTabs = openDetailPage(createSessionStorage(), search);
  pageTabs.Proto.initAgentDetailPage({ tabs: '#agentTabs' });
  const tabsRoot = pageTabs.doc.querySelector('#agentTabs');
  if (tabsRoot && tabsRoot.dataset.tabsWired === '1') {
    pass('旅程：bindTabs 容器 data-tabs-wired=1');
  } else {
    failCheck('旅程：bindTabs 容器 data-tabs-wired=1');
  }
}

function main() {
  console.log('=== navigation-journey-check ===\n');
  try {
    runJourneyChecks();
  } catch (e) {
    failCheck('navigation-journey-check 未捕获异常', e.message);
    console.error(e);
  }
  fs.writeFileSync(
    path.join(__dirname, 'navigation-journey-results.json'),
    JSON.stringify({ at: new Date().toISOString(), results: results }, null, 2)
  );
  console.log('\nResults → scripts/navigation-journey-results.json');
  console.log(fail ? 'NAVIGATION JOURNEY FAILED ' + fail : 'ALL NAVIGATION JOURNEY CHECKS PASSED');
  process.exit(fail ? 1 : 0);
}

main();
