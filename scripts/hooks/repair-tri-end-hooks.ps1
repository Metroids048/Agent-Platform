# Repair tri-end hooks: hard gate + full RTK Shell hook + curated category-first SessionStart/UserPrompt routing.
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/hooks/repair-tri-end-hooks.ps1
param(
    [switch]$SkipGateOff
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
$hooksDir = $PSScriptRoot
$aiScripts = Join-Path $env:USERPROFILE '.ai-workspace\scripts'
$claudeScripts = Join-Path $env:USERPROFILE '.claude\scripts'
$cursorHooksDir = Join-Path $env:USERPROFILE '.cursor\hooks'
$cursorHooksJson = Join-Path $env:USERPROFILE '.cursor\hooks.json'

foreach ($d in @($aiScripts, $claudeScripts, $cursorHooksDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

# Full RTK hook from repo SSOT
$rtkSrc = Join-Path $hooksDir 'rtk-hook-cursor.ps1'
if (-not (Test-Path $rtkSrc)) {
    throw "Missing RTK hook source: $rtkSrc"
}
foreach ($dst in @(
    (Join-Path $aiScripts 'rtk-hook-cursor.ps1'),
    (Join-Path $claudeScripts 'rtk-hook-cursor.ps1'),
    (Join-Path $cursorHooksDir 'rtk-hook-cursor.ps1')
)) {
    Copy-Item -LiteralPath $rtkSrc -Destination $dst -Force
    Write-Host "Installed RTK hook: $dst"
}

# Install real clarification gate scripts
$gateCoreSrc = Join-Path $hooksDir 'clarification-gate-core.ps1'
$gateSrc = Join-Path $hooksDir 'clarification-hard-gate.ps1'
$gateKeywordsSrc = Join-Path $hooksDir 'clarification-gate-keywords.json'
foreach ($src in @($gateCoreSrc, $gateSrc, $gateKeywordsSrc)) {
    if (-not (Test-Path $src)) {
        throw "Missing gate source: $src"
    }
}
foreach ($dst in @(
    (Join-Path $aiScripts 'clarification-gate-core.ps1'),
    (Join-Path $claudeScripts 'clarification-gate-core.ps1'),
    (Join-Path $cursorHooksDir 'clarification-gate-core.ps1'),
    (Join-Path $aiScripts 'clarification-gate-keywords.json'),
    (Join-Path $claudeScripts 'clarification-gate-keywords.json'),
    (Join-Path $cursorHooksDir 'clarification-gate-keywords.json'),
    (Join-Path $aiScripts 'clarification-hard-gate.ps1'),
    (Join-Path $claudeScripts 'clarification-hard-gate.ps1'),
    (Join-Path $cursorHooksDir 'clarification-hard-gate.ps1'),
    (Join-Path $hooksDir 'clarification-hard-gate.ps1')
)) {
    $name = Split-Path $dst -Leaf
    $source = switch ($name) {
        'clarification-gate-core.ps1' { $gateCoreSrc }
        'clarification-gate-keywords.json' { $gateKeywordsSrc }
        default { $gateSrc }
    }
    $sourcePath = (Resolve-Path -LiteralPath $source).Path
    $destPath = $dst
    try { $destPath = (Resolve-Path -LiteralPath $dst -ErrorAction Stop).Path } catch { }
    if ($sourcePath -ne $destPath) {
        Copy-Item -LiteralPath $source -Destination $dst -Force
    }
}
Write-Host 'Installed clarification hard gate scripts'

# cursor-shell-allow.js for Write/Edit (node, no PS banner)
$allowJsRepo = Join-Path $hooksDir 'cursor-shell-allow.js'
$allowJsGlobal = Join-Path $aiScripts 'cursor-shell-allow.js'
Copy-Item -LiteralPath $allowJsRepo -Destination $allowJsGlobal -Force
$allowHook = "node `"$allowJsGlobal`""
$gateHookCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\clarification-hard-gate.ps1`" -OutputFormat Cursor"

if (-not $SkipGateOff) {
    [Environment]::SetEnvironmentVariable('CLARIFICATION_GATE_OFF', $null, 'User')
    Remove-Item Env:CLARIFICATION_GATE_OFF -ErrorAction SilentlyContinue
    Write-Host 'Cleared CLARIFICATION_GATE_OFF at User env'
}

$scanHook = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\scan-global-skills.ps1`""
$rtkHookCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\rtk-hook-cursor.ps1`" -OutputFormat Cursor"

$hookBody = @{
    version = 1
    hooks   = @{
        preToolUse         = @(
            @{ matcher = 'Write|Edit|MultiEdit|StrReplace|apply_patch|Delete'; command = $gateHookCmd; timeout = 15 }
            @{ matcher = 'Shell'; command = $rtkHookCmd; timeout = 15 }
        )
        sessionStart       = @(
            @{ command = "$scanHook -OutputFormat Cursor -HookEvent SessionStart"; timeout = 45 }
        )
        beforeSubmitPrompt = @(
            @{ command = "$scanHook -OutputFormat Cursor -HookEvent UserPromptSubmit"; timeout = 45 }
        )
    }
}

if (Test-Path $cursorHooksJson) {
    Copy-Item -LiteralPath $cursorHooksJson -Destination ($cursorHooksJson + '.bak-repair') -Force
}
Write-Utf8NoBomFile -Path $cursorHooksJson -Content ($hookBody | ConvertTo-Json -Depth 10)
Write-Host "Updated: $cursorHooksJson"

# Fix Claude settings.json PreToolUse — must be JSON array (rtk init requirement)
$claudeSettingsPath = Join-Path $env:USERPROFILE '.claude\settings.json'
if (Test-Path $claudeSettingsPath) {
    $raw = Get-Content $claudeSettingsPath -Raw -Encoding UTF8
    if ($raw -match '"PreToolUse"\s*:\s*\{') {
        $fixed = $raw -replace '"PreToolUse"\s*:\s*\{', '"PreToolUse": [{'
        $fixed = $fixed -replace '("matcher"\s*:\s*"Write\|Edit\|MultiEdit\|StrReplace\|apply_patch")\s*\}(\s*,\s*"SessionStart")', '$1}]$2'
        Write-Utf8NoBomFile -Path $claudeSettingsPath -Content $fixed
        Write-Host "Fixed Claude PreToolUse array: $claudeSettingsPath"
    }
}

# Smoke tests
$rtkContent = Get-Content -LiteralPath (Join-Path $aiScripts 'rtk-hook-cursor.ps1') -Raw
if ($rtkContent -notmatch 'rtk hook cursor') {
    throw 'RTK hook is still stub — expected rtk hook cursor'
}
$gateContent = Get-Content -LiteralPath (Join-Path $aiScripts 'clarification-hard-gate.ps1') -Raw
if ($gateContent -notmatch 'Update-ClarificationGateFromPrompt|gateStatus|permission') {
    throw 'clarification-hard-gate.ps1 was not installed correctly'
}

Write-Host 'PASS: tri-end hooks repaired (hard gate + RTK Shell + curated beforeSubmitPrompt routing).'
Write-Host 'Reload Cursor window, then run verify-tri-end-config.ps1'
