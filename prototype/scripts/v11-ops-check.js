/**
 * 智能体运营 v1.1 专项检查：页面存在、脚本可加载、筛选/发布/审核/上架链路可运行。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const pages = ['index.html', 'dashboard.html', 'audit-workbench.html', 'audit-review.html', 'agent-detail.html'];
let fail = 0;

function pass(name) {
  console.log('PASS:', name);
}

function failCheck(name, detail) {
  fail++;
  console.error('FAIL:', name, detail || '');
}

function assert(cond, name, detail) {
  if (cond) pass(name);
  else failCheck(name, detail);
}

const sharedStorage = {};

function loadPage(page, query, extraScripts) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + page + (query || ''),
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  dom.window.sessionStorage.getItem = function (key) {
    return Object.prototype.hasOwnProperty.call(sharedStorage, key) ? sharedStorage[key] : null;
  };
  dom.window.sessionStorage.setItem = function (key, value) {
    sharedStorage[key] = String(value);
  };
  dom.window.sessionStorage.removeItem = function (key) {
    delete sharedStorage[key];
  };
  dom.window.confirm = function () { return true; };
  const context = dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'proto.js'), 'utf8'), context, { filename: 'proto.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'ops-platform-shell.js'), 'utf8'), context, { filename: 'ops-platform-shell.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'org-access-picker.js'), 'utf8'), context, { filename: 'org-access-picker.js' });
  (extraScripts || []).forEach(function (script) {
    vm.runInContext(fs.readFileSync(script, 'utf8'), context, { filename: path.basename(script) });
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'ops-v11-app.js'), 'utf8'), context, { filename: 'ops-v11-app.js' });
  if (dom.window.OpsV11 && dom.window.document.getElementById('pageMain') && !dom.window.document.getElementById('pageContent')) {
    dom.window.OpsV11.init();
  }
  return dom;
}

console.log('=== v1.1 ops check ===\n');

pages.forEach(function (page) {
  assert(fs.existsSync(path.join(root, page)), page + ' exists');
});

const indexDom = loadPage('index.html');
const doc = indexDom.window.document;

['草稿', '审核中', '已上架', '已停用', '已下架', '已驳回'].forEach(function (label) {
  var opts = Array.prototype.map.call(doc.querySelectorAll('[data-filter-select="status"] option'), function (o) { return o.textContent; }).join('');
  assert(opts.indexOf(label) >= 0, '状态筛选项含 ' + label);
});

['dev', 'reviewing', 'listed', 'disabled', 'offline', 'rejected'].forEach(function (st) {
  assert(doc.querySelector('.agent-card[data-agent-status="' + st + '"]'), '主页示例卡片 → ' + st);
});

const devCard = doc.querySelector('.agent-card[data-agent-status="dev"]');
devCard.querySelector('[data-card-menu]').click();
const devMenu = doc.getElementById('v11CardMenu');
assert(devMenu && devMenu.textContent.trim() === '删除', '草稿菜单仅删除');

const reviewCard = doc.querySelector('.agent-card[data-agent-status="reviewing"]');
reviewCard.querySelector('[data-card-menu]').click();
const reviewMenu = doc.getElementById('v11CardMenu');
assert(reviewMenu && reviewMenu.textContent.includes('撤回') && reviewMenu.textContent.includes('删除'), '审核中菜单含撤回与删除');

const listedDom = loadPage('index.html');
const listedCard = listedDom.window.document.querySelector('.agent-card[data-agent-status="listed"]');
listedCard.querySelector('[data-card-menu]').click();
const listedMenu = listedDom.window.document.getElementById('v11CardMenu');
assert(listedMenu && listedMenu.textContent.includes('停用'), '已上架菜单含停用');
assert(listedMenu && listedMenu.textContent.includes('下架'), '已上架菜单含下架');
assert(listedMenu && listedMenu.textContent.includes('权限'), '已上架菜单含权限');

const disabledDom = loadPage('index.html');
const disabledCard = disabledDom.window.document.querySelector('.agent-card[data-agent-status="disabled"]');
disabledCard.querySelector('[data-card-menu]').click();
const disabledMenu = disabledDom.window.document.getElementById('v11CardMenu');
assert(disabledMenu && disabledMenu.textContent.includes('启用'), '已停用菜单含启用');
assert(disabledMenu && disabledMenu.textContent.includes('下架'), '已停用菜单含下架');
assert(disabledMenu && disabledMenu.textContent.includes('删除'), '已停用菜单含删除');

const reviewDom = loadPage('audit-review.html', '?id=agt_procure');
const approveBtn = reviewDom.window.document.querySelector('[data-approve-review]');
if (approveBtn) approveBtn.click();
assert(reviewDom.window.OpsV11.getAgent('agt_procure').status === 'listed', '审核通过后直接上架');

const v11Src = fs.readFileSync(path.join(root, 'assets', 'ops-v11-app.js'), 'utf8');
assert(v11Src.indexOf('navigateToAgentDetail') >= 0 && v11Src.indexOf('05-agent-detail.html') >= 0, '卡片/新建详情路由指向 05-agent-detail.html');

const protoSrc = fs.readFileSync(path.join(root, 'assets', 'proto.js'), 'utf8');
assert(protoSrc.indexOf('syncOpsV11FromState') >= 0, 'Proto 含 v1.1 列表状态同步');

console.log('');
if (fail) {
  console.error('V11 OPS CHECK FAILED (' + fail + ' issue(s))');
  process.exit(1);
}
console.log('V11 OPS CHECK PASSED');
