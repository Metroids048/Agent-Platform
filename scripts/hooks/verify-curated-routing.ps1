param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$scan = Join-Path $PSScriptRoot 'scan-global-skills.ps1'
$cases = @(
    @{ prompt = 'Turn this fuzzy request into an execution-ready brief'; expect = '10-intake-routing' },
    @{ prompt = 'Design a brand new cross-page workflow'; expect = '10-intake-routing' },
    @{ prompt = 'Break this project into an implementation plan'; expect = '20-planning-spec' },
    @{ prompt = 'Implement this feature using the existing pattern'; expect = '30-implementation' },
    @{ prompt = 'Find the root cause of this regression first'; expect = '40-debugging' },
    @{ prompt = 'Verify this change before we claim done'; expect = '50-verification-review' },
    @{ prompt = 'Implement this page from a Figma frame'; expect = '60-ui-figma' },
    @{ prompt = 'Write a PRD and research summary for this idea'; expect = '70-research-docs' },
    @{ prompt = 'Why was this skill not triggered for the request'; expect = '80-skill-engineering' },
    @{ prompt = 'Study the built-in Claude Code prompt structure'; expect = '90-reference-optional' },
    @{ prompt = 'Turn this fuzzy implementation request into an execution-ready brief'; expect = '10-intake-routing' },
    @{ prompt = 'Review and verify this delivery before we claim done'; expect = '50-verification-review' }
)

$failed = @()
foreach ($case in $cases) {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scan -OutputFormat Plain -HookEvent Plain -SkipIndexWrite -UserPrompt $case.prompt
    $text = ($output | Out-String)
    if ($text -notmatch [regex]::Escape("Top category: $($case.expect)")) {
        $failed += $case
        Write-Host "FAIL: $($case.prompt) -> expected $($case.expect)"
    }
    else {
        Write-Host "PASS: $($case.expect) <- $($case.prompt)"
    }
}

if ($failed.Count -gt 0) {
    throw "Curated routing verification failed for $($failed.Count) cases."
}

Write-Host 'ALL PASS: curated routing smoke checks'
