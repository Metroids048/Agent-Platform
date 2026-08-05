# Verify tri-end global config (hooks, env, RTK, Python, active clarification gate).
param(
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$failures = @()
$warnings = @()

function Add-Fail([string]$Msg) { $script:failures += $Msg }
function Add-Warn([string]$Msg) { $script:warnings += $Msg }
function Write-Line([string]$Msg) { if (-not $Quiet) { Write-Host $Msg } }

# 1. Cursor hooks.json + RTK Shell hook
$cursorHooksJson = Join-Path $env:USERPROFILE '.cursor\hooks.json'
if (-not (Test-Path $cursorHooksJson)) {
    Add-Fail 'MISSING: ~/.cursor/hooks.json — run repair-tri-end-hooks.ps1'
}
else {
    $hooks = Get-Content $cursorHooksJson -Raw -Encoding UTF8 | ConvertFrom-Json
    $shellHook = $hooks.hooks.preToolUse | Where-Object { $_.matcher -eq 'Shell' } | Select-Object -First 1
    if (-not $shellHook) {
        Add-Fail 'MISSING: preToolUse Shell matcher in hooks.json'
    }
    elseif ($shellHook.command -notmatch 'rtk-hook-cursor') {
        Add-Fail 'Shell hook does not use rtk-hook-cursor.ps1'
    }
    else {
        $rtkPath = Join-Path $env:USERPROFILE '.ai-workspace\scripts\rtk-hook-cursor.ps1'
        if (-not (Test-Path $rtkPath)) {
            Add-Fail "MISSING: $rtkPath"
        }
        else {
            $rtkContent = Get-Content $rtkPath -Raw
            if ($rtkContent -notmatch 'rtk hook cursor') {
                Add-Fail 'rtk-hook-cursor.ps1 is stub — run repair-tri-end-hooks.ps1'
            }
            else { Write-Line 'OK: Cursor hooks.json + RTK Shell hook' }
        }
    }
}

# 2. CLAUDE_CODE_ATTRIBUTION_HEADER
$claudeSettings = Join-Path $env:USERPROFILE '.claude\settings.json'
if (Test-Path $claudeSettings) {
    $s = Get-Content $claudeSettings -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($s.env.CLAUDE_CODE_ATTRIBUTION_HEADER -ne '0') {
        Add-Fail 'CLAUDE_CODE_ATTRIBUTION_HEADER not 0 in ~/.claude/settings.json — run apply-tri-end-env.ps1'
    }
    else { Write-Line 'OK: Claude CLAUDE_CODE_ATTRIBUTION_HEADER=0' }
}
else {
    Add-Fail 'MISSING: ~/.claude/settings.json'
}

$cursorSettings = Join-Path $env:APPDATA 'Cursor\User\settings.json'
if (Test-Path $cursorSettings) {
    $c = Get-Content $cursorSettings -Raw -Encoding UTF8 | ConvertFrom-Json
    $attr = $c.'claudeCode.environmentVariables' | Where-Object { $_.name -eq 'CLAUDE_CODE_ATTRIBUTION_HEADER' } | Select-Object -First 1
    if (-not $attr -or $attr.value -ne '0') {
        Add-Warn 'Cursor claudeCode.environmentVariables missing CLAUDE_CODE_ATTRIBUTION_HEADER=0'
    }
    else { Write-Line 'OK: Cursor extension CLAUDE_CODE_ATTRIBUTION_HEADER=0' }
}

# 3. rtk in PATH
$rtkCmd = Get-Command rtk -ErrorAction SilentlyContinue
if (-not $rtkCmd) {
    Add-Warn 'rtk not in PATH — add ~/.local/bin or run rtk init -g'
}
else { Write-Line "OK: rtk at $($rtkCmd.Source)" }

# 4. Python
$py = Get-Command python -ErrorAction SilentlyContinue
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
if (-not $py -and -not $pyLauncher) {
    Add-Fail 'Neither python nor py launcher found in PATH'
}
else { Write-Line 'OK: Python launcher available' }

# 5. Clarification gate active
$gateOff = [Environment]::GetEnvironmentVariable('CLARIFICATION_GATE_OFF', 'User')
if ($gateOff -eq '1') {
    Add-Fail 'CLARIFICATION_GATE_OFF=1 at User env — hard gate is bypassed; run repair-tri-end-hooks.ps1'
}
else { Write-Line 'OK: clarification hard gate active (CLARIFICATION_GATE_OFF not set)' }

# 6. windows-agent-shell rule
$winRule = Join-Path $env:USERPROFILE '.cursor\rules\windows-agent-shell.mdc'
if (-not (Test-Path $winRule)) {
    Add-Fail 'MISSING: ~/.cursor/rules/windows-agent-shell.mdc — run sync-ai-guardrails.ps1 -Force'
}
else { Write-Line 'OK: windows-agent-shell.mdc' }

# 7. headroom (optional warn)
$headroom = Join-Path $env:APPDATA 'Python\Python312\Scripts\headroom.exe'
if (-not (Test-Path $headroom)) {
    Add-Warn "headroom.exe not at $headroom"
}
else { Write-Line 'OK: headroom.exe' }

# 8. node-project-delivery rule
$nodeRule = Join-Path $env:USERPROFILE '.cursor\rules\node-project-delivery.mdc'
if (-not (Test-Path $nodeRule)) {
    Add-Warn 'MISSING: node-project-delivery.mdc — run sync-ai-guardrails.ps1 -Force'
}
else { Write-Line 'OK: node-project-delivery.mdc' }

# 9. projects-registry hint
$registry = Join-Path $env:USERPROFILE '.ai-workspace\memory\projects-registry.md'
if (Test-Path $registry) {
    Write-Line 'OK: projects-registry.md'
    if (-not $Quiet) {
        Get-Content $registry -Encoding UTF8 | Select-String 'verify' | ForEach-Object { Write-Line "  $($_.Line.Trim())" }
    }
}

Write-Line ''
if ($warnings.Count -gt 0) {
    Write-Line 'WARNINGS:'
    $warnings | ForEach-Object { Write-Line "  - $_" }
}
if ($failures.Count -gt 0) {
    Write-Line 'FAILURES:'
    $failures | ForEach-Object { Write-Line "  - $_" }
    Write-Line ''
    Write-Line 'Repair:'
    Write-Line '  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\hooks\repair-tri-end-hooks.ps1"'
    Write-Line '  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\global-workspace\apply-tri-end-env.ps1"'
    Write-Line '  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\sync-ai-guardrails.ps1" -Force'
    exit 1
}

Write-Line 'PASS: verify-tri-end-config'
exit 0
