/**
 * Version 1.3.3 | 17 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module
 * screens_home.js — S1 Login, S3 Staff, S4 New Staff,
 *   S5 Dashboard, S6 Profile, S7 Register
 * v1.3.3: Sync topbar/sidebar after profile update
 * v1.3.1: fix App.App.showError/hideError double prefix
 * ═══════════════════════════════════════════
 */

const Screens = (() => {
const esc = App.esc;

// ═══ LAYOUT HELPERS ═══
function shellLogin(inner) {
  return `<div class="shell-login fade-in">${inner}</div>`;
}


// ════════════════════════════════
// S1: LOGIN
// ════════════════════════════════
function renderLogin() {
  return shellLogin(`<div class="login-shell">
    <div class="login-logo">🎨</div>
    <div class="login-title">SPG</div>
    <div class="login-brand">SIAM PALETTE GROUP</div>
    <div class="login-sub">Management System</div>
    <div class="login-form">
      <input class="login-inp" id="inp-user" placeholder="Email / Username" autocomplete="username" autofocus>
      <input class="login-inp" id="inp-pass" type="password" placeholder="••••••••" autocomplete="current-password">
      <div class="error-msg" id="login-error"></div>
      <button class="login-btn" id="btn-login" onclick="Screens.doLogin()">Sign In</button>
      <!-- Register via direct link: #register -->
    </div>
  </div>`);
}

async function doLogin() {
  const user = document.getElementById('inp-user')?.value.trim();
  const pass = document.getElementById('inp-pass')?.value;
  if (!user || !pass) { App.showError('login-error', 'Please enter email and password'); return; }

  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Signing in...';
  App.hideError('login-error');
  App.showLoader();

  try {
    const data = await API.login(user, pass);
    if (data.account_type === 'individual') {
      API.saveSession(data);
      App.go('dashboard');
    } else {
      API.saveAccountTemp(data);
      App.go('staff-select');
    }
  } catch (e) {
    App.showError('login-error', e.message || 'Sign in failed');
    btn.disabled = false; btn.textContent = 'Sign In';
  } finally {
    App.hideLoader();
  }
}


// ════════════════════════════════
// S7: REGISTER (shell — UI only)
// ════════════════════════════════
function renderRegister() {
  return shellLogin(`
    <div class="login-header">
      <button class="login-back" onclick="App.go('login')">←</button>
      <div class="login-header-title">Register</div>
    </div>
    <div style="padding:20px;flex:1;overflow-y:auto">
      <div class="fg"><label class="lb">Email / Username *</label><input class="inp" id="inp-reg-email" placeholder="email@example.com"></div>
      <div class="fg"><label class="lb">Password *</label><input class="inp" id="inp-reg-pass" type="password" placeholder="min 8 characters"></div>
      <div style="display:flex;gap:8px">
        <div class="fg" style="flex:1"><label class="lb">Full Name *</label><input class="inp" id="inp-reg-full" placeholder="First Last"></div>
        <div class="fg" style="flex:1"><label class="lb">Display Name *</label><input class="inp" id="inp-reg-nick" placeholder="e.g. Mint"></div>
      </div>
      <div class="fg"><label class="lb">Phone *</label><input class="inp" id="inp-reg-phone" placeholder="0412345678"></div>
      <div style="display:flex;gap:8px">
        <div class="fg" style="flex:1"><label class="lb">Store</label><select class="inp" id="inp-reg-store"><option value="">-- Select --</option></select></div>
        <div class="fg" style="flex:1"><label class="lb">Department</label><select class="inp" id="inp-reg-dept"><option value="">-- Select --</option></select></div>
      </div>
      <div class="error-msg" id="reg-error"></div>
      <button class="login-btn" style="margin-top:12px" onclick="Screens.doRegister()">Submit Registration</button>
    </div>`);
}

async function loadRegisterDropdowns() {
  try {
    const [stores, depts] = await Promise.all([App.getStoresCache(), App.getDeptsCache()]);
    const storeEl = document.getElementById('inp-reg-store');
    const deptEl = document.getElementById('inp-reg-dept');
    if (storeEl) storeEl.innerHTML = '<option value="">-- Select Store --</option>' +
      stores.filter(s => s.store_id !== 'ALL').map(s => `<option value="${esc(s.store_id)}">${esc(s.store_name_th || s.store_name)}</option>`).join('');
    if (deptEl) deptEl.innerHTML = '<option value="">-- Select Dept --</option>' +
      depts.map(d => `<option value="${esc(d.dept_id)}">${esc(d.dept_name_th || d.dept_name)}</option>`).join('');
  } catch (e) { App.toast('Failed to load dropdowns', 'error'); }
}

async function doRegister() {
  const email = document.getElementById('inp-reg-email')?.value.trim();
  const password = document.getElementById('inp-reg-pass')?.value;
  const full_name = document.getElementById('inp-reg-full')?.value.trim();
  const display_name = document.getElementById('inp-reg-nick')?.value.trim();
  const phone = document.getElementById('inp-reg-phone')?.value.trim();
  if (!email || !password || !full_name || !display_name || !phone) {
    App.showError('reg-error', 'Please fill in all required fields'); return;
  }
  App.showLoader();
  try {
    await API.register({
      username: email, email, password, full_name, display_name, phone,
      requested_store_id: document.getElementById('inp-reg-store')?.value || '',
      requested_dept_id: document.getElementById('inp-reg-dept')?.value || '',
    });
    App.toast('Registration submitted! Awaiting approval.', 'success');
    App.go('login');
  } catch (e) { App.showError('reg-error', e.message); }
  finally { App.hideLoader(); }
}


// ════════════════════════════════
// S3: STAFF SELECT (working — group login flow)
// ════════════════════════════════
function renderStaffSelect() {
  const acc = API.getAccountTemp();
  if (!acc) return renderLogin();
  return shellLogin(`
    <div class="login-header">
      <button class="login-back" onclick="API.clearSession();App.go('login')">←</button>
      <div class="login-header-title">Who is using this device?</div>
    </div>
    <div style="padding:20px;flex:1">
      <div style="font-size:11px;color:var(--t3);margin-bottom:12px">${esc(acc.display_label)}</div>
      <div id="staff-grid"><div style="text-align:center;padding:20px;color:var(--t3)">กำลังโหลด...</div></div>
      <div style="text-align:center;margin-top:16px">
        <a class="lk" style="color:var(--gold)" onclick="App.go('new-staff')">+ Add new staff</a>
      </div>
    </div>`);
}

async function loadStaffList() {
  const acc = API.getAccountTemp();
  if (!acc) return;
  try {
    const data = await API.getUsers(acc.account_id);
    const grid = document.getElementById('staff-grid');
    if (!grid) return;
    grid.innerHTML = (data.users || []).map(u => {
      const initial = (u.display_name || '?').charAt(0).toUpperCase();
      return `<div class="staff-card" onclick="Screens.selectStaff('${esc(u.user_id)}')">
        <div class="staff-avatar">${esc(initial)}</div>
        <div><div class="staff-name">${esc(u.display_name)}</div><div class="staff-hint">Enter PIN to continue</div></div>
      </div>`;
    }).join('');
  } catch (e) { App.toast(e.message, 'error'); }
}

async function selectStaff(userId) {
  const acc = API.getAccountTemp();
  if (!acc) return;
  App.showLoader();
  try {
    const data = await API.switchUser(acc.account_id, userId);
    API.saveSession(data);
    App.hideLoader();
    App.go('dashboard');
  } catch (e) {
    App.hideLoader();
    if (e.key === 'SET_PIN_REQUIRED') {
      showSetPinPopup(userId);
    } else if (e.message && e.message.toLowerCase().includes('pin')) {
      showPinPopup(userId);
    } else {
      App.toast(e.message, 'error');
    }
  }
}

function showPinPopup(userId) {
  App.showDialog(`<div class="popup-sheet">
    <div class="popup-header"><div class="popup-title">Enter PIN</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
    <div class="fg"><label class="lb">6-digit PIN</label>
      <input class="inp" id="inp-pin" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" autofocus>
    </div>
    <div class="error-msg" id="pin-error"></div>
    <div class="popup-actions"><button class="btn btn-primary" onclick="Screens.submitPin('${userId}')">ยืนยัน</button></div>
  </div>`);
  setTimeout(() => document.getElementById('inp-pin')?.focus(), 100);
}

async function submitPin(userId) {
  const pin = document.getElementById('inp-pin')?.value.trim();
  if (!pin || pin.length !== 6) { App.showError('pin-error', 'PIN ต้อง 6 หลัก'); return; }
  const acc = API.getAccountTemp();
  if (!acc) return;
  App.showLoader();
  try {
    const data = await API.switchUser(acc.account_id, userId, pin);
    App.closeDialog();
    API.saveSession(data);
    App.hideLoader();
    App.go('dashboard');
  } catch (e) {
    App.hideLoader();
    App.showError('pin-error', e.message || 'Incorrect PIN');
  }
}

function showSetPinPopup(userId) {
  App.showDialog(`<div class="popup-sheet">
    <div class="popup-header"><div class="popup-title">ตั้ง PIN ใหม่</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
    <div style="font-size:13px;color:var(--t3);margin-bottom:12px">คุณยังไม่มี PIN กรุณาตั้ง PIN ก่อนเข้าใช้งาน</div>
    <div class="fg"><label class="lb">PIN (6 หลัก)</label><input class="inp" id="inp-set-pin" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" autofocus></div>
    <div class="fg"><label class="lb">ยืนยัน PIN</label><input class="inp" id="inp-set-pin2" type="password" maxlength="6" inputmode="numeric" placeholder="••••••"></div>
    <div class="error-msg" id="setpin-error"></div>
    <div class="popup-actions"><button class="btn btn-primary" onclick="Screens.submitSetPin('${userId}')">ตั้ง PIN</button></div>
  </div>`);
  setTimeout(() => document.getElementById('inp-set-pin')?.focus(), 100);
}

async function submitSetPin(userId) {
  const p1 = document.getElementById('inp-set-pin')?.value.trim();
  const p2 = document.getElementById('inp-set-pin2')?.value.trim();
  if (!p1 || p1.length !== 6 || !/^\d{6}$/.test(p1)) { App.showError('setpin-error', 'PIN ต้องเป็นตัวเลข 6 หลัก'); return; }
  if (p1 !== p2) { App.showError('setpin-error', 'PIN ไม่ตรงกัน'); return; }
  const acc = API.getAccountTemp();
  if (!acc) return;
  App.showLoader();
  try {
    await API.setUserPin(acc.account_id, userId, p1);
    App.toast('ตั้ง PIN สำเร็จ', 'success');
    const data = await API.switchUser(acc.account_id, userId, p1);
    App.closeDialog();
    API.saveSession(data);
    App.hideLoader();
    App.go('dashboard');
  } catch (e) {
    App.hideLoader();
    App.showError('setpin-error', e.message || 'ตั้ง PIN ไม่สำเร็จ');
  }
}


// ════════════════════════════════
// S4: NEW STAFF (shell)
// ════════════════════════════════
function renderNewStaff() {
  const acc = API.getAccountTemp();
  if (!acc) return renderLogin();
  return shellLogin(`
    <div class="login-header">
      <button class="login-back" onclick="App.go('staff-select')">←</button>
      <div class="login-header-title">เพิ่มบัญชีใหม่</div>
    </div>
    <div style="padding:20px;flex:1;overflow-y:auto">
      <div style="padding:10px 14px;background:var(--blue-bg);border-radius:var(--rd);font-size:12px;color:var(--blue);margin-bottom:14px">สร้าง account ใหม่ภายใต้: <strong>${esc(acc.display_label)}</strong></div>
      <div class="fg"><label class="lb">Display Name *</label><input class="inp" id="inp-staff-nick" placeholder="e.g. Junnie-GB"></div>
      <div class="fg"><label class="lb">Full Name *</label><input class="inp" id="inp-staff-full" placeholder="First Last"></div>
      <div class="fg"><label class="lb">Phone</label><input class="inp" id="inp-staff-phone" placeholder="0812345678"></div>
      <div class="fg"><label class="lb">PIN (6 digits) *</label><input class="inp" id="inp-staff-pin" type="password" maxlength="6" inputmode="numeric" placeholder="เช่น 123456"></div>
      <div class="error-msg" id="staff-error"></div>
      <button class="login-btn" style="margin-top:12px" onclick="Screens.doCreateStaff()">สร้างบัญชี</button>
    </div>`);
}

async function doCreateStaff() {
  const acc = API.getAccountTemp();
  if (!acc) return;
  const display_name = document.getElementById('inp-staff-nick')?.value.trim();
  const full_name = document.getElementById('inp-staff-full')?.value.trim();
  const pin = document.getElementById('inp-staff-pin')?.value.trim();
  const phone = document.getElementById('inp-staff-phone')?.value.trim();
  if (!display_name || !full_name) { App.showError('staff-error', 'Please fill in all fields'); return; }
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) { App.showError('staff-error', 'PIN must be 6 digits'); return; }
  App.showLoader();
  try {
    const data = await API.createUser({ account_id: acc.account_id, display_name, full_name, pin, phone });
    App.toast(`เพิ่ม "${display_name}" สำเร็จ`, 'success');
    await selectStaff(data.user_id);
  } catch (e) {
    App.showError('staff-error', e.message);
    App.hideLoader();
  }
}


// ════════════════════════════════
// S5: DASHBOARD (working — init_bundle data)
// ════════════════════════════════
function renderDashboard() {
  const s = API.getSession();
  if (!s) return renderLogin();

  return App.shell(`
    ${App.toolbar('Dashboard')}
    <div class="content">
      <div style="margin-bottom:20px">
        <div style="font-size:var(--fs-body);font-weight:700;margin-bottom:var(--sp-xs)" id="dash-greeting">Welcome, ${esc(s.display_name || s.display_label)}</div>
        <div style="font-size:11px;color:var(--t3)" id="dash-meta">${esc(s.tier_id)} · ${esc(s.store_id || 'HQ')}</div>
      </div>
      <div class="sec-title">Modules</div>
      <div class="mod-grid" id="mod-grid">
        <div class="skeleton" style="height:56px"></div>
        <div class="skeleton" style="height:56px"></div>
      </div>
    </div>`);
}

function fillDashboard(session, modules) {
  if (!session || !modules) return;

  // Update greeting with full data
  const greet = document.getElementById('dash-greeting');
  const meta = document.getElementById('dash-meta');
  if (greet) greet.textContent = `Welcome, ${session.display_name || ''}`;
  if (meta) meta.textContent = `${session.tier_id} · ${session.tier_name || ''} · ${session.store_id || 'HQ'}`;

  // Render module cards
  const grid = document.getElementById('mod-grid');
  if (!grid) return;

  const colors = {
    bakery_order:     { bg: 'var(--green-bg)',  c: 'var(--green)',  abbr: 'BA' },
    saledaily_report: { bg: 'var(--blue-bg)',   c: 'var(--blue)',   abbr: 'SA' },
    finance:          { bg: 'var(--acc2)',       c: 'var(--acc)',    abbr: 'FN' },
  };

  grid.innerHTML = modules.filter(m => m.is_accessible).map(m => {
    const cl = colors[m.module_id] || { bg: 'var(--bg3)', c: 'var(--t2)', abbr: (m.module_id || '??').substring(0, 2).toUpperCase() };

    // D2: coming_soon = dimmed + badge, no_access already filtered out
    if (m.status !== 'active') {
      return `<div class="mod-card disabled">
        <div class="mod-icon" style="background:${cl.bg};color:${cl.c}">${cl.abbr}</div>
        <div><div class="mod-name">${esc(m.module_name)}</div><div class="mod-desc">${esc(m.module_name_en || '')} · Coming soon</div></div>
        <span class="sts sts-warn" style="font-size:9px;margin-left:auto">Soon</span>
      </div>`;
    }

    return `<div class="mod-card" onclick="Screens.launchModule('${esc(m.app_url)}')">
      <div class="mod-icon" style="background:${cl.bg};color:${cl.c}">${cl.abbr}</div>
      <div><div class="mod-name">${esc(m.module_name)}</div><div class="mod-desc">${esc(m.module_name_en || '')}</div></div>
      <div class="mod-arr">›</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-text">No modules available</div></div>';
}

function launchModule(url) {
  const s = API.getSession();
  if (!s) return;
  const sep = url.includes('?') ? '&' : '?';
  location.href = `${url}${sep}token=${s.token}`;
}


// ════════════════════════════════
// S6: PROFILE (display session data)
// ════════════════════════════════
let _profileLoading = false;

function renderProfile() {
  const s = API.getSession();
  if (!s) return renderLogin();

  return App.shell(`
    ${App.toolbar('Profile')}
    <div class="content">
      <div class="card" style="max-width:500px" id="profile-card">
        <div style="text-align:center;padding:20px;color:var(--t3)">Loading...</div>
      </div>
    </div>`);
}

async function loadProfile() {
  if (App.S._profileLoaded && App.S.profile) {
    renderProfileCard(App.S.profile);
    return;
  }
  if (_profileLoading) return;
  _profileLoading = true;
  try {
    const data = await API.getProfile();
    App.S.profile = data;
    App.S._profileLoaded = true;
    renderProfileCard(data);
  } catch (e) { App.toast(e.message, 'error'); }
  finally { _profileLoading = false; }
}

function renderProfileCard(d) {
  const card = document.getElementById('profile-card');
  if (!card) return;
  const initial = (d.display_name || d.full_name || '?').charAt(0).toUpperCase();
  const isGroup = d.account_type === 'group';
  const avatarBg = isGroup ? 'var(--orange-bg)' : 'var(--acc2)';
  const avatarColor = isGroup ? 'var(--orange)' : 'var(--acc)';
  const badgeBg = isGroup ? 'var(--orange-bg)' : 'var(--acc2)';
  const badgeColor = isGroup ? 'var(--orange)' : 'var(--acc)';
  const badgeText = isGroup ? 'Group User' : 'Individual';

  card.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar" style="background:${avatarBg};color:${avatarColor}">${esc(initial)}</div>
      <div><div class="profile-name">${esc(d.display_name || d.full_name)}</div><div class="profile-meta">${esc(d.tier_id)} · ${esc(d.tier_name || '')} · ${esc(d.store_id || 'HQ')}</div></div>
      <div class="profile-badge" style="background:${badgeBg};color:${badgeColor}">${badgeText}</div>
    </div>
    ${isGroup ? `<div style="padding:8px 12px;background:var(--bg3);border-radius:var(--rd);font-size:11px;color:var(--t2);margin-bottom:14px">Account: <strong>${esc(d.display_label)}</strong></div>` : ''}
    <div class="fg"><label class="lb">Display Name</label><div class="profile-field-value">${esc(d.display_name)}</div></div>
    <div class="fg"><label class="lb">Full Name</label><div class="profile-field-value">${esc(d.full_name)}</div></div>
    <div class="fg"><label class="lb">Phone</label><div class="profile-field-value">${esc(d.phone || '-')}</div></div>
    ${!isGroup && d.email ? `<div class="fg"><label class="lb">Email / Username</label><div class="profile-field-readonly">${esc(d.email || d.username)}</div></div>` : ''}
    <div class="profile-grid">
      <div><div class="lb">Store</div><div class="profile-field-readonly">${esc(d.store_name_th || d.store_id || '-')}</div></div>
      <div><div class="lb">Tier</div><div class="profile-field-readonly">${esc(d.tier_id)} · ${esc(d.tier_name || '')}</div></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:var(--sp-md)">
      <button class="btn btn-primary btn-sm" onclick="Screens.showEditProfile()">Edit Profile</button>
      ${isGroup
        ? '<button class="btn btn-outline btn-sm" onclick="Screens.showChangePinPopup()">Change PIN</button>'
        : '<button class="btn btn-outline btn-sm" onclick="Screens.showChangePasswordPopup()">Change Password</button>'
      }
    </div>
    ${isGroup ? '<div class="inp-hint" style="margin-top:8px">Group users cannot change password. Contact admin if needed.</div>' : ''}`;
}


// ═══ PROFILE POPUPS (working — linked to DB) ═══
function showEditProfile() {
  const d = App.S.profile;
  if (!d) return;
  App.showDialog(`<div class="popup-sheet">
    <div class="popup-header"><div class="popup-title">Edit Profile</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
    <div class="fg"><label class="lb">Display Name *</label><input class="inp" id="pf-nick" value="${esc(d.display_name || '')}"></div>
    <div class="fg"><label class="lb">Full Name *</label><input class="inp" value="${esc(d.full_name || '')}" readonly class="inp-readonly"></div>
    <div class="fg"><label class="lb">Phone</label><input class="inp" id="pf-phone" value="${esc(d.phone || '')}"></div>
    <div class="inp-hint">Email, Store, Tier cannot be changed here.</div>
    <div class="error-msg" id="pf-edit-error"></div>
    <div class="popup-actions"><button class="btn btn-outline" onclick="App.closeDialog()">Cancel</button><button class="btn btn-primary" id="btn-pf-save" onclick="Screens.doSaveProfile()">Save</button></div>
  </div>`);
}

async function doSaveProfile() {
  const display_name = document.getElementById('pf-nick')?.value.trim();
  const phone = document.getElementById('pf-phone')?.value.trim();
  if (!display_name) { App.showError('pf-edit-error', 'Display name is required'); return; }
  const btn = document.getElementById('btn-pf-save');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await API.updateProfile({ display_name, phone });
    App.closeDialog();
    App.toast('Profile updated', 'success');
    // Update memory directly
    App.S.profile.display_name = display_name;
    App.S.profile.phone = phone;
    renderProfileCard(App.S.profile);
    // Update session in localStorage too
    const s = API.getSession();
    if (s) { s.display_name = display_name; localStorage.setItem('spg_session', JSON.stringify(s)); }
    // Bug #4: sync topbar + sidebar with new display name
    if (App.S.session) App.S.session.display_name = display_name;
    const tbName = document.querySelector('.topbar-user .hide-m');
    if (tbName) tbName.textContent = display_name;
    const tbAvatar = document.querySelector('.topbar-avatar');
    if (tbAvatar) tbAvatar.textContent = (display_name || '?').charAt(0).toUpperCase();
    App.buildSidebar();
  } catch (e) {
    App.showError('pf-edit-error', e.message || 'Update failed');
    btn.disabled = false; btn.textContent = 'Save';
  }
}

function showChangePasswordPopup() {
  App.showDialog(`<div class="popup-sheet">
    <div class="popup-header"><div class="popup-title">Change Password</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
    <div class="fg"><label class="lb">Current Password *</label><input class="inp" id="pw-current" type="password" placeholder="••••••••"></div>
    <div class="fg"><label class="lb">New Password * (min 8 characters)</label><input class="inp" id="pw-new" type="password" placeholder="••••••••"></div>
    <div class="fg"><label class="lb">Confirm New Password *</label><input class="inp" id="pw-confirm" type="password" placeholder="••••••••"></div>
    <div class="error-msg" id="pw-error"></div>
    <div class="popup-actions"><button class="btn btn-outline" onclick="App.closeDialog()">Cancel</button><button class="btn btn-primary" id="btn-pw-save" onclick="Screens.doChangePassword()">Change Password</button></div>
  </div>`);
}

async function doChangePassword() {
  const current_password = document.getElementById('pw-current')?.value;
  const new_password = document.getElementById('pw-new')?.value;
  const confirm_password = document.getElementById('pw-confirm')?.value;
  if (!current_password) { App.showError('pw-error', 'กรุณากรอกรหัสผ่านปัจจุบัน'); return; }
  if (!new_password || new_password.length < 8) { App.showError('pw-error', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว'); return; }
  if (new_password !== confirm_password) { App.showError('pw-error', 'Passwords do not match'); return; }
  const btn = document.getElementById('btn-pw-save');
  btn.disabled = true; btn.textContent = 'Changing...';
  try {
    await API.changePassword({ current_password, new_password });
    App.closeDialog();
    App.toast('Password changed', 'success');
  } catch (e) {
    App.showError('pw-error', e.message || 'Failed to change password');
    btn.disabled = false; btn.textContent = 'Change Password';
  }
}

function showChangePinPopup() {
  App.showDialog(`<div class="popup-sheet">
    <div class="popup-header"><div class="popup-title">Change PIN</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
    <div class="fg"><label class="lb">New PIN (6 digits) *</label><input class="inp" id="pin-new" type="password" placeholder="••••••" maxlength="6" inputmode="numeric"></div>
    <div class="fg"><label class="lb">Confirm New PIN *</label><input class="inp" id="pin-confirm" type="password" placeholder="••••••" maxlength="6" inputmode="numeric"></div>
    <div class="error-msg" id="pin-chg-error"></div>
    <div class="popup-actions"><button class="btn btn-outline" onclick="App.closeDialog()">Cancel</button><button class="btn btn-primary" id="btn-pin-save" onclick="Screens.doChangePin()">Change PIN</button></div>
  </div>`);
}

async function doChangePin() {
  const new_pin = document.getElementById('pin-new')?.value.trim();
  const confirm_pin = document.getElementById('pin-confirm')?.value.trim();
  if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) { App.showError('pin-chg-error', 'PIN ต้องเป็นตัวเลข 6 หลัก'); return; }
  if (new_pin !== confirm_pin) { App.showError('pin-chg-error', 'PIN ไม่ตรงกัน'); return; }
  const btn = document.getElementById('btn-pin-save');
  btn.disabled = true; btn.textContent = 'Changing...';
  try {
    await API.changePin({ new_pin });
    App.closeDialog();
    App.toast('PIN changed', 'success');
  } catch (e) {
    App.showError('pin-chg-error', e.message || 'Failed to change PIN');
    btn.disabled = false; btn.textContent = 'Change PIN';
  }
}


// ═══ LOGOUT ═══
async function doLogout() {
  App.showLoader();
  try { await API.logout(); } catch { /* ignore */ }
  API.clearSession();
  App.hideLoader();
  App.S._bundleLoaded = false;
  App.S._profileLoaded = false;
  App.S.session = null;
  App.S.modules = null;
  App.S.profile = null;
  App.clearStoresCache();
  App.clearDeptsCache();
  App.go('login');
  App.toast('Signed out', 'info');
}


// ═══ PUBLIC ═══
return {
  renderLogin, doLogin,
  renderRegister, loadRegisterDropdowns, doRegister,
  renderStaffSelect, loadStaffList, selectStaff,
  showPinPopup, submitPin, showSetPinPopup, submitSetPin,
  renderNewStaff, doCreateStaff,
  renderDashboard, fillDashboard, launchModule,
  renderProfile, loadProfile,
  showEditProfile, doSaveProfile,
  showChangePasswordPopup, doChangePassword,
  showChangePinPopup, doChangePin,
  doLogout,
};

})();
