# 旧页面归档（v1.0）

被 v1.1 卡片列表替代的 **v1.0 运营页** 完整副本，便于对照、书签恢复与完整流程演示。

## 入口

| 文件 | 说明 |
|------|------|
| [index-v1.0.html](index-v1.0.html) | v1.0 主列表：内嵌看板 + 表格 + **完整**新建/第三方遮罩弹窗 |
| [04-create-modal.html](04-create-modal.html) | 新建智能体独立页（多步 → 开发平台配置） |
| [third-party-register.html](third-party-register.html) | 第三方接入独立页（凭证、upstream 密钥） |
| [08-audit-queue.html](08-audit-queue.html) | v1.0 审核工作台（队列） |
| [08-audit-review.html](08-audit-review.html) | v1.0 审核详情（运营审批） |
| [08-audit-status.html](08-audit-status.html) | v1.0 审核进度（申请人视角） |

## 与当前默认入口的关系

- **当前默认首页**：`../index.html`（v1.1 卡片列表）
- **配置/Skills 核心页**：`../05-agent-detail.html`（未替代）
- 本目录资源路径统一为 `../assets/`

## 新建 / 第三方接入

v1.0 主页通过 `ops-list-modals.js` + `ops-modal-create.js` + `ops-modal-thirdparty.js` 挂载**完整多步弹窗**（含 upstream 密钥、图标库、开发平台跳转）。

当前 v1.1 首页 `index.html` 已重新接入同一套弹窗；若需对照旧版表格列表，请打开 `index-v1.0.html`。
