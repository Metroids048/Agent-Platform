/**
 * 用户端统一反馈表单：文本框 + 图片上传（对话点踩 / 意见箱提建议共用）
 */
(function (global) {
  var stores = {};

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function markup(opts) {
    opts = opts || {};
    var textId = opts.textId || 'feedbackText';
    var fileId = opts.fileId || 'feedbackImageInput';
    var listId = opts.listId || 'feedbackImageList';
    var hint = opts.hint || '请描述问题或建议，可上传截图辅助说明。';
    var placeholder = opts.placeholder || '请输入反馈内容…';
    return (
      '<div class="aioq-feedback-form">' +
        (hint ? '<p class="aioq-muted aioq-feedback-form-hint">' + escapeHtml(hint) + '</p>' : '') +
        '<textarea class="textarea aioq-feedback-text" id="' + escapeHtml(textId) + '" rows="5" placeholder="' + escapeHtml(placeholder) + '"></textarea>' +
        '<div class="aioq-feedback-images">' +
          '<input type="file" class="hidden" id="' + escapeHtml(fileId) + '" accept="image/*" multiple aria-hidden="true" tabindex="-1">' +
          '<button type="button" class="btn btn-sm btn--ghost aioq-feedback-add-image" data-feedback-pick="' + escapeHtml(fileId) + '">添加图片</button>' +
          '<div class="aioq-feedback-image-list" id="' + escapeHtml(listId) + '" aria-live="polite"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderList(listId) {
    var listEl = document.getElementById(listId);
    if (!listEl) return;
    var items = stores[listId] || [];
    if (!items.length) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = items.map(function (item, index) {
      return '<div class="aioq-feedback-image-chip">' +
        '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.name) + '">' +
        '<span class="aioq-feedback-image-name">' + escapeHtml(item.name) + '</span>' +
        '<button type="button" class="aioq-feedback-image-remove" data-feedback-list="' + escapeHtml(listId) + '" data-feedback-index="' + index + '" aria-label="移除图片">×</button>' +
      '</div>';
    }).join('');
  }

  function revokeList(listId) {
    (stores[listId] || []).forEach(function (item) {
      if (item.url) {
        try { URL.revokeObjectURL(item.url); } catch (e) {}
      }
    });
    stores[listId] = [];
  }

  function wire(opts) {
    opts = opts || {};
    var textId = opts.textId || 'feedbackText';
    var fileId = opts.fileId || 'feedbackImageInput';
    var listId = opts.listId || 'feedbackImageList';
    var fileInput = document.getElementById(fileId);
    var listEl = document.getElementById(listId);
    if (!fileInput || !listEl) return;
    if (!stores[listId]) stores[listId] = [];

    document.querySelectorAll('[data-feedback-pick="' + fileId + '"]').forEach(function (btn) {
      if (btn.dataset.feedbackPickWired) return;
      btn.dataset.feedbackPickWired = '1';
      btn.addEventListener('click', function () { fileInput.click(); });
    });

    if (!fileInput.dataset.feedbackFileWired) {
      fileInput.dataset.feedbackFileWired = '1';
      fileInput.addEventListener('change', function () {
        Array.prototype.slice.call(fileInput.files || []).forEach(function (file) {
          if (!file || !/^image\//i.test(file.type)) return;
          stores[listId].push({
            name: file.name,
            url: URL.createObjectURL(file)
          });
        });
        fileInput.value = '';
        renderList(listId);
      });
    }

    if (!listEl.dataset.feedbackListWired) {
      listEl.dataset.feedbackListWired = '1';
      listEl.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-feedback-list="' + listId + '"]');
        if (!btn) return;
        var index = parseInt(btn.getAttribute('data-feedback-index'), 10);
        if (isNaN(index) || !stores[listId] || !stores[listId][index]) return;
        var removed = stores[listId].splice(index, 1)[0];
        if (removed && removed.url) {
          try { URL.revokeObjectURL(removed.url); } catch (e) {}
        }
        renderList(listId);
      });
    }

    return { textId: textId, fileId: fileId, listId: listId };
  }

  function collect(opts) {
    opts = opts || {};
    var textId = opts.textId || 'feedbackText';
    var listId = opts.listId || 'feedbackImageList';
    var text = String((document.getElementById(textId) || {}).value || '').trim();
    var images = (stores[listId] || []).map(function (item) {
      return { name: item.name, url: item.url };
    });
    return { text: text, images: images };
  }

  function reset(opts) {
    opts = opts || {};
    var textId = opts.textId || 'feedbackText';
    var fileId = opts.fileId || 'feedbackImageInput';
    var listId = opts.listId || 'feedbackImageList';
    var ta = document.getElementById(textId);
    if (ta) ta.value = '';
    var fileInput = document.getElementById(fileId);
    if (fileInput) fileInput.value = '';
    revokeList(listId);
    renderList(listId);
  }

  function isEmpty(data) {
    return !data || (!String(data.text || '').trim() && !(data.images && data.images.length));
  }

  function attachmentsSummary(images) {
    if (!images || !images.length) return '';
    return images.map(function (img) { return img.name; }).join('、');
  }

  function detailAttachmentsHtml(images) {
    if (!images || !images.length) return '';
    return '<p><strong>附件图片：</strong>' + escapeHtml(attachmentsSummary(images)) + '</p>';
  }

  global.UserFeedbackForm = {
    markup: markup,
    wire: wire,
    collect: collect,
    reset: reset,
    isEmpty: isEmpty,
    detailAttachmentsHtml: detailAttachmentsHtml,
    CHAT: { textId: 'feedbackText', fileId: 'feedbackImageInput', listId: 'feedbackImageList' },
    SUGGEST: { textId: 'userSuggestText', fileId: 'userSuggestImageInput', listId: 'userSuggestImageList' }
  };
})(window);
