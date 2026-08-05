# ai-coding-ok: Global Engineering Rules

Applies to **all projects** when no repo-local `AGENTS.md` overrides.

---

## PDCA — Global memory (default)

**Plan（任务开始前）**

1. Read `~/.ai-workspace/memory/user-memory.md`
2. Read `~/.ai-workspace/memory/global-decisions-log.md`
3. Read recent entries in `~/.ai-workspace/memory/global-task-history.md`
4. If present: `<repo>/.github/agent/memory/project-memory.md` (team overlay)
5. If present: repo `AGENTS.md` overrides this file
6. **0→1 / 新模块 / 大范围「帮我做…」** → Read `zero-to-one-gate` + `brainstorming` skills before code (strict: user approve before implement)

**Act（任务结束后）**

1. Append `~/.ai-workspace/memory/global-task-history.md` with `[project: path]` tag
2. Update project memory files if they exist
3. Architecture decisions → `global-decisions-log.md` or project `decisions-log.md`
4. If verification incomplete → **"Task is NOT fully verified."**

---

## Zero-to-one gate (all tools · strict)

| Phase | Skills |
|-------|--------|
| Detect + brainstorm | `zero-to-one-gate`, `brainstorming` |
| User approve | Plain 中文摘要 ≤15 行；即使用户说「直接做」也须确认 scope |
| Plan | `writing-plans` or `planning-with-files-zh` |
| Build | Per plan; large → `ouro-loop` |
| Verify | `global-delivery-gate` |

Agent **主动**识别：缺 ADR、模块边界不清、PRD 无技术映射——用户无需懂架构。

Rules: `~/.cursor/rules/zero-to-one-gate.mdc` (Cursor). Skill: `~/.cursor/skills/zero-to-one-gate/SKILL.md`.

---

## Core principles

1. Code generation ≠ task completion — verify before claiming done
2. No TODO/FIXME/mock/fake success
3. Compare work against user request and acceptance criteria
4. Greenfield work requires approved architecture summary before first implementation
5. If requirements, workflows, page relationships, or acceptance criteria are unclear, ask promptly instead of inventing key business decisions.

---

## Maximum permission scope (all tools)

When the user says **「最大权限」「全部解决」「你看着办」** or grants broad shell access:

| User means | Agent must NOT assume |
|------------|------------------------|
| Fewer confirmation steps; fix the stated problem end-to-end | License to delete tools, wipe config dirs, uninstall integrations, or run `_remove-*` scripts |

**Ask first** (plain 中文: what / why / impact) before any destructive action — even after「最大权限」:

- Delete/uninstall CC Switch, provider DB, backups, sync scripts
- `Remove-Item -Recurse` / `rm -rf` on user config homes
- Clear registry env vars beyond the **one key** tied to the current bug
- Replace whole config files when a single provider/field fix suffices

**Default:** minimal diff within **current task scope** only.

**Protected unless user explicitly says delete/uninstall:** `~/.cc-switch`, cc-sync/cc-watch scripts, OAuth sessions, unrelated API providers.

Cursor rule: `~/.cursor/rules/maximum-permission-scope.mdc`. Also in `global-session-core` skill + `user-memory.md`.

---

## Validation (auto-detect)

Run the first applicable:

1. `node prototype/scripts/verify-all.js` if file exists
2. `npm run verify` / `lint` / `typecheck` / `test` / `build` from package.json
3. See `global-delivery-gate` skill for full detection order

---

## Task completion format

**Completed** — what changed  
**Verified** — commands run with evidence  
**Remaining Risks** — known limits

Skills index: `~/.claude/global-skills-index.md`  
Global workspace: `~/.ai-workspace/`

---

## Document writing style

For Markdown reports, PRDs, summaries, demo scripts, and requirement documents:

1. Write in clean Simplified Chinese unless the user asks otherwise.
2. Keep Markdown render-safe: no repeated blank lines, no mojibake, no decorative symbol clutter.
3. Use more diagrams and tables when they improve communication, but keep body text concise and do not repeat chart content as long prose.
4. Avoid generic AI-brochure phrasing; sound like a project team member.
5. Base conclusions on existing files, docs, code, and verified facts. Mark gaps as `待确认`, `mock`, or `原型`.
