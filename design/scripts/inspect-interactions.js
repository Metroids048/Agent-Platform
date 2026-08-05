/**
 * 检查 Figma 节点数据中的交互结构
 * Usage: node design/scripts/inspect-interactions.js
 */
const fs   = require('fs');
const path = require('path');

const EXTRACT_DIR = path.join(__dirname, '..', 'figma-extract');

function stripBOM(text) {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

console.log('Loading 05-ops-platform-nodes.json...');
const raw  = fs.readFileSync(path.join(EXTRACT_DIR, '05-ops-platform-nodes.json'), 'utf8');
const data = JSON.parse(stripBOM(raw));

// ─── Inspect top-level structure ────────────────────────────────────────────
console.log('\nTop-level keys:', Object.keys(data));
if (data.nodes) {
  const keys = Object.keys(data.nodes);
  console.log('nodes keys:', keys.slice(0, 5));
  const firstKey = keys[0];
  const firstVal = data.nodes[firstKey];
  console.log('\nFirst node key:', firstKey);
  console.log('First node sub-keys:', Object.keys(firstVal || {}));
  const doc = firstVal && firstVal.document;
  if (doc) {
    console.log('\ndocument.type:', doc.type);
    console.log('document.name:', doc.name);
    const children = doc.children || [];
    console.log('document.children count:', children.length);
    if (children.length > 0) {
      const first = children[0];
      console.log('\nFirst child keys:', Object.keys(first));
      console.log('  name:', first.name);
      console.log('  type:', first.type);
      console.log('  reactions:', JSON.stringify(first.reactions || 'none'));
      console.log('  transitionNodeID:', first.transitionNodeID || 'none');
      console.log('  interactions:', first.interactions ? JSON.stringify(first.interactions).slice(0, 200) : 'none');
    }
  }
}

// ─── Deep search for any node with reactions / transitionNodeID ──────────────
console.log('\n\n=== Searching for interactions ===');
let foundReactions = 0;
let foundTransitions = 0;
let sampleReaction = null;
let sampleTransition = null;

function walkNode(node, depth) {
  if (!node) return;
  if (node.reactions && node.reactions.length > 0) {
    foundReactions++;
    if (!sampleReaction) sampleReaction = { nodeId: node.id, name: node.name, reactions: node.reactions };
  }
  if (node.transitionNodeID) {
    foundTransitions++;
    if (!sampleTransition) sampleTransition = { nodeId: node.id, name: node.name, transitionNodeID: node.transitionNodeID };
  }
  // Check 'interactions' field
  if (node.interactions && node.interactions.length > 0) {
    if (!sampleReaction) sampleReaction = { nodeId: node.id, name: node.name, interactions: node.interactions };
  }
  for (const child of (node.children || [])) {
    walkNode(child, depth + 1);
  }
}

if (data.nodes) {
  for (const key of Object.keys(data.nodes)) {
    const doc = data.nodes[key] && data.nodes[key].document;
    if (doc) walkNode(doc, 0);
  }
}

console.log(`  Nodes with reactions[]: ${foundReactions}`);
console.log(`  Nodes with transitionNodeID: ${foundTransitions}`);
if (sampleReaction) {
  console.log('\n  Sample reaction:');
  console.log(JSON.stringify(sampleReaction, null, 2).slice(0, 1000));
}
if (sampleTransition) {
  console.log('\n  Sample transitionNodeID:');
  console.log(JSON.stringify(sampleTransition, null, 2));
}
