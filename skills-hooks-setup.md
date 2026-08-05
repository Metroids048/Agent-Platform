# Skills 全局配置（Cursor / Claude Code / Codex）

## 全局 AI 工作区（一次安装，所有项目零配置）

```
~/.ai-workspace/
├── memory/              # 全局 PDCA（user-memory, global-task-history, …）
├── scripts/             # hooks 运行时副本（canonical 源在 Agent Platform 仓库）
└── templates/rules/     # 护栏 rules 缓存
~/.claude/AGENTS.md      # 全局工程规则（新项目无 AGENTS.md 时使用）
~/.cursor/skills/        # 单源 skill 库
```

**一键安装（任意目录可跑）：**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\global-workspace\install-global-workspace.ps1"
```

或升级后刷新：

```powershell
powershell -File "$env:USERPROFILE\.ai-workspace\scripts\sync-from-repo.ps1"
```

**可选 — 团队仓库薄层 memory：**

```powershell
powershell -File "$env:USERPROFILE\.ai-workspace\scripts\init-project-memory.ps1" -ProjectName "MyApp"
```

仅创建 `.github/agent/memory/project-memory.md`，不复制 AGENTS/rules/scripts。

---

## 三套机制（2026-06-01 统一版）

| 工具 | Skills 匹配 | Always-on 核心 | Token 压缩 |
|------|-------------|----------------|------------|
| **Cursor** | `hooks.json` → `scan-global-skills.ps1` | `global-session-core` rule + SessionStart hook | `preToolUse` → `rtk hook cursor` |
| **Claude Code** | `settings.json` SessionStart + UserPromptSubmit | 同上 | `PreToolUse` → `rtk hook claude` |
| **Codex** | `hooks.json` SessionStart + UserPromptSubmit | 同上 | `AGENTS.md` + `RTK.md` 注入 |

单源 skill 库：`~/.cursor/skills/`（`~/.claude/skills` 目录联接指向此处）。

## 一键安装（推荐）

```powershell
# 全局工作区（memory + scripts + hooks + AGENTS）— 首选
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\global-workspace\install-global-workspace.ps1"

# 或仅 hooks（旧路径，仍可用）
cd "C:\Users\win\Desktop\Agent Platform"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hooks\install-global-skills-hooks.ps1 -UseJunctionForClaudeSkills -SkipSync
powershell -NoProfile -File .\scripts\hooks\sync-cursor-global-skills.ps1 -Force -Prune -AlsoClaude
powershell -NoProfile -File .\scripts\sync-ai-guardrails.ps1 -Force
```

将完成：

- 创建 `~/.ai-workspace/memory/` 四文件模板 + `projects-registry.md`
- 复制 hooks 到 `~/.ai-workspace/scripts/`；hook 路径指向该目录
- 安装 `scan-global-skills.ps1` 到 `~/.claude/scripts/` 与 `~/.cursor/hooks/`（备份副本）
- 注册 **三端** SessionStart / UserPromptSubmit hooks
- SessionStart 注入 `global-session-core` + **全局 memory 路径**
- 写入 `~/.claude/AGENTS.md`（全局规则）；项目 `AGENTS.md` 仍作 override
- 建立 `~/.claude/skills` → `~/.cursor/skills` 目录联接
- 同步 `global-session-core.mdc` 等到 `~/.cursor/rules/`
- 备份 `settings.json.bak`、`hooks.json.bak`

### RTK CLI（命令输出压缩，与 Skills 互补）

```powershell
# 安装 rtk.exe 到 ~/.local/bin 后：
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
rtk init -g --auto-patch
rtk init -g --agent cursor --auto-patch
rtk init -g --codex
rtk init --show
```

**Windows 限制**：原生 Windows 无 bash auto-rewrite；RTK 通过 CLAUDE.md/AGENTS.md + hook 注入。Shell 命令在 Cursor 可走 `preToolUse` → `rtk hook cursor`。

**注意**：`install-global-skills-hooks.ps1` 会重写 `settings.json` hooks；安装后需再跑 `rtk init -g --auto-patch` 以合并 PreToolUse。JSON 文件使用 **UTF-8 无 BOM**（RTK 解析要求）。

安装后 **重启** Cursor / Claude Code / Codex 会话。

## 三端避坑配置（2026-06-17）

Windows 重复技术问题（RTK/PowerShell/Python/spawn）与 Claude 第三方 API 缓存归零的根因是 **会话内 workaround 未持久化**。一键修复：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\global-workspace\install-global-workspace.ps1" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\sync-ai-guardrails.ps1" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\global-workspace\apply-tri-end-env.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\hooks\repair-tri-end-hooks.ps1"
rtk init -g --auto-patch
rtk init -g --agent cursor --auto-patch
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\win\Desktop\Agent Platform\scripts\global-workspace\verify-tri-end-config.ps1"
```

| 脚本 | 作用 |
|------|------|
| `repair-tri-end-hooks.ps1` | gate bypass + 完整 RTK Shell hook + 恢复 `hooks.json` |
| `apply-tri-end-env.ps1` | `CLAUDE_CODE_ATTRIBUTION_HEADER=0` 等三端 env |
| `ensure-python-env.ps1` | SessionStart 写 `~/.ai-workspace/runtime/python-env.json` |
| `verify-tri-end-config.ps1` | 校验 hooks/env/RTK/Python |

**全局规则：** `windows-agent-shell.mdc`（PowerShell/RTK/Python 契约）、`headroom-token-save.mdc`。

**勿再跑** `open-cursor-permissions.ps1`（除非刻意全开）；会覆盖 RTK hook。若只需 bypass gate，用 `repair-tri-end-hooks.ps1`。

**Claude + DeepSeek 缓存：** `CLAUDE_CODE_ATTRIBUTION_HEADER=0`（Claude Code ≥2.1.36 每轮 `cch` 变化会导致第三方 API 缓存命中归零）。`cc-sync-all.ps1` 已 preserve 该 env。

**DeepSeek 缓存二期：** 客户端 `15721` → CC Switch → `18789` 代理（tool 排序 + 剥 header）。见 `docs/tri-end-deepseek-cache-playbook-zh.md`。

**Node 项目交付：** `node-project-delivery.mdc`；`program1-main`/`demo1` 用 `npm run verify`；本仓原型用 `verify-all`。

## 更新 skill 库

1. 在仓库 `skills/` 中修改 skill（RTK agent skills 在 `skills/rtk/`，ui-ux 在 `skills/ui-ux/`）
2. 同步到全局：

```powershell
powershell -NoProfile -File .\scripts\hooks\sync-cursor-global-skills.ps1 -Force -Prune -AlsoClaude
```

3. 精炼/排除规则：[`scripts/hooks/skills-sync.config.json`](scripts/hooks/skills-sync.config.json)

## 全局扫描行为

[`scan-global-skills.ps1`](scripts/hooks/scan-global-skills.ps1)：

1. 遍历 `~/.cursor/skills`、`~/.claude/skills`、`~/.codex/skills`、当前项目 `skills/`
2. 写入 [`~/.claude/global-skills-index.md`](file:///C:/Users/win/.claude/global-skills-index.md)
3. **SessionStart**：注入 `alwaysOnSkills`（默认 `global-session-core`）+ **全局 memory 路径** + workflow 规则
4. **UserPromptSubmit**：关键词打分 Top 8 + 绝对路径
5. 要求 agent **Read 全文** 后再用其他工具

**不要**在 hook 中 dump 全库 catalog（旧版 `scan-project-skills` 已废弃）。

## Always-on 层（精简版）

| 层 | 文件 | 作用 |
|----|------|------|
| Skill | `~/.cursor/skills/global-session-core/SKILL.md` | 路由 + 省 token 习惯 + 完成前验证 |
| Skill | `~/.cursor/skills/global-delivery-gate/SKILL.md` | 动态探测 verify 命令（非仅 prototype） |
| Rule | `~/.cursor/rules/global-session-core.mdc` | Cursor 双保险（alwaysApply） |
| Rule | `~/.cursor/rules/windows-agent-shell.mdc` | Windows RTK/PowerShell/Python 契约 |
| Rule | `~/.cursor/rules/headroom-token-save.mdc` | RTK 前缀 + Headroom MCP |
| Rule | `~/.cursor/rules/zero-to-one-gate.mdc` | 0→1 strict 门禁（alwaysApply） |
| Skill | `~/.cursor/skills/zero-to-one-gate/SKILL.md` | 架构 ADR + brainstorming 链 |
| Memory | `~/.ai-workspace/memory/user-memory.md` | 跨项目 PDCA 主记忆 |

## 0→1 Vibe Coding 链（strict）

| 阶段 | Skill / 产物 |
|------|----------------|
| Detect | `zero-to-one-gate` + ai-coding-ok Mode B 自检 |
| Brainstorm | `brainstorming` — 2–3 方案，用户确认前不写码 |
| Architect | ADR → `decisions-log.md` 或 `docs/architecture/` |
| Plan | `writing-plans` 或 `planning-with-files-zh` |
| Build | 按 plan；大任务 `ouro-loop` |
| Verify | `global-delivery-gate` / `verify-all` |

Hook：`promptKeywordBoosts` 对「帮我做 / 新模块 / 架构…」提升 `zero-to-one-gate` 匹配分。三端规则：`~/.claude/AGENTS.md` Zero-to-one 段 + Cursor `zero-to-one-gate.mdc`。

Canonical 源：`skills/zero-to-one-gate/SKILL.md`、`.cursor/rules/zero-to-one-gate.mdc` → `sync-ai-guardrails.ps1 -Force` 同步三端。

## 验证

```powershell
# SessionStart 应含 global-session-core 路径 + ~/.ai-workspace/memory/
powershell -NoProfile -File "$env:USERPROFILE\.ai-workspace\scripts\scan-global-skills.ps1" -HookEvent SessionStart -OutputFormat Plain

# PRD 应命中 pm-prd-writer / SPACE-prd-writer
'{"prompt":"help me write PRD"}' | powershell -NoProfile -File "$env:USERPROFILE\.ai-workspace\scripts\scan-global-skills.ps1" -HookEvent UserPromptSubmit -OutputFormat Plain

# 0→1 应命中 zero-to-one-gate（SessionStart 含 strict 提醒）
powershell -NoProfile -File "$env:USERPROFILE\.ai-workspace\scripts\scan-global-skills.ps1" -HookEvent SessionStart -OutputFormat Plain | Select-String zero-to-one
'{"prompt":"帮我做一个新的运营看板模块"}' | powershell -NoProfile -File "$env:USERPROFILE\.ai-workspace\scripts\scan-global-skills.ps1" -HookEvent UserPromptSubmit -OutputFormat Plain | Select-String zero-to-one

# 或（更可靠）直接传 -UserPrompt：
powershell -NoProfile -File "$env:USERPROFILE\.ai-workspace\scripts\scan-global-skills.ps1" -HookEvent UserPromptSubmit -OutputFormat Plain -UserPrompt "帮我做一个新的运营看板模块" | Select-String zero-to-one

# RTK
rtk --version
rtk init --show
```

## 文件一览

| 文件 | 作用 |
|------|------|
| `scripts/global-workspace/install-global-workspace.ps1` | 一键全局工作区安装 |
| `scripts/global-workspace/init-project-memory.ps1` | 可选团队 project-memory 薄层 |
| `scripts/global-workspace/sync-from-repo.ps1` | 从 Agent Platform 刷新全局 scripts |
| `~/.ai-workspace/memory/` | 全局 PDCA 记忆 |
| `scripts/hooks/scan-global-skills.ps1` | 全局扫描 + always-on + memory 注入 + 匹配 |
| `scripts/hooks/install-global-skills-hooks.ps1` | 三端 hook 安装 |
| `scripts/hooks/sync-cursor-global-skills.ps1` | 项目 skills → `~/.cursor/skills` |
| `scripts/hooks/skills-sync.config.json` | excludeNames / alwaysOnSkills / Codex 去重 |
| `skills/global-session-core/SKILL.md` | 每会话必 Read 核心 skill |
| `scripts/global-workspace/verify-tri-end-config.ps1` | 三端 hooks/env 校验 |
| `scripts/hooks/repair-tri-end-hooks.ps1` | gate bypass + RTK 修复 |
| `scripts/global-workspace/apply-tri-end-env.ps1` | 三端 env（含缓存 header） |
| `~/.cursor/hooks.json` | Cursor hooks（skills + RTK） |
| `~/.claude/settings.json` | Claude hooks（skills + RTK） |
| `~/.codex/hooks.json` | Codex hooks |

## AI 工程护栏同步

```powershell
powershell -NoProfile -File .\scripts\sync-ai-guardrails.ps1 -Force
```

Rules → `~/.cursor/rules/`（含 `global-session-core.mdc`、`zero-to-one-gate.mdc`）。Delivery + `zero-to-one-gate` skills → 三端 `skills/`。
