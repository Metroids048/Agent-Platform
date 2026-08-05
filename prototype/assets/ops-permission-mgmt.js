/**
 * 权限与开发者管理
 */
(function (global) {
  var KEY = 'proto_ops_developers';

  var DEFAULT = [
    { id: 'dev_001', name: '张三', email: 'zhang@corp.com', role: 'admin', org: '研发部', status: 'active', phone: '138****0001', peakScore: 92 },
    { id: 'dev_002', name: '李四', email: 'li@corp.com', role: 'developer', org: '模型团队', status: 'active', phone: '139****0002', peakScore: 78 },
    { id: 'dev_003', name: '王五', email: 'wang@corp.com', role: 'viewer', org: '运营部', status: 'disabled', phone: '137****0003', peakScore: 45 },
    { id: 'dev_004', name: '赵六', email: 'zhao@corp.com', role: 'developer', org: '平台团队', status: 'active', phone: '136****0004', peakScore: 85 },
    { id: 'dev_005', name: '钱七', email: 'qian@corp.com', role: 'developer', org: '应用团队', status: 'active', phone: '135****0005', peakScore: 71 },
    { id: 'dev_006', name: '孙八', email: 'sun@corp.com', role: 'viewer', org: '运营部', status: 'active', phone: '134****0006', peakScore: 60 },
    { id: 'dev_007', name: '周九', email: 'zhou@corp.com', role: 'admin', org: '研发部', status: 'active', phone: '133****0007', peakScore: 88 },
    { id: 'dev_008', name: '吴十', email: 'wu@corp.com', role: 'developer', org: '模型团队', status: 'active', phone: '132****0008', peakScore: 94 }
  ];

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try { sessionStorage.setItem(KEY, JSON.stringify(DEFAULT)); } catch (e2) {}
    return DEFAULT.slice();
  }

  function save(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function byId(id) {
    return load().find(function (x) { return x.id === id; });
  }

  function roleLabel(role) {
    var map = { admin: '管理员', developer: '开发者', viewer: '只读' };
    return map[role] || role;
  }

  function renderDevTable() {
    var tbody = document.getElementById('devListBody');
    if (!tbody) return;
    tbody.innerHTML = load().map(function (d) {
      var statusTag = d.status === 'active'
        ? '<span class="tag tag-ok">正常</span>'
        : '<span class="tag tag-muted">已停用</span>';
      return '<tr data-dev-id="' + d.id + '">' +
        '<td><strong>' + d.name + '</strong></td>' +
        '<td>' + d.email + '</td>' +
        '<td>' + roleLabel(d.role) + '</td>' +
        '<td>' + d.org + '</td>' +
        '<td>' + statusTag + '</td>' +
        '<td class="ops-inline-actions">' +
        '<a href="' + OpsShell.href('13-permission-view.html', { id: d.id }) + '" class="btn btn-sm">查看</a>' +
        '<a href="' + OpsShell.href('13-permission-edit.html', { id: d.id }) + '" class="btn btn-sm btn-primary">编辑</a>' +
        '<button type="button" class="btn btn-sm btn-danger" data-delete-dev="' + d.id + '">删除</button>' +
        '</td></tr>';
    }).join('');
    document.querySelectorAll('[data-delete-dev]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-dev');
        document.getElementById('deleteConfirmModal').dataset.deleteId = id;
        OpsShell.openModal('deleteConfirmModal');
      });
    });
  }

  function initListPage() {
    OpsShell.initShell({ module: 'permission', subtitle: '权限管理', tabs: '#permModuleTabs' });
    renderDevTable();
    document.getElementById('btnAddDeveloper').href = OpsShell.href('13-permission-add.html');

    document.getElementById('confirmDeleteDev').addEventListener('click', function () {
      var modal = document.getElementById('deleteConfirmModal');
      var id = modal.dataset.deleteId;
      save(load().filter(function (x) { return x.id !== id; }));
      OpsShell.closeModal('deleteConfirmModal');
      Proto.toast('已删除开发者账号');
      renderDevTable();
    });
  }

  function fillForm(dev, readonly) {
    document.getElementById('devName').value = dev.name || '';
    document.getElementById('devEmail').value = dev.email || '';
    document.getElementById('devPhone').value = dev.phone || '';
    document.getElementById('devOrg').value = dev.org || '';
    document.getElementById('devRole').value = dev.role || 'developer';
    ['devName', 'devEmail', 'devPhone', 'devOrg', 'devRole'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = !!readonly;
    });
  }

  function renderPeakIndicator(score) {
    var el = document.getElementById('peakIndicator');
    if (!el) return;
    el.innerHTML = '<span class="ops-peak-bar" style="width:' + score + '%;"></span><span class="ops-peak-value">' + score + '</span>' +
      '<span class="ops-tooltip">Peak Indicator：开发者活跃度综合评分（0–100）</span>';
  }

  function initEditPage() {
    OpsShell.initShell({ module: 'permission', subtitle: '编辑开发者' });
    var id = OpsShell.params().get('id') || 'dev_001';
    var dev = byId(id);
    if (!dev) return;
    fillForm(dev, false);
    var listLink = document.getElementById('breadcrumbListLink');
    if (listLink) listLink.href = OpsShell.href('13-permission-mgmt.html');
    document.querySelectorAll('.ops-readonly-tip').forEach(function (tip) {
      tip.classList.remove('hidden');
    });
    document.getElementById('btnSaveDev').addEventListener('click', function () {
      var updated = {
        id: id,
        name: document.getElementById('devName').value.trim(),
        email: document.getElementById('devEmail').value.trim(),
        phone: document.getElementById('devPhone').value.trim(),
        org: document.getElementById('devOrg').value.trim(),
        role: document.getElementById('devRole').value,
        status: dev.status,
        peakScore: dev.peakScore || 70
      };
      if (!updated.name || !updated.email) { Proto.toast('请填写必填项'); return; }
      save(load().map(function (x) { return x.id === id ? updated : x; }));
      Proto.toast('保存成功');
      window.location.href = OpsShell.href('13-permission-mgmt.html');
    });
  }

  function initViewPage() {
    OpsShell.initShell({ module: 'permission', subtitle: '查看开发者' });
    var id = OpsShell.params().get('id') || 'dev_001';
    var dev = byId(id);
    if (!dev) return;
    fillForm(dev, true);
    renderPeakIndicator(dev.peakScore || 70);
    if (dev.role === 'viewer') {
      document.getElementById('viewerTip').classList.remove('hidden');
    }
    var listLink = document.getElementById('breadcrumbListLink');
    if (listLink) listLink.href = OpsShell.href('13-permission-mgmt.html');
    var editLink = document.getElementById('btnEditDev');
    if (editLink && dev.role !== 'viewer') {
      editLink.href = OpsShell.href('13-permission-edit.html', { id: id });
      editLink.classList.remove('hidden');
    }
  }

  function initAddPage() {
    OpsShell.initShell({ module: 'permission', subtitle: '新增开发者' });
    var listLink = document.getElementById('breadcrumbListLink');
    if (listLink) listLink.href = OpsShell.href('13-permission-mgmt.html');
    document.getElementById('btnCreateDev').addEventListener('click', function () {
      var entry = {
        id: 'dev_' + Date.now(),
        name: document.getElementById('devName').value.trim(),
        email: document.getElementById('devEmail').value.trim(),
        phone: document.getElementById('devPhone').value.trim(),
        org: document.getElementById('devOrg').value.trim(),
        role: document.getElementById('devRole').value,
        status: 'active',
        peakScore: 50
      };
      if (!entry.name || !entry.email) { Proto.toast('请填写必填项'); return; }
      save(load().concat([entry]));
      Proto.toast('开发者账号已创建');
      window.location.href = OpsShell.href('13-permission-mgmt.html');
    });
  }

  function initOrgPage() {
    OpsShell.initShell({ module: 'permission', subtitle: '组织架构' });
    var listLink = document.getElementById('linkBackPerm');
    if (listLink) listLink.href = OpsShell.href('13-permission-mgmt.html');
  }

  global.OpsPermissionMgmt = {
    load: load,
    initListPage: initListPage,
    initEditPage: initEditPage,
    initViewPage: initViewPage,
    initAddPage: initAddPage,
    initOrgPage: initOrgPage
  };
})(window);
