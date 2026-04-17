/* ==========================================
   FinanceFlow India — Main Dashboard App JS
   ========================================== */

// ---- Auth Guard ----
const token = localStorage.getItem('ff_token');
if (!token) window.location.href = '/';

// ---- State ----
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let currentScreen = 'dashboard';
let currentUser = null;
let selectedTxType = 'expense';
let selectedCat = '';
let notifPrefs = {};
let trendChart = null;
let categoryChart = null;
let alertCount = 0;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  updateMonthLabel();
  try {
    currentUser = await api.auth.me();
    populateUserInfo(currentUser);
    await loadDashboard();
  } catch (e) {
    logout();
  }
});

// ---- User Info ----
function populateUserInfo(user) {
  const initial = (user.name || 'U')[0].toUpperCase();
  setText('sidebar-name', user.name);
  setText('sidebar-email', user.email);
  setText('hero-name', user.name);
  setText('topbar-avatar', initial);
  setText('sidebar-avatar', initial);
  // Pre-fill settings
  setVal('s-name', user.name);
  setVal('s-email', user.email);
}

// ---- Month Selector ----
function updateMonthLabel() {
  const d = new Date(currentYear, currentMonth - 1, 1);
  setText('month-label', d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }));
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  updateMonthLabel();
  refreshCurrentScreen();
}

function refreshCurrentScreen() {
  if (currentScreen === 'dashboard') loadDashboard();
  else if (currentScreen === 'analytics') loadAnalytics();
  else if (currentScreen === 'budget') loadBudget();
  else if (currentScreen === 'alerts') loadAlerts();
}

// ---- Screen Navigation ----
function showScreen(screen, el) {
  if (el) {
    el.preventDefault && el.preventDefault();
    // Update sidebar links
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    const sidebarLink = document.querySelector(`.nav-link[data-screen="${screen}"]`);
    if (sidebarLink) sidebarLink.classList.add('active');
    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach((l) => l.classList.remove('active'));
    const bnLink = document.querySelector(`.bottom-nav-item[data-screen="${screen}"]`);
    if (bnLink) bnLink.classList.add('active');
  }

  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`).classList.add('active');

  const titles = { dashboard: 'Dashboard', analytics: 'Analytics', budget: 'Budget', alerts: 'Alerts & Notifications', settings: 'Settings' };
  setText('topbar-title', titles[screen] || screen);

  // Hide FAB on settings
  const fab = document.getElementById('fab-btn');
  fab.style.display = screen === 'settings' ? 'none' : 'flex';

  currentScreen = screen;
  closeSidebar();

  // Load data for the screen
  if (screen === 'dashboard') loadDashboard();
  else if (screen === 'analytics') loadAnalytics();
  else if (screen === 'budget') loadBudget();
  else if (screen === 'alerts') loadAlerts();
  else if (screen === 'settings') loadSettings();
}

// ---- SIDEBAR ----
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ---- LOGOUT ----
function logout() {
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
  window.location.href = '/';
}

// ================================================
// DASHBOARD SCREEN
// ================================================
async function loadDashboard() {
  try {
    const [summary, transactions] = await Promise.all([
      api.analytics.summary(currentMonth, currentYear),
      api.transactions.getAll(currentMonth, currentYear, 10),
    ]);

    // Hero balance
    setText('hero-balance', formatINR(summary.totalBalance));
    setText('dash-income', formatINR(summary.income));
    setText('dash-expenses', formatINR(summary.expenses));
    setText('dash-savings', formatINR(summary.savings));

    // Budget used
    const budgets = await api.budgets.getAll(currentMonth, currentYear);
    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    setText('dash-budget', formatINR(totalBudget));

    // Recent transactions
    renderTransactions(transactions);

    // Update alert count
    await computeAlertCount();
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function renderTransactions(transactions) {
  const container = document.getElementById('recent-transactions');
  if (!transactions.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet.<br/>Add one using the + button below.</p></div>`;
    return;
  }

  container.innerHTML = transactions.map((tx) => `
    <div class="tx-item">
      <div class="tx-icon ${CATEGORY_CLASSES[tx.category] || 'tx-icon-other'}">${CATEGORY_ICONS[tx.category] || '📌'}</div>
      <div class="tx-info">
        <div class="tx-category">${tx.category === 'Salary' ? 'Salary Credit' : tx.category}</div>
        <div class="tx-desc">${tx.description || formatDate(tx.date)}</div>
      </div>
      <div class="tx-date">${formatDate(tx.date)}</div>
      <div class="tx-amount ${tx.type === 'income' ? 'tx-income' : 'tx-expense'}">
        ${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount)}
      </div>
      <button class="tx-delete" onclick="deleteTransaction('${tx._id}')" title="Delete"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await api.transactions.delete(id);
    loadDashboard();
  } catch (e) {
    alert('Could not delete: ' + e.message);
  }
}

// ================================================
// ADD TRANSACTION MODAL
// ================================================
function openTransactionModal() {
  selectedCat = '';
  selectedTxType = 'expense';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-error').style.display = 'none';
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('selected'));
  setTxType('expense');
  document.getElementById('modal-transaction').classList.add('open');
}

function closeTransactionModal(e) {
  if (e && e.target !== document.getElementById('modal-transaction')) return;
  document.getElementById('modal-transaction').classList.remove('open');
}

function setTxType(type) {
  selectedTxType = type;
  selectedCat = '';
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('selected'));
  document.getElementById('type-expense').classList.toggle('active', type === 'expense');
  document.getElementById('type-income').classList.toggle('active', type === 'income');
  document.getElementById('cat-grid').style.display = type === 'expense' ? 'grid' : 'none';
  document.getElementById('income-cat-group').style.display = type === 'income' ? 'block' : 'none';
}

function selectCat(btn) {
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedCat = btn.dataset.cat;
}

async function submitTransaction() {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const description = document.getElementById('tx-desc').value.trim();
  const errEl = document.getElementById('tx-error');
  errEl.style.display = 'none';

  if (!amount || amount <= 0) { showInlineErr(errEl, 'Please enter a valid amount.'); return; }
  if (!selectedCat) { showInlineErr(errEl, 'Please select a category.'); return; }
  if (!date) { showInlineErr(errEl, 'Please select a date.'); return; }

  const btn = document.getElementById('tx-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Adding...';

  try {
    await api.transactions.create({ type: selectedTxType, amount, category: selectedCat, description, date });
    document.getElementById('modal-transaction').classList.remove('open');
    loadDashboard();
  } catch (e) {
    showInlineErr(errEl, e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Add Transaction</span><i class="fas fa-check"></i>';
  }
}

// ================================================
// ANALYTICS SCREEN
// ================================================
async function loadAnalytics() {
  try {
    const [summary, categories, trend] = await Promise.all([
      api.analytics.summary(currentMonth, currentYear),
      api.analytics.categories(currentMonth, currentYear),
      api.analytics.trend(),
    ]);

    //  Summary numbers
    setText('an-income', '+' + formatINR(summary.income));
    setText('an-expenses', '-' + formatINR(summary.expenses));
    setText('an-savings', formatINR(summary.savings));

    // Category table
    const tableEl = document.getElementById('category-table');
    if (categories.length) {
      tableEl.innerHTML = categories.map((c) => `
        <div class="cat-table-row">
          <span class="cat-table-name">${CATEGORY_ICONS[c.category] || '📌'} ${c.category}</span>
          <span class="cat-table-val">${formatINR(c.total)}</span>
        </div>
      `).join('');
    } else {
      tableEl.innerHTML = `<div class="empty-state"><i class="fas fa-chart-pie"></i><p>No spending data for this month.</p></div>`;
    }

    // Trend chart
    renderTrendChart(trend);
    renderCategoryChart(categories);
  } catch (e) {
    console.error('Analytics error:', e);
  }
}

function renderTrendChart(trend) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map((t) => t.label),
      datasets: [
        {
          label: 'Income',
          data: trend.map((t) => t.income),
          borderColor: '#059669',
          backgroundColor: 'rgba(5,150,105,0.08)',
          tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7,
          borderWidth: 2.5, pointBackgroundColor: '#059669',
        },
        {
          label: 'Expenses',
          data: trend.map((t) => t.expenses),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.07)',
          tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7,
          borderWidth: 2.5, pointBackgroundColor: '#dc2626',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Poppins', size: 12 }, usePointStyle: true } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v), font: { family: 'Poppins', size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: { ticks: { font: { family: 'Poppins', size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('category-chart').getContext('2d');
  if (categoryChart) categoryChart.destroy();

  if (!categories.length) {
    return;
  }

  const colors = ['#1e40af','#3b82f6','#dc2626','#f59e0b','#059669','#8b5cf6','#ec4899','#0ea5e9'];
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map((c) => c.category),
      datasets: [{
        data: categories.map((c) => c.total),
        backgroundColor: colors.slice(0, categories.length),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 12 }, padding: 16, usePointStyle: true } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` }
        }
      }
    }
  });
}

// ================================================
// BUDGET SCREEN
// ================================================
async function loadBudget() {
  try {
    const [budgets, categories, summary] = await Promise.all([
      api.budgets.getAll(currentMonth, currentYear),
      api.analytics.categories(currentMonth, currentYear),
      api.analytics.summary(currentMonth, currentYear),
    ]);

    // Build spending map
    const spendingMap = {};
    categories.forEach((c) => { spendingMap[c.category] = c.total; });

    // Alert bar
    const savings = summary.savings;
    const alertBar = document.getElementById('budget-alert-bar');
    if (savings > 0) {
      alertBar.innerHTML = `<div class="alert-item alert-success" style="margin-bottom:16px;"><span class="alert-icon">🎉</span><div class="alert-text">You are saving <strong>${formatINR(savings)}</strong> this month!</div></div>`;
    } else if (savings < 0) {
      alertBar.innerHTML = `<div class="alert-item alert-danger" style="margin-bottom:16px;"><span class="alert-icon">⚠️</span><div class="alert-text">You are overspending by <strong>${formatINR(Math.abs(savings))}</strong> this month.</div></div>`;
    } else {
      alertBar.innerHTML = '';
    }

    const listEl = document.getElementById('budget-list');
    if (!budgets.length) {
      listEl.innerHTML = `<div class="empty-state"><i class="fas fa-wallet"></i><p>No budgets set yet.<br/>Click "Set Budget" to get started.</p></div>`;
      return;
    }

    listEl.innerHTML = budgets.map((b) => {
      const spent = spendingMap[b.category] || 0;
      const pct = Math.min(Math.round((spent / b.limit) * 100), 115);
      let status = 'on-track', statusLabel = 'On Track', fillClass = 'fill-normal';
      if (pct >= 100) { status = 'exceeded'; statusLabel = 'Exceeded!'; fillClass = 'fill-exceeded'; }
      else if (pct >= 75) { status = 'warning'; statusLabel = 'Approaching Limit'; fillClass = 'fill-warning'; }

      return `
        <div class="budget-item">
          <div class="budget-item-header">
            <span class="budget-cat-name">${CATEGORY_ICONS[b.category] || '📌'} ${b.category}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="budget-status-tag status-${status}">${statusLabel}</span>
              <button class="budget-delete" onclick="deleteBudget('${b._id}')" title="Remove budget"><i class="fas fa-times"></i></button>
            </div>
          </div>
          <div class="budget-progress">
            <div class="budget-progress-fill ${fillClass}" style="width:${Math.min(pct,100)}%;"></div>
          </div>
          <div class="budget-amounts">
            <span>${formatINR(spent)} / ${formatINR(b.limit)}</span>
            <span>${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Budget error:', e);
  }
}

function openBudgetModal() {
  document.getElementById('budget-cat').value = '';
  document.getElementById('budget-limit').value = '';
  document.getElementById('budget-error').style.display = 'none';
  document.getElementById('modal-budget').classList.add('open');
}

function closeBudgetModal(e) {
  if (e && e.target !== document.getElementById('modal-budget')) return;
  document.getElementById('modal-budget').classList.remove('open');
}

async function submitBudget() {
  const category = document.getElementById('budget-cat').value;
  const limit = parseFloat(document.getElementById('budget-limit').value);
  const errEl = document.getElementById('budget-error');
  errEl.style.display = 'none';

  if (!category) { showInlineErr(errEl, 'Please select a category.'); return; }
  if (!limit || limit <= 0) { showInlineErr(errEl, 'Please enter a valid limit.'); return; }

  try {
    await api.budgets.set({ category, limit, month: currentMonth, year: currentYear });
    document.getElementById('modal-budget').classList.remove('open');
    loadBudget();
  } catch (e) {
    showInlineErr(errEl, e.message);
  }
}

async function deleteBudget(id) {
  if (!confirm('Remove this budget?')) return;
  try {
    await api.budgets.delete(id);
    loadBudget();
  } catch (e) {
    alert('Could not delete: ' + e.message);
  }
}

// ================================================
// ALERTS SCREEN
// ================================================
async function loadAlerts() {
  try {
    const [budgets, categories, summary] = await Promise.all([
      api.budgets.getAll(currentMonth, currentYear),
      api.analytics.categories(currentMonth, currentYear),
      api.analytics.summary(currentMonth, currentYear),
    ]);

    const spendingMap = {};
    categories.forEach((c) => { spendingMap[c.category] = c.total; });

    const alerts = [];

    budgets.forEach((b) => {
      const spent = spendingMap[b.category] || 0;
      const pct = Math.round((spent / b.limit) * 100);
      if (pct >= 100) {
        alerts.push({ type: 'danger', icon: '⚠️', msg: `<strong>Budget Exceeded:</strong> Your ${b.category} budget is exceeded by ${formatINR(spent - b.limit)} (${pct}% used).` });
      } else if (pct >= 75) {
        alerts.push({ type: 'warning', icon: '⚡', msg: `<strong>Approaching Limit:</strong> You have used ${pct}% of your ${b.category} budget (${formatINR(spent)} of ${formatINR(b.limit)}).` });
      }
    });

    if (summary.savings > 0) {
      alerts.push({ type: 'success', icon: '✅', msg: `<strong>Great Job!</strong> You are saving ${formatINR(summary.savings)} this month!` });
    }

    const savingRate = summary.income > 0 ? (summary.savings / summary.income) * 100 : 0;
    if (savingRate >= 20 && summary.income > 0) {
      alerts.push({ type: 'info', icon: '🏆', msg: `<strong>Milestone:</strong> You have a ${Math.round(savingRate)}% savings rate this month. Excellent!` });
    }

    if (summary.expenses > summary.income && summary.income > 0) {
      alerts.push({ type: 'danger', icon: '🔴', msg: `<strong>Overspending Alert:</strong> Your expenses exceed your income by ${formatINR(summary.expenses - summary.income)} this month.` });
    }

    // Tips
    const tips = [
      'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
      'Cooking at home can save up to ₹5,000 monthly.',
      'Set up automatic savings on salary day.',
      'Review subscriptions quarterly to cut unused services.',
    ];
    alerts.push({ type: 'info', icon: '💡', msg: `<strong>Tip:</strong> ${tips[new Date().getDate() % tips.length]}` });

    // Update badge
    alertCount = alerts.filter((a) => a.type === 'danger' || a.type === 'warning').length;
    updateAlertBadge(alertCount);

    const listEl = document.getElementById('alerts-list');
    if (!alerts.length) {
      listEl.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No alerts. You're on track! 🎉</p></div>`;
    } else {
      listEl.innerHTML = alerts.map((a) => `
        <div class="alert-item alert-${a.type}">
          <span class="alert-icon">${a.icon}</span>
          <div class="alert-text">${a.msg}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Alerts error:', e);
  }
}

async function computeAlertCount() {
  try {
    const [budgets, categories] = await Promise.all([
      api.budgets.getAll(currentMonth, currentYear),
      api.analytics.categories(currentMonth, currentYear),
    ]);
    const spendingMap = {};
    categories.forEach((c) => { spendingMap[c.category] = c.total; });
    let count = 0;
    budgets.forEach((b) => {
      const pct = Math.round(((spendingMap[b.category] || 0) / b.limit) * 100);
      if (pct >= 75) count++;
    });
    updateAlertBadge(count);
  } catch (e) {}
}

function updateAlertBadge(count) {
  const badges = [document.getElementById('alert-badge'), document.getElementById('topbar-alert-badge')];
  badges.forEach((b) => {
    if (b) {
      b.style.display = count > 0 ? (b.id === 'alert-badge' ? 'flex' : 'flex') : 'none';
      b.textContent = count;
    }
  });
}

// ================================================
// SETTINGS SCREEN
// ================================================
async function loadSettings() {
  try {
    notifPrefs = await api.settings.get();
    setToggle('tog-budget', notifPrefs.budgetAlerts);
    setToggle('tog-spending', notifPrefs.spendingNotifs);
    setToggle('tog-weekly', notifPrefs.weeklySummary);
    // Restore user info
    if (currentUser) {
      setVal('s-name', currentUser.name);
      setVal('s-email', currentUser.email);
    }
  } catch (e) {}
}

async function saveProfile() {
  const name = getVal('s-name');
  const email = getVal('s-email');
  const msgEl = document.getElementById('profile-msg');
  try {
    const user = await api.auth.updateProfile({ name, email });
    currentUser = user;
    populateUserInfo(user);
    showMsg(msgEl, 'success', 'Profile updated successfully!');
  } catch (e) {
    showMsg(msgEl, 'error', e.message);
  }
}

async function changePassword() {
  const currentPassword = getVal('s-curr-pw');
  const newPassword = getVal('s-new-pw');
  const msgEl = document.getElementById('pw-msg');
  try {
    await api.auth.changePassword({ currentPassword, newPassword });
    setVal('s-curr-pw', '');
    setVal('s-new-pw', '');
    showMsg(msgEl, 'success', 'Password changed successfully!');
  } catch (e) {
    showMsg(msgEl, 'error', e.message);
  }
}

async function toggleNotif(key, toggleId) {
  notifPrefs[key] = !notifPrefs[key];
  setToggle(toggleId, notifPrefs[key]);
  try {
    await api.settings.update(notifPrefs);
  } catch (e) {}
}

// ================================================
// DOM HELPERS
// ================================================
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function setToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!on);
}

function showInlineErr(el, msg) {
  el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
  el.style.display = 'flex';
}

function showMsg(el, type, msg) {
  el.className = `form-alert form-alert-${type}`;
  el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}
