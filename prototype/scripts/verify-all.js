/**
 * 一键验收：smoke + e2e + regression
 */
const { execSync } = require('child_process');
const path = require('path');

const scriptsDir = __dirname;
const steps = [
  ['package-check.js', '打包完整性（35 页 + 链接）'],
  ['smoke-check.js', '静态与语法门禁'],
  ['e2e-check.js', '主路径逻辑契约'],
  ['regression-check.js', 'Proto 运行时 + Skills 回归'],
  ['browser-check.js', '关键页 DOM 回归（需 jsdom）'],
  ['navigation-journey-check.js', '导航旅程 index↔05 二次进入'],
  ['ops-interaction-journey-check.js', '运营平台交互旅程 UF/EW/PM/MC/AR'],
  ['web-portal-check.js', 'Web 用户端专项契约'],
  ['v11-ops-check.js', 'v1.1 默认运营入口专项']
];

const figmaVerifyPs1 = path.join(scriptsDir, '..', '..', 'scripts', 'verify-figma-mcp.ps1');

let fail = 0;
console.log('=== prototype verify-all ===\n');

steps.forEach(function (pair) {
  const file = pair[0];
  const label = pair[1];
  console.log('--- ' + label + ' (' + file + ') ---');
  try {
    execSync('node "' + path.join(scriptsDir, file) + '"', { stdio: 'inherit' });
  } catch (e) {
    fail++;
  }
  console.log('');
});

if (require('fs').existsSync(figmaVerifyPs1)) {
  console.log('--- Figma MCP 双通道（配置 + Desktop 可选） (verify-figma-mcp.ps1) ---');
  try {
    execSync(
      'powershell -ExecutionPolicy Bypass -File "' + figmaVerifyPs1 + '"',
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.error('WARN: Figma MCP 检查未完全通过（Desktop 未开时常见，不阻断 verify-all）');
  }
  console.log('');
}

if (fail) {
  console.error('VERIFY-ALL FAILED (' + fail + ' step(s))');
  process.exit(1);
}
console.log('VERIFY-ALL PASSED (package-check + smoke + e2e + regression + browser-check + navigation-journey + ops-interaction-journey + web-portal + v11-ops)');
