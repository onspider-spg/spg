/**
 * Version 1.5.1 | 14 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * screens2_home.js — Admin Shells (S9–S12)
 * v1.5.1: Add Home Settings tab support
 * ═══════════════════════════════════════════
 */

(() => {

// ════════════════════════════════
// S9: ADMIN PANEL (by tab)
// ════════════════════════════════
function renderAdmin(p) {
  const tab = p?.tab || 'accounts';
  const titles = { accounts: 'Accounts', permissions: 'Permissions', tieraccess: 'Tier Access Overrides', requests: 'Registration Requests', 'home-settings': 'Home Settings' };
  const title = titles[tab] || 'Admin';
  const isSA = App.hasHomePerm('super_admin');

  let actions = '';
  if (tab === 'accounts') actions = `<button class="btn btn-primary btn-sm" onclick="App.go('acct-create')">+ Create Account</button>`;
  else if ((tab === 'permissions' || tab === 'tieraccess') && isSA) actions = `<button class="btn btn-primary btn-sm" onclick="Admin.saveAdminTab('${tab}')">Save Changes</button>`;
  else if (tab === 'home-settings' && isSA) actions = `<button class="btn btn-primary btn-sm" onclick="Admin.saveAdminTab('${tab}')">Save Changes</button>`;

  const r = App.shell(`${App.toolbar(title, actions)}<div class="content"><div id="admin-content"><div class="skeleton" style="height:200px;margin-top:8px"></div></div></div>`);
  setTimeout(() => Admin.loadAdminTab(tab), 30);
  return r;
}


// ════════════════════════════════
// MASTER DATA (by tab)
// ════════════════════════════════
function renderMaster(p) {
  const tab = p?.tab || 'modules';
  const titles = { modules: 'Modules', stores: 'Stores', depts: 'Departments' };
  const title = titles[tab] || 'Master Data';
  const isSA = App.hasHomePerm('super_admin');

  let actions = '';
  if (isSA) {
    actions = tab === 'modules'
      ? `<button class="btn btn-primary btn-sm" onclick="Master.saveMasterTab('${tab}')">Save Changes</button>`
      : `<button class="btn btn-primary btn-sm" onclick="Master.addMasterItem('${tab}')">+ Add ${title.slice(0, -1)}</button>`;
  }

  const r = App.shell(`${App.toolbar(title, actions)}<div class="content"><div id="master-content"><div class="skeleton" style="height:200px;margin-top:8px"></div></div></div>`);
  setTimeout(() => Master.loadMasterTab(tab), 30);
  return r;
}


// ════════════════════════════════
// S10: ACCOUNT DETAIL
// ════════════════════════════════
function renderAccountDetail(p) {
  const r = App.shell(`
    ${App.toolbar('Account Detail', `<button class="btn btn-outline btn-sm" onclick="App.go('admin',{tab:'accounts'})">← Accounts</button>`)}
    <div class="content"><div id="acct-detail-content"><div class="skeleton" style="height:300px;margin-top:8px"></div></div></div>`);
  setTimeout(() => Screens3.loadAccountDetail(p?.account_id), 30);
  return r;
}


// ════════════════════════════════
// S10b: CREATE ACCOUNT
// ════════════════════════════════
function renderAcctCreate() {
  const r = App.shell(`
    ${App.toolbar('Create Account', `<button class="btn btn-outline btn-sm" onclick="App.go('admin',{tab:'accounts'})">← Accounts</button>`)}
    <div class="content"><div id="acct-create-content"><div class="skeleton" style="height:300px;margin-top:8px"></div></div></div>`);
  setTimeout(() => Screens3.renderCreateAccountForm(), 30);
  return r;
}


// ════════════════════════════════
// S12: AUDIT TRAIL
// ════════════════════════════════
function renderAudit() {
  const r = App.shell(`
    ${App.toolbar('Audit Trail')}
    <div class="content"><div id="audit-content"></div></div>`);
  setTimeout(() => Screens3.renderAuditUI(), 30);
  return r;
}


// ═══ EXTEND Screens ═══
Object.assign(Screens, {
  renderAdmin, renderMaster,
  renderAccountDetail, renderAcctCreate,
  renderAudit,
});

})();
