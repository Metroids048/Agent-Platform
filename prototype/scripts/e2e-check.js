/**
 * 轻量 E2E 逻辑验收（Node，不启浏览器）
 * 验证五条主路径所依赖的关键实现是否存在且一致
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

let fail = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    fail++;
  } else {
    console.log('PASS:', msg);
  }
}

const proto = read('assets/proto.js');
const index = read('index.html');
const detail = read('05-agent-detail.html');
const devEd = read('06-dev-editor.html');
const create = read('04-create-modal.html');
const audit = read('audit-workbench.html');
const v11App = read('assets/ops-v11-app.js');

// 1. 创建 → 首次配置 Tab
assert(create.includes('configPageUrl') && create.includes('new=1'), '创建成功链到 ?new=1 配置页');
assert(
  index.includes('ops-v11-app.js') && index.includes('id="pageMain"') &&
    index.includes('data-ops-module'),
  '列表页挂载 v1.1 壳与脚本'
);
assert(read('assets/ops-modal-create.js').includes('进入开发平台配置'), '内嵌新建弹窗逻辑');
assert(read('assets/ops-modal-thirdparty.js').includes('data-tp-upstream'), '内嵌第三方弹窗含 upstream 密钥');
assert(proto.includes('isFirstConfig() && tab !== \'config\'') || proto.includes('isFirstConfig() && tab !== "config"'),
  'bindTabs 首次配置守卫');
assert(read('assets/style.css').includes('mode-setup .tabs-extended'), '首次配置隐藏 extended Tab');

// 2. 运营页职责精简：配置已迁移到开发平台，运营页不再包含配置编辑器
assert(!detail.includes('tab-config') && !detail.includes('promptText'), '运营页已移除配置编辑器');
assert(detail.includes('前往开发平台'), '运营页保留前往开发平台入口');

// 3. 开发页读写 draftPrompt（首配模式）
assert(devEd.includes('initFirstConfig') && devEd.includes('draftPrompt'), '开发页支持首次配置与 draftPrompt 读写');

// 4. 发布审核
assert(detail.includes('pmPublishMeta') && detail.includes("openPublishModal('scope')") && detail.includes('pmModalTitle'), '运营发布弹窗支持修改可见范围（仅范围区）');
assert(detail.includes('pmReleaseNote') && detail.includes('runAgentPublish') && detail.includes('isFirstPublish'), '运营发布弹窗含完整发布与审核流程');
assert(read('assets/proto.js').includes('syncOpsV11FromState'), 'Proto 状态变更同步 v1.1 卡片列表');
assert(proto.includes('function isFirstPublish'), 'Proto.isFirstPublish 首次发布判断');
assert(v11App.includes('isAgentFirstPublish'), 'v1.1 发布弹窗区分首次/再次发布');
assert(audit.includes('ops-v11-app.js') && v11App.includes('renderAudit'), '审核工作台由 v1.1 渲染');
assert(v11App.includes('audit-review.html'), 'v1.1 审核详情页路径');

// 5. 列表上下文
assert(v11App.includes('agent-grid') && v11App.includes('agent-card'), 'v1.1 卡片列表结构');
assert(proto.includes('agt_contract'), 'DEMO 含合同审查师 id');
const demos = (proto.match(/DEMO_LIST_AGENTS = \[([\s\S]*?)\];/) || [])[1] || '';
assert((demos.match(/\{ id:/g) || []).length >= 8, 'DEMO_LIST_AGENTS 至少 8 条');

assert(v11App.includes('navigateToAgentDetail') && v11App.includes("05-agent-detail.html"), 'v1.1 卡片详情路由指向 05-agent-detail');
assert(read('agent-detail.html').includes('05-agent-detail.html'), 'agent-detail 重定向至 05');

console.log(fail ? '\nE2E CHECK FAILED ' + fail : '\nALL E2E CHECKS PASSED');
process.exit(fail ? 1 : 0);
