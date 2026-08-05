# SESSION — Agent Platform

> 人类可读的会话摘要。权威细节见 [.github/agent/memory/project-memory.md](.github/agent/memory/project-memory.md)。任务结束同步更新本节。

Last updated: 2026-07-06

## Current Status

HTML 原型 + Skills 库；运营 v1.1 与 Web 用户端 v1.1/v2 并行维护。
本轮完成 `docs/敖钦AI中台总体建设方案_优化版.docx`，原文件保留不覆盖。
新增两张高清图：`docs/assets/aoqin_ai_midplatform_overview.png` 与 `docs/assets/aoqin_ai_midplatform_flow.png`。
文档主线调整为用户端、智能体开发、运营治理、知识/模型/资源/系统底座的全平台闭环。
已用 Word COM 只读打开优化版并导出 PDF 验证；输出为 7 页、7 张表、2 张嵌入图。
本轮未改 prototype 运行时代码，无需跑 `node prototype/scripts/verify-all.js`。

## 已完成

- 三端全局 Engineering Assistant Charter（~/.claude/AGENTS.md SSOT）
- Cursor rule diet：ECC common-* 改为按需加载
- Codex persistent_instructions + reasoning medium
- `skills/curated/` 十分类路由目录 + `task-intake-bridge`
- tri-end hooks / sync 脚本切换到 category-first routing
- clarification hard gate 从默认 bypass 改为默认启用

## 进行中

- 重启 Cursor / Claude Code / Codex 会话，让新 hooks 与 hard gate 在交互侧完全生效

## 遗留问题

- 见 project-memory / postmortem 系列

## 下次从哪开始

- 读 `AGENTS.md` + `SESSION.md` + `.github/agent/memory/task-history.md`
- 改 prototype 后跑 `node prototype/scripts/verify-all.js`
