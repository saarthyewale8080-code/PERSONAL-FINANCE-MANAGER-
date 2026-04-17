/* ==========================================
   FinanceFlow India — API Helper (Frontend)
   Base URL points to the backend at port 5000
   ========================================== */

const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('ff_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed.');
    return data;
  } catch (err) {
    throw err;
  }
}

const api = {
  auth: {
    register: (d) => apiRequest('/auth/register', 'POST', d),
    login: (d) => apiRequest('/auth/login', 'POST', d),
    me: () => apiRequest('/auth/me'),
    updateProfile: (d) => apiRequest('/auth/profile', 'PUT', d),
    changePassword: (d) => apiRequest('/auth/password', 'PUT', d),
  },
  transactions: {
    getAll: (month, year, limit) => {
      let url = `/transactions?month=${month}&year=${year}`;
      if (limit) url += `&limit=${limit}`;
      return apiRequest(url);
    },
    create: (d) => apiRequest('/transactions', 'POST', d),
    delete: (id) => apiRequest(`/transactions/${id}`, 'DELETE'),
  },
  budgets: {
    getAll: (month, year) => apiRequest(`/budgets?month=${month}&year=${year}`),
    set: (d) => apiRequest('/budgets', 'POST', d),
    delete: (id) => apiRequest(`/budgets/${id}`, 'DELETE'),
  },
  analytics: {
    summary: (month, year) => apiRequest(`/analytics/summary?month=${month}&year=${year}`),
    categories: (month, year) => apiRequest(`/analytics/categories?month=${month}&year=${year}`),
    trend: () => apiRequest('/analytics/trend'),
  },
  settings: {
    get: () => apiRequest('/settings'),
    update: (d) => apiRequest('/settings', 'PUT', d),
  },
};

// ---- Utility Helpers ----
function formatINR(amount) {
  return '₹' + Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

const CATEGORY_ICONS = {
  Food: '🍛', Travel: '🚕', Grocery: '🛒', Utilities: '⚡',
  Medical: '🏥', Education: '📚', Entertainment: '🎬', Salary: '💼', Other: '📌',
};

const CATEGORY_CLASSES = {
  Food: 'tx-icon-food', Travel: 'tx-icon-travel', Grocery: 'tx-icon-grocery',
  Utilities: 'tx-icon-utilities', Medical: 'tx-icon-medical', Education: 'tx-icon-education',
  Entertainment: 'tx-icon-entertainment', Salary: 'tx-icon-salary', Other: 'tx-icon-other',
};
