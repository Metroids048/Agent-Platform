# Install / sync DeepSeek cache-aligned proxy to ~/.claude/scripts
param(
    [switch]$Quiet,
    [switch]$Start,
    [switch]$RegisterStartup
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $repoRoot 'AGENTS.md'))) {
    $repoRoot = 'C:\Users\win\Desktop\Agent Platform'
}
$src = Join-Path $repoRoot 'scripts\deepseek-cache\deepseek-cc-proxy.mjs'
$dstDir = Join-Path $env:USERPROFILE '.claude\scripts'
$dst = Join-Path $dstDir 'deepseek-cc-proxy.mjs'

if (-not (Test-Path $src)) {
    throw "Missing source: $src"
}
if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
}
Copy-Item -LiteralPath $src -Destination $dst -Force
if (-not $Quiet) { Write-Host "Synced: $dst" }

if ($Start) {
    $startScript = Join-Path $dstDir 'start-deepseek-proxy.ps1'
    if (Test-Path $startScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $startScript
    }
}

if ($RegisterStartup) {
    $registerScript = Join-Path $PSScriptRoot 'register-deepseek-proxy-startup.ps1'
    if (Test-Path $registerScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $registerScript @($(if ($Quiet) { '-Quiet' }))
    }
}
