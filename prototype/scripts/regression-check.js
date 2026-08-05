/**
 * 回归检查：语法 + 实际加载 Proto + Skills 页关键契约
 * 防止「proto.js 语法错误导致全站 Proto 未加载但 smoke 仍 PASS」
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');

let fail = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    fail++;
  } else {
    console.log('PASS:', msg);
  }
}

// 1. 所有 assets/*.js 语法检查
const jsFiles = fs.readdirSync(assetsDir).filter(function (f) { return f.endsWith('.js'); });
jsFiles.forEach(function (file) {
  const full = path.join(assetsDir, file);
  try {
    execSync('node --check "' + full + '"', { stdio: 'pipe' });
    console.log('PASS: syntax OK → assets/' + file);
  } catch (e) {
    console.error('FAIL: SYNTAX ERROR assets/' + file);
    fail++;
  }
});

// 2. vm 加载 proto.js，断言 Proto API 可用
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
      id: '',
      className: '',
      textContent: '',
      classList: { add: function () {}, remove: function () {} },
      appendChild: function () {},
      _t: null
    };
  },
  body: { appendChild: function () {} }
};

const window = {
  location: { search: '', href: 'http://localhost/prototype/10-skills-management.html', hash: '' },
  sessionStorage: mockSessionStorage,
  document: mockDocument,
  history: { replaceState: function () {} }
};

const protoSrc = fs.readFileSync(path.join(assetsDir, 'proto.js'), 'utf8');
const context = vm.createContext({
  window: window,
  document: mockDocument,
  console: console,
  URLSearchParams: URLSearchParams,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
});
try {
  vm.runInContext(protoSrc, context, { filename: 'proto.js' });
} catch (e) {
  console.error('FAIL: proto.js runtime load —', e.message);
  fail++;
  process.exit(1);
}

const Proto = window.Proto;
assert(Proto && typeof Proto === 'object', 'window.Proto 已挂载');
assert(typeof Proto.getSkillCatalog === 'function', 'Proto.getSkillCatalog 存在');
assert(typeof Proto.wireDevPlatformRows === 'function', 'Proto.wireDevPlatformRows 存在');
assert(typeof Proto.wireAgentListRows === 'function', 'Proto.wireAgentListRows 存在');
assert(typeof Proto.wireStandardLinks === 'function', 'Proto.wireStandardLinks 存在');

const catalog = Proto.getSkillCatalog();
assert(Array.isArray(catalog) && catalog.length >= 6, 'getSkillCatalog() 至少 6 条（实际 ' + (catalog ? catalog.length : 0) + '）');
assert(catalog.some(function (s) { return s.name === '报告结构化'; }), 'catalog 含「报告结构化」');
assert(catalog.some(function (s) { return s.name === '风险审查'; }), 'catalog 含「风险审查」');

const emptyKey = 'proto_agent_agt_demo_001';
window.sessionStorage.setItem(emptyKey, JSON.stringify({ status: 'dev', boundSkillIds: [] }));
const migrated = Proto.getAgentSkillIds();
assert(Array.isArray(migrated) && migrated.length >= 2, '空 boundSkillIds 自动恢复默认（实际 ' + migrated.length + '）');
window.sessionStorage.removeItem(emptyKey);

// 3. Skills 管理页契约
const skillsHtml = fs.readFileSync(path.join(root, '10-skills-management.html'), 'utf8');
assert(skillsHtml.includes('function catalog() { return Proto.getSkillCatalog(); }'), 'Skills 页使用 getSkillCatalog');
assert(/renderList\(\);\s*<\/script>/.test(skillsHtml), 'Skills 页末尾调用 renderList()');

console.log(fail ? '\nREGRESSION CHECK FAILED ' + fail : '\nALL REGRESSION CHECKS PASSED');
process.exit(fail ? 1 : 0);
