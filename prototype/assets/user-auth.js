/**
 * Web 用户端演示认证壳：登录页隔离旧缓存，点击即可进入；忘记密码页可演示跳转。
 */
(function (global) {
  var AUTH_KEY = 'proto_user_auth';
  var REMEMBER_KEY = 'proto_user_auth_remember';

  var DEMO_PROFILE = {
    email: 'demo@cnooc.com.cn',
    userName: '演示用户',
    userId: 'user_demo',
    orgName: '海能集团',
    departmentName: '平台团队',
    roleLabel: '普通用户',
    avatarText: '演'
  };

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function writeJson(key, value, persistent) {
    try {
      var store = persistent ? localStorage : sessionStorage;
      store.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function removeJson(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function clearAuthCache() {
    removeJson(AUTH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }

  function isEnterpriseEmail(email) {
    var value = String(email || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function currentPath() {
    try {
      return global.location.pathname.split('/').pop() || 'index.html';
    } catch (e) {
      return 'index.html';
    }
  }

  function isPublicPage() {
    var page = currentPath();
    return page === 'login.html' || page === 'forgot-password.html';
  }

  function redirectToLogin() {
    if (isPublicPage()) return;
    var target = currentPath() + (global.location.search || '') + (global.location.hash || '');
    global.location.href = 'login.html?redirect=' + encodeURIComponent(target);
  }

  function syncPortalContext(session) {
    if (!global.UserPortalContext || !session) return;
    UserPortalContext.set({
      userId: session.userId,
      userName: session.userName,
      orgName: session.orgName,
      departmentName: session.departmentName,
      roleLabel: session.roleLabel,
      avatarText: session.avatarText,
      email: session.email
    });
    if (global.UserPersonalSpace && typeof UserPersonalSpace.updateProfileFromAuth === 'function') {
      UserPersonalSpace.updateProfileFromAuth(session);
    }
  }

  function readSession() {
    try {
      if (sessionStorage.getItem(AUTH_KEY)) return JSON.parse(sessionStorage.getItem(AUTH_KEY));
      if (localStorage.getItem(REMEMBER_KEY) === '1' && localStorage.getItem(AUTH_KEY)) {
        return JSON.parse(localStorage.getItem(AUTH_KEY));
      }
    } catch (e) {}
    return null;
  }

  function saveSession(session, remember) {
    try {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
      if (remember) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        localStorage.setItem(REMEMBER_KEY, '1');
      } else {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (e) {}
    syncPortalContext(session);
  }

  function buildSession(email) {
    var normalized = String(email || '').trim().toLowerCase();
    if (!normalized) normalized = DEMO_PROFILE.email;
    var avatarText = normalized.charAt(0).toUpperCase();
    return {
      email: normalized,
      userId: DEMO_PROFILE.userId,
      userName: normalized.split('@')[0] || DEMO_PROFILE.userName,
      orgName: DEMO_PROFILE.orgName,
      departmentName: DEMO_PROFILE.departmentName,
      roleLabel: DEMO_PROFILE.roleLabel,
      avatarText: avatarText || DEMO_PROFILE.avatarText,
      loggedInAt: Date.now()
    };
  }

  function login(email, password, remember) {
    void password;
    var session = buildSession(email);
    saveSession(session, remember);
    return { ok: true, session: session };
  }

  function logout() {
    clearAuthCache();
    global.location.href = 'login.html';
  }

  function changePassword(currentPassword, newPassword, confirmPassword) {
    void currentPassword;
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: '新密码至少 8 位' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: '两次输入的新密码不一致' };
    }
    return { ok: true };
  }

  function resetPassword(email, code, newPassword, confirmPassword) {
    void code;
    if (!isEnterpriseEmail(email)) return { ok: false, error: '邮箱格式不正确' };
    if (!newPassword || newPassword.length < 8) return { ok: false, error: '新密码至少 8 位' };
    if (newPassword !== confirmPassword) return { ok: false, error: '两次输入的新密码不一致' };
    return { ok: true };
  }

  function prepareLoginPage() {
    clearAuthCache();
  }

  function requireAuth() {
    if (isPublicPage()) {
      if (currentPath() === 'login.html') prepareLoginPage();
      return readSession();
    }
    if (!readSession()) {
      redirectToLogin();
      return null;
    }
    return readSession();
  }

  function mountUserBadge(el) {
    var session = readSession();
    if (!el || !session) return;
    el.textContent = session.email || session.userName;
  }

  global.UserAuth = {
    login: login,
    logout: logout,
    changePassword: changePassword,
    resetPassword: resetPassword,
    requireAuth: requireAuth,
    getSession: readSession,
    isEnterpriseEmail: isEnterpriseEmail,
    mountUserBadge: mountUserBadge,
    prepareLoginPage: prepareLoginPage,
    clearAuthCache: clearAuthCache
  };

  if (typeof document !== 'undefined' && document.currentScript) {
    if (currentPath() === 'login.html') {
      prepareLoginPage();
    } else if (!isPublicPage()) {
      requireAuth();
    }
  }
})(window);
