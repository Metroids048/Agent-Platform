/**
 * Web 用户端 v1.1 契约检查
 * 以 0409 修改需求为优先级，覆盖旧用户端限制项。
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
let fail = 0;

function pass(msg) {
  console.log('PASS:', msg);
}

function failCheck(msg) {
  console.error('FAIL:', msg);
  fail += 1;
}

function assert(condition, msg) {
  if (condition) pass(msg);
  else failCheck(msg);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

console.log('=== web-portal-check ===\n');

const expectedPages = [
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

expectedPages.forEach((relPath) => {
  assert(exists(relPath), '页面存在 -> ' + relPath);
});

const indexHtml = read('web端/index.html');
const squareHtml = read('web端/agent-square.html');
const mySpaceHtml = read('web端/my-space.html');
const personalJs = read('assets/user-personal-space.js');
const chatJs = read('assets/user-chat-portal.js');
const bridgeJs = read('assets/user-portal-bridge.js');
const messageJs = read('assets/user-message-center.js');
const resolverJs = read('assets/user-agent-resolver.js');

assert((indexHtml.match(/id="btnScrollResume"/g) || []).length === 1, '对话页仅保留一个“回到底部”按钮');
assert(indexHtml.includes('回到底部'), '对话页滚动恢复文案为“回到底部”');
assert(indexHtml.includes('id="personalAgentPickerModal"'), '对话页存在个人智能体配置选择弹窗');
assert(indexHtml.includes('id="historySummaryModal"'), '对话页存在历史总结笔记弹窗');
assert(indexHtml.includes('id="btnSelectAllHistorySummary"'), '对话页历史总结支持全选轮次');
assert(indexHtml.includes('id="btnClearHistorySummary"'), '对话页历史总结支持清空选择');
assert(indexHtml.includes('id="historyAgentModal"'), '对话页存在保存个人智能体弹窗');
assert(indexHtml.includes('id="sourcePanel"'), '对话页存在原文侧栏');
assert(indexHtml.includes('id="turnNavigator"'), '对话页存在快速定位容器');
assert(indexHtml.includes('id="branchSwitcher"'), '对话页存在历史分支切换容器');
assert(indexHtml.includes('aria-label="对话快速定位"'), '快速定位 aria 已修正');
assert(indexHtml.includes('aria-label="历史分支切换"'), '分支切换 aria 已修正');
assert(indexHtml.includes('data-attach-action="file"'), '加号菜单保留上传文件');
assert(indexHtml.includes('data-attach-action="note"'), '加号菜单保留引用笔记');
assert(!indexHtml.includes('data-attach-action="voice"'), '加号菜单不包含语音入口');

assert(chatJs.includes('btnComposerPersonalAgent'), '对话脚本注入“添加个人智能体配置”入口');
assert(chatJs.includes('ensurePersonalAgentEntry'), '对话脚本存在个人智能体配置入口逻辑');
assert(chatJs.includes('personalAgentIds'), '对话脚本维护个人智能体配置上下文');
assert(chatJs.includes('openPersonalAgentPicker'), '对话脚本支持打开个人智能体配置选择器');
assert(chatJs.includes('resetComposerContext'), '对话脚本支持切换会话后清空上下文');
assert(chatJs.includes('PREVIEW_CACHE_KEY'), '对话脚本存在复杂预览缓存');
assert(chatJs.includes('previewBlockHtml'), '对话脚本支持复杂内容预览块');
assert(chatJs.includes('renderMarkdown'), '对话脚本支持 Markdown 渲染');
assert(chatJs.includes('branchStore'), '对话脚本支持历史分支存储');
assert(chatJs.includes('getBranchSnapshot'), '对话脚本导出当前分支快照供历史沉淀使用');
assert(chatJs.includes('startInlineEdit'), '对话脚本支持内联编辑');
assert(chatJs.includes('turnNavigator'), '对话脚本接入快速定位');
assert(chatJs.includes('sourcePanel'), '对话脚本接入原文查看');
assert(chatJs.includes('DeepSeek-V4-Flash 模型'), '对话脚本显示 DeepSeek 全名');
assert(chatJs.includes('DeepSeek-R1-671B 模型'), '对话脚本包含深度推理模型');

assert(personalJs.includes('proto_user_profile'), '个人空间脚本维护用户资料状态');
assert(personalJs.includes('profileOrgTypeSelect'), '个人空间脚本接入组织类型选择');
assert(personalJs.includes('profileSecondaryUnit'), '个人空间脚本接入二级单位字段');
assert(personalJs.includes('profileTertiaryUnit'), '个人空间脚本接入三级单位字段');
assert(personalJs.includes('btnSaveProfile'), '个人空间脚本接入保存设置按钮');
assert(personalJs.includes('data-edit-note'), '个人空间个人笔记支持手动编辑');
assert(personalJs.includes('noteEditModal'), '个人空间个人笔记编辑在弹窗中完成');
assert(personalJs.includes('prefDeepThinking'), '个人空间基础信息包含默认开启深度思考');
assert(personalJs.includes('prefKnowledgeBase'), '个人空间基础信息包含默认知识库');
assert(personalJs.includes('updateProfileFromAuth'), '个人空间脚本导出认证资料同步方法');
assert(personalJs.includes('data-show-personal-agent'), '个人空间草稿支持查看配置');
assert(personalJs.includes('由组织授权使用，不支持个人编辑'), '组织授权智能体不提供个人编辑能力');
assert(personalJs.includes('点击编辑将进入运营平台-智能体运营'), '我创建的智能体编辑入口说明跳转运营平台');
assert(!personalJs.includes('renderPersonalKb'), '个人空间脚本不再渲染个人知识库模块');
assert(!personalJs.includes('submitPersonalAgentToOps'), '个人空间脚本不再提交运营审核');
assert(!personalJs.includes('提交审核'), '个人空间脚本不再展示提交审核文案');
assert(!personalJs.includes('同步到运营平台'), '个人空间脚本不再展示同步运营文案');

assert(mySpaceHtml.includes('id="profileOrgTypeSelect"') || personalJs.includes('profileOrgTypeSelect'), '个人空间设置包含组织类型');
assert(mySpaceHtml.includes('id="noteEditModal"'), '个人空间存在个人笔记编辑弹窗');
assert(!mySpaceHtml.includes('个人知识库'), '个人空间已移除个人知识库模块');
assert(!mySpaceHtml.includes('偏好设置'), '个人空间已移除独立偏好设置面板');
assert(!mySpaceHtml.includes('id="mySettingsCard"'), '个人空间不再保留独立偏好设置容器');
assert(mySpaceHtml.includes('id="personalAgentDeleteConfirmModal"'), '个人空间保留个人智能体删除确认弹窗');
assert((mySpaceHtml.match(/id="personalAgentDeleteConfirmModal"/g) || []).length === 1, '个人空间仅保留一个个人智能体删除确认弹窗');

assert(bridgeJs.includes('data-history-agent'), '历史菜单支持保存个人智能体配置');
assert(bridgeJs.includes('data-summary-round'), '历史总结笔记支持多选轮次');
assert(bridgeJs.includes('btnSelectAllHistorySummary'), '历史总结笔记支持全选按钮事件');
assert(bridgeJs.includes('selectedSummaryRounds'), '历史总结笔记按已选轮次保存');
assert(bridgeJs.includes('aioq-agent-preparing-box'), '保存个人智能体 loading 与后续弹窗使用同尺寸容器');
assert(bridgeJs.includes('buildStandardSystemPrompt'), '历史沉淀会生成标准提示语');
assert(bridgeJs.includes('saveHistoryAgent'), '历史沉淀支持保存个人智能体配置');
assert(bridgeJs.includes('buildShortNoteSummary'), '历史沉淀支持精简笔记摘要');
assert(bridgeJs.includes('sourceConversationId'), '历史总结笔记带来源会话标识');

assert(messageJs.includes('ANNOUNCE_RULE_KEY'), '消息中心维护公告频控规则');
assert(messageJs.includes('ANNOUNCE_STATE_KEY'), '消息中心维护公告频控状态');
assert(messageJs.includes('shouldShowAnnouncement'), '消息中心实现公告频控判断');
assert(messageJs.includes('openAnnouncementModal'), '消息中心支持打开公告弹窗');
assert(messageJs.includes('after_update'), '消息中心支持更新后再次弹出策略');

assert(resolverJs.includes('loadSessionDraftAgents'), '智能体解析器合并会话沉淀草稿');
assert(resolverJs.includes('isSessionDraft'), '智能体解析器保留草稿标识');

[
  'assets/user-chat-portal.js',
  'assets/user-personal-space.js',
  'assets/user-portal-bridge.js',
  'assets/user-message-center.js',
  'assets/user-agent-resolver.js'
].forEach((relPath) => {
  try {
    execSync('node --check "' + path.join(root, relPath) + '"', { stdio: 'pipe' });
    pass('语法检查 -> ' + relPath);
  } catch (error) {
    failCheck('语法检查失败 -> ' + relPath);
  }
});

if (fail) {
  console.error('\nWEB-PORTAL-CHECK FAILED (' + fail + ' issue(s))');
  process.exit(1);
}

console.log('\nWEB-PORTAL-CHECK PASSED');
