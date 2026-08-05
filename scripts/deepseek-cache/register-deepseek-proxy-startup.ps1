# Register DeepSeek CC proxy to start at user logon (idempotent).
param(
    [switch]$Quiet,
    [int]$DelaySeconds = 15
)

$ErrorActionPreference = 'Stop'
$taskName = 'DeepSeekCCProxy'
$startScript = Join-Path $env:USERPROFILE '.claude\scripts\start-deepseek-proxy.ps1'

if (-not (Test-Path $startScript)) {
    throw "Missing start script: $startScript"
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT${DelaySeconds}S"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Start DeepSeek CC cache proxy (127.0.0.1:18789) for CC Switch upstream' `
    -RunLevel Limited | Out-Null

if (-not $Quiet) {
    Write-Host "Registered scheduled task: $taskName (logon + ${DelaySeconds}s delay)"
    Write-Host "Script: $startScript"
}
