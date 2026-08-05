/**
 * 从 Figma 节点 JSON 提取单帧
 * Usage: node design/scripts/extract-frame.js "243:272"
 */
const fs = require('fs');
const path = require('path');

const frameId = process.argv[2];
if (!frameId) {
  console.error('用法：node design/scripts/extract-frame.js "<frameId>"');
  process.exit(1);
}

function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const extractDir = path.join(__dirname, '..', 'figma-extract');
const candidates = [
  path.join(extractDir, '05-ops-platform-nodes.json'),
  path.join(extractDir, '06-page-ops-platform.json'),
  path.join(extractDir, '02-full-with-interactions.json')
];

let nodesData = null;
for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  console.log('加载: ' + path.basename(file) + '...');
  nodesData = JSON.parse(stripBOM(fs.readFileSync(file, 'utf8')));
  break;
}

if (!nodesData) {
  console.error('找不到节点数据文件');
  process.exit(1);
}

let targetFrame = null;
const nodesRoot = nodesData.nodes || {};
for (const pageKey of Object.keys(nodesRoot)) {
  const page = nodesRoot[pageKey] && nodesRoot[pageKey].document;
  if (!page) continue;
  targetFrame = (page.children || []).find(function (f) { return f.id === frameId; });
  if (targetFrame) break;
  function walk(node) {
    if (targetFrame || !node) return;
    if (node.id === frameId && (node.type === 'FRAME' || node.type === 'COMPONENT')) {
      targetFrame = node;
      return;
    }
    (node.children || []).forEach(walk);
  }
  walk(page);
  if (targetFrame) break;
}

if (!targetFrame) {
  console.error('未找到帧 ID: ' + frameId);
  process.exit(1);
}

const outDir = path.join(extractDir, 'frames');
const outFile = path.join(outDir, frameId.replace(':', '-') + '.json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(targetFrame, null, 2), 'utf8');

const bbox = targetFrame.absoluteBoundingBox || {};
const sizeKb = (JSON.stringify(targetFrame).length / 1024).toFixed(0);
console.log('提取完成：' + outFile + ' (' + sizeKb + ' KB)');
console.log('帧名称：' + targetFrame.name);
console.log('尺寸：' + (bbox.width || '?') + '×' + (bbox.height || '?'));
console.log('子节点：' + (targetFrame.children || []).length);
