'use strict';

const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FIX_DIR = path.join(process.env.LOCALAPPDATA || '', 'CodexFix');
const LOG_PATH = path.join(FIX_DIR, 'guard.log');
const ACTIVATION_PATH = path.join(os.tmpdir(), 'codex-win-activation.json');
const CONFIG_PATH = path.join(FIX_DIR, 'config.json');
const POLL_MS = 400;

function log(message) {
  try {
    fs.mkdirSync(FIX_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // ignore
  }
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function discoverCodexExe() {
  try {
    const output = execSync(
      'powershell -NoProfile -Command "(Get-AppxPackage *Codex* | Select-Object -First 1 -ExpandProperty InstallLocation)"',
      { encoding: 'utf8', windowsHide: true, timeout: 15000 }
    ).trim();
    if (output) {
      const candidate = path.join(output, 'app', 'Codex.exe');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  } catch (error) {
    log(`discoverCodexExe failed: ${error}`);
  }
  return null;
}

function getCodexExe() {
  const config = readConfig();
  if (config.codexExe && fs.existsSync(config.codexExe)) {
    return config.codexExe;
  }
  return discoverCodexExe();
}

function isActivationArg(arg) {
  if (!arg || typeof arg !== 'string' || arg.startsWith('-')) {
    return false;
  }
  const lower = arg.toLowerCase();
  return (
    /^type=(click|reply|action)(?:&|$)/.test(lower) ||
    lower.startsWith('codex:') ||
    lower.includes('oauth_callback') ||
    lower.includes('type=click&tag=')
  );
}

function normalizeActivationArg(arg) {
  if (arg.toLowerCase().startsWith('codex:')) {
    return arg;
  }
  if (/^type=(click|reply|action)/i.test(arg)) {
    return `codex:?${arg}`;
  }
  if (/oauth_callback/i.test(arg) && !/^codex:/i.test(arg)) {
    return `codex://connector/${arg.replace(/^\/+/, '')}`;
  }
  return arg;
}

function parseCommandLine(commandLine) {
  if (!commandLine) {
    return [];
  }

  const args = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < commandLine.length; i += 1) {
    const ch = commandLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

function writeActivation(payload) {
  if (!payload.length) {
    return;
  }
  const normalized = payload.map(normalizeActivationArg);
  fs.writeFileSync(
    ACTIVATION_PATH,
    JSON.stringify({ payload: normalized, at: Date.now() }, null, 2),
    'utf8'
  );
  log(`saved activation: ${normalized.join(' | ')}`);
}

function focusExistingCodex() {
  try {
    execSync(
      `powershell -NoProfile -Command "$p = Get-Process Codex -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -ne 'Error' } | Sort-Object StartTime -Descending | Select-Object -First 1; if ($p) { Add-Type 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }'; [W]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null; [W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null }"`,
      { windowsHide: true, timeout: 10000 }
    );
  } catch (error) {
    log(`focusExistingCodex failed: ${error}`);
  }
}

function launchCleanCodex(codexExe) {
  spawn(codexExe, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      CODEX_WIN_ACTIVATION_FILE: ACTIVATION_PATH,
    },
  }).unref();
}

function listCodexProcesses() {
  try {
    const raw = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'Codex.exe\'\\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"',
      { encoding: 'utf8', windowsHide: true, timeout: 15000 }
    ).trim();
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

const handled = new Set();

function handleBadProcess(proc, codexExe) {
  const pid = Number(proc.ProcessId);
  if (!pid || handled.has(pid)) {
    return;
  }

  const args = parseCommandLine(proc.CommandLine).slice(1);
  const activation = args.filter(isActivationArg);
  if (!activation.length) {
    return;
  }

  handled.add(pid);
  log(`bad launch pid=${pid} cmd=${proc.CommandLine}`);
  writeActivation(activation);

  try {
    execSync(`taskkill /PID ${pid} /F /T`, { windowsHide: true, timeout: 10000 });
    log(`killed pid=${pid}`);
  } catch (error) {
    log(`kill failed pid=${pid}: ${error}`);
  }

  const survivors = listCodexProcesses().filter((item) => Number(item.ProcessId) !== pid);
  if (survivors.length > 0) {
    focusExistingCodex();
  } else if (codexExe) {
    launchCleanCodex(codexExe);
  }

  setTimeout(() => handled.delete(pid), 30000);
}

function tick() {
  const codexExe = getCodexExe();
  for (const proc of listCodexProcesses()) {
    handleBadProcess(proc, codexExe);
  }
}

log('guard started');
tick();
setInterval(tick, POLL_MS);

process.on('SIGINT', () => {
  log('guard stopped');
  process.exit(0);
});
