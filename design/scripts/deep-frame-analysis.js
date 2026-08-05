/**
 * 深度分析每个 Frame 的结构属性，生成转换参考报告
 * Usage: node design/scripts/deep-frame-analysis.js
 * Output: design/figma-frame-details.json
 *         design/figma-nav-map.json (基于 Frame 名称推断)
 */
const fs   = require('fs');
const path = require('path');

const EXTRACT_DIR = path.join(__dirname, '..', 'figma-extract');
const OUT_DIR     = path.join(__dirname, '..');

function stripBOM(t) { return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }
function loadJson(f) {
  if (!fs.existsSync(f)) return null;
  return JSON.parse(stripBOM(fs.readFileSync(f, 'utf8')));
}

// ─── Load file tree ──────────────────────────────────────────────────────────
const tree = loadJson(path.join(EXTRACT_DIR, '01-file-tree-d3.json'));
const nodesRaw = fs.readFileSync(path.join(EXTRACT_DIR, '05-ops-platform-nodes.json'), 'utf8');
const nodesData = JSON.parse(stripBOM(nodesRaw));

const pageNode = nodesData.nodes['241:250'].document;

// ─── Helper: count text nodes ────────────────────────────────────────────────
function countNodeTypes(node) {
  const counts = {};
  function walk(n) {
    counts[n.type] = (counts[n.type] || 0) + 1;
    for (const c of (n.children || [])) walk(c);
  }
  walk(node);
  return counts;
}

// ─── Helper: extract text samples ───────────────────────────────────────────
function extractTexts(node, maxItems = 15) {
  const texts = [];
  function walk(n) {
    if (n.type === 'TEXT' && n.characters) {
      texts.push(n.characters.trim().slice(0, 80));
    }
    for (const c of (n.children || [])) {
      if (texts.length < maxItems) walk(c);
    }
  }
  walk(node);
  return texts;
}

// ─── Helper: get layout info ─────────────────────────────────────────────────
function getLayoutInfo(node) {
  const bb = node.absoluteBoundingBox || {};
  return {
    w: Math.round(bb.width || 0),
    h: Math.round(bb.height || 0),
    layoutMode: node.layoutMode || null,
    isOverlay: (bb.width || 1440) < 800 && (bb.height || 900) < 700,
  };
}

// ─── Analyze each frame ───────────────────────────────────────────────────────
console.log('Analyzing frames...');
const frameDetails = [];

for (const frame of pageNode.children) {
  if (frame.type !== 'FRAME') continue;

  const layout    = getLayoutInfo(frame);
  const nodeCounts = countNodeTypes(frame);
  const texts     = extractTexts(frame);
  const isModal   = layout.isOverlay || /弹窗|确认|对话框|申请|操作|消息|待办/.test(frame.name);
  const topTexts  = texts.slice(0, 5);

  frameDetails.push({
    id:         frame.id,
    name:       frame.name,
    size:       `${layout.w}×${layout.h}`,
    isModal,
    layoutMode: layout.layoutMode,
    nodeTypes:  nodeCounts,
    textSamples: topTexts,
    childCount:  (frame.children || []).length,
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'figma-frame-details.json'), JSON.stringify(frameDetails, null, 2), 'utf8');
console.log(`Saved: design/figma-frame-details.json (${frameDetails.length} frames)`);

// ─── Print summary table ─────────────────────────────────────────────────────
console.log('\n=== Frame 详情汇总 ===');
console.log(`${'#'.padEnd(3)} ${'Frame 名称'.padEnd(55)} ${'尺寸'.padEnd(12)} ${'类型'.padEnd(8)} 关键文本`);
console.log('─'.repeat(130));
frameDetails.forEach((f, i) => {
  const t = (f.isModal ? 'overlay' : 'fullpage').padEnd(8);
  const name = f.name.padEnd(55).slice(0, 55);
  const texts = f.textSamples.slice(0, 2).join(' | ').slice(0, 40);
  console.log(`${String(i+1).padEnd(3)} ${name} ${f.size.padEnd(12)} ${t} ${texts}`);
});

// ─── Infer navigation map from Frame names ──────────────────────────────────
console.log('\n\n=== 推断导航关系（基于 Frame 命名规律）===');

const MODULES = [
  {
    moduleId:   'expert-workbench',
    moduleName: '专家工作台',
    entry:      null, // new HTML page needed
    frames:     [],
    keywords:   ['专家工作台', '专家社区', '专家操作'],
  },
  {
    moduleId:   'user-feedback',
    moduleName: '用户反馈',
    entry:      null,
    frames:     [],
    keywords:   ['用户反馈', '处理反馈', '查看详情'],
  },
  {
    moduleId:   'task-dispatch',
    moduleName: '任务分派',
    entry:      null,
    frames:     [],
    keywords:   ['分派任务', '指定团队', '指定专家', '多个专家处理', '修改截止时间', '申请延时'],
  },
  {
    moduleId:   'message-center',
    moduleName: '消息中心',
    entry:      null,
    frames:     [],
    keywords:   ['消息中心', '公告', '待办'],
  },
  {
    moduleId:   'permission-mgmt',
    moduleName: '权限与开发者管理',
    entry:      null,
    frames:     [],
    keywords:   ['权限', '开发者管理', '组织架构', '普通管理'],
  },
  {
    moduleId:   'ops-review',
    moduleName: '运营审核',
    entry:      '08-audit-queue.html',
    frames:     [],
    keywords:   ['运营审核', '审核专家任务', '退回理由'],
  },
];

for (const f of frameDetails) {
  let assigned = false;
  for (const m of MODULES) {
    if (m.keywords.some(kw => f.name.includes(kw))) {
      m.frames.push({ id: f.id, name: f.name, isModal: f.isModal });
      assigned = true;
      break;
    }
  }
  if (!assigned) {
    console.log(`  [unassigned] "${f.name}" id=${f.id}`);
  }
}

// Generate nav map
const navMap = MODULES.map(m => ({
  moduleId:   m.moduleId,
  moduleName: m.moduleName,
  entryHtml:  m.entry || `${m.moduleId}.html (NEW)`,
  frameCount: m.frames.length,
  fullPages:  m.frames.filter(f => !f.isModal).map(f => ({ id: f.id, name: f.name })),
  modals:     m.frames.filter(f =>  f.isModal).map(f => ({ id: f.id, name: f.name })),
}));

fs.writeFileSync(path.join(OUT_DIR, 'figma-nav-map.json'), JSON.stringify(navMap, null, 2), 'utf8');
console.log('\n');
for (const m of navMap) {
  console.log(`[${m.moduleName}]`);
  console.log(`  Entry HTML: ${m.entryHtml}`);
  console.log(`  Full pages (${m.fullPages.length}): ${m.fullPages.map(f=>f.name).join(' / ')}`);
  console.log(`  Modals (${m.modals.length}): ${m.modals.map(f=>f.name).join(' / ')}`);
}

console.log('\nSaved: design/figma-nav-map.json');
console.log('\n=== 分析完成 ===');
