// ============================================================
// SCRUMFLOW PRO · AUTHENTICATION MODULE
// ============================================================

(function () {
  'use strict';

  // Dynamic API Base URL resolution
  function getApiUrl() {
    const custom = localStorage.getItem('scrumflow_custom_api_url');
    if (custom) return custom.replace(/\/+$/, '');

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
    }
    return window.SCRUMFLOW_API_URL || 'https://scrumflow-backend.vercel.app/api';
  }

  let API_URL = getApiUrl();
  let isApiOnline = false;

  // DOM Elements
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginMessage = document.getElementById('loginMessage');
  const registerMessage = document.getElementById('registerMessage');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const authStatusDot = document.getElementById('authStatusDot');
  const authStatusText = document.getElementById('authStatusText');
  const changeApiBtn = document.getElementById('changeApiBtn');

  // ===== CHECK API HEALTH ON LOAD =====
  async function checkApiHealth() {
    if (!authStatusDot || !authStatusText) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        isApiOnline = true;
        authStatusDot.className = 'status-dot online';
        authStatusText.textContent = 'Backend API Connected';
      } else {
        throw new Error('API non-200');
      }
    } catch {
      isApiOnline = false;
      authStatusDot.className = 'status-dot offline';
      authStatusText.textContent = 'Local Storage Mode';
    }
  }

  checkApiHealth();

  // ===== CONFIGURE CUSTOM API URL =====
  if (changeApiBtn) {
    changeApiBtn.addEventListener('click', () => {
      const current = localStorage.getItem('scrumflow_custom_api_url') || API_URL;
      const newUrl = prompt('Enter your Backend API Base URL (e.g. http://localhost:5000/api or https://your-backend.onrender.com/api):', current);
      if (newUrl !== null) {
        const trimmed = newUrl.trim();
        if (trimmed) {
          localStorage.setItem('scrumflow_custom_api_url', trimmed);
        } else {
          localStorage.removeItem('scrumflow_custom_api_url');
        }
        API_URL = getApiUrl();
        checkApiHealth();
        alert('API URL updated: ' + API_URL);
      }
    });
  }

  // ===== TAB SWITCHING =====
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const tab = this.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
      });

      if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
      } else {
        document.getElementById('registerForm').classList.add('active');
      }

      if (loginMessage) loginMessage.style.display = 'none';
      if (registerMessage) registerMessage.style.display = 'none';
    });
  });

  // ===== LOCAL STORAGE AUTH HELPER =====
  function getLocalUsers() {
    return JSON.parse(localStorage.getItem('scrumflow_local_users') || '[]');
  }
  function saveLocalUsers(users) {
    localStorage.setItem('scrumflow_local_users', JSON.stringify(users));
  }

  // ===== LOGIN =====
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginMessage.style.display = 'none';

    // Try Backend API First
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('scrumflow_user', JSON.stringify(data.user));
        localStorage.setItem('scrumflow_token', data.token);

        loginMessage.textContent = '✅ Login successful! Redirecting...';
        loginMessage.className = 'auth-message success';
        loginMessage.style.display = 'block';

        setTimeout(() => {
          window.location.href = 'pages/dashboard.html';
        }, 800);
        return;
      } else {
        loginMessage.textContent = '❌ ' + data.message;
        loginMessage.className = 'auth-message error';
        loginMessage.style.display = 'block';
        return;
      }
    } catch (error) {
      console.warn('API login unavailable, checking local fallback...', error);
    }

    // Offline / Local fallback authentication
    const localUsers = getLocalUsers();
    const foundUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (foundUser) {
      if (foundUser.password === password) {
        localStorage.setItem('scrumflow_user', JSON.stringify({
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email
        }));
        localStorage.setItem('scrumflow_token', 'local-token-' + foundUser.id);

        loginMessage.textContent = '✅ Login successful (Offline Mode)! Redirecting...';
        loginMessage.className = 'auth-message success';
        loginMessage.style.display = 'block';

        setTimeout(() => {
          window.location.href = 'pages/dashboard.html';
        }, 800);
        return;
      } else {
        loginMessage.textContent = '❌ Invalid credentials.';
        loginMessage.className = 'auth-message error';
        loginMessage.style.display = 'block';
        return;
      }
    }

    // If not found in local users and API down, log in as ad-hoc session
    const guestUser = {
      id: 'local_' + Date.now(),
      name: email.split('@')[0],
      email: email,
      isLocal: true
    };
    localStorage.setItem('scrumflow_user', JSON.stringify(guestUser));
    localStorage.setItem('scrumflow_token', 'local-token-' + guestUser.id);

    loginMessage.textContent = '⚡ Logged in with Local Workspace. Redirecting...';
    loginMessage.className = 'auth-message success';
    loginMessage.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'pages/dashboard.html';
    }, 800);
  });

  // ===== REGISTER =====
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    registerMessage.style.display = 'none';

    if (password !== confirmPassword) {
      registerMessage.textContent = '❌ Passwords do not match.';
      registerMessage.className = 'auth-message error';
      registerMessage.style.display = 'block';
      return;
    }

    // Try Backend API First
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        registerMessage.textContent = '✅ Registration successful! Please login.';
        registerMessage.className = 'auth-message success';
        registerMessage.style.display = 'block';

        setTimeout(() => {
          document.querySelector('[data-tab="login"]').click();
          document.getElementById('loginEmail').value = email;
          document.getElementById('loginPassword').value = '';
        }, 1500);
        return;
      } else {
        registerMessage.textContent = '❌ ' + data.message;
        registerMessage.className = 'auth-message error';
        registerMessage.style.display = 'block';
        return;
      }
    } catch (error) {
      console.warn('API registration unavailable, falling back to local storage...', error);
    }

    // Local Storage Registration Fallback
    const localUsers = getLocalUsers();
    if (localUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      registerMessage.textContent = '❌ User already exists with this email.';
      registerMessage.className = 'auth-message error';
      registerMessage.style.display = 'block';
      return;
    }

    localUsers.push({
      id: 'usr_' + Date.now(),
      name,
      email,
      password
    });
    saveLocalUsers(localUsers);

    registerMessage.textContent = '✅ Registered locally! Please login.';
    registerMessage.className = 'auth-message success';
    registerMessage.style.display = 'block';

    setTimeout(() => {
      document.querySelector('[data-tab="login"]').click();
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = '';
    }, 1200);
  });

  // ===== CHECK AUTH ON LOAD =====
  const token = localStorage.getItem('scrumflow_token');
  if (token && window.location.pathname.includes('index.html')) {
    window.location.href = 'pages/dashboard.html';
  }

})();