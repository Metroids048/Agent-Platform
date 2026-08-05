# Agent Platform

智能体运营/开发双平台 — **HTML 原型 + AI 工程护栏**。

## 给他人看页面（独立交付包）

**可 zip 交付的文件夹：** [`prototype/`](prototype/)

```powershell
cd prototype
.\start.ps1
```

浏览器打开 http://127.0.0.1:8766/index.html — 16 个页面、全部交互，无需仓库其他目录。

详见 [`prototype/README.md`](prototype/README.md) 与 [`prototype/docs/PAGES.md`](prototype/docs/PAGES.md)。

---

## 开发者

| 用途 | 命令 |
|------|------|
| 原型验证 | `node prototype/scripts/verify-all.js` |
| 打包检查 | `node prototype/scripts/package-check.js` |
| AI 规则 | [`AGENTS.md`](AGENTS.md) |
| 导航事故复盘 | [`.github/agent/memory/postmortem-navigation-2026-05-28.md`](.github/agent/memory/postmortem-navigation-2026-05-28.md) |
| 同步全局护栏 | `powershell scripts/sync-ai-guardrails.ps1 -Force` |
| 可选 git hook | `git config core.hooksPath .githooks`（改 prototype 提交前跑 verify-all） |

---

## 仓库结构

| 路径 | 说明 |
|------|------|
| `prototype/` | **产品原型**（16 HTML + assets + 验证脚本） |
| `design/` | Figma 工作流（非运行页面必需） |
| `.cursor/`、`AGENTS.md` | AI 工程约束 |
| `skills/` | PM / 第三方 Skill 库（非产品 UI） |
