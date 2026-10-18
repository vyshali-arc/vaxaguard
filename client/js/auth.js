/**
 * VaxaGuard Authentication Handler
 * Supports Sign In, Registration, Role selection, and 1-Click Demo accounts.
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authHeading = document.getElementById('auth-heading');
  const authSubheading = document.getElementById('auth-subheading');
  const authAlert = document.getElementById('auth-alert');
  const regRoleSelect = document.getElementById('reg-role');
  const orgNameContainer = document.getElementById('org-name-container');

  // Check URL params for pre-selecting tab or alerts
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  const expired = urlParams.get('expired');
  const roleParam = urlParams.get('role');

  if (expired) {
    showAlert('Your session has expired. Please log in again.', 'warning');
  }

  // Handle Tab Switch
  function switchTab(mode) {
    if (mode === 'register') {
      tabLogin.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
      tabLogin.classList.add('text-slate-500');
      tabRegister.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
      tabRegister.classList.remove('text-slate-500');

      formLogin.classList.add('hidden');
      formRegister.classList.remove('hidden');

      authHeading.textContent = 'Create Your Account';
      authSubheading.textContent = 'Join VaxaGuard to manage vaccination records for your family or organization.';
    } else {
      tabRegister.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
      tabRegister.classList.add('text-slate-500');
      tabLogin.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
      tabLogin.classList.remove('text-slate-500');

      formRegister.classList.add('hidden');
      formLogin.classList.remove('hidden');

      authHeading.textContent = 'Welcome Back';
      authSubheading.textContent = 'Access your family and dependent vaccination records.';
    }
    clearAlert();
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));
  }

  if (requestedTab === 'register') {
    switchTab('register');
  }

  // Show organization name field if NGO / Orphanage role selected
  if (regRoleSelect && orgNameContainer) {
    if (roleParam === 'ngo') {
      regRoleSelect.value = 'ngo_coordinator';
      orgNameContainer.classList.remove('hidden');
      switchTab('register');
    }

    regRoleSelect.addEventListener('change', (e) => {
      if (e.target.value === 'ngo_coordinator') {
        orgNameContainer.classList.remove('hidden');
      } else {
        orgNameContainer.classList.add('hidden');
      }
    });
  }

  // Password visibility toggles
  document.querySelectorAll('.toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && (input.type === 'password' || input.type === 'text')) {
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        btn.innerHTML = `<i data-lucide="${isPwd ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
        lucide.createIcons({ root: btn });
      }
    });
  });

  function showAlert(msg, type = 'error') {
    if (!authAlert) return;
    authAlert.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-amber-50', 'text-amber-700', 'border-amber-200');
    if (type === 'error') {
      authAlert.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-200');
    } else if (type === 'success') {
      authAlert.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
    } else {
      authAlert.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-200');
    }
    authAlert.textContent = msg;
  }

  function clearAlert() {
    if (authAlert) {
      authAlert.classList.add('hidden');
      authAlert.textContent = '';
    }
  }

  // Login Submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit-btn');

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Signing in...`;

        const res = await API.post('/auth/login', { email, password });

        if (res.token && res.user) {
          API.setToken(res.token);
          API.setUser(res.user);
          Toast.success(`Welcome back, ${res.user.name}!`);

          // Redirect to appropriate dashboard
          setTimeout(() => {
            if (res.user.role === 'ngo_coordinator') {
              window.location.href = 'organizations.html';
            } else {
              window.location.href = 'dashboard.html';
            }
          }, 600);
        } else {
          throw new Error('Invalid response from server.');
        }
      } catch (err) {
        showAlert(err.message || 'Login failed. Please verify credentials.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons({ root: submitBtn });
      }
    });
  }

  // Register Submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-confirm').value;
      const role = document.getElementById('reg-role').value;
      const orgName = document.getElementById('reg-org-name')?.value.trim();
      const submitBtn = document.getElementById('register-submit-btn');

      if (password !== confirm) {
        showAlert('Passwords do not match. Please verify.');
        return;
      }

      if (role === 'ngo_coordinator' && !orgName) {
        showAlert('Please provide an organization or institution name.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Creating Account...`;

        const res = await API.post('/auth/register', {
          name,
          email,
          password,
          role,
          organizationName: orgName
        });

        if (res.token && res.user) {
          API.setToken(res.token);
          API.setUser(res.user);
          Toast.success('Account created successfully!');

          setTimeout(() => {
            if (res.user.role === 'ngo_coordinator') {
              window.location.href = 'organizations.html';
            } else {
              window.location.href = 'dashboard.html';
            }
          }, 600);
        }
      } catch (err) {
        showAlert(err.message || 'Registration failed. Please check form details.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons({ root: submitBtn });
      }
    });
  }

  // 1-Click Demo Accounts for testing & evaluation
  const demoParentBtn = document.getElementById('demo-parent-btn');
  const demoNgoBtn = document.getElementById('demo-ngo-btn');

  if (demoParentBtn) {
    demoParentBtn.addEventListener('click', async () => {
      document.getElementById('login-email').value = 'vyshali@example.com';
      document.getElementById('login-password').value = 'vaxaguard123';
      switchTab('login');
      formLogin.dispatchEvent(new Event('submit'));
    });
  }

  if (demoNgoBtn) {
    demoNgoBtn.addEventListener('click', async () => {
      document.getElementById('login-email').value = 'hopehome@example.com';
      document.getElementById('login-password').value = 'vaxaguard123';
      switchTab('login');
      formLogin.dispatchEvent(new Event('submit'));
    });
  }
});
