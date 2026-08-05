# Verify DeepSeek cache proxy chain (18789 upstream behind CC Switch 15721).
param(
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$failures = @()
$warnings = @()
$port = if ($env:DEEPSEEK_CC_PROXY_PORT) { [int]$env:DEEPSEEK_CC_PROXY_PORT } else { 18789 }

function Write-Line([string]$Msg) { if (-not $Quiet) { Write-Host $Msg } }
function Add-Fail([string]$Msg) { $script:failures += $Msg }
function Add-Warn([string]$Msg) { $script:warnings += $Msg }

$proxyPath = Join-Path $env:USERPROFILE '.claude\scripts\deepseek-cc-proxy.mjs'
if (-not (Test-Path $proxyPath)) {
    Add-Fail "MISSING: $proxyPath — run install-deepseek-cache-proxy.ps1"
}
else {
    $content = Get-Content $proxyPath -Raw
    if ($content -notmatch 'stableToolSort') {
        Add-Fail 'Proxy is old stub — missing tools sort (re-run install-deepseek-cache-proxy.ps1)'
    }
    elseif ($content -notmatch 'ATTRIBUTION_RE') {
        Add-Fail 'Proxy missing attribution strip'
    }
    else { Write-Line 'OK: cache-aligned deepseek-cc-proxy.mjs' }
}

$listen = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listen) {
    Add-Warn "Port $port not listening — run start-deepseek-proxy.ps1"
}
else {
    Write-Line "OK: proxy listening on $port (PID $($listen.OwningProcess))"
}

$claudeSettings = Join-Path $env:USERPROFILE '.claude\settings.json'
if (Test-Path $claudeSettings) {
    $s = Get-Content $claudeSettings -Raw -Encoding UTF8 | ConvertFrom-Json
    $base = [string]$s.env.ANTHROPIC_BASE_URL
    if ($base -match '15721') {
        Write-Line 'OK: client ANTHROPIC_BASE_URL=15721 (CC Switch entry)'
    }
    else {
        Add-Warn "Client BASE_URL is $base (expected 15721 for CC Switch entry)"
    }
    if ($s.env.CLAUDE_CODE_ATTRIBUTION_HEADER -ne '0') {
        Add-Fail 'CLAUDE_CODE_ATTRIBUTION_HEADER not 0'
    }
}

$logPath = Join-Path $env:USERPROFILE '.claude\scripts\deepseek-cc-proxy.log'
if (Test-Path $logPath) {
    $cacheLines = Select-String -Path $logPath -Pattern 'cache hit=' -SimpleMatch:$false | Select-Object -Last 3
    if ($cacheLines) {
        Write-Line 'Recent cache log:'
        $cacheLines | ForEach-Object { Write-Line "  $($_.Line.Trim())" }
    }
    else {
        Add-Warn 'No cache hit lines in log yet — use Claude Code + DeepSeek a few turns'
    }
}
else {
    Add-Warn "No log at $logPath yet"
}

Write-Line ''
if ($warnings.Count -gt 0) {
    Write-Line 'WARNINGS:'
    $warnings | ForEach-Object { Write-Line "  - $_" }
}
if ($failures.Count -gt 0) {
    Write-Line 'FAILURES:'
    $failures | ForEach-Object { Write-Line "  - $_" }
    exit 1
}

Write-Line 'PASS: verify-deepseek-cache'
exit 0
