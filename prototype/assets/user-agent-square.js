/**
 * Web 用户端智能体广场：发现、筛选、收藏、最近使用、我的智能体。
 * 广场只消费用户可见智能体，不反写运营端状态。
 */
(function (global) {
  var FAVORITE_KEY = 'proto_user_agent_square_favorites';
  var RECENT_KEY = 'proto_user_agent_square_recent';
  var MAX_RECENT = 12;

  var state = {
    tab: 'recommend',
    category: '全部',
    query: '',
    items: [],
    favorites: [],
    recent: [],
    bannerIndex: 0
  };

  var CATEGORY_RULES = [
    { category: '安全生产', words: ['安全', 'JSA', 'QHSE', '风险', '整改', '井'] },
    { category: '报告文档', words: ['报告', '文档', '合同', '党建', '材料', '清单', '纪要'] },
    { category: '办公提效', words: ['报销', '值班', '楼宇', '日常', '采购', '请假', '交接'] },
    { category: '业务服务', words: ['客服', '产品', '协同', '医疗', '知识', '资料'] }
  ];

  var MOCK_BANNERS = [
    {
      title: '发现最适合你业务场景的智能体',
      desc: '推荐区优先展示高频业务、最近使用和运营精选，随运营配置持续更新。',
      group: 'recommend',
      label: '全部场景',
      category: '全部',
      bg: 'linear-gradient(135deg, rgba(10, 60, 166, 0.95), rgba(10, 98, 133, 0.92))'
    },
    {
      title: '报告与材料处理专区',
      desc: '聚合报告生成、材料整理、引用核对和表格清单类智能体，大幅提升文档类工作效率。',
      group: 'docs',
      label: '报告文档',
      category: '报告文档',
      bg: 'linear-gradient(135deg, rgba(8, 75, 120, 0.95), rgba(4, 108, 78, 0.90))'
    },
    {
      title: '安全生产与现场风险智能体',
      desc: '面向 QHSE、JSA、现场风险识别和整改建议的集合，支持海上和陆地作业场景。',
      group: 'safe',
      label: '安全生产',
      category: '安全生产',
      bg: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(70, 25, 5, 0.85))'
    }
  ];

  var bannerTimer = null;
  var bannerPaused = false;

  function readList(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function writeList(key, list) {
    try { sessionStorage.setItem(key, JSON.stringify(list || [])); } catch (e) {}
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function categoryFor(agent) {
    var hay = [agent.name, agent.intro, (agent.tags || []).join(' ')].join(' ');
    for (var i = 0; i < CATEGORY_RULES.length; i++) {
      if (CATEGORY_RULES[i].words.some(function (word) { return hay.indexOf(word) >= 0; })) {
        return CATEGORY_RULES[i].category;
      }
    }
    return '业务服务';
  }

  function tagsFor(agent) {
    var tags = [];
    if (agent.skillIds && agent.skillIds.length) tags.push('Skills');
    tags.push(agent.output || '对话');
    return tags.slice(0, 3);
  }

  function normalizeAgent(agent, idx) {
    if (!agent || !agent.id) return null;
    if (agent.status && agent.status !== 'listed' && agent.status !== 'draft') return null;
    var category = categoryFor(agent);
    var recent = state.recent.find(function (item) { return item.id === agent.id; });
    return {
      id: agent.id,
      name: agent.name || agent.id,
      intro: agent.intro || '智能体简介待补充。',
      category: category,
      tags: tagsFor(agent),
      shareMode: agent.shareMode || 'public',
      status: agent.status || 'listed',
      source: agent.source || 'user-visible',
      groupKey: agent.groupKey || 'enterprise',
      isRecommended: idx < 6 || category === '报告文档' || category === '安全生产',
      isFavorite: state.favorites.indexOf(agent.id) >= 0,
      lastUsedAt: recent ? recent.lastUsedAt : '',
      usageCount: recent ? recent.usageCount : 0,
      bannerGroup: category === '安全生产' ? 'safe' : (category === '报告文档' ? 'docs' : 'recommend')
    };
  }

  function flattenGrouped(grouped) {
    return []
      .concat(grouped.personal || [])
      .concat(grouped.org || [])
      .concat(grouped.enterprise || []);
  }

  function loadItems() {
    var ctx = global.UserPortalContext ? UserPortalContext.get() : {};
    var grouped = global.UserAgentResolver ? UserAgentResolver.resolve(ctx) : { personal: [], org: [], enterprise: [] };
    var raw = flattenGrouped(grouped);
    var seen = {};
    state.items = raw.map(normalizeAgent).filter(function (item) {
      if (!item || seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    });
  }

  function categories() {
    var map = { '全部': true };
    state.items.forEach(function (item) { map[item.category] = true; });
    return Object.keys(map);
  }

  function minePredicate(item) {
    return item.isFavorite || item.lastUsedAt || item.groupKey === 'personal' || item.groupKey === 'org';
  }

  function baseListForTab() {
    if (state.tab === 'recommend') {
      var rec = state.items.filter(function (item) { return item.isRecommended; });
      var recent = state.items.filter(function (item) { return item.lastUsedAt; }).sort(function (a, b) {
        return String(b.lastUsedAt).localeCompare(String(a.lastUsedAt));
      });
      var merged = rec.concat(recent);
      var seen = {};
      return merged.filter(function (item) {
        if (seen[item.id]) return false;
        seen[item.id] = true;
        return true;
      });
    }
    if (state.tab === 'mine') return state.items.filter(minePredicate);
    return state.items.slice();
  }

  function visibleItems() {
    var query = state.query.toLowerCase();
    return baseListForTab().filter(function (item) {
      if (state.category !== '全部' && item.category !== state.category) return false;
      if (!query) return true;
      var hay = [item.name, item.intro, item.category, item.tags.join(' ')].join(' ').toLowerCase();
      return hay.indexOf(query) >= 0;
    });
  }

  function useHref(item) {
    return 'index.html?id=' + encodeURIComponent(item.id);
  }

  /* ---- Banner carousel ---- */

  function goToBanner(index, restartAutoplay) {
    state.bannerIndex = ((index % MOCK_BANNERS.length) + MOCK_BANNERS.length) % MOCK_BANNERS.length;
    var el = document.getElementById('squareBanner');
    if (el) el.classList.add('is-fading');
    setTimeout(function () {
      renderBanner();
      renderBannerDots();
      var el2 = document.getElementById('squareBanner');
      if (el2) el2.classList.remove('is-fading');
      if (restartAutoplay !== false) startBannerAutoPlay();
    }, 160);
  }

  function renderBanner() {
    var el = document.getElementById('squareBanner');
    if (!el) return;
    var banner = MOCK_BANNERS[state.bannerIndex] || MOCK_BANNERS[0];
    el.style.background = banner.bg + ', #003da6';
    el.setAttribute('data-banner-category', banner.category || '全部');
    el.innerHTML =
      '<div class="aioq-square-banner-copy">' +
        '<span class="aioq-banner-label">' + escapeHtml(banner.label) + '</span>' +
        '<h2>' + escapeHtml(banner.title) + '</h2>' +
        '<p>' + escapeHtml(banner.desc) + '</p>' +
        '<button type="button" class="aioq-square-banner-action" data-banner-explore="' + escapeHtml(banner.category || '全部') + '">浏览该分类 →</button>' +
      '</div>' +
      '<div class="aioq-square-banner-visual" aria-hidden="true">' +
        '<div class="aioq-square-banner-orb aioq-square-banner-orb--a"></div>' +
        '<div class="aioq-square-banner-orb aioq-square-banner-orb--b"></div>' +
      '</div>';
  }

  function pauseBannerAutoPlay() {
    bannerPaused = true;
    if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
  }

  function resumeBannerAutoPlay() {
    bannerPaused = false;
    startBannerAutoPlay();
  }

  function renderBannerDots() {
    var el = document.getElementById('squareBannerDots');
    if (!el) return;
    el.innerHTML = MOCK_BANNERS.map(function (banner, idx) {
      return '<button type="button" class="aioq-square-banner-dot' + (idx === state.bannerIndex ? ' active' : '') +
        '" data-banner-dot="' + idx + '" aria-label="轮播第' + (idx + 1) + '张 ' + escapeHtml(banner.label) + '"></button>';
    }).join('');
  }

  function startBannerAutoPlay() {
    if (bannerTimer) clearInterval(bannerTimer);
    if (bannerPaused) return;
    bannerTimer = setInterval(function () {
      goToBanner(state.bannerIndex + 1, false);
    }, 4000);
  }

  /* ---- Tabs + categories ---- */

  function renderTabs() {
    document.querySelectorAll('[data-square-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-square-tab') === state.tab);
    });
  }

  function renderCategories() {
    var el = document.getElementById('squareCategoryFilters');
    if (!el) return;
    el.innerHTML = categories().map(function (cat) {
      return '<button type="button" class="' + (cat === state.category ? 'active' : '') + '" data-square-category="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
    }).join('');
  }

  function renderIntro(list) {
    var el = document.getElementById('squareSectionIntro');
    if (!el) return;
    var title = state.tab === 'mine' ? '我的智能体' : '全部智能体';
    var desc = state.tab === 'mine'
      ? '包含收藏、我创建的和组织授权给我的智能体。'
      : '当前仅展示已开放且当前账号可用的智能体。';
    el.innerHTML = '<div><h2>' + title + '</h2><p>' + desc + '</p></div>';
  }

  /* ---- Card ---- */

  function cardHtml(item, variant) {
    var favLabel = item.isFavorite ? '取消收藏' : '收藏';
    var recentMeta = item.lastUsedAt ? '<span class="aioq-square-card-meta">最近使用</span>' : '';
    var actionText = '使用';
    var extraClass = variant === 'featured' ? ' aioq-square-card--featured' : variant === 'row' ? ' aioq-square-card--row' : variant === 'compact' ? ' aioq-square-card--compact' : '';
    if (variant === 'compact') {
      return '<article class="aioq-square-card aioq-square-card--compact" data-square-agent-card="' + escapeHtml(item.id) + '">' +
        '<div class="aioq-square-avatar" aria-hidden="true">' + escapeHtml(item.name.slice(0, 1)) + '</div>' +
        '<div class="aioq-square-card-body">' +
          '<div class="aioq-square-card-topline">' +
            '<h3>' + escapeHtml(item.name) + '</h3>' +
            '<button type="button" class="aioq-square-fav ' + (item.isFavorite ? 'active' : '') + '" data-favorite-agent="' + escapeHtml(item.id) + '" title="' + favLabel + '" aria-label="' + favLabel + '">' +
              '<svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M10 16.5s-5.8-3.4-5.8-7.7C4.2 6.7 5.9 5 8 5c1.2 0 2 .6 2 .6s.8-.6 2-.6c2.1 0 3.8 1.7 3.8 3.8 0 4.3-5.8 7.7-5.8 7.7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
            '</button>' +
          '</div>' +
          '<p>' + escapeHtml(item.intro) + '</p>' +
          '<div class="aioq-square-card-foot">' +
            '<a class="aioq-square-use aioq-square-use--inline" href="' + useHref(item) + '" data-use-agent="' + escapeHtml(item.id) + '">' + actionText + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }
    return '<article class="aioq-square-card' + extraClass + '" data-square-agent-card="' + escapeHtml(item.id) + '">' +
      '<div class="aioq-square-card-head">' +
        '<div class="aioq-square-avatar" aria-hidden="true">' + escapeHtml(item.name.slice(0, 1)) + '</div>' +
        '<button type="button" class="aioq-square-fav ' + (item.isFavorite ? 'active' : '') + '" data-favorite-agent="' + escapeHtml(item.id) + '" title="' + favLabel + '" aria-label="' + favLabel + '">' +
          '<svg viewBox="0 0 20 20" width="18" height="18" fill="none"><path d="M10 16.5s-5.8-3.4-5.8-7.7C4.2 6.7 5.9 5 8 5c1.2 0 2 .6 2 .6s.8-.6 2-.6c2.1 0 3.8 1.7 3.8 3.8 0 4.3-5.8 7.7-5.8 7.7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<h3>' + escapeHtml(item.name) + '</h3>' +
      '<p>' + escapeHtml(item.intro) + '</p>' +
      '<div class="aioq-square-tags"><span>' + escapeHtml(item.category) + '</span>' +
        item.tags.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') +
      '</div>' +
      '<div class="aioq-square-card-foot">' + recentMeta +
        '<a class="aioq-square-use aioq-square-use--inline" href="' + useHref(item) + '" data-use-agent="' + escapeHtml(item.id) + '">' + actionText + '</a>' +
      '</div>' +
    '</article>';
  }

  /* ---- Grid (全部 tab) ---- */

  function renderGrid() {
    var list = visibleItems();
    var grid = document.getElementById('squareAgentGrid');
    var empty = document.getElementById('squareEmpty');
    renderIntro(list);
    if (!grid) return;
    grid.innerHTML = list.map(function (item) { return cardHtml(item); }).join('');
    if (empty) empty.classList.toggle('hidden', list.length > 0);
  }

  /* ---- Editorial (推荐 tab) ---- */

  function renderEditorial() {
    var el = document.getElementById('squareEditorial');
    if (!el) return;
    var html = '';

    var featured = state.items.filter(function (item) { return item.isRecommended; }).slice(0, 6);
    if (featured.length) {
      html += '<div class="aioq-square-cat-section">' +
        '<div class="aioq-square-cat-head"><h3>精选推荐</h3></div>' +
        '<div class="aioq-square-grid aioq-square-grid--featured">' +
          featured.map(function (item) { return cardHtml(item, 'featured'); }).join('') +
        '</div>' +
      '</div>';
    }

    var catMap = {};
    state.items.forEach(function (item) {
      if (!catMap[item.category]) catMap[item.category] = [];
      catMap[item.category].push(item);
    });
    Object.keys(catMap).forEach(function (cat) {
      var items = catMap[cat].slice(0, 5);
      html += '<div class="aioq-square-cat-section">' +
        '<div class="aioq-square-cat-head">' +
          '<h3>' + escapeHtml(cat) + '</h3>' +
          '<a href="#" data-square-tab-all="' + escapeHtml(cat) + '">查看全部</a>' +
        '</div>' +
        '<div class="aioq-square-row">' +
          items.map(function (item) { return cardHtml(item, 'row'); }).join('') +
        '</div>' +
      '</div>';
    });

    el.innerHTML = html || '<p style="color:#8a9ab0;padding:24px 0">暂无推荐智能体</p>';
  }

  /* ---- Mine tab sections ---- */

  function renderMineTab() {
    var grid = document.getElementById('squareAgentGrid');
    var empty = document.getElementById('squareEmpty');
    if (!grid) return;

    var mineItems = state.items.filter(minePredicate);

    if (!mineItems.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    var html = '';

    var favItems = mineItems.filter(function (item) { return item.isFavorite; });
    if (favItems.length) {
      html += '<div class="aioq-square-mine-section">' +
        '<div class="aioq-square-mine-section-head"><h3>收藏的智能体</h3></div>' +
        '<div class="aioq-square-mine-grid">' + favItems.map(function (item) { return cardHtml(item, 'compact'); }).join('') + '</div>' +
      '</div>';
    }

    var personalItems = mineItems.filter(function (item) { return item.groupKey === 'personal'; });
    if (personalItems.length) {
      html += '<div class="aioq-square-mine-section">' +
        '<div class="aioq-square-mine-section-head"><h3>我创建的</h3></div>' +
        '<div class="aioq-square-mine-grid">' + personalItems.map(function (item) { return cardHtml(item, 'compact'); }).join('') + '</div>' +
      '</div>';
    }

    var orgItems = mineItems.filter(function (item) { return item.groupKey === 'org'; });
    if (orgItems.length) {
      html += '<div class="aioq-square-mine-section">' +
        '<div class="aioq-square-mine-section-head"><h3>授权给我的</h3></div>' +
        '<div class="aioq-square-mine-grid">' + orgItems.map(function (item) { return cardHtml(item, 'compact'); }).join('') + '</div>' +
      '</div>';
    }

    grid.innerHTML = html;
  }

  /* ---- Routing ---- */

  function renderAll() {
    loadItems();
    renderBanner();
    renderBannerDots();
    renderTabs();

    var squareEditorial = document.getElementById('squareEditorial');
    var squareCatFilters = document.getElementById('squareCategoryFilters');
    var squareSectionIntro = document.getElementById('squareSectionIntro');
    var squareAgentGrid = document.getElementById('squareAgentGrid');
    var bannerWrap = document.querySelector('.aioq-square-banner-wrap');

    if (state.tab === 'recommend') {
      if (bannerWrap) bannerWrap.style.display = '';
      if (squareEditorial) squareEditorial.style.display = '';
      if (squareCatFilters) squareCatFilters.style.display = 'none';
      if (squareSectionIntro) squareSectionIntro.style.display = 'none';
      if (squareAgentGrid) {
        squareAgentGrid.style.display = 'none';
        squareAgentGrid.classList.remove('aioq-square-grid--mine');
      }
      renderEditorial();
    } else if (state.tab === 'mine') {
      if (bannerWrap) bannerWrap.style.display = 'none';
      if (squareEditorial) squareEditorial.style.display = 'none';
      if (squareCatFilters) squareCatFilters.style.display = 'none';
      if (squareSectionIntro) squareSectionIntro.style.display = '';
      if (squareAgentGrid) {
        squareAgentGrid.style.display = '';
        squareAgentGrid.classList.remove('aioq-square-grid');
        squareAgentGrid.classList.add('aioq-square-grid--mine');
      }
      renderIntro(state.items.filter(minePredicate));
      renderMineTab();
    } else {
      if (bannerWrap) bannerWrap.style.display = '';
      if (squareEditorial) squareEditorial.style.display = 'none';
      if (squareCatFilters) squareCatFilters.style.display = '';
      if (squareSectionIntro) squareSectionIntro.style.display = '';
      if (squareAgentGrid) {
        squareAgentGrid.style.display = '';
        squareAgentGrid.classList.remove('aioq-square-grid--mine');
        squareAgentGrid.classList.add('aioq-square-grid');
      }
      renderCategories();
      renderGrid();
    }
  }

  /* ---- Favorites / recent ---- */

  function toggleFavorite(id) {
    if (state.favorites.indexOf(id) >= 0) {
      state.favorites = state.favorites.filter(function (x) { return x !== id; });
    } else {
      state.favorites = [id].concat(state.favorites);
    }
    writeList(FAVORITE_KEY, state.favorites);
    renderAll();
    if (global.UserPortalBridge && UserPortalBridge.renderSidebarAgents) {
      UserPortalBridge.renderSidebarAgents();
    }
  }

  function recordRecent(id) {
    var item = state.items.find(function (x) { return x.id === id; });
    if (!item) return;
    var existing = state.recent.find(function (x) { return x.id === id; });
    var next = {
      id: id,
      name: item.name,
      lastUsedAt: new Date().toISOString(),
      usageCount: existing ? existing.usageCount + 1 : 1
    };
    state.recent = [next].concat(state.recent.filter(function (x) { return x.id !== id; })).slice(0, MAX_RECENT);
    writeList(RECENT_KEY, state.recent);
    if (global.UserPortalBridge && UserPortalBridge.renderSidebarAgents) {
      UserPortalBridge.renderSidebarAgents();
    }
  }

  /* ---- Events ---- */

  function bindEvents() {
    var root = document.getElementById('agentSquareRoot');
    var collapse = document.getElementById('btnCollapseSidebar');
    if (collapse && root) collapse.addEventListener('click', function () { root.classList.toggle('is-sidebar-collapsed'); });

    var search = document.getElementById('squareSearch');
    if (search) search.addEventListener('input', function () {
      state.query = search.value.trim();
      if (state.query && state.tab === 'recommend') state.tab = 'all';
      renderAll();
    });

    document.addEventListener('click', function (event) {
      var explore = event.target.closest('[data-banner-explore]');
      if (explore) {
        state.tab = 'all';
        state.category = explore.getAttribute('data-banner-explore') || '全部';
        renderAll();
        return;
      }

      var dot = event.target.closest('[data-banner-dot]');
      if (dot) {
        var idx = parseInt(dot.getAttribute('data-banner-dot'), 10);
        if (!isNaN(idx)) {
          pauseBannerAutoPlay();
          goToBanner(idx);
        }
        return;
      }

      var tabAll = event.target.closest('[data-square-tab-all]');
      if (tabAll) {
        event.preventDefault();
        state.tab = 'all';
        state.category = tabAll.getAttribute('data-square-tab-all') || '全部';
        renderAll();
        return;
      }

      var tab = event.target.closest('[data-square-tab]');
      if (tab) {
        state.tab = tab.getAttribute('data-square-tab') || 'recommend';
        state.category = '全部';
        renderAll();
        return;
      }

      var cat = event.target.closest('[data-square-category]');
      if (cat) {
        state.category = cat.getAttribute('data-square-category') || '全部';
        renderAll();
        return;
      }

      var fav = event.target.closest('[data-favorite-agent]');
      if (fav) {
        event.preventDefault();
        toggleFavorite(fav.getAttribute('data-favorite-agent'));
        return;
      }

      var use = event.target.closest('[data-use-agent]');
      if (use) recordRecent(use.getAttribute('data-use-agent'));

      if (event.target.closest('#btnHelp')) {
        var helpModal = document.getElementById('helpModal');
        if (helpModal) helpModal.classList.remove('hidden');
        else if (global.Proto && Proto.toast) Proto.toast('帮助文档为原型占位。');
      }
    });

    var prev = document.getElementById('squareBannerPrev');
    var next = document.getElementById('squareBannerNext');
    var wrap = document.getElementById('squareBannerWrap');
    if (prev) prev.addEventListener('click', function () { pauseBannerAutoPlay(); goToBanner(state.bannerIndex - 1); });
    if (next) next.addEventListener('click', function () { pauseBannerAutoPlay(); goToBanner(state.bannerIndex + 1); });
    if (wrap) {
      wrap.addEventListener('mouseenter', pauseBannerAutoPlay);
      wrap.addEventListener('mouseleave', resumeBannerAutoPlay);
    }
    document.addEventListener('keydown', function (event) {
      if (!document.getElementById('agentSquareRoot')) return;
      if (event.key === 'ArrowLeft') { pauseBannerAutoPlay(); goToBanner(state.bannerIndex - 1); }
      if (event.key === 'ArrowRight') { pauseBannerAutoPlay(); goToBanner(state.bannerIndex + 1); }
    });

    if (global.UserMessageCenter && UserMessageCenter.mount) UserMessageCenter.mount();
  }

  function init() {
    state.favorites = readList(FAVORITE_KEY);
    state.recent = readList(RECENT_KEY);
    renderAll();
    bindEvents();
    startBannerAutoPlay();
  }

  global.UserAgentSquare = {
    init: init,
    getItems: function () { return state.items.slice(); },
    visibleItems: visibleItems,
    recordRecent: recordRecent,
    toggleFavorite: toggleFavorite
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
