/**
 * VaxaGuard Frontend API Client
 * Robust Fetch API wrapper with authentication, token refresh handling, and error handling.
 */

// Determine API Base URL dynamically
const API_BASE = (function() {
  // If explicitly configured in window
  if (window.__VAXAGUARD_API_URL__) {
    return window.__VAXAGUARD_API_URL__;
  }
  // If running on localhost or 127.0.0.1 on a frontend dev server (e.g. port 3000, 5500, 8080)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // If not port 5000, point to default backend port 5000
    if (window.location.port !== '5000' && window.location.port !== '') {
      return 'http://localhost:5000/api';
    }
  }
  // Otherwise use relative /api route
  return '/api';
})();

const StorageKey = {
  TOKEN: 'vaxaguard_token',
  USER: 'vaxaguard_user',
  ACTIVE_DEPENDENT: 'vaxaguard_active_dep'
};

const API = {
  baseUrl: API_BASE,

  // Token management
  getToken() {
    return localStorage.getItem(StorageKey.TOKEN);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(StorageKey.TOKEN, token);
    } else {
      localStorage.removeItem(StorageKey.TOKEN);
    }
  },

  getUser() {
    try {
      const u = localStorage.getItem(StorageKey.USER);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(StorageKey.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(StorageKey.USER);
    }
  },

  clearSession() {
    localStorage.removeItem(StorageKey.TOKEN);
    localStorage.removeItem(StorageKey.USER);
    localStorage.removeItem(StorageKey.ACTIVE_DEPENDENT);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // Central Request Handler
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      ...options.headers,
    };

    // Auto-attach JWT token if present
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Auto content-type JSON unless sending FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Handle session expiry
      if (response.status === 401) {
        // Only redirect if on a protected page
        const isAuthPage = window.location.pathname.includes('login.html') || 
                           window.location.pathname.includes('register.html') || 
                           window.location.pathname.endsWith('/') || 
                           window.location.pathname.includes('index.html');
        if (!isAuthPage) {
          this.clearSession();
          window.location.href = 'login.html?expired=1';
          return;
        }
      }

      // Handle non-JSON responses (like PDF downloads)
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('application/pdf') || contentType.includes('octet-stream'))) {
        if (!response.ok) {
          throw new Error(`Download failed with status ${response.status}`);
        }
        return await response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// UI Toast Notification Utility
const Toast = {
  show(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    let iconHtml = '';
    let bgBorder = '';

    switch (type) {
      case 'success':
        bgBorder = 'bg-white border border-emerald-200 text-slate-800';
        iconHtml = '<div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-4 h-4 stroke-[3]"></i></div>';
        break;
      case 'error':
        bgBorder = 'bg-white border border-rose-200 text-slate-800';
        iconHtml = '<div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0"><i data-lucide="alert-circle" class="w-4 h-4"></i></div>';
        break;
      case 'warning':
        bgBorder = 'bg-white border border-amber-200 text-slate-800';
        iconHtml = '<div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>';
        break;
      default:
        bgBorder = 'bg-white border border-sky-200 text-slate-800';
        iconHtml = '<div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0"><i data-lucide="info" class="w-4 h-4"></i></div>';
    }

    toast.className = `toast-item ${bgBorder}`;
    toast.innerHTML = `
      ${iconHtml}
      <div class="flex-1 pr-2">
        <p class="text-xs font-semibold text-slate-900">${type.toUpperCase()}</p>
        <p class="text-xs text-slate-600 mt-0.5 leading-snug">${message}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-600 flex-shrink-0" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    if (window.lucide) {
      lucide.createIcons({ root: toast });
    }

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  success(msg, duration) { this.show(msg, 'success', duration); },
  error(msg, duration) { this.show(msg, 'error', duration); },
  warning(msg, duration) { this.show(msg, 'warning', duration); },
  info(msg, duration) { this.show(msg, 'info', duration); }
};

window.API = API;
window.Toast = Toast;
