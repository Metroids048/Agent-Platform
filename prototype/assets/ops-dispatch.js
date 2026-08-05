/**
 * 任务分派共享弹窗：指定团队/专家、修改截止时间、多人处理
 */
(function (global) {
  function ensureModals() {
    if (document.getElementById('dispatchTeamModal')) return;
    var html =
      '<div class="modal-overlay hidden" id="dispatchTeamModal">' +
      '  <div class="modal-box modal-lg ops-modal-team">' +
      '    <div class="modal-header"><h2>指定团队处理</h2><button type="button" class="close" data-close-modal="dispatchTeamModal">✕</button></div>' +
      '    <div class="modal-body">' +
      '      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">当前反馈问题已自动归因，由模型团队处理</p>' +
      '      <div class="form-row"><span class="form-label">处理状态</span><div class="form-control"><span class="tag tag-warn" id="dispatchTeamStatus">待处理</span></div></div>' +
      '      <div class="form-row"><span class="form-label required">指定团队</span><div class="form-control">' +
      '        <select class="select" id="dispatchTeamSelect"><option>模型团队</option><option>应用团队</option><option>平台团队</option></select>' +
      '      </div></div>' +
      '      <div class="form-row"><span class="form-label">备注</span><div class="form-control"><textarea class="textarea" id="dispatchTeamNote" placeholder="可选：分派说明"></textarea></div></div>' +
      '    </div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" data-close-modal="dispatchTeamModal">取消</button>' +
      '      <button type="button" class="btn btn-primary" id="confirmDispatchTeam">确认分派</button>' +
      '    </div></div></div>' +

      '<div class="modal-overlay hidden" id="dispatchExpertModal">' +
      '  <div class="modal-box modal-lg ops-modal-expert">' +
      '    <div class="modal-header"><h2>指定专家处理</h2><button type="button" class="close" data-close-modal="dispatchExpertModal">✕</button></div>' +
      '    <div class="modal-body">' +
      '      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">当前反馈问题已自动归因，请选择处理专家</p>' +
      '      <div class="form-row"><span class="form-label">处理状态</span><div class="form-control"><span class="tag tag-warn">待处理</span></div></div>' +
      '      <div class="form-row"><span class="form-label">指定团队</span><div class="form-control"><span class="tag tag-info" id="dispatchExpertTeam">模型团队</span></div></div>' +
      '      <div class="form-row"><span class="form-label required">选择专家</span><div class="form-control">' +
      '        <select class="select" id="dispatchExpertSelect"><option>李专家</option><option>王专家</option><option>赵专家</option></select>' +
      '      </div></div>' +
      '      <div class="form-row"><span class="form-label">期望完成</span><div class="form-control"><input class="input" type="date" id="dispatchExpertDeadline"></div></div>' +
      '    </div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" data-close-modal="dispatchExpertModal">取消</button>' +
      '      <button type="button" class="btn btn-primary" id="confirmDispatchExpert">确认分派</button>' +
      '    </div></div></div>' +

      '<div class="modal-overlay hidden" id="deadlineModal">' +
      '  <div class="modal-box modal-sm">' +
      '    <div class="modal-header"><h2>修改截止时间</h2><button type="button" class="close" data-close-modal="deadlineModal">✕</button></div>' +
      '    <div class="modal-body">' +
      '      <div class="form-row"><span class="form-label required">新截止时间</span><div class="form-control"><input class="input" type="datetime-local" id="deadlineInput"></div></div>' +
      '    </div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" data-close-modal="deadlineModal">取消</button>' +
      '      <button type="button" class="btn btn-primary" id="confirmDeadline">保存</button>' +
      '    </div></div></div>' +

      '<div class="modal-overlay hidden" id="multiExpertModal">' +
      '  <div class="modal-box modal-lg">' +
      '    <div class="modal-header"><h2>多个专家处理</h2><button type="button" class="close" data-close-modal="multiExpertModal">✕</button></div>' +
      '    <div class="modal-body">' +
      '      <div class="ops-flow-chart">' +
      '        <span class="ops-flow-node">用户反馈</span><span class="ops-flow-arrow">→</span>' +
      '        <span class="ops-flow-node">模型团队</span><span class="ops-flow-arrow">→</span>' +
      '        <span class="ops-flow-node">李专家</span><span class="ops-flow-arrow">→</span>' +
      '        <span class="ops-flow-node">王专家</span>' +
      '      </div>' +
      '      <p style="font-size:13px;color:var(--text-muted);margin-top:12px;">多专家协同处理流转路径</p>' +
      '    </div>' +
      '    <div class="modal-footer"><button type="button" class="btn btn-primary" data-close-modal="multiExpertModal">知道了</button></div>' +
      '  </div></div>' +

      '<div class="modal-overlay hidden" id="delayRequestModal">' +
      '  <div class="modal-box modal-md">' +
      '    <div class="modal-header"><h2>申请延时</h2><button type="button" class="close" data-close-modal="delayRequestModal">✕</button></div>' +
      '    <div class="modal-body">' +
      '      <div class="form-row"><span class="form-label required">延时原因</span><div class="form-control"><textarea class="textarea" id="delayReasonInput" placeholder="请说明申请延时的原因"></textarea></div></div>' +
      '      <div class="form-row"><span class="form-label">期望延期至</span><div class="form-control"><input class="input" type="date" id="delayUntilInput"></div></div>' +
      '    </div>' +
      '    <div class="modal-footer">' +
      '      <button type="button" class="btn" data-close-modal="delayRequestModal">取消</button>' +
      '      <button type="button" class="btn btn-primary" id="confirmDelayRequest">提交申请</button>' +
      '    </div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    if (global.OpsShell) OpsShell.bindModalClose(document);

    document.getElementById('confirmDispatchTeam').addEventListener('click', function () {
      var team = document.getElementById('dispatchTeamSelect').value;
      var fbId = global.OpsDispatch._activeFeedbackId;
      OpsShell.closeModal('dispatchTeamModal');
      if (global.OpsFeedbackLoop && fbId) {
        OpsFeedbackLoop.createTaskFromFeedback(fbId, { team: team });
      }
      if (global.Proto) Proto.toast('已分派至 ' + team + '，专家任务已创建');
    });
    document.getElementById('confirmDispatchExpert').addEventListener('click', function () {
      var expert = document.getElementById('dispatchExpertSelect').value;
      var teamEl = document.getElementById('dispatchExpertTeam');
      var deadline = document.getElementById('dispatchExpertDeadline').value;
      var fbId = global.OpsDispatch._activeFeedbackId;
      OpsShell.closeModal('dispatchExpertModal');
      if (global.OpsFeedbackLoop && fbId) {
        OpsFeedbackLoop.createTaskFromFeedback(fbId, {
          team: teamEl ? teamEl.textContent : '模型团队',
          expert: expert,
          deadline: deadline
        });
      }
      if (global.Proto) Proto.toast('已指定专家：' + expert);
    });
    document.getElementById('confirmDeadline').addEventListener('click', function () {
      var v = document.getElementById('deadlineInput').value;
      if (!v) { if (global.Proto) Proto.toast('请选择截止时间'); return; }
      OpsShell.closeModal('deadlineModal');
      if (global.Proto) Proto.toast('截止时间已更新');
    });
    document.getElementById('confirmDelayRequest').addEventListener('click', function () {
      var v = document.getElementById('delayReasonInput').value.trim();
      if (!v) { if (global.Proto) Proto.toast('请填写延时原因'); return; }
      OpsShell.closeModal('delayRequestModal');
      if (global.Proto) Proto.toast('延时申请已提交');
    });
  }

  function openTeam(fb) {
    ensureModals();
    global.OpsDispatch._activeFeedbackId = fb && fb.id ? fb.id : null;
    if (fb && fb.status === 'processing') {
      var st = document.getElementById('dispatchTeamStatus');
      if (st) { st.textContent = '处理中'; st.className = 'tag tag-info'; }
    }
    OpsShell.openModal('dispatchTeamModal');
  }

  function openExpert(fb) {
    ensureModals();
    global.OpsDispatch._activeFeedbackId = fb && fb.id ? fb.id : null;
    if (fb && fb.team) {
      var teamEl = document.getElementById('dispatchExpertTeam');
      if (teamEl) teamEl.textContent = fb.team;
    }
    OpsShell.openModal('dispatchExpertModal');
  }

  function openDeadline() { ensureModals(); OpsShell.openModal('deadlineModal'); }
  function openMultiExpert() { ensureModals(); OpsShell.openModal('multiExpertModal'); }
  function openDelay() { ensureModals(); OpsShell.openModal('delayRequestModal'); }

  global.OpsDispatch = {
    ensureModals: ensureModals,
    openTeam: openTeam,
    openExpert: openExpert,
    openDeadline: openDeadline,
    openMultiExpert: openMultiExpert,
    openDelay: openDelay
  };
})(window);
