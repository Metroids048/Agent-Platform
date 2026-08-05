/**
 * 根据 HTML 路径或 screen key 从 design/figma.config.json 解析 Figma nodeId
 * 用法:
 *   node scripts/resolve-figma-screen.js --html prototype/web端/index.html
 *   node scripts/resolve-figma-screen.js --key userChat
 *   node scripts/resolve-figma-screen.js --list
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'design', 'figma.config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function normalizeHtml(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function main() {
  const args = process.argv.slice(2);
  const cfg = loadConfig();
  const proto = cfg.files && cfg.files.prototype;
  if (!proto) {
    console.error('ERROR: figma.config.json 缺少 files.prototype');
    process.exit(1);
  }

  const screens = proto.screens || {};
  const entries = Object.keys(screens).map(function (key) {
    const s = screens[key];
    return {
      key: key,
      nodeId: s.nodeId || '',
      htmlMirror: normalizeHtml(s.htmlMirror || ''),
      label: s.label || key,
      fileKey: proto.fileKey,
      fileUrl: proto.fileUrl || ''
    };
  });

  if (args.includes('--list')) {
    entries.forEach(function (e) {
      console.log([e.key, e.nodeId, e.htmlMirror].join('\t'));
    });
    return;
  }

  const keyIdx = args.indexOf('--key');
  if (keyIdx >= 0) {
    const key = args[keyIdx + 1];
    const hit = entries.find(function (e) { return e.key === key; });
    if (!hit) {
      console.error('ERROR: 未知 screen key:', key);
      process.exit(1);
    }
    console.log(JSON.stringify(hit, null, 2));
    return;
  }

  const htmlIdx = args.indexOf('--html');
  if (htmlIdx >= 0) {
    const html = normalizeHtml(args[htmlIdx + 1]);
    const hit = entries.find(function (e) {
      return e.htmlMirror === html || e.htmlMirror.endsWith('/' + html);
    });
    if (!hit) {
      console.error('ERROR: 未在 figma.config.json 中找到 htmlMirror:', html);
      console.error('提示: 先在 screens 中登记该页面，或运行 --list 查看已有映射');
      process.exit(1);
    }
    console.log(JSON.stringify(hit, null, 2));
    return;
  }

  console.error('用法: --list | --key <name> | --html <path>');
  process.exit(1);
}

main();
