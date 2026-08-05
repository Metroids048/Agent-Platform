/**
 * 用户反馈 → 专家任务 → 回流工单 闭环
 * State: proto_ops_work_orders（ADR-008，独立于 proto.js）
 */
(function (global) {
  var WORK_ORDER_KEY = 'proto_ops_work_orders';

  var ROUTE_LABELS = {
    agent_dev: '智能体开发平台',
    knowledge: '知识中心',
    model_svc: '模型服务平台',
    resource: '资源服务中心',
    permission: '系统管理'
  };

  var TYPE_ROUTE = {
    '逻辑推理': 'agent_dev',
    '准确性': 'agent_dev',
    '功能': 'agent_dev',
    '体验': 'agent_dev',
    '数据': 'knowledge',
    '稳定性': 'resource',
    '性能': 'resource'
  };

  function loadOrders() {
    try {
      var raw = sessionStorage.getItem(WORK_ORDER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveOrders(list) {
    try { sessionStorage.setItem(WORK_ORDER_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function classifyFeedback(fb) {
    if (!fb) return 'agent_dev';
    return TYPE_ROUTE[fb.type] || 'agent_dev';
  }

  function routeLabel(target) {
    return ROUTE_LABELS[target] || ROUTE_LABELS.agent_dev;
  }

  function nextTaskId() {
    return 'task_' + Date.now().toString(36);
  }

  function nextOrderId() {
    return 'wo_' + Date.now().toString(36);
  }

  /** 从反馈分派创建专家任务 */
  function createTaskFromFeedback(fbId, opts) {
    opts = opts || {};
    if (!global.OpsUserFeedback || !global.OpsExpertWorkbench) return null;
    var fb = OpsUserFeedback.byId(fbId);
    if (!fb) return null;

    var team = opts.team || fb.team || '模型团队';
    var expert = opts.expert || '';
    var deadline = opts.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    var taskId = nextTaskId();

    var task = {
      id: taskId,
      title: '【反馈】' + (fb.title || fb.desc || '用户反馈'),
      status: expert ? 'in_progress' : 'open',
      pool: expert ? 'assigned' : 'public',
      urgent: fb.type === '性能' || fb.type === '稳定性',
      public: !expert,
      team: team,
      deadline: deadline,
      expert: expert,
      feedback_id: fbId,
      agent: fb.agent || '—',
      route_target: classifyFeedback(fb)
    };

    var tasks = OpsExpertWorkbench.loadTasks();
    tasks.unshift(task);
    OpsExpertWorkbench.saveTasks(tasks);

    var list = OpsUserFeedback.load().map(function (x) {
      if (x.id !== fbId) return x;
      return Object.assign({}, x, {
        status: 'processing',
        task_id: taskId,
        team: team,
        expert: expert || x.expert
      });
    });
    OpsUserFeedback.save(list);

    if (global.OpsMessageCenter && OpsMessageCenter.pushTodo) {
      OpsMessageCenter.pushTodo({
        title: expert ? '专家任务已分派：' + task.title : '团队任务已创建：' + task.title,
        role: expert ? 'expert' : 'team',
        link: expert
          ? { page: '12-expert-task-detail.html', params: { taskId: taskId } }
          : { page: '12-expert-workbench.html', params: {} }
      });
    }

    return task;
  }

  /** 专家完成任务 → 生成回流工单 */
  function createWorkOrderFromTask(taskId, summary) {
    if (!global.OpsExpertWorkbench) return null;
    var task = OpsExpertWorkbench.taskById(taskId);
    if (!task) return null;

    var target = task.route_target || 'agent_dev';
    var order = {
      id: nextOrderId(),
      task_id: taskId,
      feedback_id: task.feedback_id || '',
      title: '回流：' + (task.title || '专家任务'),
      route_target: target,
      route_label: routeLabel(target),
      status: 'open',
      summary: summary || '专家已完成分析，请相关平台跟进优化。',
      agent: task.agent,
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    var orders = loadOrders();
    orders.unshift(order);
    saveOrders(orders);

    if (task.feedback_id && global.OpsUserFeedback) {
      var fbs = OpsUserFeedback.load().map(function (x) {
        if (x.id !== task.feedback_id) return x;
        return Object.assign({}, x, { status: 'resolved', work_order_id: order.id });
      });
      OpsUserFeedback.save(fbs);
    }

    return order;
  }

  function getOrders(limit) {
    var list = loadOrders();
    if (limit) return list.slice(0, limit);
    return list;
  }

  function deepLinkForOrder(order) {
    if (!order) return '#';
    var map = {
      agent_dev: '06-dev-editor.html?id=agt_demo_001',
      knowledge: '#',
      model_svc: '#',
      resource: '14-resource-dashboard.html',
      permission: '13-permission-mgmt.html'
    };
    return map[order.route_target] || '14-business-dashboard.html';
  }

  global.OpsFeedbackLoop = {
    WORK_ORDER_KEY: WORK_ORDER_KEY,
    classifyFeedback: classifyFeedback,
    routeLabel: routeLabel,
    createTaskFromFeedback: createTaskFromFeedback,
    createWorkOrderFromTask: createWorkOrderFromTask,
    getOrders: getOrders,
    deepLinkForOrder: deepLinkForOrder,
    loadOrders: loadOrders,
    saveOrders: saveOrders
  };
})(window);
