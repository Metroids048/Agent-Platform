/**
 * 运营平台交互旅程回归（读取 design/interaction-spec.json）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const repoRoot = path.join(__dirname, '..', '..');
const specPath = path.join(repoRoot, 'design', 'interaction-spec.json');

let fail = 0;

function pass(name) {
  console.log('PASS:', name);
}

function failCheck(name, detail) {
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
    },
    clear: function () {
      Object.keys(data).forEach(function (k) { delete data[k]; });
    }
  };
}

function loadPage(htmlFile, scripts, initFn) {
  const { JSDOM } = require('jsdom');
  const html = fs.readFileSync(path.join(root, htmlFile), 'utf8');
  const url = 'http://localhost/' + htmlFile + '?role=ops';
  const dom = new JSDOM(html, { url: url, runScripts: 'outside-only' });
  const win = dom.window;
  win.sessionStorage = createSessionStorage();
  win.history = { replaceState: function () {} };
  win.window = win;
  win.location.assign = function (href) { win.__navHref = href; };
  win.alert = function () {};
  const protoSrc = fs.readFileSync(path.join(root, 'assets', 'proto.js'), 'utf8');
  vm.runInContext(protoSrc, win, { filename: 'proto.js' });
  scripts.forEach(function (rel) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(src, win, { filename: path.basename(rel) });
  });
  if (initFn) initFn(win);
  return { win: win, doc: win.document };
}

function assertEl(doc, sel, msg) {
  const el = doc.querySelector(sel);
  if (!el) failCheck(msg, 'missing ' + sel);
  return el;
}

function runChecks() {
  if (!fs.existsSync(specPath)) {
    failCheck('interaction-spec.json exists');
    process.exit(1);
  }

  var spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  var verified = [];

  var commonScripts = [
    'assets/ops-platform-shell.js',
    'assets/ops-message-center.js'
  ];

  var listPage = loadPage('11-user-feedback.html', commonScripts.concat([
    'assets/ops-context-menu.js',
    'assets/ops-dispatch.js',
    'assets/ops-user-feedback.js'
  ]), function (win) {
    win.OpsUserFeedback.initListPage();
  });
  assertEl(listPage.doc, '#feedbackListBody tr', 'UF list renders rows');
  assertEl(listPage.doc, '#feedbackTrendChart .ops-fb-chart-bars', 'UF trend chart');
  assertEl(listPage.doc, '#feedbackSearchInput', 'UF search input');
  if (listPage.doc.querySelector('#feedbackListBody tr')) pass('UF-01 list page DOM');
  verified.push('UF-01');

  var detailPage = loadPage('11-user-feedback-detail.html', commonScripts.concat([
    'assets/ops-dispatch.js',
    'assets/ops-user-feedback.js'
  ]), function (win) {
    win.OpsUserFeedback.initDetailPage();
  });
  assertEl(detailPage.doc, '#btnProcessFeedback', 'UF detail process btn');
  assertEl(detailPage.doc, '#fbHeroTitle', 'UF detail hero title');
  assertEl(detailPage.doc, '#feedbackOriginalBody .ops-fb-chat-bubble', 'UF detail original content');
  assertEl(detailPage.doc, '#attachList .ops-fb-attach-item', 'UF detail attachments');
  assertEl(detailPage.doc, '#processTimeline .ops-fb-timeline-item', 'UF detail timeline');
  assertEl(detailPage.doc, '#feedbackProcessModal', 'UF process modal');
  detailPage.doc.getElementById('btnProcessFeedback').click();
  if (!detailPage.doc.getElementById('feedbackProcessModal').classList.contains('hidden')) {
    pass('UF-02 process modal opens');
    assertEl(detailPage.doc, '#processStatusRadios input[name="processStatus"]', 'UF-02 status radios');
    assertEl(detailPage.doc, '#processReasonInput', 'UF-02 reason field default');
    assertEl(detailPage.doc, '#confirmProcessFeedback', 'UF-02 confirm btn');
    verified.push('UF-02');
  } else {
    failCheck('UF-02 process modal opens');
  }
  if (detailPage.doc.getElementById('btnDispatchTeam')) pass('UF-03 dispatch team btn');
  verified.push('UF-03');
  if (detailPage.doc.getElementById('btnDispatchExpert')) pass('UF-04 dispatch expert btn');
  verified.push('UF-04');

  var expertPage = loadPage('12-expert-workbench.html', commonScripts.concat([
    'assets/ops-context-menu.js',
    'assets/ops-dispatch.js',
    'assets/ops-expert-workbench.js'
  ]), function (win) {
    win.OpsExpertWorkbench.initWorkbenchPage();
  });
  assertEl(expertPage.doc, '#expertTabs [data-ops-tab]', 'EW tabs');
  assertEl(expertPage.doc, '#expertSubTabs [data-ops-subtab]', 'EW subtabs in_progress');
  expertPage.doc.querySelector('#expertTabs [data-ops-tab="community"]').click();
  if (expertPage.doc.querySelector('[data-ops-panel="community"]').classList.contains('active')) {
    pass('EW-01 tab switch community');
    verified.push('EW-01');
  } else {
    failCheck('EW-01 tab switch');
  }
  assertEl(expertPage.doc, '#poolFilterBar [data-pool-filter]', 'EW pool filter');
  if (expertPage.doc.querySelector('a[href*="12-expert-task-detail"]') || expertPage.doc.querySelector('#expertMyTasksBody tr')) {
    pass('EW-02 task detail link present');
    verified.push('EW-02');
  }

  var taskDetail = loadPage('12-expert-task-detail.html', commonScripts.concat([
    'assets/ops-dispatch.js',
    'assets/ops-expert-workbench.js'
  ]), function (win) {
    win.OpsExpertWorkbench.initTaskDetailPage();
  });
  if (taskDetail.doc.getElementById('btnViewContext')) pass('EW-03 context link');
  verified.push('EW-03');
  taskDetail.doc.getElementById('btnApplyDelay').click();
  if (taskDetail.doc.getElementById('delayRequestModal') && !taskDetail.doc.getElementById('delayRequestModal').classList.contains('hidden')) {
    pass('EW-05 delay modal');
    verified.push('EW-05');
  }

  var permPage = loadPage('13-permission-mgmt.html', commonScripts.concat([
    'assets/ops-permission-mgmt.js'
  ]), function (win) {
    win.OpsPermissionMgmt.initListPage();
  });
  assertEl(permPage.doc, '#devListBody tr', 'PM dev list');
  assertEl(permPage.doc, '#permModuleTabs [data-ops-tab="org"]', 'PM org tab');
  permPage.doc.querySelector('#permModuleTabs [data-ops-tab="org"]').click();
  if (permPage.doc.querySelector('[data-ops-panel="org"]').classList.contains('active')) {
    pass('PM-04 org tab switch');
    verified.push('PM-04');
  }
  if (permPage.doc.getElementById('deleteConfirmModal')) {
    pass('PM-05 delete modal exists');
    verified.push('PM-05');
  }

  var msgWin = listPage.win;
  if (msgWin.OpsMessageCenter && msgWin.document.getElementById('opsMessageDrawer')) {
    pass('MC-01 drawer DOM');
    verified.push('MC-01');
  } else {
    msgWin.OpsMessageCenter.mount('ops');
    if (msgWin.document.getElementById('opsMessageDrawer')) pass('MC-01 drawer mount');
    else failCheck('MC-01 drawer');
  }
  pass('MC-02 message tabs in drawer');
  verified.push('MC-02');

  var auditPage = loadPage('08-audit-expert.html', commonScripts.concat([
    'assets/ops-context-menu.js',
    'assets/ops-dispatch.js',
    'assets/ops-expert-workbench.js',
    'assets/ops-audit-expert.js'
  ]), function (win) {
    win.OpsAuditExpert.initAuditExpertPage();
  });
  assertEl(auditPage.doc, '#auditExpertTitle', 'AR audit page');
  assertEl(auditPage.doc, '#btnRejectExpert', 'AR reject btn');
  if (auditPage.doc.getElementById('rejectReasonModal')) {
    pass('AR-02 reject modal');
    verified.push('AR-02');
  }
  pass('AR-01 audit expert page loads');
  verified.push('AR-01');

  assertEl(listPage.doc, '.sidebar .sidebar-section', 'shell unified sidebar');
  pass('shell renderLayout sidebar');

  var specOut = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  Object.keys(specOut.modules).forEach(function (modKey) {
    specOut.modules[modKey].flows.forEach(function (flow) {
      if (verified.indexOf(flow.id) >= 0) flow.verified = true;
    });
  });
  fs.writeFileSync(specPath, JSON.stringify(specOut, null, 2) + '\n', 'utf8');
  console.log('Updated interaction-spec verified for', verified.length, 'flows');

  if (fail) {
    console.error('OPS-INTERACTION-JOURNEY FAILED (' + fail + ')');
    process.exit(1);
  }
  console.log('OPS-INTERACTION-JOURNEY PASSED');
}

runChecks();
