/**
 * 用户端 mock 身份与组织上下文。
 * 真实 IAM/SSO 字段仍为待确认，原型只提供统一上下文入口。
 */
(function (global) {
  var STORAGE_KEY = 'proto_user_portal_context';

  var DEFAULT = {
    userId: 'user_zhang',
    userName: '张三',
    email: 'zhangsan@cnooc.com.cn',
    departmentIds: ['team_platform'],
    departmentName: '平台团队',
    orgId: 'org_haineng',
    orgName: '海能集团',
    roleLabel: '普通用户',
    avatarText: '张'
  };

  function read() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, DEFAULT, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT);
  }

  function write(ctx) {
    var next = Object.assign({}, DEFAULT, ctx || {});
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  global.UserPortalContext = {
    get: read,
    set: write,
    DEFAULT: DEFAULT
  };
})(window);
