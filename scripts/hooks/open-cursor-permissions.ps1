# DESTRUCTIVE: Opens all Cursor preToolUse permissions (bypass clarification gate).
# WARNING: Overwrites hooks.json; sets CLARIFICATION_GATE_OFF=1; writes gate stub.
#         Does NOT restore RTK Shell hook — use repair-tri-end-hooks.ps1 after this if you need RTK.
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/hooks/open-cursor-permissions.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/hooks/open-cursor-permissions.ps1 -GateOnly
param(
    [switch]$GateOnly
)
$ErrorActionPreference = 'Stop'

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$aiScripts = Join-Path $env:USERPROFILE '.ai-workspace\scripts'
$cursorDir = Join-Path $env:USERPROFILE '.cursor'
$cursorHooksJson = Join-Path $cursorDir 'hooks.json'
$allowJsRepo = Join-Path $PSScriptRoot 'cursor-shell-allow.js'
$allowJsGlobal = Join-Path $aiScripts 'cursor-shell-allow.js'

if (-not (Test-Path $aiScripts)) {
    New-Item -ItemType Directory -Path $aiScripts -Force | Out-Null
}
Copy-Item -LiteralPath $allowJsRepo -Destination $allowJsGlobal -Force

$allowHook = "node `"$allowJsGlobal`""

# Always-allow preToolUse hook (no clarification gate, no PowerShell banner on stdout)
$alwaysAllowPs1 = @'
param([string]$OutputFormat = 'Cursor')
[Console]::Out.Write('{"permission":"allow"}')
exit 0
'@
Write-Utf8NoBomFile -Path (Join-Path $aiScripts 'cursor-pretooluse-allow.ps1') -Content $alwaysAllowPs1
Write-Utf8NoBomFile -Path (Join-Path $PSScriptRoot 'cursor-pretooluse-allow.ps1') -Content $alwaysAllowPs1

# Disable clarification gate globally
[Environment]::SetEnvironmentVariable('CLARIFICATION_GATE_OFF', '1', 'User')
$env:CLARIFICATION_GATE_OFF = '1'

# Clear pending gate state for this repo (and all entries if user wants full open)
$gateStatePath = Join-Path $env:USERPROFILE '.ai-workspace\clarifications\gate-state.json'
if (Test-Path $gateStatePath) {
    Copy-Item -LiteralPath $gateStatePath -Destination ($gateStatePath + '.bak-open') -Force
    $cleared = @{
        version = 1
        updated = (Get-Date).ToString('o')
        entries = @{}
    }
    Write-Utf8NoBomFile -Path $gateStatePath -Content ($cleared | ConvertTo-Json -Depth 8)
}

$scanHook = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\scan-global-skills.ps1`""
$rtkHookCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\rtk-hook-cursor.ps1`" -OutputFormat Cursor"

$preToolUseHooks = @(
    @{ matcher = 'Write|Edit|MultiEdit|StrReplace|apply_patch|Delete'; command = $allowHook; timeout = 5 }
)
if (-not $GateOnly) {
    $preToolUseHooks += @{ matcher = 'Shell'; command = $allowHook; timeout = 5 }
    $preToolUseHooks += @{ matcher = '.*'; command = $allowHook; timeout = 5 }
}
else {
    $preToolUseHooks += @{ matcher = 'Shell'; command = $rtkHookCmd; timeout = 15 }
}

$hookBody = @{
    version = 1
    hooks   = @{
        preToolUse         = $preToolUseHooks
        sessionStart       = @(
            @{ command = "$scanHook -OutputFormat Cursor -HookEvent SessionStart"; timeout = 45 }
        )
        beforeSubmitPrompt = @(
            @{ command = "$scanHook -OutputFormat Cursor -HookEvent UserPromptSubmit"; timeout = 45 }
        )
    }
}

if (Test-Path $cursorHooksJson) {
    Copy-Item -LiteralPath $cursorHooksJson -Destination ($cursorHooksJson + '.bak-open') -Force
}
Write-Utf8NoBomFile -Path $cursorHooksJson -Content ($hookBody | ConvertTo-Json -Depth 10)

# Sync allow hook to global ai-workspace clarification script (fail-open)
$hardGateFailOpen = @'
param(
    [ValidateSet('Claude', 'Cursor', 'Codex', 'Auto')]
    [string]$OutputFormat = 'Auto'
)
[Console]::Out.Write('{"permission":"allow"}')
exit 0
'@
Write-Utf8NoBomFile -Path (Join-Path $aiScripts 'clarification-hard-gate.ps1') -Content $hardGateFailOpen
Write-Utf8NoBomFile -Path (Join-Path $PSScriptRoot 'clarification-hard-gate.ps1') -Content $hardGateFailOpen
# Do NOT overwrite rtk-hook-cursor.ps1 — keep full RTK version from repair-tri-end-hooks.ps1

# Smoke tests
$nodeOut = & node $allowJsGlobal 2>&1 | Out-String
if ($nodeOut.Trim() -ne '{"permission":"allow"}') {
    throw "Allow hook smoke failed (node): [$nodeOut]"
}
$psOut = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $aiScripts 'cursor-pretooluse-allow.ps1') 2>&1 | Out-String
if ($psOut.Trim() -ne '{"permission":"allow"}') {
    throw "Allow hook smoke failed (ps1): [$psOut]"
}

Write-Host 'PASS: Cursor permissions opened globally.'
Write-Host "  hooks.json -> $cursorHooksJson"
Write-Host '  CLARIFICATION_GATE_OFF=1 (User env)'
Write-Host '  Reload Cursor window (Ctrl+Shift+P -> Developer: Reload Window) then retry Agent edits.'
