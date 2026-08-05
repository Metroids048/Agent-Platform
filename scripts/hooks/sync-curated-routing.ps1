param(
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) {
        if ($WhatIf) { Write-Host "[WhatIf] mkdir $Path" }
        else { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
    }
}

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$src = Join-Path $repoRoot 'skills\curated'
$dst = Join-Path $env:USERPROFILE '.ai-workspace\skills-curated'

if (-not (Test-Path $src)) {
    throw "Curated catalog not found: $src"
}

Ensure-Dir $dst

if ($WhatIf) {
    Write-Host "[WhatIf] sync $src -> $dst"
}
else {
    Get-ChildItem -LiteralPath $src -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $dst -Recurse -Force
    }
    Write-Host "Synced curated routing catalog -> $dst"
}
