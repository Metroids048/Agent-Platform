/**
 * 通用右键/更多操作菜单（Figma context menu 帧）
 */
(function (global) {
  var menuEl = null;
  var hideHandler = null;

  function ensureMenu() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.className = 'context-menu';
    menuEl.id = 'opsContextMenu';
    menuEl.setAttribute('role', 'menu');
    document.body.appendChild(menuEl);
    return menuEl;
  }

  function hide() {
    if (menuEl) menuEl.classList.remove('open');
    if (hideHandler) {
      document.removeEventListener('click', hideHandler);
      document.removeEventListener('contextmenu', hideHandler);
      hideHandler = null;
    }
  }

  function show(x, y, items) {
    var menu = ensureMenu();
    menu.innerHTML = items.map(function (item) {
      if (item.divider) return '<hr class="context-divider">';
      var cls = item.danger ? ' danger' : '';
      return '<button type="button" class="context-item' + cls + '" data-action="' + (item.action || '') + '">' + item.label + '</button>';
    }).join('');
    menu.style.left = Math.min(x, window.innerWidth - 160) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - items.length * 36 - 8) + 'px';
    menu.classList.add('open');
    menu.querySelectorAll('.context-item').forEach(function (btn, idx) {
      var item = items.filter(function (i) { return !i.divider; })[idx];
      if (!item) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        hide();
        if (typeof item.onClick === 'function') item.onClick();
      });
    });
    hideHandler = function () { hide(); };
    setTimeout(function () {
      document.addEventListener('click', hideHandler);
      document.addEventListener('contextmenu', hideHandler);
    }, 0);
  }

  function wireRowActions(row, itemsBuilder) {
    if (row.dataset.ctxWired) return;
    row.dataset.ctxWired = '1';
    row.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var items = itemsBuilder(row);
      if (items && items.length) show(e.clientX, e.clientY, items);
    });
    var more = row.querySelector('[data-row-menu]');
    if (more) {
      more.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var rect = more.getBoundingClientRect();
        var items = itemsBuilder(row);
        if (items && items.length) show(rect.left, rect.bottom + 4, items);
      });
    }
  }

  global.OpsContextMenu = {
    show: show,
    hide: hide,
    wireRowActions: wireRowActions
  };
})(window);
