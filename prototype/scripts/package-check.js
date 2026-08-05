/**
 * 打包完整性检查：根目录 HTML、Web 用户端子页面、核心资源、相对链接。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const EXPECTED_HTML_COUNT = 38;
const REDIRECT_PAGES = [
  '03-agent-center.html',
  '08-agent-monitor.html',
  '08-audit-queue.html',
  '08-audit-review.html',
  '08-audit-status.html'
];
const results = { passed: [], failed: [], htmlFiles: [] };

function pass(msg) {
  results.passed.push(msg);
  console.log('PASS:', msg);
}

function fail(msg) {
  results.failed.push(msg);
  console.error('FAIL:', msg);
}

function resolveLocal(baseDir, ref) {
  if (!ref || ref.startsWith('#') || ref.startsWith('http://') || ref.startsWith('https://') ||
      ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('javascript:') || ref.startsWith('data:')) {
    return null;
  }
  const clean = ref.split('?')[0].split('#')[0];
  if (!clean || clean === '/') return null;
  return path.normalize(path.join(baseDir, clean));
}

function extractRefs(html) {
  const refs = [];
  const re = /(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) refs.push(m[1]);
  return refs;
}

function walkHtml(dir) {
  const out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(p));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p);
  });
  return out;
}

console.log('=== package-check ===\n');

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
results.htmlFiles = htmlFiles;

if (htmlFiles.length === EXPECTED_HTML_COUNT) pass('根目录 HTML 页面数量 = ' + EXPECTED_HTML_COUNT);
else fail('根目录 HTML 页面数量应为 ' + EXPECTED_HTML_COUNT + '，实际 ' + htmlFiles.length);

const webPages = [
  'web端/login.html',
  'web端/forgot-password.html',
  'web端/index.html',
  'web端/agent-square.html',
  'web端/my-space.html',
  'web端/专家工作台/workbench.html',
  'web端/专家工作台/task-detail.html',
  'web端/专家工作台/task-view.html',
  'web端/专家工作台/context.html'
];
webPages.forEach((rel) => {
  if (fs.existsSync(path.join(root, rel))) pass('Web 用户端页面存在 -> ' + rel);
  else fail('缺少 Web 用户端页面 -> ' + rel);
});
if (webPages.every((rel) => fs.existsSync(path.join(root, rel)))) {
  pass('Web 用户端页面数量 = ' + webPages.length);
}

const v11Pages = ['index.html', 'dashboard.html', 'audit-workbench.html', 'audit-review.html', 'agent-detail.html'];
v11Pages.forEach((rel) => {
  if (fs.existsSync(path.join(root, rel))) pass('v1.1 运营页面存在 -> ' + rel);
  else fail('缺少 v1.1 运营页面 -> ' + rel);
});

const requiredAssets = [
  'assets/proto.js',
  'assets/style.css',
  'assets/ops-v11-app.js',
  'assets/ops-v11.css',
  'assets/user-chat-portal.js',
  'assets/user-agent-square.js',
  'assets/user-personal-space.js'
];
requiredAssets.forEach((rel) => {
  if (fs.existsSync(path.join(root, rel))) pass('共享资源存在 -> ' + rel);
  else fail('缺少共享资源 -> ' + rel);
});

htmlFiles.forEach((file) => {
  const filePath = path.join(root, file);
  const html = fs.readFileSync(filePath, 'utf8');
  const baseDir = path.dirname(filePath);
  const isRedirect = REDIRECT_PAGES.indexOf(file) >= 0;
  if (!isRedirect) {
    if (html.includes('assets/style.css') || html.includes('href="assets/style.css"')) pass(file + ' -> 引用 style.css');
    else fail(file + ' -> 未引用 assets/style.css');
    if (html.includes('assets/proto.js') || html.includes('src="assets/proto.js"')) pass(file + ' -> 引用 proto.js');
    else if (file === 'figma-skills-board.html') pass(file + ' -> figma 板（proto 可选）');
    else fail(file + ' -> 未引用 assets/proto.js');
  }
  extractRefs(html).forEach((ref) => {
    if (ref.indexOf('..') === 0 || /^\.\.\//.test(ref) || ref.includes('../skills') || ref.includes('../design')) {
      fail(file + ' -> 指向仓库外路径: ' + ref);
      return;
    }
    const resolved = resolveLocal(baseDir, ref);
    if (!resolved) return;
    if (!fs.existsSync(resolved)) fail(file + ' -> 链接目标不存在: ' + ref);
  });
});

walkHtml(path.join(root, 'web端')).forEach((filePath) => {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const html = fs.readFileSync(filePath, 'utf8');
  extractRefs(html).forEach((ref) => {
    const resolved = resolveLocal(path.dirname(filePath), ref);
    if (!resolved) return;
    if (!fs.existsSync(resolved)) fail(rel + ' -> 链接目标不存在: ' + ref);
  });
});

if (!results.failed.some((f) => f.includes('链接目标不存在'))) pass('所有相对 href/src 目标文件存在');

const outPath = path.join(__dirname, 'package-check-results.json');
fs.writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  htmlCount: htmlFiles.length,
  passed: results.passed.length,
  failed: results.failed.length,
  failures: results.failed,
  htmlFiles: htmlFiles
}, null, 2));

console.log('\nResults -> scripts/package-check-results.json');

if (results.failed.length) {
  console.error('\nPACKAGE-CHECK FAILED (' + results.failed.length + ' issue(s))');
  process.exit(1);
}

console.log('ALL PACKAGE CHECKS PASSED');
process.exit(0);
