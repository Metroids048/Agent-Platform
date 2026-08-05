# Figma MCP dual-channel health check
param(
  [switch]$StrictDesktop
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'design\figma.config.json'
$cursorMcpPath = Join-Path $env:USERPROFILE '.cursor\mcp.json'
$codexConfigPath = Join-Path $env:USERPROFILE '.codex\config.toml'
$codexOverlayPath = Join-Path $env:USERPROFILE '.codex\codex-plus-mcp-overlay.toml'
$claudeJsonPath = Join-Path $env:USERPROFILE '.claude.json'
$canonicalPath = Join-Path $root 'scripts\global-workspace\templates\mcp\figma-mcp-canonical.json'
$fail = 0
$warn = 0

function Write-Pass($msg) { Write-Host "PASS: $msg" -ForegroundColor Green }
function Write-WarnMsg($msg) { Write-Host "WARN: $msg" -ForegroundColor Yellow; $script:warn++ }
function Write-FailMsg($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; $script:fail++ }

Write-Host '=== verify-figma-mcp ===' -ForegroundColor Cyan
Write-Host ''

if (Test-Path $configPath) {
  Write-Pass 'design/figma.config.json exists'
  $cfg = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($cfg.files.prototype.fileKey) {
    Write-Pass ('fileKey = ' + $cfg.files.prototype.fileKey)
  } else {
    Write-FailMsg 'figma.config.json missing fileKey'
  }
  $screenCount = ($cfg.files.prototype.screens.PSObject.Properties | Measure-Object).Count
  if ($screenCount -ge 1) {
    Write-Pass ('mapped screens = ' + $screenCount)
  } else {
    Write-FailMsg 'figma.config.json has no screens'
  }
} else {
  Write-FailMsg 'missing design/figma.config.json'
}

if (Test-Path $cursorMcpPath) {
  $mcp = Get-Content $cursorMcpPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($mcp.mcpServers.figma) { Write-Pass '~/.cursor/mcp.json has figma (Remote OAuth)' }
  else { Write-FailMsg '~/.cursor/mcp.json missing figma remote URL' }
  if ($mcp.mcpServers.'figma-desktop') { Write-Pass '~/.cursor/mcp.json has figma-desktop (local 3845)' }
  else { Write-FailMsg '~/.cursor/mcp.json missing figma-desktop' }
} else {
  Write-FailMsg '~/.cursor/mcp.json not found'
}

if (Test-Path $codexConfigPath) {
  $codexConfig = Get-Content $codexConfigPath -Raw -Encoding UTF8
  if ($codexConfig -match '\[mcp_servers\.figma\]' -and $codexConfig -match 'https://mcp\.figma\.com/mcp') {
    Write-Pass '~/.codex/config.toml has figma remote MCP'
  } else {
    Write-FailMsg '~/.codex/config.toml missing figma remote MCP'
  }
  if ($codexConfig -match '\[mcp_servers\.figma-desktop\]' -and $codexConfig -match '127\.0\.0\.1:3845/mcp') {
    Write-Pass '~/.codex/config.toml has figma-desktop MCP'
  } else {
    Write-FailMsg '~/.codex/config.toml missing figma-desktop MCP'
  }
} else {
  Write-FailMsg '~/.codex/config.toml not found'
}

if (Test-Path $codexOverlayPath) {
  $codexOverlay = Get-Content $codexOverlayPath -Raw -Encoding UTF8
  if ($codexOverlay -match '\[mcp_servers\.figma\]' -and $codexOverlay -match '\[mcp_servers\.figma-desktop\]') {
    Write-Pass '~/.codex/codex-plus-mcp-overlay.toml preserves figma MCP'
  } else {
    Write-FailMsg '~/.codex/codex-plus-mcp-overlay.toml missing figma MCP entries'
  }
} else {
  Write-FailMsg '~/.codex/codex-plus-mcp-overlay.toml not found'
}

if (Test-Path $claudeJsonPath) {
  $claude = Get-Content $claudeJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($claude.mcpServers.figma -and $claude.mcpServers.figma.url -match 'mcp\.figma\.com/mcp') {
    Write-Pass '~/.claude.json has figma (Remote OAuth)'
  } else {
    Write-FailMsg '~/.claude.json missing figma remote URL — run scripts/sync-figma-mcp.ps1'
  }
  if ($claude.mcpServers.'figma-desktop') {
    Write-Pass '~/.claude.json has figma-desktop (local 3845)'
  } else {
    Write-FailMsg '~/.claude.json missing figma-desktop'
  }
} else {
  Write-FailMsg '~/.claude.json not found'
}

if (Test-Path $canonicalPath) {
  Write-Pass 'figma-mcp-canonical.json template exists'
} else {
  Write-WarnMsg 'missing scripts/global-workspace/templates/mcp/figma-mcp-canonical.json'
}

$figmaPat = [Environment]::GetEnvironmentVariable('FIGMA_API_KEY', 'User')
if (-not $figmaPat) {
  $figmaPat = [Environment]::GetEnvironmentVariable('FIGMA_API_KEY', 'Process')
}
if ($figmaPat) {
  Write-Pass 'FIGMA_API_KEY env var is set (PAT REST read path)'
} else {
  Write-WarnMsg 'FIGMA_API_KEY not set — Starter plan should use PAT for bulk read; set User env var'
}

try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $iar = $tcp.BeginConnect('127.0.0.1', 3845, $null, $null)
  $ok = $iar.AsyncWaitHandle.WaitOne(2000, $false)
  if ($ok -and $tcp.Connected) {
    $tcp.Close()
    Write-Pass 'Figma Desktop MCP port 3845 is listening'
  } else {
    $tcp.Close()
    $msg = 'Figma Desktop MCP not running (Starter: optional; paid Dev Seat: enable Dev Mode MCP)'
    if ($StrictDesktop) { Write-FailMsg $msg } else { Write-WarnMsg $msg }
  }
} catch {
  $msg = 'Cannot reach 127.0.0.1:3845 (Starter: use PAT REST + Remote MCP write instead)'
  if ($StrictDesktop) { Write-FailMsg $msg } else { Write-WarnMsg $msg }
}

$resolveJs = Join-Path $root 'scripts\resolve-figma-screen.js'
if (Test-Path $resolveJs) {
  node $resolveJs --key userChat 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Pass 'resolve-figma-screen.js works (userChat)'
  } else {
    Write-WarnMsg 'resolve-figma-screen.js returned non-zero'
  }
} else {
  Write-WarnMsg 'missing scripts/resolve-figma-screen.js'
}

Write-Host ''
Write-Host 'OAuth (manual): Cursor/Codex/Claude each need figma Connect once — see docs/figma-setup.md' -ForegroundColor DarkGray
Write-Host ''
if ($fail -gt 0) {
  Write-Host ('FIGMA MCP CHECK FAILED (' + $fail + ' fail, ' + $warn + ' warn)') -ForegroundColor Red
  exit 1
}
if ($warn -gt 0) {
  Write-Host ('FIGMA MCP CHECK PASSED WITH WARNINGS (' + $warn + ')') -ForegroundColor Yellow
  exit 0
}
Write-Host 'FIGMA MCP CHECK PASSED' -ForegroundColor Green
exit 0
