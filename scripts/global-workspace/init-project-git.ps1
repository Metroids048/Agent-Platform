# Optional: git init for projects without version control (does not push).
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $ProjectPath).Path

if (Test-Path (Join-Path $resolved '.git')) {
    Write-Host "Already a git repo: $resolved"
    exit 0
}

$gitignore = @'
node_modules/
dist/
.data/
.env
.env.local
*.log
.DS_Store
Thumbs.db
.venv/
__pycache__/
'@

Push-Location $resolved
try {
    git init
    if (-not (Test-Path '.gitignore') -or $Force) {
        Set-Content -Path '.gitignore' -Value $gitignore -Encoding UTF8
        Write-Host 'Wrote .gitignore'
    }
    Write-Host "Initialized git: $resolved"
    Write-Host 'Next: git add . && git commit -m "Initial commit" (manual)'
}
finally {
    Pop-Location
}
