#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$FixDir = Join-Path $env:LOCALAPPDATA 'CodexFix'

foreach ($Root in @('HKCU:', 'HKLM:')) {
  $IfeoKey = Join-Path $Root 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Codex.exe'
  if (Test-Path $IfeoKey) {
    Remove-Item -Path $IfeoKey -Recurse -Force
  }
}

$ProtocolKey = 'HKCU:\Software\Classes\codex\shell\open\command'
if (Test-Path $ProtocolKey) {
  Remove-Item -Path $ProtocolKey -Force
}

$configPath = Join-Path $FixDir 'config.json'
if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
  $package = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($package) {
    $AsarPath = Join-Path $package.InstallLocation 'app\resources\app.asar'
    $Backup = "$AsarPath.codexfix.bak"
    if ((Test-Path $Backup) -and (Test-Path $AsarPath)) {
      try {
        Copy-Item -Path $Backup -Destination $AsarPath -Force
        Write-Host "已恢复 app.asar 备份。"
      } catch {
        Write-Warning "无法恢复 app.asar（可能需要管理员权限）: $($_.Exception.Message)"
      }
    }
  }
}

Write-Host 'Codex Windows 启动修复已卸载。'
