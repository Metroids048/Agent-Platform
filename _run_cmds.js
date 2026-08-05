const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;
const out = [];

function run(label, cmd, args, input) {
  out.push(`=== ${label} ===`);
  const opts = { cwd, encoding: 'utf8', shell: true, env: process.env };
  if (input) opts.input = input;
  const r = spawnSync(cmd, args, opts);
  if (r.stdout) out.push(r.stdout);
  if (r.stderr) out.push(r.stderr);
  out.push(`EXIT: ${r.status ?? (r.error ? 1 : 0)}`);
  if (r.error) out.push(`ERROR: ${r.error.message}`);
  out.push('');
  return r.status ?? 1;
}

const rtk = path.join(process.env.USERPROFILE, '.ai-workspace', 'scripts', 'rtk-hook-cursor.ps1');
const gate = path.join(process.env.USERPROFILE, '.ai-workspace', 'scripts', 'clarification-hard-gate.ps1');

const e1 = run('CMD1 rtk-hook-cursor', 'powershell', ['-NoProfile', '-File', rtk, '-OutputFormat', 'Cursor']);
const json = JSON.stringify({ tool_name: 'Shell', cwd: 'c:\\\\Users\\\\win\\\\Desktop\\\\Agent Platform' });
const e2 = run('CMD2 clarification-hard-gate', 'powershell', ['-NoProfile', '-File', gate, '-OutputFormat', 'Cursor'], json);
const e3 = run('CMD3 verify-all', 'node', ['prototype/scripts/verify-all.js']);
let e4 = null;
if (e3 === 0) {
  e4 = run('CMD4 web-portal-check', 'node', ['prototype/scripts/web-portal-check.js']);
}

out.push('=== SUMMARY ===');
out.push(`EXIT1=${e1} EXIT2=${e2} EXIT3=${e3} EXIT4=${e4 ?? 'skipped'}`);

const file = path.join(cwd, '_ALL_OUT.txt');
fs.writeFileSync(file, out.join('\n'), 'utf8');
console.log(fs.readFileSync(file, 'utf8'));
