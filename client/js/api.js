/**
 * VaxaGuard Frontend API Client
 * Robust Fetch API wrapper with authentication, token refresh handling, and error handling.
 */

// Determine API Base URL dynamically
const LIVE_BACKEND_URL = 'https://vaxaguard.onrender.com/api';

const API_BASE = (function() {
  // 1. If explicitly configured in window
  if (window.__VAXAGUARD_API_URL__) {
    return window.__VAXAGUARD_API_URL__.replace(/\/+$/, '');
  }
  // 2. If saved in localStorage (allows user overriding backend URL)
  const savedUrl = localStorage.getItem('vaxaguard_api_url');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, '');
  }
  // 3. If running on Render live host
  if (window.location.hostname.includes('onrender.com')) {
    return '/api';
  }
  // 4. If running locally on localhost or 127.0.0.1
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // If frontend is directly served from port 5000 Express server
    if (window.location.port === '5000') {
      return '/api';
    }
    // If running via Live Server (5500) or Vite (5173, 3000), default to local backend
    return 'http://localhost:5000/api';
  }
  // 5. If opened as a local file (file://) or hosted on a static host (GitHub Pages, etc.)
  if (window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io')) {
    return LIVE_BACKEND_URL;
  }
  // 6. Default relative /api
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
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
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
      let response;
      try {
        response = await fetch(url, config);
      } catch (networkErr) {
        // If local dev server failed or port 5000 was unreachable, auto-fallback to live host
        if (url.includes('localhost:5000') && !endpoint.startsWith('http')) {
          console.warn('Local backend unreachable. Retrying with live cloud backend...');
          url = `${LIVE_BACKEND_URL}${endpoint}`;
          response = await fetch(url, config);
        } else {
          throw new Error('Unable to connect to VaxaGuard backend. Please check network connection or verify server status.');
        }
      }

      // Handle session expiry
      if (response.status === 401) {
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

      // Handle binary downloads (like PDF)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
        if (!response.ok) {
          throw new Error(`Download failed with status ${response.status}`);
        }
        return await response.blob();
      }

      // Safely parse JSON or handle HTML responses (e.g. 404/502 from proxy or static host)
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        // If server returned an HTML error or fallback page
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          // If we called relative or localhost and got HTML (e.g. 404 page), try live backend
          if (!url.includes('onrender.com') && !endpoint.startsWith('http')) {
            console.warn('Received HTML response instead of JSON. Retrying with live cloud backend...');
            url = `${LIVE_BACKEND_URL}${endpoint}`;
            const fbRes = await fetch(url, config);
            const fbType = fbRes.headers.get('content-type') || '';
            if (fbType.includes('application/json')) {
              const fbData = await fbRes.json();
              if (!fbRes.ok) {
                const err = new Error(fbData.message || fbData.error || `Request failed with status ${fbRes.status}`);
                err.status = fbRes.status;
                err.data = fbData;
                throw err;
              }
              return fbData;
            }
          }
          throw new Error(`Backend API returned HTML instead of JSON (Status ${response.status}). The requested endpoint was not found or the server is starting.`);
        }

        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(text || `Request failed with status ${response.status}`);
        }
      }

      if (!response.ok) {
        const error = new Error(data.message || data.error || `Request failed with status ${response.status}`);
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
