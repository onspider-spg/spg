/**
 * Version 1.0 | 13 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * screens2_home.js — Admin Shells (S9–S12)
 * All screens are UI shell only — functions coming later
 * ═══════════════════════════════════════════
 */

(() => {
const esc = App.esc;

function shell(inner) {
  const s = API.getSession();
  const name = s ? (s.display_name || s.display_label || '') : '';
  const initial = (name || '?').charAt(0).toUpperCase();
  return `<div class="shell fade-in">
    <div class="topbar">
      <div class="hamburger" onclick="App.openSidebar()">☰</div>
      <div class="topbar-logo" onclick="App.go('dashboard')">SPG Home</div>
      <div class="topbar-right">
        <div class="topbar-user"><div class="topbar-avatar">${esc(initial)}</div><span class="hide-m">${esc(name)}</span></div>
      </div>
    </div>
    <div class="shell-body">
      <nav class="sidebar"></nav>
      <div class="shell-main">${inner}</div>
    </div>
  </div>`;
}

function toolbar(title, actions) {
  return `<div class="toolbar"><div class="toolbar-title">${esc(title)}</div>${actions || ''}</div>`;
}

// ════════════════════════════════
// S9: ADMIN PANEL (by tab)
// ════════════════════════════════
function renderAdmin(p) {
  const tab = p?.tab || 'accounts';
  const titles = { accounts: 'Accounts', permissions: 'Permissions', tieraccess: 'Tier Access Overrides', requests: 'Registration Requests' };
  const title = titles[tab] || 'Admin';

  let content = '';
  if (tab === 'accounts') {
    content = `
      <div class="card" style="padding:10px 16px">
        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div><div class="fl-label">Status</div><select class="fl"><option>All</option><option>Approved</option><option>Suspended</option></select></div>
          <div><div class="fl-label">Store</div><select class="fl"><option>All</option></select></div>
          <div><div class="fl-label">Search</div><input class="fl" placeholder="Name / Email" style="width:150px"></div>
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Display Label</th><th class="hide-m">Type</th><th class="hide-m">Store</th><th>Tier</th><th>Status</th></tr></thead>
        <tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">Account data will load here</td></tr></tbody></table>
      </div>`;
  } else if (tab === 'permissions') {
    content = `
      <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Click any cell to change access level. Click Save when done.</div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Tier</th><th>BC Order</th><th>Sale Daily</th><th>Finance</th><th>Home</th></tr></thead>
        <tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">Permission data will load here</td></tr></tbody></table>
      </div>`;
  } else if (tab === 'tieraccess') {
    content = `
      <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Per-account module tier overrides. Blank (—) = uses global tier.</div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Account</th><th>Global Tier</th><th>BC Order</th><th>Sale Daily</th><th>Finance</th></tr></thead>
        <tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">Tier access data will load here</td></tr></tbody></table>
      </div>`;
  } else if (tab === 'requests') {
    content = `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Name</th><th>Email</th><th class="hide-m">Store</th><th>Date</th><th>Status</th></tr></thead>
        <tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">Request data will load here</td></tr></tbody></table>
      </div>`;
  }

  const actions = tab === 'accounts'
    ? `<button class="btn btn-primary btn-sm" onclick="App.go('acct-create')">+ Create Account</button>`
    : (tab === 'permissions' || tab === 'tieraccess')
      ? `<button class="btn btn-primary btn-sm">Save Changes</button>`
      : '';

  const r = shell(`${toolbar(title, actions)}<div class="content">${content}</div>`);
  setTimeout(() => App.buildSidebar(), 30);
  return r;
}


// ════════════════════════════════
// MASTER DATA (by tab)
// ════════════════════════════════
function renderMaster(p) {
  const tab = p?.tab || 'modules';
  const titles = { modules: 'Modules', stores: 'Stores', depts: 'Departments' };
  const title = titles[tab] || 'Master Data';

  let content = '';
  if (tab === 'modules') {
    content = `
      <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Edit module name and status inline. Click Save when done.</div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Module ID</th><th>Name TH</th><th>Name EN</th><th>Status</th><th class="hide-m">URL</th></tr></thead>
        <tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">Module data will load here</td></tr></tbody></table>
      </div>`;
  } else if (tab === 'stores') {
    content = `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Store ID</th><th>Name</th><th class="hide-m">Name TH</th><th>Status</th></tr></thead>
        <tbody><tr><td colspan="4" style="text-align:center;padding:30px;color:var(--t3)">Store data will load here</td></tr></tbody></table>
      </div>`;
  } else if (tab === 'depts') {
    content = `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>Dept ID</th><th>Name (EN)</th><th class="hide-m">Name (TH)</th><th>Status</th></tr></thead>
        <tbody><tr><td colspan="4" style="text-align:center;padding:30px;color:var(--t3)">Department data will load here</td></tr></tbody></table>
      </div>`;
  }

  const actions = tab === 'modules'
    ? `<button class="btn btn-primary btn-sm">Save Changes</button>`
    : `<button class="btn btn-primary btn-sm">+ Add ${title.slice(0, -1)}</button>`;

  const r = shell(`${toolbar(title, actions)}<div class="content">${content}</div>`);
  setTimeout(() => App.buildSidebar(), 30);
  return r;
}


// ════════════════════════════════
// S10: ACCOUNT DETAIL (shell)
// ════════════════════════════════
function renderAccountDetail(p) {
  const r = shell(`
    ${toolbar('Account Detail', `<button class="btn btn-outline btn-sm" onclick="App.go('admin',{tab:'accounts'})">← Accounts</button>`)}
    <div class="content">
      <div class="card" style="max-width:800px">
        <div style="text-align:center;padding:30px;color:var(--t3)">Account detail will load here</div>
      </div>
    </div>`);
  setTimeout(() => App.buildSidebar(), 30);
  return r;
}


// ════════════════════════════════
// S10b: CREATE ACCOUNT (shell)
// ════════════════════════════════
function renderAcctCreate() {
  const r = shell(`
    ${toolbar('Create Account', `<button class="btn btn-outline btn-sm" onclick="App.go('admin',{tab:'accounts'})">← Accounts</button>`)}
    <div class="content">
      <div class="card" style="max-width:500px">
        <div class="fg"><label class="lb">Username *</label><input class="inp" placeholder="username or email"></div>
        <div class="fg"><label class="lb">Password * (min 8 characters)</label><input class="inp" type="password" placeholder="••••••••"></div>
        <div class="fg"><label class="lb">Display Label *</label><input class="inp" placeholder="e.g. Mango Coco Mac"></div>
        <div class="fg"><label class="lb">Account Type *</label><select class="inp"><option value="individual">Individual</option><option value="group">Group</option></select></div>
        <div class="fg"><label class="lb">Tier *</label><select class="inp"><option>T1</option><option>T2</option><option>T3</option><option>T4</option><option selected>T5</option><option>T6</option><option>T7</option></select></div>
        <div style="display:flex;gap:8px">
          <div class="fg" style="flex:1"><label class="lb">Store</label><select class="inp"><option value="">-- ไม่ระบุ --</option></select></div>
          <div class="fg" style="flex:1"><label class="lb">Department</label><select class="inp"><option value="">-- ไม่ระบุ --</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:var(--sp-md)">
          <button class="btn btn-outline" onclick="App.go('admin',{tab:'accounts'})">Cancel</button>
          <button class="btn btn-primary" onclick="App.toast('Create Account — coming soon','info')">Create Account</button>
        </div>
      </div>
    </div>`);
  setTimeout(() => App.buildSidebar(), 30);
  return r;
}


// ════════════════════════════════
// S12: AUDIT TRAIL (on-demand — 2 states)
// ════════════════════════════════
function renderAudit() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const r = shell(`
    ${toolbar('Audit Trail')}
    <div class="content">
      <div class="card" style="max-width:900px">
        <div style="font-size:11px;color:var(--t3);margin-bottom:12px">Select a date range and click Load to view audit records.</div>
        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div><div class="fl-label">Date from</div><input class="fl" type="date" value="${weekAgo}" style="width:140px"></div>
          <div><div class="fl-label">Date to</div><input class="fl" type="date" value="${today}" style="width:140px"></div>
          <div><div class="fl-label">User</div><select class="fl" style="width:120px"><option>All Users</option></select></div>
          <div><div class="fl-label">Action</div><select class="fl" style="width:120px"><option>All Actions</option></select></div>
          <button class="btn btn-primary btn-sm" onclick="App.toast('Audit load — coming soon','info')">Load</button>
        </div>
      </div>
      <div class="empty-state">
        <div class="empty-icon">☰</div>
        <div class="empty-text">Select date range and click Load</div>
        <div class="empty-sub">Records are not loaded until requested</div>
      </div>
    </div>`);
  setTimeout(() => App.buildSidebar(), 30);
  return r;
}


// ═══ EXTEND Screens ═══
Object.assign(Screens, {
  renderAdmin, renderMaster,
  renderAccountDetail, renderAcctCreate,
  renderAudit,
});

})();
