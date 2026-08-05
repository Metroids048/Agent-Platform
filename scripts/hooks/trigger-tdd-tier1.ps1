# Trigger TDD - test global skill routing for Tier1 DAILY skills (single catalog load).
param(
    [string]$ProjectRoot = '',
    [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'
$scanScript = Join-Path $PSScriptRoot 'scan-global-skills.ps1'
if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}
if (-not $OutputDir) {
    $OutputDir = Join-Path $ProjectRoot 'docs\skills-audit'
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

. $scanScript

$tests = @(
    @{ skill = 'figma-workflow'; prompt = 'implement ops platform page from Figma mockup' },
    @{ skill = 'figma2code'; prompt = 'Figma URL to HTML frame extraction interactions' },
    @{ skill = 'writing-skills'; prompt = 'how to write high quality skill trigger design' },
    @{ skill = 'skill-stocktake'; prompt = 'audit all skills inventory stocktake compliance' },
    @{ skill = 'agent-sort'; prompt = 'agent sort DAILY LIBRARY trim ECC for this repo' },
    @{ skill = 'zero-to-one-gate'; prompt = 'greenfield new module build from scratch architecture' },
    @{ skill = 'systematic-debugging'; prompt = 'bug keeps failing root cause before fix' },
    @{ skill = 'ai-delivery-gate'; prompt = 'prototype verify-all delivery sign-off after js edit' },
    @{ skill = 'deep-research'; prompt = 'deep research multi-source citations fact-check' },
    @{ skill = 'ouro-loop'; prompt = 'ouro loop MAP PLAN BUILD VERIFY autonomous task' },
    @{ skill = 'brainstorming'; prompt = 'brainstorm approaches before implementing new feature' },
    @{ skill = 'design-taste-frontend'; prompt = 'landing page anti-slop portfolio redesign taste' },
    @{ skill = 'tactus-design-style'; prompt = 'apply tactus design style preset styles-mapping' },
    @{ skill = 'figma-workflow'; prompt = 'sync HTML prototype to Figma figma.config' },
    @{ skill = 'figma2code'; prompt = 'design mockup to code file key node id' },
    @{ skill = 'writing-skills'; prompt = 'skills not invoked fix description CSO' },
    @{ skill = 'skill-stocktake'; prompt = 'skill quality audit why good skills not called' }
)

$catalogItems = Build-GlobalCatalog -ProjectRoot $ProjectRoot
$syncConfig = Get-SkillsSyncConfig
$intentProfiles = Get-IntentProfiles -SyncConfig $syncConfig
$topN = $syncConfig.topMatches

$results = @()
$pass = 0
$fail = 0

foreach ($t in $tests) {
    $detectedIntents = Detect-UserIntents -UserPrompt $t.prompt -IntentProfiles $intentProfiles
    $matches = Invoke-GlobalSkillRouting `
        -CatalogItems $catalogItems `
        -SyncConfig $syncConfig `
        -UserPrompt $t.prompt `
        -DetectedIntents $detectedIntents `
        -TopN $topN
    $top = @($matches | ForEach-Object { $_.Name })
    $hit = $top -contains $t.skill
    if ($hit) { $pass++ } else { $fail++ }
    $scoreLine = ($matches | ForEach-Object { "$($_.Name)=$($_.Score)" }) -join ', '
    $results += [pscustomobject]@{
        skill  = $t.skill
        prompt = $t.prompt
        hit    = $hit
        top    = ($top -join ', ')
        scores = $scoreLine
    }
}

$total = $pass + $fail
$rate = if ($total -gt 0) { [math]::Round(100.0 * $pass / $total, 1) } else { 0 }
$dateStamp = Get-Date -Format 'yyyy-MM-dd'
$jsonPath = Join-Path $OutputDir "$dateStamp-trigger-tdd.json"
$mdPath = Join-Path $OutputDir "$dateStamp-trigger-tdd.md"

[ordered]@{
    evaluatedAt      = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    catalogSize      = $catalogItems.Count
    routableExcluded = 'awesome-* + routingExcludeNames'
    topN             = $topN
    pass             = $pass
    fail             = $fail
    hitRatePct       = $rate
    targetPct        = 90
    results          = $results
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = @(
    "# Trigger TDD Report - $dateStamp",
    "",
    "Catalog: $($catalogItems.Count) skills | TopN: $topN | Hit rate: $rate% ($pass/$total) target >= 90%",
    ""
)
foreach ($r in $results) {
    $md += "- $($r.skill): hit=$($r.hit)"
    $md += "  prompt: $($r.prompt)"
    $md += "  top: $($r.top)"
}
Set-Content -LiteralPath $mdPath -Value ($md -join "`n") -Encoding UTF8

Write-Host "Trigger TDD: $rate% ($pass/$total) -> $mdPath"
if ($rate -lt 90) { exit 1 }
