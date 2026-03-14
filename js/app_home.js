/**
 * Version 1.3 | 14 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * app_home.js — Router + State + Sidebar + Layout Helpers + Utilities
 * v1.3: D1 sortData/sortTh utilities, D2 module visibility, D3 hard refresh
 * ═══════════════════════════════════════════
 *
 * Route Map:
 *   #login              → S1 Login
 *   #register           → S7 Register
 *   #staff-select       → S3 Staff Selection
 *   #new-staff          → S4 New Staff
 *   #dashboard          → S5 Dashboard
 *   #profile            → S6 Profile
 *   #admin/{tab}        → S9 Admin (accounts|permissions|tieraccess|requests)
 *   #master/{tab}       → S9 Master (modules|stores|depts)
 *   #account-detail/ID  → S10 Account Detail
 *   #acct-create        → S10b Create Account
 *   #audit              → S12 Audit Trail
 */

const App = (() => {
  // ═══ STATE (memory-only, except token/session in localStorage) ═══
  const S = {
    session: null,       // from init_bundle
    modules: null,       // from init_bundle
    _bundleLoaded: false,
    _bundleLoading: false,
    profile: null,
    _profileLoaded: false,
    stores: null,        // B1: cache stores (shared across Register + Create Account)
    depts: null,         // B1: cache depts
    _storesLoaded: false,
    _deptsLoaded: false,
    sidebarCollapsed: false,
  };

  const appEl = () => document.getElementById('app');
  let currentRoute = '';
  let currentParams = {};

  // ─── ROUTES ───
  const ROUTES = {
    'login':          { render: () => Screens.renderLogin(),            onLoad: null },
    'register':       { render: () => Screens.renderRegister(),         onLoad: () => Screens.loadRegisterDropdowns() },
    'staff-select':   { render: () => Screens.renderStaffSelect(),      onLoad: () => Screens.loadStaffList() },
    'new-staff':      { render: () => Screens.renderNewStaff(),         onLoad: null },
    'dashboard':      { render: () => Screens.renderDashboard(),        onLoad: () => loadBundle() },
    'profile':        { render: () => Screens.renderProfile(),          onLoad: () => Screens.loadProfile() },
    'admin':          { render: (p) => Screens.renderAdmin(p),          onLoad: null },
    'master':         { render: (p) => Screens.renderMaster(p),         onLoad: null },
    'account-detail': { render: (p) => Screens.renderAccountDetail(p),  onLoad: null },
    'acct-create':    { render: () => Screens.renderAcctCreate(),       onLoad: null },
    'audit':          { render: () => Screens.renderAudit(),            onLoad: null },
  };

  // ─── HASH PARSER ───
  function parseHash(hash) {
    const clean = (hash || '').replace(/^#/, '');
    if (!clean) return { route: '', params: {} };
    const parts = clean.split('/');
    const route = parts[0];
    const sub = parts.slice(1).join('/');
    const params = {};
    if (route === 'admin' && sub) params.tab = sub;
    if (route === 'master' && sub) params.tab = sub;
    if (route === 'account-detail' && sub) params.account_id = sub;
    return { route, params };
  }

  function buildHash(route, params = {}) {
    if (route === 'admin') return `#admin/${params.tab || 'accounts'}`;
    if (route === 'master') return `#master/${params.tab || 'modules'}`;
    if (route === 'account-detail' && params.account_id) return `#account-detail/${params.account_id}`;
    return `#${route}`;
  }

  // ─── NAVIGATE ───
  function go(route, params = {}) {
    const def = ROUTES[route];
    if (!def) return go('login');

    // Auth guard
    const pub = ['login', 'register'];
    if (!pub.includes(route)) {
      const session = API.getSession();
      if (route === 'staff-select' || route === 'new-staff') {
        if (!API.getAccountTemp()) return go('login');
      } else if (!session) {
        return go('login');
      }
    }

    currentRoute = route;
    currentParams = params;

    // Render
    appEl().innerHTML = def.render(params);

    // Build sidebar for authenticated pages (has <nav class="sidebar"> in DOM)
    const sidebarEl = appEl().querySelector('.sidebar');
    if (sidebarEl) {
      buildSidebar(); // setupFlyout() called inside
    }

    // Post-render data loading
    if (def.onLoad) setTimeout(() => def.onLoad(params), 30);

    // Scroll reset
    window.scrollTo(0, 0);
    const ct = appEl().querySelector('.content');
    if (ct) ct.scrollTop = 0;

    // URL hash
    history.replaceState({ route, params }, '', buildHash(route, params));
  }

  function updateHash(route, params = {}) {
    currentParams = { ...currentParams, ...params };
    history.replaceState({ route: route || currentRoute, params: currentParams }, '', buildHash(route || currentRoute, currentParams));
  }

  // ─── INIT BUNDLE (1 API call → session + modules) ───
  async function loadBundle() {
    if (S._bundleLoaded) {
      // Data in memory → fill UI immediately
      Screens.fillDashboard(S.session, S.modules);
      return;
    }
    if (S._bundleLoading) return;
    S._bundleLoading = true;
    try {
      const data = await API.initBundle();
      S.session = data.session;
      S.modules = data.modules;
      S._bundleLoaded = true;
      Screens.fillDashboard(S.session, S.modules);
      buildSidebar(); // rebuild with real module data
    } catch (e) {
      toast(e.message || 'โหลดข้อมูลไม่สำเร็จ', 'error');
    } finally {
      S._bundleLoading = false;
    }
  }

  // ═══ TOAST ═══
  let _toastTimer = null;
  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(_toastTimer);
    el.textContent = msg;
    el.className = `toast ${type}`;
    requestAnimationFrame(() => el.classList.add('show'));
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ═══ LOADER ═══
  function showLoader() { document.getElementById('loader')?.classList.remove('hidden'); }
  function hideLoader() { document.getElementById('loader')?.classList.add('hidden'); }

  // ═══ DIALOG (replaces confirm/prompt) ═══
  function showDialog(html) {
    const root = document.getElementById('dialog-root');
    root.innerHTML = `<div class="popup-overlay show" onclick="if(event.target===this)App.closeDialog()">${html}</div>`;
  }
  function closeDialog() {
    document.getElementById('dialog-root').innerHTML = '';
  }

  // ═══ PROFILE POPUP (from topbar avatar) ═══
  function showProfilePopup() {
    const s = API.getSession();
    if (!s) return;
    const initial = (s.display_name || s.display_label || '?').charAt(0).toUpperCase();
    showDialog(`<div class="popup-sheet" style="width:300px">
      <div class="popup-header"><div class="popup-title">Profile</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div class="topbar-avatar" style="width:40px;height:40px;font-size:16px">${esc(initial)}</div>
        <div><div style="font-size:14px;font-weight:700">${esc(s.display_name || s.display_label)}</div>
        <div style="font-size:11px;color:var(--t3)">${esc(s.tier_id)} · ${esc(s.store_id || 'HQ')}</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-primary btn-full" onclick="App.closeDialog();App.go('profile')">View Full Profile</button>
        <button class="btn btn-outline btn-full" style="color:var(--red);border-color:var(--red)" onclick="App.closeDialog();Screens.doLogout()">Log out</button>
      </div>
    </div>`);
  }

  // ═══ ESCAPE HTML ═══
  function esc(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  // ═══ SHARED LAYOUT HELPERS (A1: single source for all screens) ═══
  function topbar() {
    const s = API.getSession();
    const name = s ? (s.display_name || s.display_label || '') : '';
    const initial = (name || '?').charAt(0).toUpperCase();
    return `<div class="topbar">
      <div class="hamburger" onclick="App.openSidebar()">☰</div>
      <div class="topbar-logo" onclick="App.go('dashboard')">SPG Home</div>
      <div class="topbar-right">
        <div class="topbar-icon" onclick="App.hardRefresh()" title="Refresh">↻</div>
        <div class="topbar-user" onclick="App.showProfilePopup()" style="cursor:pointer">
          <div class="topbar-avatar">${esc(initial)}</div>
          <span class="hide-m">${esc(name)}</span>
        </div>
      </div>
    </div>`;
  }

  // ═══ D3: HARD REFRESH ═══
  function hardRefresh() {
    S.session = null; S.modules = null; S.profile = null;
    S._bundleLoaded = false; S._profileLoaded = false;
    S.stores = null; S.depts = null;
    S._storesLoaded = false; S._deptsLoaded = false;
    location.reload();
  }

  function shell(inner) {
    return `<div class="shell fade-in">
      ${topbar()}
      <div class="shell-body">
        <nav class="sidebar"></nav>
        <div class="shell-main">${inner}</div>
      </div>
    </div>`;
  }

  function toolbar(title, actions) {
    return `<div class="toolbar"><div class="toolbar-title">${esc(title)}</div>${actions || ''}</div>`;
  }

  // ═══ FORM ERROR HELPERS (A2: single source for all screens) ═══
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
  }
  function hideError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
  }

  // ═══ D1: SORT UTILITY (shared across all tables) ═══
  let _sortState = {}; // { tableId: { key, dir } }

  function sortData(arr, key, dir = 'asc') {
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function sortTh(tableId, key, label, extra = '') {
    const st = _sortState[tableId];
    const isActive = st && st.key === key;
    const arrow = isActive ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th${extra} style="cursor:pointer;user-select:none" onclick="App.toggleSort('${tableId}','${key}')">${esc(label)}${arrow}</th>`;
  }

  function toggleSort(tableId, key) {
    const st = _sortState[tableId];
    if (st && st.key === key) {
      st.dir = st.dir === 'asc' ? 'desc' : 'asc';
    } else {
      _sortState[tableId] = { key, dir: 'asc' };
    }
    // Emit custom event — each table listens for its own re-render
    document.dispatchEvent(new CustomEvent('spg-sort', { detail: { tableId } }));
  }

  function getSortState(tableId) { return _sortState[tableId] || null; }

  // ═══ STORES/DEPTS CACHE (B1: fetch once, reuse everywhere) ═══
  async function getStoresCache() {
    if (S._storesLoaded && S.stores) return S.stores;
    const data = await API.getStores();
    S.stores = data.stores || [];
    S._storesLoaded = true;
    return S.stores;
  }
  async function getDeptsCache() {
    if (S._deptsLoaded && S.depts) return S.depts;
    const data = await API.getDepartments();
    S.depts = data.departments || [];
    S._deptsLoaded = true;
    return S.depts;
  }
  function clearStoresCache() { S.stores = null; S._storesLoaded = false; }
  function clearDeptsCache() { S.depts = null; S._deptsLoaded = false; }

  // ═══ SIDEBAR — Desktop (fixed, flyout) ═══
  let _sidebarBuilt = false;

  function buildSidebar() {
    const s = API.getSession();
    if (!s) return;
    const tierLevel = parseInt((s.tier_id || 'T9').replace('T', ''));
    const isAdmin = tierLevel <= 2;
    const cl = S.sidebarCollapsed ? ' collapsed' : '';

    // Desktop sidebar
    const sd = document.querySelector('.sidebar');
    if (!sd) return;

    let html = `<div class="sidebar-top"><div class="sidebar-toggle" onclick="App.toggleSidebar()">☰</div></div>`;
    html += sdItem('dashboard', '◇', 'Dashboard');
    html += '<div style="height:20px"></div>';

    // Profile (person icon, above Modules, no space between)
    const personIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>';
    html += sdItem('profile', personIcon, 'Profile');

    // Modules group — D2: hide no_access, show coming_soon dimmed
    let modItems = '';
    if (S.modules) {
      S.modules.forEach(m => {
        if (!m.is_accessible) return; // D2: hide completely
        if (m.status === 'active') {
          modItems += `<div class="sd-flyout-item" onclick="Screens.launchModule('${esc(m.app_url)}')">${esc(m.module_name)}</div>`;
        } else {
          modItems += `<div class="sd-flyout-item" style="opacity:.4">${esc(m.module_name)} <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--orange-bg);color:var(--orange);margin-left:4px">Soon</span></div>`;
        }
      });
    } else {
      modItems = '<div class="sd-flyout-item" style="color:var(--t4)">Loading...</div>';
    }
    html += sdGroup('modules', '⊞', 'Modules', modItems);
    html += '<div style="height:12px"></div>';

    // Admin group (T1-T2)
    if (isAdmin) {
      html += sdGroup('admin', '⚙', 'Admin',
        sdFlyItem('admin', 'accounts', 'Accounts') +
        sdFlyItem('admin', 'permissions', 'Permissions') +
        sdFlyItem('admin', 'tieraccess', 'Tier Access') +
        sdFlyItem('admin', 'requests', 'Requests')
      );
      html += sdGroup('master', '▤', 'Master Data',
        sdFlyItem('master', 'modules', 'Modules') +
        sdFlyItem('master', 'stores', 'Stores') +
        sdFlyItem('master', 'depts', 'Departments')
      );
      html += sdGroup('reports', '☰', 'Reports',
        `<div class="sd-flyout-item" onclick="App.go('audit')">Audit Trail</div>`
      );
    }

    // Footer
    html += `<div class="sd-footer">
      <div class="sd-version">v1.0 | 13 Mar 2026</div>
      <a href="#" onclick="App.go('dashboard');return false"><span style="font-size:12px">←</span><span class="sd-item-text"> Back to Home</span></a>
      <a href="#" class="danger" onclick="Screens.doLogout();return false"><span style="font-size:12px">→</span><span class="sd-item-text"> Log out</span></a>
    </div>`;

    sd.innerHTML = html;
    sd.className = 'sidebar' + cl;
    _sidebarBuilt = true;

    // Also build mobile sidebar
    buildMobileSidebar(s, tierLevel, isAdmin);

    // Rebind flyout listeners every rebuild
    setupFlyout();
  }

  function sdItem(route, icon, label) {
    const active = currentRoute === route ? ' active' : '';
    return `<div class="sd-item${active}" onclick="App.go('${route}')"><span class="sd-item-icon">${icon}</span><span class="sd-item-text">${label}</span></div>`;
  }

  function sdGroup(id, icon, label, items) {
    const routes = id === 'admin' ? ['admin'] : id === 'master' ? ['master'] : id === 'reports' ? ['audit'] : [];
    const active = routes.includes(currentRoute) ? ' active' : '';
    return `<div class="sd-group" data-group="${id}">
      <div class="sd-group-head${active}"><span class="sd-item-icon">${icon}</span><span class="sd-item-text">${label}</span><span class="sd-group-arr">›</span></div>
      <div class="sd-flyout">${items}</div>
    </div>`;
  }

  function sdFlyItem(route, tab, label) {
    const active = currentRoute === route && currentParams.tab === tab ? ' active' : '';
    return `<div class="sd-flyout-item${active}" onclick="App.go('${route}',{tab:'${tab}'})">${label}</div>`;
  }

  // ─── FLYOUT: hover + click support ───
  function setupFlyout() {
    document.querySelectorAll('.sd-group').forEach(sg => {
      const head = sg.querySelector('.sd-group-head');
      const sub = sg.querySelector('.sd-flyout');
      if (!head || !sub) return;
      let timer = null;

      function openFlyout() {
        clearTimeout(timer);
        document.querySelectorAll('.sd-flyout.show').forEach(f => { if (f !== sub) f.classList.remove('show'); });
        const rect = head.getBoundingClientRect();
        sub.style.top = rect.top + 'px';
        sub.style.left = rect.right + 'px';
        sub.classList.add('show');
      }
      function closeFlyout() { timer = setTimeout(() => sub.classList.remove('show'), 150); }

      // Hover (desktop mouse)
      sg.addEventListener('mouseenter', openFlyout);
      sg.addEventListener('mouseleave', closeFlyout);
      sub.addEventListener('mouseenter', () => clearTimeout(timer));
      sub.addEventListener('mouseleave', closeFlyout);

      // Click (trackpad / touch / click)
      head.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sub.classList.contains('show')) { sub.classList.remove('show'); }
        else { openFlyout(); }
      });
    });

    // Close all flyouts when clicking outside (add once)
    if (!setupFlyout._bound) {
      document.addEventListener('click', () => {
        document.querySelectorAll('.sd-flyout.show').forEach(f => f.classList.remove('show'));
      });
      setupFlyout._bound = true;
    }
  }

  function toggleSidebar() {
    S.sidebarCollapsed = !S.sidebarCollapsed;
    const sd = document.querySelector('.sidebar');
    if (sd) sd.classList.toggle('collapsed', S.sidebarCollapsed);
  }

  // ─── MOBILE SIDEBAR ───
  function buildMobileSidebar(s, tierLevel, isAdmin) {
    const panel = document.getElementById('sidebar-panel');
    if (!panel) return;

    let html = `<div class="mob-sidebar-header">
      <div class="topbar-avatar">${esc((s.display_name || s.display_label || '?').charAt(0).toUpperCase())}</div>
      <div><div style="font-size:12px;font-weight:600">${esc(s.display_name || s.display_label)}</div>
      <div style="font-size:9px;color:var(--t3)">${esc(s.tier_id)} · ${esc(s.store_id || 'HQ')}</div></div>
    </div>`;

    html += mobItem('dashboard', '◇', 'Dashboard');
    html += '<div style="height:8px"></div>';
    const mobPersonIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>';
    html += mobItem('profile', mobPersonIcon, 'Profile');
    html += '<div class="mob-sidebar-section">Modules</div>';
    if (S.modules) {
      S.modules.forEach(m => {
        if (!m.is_accessible) return; // D2: hide completely
        if (m.status === 'active') {
          html += `<div class="mob-sd-item" onclick="Screens.launchModule('${esc(m.app_url)}')"><span class="sd-item-icon">⊞</span>${esc(m.module_name)}</div>`;
        } else {
          html += `<div class="mob-sd-item disabled"><span class="sd-item-icon">⊞</span>${esc(m.module_name)} <span style="font-size:7px;padding:1px 4px;border-radius:3px;background:var(--orange-bg);color:var(--orange)">Soon</span></div>`;
        }
      });
    }

    if (isAdmin) {
      html += '<div style="height:8px"></div><div class="mob-sidebar-section">Admin</div>';
      html += mobNav('admin', 'accounts', '⚙', 'Accounts');
      html += mobNav('admin', 'permissions', '⚙', 'Permissions');
      html += mobNav('admin', 'tieraccess', '⚙', 'Tier Access');
      html += mobNav('admin', 'requests', '⚙', 'Requests');
      html += '<div style="height:8px"></div><div class="mob-sidebar-section">Master Data</div>';
      html += mobNav('master', 'modules', '▤', 'Modules');
      html += mobNav('master', 'stores', '▤', 'Stores');
      html += mobNav('master', 'depts', '▤', 'Departments');
    }

    html += '<div style="height:8px"></div>';
    html += mobItem('audit', '☰', 'Audit Trail');

    html += `<div class="mob-sd-footer"><a href="#" style="font-size:10px;color:var(--red);text-decoration:none" onclick="Screens.doLogout();return false">→ Log out</a></div>`;

    panel.innerHTML = html;
  }

  function mobItem(route, icon, label) {
    const active = currentRoute === route ? ' active' : '';
    return `<div class="mob-sd-item${active}" onclick="App.closeSidebar();App.go('${route}')"><span class="sd-item-icon">${icon}</span>${label}</div>`;
  }

  function mobNav(route, tab, icon, label) {
    return `<div class="mob-sd-item" onclick="App.closeSidebar();App.go('${route}',{tab:'${tab}'})"><span class="sd-item-icon">${icon}</span>${label}</div>`;
  }

  function openSidebar() {
    if (!_sidebarBuilt) buildSidebar();
    document.getElementById('sidebar-overlay')?.classList.add('open');
    document.getElementById('sidebar-panel')?.classList.add('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    document.getElementById('sidebar-panel')?.classList.remove('open');
  }

  // ═══ INIT — 3-Step Token Fallback ═══
  function init() {
    window.scrollTo(0, 0);

    // #logout — cross-module logout link
    if (location.hash === '#logout') {
      API.clearSession();
      _sidebarBuilt = false;
      history.replaceState(null, '', '#login');
      go('login');
      return;
    }

    // ── 3-Step Token Fallback ──
    // Step 1: URL param ?token=xxx (coming from another module)
    const urlParams = new URLSearchParams(location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      API.setToken(urlToken);
      // Clean URL (remove ?token= from address bar)
      history.replaceState(null, '', location.pathname + location.hash);
    }

    // Step 2: spg_token in localStorage (cross-module / new tab)
    // Step 3: spg_session in localStorage (refresh)
    // Both handled by API.getSession() which reads spg_session

    const session = API.getSession();
    const { route, params } = parseHash(location.hash);

    if (route && ROUTES[route]) {
      const pub = ['login', 'register'];
      if (pub.includes(route) || session) {
        go(route, params);
      } else {
        go('login');
      }
    } else {
      go(session ? 'dashboard' : 'login');
    }

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state?.route) {
        go(e.state.route, e.state.params || {});
      } else {
        const { route: r, params: p } = parseHash(location.hash);
        if (r && ROUTES[r]) go(r, p);
      }
    });

    // Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw_home.js').catch(() => {});
    }
  }

  // Boot — DOMContentLoaded fires after ALL defer scripts finish
  document.addEventListener('DOMContentLoaded', init);

  return {
    S, go, updateHash, toast, showLoader, hideLoader,
    showDialog, closeDialog, showProfilePopup, esc,
    topbar, shell, toolbar, showError, hideError,
    hardRefresh,
    sortData, sortTh, toggleSort, getSortState,
    getStoresCache, getDeptsCache, clearStoresCache, clearDeptsCache,
    openSidebar, closeSidebar, toggleSidebar,
    buildSidebar, loadBundle,
  };
})();
