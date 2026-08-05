/**
 * Figma Plugin API script — run via Plugins > Development > Import plugin from manifest,
 * or paste into a one-off plugin's code.ts after adapting.
 *
 * Cleans Skills 配置 page and places captures 1:1 inside labeled frames (no scale/clip).
 */
(async () => {
  const PAGE_ID = '46:312';
  const FRAMES = [
    { frameId: '62:312', label: '01 · Skills 管理' },
    { frameId: '62:318', label: '02 · 智能体配置' },
    { frameId: '62:324', label: '03 · 用户对话' },
    { frameId: '62:330', label: '04 · 运行监控' },
    { frameId: '62:336', label: '05 · 选择 Skill' },
  ];

  const page = await figma.getNodeByIdAsync(PAGE_ID);
  if (!page || page.type !== 'PAGE') {
    figma.closePlugin('Page not found: ' + PAGE_ID);
    return;
  }
  await figma.setCurrentPageAsync(page);

  const deleted = [];
  for (const child of [...page.children]) {
    const inFrame = FRAMES.some((f) => f.frameId === child.id);
    if (!inFrame && child.type === 'FRAME') {
      deleted.push(child.id);
      child.remove();
    }
  }

  for (const { frameId } of FRAMES) {
    const frame = figma.getNodeById(frameId);
    if (!frame || frame.type !== 'FRAME') continue;
    for (const child of [...frame.children]) {
      if (child.name === 'Header') continue;
      deleted.push(child.id);
      child.remove();
    }
    frame.clipsContent = false;
    frame.layoutMode = 'NONE';
  }

  figma.notify('Cleanup done. Deleted ' + deleted.length + ' nodes.');
  figma.closePlugin();
})();
