// ============================================================
// SCRUMFLOW PRO · AUTHENTICATION MODULE
// ============================================================

(function() {
  'use strict';

  // API Base URL - Update this with your deployed backend URL
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://your-backend-url.vercel.app/api';

  // DOM Elements
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginMessage = document.getElementById('loginMessage');
  const registerMessage = document.getElementById('registerMessage');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // ===== TAB SWITCHING =====
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tab = this.dataset.tab;
      
      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding form
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
      });
      
      if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
      } else {
        document.getElementById('registerForm').classList.add('active');
      }
      
      // Clear messages
      loginMessage.style.display = 'none';
      registerMessage.style.display = 'none';
    });
  });

  // ===== LOGIN =====
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Clear previous message
    loginMessage.style.display = 'none';
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store user data
        localStorage.setItem('scrumflow_user', JSON.stringify(data.user));
        localStorage.setItem('scrumflow_token', data.token);
        
        // Show success
        loginMessage.textContent = '✅ Login successful! Redirecting...';
        loginMessage.className = 'auth-message success';
        loginMessage.style.display = 'block';
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        loginMessage.textContent = '❌ ' + data.message;
        loginMessage.className = 'auth-message error';
        loginMessage.style.display = 'block';
      }
    } catch (error) {
      loginMessage.textContent = '❌ Network error. Please try again.';
      loginMessage.className = 'auth-message error';
      loginMessage.style.display = 'block';
      console.error('Login error:', error);
    }
  });

  // ===== REGISTER =====
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Clear previous message
    registerMessage.style.display = 'none';
    
    // Validate passwords match
    if (password !== confirmPassword) {
      registerMessage.textContent = '❌ Passwords do not match.';
      registerMessage.className = 'auth-message error';
      registerMessage.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        registerMessage.textContent = '✅ Registration successful! Please login.';
        registerMessage.className = 'auth-message success';
        registerMessage.style.display = 'block';
        
        // Switch to login tab after 2 seconds
        setTimeout(() => {
          document.querySelector('[data-tab="login"]').click();
          document.getElementById('loginEmail').value = email;
          document.getElementById('loginPassword').value = '';
        }, 2000);
      } else {
        registerMessage.textContent = '❌ ' + data.message;
        registerMessage.className = 'auth-message error';
        registerMessage.style.display = 'block';
      }
    } catch (error) {
      registerMessage.textContent = '❌ Network error. Please try again.';
      registerMessage.className = 'auth-message error';
      registerMessage.style.display = 'block';
      console.error('Registration error:', error);
    }
  });

  // ===== CHECK AUTH ON LOAD =====
  const token = localStorage.getItem('scrumflow_token');
  if (token && window.location.pathname.includes('index.html')) {
    window.location.href = 'dashboard.html';
  }

})();