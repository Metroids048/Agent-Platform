(function () {
  if (!/[?&]figma=1(?:&|$)/.test(location.search) && !location.hash.includes('figmacapture=')) return;

  document.documentElement.classList.add('figma-capture');

  var map = {
    '\uD83D\uDD14': '通知',
    '\uD83D\uDD12': '锁',
    '\u2B06': '↑',
    '\uFF0B': '+',
    '\u22EF': '...',
    '\u2197': '↗',
    '\u2190': '←',
    '\uD83D\uDCCB': '审核',
    '\uD83D\uDC64': '用户',
    '\uD83C\uDFE2': '公司',
    '\uD83D\uDD15': '通知'
  };

  function replaceEmoji(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var t = node.textContent;
      Object.keys(map).forEach(function (k) {
        t = t.split(k).join(map[k]);
      });
      if (t !== node.textContent) node.textContent = t;
    });
  }

  function prepAgentDetail() {
    var tabConfig = document.querySelector('#agentTabs [data-tab="config"]');
    if (tabConfig) tabConfig.click();
    document.querySelectorAll('.modal-overlay, .proto-overlay, #resourceOverlay').forEach(function (el) {
      el.classList.add('hidden');
    });
  }

  function run() {
    replaceEmoji(document.body);
    if (document.getElementById('opsEditorRoot') || document.getElementById('agentTabs')) {
      prepAgentDetail();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
