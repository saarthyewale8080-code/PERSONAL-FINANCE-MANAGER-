/* ==========================================
   FinanceFlow India — Auth Page JS
   ========================================== */

// Redirect if already logged in
if (localStorage.getItem('ff_token')) {
  window.location.href = 'dashboard.html';
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`form-${tab}`).classList.add('active');
  // Clear errors
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
  el.style.display = 'flex';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (loading) {
    btn.disabled = true;
    const span = btn.querySelector('span');
    span._orig = span.textContent;
    span.innerHTML = '<span class="spinner"></span>';
    btn.querySelector('i').style.display = 'none';
  } else {
    btn.disabled = false;
    const span = btn.querySelector('span');
    span.textContent = span._orig || span.textContent;
    btn.querySelector('i').style.display = '';
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  document.getElementById('login-error').style.display = 'none';

  if (!email || !password) {
    showError('login-error', 'Please enter your email and password.');
    return;
  }

  setLoading('login-btn', true);
  try {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('ff_token', data.token);
    localStorage.setItem('ff_user', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('login-error', err.message);
    setLoading('login-btn', false);
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  document.getElementById('register-error').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';

  if (!name || !email || !password) {
    showError('register-error', 'All fields are required.');
    return;
  }

  setLoading('register-btn', true);
  try {
    const data = await api.auth.register({ name, email, password });
    localStorage.setItem('ff_token', data.token);
    localStorage.setItem('ff_user', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('register-error', err.message);
    setLoading('register-btn', false);
  }
}

// Allow pressing Enter to submit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm.id === 'form-login') handleLogin();
    else handleRegister();
  }
});
