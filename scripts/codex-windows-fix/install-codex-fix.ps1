#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$FixDir = Join-Path $env:LOCALAPPDATA 'CodexFix'
$GuardScript = Join-Path $FixDir 'codex-guard.js'
$ShimScript = Join-Path $FixDir 'codex-shim.js'
$VbsLauncher = Join-Path $FixDir 'start-guard.vbs'
$NodeExe = 'C:\Program Files\nodejs\node.exe'

New-Item -ItemType Directory -Path $FixDir -Force | Out-Null

if (-not (Test-Path $NodeExe)) {
  $NodeExe = (Get-Command node -ErrorAction Stop).Source
}

$package = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $package) {
  throw 'OpenAI Codex MSIX package not found.'
}

$CodexExe = Join-Path $package.InstallLocation 'app\Codex.exe'
if (-not (Test-Path $CodexExe)) {
  throw "Codex.exe not found: $CodexExe"
}

@{
  codexExe = $CodexExe
  packageFullName = $package.PackageFullName
  version = $package.Version
  installedAt = (Get-Date).ToString('o')
} | ConvertTo-Json | Set-Content -Path (Join-Path $FixDir 'config.json') -Encoding UTF8

$vbsContent = @"
Set WshShell = CreateObject("Wscript.Shell")
WshShell.Run "$NodeExe ""$GuardScript""", 0, False
"@
Set-Content -Path $VbsLauncher -Value $vbsContent -Encoding ASCII

$Startup = [Environment]::GetFolderPath('Startup')
Copy-Item -Path $VbsLauncher -Destination (Join-Path $Startup 'CodexLaunchGuard.vbs') -Force

foreach ($Root in @('HKCU:', 'HKLM:')) {
  $IfeoKey = Join-Path $Root 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Codex.exe'
  if (Test-Path $IfeoKey) {
    Remove-Item -Path $IfeoKey -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$ProtocolKey = 'HKCU:\Software\Classes\codex\shell\open\command'
New-Item -Path $ProtocolKey -Force | Out-Null
Set-ItemProperty -Path $ProtocolKey -Name '(default)' -Value "`"$NodeExe`" `"$ShimScript`" `"$CodexExe`" `"%1`""

Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
  if ($cmd -like '*codex-guard.js*') {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}

Start-Process -FilePath $NodeExe -ArgumentList "`"$GuardScript`"" -WindowStyle Hidden

Write-Host ''
Write-Host 'Codex Windows fix installed.'
Write-Host "  Guard: running + startup entry in $Startup"
Write-Host "  Guard log: $(Join-Path $FixDir 'guard.log')"
Write-Host "  Codex: $CodexExe"
Write-Host ''
Write-Host 'Optional (admin, for OAuth/deeplink payload restore):'
Write-Host "  Right-click install-as-admin.cmd -> Run as administrator"
Write-Host "  Then run patch-codex-asar-admin.ps1 as administrator"
Write-Host ''
Write-Host 'Quit Codex, reopen, click a notification to verify no error dialog.'
