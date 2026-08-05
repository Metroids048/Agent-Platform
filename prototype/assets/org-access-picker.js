/**
 * Shared org/user tree picker for agent visibility permissions.
 */
(function (global) {
  var ORG_TREE = {
    id: 'org_root',
    name: '敖钦 AI 平台',
    type: 'department',
    path: '敖钦 AI 平台',
    children: [
      {
        id: 'dept_rd',
        name: '研发部',
        type: 'department',
        path: '敖钦 AI 平台 / 研发部',
        children: [
          {
            id: 'team_platform',
            name: '平台团队',
            type: 'department',
            path: '敖钦 AI 平台 / 研发部 / 平台团队',
            children: [
              { id: 'user_zhang', type: 'user', name: '张三', path: '研发部 / 平台团队', meta: '管理员' }
            ]
          },
          {
            id: 'team_model',
            name: '模型团队',
            type: 'department',
            path: '敖钦 AI 平台 / 研发部 / 模型团队',
            children: [
              { id: 'user_li', type: 'user', name: '李四', path: '研发部 / 模型团队', meta: '开发者' }
            ]
          },
          {
            id: 'team_app',
            name: '应用团队',
            type: 'department',
            path: '敖钦 AI 平台 / 研发部 / 应用团队',
            children: [
              { id: 'user_qian', type: 'user', name: '钱七', path: '研发部 / 应用团队', meta: '开发者' }
            ]
          }
        ]
      },
      {
        id: 'dept_ops',
        name: '运营部',
        type: 'department',
        path: '敖钦 AI 平台 / 运营部',
        children: [
          {
            id: 'team_agent_ops',
            name: '智能体运营',
            type: 'department',
            path: '敖钦 AI 平台 / 运营部 / 智能体运营',
            children: [
              { id: 'user_wang', type: 'user', name: '王五', path: '运营部 / 智能体运营', meta: '运营' }
            ]
          }
        ]
      }
    ]
  };

  function flattenTree(node, list) {
    if (!node) return list;
    if (node.id && node.id !== 'org_root') {
      list.push({
        id: node.id,
        type: node.type === 'user' ? 'user' : 'department',
        name: node.name,
        path: node.path || '',
        meta: node.meta || ''
      });
    }
    (node.children || []).forEach(function (child) { flattenTree(child, list); });
    return list;
  }

  var DEFAULT_TARGETS = flattenTree(ORG_TREE, []);

  function cloneTargets(list) {
    return (list || []).map(function (item) {
      return Object.assign({}, item);
    });
  }

  function normalizeTargets(list) {
    var seen = {};
    return cloneTargets(list).filter(function (item) {
      if (!item || !item.id || seen[item.id]) return false;
      seen[item.id] = true;
      item.type = item.type === 'user' ? 'user' : 'department';
      item.name = item.name || item.id;
      item.path = item.path || '';
      return true;
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function summarize(targets) {
    var list = normalizeTargets(targets);
    if (!list.length) return '未选择部门/用户';
    return list.map(function (item) {
      if (item.type === 'user') return item.name;
      return item.name + '（全部人员）';
    }).join('、');
  }

  function targetFromNode(node) {
    return {
      id: node.id,
      type: node.type === 'user' ? 'user' : 'department',
      name: node.name,
      path: node.path || '',
      meta: node.meta || ''
    };
  }

  function findNodeById(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      var found = findNodeById(children[i], id);
      if (found) return found;
    }
    return null;
  }

  function renderSelected(targets) {
    if (!targets.length) {
      return '<div class="org-picker-empty">还没有选择部门或用户</div>';
    }
    return targets.map(function (item) {
      var label = item.type === 'user' ? item.name : item.name + '（全部人员）';
      return '<span class="org-picker-chip">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<button type="button" data-org-remove="' + escapeHtml(item.id) + '" aria-label="移除">x</button>' +
      '</span>';
    }).join('');
  }

  function renderTreeNode(node, depth, expanded, selected) {
    if (!node || node.id === 'org_root') {
      return (node.children || []).map(function (child) {
        return renderTreeNode(child, 0, expanded, selected);
      }).join('');
    }
    var isUser = node.type === 'user';
    var children = node.children || [];
    var hasChildren = children.length > 0;
    var isExpanded = expanded[node.id] !== false;
    var isSelected = selected.some(function (x) { return x.id === node.id; });
    var indent = depth * 18;
    var row =
      '<div class="org-picker-tree-row' + (isSelected ? ' is-selected' : '') + '" style="padding-left:' + indent + 'px">' +
        (hasChildren
          ? '<button type="button" class="org-picker-tree-toggle" data-org-toggle="' + escapeHtml(node.id) + '" aria-label="展开/收起">' + (isExpanded ? '▾' : '▸') + '</button>'
          : '<span class="org-picker-tree-spacer"></span>') +
        '<label class="org-picker-tree-label">' +
          '<input type="checkbox" data-org-check="' + escapeHtml(node.id) + '"' + (isSelected ? ' checked' : '') + '>' +
          '<span class="org-picker-tree-name">' + escapeHtml(node.name) + '</span>' +
          (isUser && (node.meta || node.path)
            ? '<span class="org-picker-tree-meta">' + escapeHtml(node.meta || node.path || '') + '</span>'
            : '') +
        '</label>' +
      '</div>';
    var childHtml = '';
    if (hasChildren && isExpanded) {
      childHtml = children.map(function (child) {
        return renderTreeNode(child, depth + 1, expanded, selected);
      }).join('');
    }
    return row + childHtml;
  }

  function open(options) {
    options = options || {};
    var selected = normalizeTargets(options.selected || []);
    var shareMode = options.shareMode || (selected.length ? 'specific' : 'private');
    var expanded = {};
    function markExpanded(node) {
      if (!node) return;
      if (node.id) expanded[node.id] = true;
      (node.children || []).forEach(markExpanded);
    }
    markExpanded(ORG_TREE);

    var mask = document.createElement('div');
    mask.className = 'org-picker-mask show';
    mask.innerHTML =
      '<div class="org-picker-modal" role="dialog" aria-modal="true">' +
        '<div class="org-picker-head">' +
          '<div><h3>' + escapeHtml(options.title || '配置使用权限') + '</h3>' +
          '<p>' + escapeHtml(options.subtitle || '个人：仅创建者可用，免审核。组织/公开：须提交审核后上架。') + '</p></div>' +
          '<button type="button" class="org-picker-close" data-org-close aria-label="关闭">x</button>' +
        '</div>' +
        '<div class="org-picker-mode" id="orgPickerMode">' +
          '<label class="org-picker-mode-item"><input type="radio" name="orgShareMode" value="private"' + (shareMode === 'private' ? ' checked' : '') + '>个人</label>' +
          '<label class="org-picker-mode-item"><input type="radio" name="orgShareMode" value="specific"' + (shareMode === 'specific' || shareMode === 'org' ? ' checked' : '') + '>组织</label>' +
          '<label class="org-picker-mode-item"><input type="radio" name="orgShareMode" value="public"' + (shareMode === 'public' ? ' checked' : '') + '>公开</label>' +
        '</div>' +
        '<div class="org-picker-body">' +
          '<div class="org-picker-tree-wrap" id="orgPickerTreeWrap">' +
            '<div class="org-picker-tree org-tree" id="orgPickerTree"></div>' +
          '</div>' +
          '<div class="org-picker-selected"><h4>已选择</h4><div id="orgPickerSelected"></div></div>' +
        '</div>' +
        '<div class="org-picker-foot">' +
          '<button type="button" class="btn" data-org-close>取消</button>' +
          '<button type="button" class="btn btn-primary" data-org-confirm>确认</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    function currentShareMode() {
      var checked = mask.querySelector('input[name="orgShareMode"]:checked');
      return checked ? checked.value : 'private';
    }

    function syncTreeVisibility() {
      var mode = currentShareMode();
      var wrap = mask.querySelector('#orgPickerTreeWrap');
      var selectedPanel = mask.querySelector('.org-picker-selected');
      if (wrap) wrap.style.display = mode === 'specific' ? '' : 'none';
      if (selectedPanel) selectedPanel.style.display = mode === 'specific' ? '' : 'none';
    }

    function render() {
      var treeEl = mask.querySelector('#orgPickerTree');
      var selectedEl = mask.querySelector('#orgPickerSelected');
      if (treeEl) {
        treeEl.innerHTML = '<ul><li><strong>' + escapeHtml(ORG_TREE.name) + '</strong>' +
          '<div class="org-picker-tree-list">' + renderTreeNode(ORG_TREE, 0, expanded, selected) + '</div></li></ul>';
      }
      if (selectedEl) selectedEl.innerHTML = renderSelected(selected);
      syncTreeVisibility();
    }

    function close() {
      mask.remove();
    }

    function toggleSelection(nodeId) {
      var node = findNodeById(ORG_TREE, nodeId);
      if (!node || node.id === 'org_root') return;
      var item = targetFromNode(node);
      if (selected.some(function (x) { return x.id === nodeId; })) {
        selected = selected.filter(function (x) { return x.id !== nodeId; });
      } else {
        selected = selected.concat([item]);
      }
    }

    mask.addEventListener('change', function (event) {
      if (event.target.matches('input[name="orgShareMode"]')) {
        render();
      }
    });

    mask.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-org-toggle]');
      var check = event.target.closest('[data-org-check]');
      var remove = event.target.closest('[data-org-remove]');
      if (event.target === mask || event.target.hasAttribute('data-org-close')) {
        close();
        return;
      }
      if (toggle) {
        var tid = toggle.getAttribute('data-org-toggle');
        expanded[tid] = !expanded[tid];
        render();
        return;
      }
      if (check) {
        toggleSelection(check.getAttribute('data-org-check'));
        render();
        return;
      }
      if (remove) {
        selected = selected.filter(function (x) { return x.id !== remove.getAttribute('data-org-remove'); });
        render();
        return;
      }
      if (event.target.hasAttribute('data-org-confirm')) {
        var mode = currentShareMode();
        var payload = {
          shareMode: mode,
          targets: mode === 'specific' ? normalizeTargets(selected) : []
        };
        if (mode === 'specific' && !payload.targets.length) {
          if (typeof options.onEmptyOrg === 'function') options.onEmptyOrg();
          else if (global.alert) global.alert('请至少选择一个部门或用户');
          return;
        }
        if (typeof options.onConfirm === 'function') {
          options.onConfirm(payload);
        }
        close();
      }
    });

    render();
    return { close: close };
  }

  global.OrgAccessPicker = {
    tree: ORG_TREE,
    targets: DEFAULT_TARGETS,
    normalizeTargets: normalizeTargets,
    summarize: summarize,
    open: open
  };
})(typeof window !== 'undefined' ? window : global);
