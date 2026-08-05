# ai-coding-ok: v1.0

Follow `AGENTS.md` and `.github/agent/memory/*.md` before and after every coding task.

Read `.github/agent/memory/postmortem-navigation-2026-05-28.md` when changing `prototype/assets/proto.js` or navigation/session state.

Mandatory prototype verification when editing `prototype/`:

```bash
node prototype/scripts/verify-all.js
```

**verify-all 5 steps:** smoke-check → e2e-check → regression-check → browser-check → **navigation-journey-check**.

grep/smoke PASS alone does **not** prove index↔05 navigation works (ADR-003).

**Spot-check (2 min):** direct open 05 → back to index → re-enter 05 — behavior must match. See `prototype/DELIVERY-CHECKLIST.md`.

After updating `.cursor/rules/` or `.cursor/skills/`: `powershell scripts/sync-ai-guardrails.ps1 -Force`

Never claim completion without fresh command output. If verification fails, state "Task is NOT fully verified."
