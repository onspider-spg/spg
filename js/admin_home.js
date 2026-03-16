/**
 * Version 1.4.2 | 16 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * admin_home.js — Admin Functions (Accounts, Permissions, Tier Access, Requests, Home Settings)
 * v1.4.1: Add Home Settings screen (permission matrix + reference table)
 * ═══════════════════════════════════════════
 */

(() => {
const esc = App.esc;

// ═══ STATE ═══
const A = {
  accounts: null, _accLoaded: false, _accLoading: false, _accData: null,
  perms: null, _permLoaded: false, _permLoading: false,
  tier: null, _tierLoaded: false, _tierLoading: false,
  regs: null, _regLoaded: false, _regLoading: false, _regData: null,
  permDirty: {},   // track changes: { "module_tier": newLevel }
  tierDirty: {},   // track changes: { "acc_mod": newTier | null }
};

// ════════════════════════════════
// ACCOUNTS — fetch + render table + filter
// ════════════════════════════════
async function loadAccounts(filters = {}) {
  if (A._accLoading) return;
  const ct = document.getElementById('admin-content');
  if (!ct) return;
  // B3: use cache when returning to tab (no explicit filter)
  const hasFilter = filters.status_filter || filters.search;
  if (A._accLoaded && A._accData && !hasFilter) {
    renderAccountsTable(ct, A._accData);
    return;
  }
  A._accLoading = true;
  try {
    const data = await API.adminGetAccounts(filters);
    A.accounts = data.accounts;
    A._accData = data;
    A._accLoaded = true;
    renderAccountsTable(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._accLoading = false; }
}

function renderAccountsTable(ct, data) {
  const ST = App.getSortState('accounts');
  const sortKey = ST ? ST.key : 'display_label';
  const sortDir = ST ? ST.dir : 'asc';
  const accs = App.sortData(data.accounts || [], sortKey, sortDir);
  let rows = '';
  if (accs.length === 0) {
    rows = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">No accounts found</td></tr>';
  } else {
    rows = accs.map(a => `<tr style="cursor:pointer" onclick="App.go('account-detail',{account_id:'${esc(a.account_id)}'})">
      <td style="font-weight:600"><a class="lk">${esc(a.display_label)}</a></td>
      <td class="hide-m">${esc(a.account_type)}</td>
      <td class="hide-m">${esc(a.store_id || '-')}</td>
      <td>${esc(a.tier_id)}</td>
      <td><span class="sts ${a.status === 'approved' ? 'sts-ok' : a.status === 'suspended' ? 'sts-err' : 'sts-warn'}">${esc(a.status)}</span></td>
    </tr>`).join('');
  }
  ct.innerHTML = `
    <div class="card" style="padding:10px 16px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div><div class="fl-label">Status</div><select class="fl" id="f-acc-status"><option value="all">All</option><option value="approved">Approved</option><option value="suspended">Suspended</option></select></div>
        <div><div class="fl-label">Search</div><input class="fl" id="f-acc-search" placeholder="Name / Email" style="width:150px"></div>
        <button class="btn btn-primary btn-sm" onclick="Admin.filterAccounts()">Filter</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl"><thead><tr>${App.sortTh('accounts','display_label','Display Label')}${App.sortTh('accounts','account_type','Type',' class="hide-m"')}${App.sortTh('accounts','store_id','Store',' class="hide-m"')}${App.sortTh('accounts','tier_id','Tier')}${App.sortTh('accounts','status','Status')}</tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div style="font-size:11px;color:var(--t3);margin-top:8px">Total: ${data.total || accs.length} accounts</div>`;
}

function filterAccounts() {
  const status_filter = document.getElementById('f-acc-status')?.value || 'all';
  const search = document.getElementById('f-acc-search')?.value || '';
  A._accLoaded = false;
  loadAccounts({ status_filter, search });
}

// ════════════════════════════════
// PERMISSIONS — inline edit dropdown matrix + batch save
// ════════════════════════════════
async function loadPermissions() {
  if (A._permLoading) return;
  A._permLoading = true;
  A.permDirty = {};
  const ct = document.getElementById('admin-content');
  if (!ct) { A._permLoading = false; return; }
  try {
    const data = await API.adminGetPermissions();
    A.perms = data;
    A._permLoaded = true;
    renderPermGrid(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._permLoading = false; }
}

function renderPermGrid(ct, data) {
  const mods = data.modules || [];
  const tiers = data.tiers || [];
  const levels = ['no_access', 'view_only', 'edit', 'admin', 'super_admin'];
  const isSA = App.hasHomePerm('super_admin');
  const dis = isSA ? '' : ' disabled';

  let header = '<th>Tier</th>';
  mods.forEach(m => { header += `<th>${esc(m.module_name_en || m.module_id)}</th>`; });

  let rows = '';
  tiers.forEach(t => {
    let cells = `<td style="font-weight:600">${esc(t.tier_id)} ${esc(t.tier_name)}</td>`;
    mods.forEach(m => {
      const val = m.permissions[t.tier_id] || 'no_access';
      if (t.tier_level === 1) {
        cells += `<td style="text-align:center;color:var(--t3);font-size:11px">super_admin</td>`;
      } else {
        const key = `${m.module_id}_${t.tier_id}`;
        const opts = levels.map(l => `<option value="${l}"${val === l ? ' selected' : ''}>${l.replace('_', ' ')}</option>`).join('');
        cells += `<td><select class="fl" style="width:100px;font-size:10px;padding:3px 6px" onchange="Admin.markPermDirty('${esc(key)}',this.value)"${dis}>${opts}</select></td>`;
      }
    });
    rows += `<tr>${cells}</tr>`;
  });

  const hint = isSA ? 'Click any cell to change access level. Click Save when done.' : 'View only — requires Super Admin to edit.';
  ct.innerHTML = `
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">${hint}</div>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="tbl"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div id="perm-dirty-msg" style="font-size:11px;color:var(--orange);margin-top:8px;display:none">Unsaved changes</div>`;
}

function markPermDirty(key, value) {
  A.permDirty[key] = value;
  const msg = document.getElementById('perm-dirty-msg');
  if (msg) msg.style.display = Object.keys(A.permDirty).length > 0 ? 'block' : 'none';
}

async function savePermissions() {
  const keys = Object.keys(A.permDirty);
  if (keys.length === 0) { App.toast('No changes to save', 'info'); return; }
  App.showLoader();
  try {
    for (const key of keys) {
      const li = key.lastIndexOf('_'); const module_id = key.substring(0, li), tier_id = key.substring(li + 1);
      await API.adminUpdatePermission(module_id, tier_id, A.permDirty[key]);
    }
    // C1: update cache directly → re-render (no re-fetch)
    if (A.perms) {
      for (const key of keys) {
        const li = key.lastIndexOf('_'); const module_id = key.substring(0, li), tier_id = key.substring(li + 1);
        const mod = (A.perms.modules || []).find(m => m.module_id === module_id);
        if (mod) mod.permissions[tier_id] = A.permDirty[key];
      }
    }
    A.permDirty = {};
    App.toast(`Saved ${keys.length} permission(s)`, 'success');
    const ct = document.getElementById('admin-content');
    if (ct && A.perms) renderPermGrid(ct, A.perms);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { App.hideLoader(); }
}

// ════════════════════════════════
// TIER ACCESS — inline override dropdown + batch save
// ════════════════════════════════
async function loadTierAccess() {
  if (A._tierLoading) return;
  A._tierLoading = true;
  A.tierDirty = {};
  const ct = document.getElementById('admin-content');
  if (!ct) { A._tierLoading = false; return; }
  try {
    const data = await API.adminGetModuleAccess();
    A.tier = data;
    A._tierLoaded = true;
    renderTierGrid(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._tierLoading = false; }
}

function renderTierGrid(ct, data) {
  const accs = data.accounts || [];
  const mods = data.modules || [];
  const overrides = data.overrides || [];
  const tiers = data.tiers || [];
  const isSA = App.hasHomePerm('super_admin');
  const dis = isSA ? '' : ' disabled';

  const oMap = {};
  overrides.forEach(o => { oMap[`${o.account_id}|${o.module_id}`] = o; });

  const tierOpts = '<option value="">—</option>' + tiers.map(t => `<option value="${t.tier_id}">${t.tier_id}</option>`).join('');

  let header = '<th>Account</th><th>Global</th>';
  mods.forEach(m => { header += `<th>${esc(m.module_name_en || m.module_id)}</th>`; });

  let rows = '';
  accs.forEach(acc => {
    let cells = `<td style="font-weight:600;white-space:nowrap">${esc(acc.display_label)}<br><span style="font-size:10px;color:var(--t3)">${esc(acc.store_id || '')}</span></td>`;
    cells += `<td style="text-align:center"><span style="font-size:11px;font-weight:600">${esc(acc.tier_id)}</span></td>`;
    mods.forEach(m => {
      const key = `${acc.account_id}|${m.module_id}`;
      const ov = oMap[key];
      const curVal = ov?.is_active ? (ov.module_tier || '') : '';
      const selStyle = curVal ? 'color:var(--acc);font-weight:600;border-color:var(--acc)' : 'color:var(--t4)';
      const opts = tierOpts.replace(`value="${curVal}"`, `value="${curVal}" selected`);
      cells += `<td><select class="fl" style="width:70px;font-size:10px;padding:3px 6px;${selStyle}" onchange="Admin.markTierDirty('${esc(acc.account_id)}','${esc(m.module_id)}',this.value)"${dis}>${opts}</select></td>`;
    });
    rows += `<tr>${cells}</tr>`;
  });

  const hint = isSA ? 'Per-account module tier overrides. Blank (—) = uses global tier. Select a tier to override.' : 'View only — requires Super Admin to edit.';
  ct.innerHTML = `
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">${hint}</div>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="tbl"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div id="tier-dirty-msg" style="font-size:11px;color:var(--orange);margin-top:8px;display:none">Unsaved changes</div>`;
}

function markTierDirty(accountId, moduleId, value) {
  A.tierDirty[`${accountId}|${moduleId}`] = value; // "" means remove
  const msg = document.getElementById('tier-dirty-msg');
  if (msg) msg.style.display = Object.keys(A.tierDirty).length > 0 ? 'block' : 'none';
}

async function saveTierAccess() {
  const keys = Object.keys(A.tierDirty);
  if (keys.length === 0) { App.toast('No changes to save', 'info'); return; }
  App.showLoader();
  try {
    for (const key of keys) {
      const [account_id, module_id] = key.split('|');
      const tier = A.tierDirty[key];
      if (tier) {
        await API.adminSetModuleAccess(account_id, module_id, tier);
      } else {
        await API.adminRemoveModuleAccess(account_id, module_id);
      }
    }
    // C2: update cache directly → re-render (no re-fetch)
    if (A.tier) {
      const ov = A.tier.overrides || [];
      for (const key of keys) {
        const [account_id, module_id] = key.split('|');
        const tier = A.tierDirty[key];
        const idx = ov.findIndex(o => o.account_id === account_id && o.module_id === module_id);
        if (tier) {
          if (idx >= 0) { ov[idx].module_tier = tier; ov[idx].is_active = true; }
          else { ov.push({ account_id, module_id, module_tier: tier, is_active: true }); }
        } else {
          if (idx >= 0) ov.splice(idx, 1);
        }
      }
    }
    A.tierDirty = {};
    App.toast(`Saved ${keys.length} override(s)`, 'success');
    const ct = document.getElementById('admin-content');
    if (ct && A.tier) renderTierGrid(ct, A.tier);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { App.hideLoader(); }
}

// ════════════════════════════════
// REQUESTS — fetch + render table
// ════════════════════════════════
async function loadRequests() {
  if (A._regLoading) return;
  const ct = document.getElementById('admin-content');
  if (!ct) return;
  // B3: use cache when returning to tab
  if (A._regLoaded && A._regData) {
    renderRequestsTable(ct, A._regData);
    return;
  }
  A._regLoading = true;
  try {
    const data = await API.adminGetRegistrations();
    A.regs = data.requests;
    A._regData = data;
    A._regLoaded = true;
    renderRequestsTable(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._regLoading = false; }
}

function renderRequestsTable(ct, data) {
  const ST = App.getSortState('requests');
  const sortKey = ST ? ST.key : 'display_name';
  const sortDir = ST ? ST.dir : 'asc';
  const reqs = App.sortData(data.requests || [], sortKey, sortDir);
  let rows = '';
  if (reqs.length === 0) {
    rows = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--t3)">No registration requests</td></tr>';
  } else {
    rows = reqs.map(r => {
      const dt = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
      return `<tr>
        <td style="font-weight:600">${esc(r.display_name || r.full_name)}</td>
        <td>${esc(r.email || r.username)}</td>
        <td class="hide-m">${esc(r.requested_store_id || '-')}</td>
        <td>${dt}</td>
        <td><span class="sts ${r.status === 'approved' ? 'sts-ok' : r.status === 'rejected' ? 'sts-err' : 'sts-warn'}">${esc(r.status)}</span></td>
      </tr>`;
    }).join('');
  }
  ct.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl"><thead><tr>${App.sortTh('requests','display_name','Name')}${App.sortTh('requests','email','Email')}${App.sortTh('requests','requested_store_id','Store',' class="hide-m"')}${App.sortTh('requests','submitted_at','Date')}${App.sortTh('requests','status','Status')}</tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    ${data.pending_count > 0 ? `<div style="font-size:11px;color:var(--orange);margin-top:8px">${data.pending_count} pending request(s)</div>` : ''}`;
}

// ════════════════════════════════
// ADMIN TAB LOADER — called from screens2_home renderAdmin
// ════════════════════════════════
function loadAdminTab(tab) {
  switch (tab) {
    case 'accounts': loadAccounts(); break;
    case 'permissions': loadPermissions(); break;
    case 'tieraccess': loadTierAccess(); break;
    case 'requests': loadRequests(); break;
    case 'home-settings': loadHomeSettings(); break;
  }
}

function saveAdminTab(tab) {
  switch (tab) {
    case 'permissions': savePermissions(); break;
    case 'tieraccess': saveTierAccess(); break;
    case 'home-settings': saveHomeSettings(); break;
  }
}

// ════════════════════════════════
// HOME SETTINGS — permission matrix for home module only
// ════════════════════════════════
let _homePerms = null;
let _homePermsDirty = {};

async function loadHomeSettings() {
  const ct = document.getElementById('admin-content');
  if (!ct) return;
  try {
    const data = await API.adminGetPermissions();
    const homeMod = (data.modules || []).find(m => m.module_id === 'home');
    _homePerms = { tiers: data.tiers || [], permissions: homeMod?.permissions || {} };
    _homePermsDirty = {};
    renderHomeSettings(ct);
  } catch (e) { App.toast(e.message, 'error'); }
}

function renderHomeSettings(ct) {
  if (!_homePerms) return;
  const tiers = _homePerms.tiers;
  const perms = _homePerms.permissions;
  const levels = ['no_access', 'view_only', 'edit', 'admin', 'super_admin'];
  const isSA = App.hasHomePerm('super_admin');
  const dis = isSA ? '' : ' disabled';

  let rows = tiers.map(t => {
    const val = _homePermsDirty[t.tier_id] || perms[t.tier_id] || 'no_access';
    if (t.tier_level === 1) {
      return `<tr><td style="font-weight:600">${esc(t.tier_id)} ${esc(t.tier_name)}</td><td style="color:var(--t3);font-size:11px">super_admin (ล็อกไว้)</td><td style="font-size:11px;color:var(--t3)">ทุกอย่าง</td></tr>`;
    }
    const opts = levels.map(l => `<option value="${l}"${val === l ? ' selected' : ''}>${l.replace(/_/g, ' ')}</option>`).join('');
    const accessDesc = { 'no_access': 'ไม่เห็นเลย', 'view_only': 'Dashboard + Profile', 'edit': '+ Audit Trail', 'admin': '+ Admin Panel + Master (ดูอย่างเดียว)', 'super_admin': '+ แก้ไข Permissions / Master ทุกอย่าง' };
    return `<tr>
      <td style="font-weight:600">${esc(t.tier_id)} ${esc(t.tier_name)}</td>
      <td><select class="fl" style="width:120px;font-size:10px;padding:3px 6px" onchange="Admin.markHomePermDirty('${esc(t.tier_id)}',this.value)"${dis}>${opts}</select></td>
      <td style="font-size:11px;color:var(--t3)">${accessDesc[val] || ''}</td>
    </tr>`;
  }).join('');

  const hint = isSA ? 'แก้ระดับสิทธิ์แล้วกด Save Changes' : 'View only — ต้องเป็น Super Admin เพื่อแก้ไข';

  ct.innerHTML = `
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">${hint}</div>
    <div class="card" style="padding:0;overflow-x:auto;max-width:700px">
      <table class="tbl">
        <thead><tr><th>Tier</th><th>Access Level</th><th>สิ่งที่เห็น</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="home-perm-dirty-msg" style="font-size:11px;color:var(--orange);margin-top:8px;display:none">Unsaved changes</div>
    <div class="sec-title" style="margin-top:24px">Screen Access Reference</div>
    <div class="card" style="padding:0;overflow-x:auto;max-width:700px">
      <table class="tbl">
        <thead><tr><th>หน้า</th><th>view_only</th><th>edit</th><th>admin</th><th>super_admin</th></tr></thead>
        <tbody>
          <tr><td>Dashboard + Profile</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
          <tr><td>Module Launch</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
          <tr><td>Audit Trail</td><td>—</td><td>✅</td><td>✅</td><td>✅</td></tr>
          <tr><td>Accounts / Requests</td><td>—</td><td>—</td><td>✅</td><td>✅</td></tr>
          <tr><td>Permissions / Tier Access</td><td>—</td><td>—</td><td>✅ ดู</td><td>✅ แก้</td></tr>
          <tr><td>Master Data</td><td>—</td><td>—</td><td>✅ ดู</td><td>✅ แก้</td></tr>
          <tr><td>Create Account</td><td>—</td><td>—</td><td>✅</td><td>✅</td></tr>
        </tbody>
      </table>
    </div>`;
}

function markHomePermDirty(tierId, value) {
  _homePermsDirty[tierId] = value;
  const msg = document.getElementById('home-perm-dirty-msg');
  if (msg) msg.style.display = Object.keys(_homePermsDirty).length > 0 ? 'block' : 'none';
  // Update access description live
  const ct = document.getElementById('admin-content');
  if (ct && _homePerms) {
    _homePerms.permissions[tierId] = value;
    renderHomeSettings(ct);
  }
}

async function saveHomeSettings() {
  const keys = Object.keys(_homePermsDirty);
  if (keys.length === 0) { App.toast('No changes to save', 'info'); return; }
  App.showLoader();
  try {
    for (const tier_id of keys) {
      await API.adminUpdatePermission('home', tier_id, _homePermsDirty[tier_id]);
    }
    // Update local cache
    if (_homePerms) {
      for (const tier_id of keys) _homePerms.permissions[tier_id] = _homePermsDirty[tier_id];
    }
    _homePermsDirty = {};
    App.toast(`Saved ${keys.length} permission(s)`, 'success');
    const ct = document.getElementById('admin-content');
    if (ct) renderHomeSettings(ct);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { App.hideLoader(); }
}

// ═══ D1: SORT EVENT LISTENER ═══
document.addEventListener('spg-sort', (e) => {
  const ct = document.getElementById('admin-content');
  if (!ct) return;
  if (e.detail.tableId === 'accounts' && A._accData) renderAccountsTable(ct, A._accData);
  if (e.detail.tableId === 'requests' && A._regData) renderRequestsTable(ct, A._regData);
});

// ═══ GLOBAL EXPORT ═══
window.Admin = {
  loadAdminTab, saveAdminTab,
  filterAccounts,
  markPermDirty, savePermissions,
  markTierDirty, saveTierAccess,
  loadRequests,
  markHomePermDirty, saveHomeSettings,
};

})();
