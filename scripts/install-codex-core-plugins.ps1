param(
  [string]$CodexHome = "$env:USERPROFILE\.codex"
)

$ErrorActionPreference = "Stop"

$configPath = Join-Path $CodexHome "config.toml"
$curatedRoot = Join-Path $CodexHome ".tmp\plugins"
$curatedMarketplace = Join-Path $curatedRoot ".agents\plugins\marketplace.json"
$targetMarketplaceDir = Join-Path $CodexHome ".agents\plugins"
$targetMarketplace = Join-Path $targetMarketplaceDir "marketplace.json"
$curatedCacheRoot = Join-Path $CodexHome "plugins\cache\openai-curated"
$curatedShaPath = Join-Path $CodexHome ".tmp\plugins.sha"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Codex config not found: $configPath"
}
if (-not (Test-Path -LiteralPath $curatedMarketplace)) {
  throw "OpenAI curated plugin marketplace cache not found: $curatedMarketplace"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath $configPath -Destination "$configPath.bak-install-core-plugins-$stamp"
New-Item -ItemType Directory -Force -Path $targetMarketplaceDir | Out-Null
New-Item -ItemType Directory -Force -Path $curatedCacheRoot | Out-Null
if (Test-Path -LiteralPath $targetMarketplace) {
  Copy-Item -LiteralPath $targetMarketplace -Destination "$targetMarketplace.bak-install-core-plugins-$stamp"
}

$market = Get-Content -LiteralPath $curatedMarketplace -Raw | ConvertFrom-Json
$curatedVersion = "local"
if (Test-Path -LiteralPath $curatedShaPath) {
  $curatedVersion = (Get-Content -LiteralPath $curatedShaPath -Raw).Trim()
  if ($curatedVersion.Length -gt 8) {
    $curatedVersion = $curatedVersion.Substring(0, 8)
  }
}
foreach ($plugin in $market.plugins) {
  if ($plugin.source.source -eq "local" -and $plugin.source.path.StartsWith("./")) {
    $relative = $plugin.source.path.Substring(2)
    $plugin.source.path = (Join-Path $curatedRoot $relative)
  }
  if ($plugin.source.source -eq "local" -and (Test-Path -LiteralPath $plugin.source.path)) {
    $pluginCacheDir = Join-Path (Join-Path $curatedCacheRoot $plugin.name) $curatedVersion
    New-Item -ItemType Directory -Force -Path $pluginCacheDir | Out-Null
    Copy-Item -Path (Join-Path $plugin.source.path "*") -Destination $pluginCacheDir -Recurse -Force
  }
}
$market.name = "openai-curated"
$market.interface.displayName = "Codex official"
$marketJson = $market | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($targetMarketplace, $marketJson + "`r`n", $utf8NoBom)

$text = Get-Content -LiteralPath $configPath -Raw

function Add-BlockIfMissing {
  param(
    [string]$Header,
    [string[]]$Lines
  )
  if ($script:text -notmatch [regex]::Escape($Header)) {
    $script:text = $script:text.TrimEnd() + "`r`n`r`n$Header`r`n" + (($Lines -join "`r`n") + "`r`n")
  }
}

Add-BlockIfMissing "[marketplaces.openai-bundled]" @(
  'last_updated = "2026-06-08T00:00:00Z"',
  'source_type = "local"',
  "source = '$CodexHome\.tmp\bundled-marketplaces\openai-bundled'"
)
Add-BlockIfMissing "[marketplaces.openai-curated]" @(
  'last_updated = "2026-06-08T00:00:00Z"',
  'source_type = "local"',
  "source = '$CodexHome\.tmp\plugins'"
)
Add-BlockIfMissing "[marketplaces.openai-primary-runtime]" @(
  'last_updated = "2026-06-08T00:00:00Z"',
  'source_type = "local"',
  "source = '$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\plugins\openai-primary-runtime'"
)

$bundled = @("browser", "chrome", "computer-use")
$primary = @("documents", "spreadsheets", "presentations")
$curated = @($market.plugins | ForEach-Object { $_.name } | Sort-Object -Unique)

foreach ($name in $bundled) {
  Add-BlockIfMissing "[plugins.`"$name@openai-bundled`"]" @("enabled = true")
}
foreach ($name in $primary) {
  Add-BlockIfMissing "[plugins.`"$name@openai-primary-runtime`"]" @("enabled = true")
}
foreach ($name in $curated) {
  Add-BlockIfMissing "[plugins.`"$name@openai-curated`"]" @("enabled = true")
}

[System.IO.File]::WriteAllText($configPath, $text, $utf8NoBom)

python -c "import json,tomllib,pathlib; c=pathlib.Path(r'$configPath'); m=pathlib.Path(r'$targetMarketplace'); d=tomllib.loads(c.read_text(encoding='utf-8-sig')); j=json.loads(m.read_text(encoding='utf-8-sig')); cache=pathlib.Path(r'$curatedCacheRoot'); missing=[p['name'] for p in j.get('plugins',[]) if not (cache/p['name']/r'$curatedVersion'/'.codex-plugin'/'plugin.json').exists()]; print('config_ok', len(d.get('plugins',{})), 'plugins'); print('marketplace_ok', j['name'], len(j.get('plugins',[])), 'available'); print('preinstalled_ok', len(j.get('plugins',[])) - len(missing), 'cached', 'missing', len(missing))"
