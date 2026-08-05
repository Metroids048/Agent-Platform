'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FIX_DIR = path.join(process.env.LOCALAPPDATA || '', 'CodexFix');
const CONFIG_PATH = path.join(FIX_DIR, 'config.json');
const LOG_PATH = path.join(FIX_DIR, 'shim.log');
const ACTIVATION_PATH = path.join(os.tmpdir(), 'codex-win-activation.json');

function log(message) {
  try {
    fs.mkdirSync(FIX_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // ignore logging failures
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
    const { execSync } = require('node:child_process');
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

function resolveCodexExe(argv) {
  const config = readConfig();
  if (config.codexExe && fs.existsSync(config.codexExe)) {
    return config.codexExe;
  }

  const first = argv[0];
  if (typeof first === 'string' && first.toLowerCase().endsWith('codex.exe') && fs.existsSync(first)) {
    return first;
  }

  return discoverCodexExe();
}

function isActivationArg(arg) {
  if (!arg || typeof arg !== 'string') {
    return false;
  }
  if (arg.startsWith('-')) {
    return false;
  }

  const lower = arg.toLowerCase();
  if (/^type=(click|reply|action)(?:&|$)/.test(lower)) {
    return true;
  }
  if (lower.startsWith('codex:')) {
    return true;
  }
  if (lower.includes('oauth_callback')) {
    return true;
  }
  if (lower.includes('type=click&tag=')) {
    return true;
  }
  return false;
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
  log(`saved activation payload: ${normalized.join(' | ')}`);
}

function main() {
  const rawArgs = process.argv.slice(2);
  log(`raw argv: ${JSON.stringify(rawArgs)}`);

  const codexExe = resolveCodexExe(rawArgs);
  if (!codexExe) {
    log('Codex.exe not found');
    process.exit(1);
  }

  let restArgs = rawArgs;
  if (rawArgs[0] && rawArgs[0].toLowerCase().endsWith('codex.exe')) {
    restArgs = rawArgs.slice(1);
  }

  const activation = restArgs.filter(isActivationArg);
  const cleanArgs = restArgs.filter((arg) => !isActivationArg(arg));

  if (activation.length) {
    writeActivation(activation);
  }

  log(`launch ${codexExe} cleanArgs=${JSON.stringify(cleanArgs)}`);

  const child = spawn(codexExe, cleanArgs, {
    detached: false,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      CODEX_WIN_ACTIVATION: activation.join(' '),
      CODEX_WIN_ACTIVATION_FILE: ACTIVATION_PATH,
    },
  });

  child.on('error', (error) => {
    log(`spawn error: ${error}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    log(`exit code: ${code ?? 0}`);
    process.exit(code ?? 0);
  });
}

main();
