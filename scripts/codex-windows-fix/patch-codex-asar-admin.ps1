#Requires -RunAsAdministrator
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$FixDir = Join-Path $env:LOCALAPPDATA 'CodexFix'
$PrefixFile = Join-Path $FixDir 'bootstrap-prefix.js'
$package = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $package) { throw 'Codex package not found.' }

$AsarPath = Join-Path $package.InstallLocation 'app\resources\app.asar'
$Backup = "$AsarPath.codexfix.bak"

if (-not (Test-Path $PrefixFile)) { throw "Missing $PrefixFile" }

takeown /F $AsarPath /A | Out-Null
icacls $AsarPath /grant Administrators:F /grant "$env:USERNAME`:F" | Out-Null

if (-not (Test-Path $Backup)) {
  Copy-Item -Path $AsarPath -Destination $Backup -Force
}

$WorkDir = Join-Path $env:TEMP ('codex-asar-patch-' + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

try {
  & npx --yes @electron/asar extract $AsarPath $WorkDir | Out-Null
  $Bootstrap = Join-Path $WorkDir '.vite\build\bootstrap.js'
  if (-not (Test-Path $Bootstrap)) { throw 'bootstrap.js missing in app.asar' }

  $Prefix = Get-Content -Path $PrefixFile -Raw
  $Original = Get-Content -Path $Bootstrap -Raw
  if (-not $Original.StartsWith($Prefix)) {
    Set-Content -Path $Bootstrap -Value ($Prefix + $Original) -Encoding UTF8 -NoNewline
  }

  & npx --yes @electron/asar pack $WorkDir $AsarPath | Out-Null
  Write-Host "Patched app.asar at $AsarPath"
} finally {
  Remove-Item -Path $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
}
