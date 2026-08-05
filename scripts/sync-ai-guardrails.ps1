# sync-ai-guardrails.ps1
# Mirrors Agent Platform AI guardrails to global Cursor / Codex / Claude skill & rule dirs.
# Does NOT overwrite existing skills (e.g. verification-before-completion).

param(
    [switch]$WhatIf,
    [switch]$Force,
    [switch]$GlobalOnly
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$workspaceRules = Join-Path $env:USERPROFILE '.ai-workspace\templates\rules'
$hasProjectAgents = Test-Path (Join-Path $ProjectRoot 'AGENTS.md')

if (-not $hasProjectAgents -and -not (Test-Path $workspaceRules)) {
    throw "AGENTS.md not found under $ProjectRoot and no ~/.ai-workspace/templates/rules — run install-global-workspace.ps1 first."
}

$Targets = @{
    Cursor = Join-Path $env:USERPROFILE '.cursor'
    Codex  = Join-Path $env:USERPROFILE '.codex'
    Claude = Join-Path $env:USERPROFILE '.claude'
}

$RuleFiles = @(
    'ai-engineering-guardrails.mdc',
    'mandatory-verification-workflow.mdc',
    'ui-ux-quality.mdc',
    'global-document-writing-style.mdc',
    'global-session-core.mdc',
    'requirement-clarifier.mdc',
    'zero-to-one-gate.mdc',
    'maximum-permission-scope.mdc',
    'engineering-assistant-charter.mdc',
    'karpathy-guidelines.mdc',
    'headroom-token-save.mdc',
    'windows-agent-shell.mdc',
    'node-project-delivery.mdc'
)

$SkillSources = @(
    @{ Name = 'ai-coding-ok';     Source = Join-Path $ProjectRoot '.cursor\skills\ai-coding-ok' }
    @{ Name = 'agent-verifier';   Source = Join-Path $ProjectRoot '.cursor\skills\agent-verifier' }
    @{ Name = 'ouro-loop';        Source = Join-Path $ProjectRoot '.cursor\skills\ouro-loop' }
    @{ Name = 'ai-delivery-gate'; Source = Join-Path $ProjectRoot '.cursor\skills\ai-delivery-gate' }
    @{ Name = 'task-intake-bridge'; Source = Join-Path $ProjectRoot 'skills\task-intake-bridge' }
    @{ Name = 'zero-to-one-gate'; Source = Join-Path $ProjectRoot 'skills\zero-to-one-gate' }
    @{ Name = 'requirement-clarifier'; Source = Join-Path $ProjectRoot 'skills\requirement-clarifier' }
    @{ Name = 'figma2code';       Source = Join-Path $ProjectRoot 'skills\figma2code' }
)

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) {
        if ($WhatIf) { Write-Host "[WhatIf] mkdir $Path" }
        else { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
    }
}

function Copy-ItemSafe {
    param(
        [string]$Source,
        [string]$Dest,
        [switch]$Overwrite
    )
    if (-not (Test-Path $Source)) {
        Write-Warning "Missing source: $Source"
        return
    }
    Ensure-Dir (Split-Path $Dest -Parent)
    if ($WhatIf) {
        Write-Host "[WhatIf] copy $Source -> $Dest"
        return
    }
    if ((Test-Path $Dest) -and -not $Overwrite) {
        Write-Host "Skip (exists): $Dest"
        return
    }
    Copy-Item -LiteralPath $Source -Destination $Dest -Recurse -Force
    Write-Host "Copied: $Dest"
}

Write-Host "Project root: $ProjectRoot"
Write-Host ""

# --- Rules -> ~/.cursor/rules only (Cursor-specific) ---
$rulesSrc = if ((Test-Path $workspaceRules) -and ($GlobalOnly -or -not $hasProjectAgents)) {
    $workspaceRules
}
else {
    Join-Path $ProjectRoot '.cursor\rules'
}
$rulesDst = Join-Path $Targets.Cursor 'rules'
Ensure-Dir $rulesDst
foreach ($f in $RuleFiles) {
    Copy-ItemSafe -Source (Join-Path $rulesSrc $f) -Dest (Join-Path $rulesDst $f) -Overwrite
}

# --- Global templates -> ~/.ai-workspace/templates/project ---
$templatesSrc = Join-Path $env:USERPROFILE '.ai-workspace\templates'
$projTplSrc = Join-Path $templatesSrc 'project'
Ensure-Dir $projTplSrc
$repoTpl = Join-Path $ProjectRoot 'docs\agent-templates'
if (Test-Path $repoTpl) {
    Get-ChildItem -Path $repoTpl -Filter '*.template' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-ItemSafe -Source $_.FullName -Dest (Join-Path $projTplSrc $_.Name) -Overwrite
    }
}

# --- Skills -> all three tool homes ---
foreach ($tool in $Targets.Keys) {
    $skillsDst = Join-Path $Targets[$tool] 'skills'
    Ensure-Dir $skillsDst
    Write-Host "--- Skills -> $skillsDst ---"
    foreach ($s in $SkillSources) {
        $dest = Join-Path $skillsDst $s.Name
        if ((Test-Path $dest) -and -not $Force) {
            Write-Host "Skip skill (exists, use -Force to overwrite): $($s.Name)"
            continue
        }
        Copy-ItemSafe -Source $s.Source -Dest $dest -Overwrite:$Force
    }
}

# --- Vendor read-only reference (optional symlink-like copy of top-level vendor names) ---
$vendorDst = Join-Path $ProjectRoot 'skills\vendor'
if (Test-Path $vendorDst) {
    Write-Host ""
    Write-Host "Vendor skills source: $vendorDst"
    Write-Host "(Full vendor trees stay in repo; wrappers synced above.)"
}

# --- Curated routing catalog -> ~/.ai-workspace/skills-curated ---
$curatedSync = Join-Path $ProjectRoot 'scripts\hooks\sync-curated-routing.ps1'
if ((Test-Path $curatedSync) -and -not $WhatIf) {
    Write-Host ""
    Write-Host "--- Curated routing catalog sync ---"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $curatedSync
}

# --- Figma MCP三端同步（-Force 时执行）---
$figmaSync = Join-Path $ProjectRoot 'scripts\sync-figma-mcp.ps1'
if ((Test-Path $figmaSync) -and $Force -and -not $WhatIf) {
    Write-Host ""
    Write-Host "--- Figma MCP sync (sync-figma-mcp.ps1) ---"
    & powershell -ExecutionPolicy Bypass -File $figmaSync
}

# --- Codex lean re-apply (ADR-G004; merge-codex-config may re-enable bulk plugins) ---
function Apply-CodexLean {
    param([string]$ConfigPath)
    if (-not (Test-Path $ConfigPath)) { return }
    $keepCurated = @('figma@openai-curated', 'build-web-apps@openai-curated', 'github@openai-curated', 'slack@openai-curated')
    $mcpRemove = @(
        'mcp_servers.memory', 'mcp_servers.sequential-thinking', 'mcp_servers.playwright',
        'mcp_servers.exa', 'mcp_servers.fal-ai', 'mcp_servers.filesystem-agent-platform',
        'mcp_servers.chrome-devtools', 'mcp_servers.openaiDeveloperDocs'
    )
    $lines = Get-Content $ConfigPath
    $out = New-Object System.Collections.Generic.List[string]
    $curName = ''
    $skipMcp = $false
    $persistentSeen = $false
    foreach ($l in $lines) {
        if ($l -match 'persistent_instructions') {
            $persistentSeen = $true
            continue
        }
        if ($persistentSeen) {
            if ($l -match '^\s*"""') {
                $persistentSeen = $false
            }
            continue
        }
        if ($l -match '^\[(mcp_servers\.[^\]]+)\]$') {
            $sec = $Matches[1]
            if ($mcpRemove -contains $sec) { $skipMcp = $true; continue }
            $skipMcp = $false
        }
        if ($skipMcp) { continue }
        if ($l -match '^\[plugins\."([^"]+@openai-curated)"\]$') {
            $curName = $Matches[1]
            $out.Add($l)
        }
        elseif ($curName -and $l -match '^enabled = ') {
            if ($keepCurated -contains $curName) { $out.Add($l) } else { $out.Add('enabled = false') }
            $curName = ''
        }
        elseif ($l -eq 'model_reasoning_effort = "high"') { $out.Add('model_reasoning_effort = "medium"') }
        else { $out.Add($l) }
    }
    $idx = $out.FindIndex({ param($x) $x -eq 'disable_response_storage = true' })
    if ($idx -ge 0) {
        $out.Insert($idx + 1, '')
        $out.Insert($idx + 2, 'persistent_instructions = """')
        $out.Insert($idx + 3, 'Read ~/.claude/AGENTS.md Engineering Assistant Charter first.')
        $out.Insert($idx + 4, 'SessionStart: read global-session-core and ai-coding-ok when coding tasks touch a guarded repo.')
        $out.Insert($idx + 5, 'Task intake order: task-intake-bridge -> curated category _routing.md -> 1-3 shortlisted skills -> selected SKILL.md files -> tools.')
        $out.Insert($idx + 6, 'Fuzzy or broad implementation: requirement-clarifier Mini-Spec before apply_patch unless the user explicitly says direct execute.')
        $out.Insert($idx + 7, 'Use category-first routing, not broad keyword pileups; prefer ~/.ai-workspace/skills-curated when available.')
        $out.Insert($idx + 8, 'Done = Completed / Verified / Remaining Risks; update task-history and SESSION if present.')
        $out.Insert($idx + 9, '"""')
    }
    if (-not $WhatIf) { Set-Content -Path $ConfigPath -Value $out -Encoding UTF8 }
    Write-Host "Codex lean re-applied (ADR-G004): $ConfigPath"
}

if ($Force -and -not $WhatIf) {
    Apply-CodexLean -ConfigPath (Join-Path $Targets.Codex 'config.toml')
}

# --- Hook config sync / install ---
$hooksSync = Join-Path $ProjectRoot 'scripts\hooks\sync-hooks-config.ps1'
if ((Test-Path $hooksSync) -and -not $WhatIf) {
    Write-Host ""
    Write-Host "--- Hooks config sync ---"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $hooksSync
}

$installHooks = Join-Path $ProjectRoot 'scripts\hooks\install-global-skills-hooks.ps1'
if ($Force -and -not $WhatIf -and (Test-Path $installHooks)) {
    Write-Host ""
    Write-Host "--- Install tri-end hooks ---"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $installHooks
}

Write-Host ""
Write-Host "Done. Restart Cursor/Codex/Claude to pick up new skills if needed."
Write-Host ""
Write-Host "NOTE: After ADR/rules/skills updates, always re-run with -Force so global ai-delivery-gate matches verify-all 5 steps."
Write-Host "Figma MCP: run scripts/sync-figma-mcp.ps1 (or use -Force above) then scripts/verify-figma-mcp.ps1"
