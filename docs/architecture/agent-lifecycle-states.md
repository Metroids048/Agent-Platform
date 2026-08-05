# 智能体生命周期：状态与卡片功能（v1.1）

> 运营平台卡片 `⋯` 菜单口径。点卡片主体 = 查看详情；审核通过/驳回 = 审核工作台。

## 状态 × 说明 × 功能卡片

| 状态 | 说明 | 功能卡片 |
| --- | --- | --- |
| 草稿 | 未对外，配置未完成或驳回后修改中 | 删除 |
| 审核中 | 已提交发布申请，等审批 | 撤回、删除 |
| 已上架 | 已对目标范围用户可用 | 停用、下架、权限 |
| 已停用 | 暂停用户访问，版本和范围保留，可再次启用 | 启用、下架、删除 |
| 已下架 | 已从用户可用入口移除，但历史记录保留 | 重新发布、删除 |
| 已驳回 | 审核未通过，需修改后再发布或删除 | 重新发布、删除 |

**补充规则**

- 第三方智能体：已上架卡片不含「权限」。
- 可见范围：个人免审直接上架；组织/公开须审核（见 `Proto.requiresPublishAudit`）。

## 状态流转

**读图说明**

- **实线**：常规状态迁移（须审核或运营操作）
- **虚线**：个人范围发布/重新发布，**免审**直达已上架
- **删除**：草稿、审核中、已驳回、已停用、已下架均可删除（不单独画线，避免交叉）

```mermaid
flowchart TB
  start([创建 / 接入]) --> dev

  dev["<b>草稿</b><br/>删除"]
  rev["<b>审核中</b><br/>撤回 · 删除"]
  rej["<b>已驳回</b><br/>重新发布 · 删除"]
  list["<b>已上架</b><br/>停用 · 下架 · 权限"]
  dis["<b>已停用</b><br/>启用 · 下架 · 删除"]
  off["<b>已下架</b><br/>重新发布 · 删除"]

  dev -->|发布| rev
  dev -.->|个人·免审| list

  rev -->|通过| list
  rev -->|驳回| rej
  rev -->|撤回| dev

  rej -->|重新发布| rev
  rej -.->|个人·免审| list
  rej -->|修改后| dev

  list -->|停用| dis
  list -->|下架| off
  list -->|权限变更| rev

  dis -->|启用| list
  dis -->|下架| off

  off -->|重新发布| rev
  off -.->|个人·免审| list

  classDef draft fill:#f8fafc,stroke:#64748b,color:#334155
  classDef audit fill:#fffbeb,stroke:#d97706,color:#92400e
  classDef live fill:#ecfdf5,stroke:#059669,color:#065f46
  classDef pause fill:#f1f5f9,stroke:#475569,color:#334155

  class dev draft
  class rev,rej audit
  class list live
  class dis,off pause
```

## 实现归属

| 区域 | 文件 |
| --- | --- |
| v1.1 卡片菜单 | `prototype/assets/ops-v11-app.js` → `cardMenuItems` |
| 发布审核规则 | `prototype/assets/proto.js` → `requiresPublishAudit` / `runAgentPublish` |
| v1.0 列表标签 | `prototype/assets/proto.js` → `statusLabel` |
