/**
 * Version 1.0 | 14 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * admin_home.js — Admin Functions (Accounts, Permissions, Tier Access, Requests)
 * Extends Screens object — depends on screens2_home.js shell renders
 * ═══════════════════════════════════════════
 */

(() => {
const esc = App.esc;

// ═══ STATE ═══
const A = {
  accounts: null, _accLoaded: false, _accLoading: false,
  perms: null, _permLoaded: false, _permLoading: false,
  tier: null, _tierLoaded: false, _tierLoading: false,
  regs: null, _regLoaded: false, _regLoading: false,
  permDirty: {},   // track changes: { "module_tier": newLevel }
  tierDirty: {},   // track changes: { "acc_mod": newTier | null }
};

// ════════════════════════════════
// ACCOUNTS — fetch + render table + filter
// ════════════════════════════════
async function loadAccounts(filters = {}) {
  if (A._accLoading) return;
  A._accLoading = true;
  const ct = document.getElementById('admin-content');
  if (!ct) { A._accLoading = false; return; }
  try {
    const data = await API.adminGetAccounts(filters);
    A.accounts = data.accounts;
    A._accLoaded = true;
    renderAccountsTable(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._accLoading = false; }
}

function renderAccountsTable(ct, data) {
  const accs = data.accounts || [];
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
      <table class="tbl"><thead><tr><th>Display Label</th><th class="hide-m">Type</th><th class="hide-m">Store</th><th>Tier</th><th>Status</th></tr></thead>
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
        cells += `<td><select class="fl" style="width:100px;font-size:10px;padding:3px 6px" onchange="Admin.markPermDirty('${esc(key)}',this.value)">${opts}</select></td>`;
      }
    });
    rows += `<tr>${cells}</tr>`;
  });

  ct.innerHTML = `
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Click any cell to change access level. Click Save when done.</div>
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
      const [module_id, tier_id] = key.split('_');
      await API.adminUpdatePermission(module_id, tier_id, A.permDirty[key]);
    }
    A.permDirty = {};
    App.toast(`Saved ${keys.length} permission(s)`, 'success');
    A._permLoaded = false;
    loadPermissions();
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
      cells += `<td><select class="fl" style="width:70px;font-size:10px;padding:3px 6px;${selStyle}" onchange="Admin.markTierDirty('${esc(acc.account_id)}','${esc(m.module_id)}',this.value)">${opts}</select></td>`;
    });
    rows += `<tr>${cells}</tr>`;
  });

  ct.innerHTML = `
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Per-account module tier overrides. Blank (—) = uses global tier. Select a tier to override.</div>
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
    A.tierDirty = {};
    App.toast(`Saved ${keys.length} override(s)`, 'success');
    A._tierLoaded = false;
    loadTierAccess();
  } catch (e) { App.toast(e.message, 'error'); }
  finally { App.hideLoader(); }
}

// ════════════════════════════════
// REQUESTS — fetch + render table
// ════════════════════════════════
async function loadRequests() {
  if (A._regLoading) return;
  A._regLoading = true;
  const ct = document.getElementById('admin-content');
  if (!ct) { A._regLoading = false; return; }
  try {
    const data = await API.adminGetRegistrations();
    A.regs = data.requests;
    A._regLoaded = true;
    renderRequestsTable(ct, data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { A._regLoading = false; }
}

function renderRequestsTable(ct, data) {
  const reqs = data.requests || [];
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
      <table class="tbl"><thead><tr><th>Name</th><th>Email</th><th class="hide-m">Store</th><th>Date</th><th>Status</th></tr></thead>
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
  }
}

function saveAdminTab(tab) {
  switch (tab) {
    case 'permissions': savePermissions(); break;
    case 'tieraccess': saveTierAccess(); break;
  }
}

// ═══ GLOBAL EXPORT ═══
window.Admin = {
  loadAdminTab, saveAdminTab,
  filterAccounts,
  markPermDirty, savePermissions,
  markTierDirty, saveTierAccess,
  loadRequests,
};

})();
