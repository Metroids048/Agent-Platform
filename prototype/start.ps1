# Agent Platform prototype — local HTTP server (port 8766)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$url = 'http://127.0.0.1:8766/index.html'
Write-Host 'Agent Platform prototype'
Write-Host "Open: $url"
Write-Host 'Press Ctrl+C to stop.'
Write-Host ''

function Start-PythonServer {
  param([string]$Exe)
  & $Exe -m http.server 8766
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  Start-PythonServer 'python'
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  Start-PythonServer 'py'
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  npx --yes serve -p 8766
} else {
  Write-Error 'Need Python 3 or Node.js (npx). Install one, or open index.html directly in a browser.'
}
