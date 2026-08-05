# Remove library-only skills from global dirs (awesome-*, reference skills) after routing refactor.
param(
    [switch]$DryRun,
    [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot 'skills-sync.config.json'
}
$raw = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

$prefixes = @()
if ($raw.excludeNamePrefixes) { $prefixes = @($raw.excludeNamePrefixes) }
$extraNames = @()
if ($raw.excludeNames) { $extraNames = @($raw.excludeNames) }

$globalRoots = @(
    (Join-Path $env:USERPROFILE '.cursor\skills'),
    (Join-Path $env:USERPROFILE '.claude\skills'),
    (Join-Path $env:USERPROFILE '.codex\skills')
)

$removed = @()
foreach ($root in $globalRoots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($dir in (Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue)) {
        $name = $dir.Name
        $shouldRemove = $false
        foreach ($prefix in $prefixes) {
            if ($name.StartsWith($prefix)) { $shouldRemove = $true; break }
        }
        if (-not $shouldRemove -and ($extraNames -contains $name)) { $shouldRemove = $true }
        if (-not $shouldRemove) { continue }

        if ($DryRun) {
            Write-Host "DRY-RUN remove: $($dir.FullName)"
        }
        else {
            Remove-Item -LiteralPath $dir.FullName -Recurse -Force
            Write-Host "Removed: $($dir.FullName)"
        }
        $removed += $name
    }
}

Write-Host "Prune complete. Removed $($removed.Count) skill dirs (unique names: $(@($removed | Select-Object -Unique).Count))."
