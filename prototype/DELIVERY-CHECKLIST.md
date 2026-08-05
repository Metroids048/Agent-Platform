# 原型交付验收清单

生成时间：2026-05-29（更新：全站 18 页路径审计 + 旅程 F–K）  
范围：`prototype/` 下 **18** 个 HTML 页面

## 事故记录（2026-05-28）

| 项 | 说明 |
|----|------|
| 现象 A | Skills 管理页表格空白 |
| 根因 A | 审查时误改 `assets/proto.js`，`wireDevPlatformRows()` 函数头丢失 → **JS 语法错误**，全站 `Proto` 未加载 |
| 现象 B | 直接开 05 正常；回列表再进 Skills 空、`+` 无响应、Tab 像死了 |
| 根因 B | `__protoSkillBindWired` 跨页泄漏 + session `firstConfig` 粘住 + 05 init 分散 + `params.get` 笔误 |
| 修复 | ADR-003：`initAgentDetailPage` 统一 bootstrap；`navigation-journey-check.js`；见 `scripts/journey-audit-matrix.json` |
| 教训 | 改共享 JS 后必须跑 `verify-all`（含导航旅程），不能只看 grep PASS |

## 回归门禁（改 proto.js 后必跑）

```bash
cd prototype
npm install jsdom --no-save   # 首次运行 browser-check 需要
node scripts/verify-all.js
```

`verify-all.js` 依次执行：

0. `package-check.js` — **18 页 + 相对链接/资源完整性**（打包前必跑）
1. `smoke-check.js` — 静态契约 + `node --check` 语法
2. `e2e-check.js` — 五条主路径逻辑
3. `regression-check.js` — **vm 加载 Proto**，断言 `getSkillCatalog() >= 6`
4. `browser-check.js` — 关键页 DOM 回归（jsdom）
5. `navigation-journey-check.js` — **旅程 A–K**（index↔05、列表操作、审核链、dev 返回、pick 回写、首配链回归）

预期：`VERIFY-ALL PASSED`

结果文件：`scripts/package-check-results.json`、`scripts/browser-check-results.json`、`scripts/navigation-journey-results.json`、`scripts/journey-audit-matrix.json`

## 独立交付包（zip prototype/）

他人仅解压 `prototype/` 文件夹即可预览：见 [README.md](README.md)，运行 `start.ps1` / `start.sh`，打开 http://127.0.0.1:8766/index.html 。打包前 `npm run package-check` 须 PASS。

## 你只需约 5 分钟 spot-check（P0 主链）

| 步骤 | 页面 / 操作 | 预期 |
|------|-------------|------|
| 1 | 冷启动 `index.html` → 点任意卡片 → `agent-detail.html` → 返回 index | 卡片筛选、菜单、详情可进 |
| 2 | 侧栏 **审核工作台** → 去审核 → `audit-review.html` | 审核通过即上架 |
| 3 | 直接开 `05-agent-detail.html?id=agt_demo_001` | Skills 有标签，`+` 弹窗，Tab 可切换 |
| 4 | 回 `index.html` 再开 05（或从 agent-detail 进开发配置再回） | **与步骤 3 一致**（ADR-003） |
| 5 | 新建 modal → 进入开发平台 → 保存返回列表 | 新行出现；遮罩已关 |
| 6 | `10-skills-management.html` | 表格有 6 条 Skill |
| 7 | `08-agent-monitor.html?id=agt_demo_001` | 落到 05 运行数据 Tab |

步骤 1–2、5、7 为全站审计新增；3–4、6 为原有关键回归。其余页面见 `scripts/journey-audit-matrix.json` 的 `pageAudit`。

---

## 逐页审计矩阵

| 页面 | 原状态 | 等级 | 修复项 | 修复后 |
|------|--------|------|--------|--------|
| index.html | FAIL | Critical | 列表 8 行裸链、流程图首次配置链错 | PASS |
| 01-architecture.html | PASS* | Low | 侧栏占位 | PASS*（占位已 toast） |
| 02-sequence-create.html | FAIL | Medium | 首配链仍指向 05?new=1 | PASS（06-dev-editor + wireFlowMapLinks） |
| 08-audit-review.html | — | P0 | 审核中间页 | PASS（linkStatus Proto.href） |
| third-party-register.html | — | P1 | goDetail 裸链 | PASS（Proto.href） |
| 03-agent-center.html | FAIL | Medium | 过时副本 | PASS（重定向 index） |
| 04-create-modal.html | PASS* | Critical | 随机 15% 失败 | PASS |
| 05-agent-detail.html | FAIL | Critical | pick 不写状态、编辑名链新建、Tab 未限制、**导航二次进入 Skills/Tab 失效** | PASS（initAgentDetailPage + ADR-003） |
| 06-dev-editor.html | PASS* | Medium | 保存不写 state | PASS |
| 06-dev-platform.html | PASS* | Medium | 筛选装饰 | PASS*（占位） |
| 06-dev-resources.html | PASS* | Medium | 操作 toast-only | PASS* |
| 07-pick-resource.html | FAIL | Critical | Skill 确认不持久化 | PASS（skills 重定向 + pick 参数） |
| 08-agent-monitor.html | PASS* | Low | 重定向 stub | PASS |
| 08-audit-status.html | PASS* | Medium | 裸链 | PASS* |
| 08-audit-queue.html | PASS* | Medium | demo 掩盖空态、approve 缺 type | PASS |
| 09-user-chat.html | PASS* | Low | 无发布门禁 | PASS*（原型可接受） |
| 10-skills-management.html | PASS | — | proto 语法事故 | PASS（回归已覆盖） |
| figma-skills-board.html | PASS* | — | 聚合板 | PASS* |

\* = 主路径可用，非核心交互为占位

## Critical 修复对照

| # | 问题 | 修复 |
|---|------|------|
| C1 | 列表「查看」全进同一 agent | `Proto.wireAgentListRows()` + `DEMO_LIST_AGENTS` |
| C2 | pick 确认不持久化 | `applyPickedResources` + skills 页重定向 skillBind |
| C3 | 首次配置 Tab 未限制 | CSS 隐藏 + `bindTabs` 守卫 |
| C4 | 修改名称链到新建 | `editNameModal` 内联编辑 |
| C5 | 创建随机失败 | 移除 `Math.random()`，仅 `?fail=1` |
| C6 | 回列表再进 05 Skills 空 / + 失效 / Tab 挡 | `initAgentDetailPage` + 移除 `__protoSkillBindWired` + `resolveFirstConfigMode` |

## Medium 修复对照

| # | 问题 | 修复 |
|---|------|------|
| M1 | 侧栏 `#` 无反馈 | `wirePlaceholderLinks()` |
| M2 | 03-agent-center 过时 | 重定向 `index.html` |
| M4 | dev 保存假 | `saveDev()` 写 `draftPrompt` |
| M5 | 审核队列 demo 注入 | 移除，空态显示 |
| M6 | 默认 sk_legacy | 从 `defaultState` 移除 |
| M7 | initCrossLinks 未调用 | index / 05 / 06 接入 |
| M8 | 流程图首次配置链错 | `06-dev-editor.html?new=1`（JAM-014） |
| M9 | dev-editor init 分散 | `EditorShell.initDevEditorPage` |
| M10 | bindTabs 重复监听 | `#agentTabs` 事件委托 |
| M11 | 创建成功跳转遮罩残留 | close 后再 navigate |
| M12 | 列表 init 分散 | `Proto.initOpsListPage` |

## 五条主路径验收

| # | 路径 | 结果 | 验证方式 |
|---|------|------|----------|
| 1 | 创建 → 进入配置 → 仅配置 Tab | PASS | CSS + bindTabs + browser-check |
| 2 | 改 prompt → 自动/手动保存 → 刷新保留 | PASS | draftPrompt sessionStorage |
| 3 | 配置 ↔ 开发平台 prompt 同步 | PASS | 06 loadDraft + saveDev |
| 4 | 全公司发布 → 审核队列 → 进度 | PASS | addToAuditQueue + 08 空态 |
| 5 | 列表「合同审查师」带 id/name | PASS | wireAgentListRows + browser-check |

## 关键页 DOM 回归（browser-check.js）

| 检查项 | 结果 |
|--------|------|
| Skills 列表 ≥6 行 | PASS |
| 列表页 wire 后合同审查师链接 | PASS |
| 配置页 Tab 可见 | PASS |
| 首次配置隐藏 extended Tab（CSS） | PASS |
| 审核队列页可加载 | PASS |
| 审核详情页 DOM + getAuditItem | PASS |
| buildAgentListActionsHtml 状态列 | PASS |

## 导航旅程回归（navigation-journey-check.js）

| 检查项 | 结果 |
|--------|------|
| 旅程 A–E：05 二次进入 / firstConfig / publishModal / dev 链接 | PASS |
| 旅程 F：index 列表操作列 | PASS |
| 旅程 G：审核链 getAuditItem / hrefAuditReview | PASS |
| 旅程 H：dev-editor 返回运营 href | PASS |
| 旅程 I：pick skills 回写 | PASS |
| 旅程 J：monitor 重定向 | PASS |
| 旅程 K：02-sequence 首配链 | PASS |
| bindTabs data-tabs-wired | PASS |

同类问题审计：`scripts/journey-audit-matrix.json`（18 页 `pageAudit`；Medium 5/5 已修；Low open：JAM-010 figma 板）

Debug 模式：任意业务页加 `?debug=1`，控制台输出未绑定占位的 `#` 链接。

---

## 全局 AI 工程约束（2026-05-28）

双层安装：**项目内** + **全局**（Cursor / Codex / Claude Code）。

| 层级 | 路径 | 作用 |
|------|------|------|
| 项目规范 | `AGENTS.md`, `CLAUDE.md` | AI 工程操作规则 + PDCA |
| 项目记忆 | `.github/agent/memory/*.md` | 长期事实 / ADR / 任务日志 |
| Cursor Rules | `.cursor/rules/*.mdc` → `~/.cursor/rules/` | 强制验证、禁止假完成 |
| Skills 封装 | `.cursor/skills/{ai-coding-ok,agent-verifier,ouro-loop,ai-delivery-gate}` | 交付前门禁 |
| Vendor 源 | `skills/vendor/` | ai-coding-ok、agent-verifier、eins78-agent-skills |
| 同步脚本 | `scripts/sync-ai-guardrails.ps1` | 镜像 rules/skills 到 `~/.cursor`、`~/.codex`、`~/.claude` |

**改共享 JS 后必跑**（与上文回归门禁相同）：

```bash
node prototype/scripts/verify-all.js
```

**同步全局约束**（换机或更新后）：

```powershell
powershell scripts/sync-ai-guardrails.ps1 -WhatIf   # 预览
powershell scripts/sync-ai-guardrails.ps1           # 执行
```

**交付 Skill**：声称完成前 Read `ai-delivery-gate` + `verification-before-completion`，并附 fresh 命令输出。
