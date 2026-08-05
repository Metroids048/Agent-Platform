/**

 * 三列配置编辑器（与智能体开发平台布局一致）

 */

(function (global) {

  function bindDebug() {

    var input = document.getElementById('debugInput');

    var btn = document.getElementById('debugSend');

    var box = document.getElementById('debugMsgs');

    if (!input || !btn || !box) return;

    function send() {
      var text = input.value.trim();
      if (!text) return;
      var empty = box.querySelector('.debug-empty');
      if (empty) empty.remove();
      box.querySelectorAll('.debug-bubble').forEach(function (n) { n.remove(); });
      box.innerHTML +=
        '<div class="debug-bubble debug-bubble-user">' + text.replace(/</g, '&lt;') + '</div>' +
        '<div class="debug-bubble debug-bubble-bot">' +
        '您好，根据当前配置，退换货政策为购买后 7 日内可无理由退货…</div>';
      input.value = '';
      box.scrollTop = box.scrollHeight;
      if (global.Proto) {
        Proto.markDebugOk();
        Proto.recordSessionUsage();
        Proto.toast('测试完成');
      }
    }

    btn.addEventListener('click', send);

    input.addEventListener('keydown', function (e) {

      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }

    });

    var refresh = document.getElementById('debugRefresh');

    if (refresh) {

      refresh.addEventListener('click', function () {

        box.innerHTML = '<div class="debug-empty debug-empty-p2"><div class="debug-empty-illus" aria-hidden="true"></div><div>暂无内容</div></div>';

      });

    }

  }



  function bindSegmented(root) {

    var scope = root || document;

    scope.querySelectorAll('.core-seg').forEach(function (seg) {

      seg.querySelectorAll('button').forEach(function (btn) {

        btn.addEventListener('click', function () {

          seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });

          btn.classList.add('active');

        });

      });

    });

  }



  function initDevEditorPage(root) {
    if (!global.Proto) return;
    Proto.ensureOverlaysClosed && Proto.ensureOverlaysClosed();
    Proto.migrateAgentSession && Proto.migrateAgentSession();
    var scope = root || document.getElementById('devEditorRoot') || document;
    Proto.bindSkillConfig && Proto.bindSkillConfig(scope);
    Proto.wireSkillBindButtons && Proto.wireSkillBindButtons();
  }

  function wireEditorRoot(el, q) {

    initDevEditorPage(el);

    bindDebug();

    bindSegmented(el);

    if (global.AgentCoreConfig) AgentCoreConfig.wireDevLinks(el, q);

  }



  global.EditorShell = {

    initDevEditorPage: initDevEditorPage,

    mount: function (sel) {

      var el = typeof sel === 'string' ? document.querySelector(sel) : sel;

      if (!el) return false;

      var q = global.Proto ? Proto.qs().slice(1) : '';

      if (el.querySelector('.dev-col') && el.querySelector('#coreConfigRoot')) {

        wireEditorRoot(el, q);

        return true;

      }

      el.className = 'dev-editor dev-editor-page';

      el.style.minHeight = '480px';

      el.innerHTML = global.AgentCoreConfig ? AgentCoreConfig.buildHTML(q) : '';

      wireEditorRoot(el, q);

      return true;

    },

    bindDebug: bindDebug,

    bindSegmented: bindSegmented,

    toggleAcc: function (head) {

      head.parentElement.classList.toggle('collapsed');

    },

    toggleCore: function (head) {

      head.parentElement.classList.toggle('collapsed');

    }

  };

})(window);

