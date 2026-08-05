# sync-figma-mcp.ps1
# Merge Figma MCP entries into Cursor / Codex / Claude Code global configs.
# Source of truth: scripts/global-workspace/templates/mcp/figma-mcp-canonical.json

param(
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$CanonicalSrc = Join-Path $ProjectRoot 'scripts\global-workspace\templates\mcp\figma-mcp-canonical.json'
$WorkspaceMcpDir = Join-Path $env:USERPROFILE '.ai-workspace\templates\mcp'
$WorkspaceCanonical = Join-Path $WorkspaceMcpDir 'figma-mcp-canonical.json'

$CursorMcpPath = Join-Path $env:USERPROFILE '.cursor\mcp.json'
$ClaudeJsonPath = Join-Path $env:USERPROFILE '.claude.json'
$CodexOverlayPath = Join-Path $env:USERPROFILE '.codex\codex-plus-mcp-overlay.toml'
$MergePyPath = Join-Path $env:USERPROFILE '.ai-workspace\scripts\merge-codex-config.py'

$FIGMA_REMOTE = 'https://mcp.figma.com/mcp'
$FIGMA_DESKTOP = 'http://127.0.0.1:3845/mcp'

$CodexFigmaBlock = @"
[mcp_servers.figma]
url = "$FIGMA_REMOTE"
startup_timeout_sec = 30

[mcp_servers.figma-desktop]
url = "$FIGMA_DESKTOP"
startup_timeout_sec = 30
"@

function Write-Action([string]$msg) {
    if ($WhatIf) { Write-Host "[WhatIf] $msg" -ForegroundColor DarkGray }
    else { Write-Host $msg }
}

function Read-JsonFile([string]$Path) {
    if (-not (Test-Path $Path)) { return $null }
    return Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-JsonFile([string]$Path, $Obj) {
    $json = $Obj | ConvertTo-Json -Depth 20
    if ($WhatIf) {
        Write-Action "write $Path"
        return
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $json, $utf8)
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) {
        if ($WhatIf) { Write-Action "mkdir $Path" }
        else { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
    }
}

Write-Host '=== sync-figma-mcp ===' -ForegroundColor Cyan
Write-Host ''

# --- Copy canonical to ~/.ai-workspace/templates/mcp/ ---
if (-not (Test-Path $CanonicalSrc)) {
    throw "Missing canonical template: $CanonicalSrc"
}
Ensure-Dir $WorkspaceMcpDir
if ($WhatIf) {
    Write-Action "copy $CanonicalSrc -> $WorkspaceCanonical"
}
else {
    Copy-Item -LiteralPath $CanonicalSrc -Destination $WorkspaceCanonical -Force
    Write-Host "Copied canonical -> $WorkspaceCanonical"
}

$canonical = Read-JsonFile $CanonicalSrc

# --- Cursor ~/.cursor/mcp.json ---
if (Test-Path $CursorMcpPath) {
    $cursor = Read-JsonFile $CursorMcpPath
    if (-not $cursor.mcpServers) {
        $cursor | Add-Member -NotePropertyName 'mcpServers' -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $changed = $false
    if (-not $cursor.mcpServers.figma -or $cursor.mcpServers.figma.url -ne $FIGMA_REMOTE) {
        $cursor.mcpServers | Add-Member -NotePropertyName 'figma' -NotePropertyValue ([PSCustomObject]@{ url = $FIGMA_REMOTE }) -Force
        $changed = $true
    }
    if (-not $cursor.mcpServers.'figma-desktop' -or $cursor.mcpServers.'figma-desktop'.url -ne $FIGMA_DESKTOP) {
        $cursor.mcpServers | Add-Member -NotePropertyName 'figma-desktop' -NotePropertyValue ([PSCustomObject]@{ url = $FIGMA_DESKTOP }) -Force
        $changed = $true
    }
    if ($changed) {
        Write-Action "merge figma entries -> $CursorMcpPath"
        if (-not $WhatIf) { Write-JsonFile $CursorMcpPath $cursor }
    }
    else {
        Write-Host "Cursor MCP already has figma + figma-desktop"
    }
}
else {
    Write-Warning "Missing $CursorMcpPath — create manually or run Cursor MCP setup first"
}

# --- Claude Code ~/.claude.json ---
if (Test-Path $ClaudeJsonPath) {
    $claude = Read-JsonFile $ClaudeJsonPath
    if (-not $claude.mcpServers) {
        $claude | Add-Member -NotePropertyName 'mcpServers' -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $changed = $false
    if (-not $claude.mcpServers.figma -or $claude.mcpServers.figma.url -ne $FIGMA_REMOTE) {
        $claude.mcpServers | Add-Member -NotePropertyName 'figma' -NotePropertyValue ([PSCustomObject]@{
            type = 'http'
            url  = $FIGMA_REMOTE
        }) -Force
        $changed = $true
    }
    if (-not $claude.mcpServers.'figma-desktop' -or $claude.mcpServers.'figma-desktop'.url -ne $FIGMA_DESKTOP) {
        $claude.mcpServers | Add-Member -NotePropertyName 'figma-desktop' -NotePropertyValue ([PSCustomObject]@{
            type = 'http'
            url  = $FIGMA_DESKTOP
        }) -Force
        $changed = $true
    }
    if ($changed) {
        Write-Action "merge figma entries -> $ClaudeJsonPath"
        if (-not $WhatIf) { Write-JsonFile $ClaudeJsonPath $claude }
    }
    else {
        Write-Host "Claude Code MCP already has figma + figma-desktop"
    }
}
else {
    Write-Warning "Missing $ClaudeJsonPath"
}

# --- Codex overlay ~/.codex/codex-plus-mcp-overlay.toml ---
$overlayNeedsWrite = $false
if (Test-Path $CodexOverlayPath) {
    $overlayText = Get-Content $CodexOverlayPath -Raw -Encoding UTF8
    if ($overlayText -notmatch '\[mcp_servers\.figma\]' -or $overlayText -notmatch 'https://mcp\.figma\.com/mcp') {
        $overlayNeedsWrite = $true
    }
    if ($overlayText -notmatch '\[mcp_servers\.figma-desktop\]' -or $overlayText -notmatch '127\.0\.0\.1:3845/mcp') {
        $overlayNeedsWrite = $true
    }
}
else {
    $overlayNeedsWrite = $true
    $overlayText = ''
}

if ($overlayNeedsWrite) {
    $merged = if ($overlayText -and $overlayText.Trim()) {
        ($overlayText.TrimEnd() + "`n`n" + $CodexFigmaBlock.Trim())
    }
    else {
        $CodexFigmaBlock.Trim()
    }
    Write-Action "ensure figma block in $CodexOverlayPath"
    if (-not $WhatIf) {
        $utf8 = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($CodexOverlayPath, $merged.TrimEnd() + "`n", $utf8)
    }
}
else {
    Write-Host "Codex overlay already has figma + figma-desktop"
}

# Run merge-codex-config.py if available (idempotent)
if ((Test-Path $MergePyPath) -and -not $WhatIf) {
    $py = (Get-Command python -ErrorAction SilentlyContinue)
    if ($py) {
        Write-Host "Running merge-codex-config.py ..."
        & python $MergePyPath 2>&1 | ForEach-Object { Write-Host $_ }
    }
}

# --- FIGMA_API_KEY env check ---
$pat = [Environment]::GetEnvironmentVariable('FIGMA_API_KEY', 'User')
if (-not $pat) {
    $pat = [Environment]::GetEnvironmentVariable('FIGMA_API_KEY', 'Process')
}
if ($pat) {
    Write-Host "FIGMA_API_KEY: set (user/process)" -ForegroundColor Green
}
else {
    Write-Host "WARN: FIGMA_API_KEY not set — PAT REST read path unavailable" -ForegroundColor Yellow
    Write-Host "  Set: [Environment]::SetEnvironmentVariable('FIGMA_API_KEY','figd_xxx','User')"
}

Write-Host ''
Write-Host '--- OAuth checklist (manual, once per client) ---' -ForegroundColor Cyan
if ($canonical -and $canonical.oauth) {
    Write-Host "Cursor:  $($canonical.oauth.cursor)"
    Write-Host "Codex:   $($canonical.oauth.codex)"
    Write-Host "Claude:  $($canonical.oauth.claude)"
}
Write-Host ''
Write-Host 'Verify: powershell -ExecutionPolicy Bypass -File scripts/verify-figma-mcp.ps1'
Write-Host 'Done.'
