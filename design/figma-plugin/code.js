/**
 * Nuclear cleanup: keep exactly ONE board frame on Skills 配置 page.
 * Figma Desktop: Plugins > Development > Import manifest.json > Run
 */
(async () => {
  const PAGE_ID = '46:312';
  const BOARD_NAME = /Skills 配置 · 原型页面集|figma-skills-board/i;
  const BOARD_MIN_WIDTH = 5500;

  const page = await figma.getNodeByIdAsync(PAGE_ID);
  if (!page || page.type !== 'PAGE') {
    figma.closePlugin('Page Skills 配置 (46:312) not found');
    return;
  }
  await figma.setCurrentPageAsync(page);

  const deleted = [];

  page.findAll(function (n) {
    if (n.type === 'TEXT' && /待 HTML|BodyPlaceholder|渲染补充|捕获填充/i.test(n.characters || '')) {
      return true;
    }
    if (n.name === 'BodyPlaceholder') return true;
    return false;
  }).forEach(function (n) {
    deleted.push(n.id);
    n.remove();
  });

  const topFrames = page.children.filter(function (c) {
    return c.type === 'FRAME';
  });

  let kept = null;
  let bestScore = -1;

  for (const frame of topFrames) {
    const nameMatch = BOARD_NAME.test(frame.name) ? 1000 : 0;
    const wideBonus = frame.width >= BOARD_MIN_WIDTH ? 500 : 0;
    const score = frame.width + nameMatch + wideBonus - frame.x * 0.001;
    if (score > bestScore) {
      bestScore = score;
      kept = frame;
    }
  }

  if (!kept && topFrames.length > 0) {
    kept = topFrames.reduce(function (a, b) {
      return a.width >= b.width ? a : b;
    });
  }

  for (const frame of topFrames) {
    if (kept && frame.id === kept.id) continue;
    deleted.push(frame.id);
    frame.remove();
  }

  for (const child of [...page.children]) {
    if (child.type === 'FRAME') continue;
    if (child.type === 'TEXT' && /__pageTitle|Skills 配置/i.test(child.characters || '')) {
      deleted.push(child.id);
      child.remove();
    }
  }

  if (kept) {
    kept.x = 0;
    kept.y = 0;
    kept.name = 'Skills 配置 · 原型页面集';
    kept.clipsContent = false;
  }

  const remaining = page.children.map(function (c) {
    return { id: c.id, name: c.name, type: c.type, w: 'width' in c ? c.width : 0 };
  });

  figma.notify(
    kept
      ? 'Kept 1 board, deleted ' + deleted.length + ' duplicates'
      : 'No board found — run capture then re-run plugin'
  );
  figma.closePlugin(
    JSON.stringify(
      {
        keptId: kept ? kept.id : null,
        keptWidth: kept ? kept.width : 0,
        deletedCount: deleted.length,
        deletedIds: deleted,
        remainingCount: remaining.length,
        remaining: remaining
      },
      null,
      2
    )
  );
})();
