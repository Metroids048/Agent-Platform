param()

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

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$governanceDir = Join-Path $repoRoot 'skills\curated\_governance'
$archiveDir = Join-Path $repoRoot 'skills\archive'
$manifestPath = Join-Path $governanceDir 'skills-manifest.md'
$inventoryPath = Join-Path $governanceDir 'skills-inventory.md'
$archiveIndexPath = Join-Path $archiveDir 'ARCHIVE-INDEX.md'

$cursorDir = Join-Path $env:USERPROFILE '.cursor\skills'
$codexDir = Join-Path $env:USERPROFILE '.codex\skills'
$claudeDir = Join-Path $env:USERPROFILE '.claude\skills'

$coreSkills = [ordered]@{
    'global-session-core'      = @{ category = '00-core-session'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Session start core' }
    'ai-coding-ok'             = @{ category = '00-core-session'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Project PDCA wrapper' }
    'using-agent-skills'       = @{ category = '00-core-session'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Skill discovery discipline' }
    'task-intake-bridge'       = @{ category = '10-intake-routing'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'New bridge layer' }
    'requirement-clarifier'    = @{ category = '10-intake-routing'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Fuzzy implementation clarifier' }
    'zero-to-one-gate'         = @{ category = '10-intake-routing'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = '0-to-1 gate' }
    'brainstorming'            = @{ category = '10-intake-routing'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Idea and direction exploration' }
    'writing-plans'            = @{ category = '20-planning-spec'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Implementation plans' }
    'planning-with-files-zh'   = @{ category = '20-planning-spec'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Chinese plan workflow' }
    'planning-and-task-breakdown' = @{ category = '20-planning-spec'; status = 'keep-extension'; sync = 'codex'; reason = 'Useful planner, Codex-side extension' }
    'spec-driven-development'  = @{ category = '20-planning-spec'; status = 'keep-extension'; sync = 'codex'; reason = 'Spec-first extension' }
    'incremental-implementation' = @{ category = '30-implementation'; status = 'keep-extension'; sync = 'codex'; reason = 'Implementation extension' }
    'tdd-workflow'             = @{ category = '30-implementation'; status = 'keep-extension'; sync = 'codex'; reason = 'TDD implementation extension' }
    'ouro-loop'                = @{ category = '30-implementation'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Autonomous verify-remediate loop' }
    'diagnose'                 = @{ category = '40-debugging'; status = 'keep-extension'; sync = 'codex'; reason = 'Diagnosis-only route' }
    'systematic-debugging'     = @{ category = '40-debugging'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Primary fix/debug route' }
    'ai-regression-testing'    = @{ category = '40-debugging'; status = 'keep-extension'; sync = 'codex'; reason = 'Regression follow-up extension' }
    'ai-delivery-gate'         = @{ category = '50-verification-review'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Agent Platform prototype gate' }
    'global-delivery-gate'     = @{ category = '50-verification-review'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Generic delivery gate' }
    'agent-verifier'           = @{ category = '50-verification-review'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Agent code audit' }
    'review'                   = @{ category = '50-verification-review'; status = 'keep-extension'; sync = 'codex'; reason = 'Review stance extension' }
    'figma-workflow'           = @{ category = '60-ui-figma'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Agent Platform Figma workflow' }
    'figma2code'               = @{ category = '60-ui-figma'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Pure Figma-to-code path' }
    'image-to-code'            = @{ category = '60-ui-figma'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Reference image implementation' }
    'redesign-existing-projects' = @{ category = '60-ui-figma'; status = 'keep-extension'; sync = 'cursor, codex, claude'; reason = 'Existing page redesign route' }
    'design-taste-frontend'    = @{ category = '60-ui-figma'; status = 'keep-core'; sync = 'cursor, claude, codex'; reason = 'Primary design taste winner' }
    'deep-research'            = @{ category = '70-research-docs'; status = 'keep-extension'; sync = 'codex'; reason = 'Research extension' }
    'pm-prd-writer'            = @{ category = '70-research-docs'; status = 'keep-extension'; sync = 'codex'; reason = 'PRD writing extension' }
    'create-prd'               = @{ category = '70-research-docs'; status = 'keep-extension'; sync = 'cursor, claude, codex'; reason = 'PRD template route' }
    'article-writing'          = @{ category = '70-research-docs'; status = 'keep-extension'; sync = 'codex'; reason = 'Long-form docs extension' }
    'writing-skills'           = @{ category = '80-skill-engineering'; status = 'keep-extension'; sync = 'codex'; reason = 'Skill authoring extension' }
    'skill-stocktake'          = @{ category = '80-skill-engineering'; status = 'keep-extension'; sync = 'codex'; reason = 'Skill inventory audit' }
    'agent-sort'               = @{ category = '80-skill-engineering'; status = 'keep-extension'; sync = 'codex'; reason = 'Daily/library trim' }
    'skill-creator'            = @{ category = '80-skill-engineering'; status = 'keep-extension'; sync = 'cursor, codex, claude'; reason = 'New skill scaffolding' }
    'claude-code-prompts-reference' = @{ category = '90-reference-optional'; status = 'archive'; sync = '-'; reason = 'Reference-only, not core route' }
    'most-capable-agent-reference'  = @{ category = '90-reference-optional'; status = 'archive'; sync = '-'; reason = 'Reference-only, not core route' }
}

$mergeMap = @{
    'design-taste-frontend-v1' = 'merge-into:design-taste-frontend'
    'verification-before-completion' = 'merge-into:global-delivery-gate'
}

$skillSets = @()
foreach ($pair in @(
    @{ tag = 'cursor'; path = $cursorDir },
    @{ tag = 'codex'; path = $codexDir },
    @{ tag = 'claude'; path = $claudeDir }
)) {
    if (-not (Test-Path $pair.path)) { continue }
    Get-ChildItem -Directory $pair.path | ForEach-Object {
        $skillSets += [pscustomobject]@{
            Name = $_.Name
            SourcePath = $_.FullName
            Target = $pair.tag
        }
    }
}

$allNames = @($skillSets.Name | Sort-Object -Unique)
$manifestLines = @(
    '# Skills Manifest',
    '',
    '> Curated governance source of truth for tri-end routing. Generated by `scripts/hooks/build-curated-skills-governance.ps1`.',
    '',
    '| name | source_path | category | status | winner_or_reason | sync_targets | notes |',
    '| --- | --- | --- | --- | --- | --- | --- |'
)

$inventoryLines = @(
    '# Skills Inventory',
    '',
    '> Keep / Merge / Archive inventory across Cursor, Claude Code, and Codex. Generated from local tri-end runtime directories.',
    '',
    '| status | count | notes |',
    '| --- | ---: | --- |'
)

$archiveNames = New-Object System.Collections.Generic.List[string]
$inventoryByStatus = @{
    'keep-core' = New-Object System.Collections.Generic.List[string]
    'keep-extension' = New-Object System.Collections.Generic.List[string]
    'archive' = New-Object System.Collections.Generic.List[string]
    'merge-into' = New-Object System.Collections.Generic.List[string]
}
$statusCounts = @{
    'keep-core' = 0
    'keep-extension' = 0
    'archive' = 0
    'merge-into' = 0
}

foreach ($name in $allNames) {
    $rows = @($skillSets | Where-Object { $_.Name -eq $name })
    $runtimePaths = ($rows.SourcePath | Sort-Object -Unique) -join '<br>'
    if ($coreSkills.Contains($name)) {
        $entry = $coreSkills[$name]
        $status = [string]$entry.status
        if ($statusCounts.ContainsKey($status)) { $statusCounts[$status]++ }
        if ($inventoryByStatus.ContainsKey($status)) { $inventoryByStatus[$status].Add($name) | Out-Null }
        if ($status -eq 'archive') { $archiveNames.Add($name) | Out-Null }
        $manifestLines += "| $name | $runtimePaths | $($entry.category) | $status | $($entry.reason) | $($entry.sync) | curated |"
        continue
    }

    if ($mergeMap.ContainsKey($name)) {
        $statusCounts['merge-into']++
        $inventoryByStatus['merge-into'].Add($name) | Out-Null
        $winner = [string]$mergeMap[$name]
        $archiveNames.Add($name) | Out-Null
        $manifestLines += "| $name | $runtimePaths | inherited | $winner | explicit winner mapping | - | merge loser |"
        continue
    }

    $targets = @($rows.Target | Sort-Object -Unique)
    if ($targets.Count -eq 1 -and $targets[0] -eq 'codex') {
        $statusCounts['keep-extension']++
        $inventoryByStatus['keep-extension'].Add($name) | Out-Null
        $manifestLines += "| $name | $runtimePaths | extension | keep-extension | codex-only runtime extension | codex | codex extra inventory |"
    }
    else {
        $statusCounts['archive']++
        $inventoryByStatus['archive'].Add($name) | Out-Null
        $archiveNames.Add($name) | Out-Null
        $manifestLines += "| $name | $runtimePaths | library | archive | outside curated core routing | - | retained only in source/vendor if needed |"
    }
}

foreach ($key in 'keep-core', 'keep-extension', 'merge-into', 'archive') {
    $notes = switch ($key) {
        'keep-core' { 'Synced to all three runtimes and eligible for curated routing.' }
        'keep-extension' { 'Available only where platform-specific or still useful as non-core extension.' }
        'merge-into' { 'Replaced by an explicitly chosen winner.' }
        'archive' { 'Removed from runtime sync and excluded from curated routing.' }
    }
    $count = if ($statusCounts.ContainsKey($key)) { $statusCounts[$key] } else { 0 }
    $inventoryLines += "| $key | $count | $notes |"
}

$inventoryLines += ''
foreach ($key in 'keep-core', 'keep-extension', 'merge-into', 'archive') {
    $inventoryLines += "## $key"
    $inventoryLines += ''
    foreach ($item in ($inventoryByStatus[$key] | Sort-Object -Unique)) {
        $inventoryLines += "- $item"
    }
    $inventoryLines += ''
}

$archiveLines = @(
    '# Archive Index',
    '',
    '> Skills removed from curated tri-end routing. Generated by `scripts/hooks/build-curated-skills-governance.ps1`.',
    '',
    '## Archived or Merged Out',
    ''
)
foreach ($item in ($archiveNames | Sort-Object -Unique)) {
    $archiveLines += "- $item"
}

Write-Utf8NoBomFile -Path $manifestPath -Content ($manifestLines -join "`r`n")
Write-Utf8NoBomFile -Path $inventoryPath -Content ($inventoryLines -join "`r`n")
Write-Utf8NoBomFile -Path $archiveIndexPath -Content ($archiveLines -join "`r`n")

Write-Host "Generated governance files:"
Write-Host " - $manifestPath"
Write-Host " - $inventoryPath"
Write-Host " - $archiveIndexPath"
