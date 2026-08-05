# User Memory (Global)

Last updated: 2026-06-03

> Cross-project facts, preferences, and workflow conventions. **Do not commit to git** — lives in `~/.ai-workspace/memory/`.

## Preferences

- Reply language: 简体中文 (unless user asks otherwise)
- Skills: global library at `~/.cursor/skills/`; match by description, Read full SKILL.md when applicable
- Token habits: short updates, no long log dumps; never skip verification to save tokens
- Tools: Cursor + Claude Code + Codex share hooks via `~/.ai-workspace/scripts/`
- **0→1 mode: strict** — 新模块/大范围「帮我做…」必须先方案+ADR+用户确认，再写代码；用户非技术，由 Agent 主动补 ADR/模块边界
- **Maximum permission:** 「最大权限」「全部解决」= 少来回确认、把**当前问题**修完 — **不等于**可删 CC Switch、清配置目录、跑卸载脚本；破坏性操作须先说明并获确认

## Global Workflow

1. SessionStart: Read `global-session-core` skill + this file before coding tasks
2. Coding tasks: ai-coding-ok PDCA — global memory first, project overlay if present
3. **0→1 chain (strict):** `zero-to-one-gate` → `brainstorming` → user approve → `writing-plans` or `planning-with-files-zh` → build → `global-delivery-gate`
4. Before claiming done: run detected verify commands (see `global-delivery-gate` skill)
5. After tasks: append `global-task-history.md` with `[project: path]` tag

## Lessons Learned (cross-project)

- Skills hooks must use `scan-global-skills.ps1`, not full catalog dump (saves tokens)
- JSON settings for RTK must be UTF-8 **without BOM**
- Re-run `rtk init -g --auto-patch` after updating Claude hooks
- Vibe coding「帮我做一个…」= 0→1 until proven otherwise — do not skip architecture for speed
- **2026-06-03:** Agent 误删 CC Switch 配置（用户未授权）— 「最大权限」仅图省事，禁止越权破坏性操作；见 ADR-G003 + `maximum-permission-scope.mdc`

## Active Projects

See `projects-registry.md` for path → alias mapping.
