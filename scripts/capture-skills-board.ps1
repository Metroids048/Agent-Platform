$base = "http://127.0.0.1:8766"
$delay = "figmadelay=10000"
$ep = "https://mcp.figma.com/mcp/capture"

Write-Host "=== Figma Skills 单页合成板捕获 ==="
Write-Host "1. 确保 prototype 目录已运行: python -m http.server 8766"
Write-Host "2. 在 Figma 生成 captureId 后，替换下方 CAPTURE_ID"
Write-Host "3. 捕获完成后在 Figma 运行 Plugins > Skills Page Layout (design/figma-plugin)"
Write-Host ""

# 最新 board 捕获 — 由 Agent 写入
$CAPTURE_ID = "96a04412-c706-4717-baa1-ef30830bdbd2"
$endpoint = [uri]::EscapeDataString("$ep/$CAPTURE_ID/submit")
$url = "$base/figma-skills-board.html?figma=1#figmacapture=$CAPTURE_ID&figmaendpoint=$endpoint&$delay"
Start-Process $url
Write-Host "Opened: $url"
