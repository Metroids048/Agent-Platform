/**
 * 智能体图标库：预设 emoji 图标 + 上传 + 小弹窗选择
 */
(function (global) {
  var PRESETS = [
    { id: 'robot', emoji: '🤖', label: '通用助手' },
    { id: 'chat', emoji: '💬', label: '问答对话' },
    { id: 'brain', emoji: '🧠', label: '智能推理' },
    { id: 'task', emoji: '📋', label: '任务执行' },
    { id: 'flow', emoji: '🔄', label: '流程审批' },
    { id: 'multi', emoji: '🔗', label: '多智能体' },
    { id: 'chart', emoji: '📊', label: '数据分析' },
    { id: 'search', emoji: '🔍', label: '检索问答' },
    { id: 'doc', emoji: '📝', label: '文档处理' },
    { id: 'report', emoji: '📑', label: '报告生成' },
    { id: 'book', emoji: '📚', label: '知识库' },
    { id: 'bulb', emoji: '💡', label: '创意助手' },
    { id: 'target', emoji: '🎯', label: '目标达成' },
    { id: 'shield', emoji: '🛡️', label: '安全合规' },
    { id: 'legal', emoji: '⚖️', label: '法务审查' },
    { id: 'medical', emoji: '🏥', label: '医疗健康' },
    { id: 'cart', emoji: '🛒', label: '采购申请' },
    { id: 'mail', emoji: '📧', label: '邮件办公' },
    { id: 'folder', emoji: '🗂️', label: '文件整理' },
    { id: 'team', emoji: '👥', label: '团队协作' },
    { id: 'building', emoji: '🏢', label: '企业助手' },
    { id: 'gear', emoji: '⚙️', label: '工具集成' },
    { id: 'check', emoji: '✅', label: '审批通过' },
    { id: 'bell', emoji: '🔔', label: '通知提醒' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closePicker() {
    var pop = document.getElementById('agentIconPopover');
    if (pop) pop.remove();
    document.removeEventListener('click', onDocClick, true);
  }

  function onDocClick(e) {
    var pop = document.getElementById('agentIconPopover');
    if (!pop) return;
    if (pop.contains(e.target) || e.target.closest('[data-icon-library-trigger]')) return;
    closePicker();
  }

  function applyToElement(el, value, kind) {
    if (!el) return;
    el.dataset.iconKind = kind || 'emoji';
    el.dataset.iconValue = value || '';
    el.classList.add('icon-uploader--filled');
    el.innerHTML = '';
    if (kind === 'upload' && value) {
      var img = document.createElement('img');
      img.src = value;
      img.alt = '智能体图标';
      el.appendChild(img);
      return;
    }
    el.textContent = value || '📤';
  }

  function clearElement(el) {
    if (!el) return;
    delete el.dataset.iconKind;
    delete el.dataset.iconValue;
    el.classList.remove('icon-uploader--filled');
    el.innerHTML = '';
    el.textContent = '📤';
    el.classList.add('icon-uploader--empty');
  }

  function hasIcon(el) {
    return !!(el && el.dataset.iconValue);
  }

  function getIcon(el) {
    if (!el) return { kind: '', value: '' };
    return {
      kind: el.dataset.iconKind || '',
      value: el.dataset.iconValue || ''
    };
  }

  function positionPopover(pop, anchor) {
    var rect = anchor.getBoundingClientRect();
    var margin = 8;
    var left = rect.left;
    var top = rect.bottom + margin;
    var width = pop.offsetWidth || 320;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }
    if (top + (pop.offsetHeight || 280) > window.innerHeight - 16) {
      top = Math.max(16, rect.top - (pop.offsetHeight || 280) - margin);
    }
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function openPicker(anchor, onSelect) {
    if (!anchor) return;
    closePicker();
    var pop = document.createElement('div');
    pop.className = 'agent-icon-popover';
    pop.id = 'agentIconPopover';
    pop.innerHTML =
      '<div class="agent-icon-popover-head">选择图标</div>' +
      '<div class="agent-icon-popover-grid">' +
        PRESETS.map(function (item) {
          return '<button type="button" class="agent-icon-option" data-icon-pick="' + escapeHtml(item.emoji) + '" title="' + escapeHtml(item.label) + '">' +
            '<span class="agent-icon-option-emoji">' + item.emoji + '</span>' +
            '<span class="agent-icon-option-label">' + escapeHtml(item.label) + '</span>' +
          '</button>';
        }).join('') +
      '</div>';
    document.body.appendChild(pop);
    positionPopover(pop, anchor);
    pop.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-icon-pick]');
      if (!btn) return;
      var emoji = btn.getAttribute('data-icon-pick');
      if (typeof onSelect === 'function') onSelect(emoji, 'emoji');
      closePicker();
    });
    setTimeout(function () {
      document.addEventListener('click', onDocClick, true);
    }, 0);
  }

  function wireRow(opts) {
    opts = opts || {};
    var preview = opts.preview;
    var uploadBtn = opts.uploadBtn;
    var libraryBtn = opts.libraryBtn;
    var fileInput = opts.fileInput;
    if (!preview) return;

    if (libraryBtn) {
      libraryBtn.setAttribute('data-icon-library-trigger', '1');
      libraryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPicker(libraryBtn, function (emoji) {
          applyToElement(preview, emoji, 'emoji');
        });
      });
    }

    if (fileInput) {
      var uploadTarget = uploadBtn || preview;
      if (uploadTarget) {
        uploadTarget.addEventListener('click', function (e) {
          e.preventDefault();
          fileInput.click();
        });
      }
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
          if (global.alert) global.alert('请上传 PNG 或 JPG 图片');
          fileInput.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          applyToElement(preview, reader.result, 'upload');
        };
        reader.readAsDataURL(file);
      });
    }
  }

  global.AgentIconLibrary = {
    PRESETS: PRESETS,
    applyToElement: applyToElement,
    clearElement: clearElement,
    hasIcon: hasIcon,
    getIcon: getIcon,
    openPicker: openPicker,
    wireRow: wireRow,
    closePicker: closePicker
  };
})(typeof window !== 'undefined' ? window : global);
