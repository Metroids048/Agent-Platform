# Global skills scanner for Claude Code / Codex hooks.
# Scans ~/.cursor/skills, ~/.claude/skills, ~/.codex/skills, optional project skills/.
param(
    [ValidateSet('Cursor', 'Claude', 'Codex', 'Plain')]
    [string]$OutputFormat = 'Plain',
    [ValidateSet('SessionStart', 'UserPromptSubmit', 'Plain')]
    [string]$HookEvent = 'Plain',
    [int]$TopMatches = 8,
    [string]$StartDir = ''
)

$ErrorActionPreference = 'Stop'

$excludePathPattern = '(\\|/)(agency-agents-main|\.claude|\.codex|\.gemini|\.continue|\.factory|\.hermes|\.kiro|\.mastracode|\.opencode|\.codebuddy|\.pi|\.cursor)(\\|/)'
$globalIndexPath = Join-Path $env:USERPROFILE '.claude\global-skills-index.md'
$globalMemoryRoot = Join-Path $env:USERPROFILE '.ai-workspace\memory'
$sourcePriority = @('cursor', 'claude', 'codex', 'project')

function Get-GlobalMemoryPaths {
    $paths = [ordered]@{
        userMemory    = Join-Path $globalMemoryRoot 'user-memory.md'
        taskHistory   = Join-Path $globalMemoryRoot 'global-task-history.md'
        decisionsLog  = Join-Path $globalMemoryRoot 'global-decisions-log.md'
        projectsRegistry = Join-Path $globalMemoryRoot 'projects-registry.md'
    }
    return $paths
}

function Find-ProjectMemoryOverlay {
    param([string]$SeedDir)

    $candidates = @()
    if ($SeedDir) { $candidates += $SeedDir }
    if ($env:CLAUDE_PROJECT_DIR) { $candidates += $env:CLAUDE_PROJECT_DIR }
    if ($env:CURSOR_PROJECT_DIR) { $candidates += $env:CURSOR_PROJECT_DIR }
    if ($env:CODEX_PROJECT_DIR) { $candidates += $env:CODEX_PROJECT_DIR }
    $candidates += (Get-Location).Path

    $seen = @{}
    foreach ($start in $candidates) {
        if ([string]::IsNullOrWhiteSpace($start)) { continue }
        $dir = (Resolve-Path -LiteralPath $start -ErrorAction SilentlyContinue).Path
        if (-not $dir) { $dir = $start }
        while ($dir) {
            if ($seen.ContainsKey($dir)) { break }
            $seen[$dir] = $true
            $overlay = Join-Path $dir '.github\agent\memory\project-memory.md'
            if (Test-Path $overlay) { return $overlay }
            $parent = Split-Path $dir -Parent
            if (-not $parent -or $parent -eq $dir) { break }
            $dir = $parent
        }
    }
    return $null
}

function Get-SkillsSyncConfig {
    $candidates = @(
        (Join-Path $PSScriptRoot 'skills-sync.config.json'),
        (Join-Path $env:USERPROFILE '.ai-workspace\scripts\skills-sync.config.json'),
        (Join-Path $env:USERPROFILE '.claude\scripts\skills-sync.config.json'),
        (Join-Path $env:USERPROFILE '.cursor\hooks\skills-sync.config.json')
    )
    $configPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $configPath) {
        return [pscustomobject]@{ alwaysOnSkills = @('global-session-core') }
    }
    $raw = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $alwaysOn = @()
    if ($raw.alwaysOnSkills) { $alwaysOn = @($raw.alwaysOnSkills) }
    if ($alwaysOn.Count -eq 0) { $alwaysOn = @('global-session-core') }
    return [pscustomobject]@{ alwaysOnSkills = $alwaysOn }
}

function Resolve-AlwaysOnSkillPaths {
    param(
        [array]$CatalogItems,
        [array]$AlwaysOnNames
    )

    $resolved = @()
    foreach ($name in $AlwaysOnNames) {
        $match = $CatalogItems | Where-Object { $_.Name -eq $name } | Select-Object -First 1
        if ($match) {
            $resolved += $match
            continue
        }
        $cursorPath = Join-Path (Join-Path $env:USERPROFILE '.cursor\skills') "$name\SKILL.md"
        if (Test-Path $cursorPath) {
            $resolved += [pscustomobject]@{
                Name        = $name
                Description = 'always-on session core'
                SkillFile   = $cursorPath
                Source      = 'cursor'
            }
        }
    }
    return $resolved
}

function Get-FrontmatterYaml {
    param([string]$Content)
    if ($Content -match '(?ms)^---\s*\r?\n(.*?)\r?\n---') {
        return $Matches[1]
    }
    return $null
}

function Get-FrontmatterField {
    param([string]$Content, [string]$Field)
    $yaml = Get-FrontmatterYaml -Content $Content
    if (-not $yaml) { return $null }
    if ($yaml -match "(?m)^${Field}:\s*\|\s*$") {
        $start = $Matches[0]
        $rest = $yaml.Substring($yaml.IndexOf($start) + $start.Length)
        $lines = @()
        foreach ($line in ($rest -split "`r?`n")) {
            if ($line -match '^\S') { break }
            if ($line -match '^(\s+)(.*)$') { $lines += $Matches[2].TrimEnd() }
            elseif ($line.Trim() -eq '') { $lines += '' }
            else { break }
        }
        return (($lines -join ' ').Trim())
    }
    if ($yaml -match "(?m)^${Field}:\s*['""](.+?)['""]\s*$") {
        return $Matches[1].Trim()
    }
    if ($yaml -match "(?m)^${Field}:\s*(.+)$") {
        return $Matches[1].Trim().Trim('"').Trim("'")
    }
    return $null
}

function Find-ProjectRootWithSkills {
    param([string]$SeedDir)

    $candidates = @()
    if ($SeedDir) { $candidates += $SeedDir }
    if ($env:CLAUDE_PROJECT_DIR) { $candidates += $env:CLAUDE_PROJECT_DIR }
    if ($env:CURSOR_PROJECT_DIR) { $candidates += $env:CURSOR_PROJECT_DIR }
    if ($env:CODEX_PROJECT_DIR) { $candidates += $env:CODEX_PROJECT_DIR }
    $candidates += (Get-Location).Path

    $seen = @{}
    foreach ($start in $candidates) {
        if ([string]::IsNullOrWhiteSpace($start)) { continue }
        $dir = (Resolve-Path -LiteralPath $start -ErrorAction SilentlyContinue).Path
        if (-not $dir) { $dir = $start }
        while ($dir) {
            if ($seen.ContainsKey($dir)) { break }
            $seen[$dir] = $true
            $skillsRoot = Join-Path $dir 'skills'
            if (Test-Path $skillsRoot) {
                $hasSkill = Get-ChildItem -Path $skillsRoot -Filter 'SKILL.md' -Recurse -File -ErrorAction SilentlyContinue |
                    Where-Object { $_.FullName -notmatch $excludePathPattern } |
                    Select-Object -First 1
                if ($hasSkill) { return $dir }
            }
            $parent = Split-Path $dir -Parent
            if (-not $parent -or $parent -eq $dir) { break }
            $dir = $parent
        }
    }
    return $null
}

function Get-GlobalSkillRoots {
    param([string]$ProjectRoot)

    $roots = [ordered]@{}
    $cursor = Join-Path $env:USERPROFILE '.cursor\skills'
    $claude = Join-Path $env:USERPROFILE '.claude\skills'
    $codex = Join-Path $env:USERPROFILE '.codex\skills'
    if (Test-Path $cursor) { $roots['cursor'] = $cursor }
    if (Test-Path $claude) { $roots['claude'] = $claude }
    if (Test-Path $codex) { $roots['codex'] = $codex }
    if ($ProjectRoot) {
        $projSkills = Join-Path $ProjectRoot 'skills'
        if (Test-Path $projSkills) { $roots['project'] = $projSkills }
    }
    return $roots
}

function Get-SkillFilesFromRoot {
    param(
        [string]$RootPath,
        [string]$SourceTag,
        [string]$ProjectRoot
    )

    if ($SourceTag -eq 'project') {
        return @(Get-ChildItem -Path $RootPath -Filter 'SKILL.md' -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch $excludePathPattern })
    }
    return @(Get-ChildItem -Path $RootPath -Filter 'SKILL.md' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.DirectoryName -eq $RootPath -or $_.Directory.Parent.FullName -eq $RootPath })
}

function Build-GlobalCatalog {
    param([string]$ProjectRoot)

    $allByName = @{}
    $roots = Get-GlobalSkillRoots -ProjectRoot $ProjectRoot

    foreach ($tag in $sourcePriority) {
        if (-not $roots.Contains($tag)) { continue }
        $rootPath = $roots[$tag]
        $files = if ($tag -eq 'project') {
            Get-ChildItem -Path $rootPath -Filter 'SKILL.md' -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch $excludePathPattern }
        }
        else {
            Get-ChildItem -Path $rootPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $skillFile = Join-Path $_.FullName 'SKILL.md'
                if (Test-Path $skillFile) { Get-Item -LiteralPath $skillFile }
            }
        }

        foreach ($file in $files) {
            $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
            $name = Get-FrontmatterField -Content $content -Field 'name'
            if (-not $name) { $name = Split-Path $file.DirectoryName -Leaf }
            $description = Get-FrontmatterField -Content $content -Field 'description'
            if (-not $description) { $description = '(no description)' }

            if (-not $allByName.ContainsKey($name)) {
                $allByName[$name] = [pscustomobject]@{
                    Name        = $name
                    Description = $description
                    SkillFile   = $file.FullName
                    Source      = $tag
                }
            }
        }
    }

    return @($allByName.Values | Sort-Object Name)
}

function Write-GlobalSkillsIndex {
    param([array]$Items)

    $indexDir = Split-Path $globalIndexPath -Parent
    if (-not (Test-Path $indexDir)) {
        New-Item -ItemType Directory -Path $indexDir -Force | Out-Null
    }
    $lines = @(
        '# Global Skills Index',
        '',
        '> Auto-generated by scan-global-skills.ps1. Do not edit by hand.',
        "> Last updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "> Total: $($Items.Count) skills",
        '',
        '| name | source | description | path |',
        '| --- | --- | --- | --- |'
    )
    foreach ($item in $Items) {
        $desc = $item.Description -replace '\|', '\|' -replace "`r?`n", ' '
        $lines += "| $($item.Name) | $($item.Source) | $desc | $($item.SkillFile) |"
    }
    Set-Content -LiteralPath $globalIndexPath -Value ($lines -join "`n") -Encoding UTF8
}

function Get-HookUserPrompt {
    $stdinJson = try { [Console]::In.ReadToEnd() } catch { '' }
    if (-not $stdinJson) {
        $stdinJson = try { ($input | Out-String) } catch { '' }
    }
    if (-not $stdinJson.Trim()) { return $null }
    try {
        $hookData = $stdinJson | ConvertFrom-Json
        return $hookData.prompt
    }
    catch {
        return $null
    }
}

function Score-SkillAgainstPrompt {
    param(
        [array]$Skills,
        [string]$UserPrompt
    )

    if ([string]::IsNullOrWhiteSpace($UserPrompt)) { return @() }

    $promptLower = $UserPrompt.ToLowerInvariant()
    $promptWords = @()
    foreach ($m in [regex]::Matches($promptLower, '[\p{L}\p{N}]+')) {
        if ($m.Value.Length -gt 2) { $promptWords += $m.Value }
    }
    $promptWordSet = @{}
    foreach ($w in $promptWords) { $promptWordSet[$w] = $true }

    $scored = @()
    foreach ($skill in $Skills) {
        $score = 0
        $nameLower = $skill.Name.ToLowerInvariant()
        $nameTokens = $nameLower -split '[-_\s]+' | Where-Object { $_.Length -gt 2 }
        foreach ($token in $nameTokens) {
            if ($promptLower.Contains($token)) { $score += 5 }
        }
        if ($promptLower.Contains($nameLower) -and $nameLower.Length -gt 5) { $score += 10 }

        $descLower = $skill.Description.ToLowerInvariant()
        $hitCount = 0
        $seenDescWords = @{}
        foreach ($m in [regex]::Matches($descLower, '[\p{L}\p{N}]+')) {
            $val = $m.Value
            if ($val.Length -gt 4 -and -not $seenDescWords.ContainsKey($val)) {
                $seenDescWords[$val] = $true
                if ($promptWordSet.ContainsKey($val) -or $promptLower.Contains($val)) {
                    $hitCount++
                }
                if ($seenDescWords.Count -gt 40) { break }
            }
        }
        $score += $hitCount * 2

        if ($score -ge 5) {
            $scored += [pscustomobject]@{
                Name        = $skill.Name
                Description = if ($skill.Description.Length -gt 200) {
                    $skill.Description.Substring(0, 197) + '...'
                }
                else { $skill.Description }
                SkillFile   = $skill.SkillFile
                Score       = $score
            }
        }
    }

    return @($scored | Sort-Object Score -Descending | Select-Object -First $TopMatches)
}

function Build-SessionStartContext {
    param(
        [array]$Items,
        [array]$AlwaysOnItems,
        [string]$ProjectMemoryOverlay
    )

    $mem = Get-GlobalMemoryPaths
    $lines = @(
        '## Global Skills (SessionStart)',
        '',
        "Total skills available: **$($Items.Count)** (scanned from ~/.cursor/skills and other global dirs).",
        "Full index: ``$globalIndexPath``",
        ''
    )

    if ($AlwaysOnItems.Count -gt 0) {
        $lines += '**ALWAYS ON — Read these SKILL.md files before any other tools this session:**'
        $lines += ''
        foreach ($a in $AlwaysOnItems) {
            $lines += "- **$($a.Name)**: ``$($a.SkillFile)``"
        }
        $lines += ''
    }

    if (Test-Path $mem.userMemory) {
        $lines += '**Global memory (Read before coding tasks):**'
        $lines += ''
        $lines += "- **user-memory**: ``$($mem.userMemory)``"
        if (Test-Path $mem.taskHistory) {
            $lines += "- **global-task-history** (recent entries): ``$($mem.taskHistory)``"
        }
        if (Test-Path $mem.decisionsLog) {
            $lines += "- **global-decisions-log**: ``$($mem.decisionsLog)``"
        }
        $lines += ''
        $lines += 'PDCA: use `ai-coding-ok` — update global-task-history after every coding task.'
        $lines += ''
    }

    if ($ProjectMemoryOverlay) {
        $lines += "**Project overlay (team memory):** Read ``$ProjectMemoryOverlay`` if task touches this repo's conventions."
        $lines += ''
    }

    $globalAgents = Join-Path $env:USERPROFILE '.claude\AGENTS.md'
    if (Test-Path $globalAgents) {
        $lines += "Default rules: ``$globalAgents`` (project AGENTS.md overrides if present)."
        $lines += ''
    }

    $lines += @(
        '**Required workflow for every task:**',
        '1. Read always-on skills + global memory paths above first.',
        '2. Semantically match the user request against global skill names/descriptions.',
        '3. For each additional applicable skill, **Read** the absolute path to `SKILL.md` before using other tools.',
        '4. Follow skill bodies strictly; mention enabled skill names in one short line at reply start (`Skills: ...`).',
        '5. Before claiming done: follow `global-delivery-gate` skill for verification.',
        '6. Priority: user instruction > matched global skill > built-in skill > default.',
        ''
    )
    return ($lines -join "`n")
}

function Build-UserPromptContext {
    param(
        [array]$AllItems,
        [array]$Matches,
        [string]$UserPrompt
    )

    $lines = @(
        '## Global Skills (matched)',
        '',
        "Scanned **$($AllItems.Count)** global skills. Index: ``$globalIndexPath``",
        ''
    )

    if ($Matches.Count -gt 0) {
        $lines += '**Before replying or using tools**, Read these SKILL.md files and follow them:'
        $lines += ''
        foreach ($m in $Matches) {
            $lines += "- **$($m.Name)** (score $($m.Score)): $($m.Description)"
            $lines += "  - Path: ``$($m.SkillFile)``"
        }
        $lines += ''
        $lines += 'Use the Read tool on each path above when the skill applies. Do not guess workflow from description alone.'
    }
    else {
        $lines += 'No strong keyword match for this prompt. Still check the global index for semantic fits.'
        $lines += ''
        $lines += '**Workflow:** Read ``' + $globalIndexPath + '`` or scan descriptions; Read applicable SKILL.md files before tools.'
    }

    $lines += ''
    $lines += 'Priority: user instruction > global skill > built-in > default.'
    return ($lines -join "`n")
}

function Emit-Output {
    param(
        [string]$Context,
        [string]$Format,
        [string]$Event
    )

    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

    if ([string]::IsNullOrWhiteSpace($Context)) {
        if ($Format -eq 'Claude') {
            Write-Output '{"continue":true}'
        }
        return
    }

    switch ($Format) {
        'Claude' {
            $eventName = if ($Event -eq 'Plain') { 'SessionStart' } else { $Event }
            @{
                continue           = $true
                hookSpecificOutput = @{
                    hookEventName     = $eventName
                    additionalContext = $Context
                }
            } | ConvertTo-Json -Compress -Depth 5
        }
        'Cursor' {
            @{ additional_context = $Context } | ConvertTo-Json -Compress
        }
        default {
            Write-Output $Context
        }
    }
}

$projectRoot = Find-ProjectRootWithSkills -SeedDir $StartDir
$items = Build-GlobalCatalog -ProjectRoot $projectRoot

if ($items.Count -eq 0) {
    if ($OutputFormat -eq 'Claude') { Write-Output '{"continue":true}' }
    exit 0
}

Write-GlobalSkillsIndex -Items $items

$syncConfig = Get-SkillsSyncConfig
$alwaysOnItems = Resolve-AlwaysOnSkillPaths -CatalogItems $items -AlwaysOnNames $syncConfig.alwaysOnSkills
$projectOverlay = Find-ProjectMemoryOverlay -SeedDir $StartDir

$context = $null
if ($HookEvent -eq 'SessionStart') {
    $context = Build-SessionStartContext -Items $items -AlwaysOnItems $alwaysOnItems -ProjectMemoryOverlay $projectOverlay
}
elseif ($HookEvent -eq 'UserPromptSubmit') {
    $userPrompt = Get-HookUserPrompt
    $matches = Score-SkillAgainstPrompt -Skills $items -UserPrompt $userPrompt
    $context = Build-UserPromptContext -AllItems $items -Matches $matches -UserPrompt $userPrompt
}
else {
    $userPrompt = $args[0]
    if (-not $userPrompt) { $userPrompt = '写 PRD' }
    $matches = Score-SkillAgainstPrompt -Skills $items -UserPrompt $userPrompt
    $context = Build-UserPromptContext -AllItems $items -Matches $matches -UserPrompt $userPrompt
}

Emit-Output -Context $context -Format $OutputFormat -Event $HookEvent
exit 0
