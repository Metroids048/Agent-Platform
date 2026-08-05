const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

let fail = 0;
function err(msg) {
  console.error(msg);
  fail++;
}

const checks = [
  ['06-dev-editor.html', ['devEditorRoot', '返回运营平台', 'initFirstConfig', 'draftPrompt', 'btnPublish', '智能体画像', '预览与调试', '最后修改时间', 'btnHistory', '发版描述'], ['保存并返回运营平台', 'startCountdown']],
  ['04-create-modal.html', ['返回列表', '进入开发平台配置', 'updateSuccessLinks', '06-dev-editor.html', 'closeOpsEmbedModal', "get('embed')"], ['startCountdown', '秒后进入', 'Math.random()']],
  ['05-agent-detail.html', ['前往开发平台', 'initCrossLinks', 'editNameModal', 'confirmPublish', 'refreshStateUi', '基本信息', '运行数据', '版本与发布', 'rejectionBanner'], ['tab-config', 'first-config-banner', 'bindAutoSave', 'saveDraft(true)', 'initAgentDetailPage', 'btnHistory', '版本记录']],
  ['index.html', ['ops-v11-app.js', 'ops-list-modals.js', 'ops-modal-create.js', 'ops-modal-thirdparty.js', 'opsModalOverlay', 'createModalShell', 'data-ops-module', 'ops-platform-shell.js', 'org-access-picker.js', 'ops-v11.css', 'id="pageMain"'], []],
  ['assets/ops-v11-app.js', ['data-open-create', 'data-open-third', 'OpsListModals', 'isAgentFirstPublish'], []],
  ['assets/proto.js', ['initAgentDetailPage', 'initOpsListPage', 'initCrossLinks', 'wireDevPlatformRows', 'wireAgentListRows', 'wireAgentListActions', 'buildAgentListActionsHtml', 'hasStoredState', 'resolveAgentListStatus', 'getAuditItem', 'renderAuditStepper', 'ensureDemoAuditQueue', 'hrefAuditReview', 'isFirstPublish', 'isFirstConfig()', 'wirePlaceholderLinks', 'applyPickedResources', 'openSkillBindModal', 'resolveFirstConfigMode', 'showModal', 'hideModal'], ["boundSkillIds: ['sk_report', 'sk_legacy']", '__protoSkillBindWired']],
  ['assets/editor-shell.js', ['bindSegmented', 'initDevEditorPage'], []],
  ['02-sequence-create.html', ['06-dev-editor.html?new=1', 'wireFlowMapLinks'], ['05-agent-detail.html?new=1']],
  ['assets/agent-core-config.js', ['GPT-4o mini'], ['disabled>']],
  ['assets/style.css', ['mode-setup .tabs-extended'], []],
  ['../design/figma.config.json', ['"mcp"', 'agentRouting', 'figma-desktop'], []],
  ['../scripts/resolve-figma-screen.js', ['resolve-figma-screen', 'figma.config.json'], []],
  ['audit-workbench.html', ['ops-v11-app.js', 'data-ops-page="audit-workbench.html"', 'data-ops-module="audit"'], []],
  ['audit-review.html', ['ops-v11-app.js', 'audit-review.html', 'data-ops-module="audit"'], []],
  ['agent-detail.html', ['05-agent-detail.html', 'location.replace'], []],
  ['dashboard.html', ['ops-v11-app.js', 'dashboard.html', 'ops-list-dashboard.js'], []],
  ['08-audit-expert.html', ['auditExpertTitle', 'btnRejectExpert', 'rejectReasonModal', 'confirmRejectExpert', 'OpsAuditExpert', 'btnAuditMore', 'audit-workbench.html'], []],
  ['08-audit-queue.html', ['旧页面/08-audit-queue.html'], []],
  ['08-audit-review.html', ['旧页面/08-audit-review.html'], []],
  ['08-audit-status.html', ['statusStepper', 'breadcrumbDetail', '05-agent-detail.html', '审核进度'], ['旧页面/08-audit-status.html']],
  ['11-user-feedback.html', ['feedbackListBody', 'OpsUserFeedback', 'ops-user-feedback.js', 'ops-message-center.js', 'ops-context-menu.js', 'feedbackTrendChart', 'ops-module-title', 'ops-pagination-figma'], []],
  ['11-user-feedback-detail.html', ['feedbackProcessModal', 'btnDispatchTeam', 'btnProcessFeedback', 'processExtraFields', 'processDynamicPanel', 'confirmProcessFeedback', 'fbHeroTitle', 'feedbackOriginalBody', 'attachList', 'processTimeline', 'fbPriority', 'ops-dispatch.js'], []],
  ['12-expert-workbench.html', ['expertMyTasksBody', 'expertPoolBody', 'ops-expert-workbench.js', 'data-ops-tab', 'expertSubTabs', 'poolFilterBar'], []],
  ['12-expert-task-detail.html', ['btnViewContext', 'btnApplyDelay', 'taskTitle', 'taskExpert'], []],
  ['13-permission-mgmt.html', ['devListBody', 'btnAddDeveloper', 'deleteConfirmModal', 'OpsPermissionMgmt', 'permModuleTabs'], []],
  ['13-permission-view.html', ['peakIndicator', 'viewerTip', 'OpsPermissionMgmt'], []],
  ['09-user-chat.html', ['userChatRoot', 'aioq-sidebar', 'agentList', 'chatInput', 'sessionSkillToggle', 'aioq-suggest-hint', 'sourcePanel', 'chatFeedbackModal', 'UserChatPortal.init', 'assets/user-chat-portal.js'], ['审核队列', '任务派发表', '开发者权限表', 'assetList', 'btnRequestExpert', 'userMessageDrawer', 'btnPermission', 'capabilityPanel', 'btnCapability', 'modelMenu']],
  ['assets/user-chat-portal.js', ['proto_user_chat_state', 'UserChatPortal', 'renderAgentList', 'sendChat', 'buildAnswer', 'aioq-suggest-chip', 'MODEL_TIERS', 'btnModel', 'modelMenu'], ['proto_user_portal_state', 'proto_ops_feedback', 'proto_ops_tasks', 'proto_ops_developers', 'requestExpert', 'submitFeedback', 'renderCapabilityPanel', 'renderAgentDetailDrawer']],
  ['assets/ops-platform-shell.js', ['OpsShell', 'initShell', 'openModal', 'renderLayout'], []],
  ['assets/ops-message-center.js', ['OpsMessageCenter', 'opsMessageDrawer'], []],
  ['assets/ops-context-menu.js', ['OpsContextMenu', 'wireRowActions'], []],
  ['assets/ops-dispatch.js', ['OpsDispatch', 'dispatchTeamModal'], []],
  ['assets/ops-user-feedback.js', ['OpsUserFeedback', 'initListPage'], []],
  ['assets/ops-expert-workbench.js', ['OpsExpertWorkbench', 'initWorkbenchPage', 'addToAudit'], []],
  ['assets/ops-permission-mgmt.js', ['OpsPermissionMgmt', 'initListPage'], []],
  ['assets/ops-audit-expert.js', ['OpsAuditExpert', 'initAuditExpertPage'], []],
  ['assets/platform-api.js', ['PlatformApi', 'syncCreateAgent', 'getAvailableResources', 'syncConfig', 'startChat', 'reportMetrics'], []],
  ['assets/ops-feedback-loop.js', ['OpsFeedbackLoop', 'createTaskFromFeedback', 'createWorkOrderFromTask', 'proto_ops_work_orders'], []],
  ['assets/ops-dashboards.js', ['OpsDashboards', 'initBusinessPage', 'initModelPage'], []],
  ['14-business-dashboard.html', ['dashKpis', 'dashWorkOrders', 'OpsDashboards', 'ops-dashboards.js'], []],
  ['14-model-dashboard.html', ['dashKpis', 'dashTiers', 'OpsDashboards'], []],
  ['14-resource-dashboard.html', ['dashKpis', 'dashPools', 'OpsDashboards'], []],
  ['14-user-agent-profile.html', ['dashKpis', 'dashSegments', 'OpsDashboards'], []],
  ['third-party-register.html', ['第三方智能体接入', '生成凭证', '接入凭证已生成', 'pendingAgentId', 'credApiKey', 'upstreamApiKey', 'onThirdPartyRegistered', 'closeOpsEmbedModal', "get('embed')"], ['Math.random()', 'credAgentId']],
  ['03-agent-center.html', ['index.html'], []],
];

for (const [file, must, mustNot] of checks) {
  const t = read(file);
  for (const m of must) {
    if (!t.includes(m)) err('MISSING ' + file + ' → ' + m);
  }
  for (const m of mustNot) {
    if (t.includes(m)) err('UNWANTED ' + file + ' → ' + m);
  }
}

const editor = read('06-dev-editor.html');
if (!editor.includes('class="dev-col"')) err('MISSING 06-dev-editor.html static dev-col');

const index = read('index.html');
if (/href="05-agent-detail\.html"/.test(index) && !index.includes('ops-v11-app.js')) {
  err('UNWANTED index.html bare 05 href without v1.1 shell');
}
if (index.includes('initOpsListPage')) {
  err('UNWANTED index.html still references initOpsListPage');
}
if (/flow-map|端到端流程/.test(index)) {
  err('UNWANTED index.html contains dev-only flow map section');
}
const dashJs = read('assets/ops-list-dashboard.js');
if (/renderQuickLinks[\s\S]*新建智能体/.test(dashJs)) {
  err('UNWANTED ops-list-dashboard.js renderQuickLinks still contains 新建智能体');
}

var userChatHtml = read('09-user-chat.html');
['Qwen', 'OpenAI', 'GPT-4'].forEach(function (brand) {
  if (userChatHtml.indexOf(brand) >= 0) err('UNWANTED 09-user-chat.html exposed brand → ' + brand);
});
var userChatJs = read('assets/user-chat-portal.js');
if (!/DeepSeek-V4-Flash 模型/.test(userChatJs)) {
  err('MISSING user-chat-portal.js → DeepSeek 原版模型列表');
}
if (/MODELS\s*=\s*\[[^\]]* Model/.test(userChatJs)) {
  err('UNWANTED user-chat-portal.js → MODELS 含英文 Model 后缀');
}
if (/MODELS\s*=\s*\[[^\]]*标准模型/.test(userChatJs)) {
  err('UNWANTED user-chat-portal.js → MODELS 仍为中文四档');
}

const proto = read('assets/proto.js');
if (!/function wireDevPlatformRows\(\)/.test(proto)) {
  err('MISSING assets/proto.js → function wireDevPlatformRows()');
}
if (!/function wireStandardLinks\(\)/.test(proto)) {
  err('MISSING assets/proto.js → function wireStandardLinks()');
}
try {
  require('child_process').execSync('node --check "' + path.join(root, 'assets/proto.js') + '"', { stdio: 'pipe' });
} catch (e) {
  err('SYNTAX ERROR assets/proto.js');
}
[
  'ops-platform-shell.js',
  'ops-message-center.js',
  'ops-dispatch.js',
  'ops-user-feedback.js',
  'ops-expert-workbench.js',
  'ops-permission-mgmt.js',
  'ops-v11-app.js',
  'user-chat-portal.js'
].forEach(function (f) {
  try {
    require('child_process').execSync('node --check "' + path.join(root, 'assets', f) + '"', { stdio: 'pipe' });
  } catch (e) {
    err('SYNTAX ERROR assets/' + f);
  }
});
if (!/isFirstConfig\(\) && tab !== 'config'/.test(proto)) {
  err('MISSING proto.js bindTabs first-config guard');
}

const htmlFiles = fs.readdirSync(root).filter(function (f) { return f.endsWith('.html'); });
const businessPages = htmlFiles.filter(function (f) {
  return ![
    '01-architecture.html',
    '02-sequence-create.html',
    'figma-skills-board.html',
    '03-agent-center.html',
    '08-agent-monitor.html',
    '08-audit-queue.html',
    '08-audit-review.html',
    '08-audit-status.html'
  ].includes(f);
});
businessPages.forEach(function (f) {
  const t = read(f);
  if (!t.includes('assets/proto.js')) err('MISSING proto.js in ' + f);
});

console.log(fail ? 'FAILED ' + fail : 'ALL CHECKS PASSED');
process.exit(fail ? 1 : 0);
