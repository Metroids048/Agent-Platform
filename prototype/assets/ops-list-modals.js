/**
 * 运营列表页：遮罩 + 内嵌悬浮弹窗（列表保持可见于遮罩后方）
 */
(function (global) {
  var overlay = null;
  var createShell = null;
  var thirdShell = null;
  var active = null;

  function getEl(id) { return document.getElementById(id); }

  function openPanel(which, opts) {
    overlay = getEl('opsModalOverlay');
    createShell = getEl('createModalShell');
    thirdShell = getEl('thirdPartyModalShell');
    if (!overlay || !createShell || !thirdShell) return;

    if (which === 'create') {
      if (global.OpsModalCreate) OpsModalCreate.open(createShell, opts || {});
      createShell.classList.add('active');
      thirdShell.classList.remove('active');
      active = 'create';
    } else {
      if (global.OpsModalThirdParty) OpsModalThirdParty.open(thirdShell);
      thirdShell.classList.add('active');
      createShell.classList.remove('active');
      active = 'third';
    }

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ops-modal-open');
  }

  function closeModal(refresh) {
    overlay = getEl('opsModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (createShell) createShell.classList.remove('active');
    if (thirdShell) thirdShell.classList.remove('active');
    document.body.classList.remove('ops-modal-open');
    active = null;

    if (refresh && typeof global.refreshAgentList === 'function') {
      global.refreshAgentList();
    }
    var u = new URL(window.location.href);
    if (u.searchParams.has('open')) {
      u.searchParams.delete('open');
      ['fail', 'alwaysFail', 'state'].forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    }
  }

  function openCreate(opts) {
    var p = new URLSearchParams(location.search);
    openPanel('create', {
      fail: p.get('fail'),
      alwaysFail: p.get('alwaysFail'),
      state: p.get('state')
    });
  }

  function openThirdParty() {
    openPanel('third');
  }

  function wireButtons() {
    var btnCreate = getEl('btnOpenCreate');
    var btnThird = getEl('btnOpenThirdParty');
    if (btnCreate) {
      btnCreate.addEventListener('click', function (e) {
        e.preventDefault();
        openCreate({});
      });
    }
    if (btnThird) {
      btnThird.addEventListener('click', function (e) {
        e.preventDefault();
        openThirdParty();
      });
    }
    overlay = getEl('opsModalOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal(false);
      });
    }
    [getEl('createModalShell'), getEl('thirdPartyModalShell')].forEach(function (shell) {
      if (!shell) return;
      shell.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  function openFromQuery() {
    var p = new URLSearchParams(location.search);
    var open = p.get('open');
    if (open === 'create') openCreate();
    else if (open === 'third-party' || open === 'thirdparty') openThirdParty();
  }

  function initOpsListModals() {
    createShell = getEl('createModalShell');
    thirdShell = getEl('thirdPartyModalShell');
    if (createShell && global.OpsModalCreate) OpsModalCreate.mount(createShell);
    if (thirdShell && global.OpsModalThirdParty) OpsModalThirdParty.mount(thirdShell);
    wireButtons();
    openFromQuery();
  }

  global.OpsListModals = {
    init: initOpsListModals,
    openCreate: openCreate,
    openThirdParty: openThirdParty,
    close: closeModal
  };

  global.closeOpsEmbedModal = function (refresh) {
    closeModal(refresh);
    return true;
  };
})(window);
