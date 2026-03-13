/**
 * Version 1.3 | 14 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG App — Home Module — api_home.js
 * v1.3: add account detail, create account, audit trail
 * ═══════════════════════════════════════════
 */

const API = (() => {
  const BASE_URL = 'https://ahvzblrfzhtrjhvbzdhg.supabase.co/functions/v1/home';
  const TOKEN_KEY = 'spg_token';
  const SESSION_KEY = 'spg_session';
  const ACCOUNT_KEY = 'spg_account';

  async function post(action, data = {}) {
    const resp = await fetch(`${BASE_URL}?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await resp.json();
    if (!json.success) { const e = new Error(json.error?.message || 'Unknown error'); e.code = json.error?.code; e.key = json.error?.key; throw e; }
    return json.data;
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(token) { if (token) localStorage.setItem(TOKEN_KEY, token); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }
  function saveSession(data) {
    const s = { token: data.session_id, account_id: data.account_id, account_type: data.account_type, display_label: data.display_label, tier_id: data.tier_id, tier_name: data.tier_name, store_id: data.store_id, dept_id: data.dept_id, user_id: data.user_id || '', display_name: data.display_name || '', full_name: data.full_name || '', expires_at: data.expires_at };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setToken(data.session_id);
    return s;
  }
  function getSession() { try { const raw = localStorage.getItem(SESSION_KEY); if (!raw) return null; const data = JSON.parse(raw); if (data.expires_at && new Date(data.expires_at) < new Date()) { clearSession(); return null; } return data; } catch { return null; } }
  function clearSession() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(ACCOUNT_KEY); clearToken(); }
  function saveAccountTemp(data) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data)); }
  function getAccountTemp() { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch { return null; } }
  function tb(extra = {}) { return { token: getToken(), ...extra }; }

  return {
    getToken, setToken, clearToken, saveSession, getSession, clearSession, saveAccountTemp, getAccountTemp,
    // Auth
    login: (username, password) => post('login', { username, password }),
    register: (data) => post('register', data),
    getUsers: (account_id) => post('get_users', { account_id }),
    switchUser: (account_id, user_id, pin) => post('switch_user', { account_id, user_id, pin }),
    setUserPin: (account_id, user_id, new_pin) => post('set_user_pin', { account_id, user_id, new_pin }),
    createUser: (data) => post('create_user', data),
    logout: () => post('logout', tb()),
    // Dashboard + Profile
    initBundle: () => post('init_bundle', tb()),
    getProfile: () => post('get_profile', tb()),
    updateProfile: (data) => post('update_profile', tb(data)),
    changePassword: (data) => post('change_password', tb(data)),
    changePin: (data) => post('change_pin', tb(data)),
    // Public
    getStores: () => post('get_stores', {}),
    getDepartments: () => post('get_departments', {}),
    // Admin
    adminGetAccounts: (f = {}) => post('admin_get_accounts', tb(f)),
    adminCreateAccount: (data) => post('admin_create_account', tb(data)),
    adminUpdateAccount: (data) => post('admin_update_account', tb(data)),
    adminGetPermissions: () => post('admin_get_permissions', tb()),
    adminUpdatePermission: (module_id, tier_id, access_level) => post('admin_update_permission', tb({ module_id, tier_id, access_level })),
    adminGetRegistrations: (f = {}) => post('admin_get_registrations', tb(f)),
    adminReviewRegistration: (data) => post('admin_review_registration', tb(data)),
    adminGetModuleAccess: () => post('admin_get_module_access', tb()),
    adminSetModuleAccess: (account_id, module_id, module_tier) => post('admin_set_module_access', tb({ account_id, module_id, module_tier })),
    adminRemoveModuleAccess: (account_id, module_id) => post('admin_remove_module_access', tb({ account_id, module_id })),
    adminGetUsers: (account_id) => post('admin_get_users', tb({ account_id })),
    adminUpdateUser: (data) => post('admin_update_user', tb(data)),
    adminGetAuditLog: (f = {}) => post('admin_get_audit_log', tb(f)),
    // Master Data
    adminGetAllModules: () => post('admin_get_all_modules', tb()),
    adminUpdateModule: (data) => post('admin_update_module', tb(data)),
    adminGetAllStores: () => post('admin_get_all_stores', tb()),
    adminCreateStore: (data) => post('admin_create_store', tb(data)),
    adminUpdateStore: (data) => post('admin_update_store', tb(data)),
    adminGetAllDepts: () => post('admin_get_all_depts', tb()),
    adminCreateDept: (data) => post('admin_create_dept', tb(data)),
    adminUpdateDept: (data) => post('admin_update_dept', tb(data)),
  };
})();
