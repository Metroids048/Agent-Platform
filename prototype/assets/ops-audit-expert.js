/**
 * 运营审核专家任务页
 */
(function (global) {
  function initAuditExpertPage() {
    OpsShell.initShell({ module: 'audit', subtitle: '专家任务审核' });
    OpsDispatch.ensureModals();

    var id = OpsShell.params().get('taskId') || 'task_002';
    var auditList = global.OpsExpertWorkbench ? OpsExpertWorkbench.loadAudit() : [];
    var item = auditList.find(function (x) { return x.id === id; }) || auditList[0];

    var queueLink = document.getElementById('breadcrumbAuditLink');
    if (queueLink) queueLink.href = OpsShell.href('audit-workbench.html');

    if (!item) {
      var page = document.querySelector('.audit-review-page');
      if (page) page.innerHTML = '<div class="card" style="padding:24px;text-align:center;">暂无待审核专家任务<a href="' + OpsShell.href('audit-workbench.html') + '" class="btn btn-primary" style="margin-left:12px;">返回审核工作台</a></div>';
      return;
    }

    document.getElementById('auditExpertTitle').textContent = item.title;
    document.getElementById('auditExpertName').textContent = item.expert;
    document.getElementById('auditExpertTime').textContent = item.submittedAt;
    var summaryEl = document.getElementById('auditExpertSummary');
    if (summaryEl) summaryEl.textContent = item.summary || '已完成处理并提交审核（原型模拟）';

    document.getElementById('btnApproveExpert').addEventListener('click', function () {
      OpsExpertWorkbench.saveAudit(auditList.filter(function (x) { return x.id !== item.id; }));
      Proto.toast('专家任务已通过审核');
      setTimeout(function () { window.location.href = OpsShell.href('audit-workbench.html'); }, 600);
    });

    document.getElementById('btnRejectExpert').addEventListener('click', function () {
      OpsShell.openModal('rejectReasonModal');
    });

    document.getElementById('confirmRejectExpert').addEventListener('click', function () {
      var reason = document.getElementById('rejectExpertReason').value.trim();
      if (!reason) { Proto.toast('请填写退回理由'); return; }
      OpsExpertWorkbench.saveAudit(auditList.filter(function (x) { return x.id !== item.id; }));
      OpsShell.closeModal('rejectReasonModal');
      Proto.toast('已退回专家任务');
      setTimeout(function () { window.location.href = OpsShell.href('audit-workbench.html'); }, 600);
    });

    var moreBtn = document.getElementById('btnAuditMore');
    if (moreBtn && global.OpsContextMenu) {
      moreBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var rect = moreBtn.getBoundingClientRect();
        OpsContextMenu.show(rect.left, rect.bottom + 4, [
          { label: '通过审核', onClick: function () { document.getElementById('btnApproveExpert').click(); } },
          { label: '退回任务', onClick: function () { document.getElementById('btnRejectExpert').click(); } },
          { label: '转交其他运营', onClick: function () { Proto.toast('已转交（演示）'); } }
        ]);
      });
    }

    var tbody = document.getElementById('auditExpertHistoryBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td>提交审核</td><td>' + item.submittedAt + '</td><td>' + item.expert + '</td></tr>' +
        '<tr><td>任务创建</td><td>2026-06-01 10:00</td><td>系统</td></tr>';
    }
  }

  global.OpsAuditExpert = {
    initAuditExpertPage: initAuditExpertPage
  };
})(window);
