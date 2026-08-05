# Vendor external skills (deduped) into skills/vendor/ and optionally sync to global dirs.
param(
    [switch]$SkipSync,
    [switch]$Force,
    [string]$ProjectRoot = ''
)

$ErrorActionPreference = 'Stop'

if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$vendorRoot = Join-Path $ProjectRoot 'skills\vendor'
$cacheRoot = Join-Path $vendorRoot '_cache'
$manifestPath = Join-Path $vendorRoot 'external-skills-manifest.json'
$hooksDir = $PSScriptRoot
$syncScript = Join-Path $hooksDir 'sync-cursor-global-skills.ps1'
$scanScript = Join-Path $env:USERPROFILE '.ai-workspace\scripts\scan-global-skills.ps1'
if (-not (Test-Path $scanScript)) {
    $scanScript = Join-Path $hooksDir 'scan-global-skills.ps1'
}

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
}

function Get-ExistingSkillNames {
    $names = @{}
    $roots = @(
        (Join-Path $env:USERPROFILE '.cursor\skills'),
        (Join-Path $env:USERPROFILE '.claude\skills'),
        (Join-Path $env:USERPROFILE '.codex\skills'),
        (Join-Path $ProjectRoot 'skills')
    )
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Name -eq '_cache') { return }
            $names[$_.Name.ToLowerInvariant()] = $true
        }
    }
    return $names
}

function Test-SkillNameExists {
    param($ExistingNames, [string]$Name)
    return $ExistingNames.ContainsKey($Name.ToLowerInvariant())
}

function Add-SkillName {
    param($ExistingNames, [string]$Name)
    $ExistingNames[$Name.ToLowerInvariant()] = $true
}

function Clone-Or-Update {
    param([string]$Url, [string]$DestName)
    $dest = Join-Path $cacheRoot $DestName
    Ensure-Dir $cacheRoot
    if (Test-Path $dest) {
        Push-Location $dest
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        git pull --ff-only *> $null
        $pullOk = ($LASTEXITCODE -eq 0)
        $ErrorActionPreference = $prevEap
        Pop-Location
        if (-not $pullOk) {
            Write-Host "WARN: git pull failed for $DestName — using cached copy"
        }
    }
    else {
        git clone --depth 1 $Url $dest
        if ($LASTEXITCODE -ne 0) { throw "git clone failed: $Url" }
    }
    return $dest
}

function Copy-SkillTree {
    param(
        [string]$SourceDir,
        [string]$TargetName,
        [ref]$Installed,
        [ref]$Skipped,
        $ExistingNames
    )
    if (-not (Test-Path (Join-Path $SourceDir 'SKILL.md'))) {
        Write-Host "SKIP (no SKILL.md): $SourceDir"
        return
    }
    if (Test-SkillNameExists $ExistingNames $TargetName) {
        Write-Host "SKIP (duplicate name): $TargetName"
        $Skipped.Value++
        return
    }
    $target = Join-Path $vendorRoot $TargetName
    if ((Test-Path $target) -and -not $Force) {
        Write-Host "SKIP (vendor exists): $TargetName"
        $Skipped.Value++
        Add-SkillName $ExistingNames $TargetName
        return
    }
    if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    Copy-Item -LiteralPath $SourceDir -Destination $target -Recurse -Force
    Add-SkillName $ExistingNames $TargetName
    $Installed.Value++
    Write-Host "INSTALLED: $TargetName"
}

function Find-SkillDirs {
    param([string]$Root, [int]$MaxDepth = 4)
    $results = @()
    if (-not (Test-Path $Root)) { return $results }
    $queue = @([pscustomobject]@{ Path = $Root; Depth = 0 })
    while ($queue.Count -gt 0) {
        $item = $queue[0]
        $queue = $queue[1..($queue.Count - 1)]
        if (Test-Path (Join-Path $item.Path 'SKILL.md')) {
            $results += $item.Path
            continue
        }
        if ($item.Depth -ge $MaxDepth) { continue }
        Get-ChildItem -LiteralPath $item.Path -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $queue += [pscustomobject]@{ Path = $_.FullName; Depth = $item.Depth + 1 }
        }
    }
    return $results
}

function New-ReferenceSkill {
    param(
        [string]$Name,
        [string]$Description,
        [string]$ReferencePath,
        [ref]$Installed,
        $ExistingNames
    )
    if (Test-SkillNameExists $ExistingNames $Name) {
        Write-Host "SKIP (duplicate reference): $Name"
        return
    }
    $target = Join-Path $vendorRoot $Name
    Ensure-Dir $target
    $refFile = Join-Path $target 'reference.md'
    if (Test-Path $ReferencePath) {
        Copy-Item -LiteralPath $ReferencePath -Destination $refFile -Force
    }
    $skillMd = @"
---
name: $Name
description: $Description
disable-model-invocation: true
---

# $Name

Read-only reference material vendored from upstream. **Do not** merge into always-on rules.

## Source

See ``reference.md`` in this folder.

## Use when

User asks to compare agent system prompts, study Claude Code prompt structure, or reference upstream prompt patterns — not for routine coding tasks.
"@
    Write-Utf8NoBomFile -Path (Join-Path $target 'SKILL.md') -Content $skillMd
    Add-SkillName $ExistingNames $Name
    $Installed.Value++
    Write-Host "INSTALLED reference: $Name"
}

Ensure-Dir $vendorRoot
Ensure-Dir $cacheRoot

$existing = Get-ExistingSkillNames
$installed = 0
$skipped = 0
$installedNames = @()

Write-Host "`n=== Clone upstream repos ===`n"

$tactus = Clone-Or-Update -Url 'https://github.com/Castor6/tactus.git' -DestName 'tactus'
$awesome = Clone-Or-Update -Url 'https://github.com/bergside/awesome-design-skills.git' -DestName 'awesome-design-skills'
$fainir = Clone-Or-Update -Url 'https://github.com/fainir/most-capable-agent-system-prompt.git' -DestName 'most-capable-agent-system-prompt'
$piebald = Clone-Or-Update -Url 'https://github.com/piebald-ai/claude-code-system-prompts.git' -DestName 'claude-code-system-prompts'

# bestskills.app curates Anthropic/Composio skills — use anthropics/skills as mirror
$anthropicSkills = $null
try {
    $anthropicSkills = Clone-Or-Update -Url 'https://github.com/anthropics/skills.git' -DestName 'anthropics-skills'
}
catch {
    Write-Host "WARN: anthropics/skills clone failed — skipping bestskills mirror: $_"
}

Write-Host "`n=== Install tactus design-style ===`n"
$tactusDesign = Join-Path $tactus '.agents\skills\design-style'
if (Test-Path $tactusDesign) {
    Copy-SkillTree -SourceDir $tactusDesign -TargetName 'tactus-design-style' -Installed ([ref]$installed) -Skipped ([ref]$skipped) -ExistingNames $existing
    if (Test-SkillNameExists $existing 'tactus-design-style') { $installedNames += 'tactus-design-style' }
}

Write-Host "`n=== Install awesome-design-skills (deduped via index.json) ===`n"
$awesomeIndexPath = Join-Path $awesome 'skills\index.json'
if (Test-Path $awesomeIndexPath) {
    $awesomeIndex = Get-Content -LiteralPath $awesomeIndexPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($prop in $awesomeIndex.PSObject.Properties) {
        $slug = $prop.Name
        $entry = $prop.Value
        if (-not $entry.skillPath) { continue }
        $sourceDir = Join-Path $awesome ($entry.skillPath -replace '/SKILL\.md$', '' -replace '/', '\')
        if (-not (Test-Path (Join-Path $sourceDir 'SKILL.md'))) { continue }
        if (Test-SkillNameExists $existing $slug) {
            Write-Host "SKIP awesome (global has $slug)"
            $skipped++
            continue
        }
        $vendorName = "awesome-$slug"
        Copy-SkillTree -SourceDir $sourceDir -TargetName $vendorName -Installed ([ref]$installed) -Skipped ([ref]$skipped) -ExistingNames $existing
        if (Test-SkillNameExists $existing $vendorName) { $installedNames += $vendorName }
    }
}

Write-Host "`n=== Install anthropics/skills mirror (bestskills dedupe) ===`n"
if ($anthropicSkills -and (Test-Path $anthropicSkills)) {
    $anthropicSkillsRoot = Join-Path $anthropicSkills 'skills'
    if (Test-Path $anthropicSkillsRoot) {
        Get-ChildItem -LiteralPath $anthropicSkillsRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $leaf = $_.Name
            if (Test-SkillNameExists $existing $leaf) {
                $skipped++
                return
            }
            if (-not (Test-Path (Join-Path $_.FullName 'SKILL.md'))) { return }
            Copy-SkillTree -SourceDir $_.FullName -TargetName $leaf -Installed ([ref]$installed) -Skipped ([ref]$skipped) -ExistingNames $existing
            if (Test-SkillNameExists $existing $leaf) { $installedNames += $leaf }
        }
    }
}

Write-Host "`n=== Reference skills (system prompts) ===`n"
$fainirReadme = Join-Path $fainir 'README.md'
if (-not (Test-Path $fainirReadme)) { $fainirReadme = Join-Path $fainir 'SYSTEM_PROMPT.md' }
New-ReferenceSkill -Name 'most-capable-agent-reference' -Description 'Read-only reference for fainir/most-capable-agent-system-prompt patterns. Use when studying agent system prompt design — not for routine tasks.' -ReferencePath $fainirReadme -Installed ([ref]$installed) -ExistingNames $existing
if (Test-SkillNameExists $existing 'most-capable-agent-reference') { $installedNames += 'most-capable-agent-reference' }

$piebaldReadme = Join-Path $piebald 'README.md'
New-ReferenceSkill -Name 'claude-code-prompts-reference' -Description 'Read-only reference for piebald-ai/claude-code-system-prompts (Claude Code built-in prompts). Use when comparing Claude Code prompt structure — not for routine coding.' -ReferencePath $piebaldReadme -Installed ([ref]$installed) -ExistingNames $existing
if (Test-SkillNameExists $existing 'claude-code-prompts-reference') { $installedNames += 'claude-code-prompts-reference' }

# Copy piebald prompt files as supplementary reference
$piebaldTarget = Join-Path $vendorRoot 'claude-code-prompts-reference'
if (Test-Path $piebaldTarget) {
    $promptsDir = Join-Path $piebaldTarget 'upstream-prompts'
    Ensure-Dir $promptsDir
    Get-ChildItem -LiteralPath $piebald -File -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $promptsDir $_.Name) -Force
    }
}

$manifest = @{
    updatedAt      = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    installedCount = $installed
    skippedCount   = $skipped
    installedNames = @($installedNames | Select-Object -Unique)
    sources        = @(
        'Castor6/tactus',
        'bergside/awesome-design-skills',
        'fainir/most-capable-agent-system-prompt',
        'piebald-ai/claude-code-system-prompts',
        'anthropics/skills (bestskills mirror)'
    )
}
Write-Utf8NoBomFile -Path $manifestPath -Content ($manifest | ConvertTo-Json -Depth 5)
Write-Host "`nManifest: $manifestPath"
Write-Host "Installed: $installed | Skipped: $skipped"

if (-not $SkipSync -and (Test-Path $syncScript)) {
    Write-Host "`n=== Sync to global skills dirs ===`n"
    Push-Location $ProjectRoot
    & $syncScript -Force -AlsoClaude
    Pop-Location
}

if (Test-Path $scanScript) {
    Write-Host "`n=== Refresh global-skills-index ===`n"
    & $scanScript -OutputFormat Plain -HookEvent Plain
}

Write-Host "`nDone install-external-skills.ps1"
