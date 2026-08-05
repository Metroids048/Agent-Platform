# Repair Cursor preToolUse hooks — run once from external or Agent shell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/hooks/fix-cursor-pretooluse-hooks.ps1
$ErrorActionPreference = 'Stop'

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$aiScripts = Join-Path $env:USERPROFILE '.ai-workspace\scripts'
$cursorHooks = Join-Path $env:USERPROFILE '.cursor\hooks.json'

$rtkHook = @'
param([string]$OutputFormat = 'Cursor')
[Console]::Out.Write('{"permission":"allow"}')
exit 0
'@

$hardGate = @'
param(
    [ValidateSet('Claude', 'Cursor', 'Codex', 'Auto')]
    [string]$OutputFormat = 'Auto'
)
$ErrorActionPreference = 'Continue'

function Emit-Allow {
    param([string]$Format)
    if ($Format -eq 'Claude') {
        [Console]::Out.WriteLine('{"continue":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}')
        return
    }
    [Console]::Out.WriteLine('{"permission":"allow"}')
}

function Emit-Deny {
    param([string]$Format, [string]$Reason, [string]$DraftPath)
    $agentMsg = "CLARIFICATION GATE: $Reason Draft: $DraftPath"
    $userMsg = "Clarification gate: complete Mini-Spec before Write/Edit. Draft: $DraftPath"
    if ($Format -eq 'Claude') {
        $payload = @{
            continue           = $true
            hookSpecificOutput = @{
                hookEventName            = 'PreToolUse'
                permissionDecision       = 'deny'
                permissionDecisionReason = $agentMsg
            }
        }
        [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress -Depth 5))
        return
    }
    $payload = @{
        permission    = 'deny'
        user_message  = $userMsg
        agent_message = $agentMsg
    }
    [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress))
}

function Read-HookStdinJsonWithTimeout {
    param([int]$TimeoutMs = 2000)
    if (-not [Console]::IsInputRedirected) { return $null }
    try {
        $reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
        $sb = New-Object System.Text.StringBuilder
        $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
        while ([DateTime]::UtcNow -lt $deadline) {
            if ($reader.Peek() -ge 0) {
                [void]$sb.Append([char]$reader.Read())
            }
            elseif ($sb.Length -gt 0) {
                break
            }
            else {
                Start-Sleep -Milliseconds 25
            }
        }
        $text = $sb.ToString()
        if ([string]::IsNullOrWhiteSpace($text)) { return $null }
        return ($text | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}

try {
    $corePath = Join-Path $PSScriptRoot 'clarification-gate-core.ps1'
    if (-not (Test-Path $corePath)) {
        $corePath = Join-Path $env:USERPROFILE '.ai-workspace\scripts\clarification-gate-core.ps1'
    }
    . $corePath

    $data = Read-HookStdinJsonWithTimeout
    $format = if ($OutputFormat -eq 'Auto') { 'Cursor' } else { $OutputFormat }

    if (-not $data) {
        Emit-Allow -Format $format
        exit 0
    }

    $toolName = $null
    $toolInput = $null
    $cwd = $null
    if ($data.PSObject.Properties.Name -contains 'tool_name') {
        $toolName = [string]$data.tool_name
        $toolInput = $data.tool_input
    }
    elseif ($data.PSObject.Properties.Name -contains 'toolName') {
        $toolName = [string]$data.toolName
        $toolInput = $data.toolInput
    }
    if ($data.PSObject.Properties.Name -contains 'cwd') { $cwd = [string]$data.cwd }
    if (-not $cwd -and $data.PSObject.Properties.Name -contains 'workspace_roots' -and $data.workspace_roots) {
        $cwd = [string]$data.workspace_roots[0]
    }

    if (-not $toolName) {
        Emit-Allow -Format $format
        exit 0
    }

    if (-not (Test-ShouldBlockClarificationWrite -Cwd $cwd -ToolName $toolName -ToolInput $toolInput)) {
        Emit-Allow -Format $format
        exit 0
    }

    $entry = Get-GateEntry -Cwd $cwd
    $draft = if ($entry -and $entry.draftPath) { $entry.draftPath } else { '(~/.ai-workspace/clarifications/)' }
    Emit-Deny -Format $format -Reason 'Type B fuzzy task — confirm before Write/Edit.' -DraftPath $draft
}
catch {
    Emit-Allow -Format 'Cursor'
}
exit 0
'@

Write-Utf8NoBomFile -Path (Join-Path $PSScriptRoot 'rtk-hook-cursor.ps1') -Content $rtkHook
Write-Utf8NoBomFile -Path (Join-Path $aiScripts 'rtk-hook-cursor.ps1') -Content $rtkHook
Write-Utf8NoBomFile -Path (Join-Path $PSScriptRoot 'clarification-hard-gate.ps1') -Content $hardGate
Write-Utf8NoBomFile -Path (Join-Path $aiScripts 'clarification-hard-gate.ps1') -Content $hardGate

$shellHook = 'node -e "process.stdout.write(JSON.stringify({permission:''allow''}))"'
$gateCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\clarification-hard-gate.ps1`" -OutputFormat Cursor"

if (Test-Path $cursorHooks) {
    Copy-Item -LiteralPath $cursorHooks -Destination ($cursorHooks + '.bak-fix') -Force
}
$hookBody = @{
    version = 1
    hooks   = @{
        preToolUse         = @(
            @{ matcher = 'Write|Edit'; command = $gateCmd; timeout = 15 }
            @{ matcher = 'Shell'; command = $shellHook; timeout = 5 }
        )
        sessionStart       = @(
            @{
                command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\scan-global-skills.ps1`" -OutputFormat Cursor -HookEvent SessionStart"
                timeout = 45
            }
        )
        beforeSubmitPrompt = @(
            @{
                command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$aiScripts\scan-global-skills.ps1`" -OutputFormat Cursor -HookEvent UserPromptSubmit"
                timeout = 45
            }
        )
    }
}
Write-Utf8NoBomFile -Path $cursorHooks -Content ($hookBody | ConvertTo-Json -Depth 10)

# Smoke
$shellOut = node -e "process.stdout.write(JSON.stringify({permission:'allow'}))" 2>&1 | Out-String
if ($shellOut.Trim() -ne '{"permission":"allow"}') {
    throw "Shell hook smoke failed: $shellOut"
}
$gateIn = '{"tool_name":"Write","cwd":"' + $repoRoot.Replace('\', '\\') + '"}'
$gateOut = $gateIn | powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $aiScripts 'clarification-hard-gate.ps1') -OutputFormat Cursor 2>&1 | Out-String
if ($gateOut.Trim() -notmatch '^\{') {
    throw "Gate hook smoke failed: $gateOut"
}

Write-Host 'PASS: hooks repaired (Shell=node, Gate=timeout stdin). Reload Cursor window, then run verify-all.'
