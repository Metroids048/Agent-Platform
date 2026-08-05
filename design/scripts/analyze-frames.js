/**
 * Layer 2: Figma Frame 清单 + Gap 分析 + 交互关系图
 *
 * Usage: node design/scripts/analyze-frames.js
 * Output: design/figma-frame-list.json
 *         design/figma-gap-report.json
 *         design/figma-interaction-map.json
 */

const fs   = require('fs');
const path = require('path');

const EXTRACT_DIR = path.join(__dirname, '..', 'figma-extract');
const OUT_DIR     = path.join(__dirname, '..');

// 现有 HTML 页面列表（用于 Gap 分析）
const EXISTING_HTML = [
  { file: 'index.html',                 keywords: ['运营列表', '智能体运营', '运营-列表', '运营管理列表'] },
  { file: '04-create-modal.html',       keywords: ['创建', '新建智能体', '智能体创建'] },
  { file: '05-agent-detail.html',       keywords: ['智能体详情', '运营详情', '详情-运营', '智能体运营'] },
  { file: '06-dev-platform.html',       keywords: ['开发平台', '我的智能体', 'dev-platform'] },
  { file: '06-dev-editor.html',         keywords: ['编辑器', '开发编辑', 'editor'] },
  { file: '06-dev-resources.html',      keywords: ['资源管理', '工具', '知识库'] },
  { file: '07-pick-resource.html',      keywords: ['资源选择', 'pick'] },
  { file: '08-audit-queue.html',        keywords: ['审核工作台', '审核队列', 'audit-queue'] },
  { file: '08-audit-review.html',       keywords: ['审核详情', '审核处理', 'audit-review'] },
  { file: '08-audit-status.html',       keywords: ['审核进度', '审核状态', 'audit-status'] },
  { file: '09-user-chat.html',          keywords: ['用户对话', '用户聊天', 'chat'] },
  { file: '10-skills-management.html',  keywords: ['skills', 'skill', '技能管理'] },
  { file: 'third-party-register.html',  keywords: ['第三方接入', '第三方注册', 'third-party'] },
  { file: '01-architecture.html',       keywords: ['架构'] },
  { file: '02-sequence-create.html',    keywords: ['序列', 'sequence'] },
  { file: '03-agent-center.html',       keywords: ['智能体中心'] },
];

// ── Helper: load large JSON safely ──────────────────────────────────────────
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  [skip] File not found: ${filePath}`);
    return null;
  }
  const stat = fs.statSync(filePath);
  console.log(`  Loading ${path.basename(filePath)} (${(stat.size/1e6).toFixed(1)} MB)...`);
  // Strip UTF-8 BOM (PowerShell 5.1 -Encoding utf8 adds it)
  let text = fs.readFileSync(filePath, 'utf8');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return JSON.parse(text);
}

// ── Step 1: Frame 清单 ────────────────────────────────────────────────────
console.log('\n=== Step 1: Frame 清单 ===');
const treeFile = path.join(EXTRACT_DIR, '01-file-tree-d3.json');
const tree = loadJson(treeFile);
if (!tree) process.exit(1);

const frameList = [];
for (const page of tree.document.children) {
  for (const node of (page.children || [])) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'GROUP') {
      frameList.push({
        pageId:   page.id,
        pageName: page.name,
        frameId:  node.id,
        frameName: node.name,
        type:     node.type,
        width:    node.absoluteBoundingBox ? node.absoluteBoundingBox.width : null,
        height:   node.absoluteBoundingBox ? node.absoluteBoundingBox.height : null,
      });
    }
  }
}
console.log(`  Total frames: ${frameList.length}`);
fs.writeFileSync(path.join(OUT_DIR, 'figma-frame-list.json'), JSON.stringify(frameList, null, 2), 'utf8');
console.log('  Saved: design/figma-frame-list.json');

// ── Step 2: Gap 分析 ──────────────────────────────────────────────────────
console.log('\n=== Step 2: Gap 分析 ===');
function matchHtml(frameName) {
  const lower = frameName.toLowerCase();
  for (const h of EXISTING_HTML) {
    for (const kw of h.keywords) {
      if (lower.includes(kw.toLowerCase())) return h.file;
    }
  }
  return null;
}

const gapReport = {
  covered:       [],
  partialOrNew:  [],
  missing:       [],
};

for (const f of frameList) {
  const match = matchHtml(f.frameName);
  const entry = { ...f, matchedHtml: match };
  // Modal/overlay frames (弹窗类) → partial
  const isModal = /弹窗|确认|对话框|modal|overlay|消息|申请|操作/.test(f.frameName);
  if (match && !isModal) {
    gapReport.covered.push(entry);
  } else if (match && isModal) {
    gapReport.partialOrNew.push({ ...entry, note: 'modal/overlay — may need JS in existing page' });
  } else {
    gapReport.missing.push({ ...entry, note: isModal ? 'new modal/dialog' : 'new page needed' });
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'figma-gap-report.json'), JSON.stringify(gapReport, null, 2), 'utf8');

console.log(`  Covered:       ${gapReport.covered.length} frames`);
console.log(`  Partial/New:   ${gapReport.partialOrNew.length} frames`);
console.log(`  Missing:       ${gapReport.missing.length} frames`);
console.log('  Saved: design/figma-gap-report.json');

// Print missing frames summary
if (gapReport.missing.length) {
  console.log('\n  --- MISSING frames (need new HTML or JS) ---');
  for (const f of gapReport.missing) {
    console.log(`  [${f.pageName}] "${f.frameName}"  id=${f.frameId}  (${f.note})`);
  }
}

// ── Step 3: 交互关系图 ────────────────────────────────────────────────────
console.log('\n=== Step 3: 交互关系图 ===');
const nodesFile = path.join(EXTRACT_DIR, '05-ops-platform-nodes.json');
const nodesData = loadJson(nodesFile);

const interactionMap = [];

if (nodesData) {
  // Build frameId → frameName lookup from our frameList
  const frameById = {};
  for (const f of frameList) frameById[f.frameId] = f.frameName;

  function walkNode(node, currentFrameId, currentFrameName) {
    if (!node) return;
    const reactions = node.reactions || [];
    for (const r of reactions) {
      if (!r.action) continue;
      const destId = r.action.destinationId || r.action.transitionNodeID;
      if (!destId) continue;
      interactionMap.push({
        from: {
          frameId:   currentFrameId,
          frameName: currentFrameName,
          nodeId:    node.id,
          nodeLabel: node.name || '',
        },
        to: {
          frameId:   destId,
          frameName: frameById[destId] || '(unknown)',
        },
        trigger:    (r.trigger && r.trigger.type)              || 'ON_CLICK',
        navigation: (r.action && r.action.navigation)          || r.action.type || 'NAVIGATE',
        transition: r.action.transition ? r.action.transition.type : null,
      });
    }
    for (const child of (node.children || [])) {
      walkNode(child, currentFrameId, currentFrameName);
    }
  }

  // Walk through the page node
  const pageNode = nodesData.nodes && nodesData.nodes['241:250'];
  const rootNode = pageNode ? pageNode.document : null;
  if (rootNode) {
    for (const frame of (rootNode.children || [])) {
      walkNode(frame, frame.id, frame.name);
    }
    console.log(`  Total interactions found: ${interactionMap.length}`);
  } else {
    console.log('  Could not find page node 241:250 in nodes data');
    // Try alternate structure
    const firstKey = nodesData.nodes && Object.keys(nodesData.nodes)[0];
    if (firstKey) {
      console.log(`  First key found: ${firstKey}`);
      const altNode = nodesData.nodes[firstKey].document;
      if (altNode) {
        for (const frame of (altNode.children || [])) {
          walkNode(frame, frame.id, frame.name);
        }
        console.log(`  Interactions (alt path): ${interactionMap.length}`);
      }
    }
  }
} else {
  console.log('  Nodes data not available — skipping interaction extraction');
}

fs.writeFileSync(path.join(OUT_DIR, 'figma-interaction-map.json'), JSON.stringify(interactionMap, null, 2), 'utf8');
console.log('  Saved: design/figma-interaction-map.json');

// Print interaction summary
if (interactionMap.length > 0) {
  console.log('\n  --- Interaction summary ---');
  const byNav = {};
  for (const i of interactionMap) {
    byNav[i.navigation] = (byNav[i.navigation] || 0) + 1;
  }
  for (const [nav, cnt] of Object.entries(byNav)) {
    console.log(`    ${nav}: ${cnt}`);
  }
  // Print unique frame-to-frame links
  const links = [...new Set(interactionMap.map(i => `"${i.from.frameName}" → "${i.to.frameName}" (${i.navigation})`))];
  console.log('\n  --- Frame navigation links ---');
  links.forEach(l => console.log('    ' + l));
}

console.log('\n=== Analysis complete ===');
