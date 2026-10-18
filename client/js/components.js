/**
 * VaxaGuard Shared Components
 * Sidebar, Topbar, Mobile Navigation, Modals, and Helpers.
 */

const Components = {
  // Render Sidebar
  renderSidebar(activePage = 'dashboard') {
    const user = API.getUser() || { name: 'Vyshali Raman', role: 'parent' };
    const isNgo = user.role === 'ngo_coordinator';

    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: 'dashboard.html' },
      { id: 'family', label: 'My Family', icon: 'users', href: 'family.html' },
      { id: 'organizations', label: 'Orphanage / NGO', icon: 'building-2', href: 'organizations.html', badge: isNgo ? 'Admin' : null },
      { id: 'schedule', label: 'Vaccination Schedule', icon: 'calendar', href: 'schedule.html' },
      { id: 'reminders', label: 'Reminders', icon: 'bell', href: 'reminders.html' },
      { id: 'records', label: 'Records & Certificates', icon: 'file-badge', href: 'records.html' },
      { id: 'vaccines', label: 'Vaccine Directory', icon: 'book-open', href: 'vaccine-directory.html' },
      { id: 'centers', label: 'Nearby Centers', icon: 'map-pin', href: 'centers.html' },
      { id: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html' }
    ];

    const navLinksHtml = menuItems.map(item => {
      const isActive = item.id === activePage;
      const activeClass = isActive
        ? 'bg-sky-50 text-sky-700 font-bold border-r-4 border-sky-600'
        : 'text-slate-600 hover:text-sky-600 hover:bg-slate-50 font-medium';

      return `
        <a href="${item.href}" class="flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeClass}">
          <div class="flex items-center gap-3">
            <i data-lucide="${item.icon}" class="w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}"></i>
            <span class="text-sm">${item.label}</span>
          </div>
          ${item.badge ? `<span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">${item.badge}</span>` : ''}
        </a>
      `;
    }).join('');

    return `
      <!-- Desktop Sidebar -->
      <aside class="hidden lg:flex flex-col w-[260px] bg-white border-r border-slate-200/80 fixed inset-y-0 left-0 z-40 justify-between">
        <div class="p-6">
          <!-- Logo -->
          <a href="dashboard.html" class="flex items-center gap-2.5 mb-8">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v8"/>
                <path d="M8 12h8"/>
              </svg>
            </div>
            <span class="text-xl font-bold text-slate-900 tracking-tight font-['Outfit']">Vaxa<span class="text-sky-600">Guard</span></span>
          </a>

          <!-- Nav Menu -->
          <nav class="space-y-1">
            ${navLinksHtml}
          </nav>
        </div>

        <!-- User Profile Footer & Logout -->
        <div class="p-4 border-t border-slate-100">
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div class="truncate">
                <p class="text-xs font-bold text-slate-900 truncate">${user.name || 'User'}</p>
                <p class="text-[10px] text-slate-500 capitalize">${(user.role || 'Parent').replace('_', ' ')}</p>
              </div>
            </div>
            <button id="sidebar-logout-btn" title="Sign Out" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  },

  // Render Topbar
  renderTopbar(title = '') {
    const user = API.getUser() || { name: 'Vyshali Raman', role: 'parent' };
    const firstName = user.name ? user.name.split(' ')[0] : 'User';

    return `
      <header class="sticky top-0 z-30 glass-nav h-20 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200/80">
        <!-- Search bar -->
        <div class="flex items-center gap-3 flex-1 max-w-md">
          <div class="relative w-full">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="text" id="global-search-input"
              class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs sm:text-sm placeholder:text-slate-400 transition-all"
              placeholder="Search vaccines, members, or centers...">
          </div>
        </div>

        <!-- Right action icons & User Profile -->
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Notification Bell -->
          <div class="relative">
            <a href="reminders.html" id="topbar-notif-btn" class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-sky-600 flex items-center justify-center relative shadow-xs transition-colors">
              <i data-lucide="bell" class="w-4 h-4"></i>
              <span id="unread-notif-badge" class="hidden absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </a>
          </div>

          <!-- Add Member / Action Button -->
          <button id="topbar-add-member-btn"
            class="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-sky-600/20 hover:shadow transition-all active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Add Member</span>
          </button>

          <!-- User Avatar Pill -->
          <div class="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div class="hidden md:block text-left">
              <p class="text-xs font-bold text-slate-900 leading-tight">${firstName}</p>
              <p class="text-[10px] text-slate-500 capitalize leading-tight">${(user.role || 'Parent').replace('_', ' ')}</p>
            </div>
          </div>

          <!-- Mobile Hamburger -->
          <button id="mobile-sidebar-toggle" class="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>
        </div>
      </header>
    `;
  },

  // Render Mobile Bottom Navigation Bar (Matching Mockup Panel 10)
  renderMobileNav(activePage = 'dashboard') {
    const items = [
      { id: 'dashboard', label: 'Home', icon: 'home', href: 'dashboard.html' },
      { id: 'family', label: 'Family', icon: 'users', href: 'family.html' },
      { id: 'schedule', label: 'Schedule', icon: 'calendar', href: 'schedule.html' },
      { id: 'records', label: 'Records', icon: 'file-text', href: 'records.html' }
    ];

    const buttonsHtml = items.map(item => {
      const isActive = item.id === activePage;
      const colorClass = isActive ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600';
      return `
        <a href="${item.href}" class="flex flex-col items-center justify-center py-2 px-3 ${colorClass}">
          <i data-lucide="${item.icon}" class="w-5 h-5 mb-0.5"></i>
          <span class="text-[10px]">${item.label}</span>
        </a>
      `;
    }).join('');

    return `
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 py-1 shadow-lg">
        ${buttonsHtml}
      </nav>
    `;
  },

  // Initialize common UI behaviors
  initCommon(activePage = 'dashboard') {
    // 1. Check authentication
    if (!API.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    // 2. Insert Sidebar & Topbar
    const sidebarContainer = document.getElementById('sidebar-container');
    const topbarContainer = document.getElementById('topbar-container');
    const mobileNavContainer = document.getElementById('mobile-nav-container');

    if (sidebarContainer) sidebarContainer.innerHTML = this.renderSidebar(activePage);
    if (topbarContainer) topbarContainer.innerHTML = this.renderTopbar();
    if (mobileNavContainer) mobileNavContainer.innerHTML = this.renderMobileNav(activePage);

    // 3. Logout handling
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of VaxaGuard?')) {
          API.clearSession();
          window.location.href = 'login.html';
        }
      });
    }

    // 4. Notification badge check
    this.checkUnreadNotifications();

    // 5. Global "Add Member" button handler
    const addMemberBtn = document.getElementById('topbar-add-member-btn');
    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', () => {
        this.openAddMemberModal();
      });
    }

    // 6. Global search input handler
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = searchInput.value.trim();
          if (val) {
            window.location.href = `vaccine-directory.html?search=${encodeURIComponent(val)}`;
          }
        }
      });
    }

    // Refresh icons
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  async checkUnreadNotifications() {
    try {
      const res = await API.get('/notifications');
      const badge = document.getElementById('unread-notif-badge');
      if (badge && res.unreadCount > 0) {
        badge.classList.remove('hidden');
      }
    } catch (e) {
      // Graceful ignore
    }
  },

  // Modal: Add Family Member
  openAddMemberModal(onSuccessCallback = null) {
    let modal = document.getElementById('add-member-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-member-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop';
      modal.innerHTML = `
        <div class="bg-white rounded-3xl card-shadow border border-slate-100 max-w-md w-full p-6 sm:p-8 modal-content relative">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-xl font-bold text-slate-900 font-['Outfit']">Add Family Member</h3>
            <button class="p-1 rounded-lg text-slate-400 hover:text-slate-600 close-modal-btn">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="add-member-form" class="space-y-4 pt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-name">
                Full Name *
              </label>
              <input type="text" id="member-name" required
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                placeholder="e.g. Aarav Raman">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-dob">
                  Date of Birth *
                </label>
                <input type="date" id="member-dob" required
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-gender">
                  Gender
                </label>
                <select id="member-gender"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-rel">
                  Relationship *
                </label>
                <select id="member-rel"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                  <option value="Child">Child</option>
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Senior">Senior / Grandparent</option>
                  <option value="Ward">Ward</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-jur">
                  Guideline
                </label>
                <select id="member-jur"
                  class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                  <option value="Indian National Immunization Schedule (UIP)">India (UIP/IAP)</option>
                  <option value="WHO Immunization Schedule">WHO Global</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="member-notes">
                Medical Notes (Optional)
              </label>
              <textarea id="member-notes" rows="2"
                class="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                placeholder="Known allergies, health conditions, or pediatrician contact..."></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl close-modal-btn">
                Cancel
              </button>
              <button type="submit" id="save-member-btn"
                class="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-all">
                Save & Generate Schedule
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: modal });

    // Close handlers
    modal.querySelectorAll('.close-modal-btn').forEach(b => {
      b.onclick = () => modal.classList.add('hidden');
    });

    // Form submit
    const form = modal.querySelector('#add-member-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('member-name').value.trim();
      const dateOfBirth = document.getElementById('member-dob').value;
      const gender = document.getElementById('member-gender').value;
      const relationship = document.getElementById('member-rel').value;
      const jurisdiction = document.getElementById('member-jur').value;
      const notes = document.getElementById('member-notes').value.trim();
      const saveBtn = document.getElementById('save-member-btn');

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Generating Schedule...';

        const res = await API.post('/dependents', {
          name,
          dateOfBirth,
          gender,
          relationship,
          jurisdiction,
          notes
        });

        Toast.success(`Added ${res.data.name}! Immunization schedule calculated.`);
        modal.classList.add('hidden');
        form.reset();

        if (typeof onSuccessCallback === 'function') {
          onSuccessCallback(res.data);
        } else if (window.location.pathname.includes('family.html') || window.location.pathname.includes('dashboard.html')) {
          window.location.reload();
        }
      } catch (err) {
        Toast.error(err.message || 'Failed to add member.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Generate Schedule';
      }
    };
  },

  // Modal: Add / Update Vaccination Record (Matching Mockup Panel 7)
  openRecordModal(prefill = {}, onSuccessCallback = null) {
    let modal = document.getElementById('record-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'record-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop';
      modal.innerHTML = `
        <div class="bg-white rounded-3xl card-shadow border border-slate-100 max-w-lg w-full p-6 sm:p-8 modal-content relative max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-xl font-bold text-slate-900 font-['Outfit']" id="rec-modal-title">
                Add / Update Vaccination Record
              </h3>
              <p class="text-xs text-slate-500 mt-0.5" id="rec-modal-subtitle">Record administered dose & clinic details</p>
            </div>
            <button class="p-1 rounded-lg text-slate-400 hover:text-slate-600 close-rec-modal-btn">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="record-form" class="space-y-4 pt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-person-select">
                Person / Member *
              </label>
              <select id="rec-person-select" required
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                <option value="">Select family member...</option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-vac-input">
                  Vaccine Name *
                </label>
                <input type="text" id="rec-vac-input" required
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. MMR, BCG, DPT">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-dose-input">
                  Dose Number *
                </label>
                <select id="rec-dose-input" required
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                  <option value="1">Dose 1</option>
                  <option value="2">Dose 2</option>
                  <option value="3">Dose 3</option>
                  <option value="4">Booster 1</option>
                  <option value="5">Booster 2</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-date-input">
                  Date Given *
                </label>
                <input type="date" id="rec-date-input" required
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-clinic-input">
                  Clinic / Hospital *
                </label>
                <input type="text" id="rec-clinic-input" required
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. ABC Hospital / City Clinic">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-doctor-input">
                  Doctor / Nurse (Optional)
                </label>
                <input type="text" id="rec-doctor-input"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. Dr. Suresh Rao">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-batch-input">
                  Batch / Lot No. (Optional)
                </label>
                <input type="text" id="rec-batch-input"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. BATCH-9821A">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-cert-file">
                Upload Certificate / Clinic Slip (Optional)
              </label>
              <input type="file" id="rec-cert-file" accept=".pdf,.png,.jpg,.jpeg"
                class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer">
              <p class="text-[10px] text-slate-400 mt-1">Accepted: PDF, PNG, JPG (Max 5MB). Encrypted & private.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="rec-notes-input">
                Notes (Optional)
              </label>
              <textarea id="rec-notes-input" rows="2"
                class="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                placeholder="Mild fever observation, next dose recommendation, etc..."></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl close-rec-modal-btn">
                Cancel
              </button>
              <button type="submit" id="save-rec-btn"
                class="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all">
                Save Record
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: modal });

    // Populate members dropdown
    const select = document.getElementById('rec-person-select');
    API.get('/dependents').then(res => {
      if (res.data) {
        select.innerHTML = '<option value="">Select family member...</option>' +
          res.data.map(d => `<option value="${d._id}">${d.name} (${d.relationship || 'Member'})</option>`).join('');

        if (prefill.dependentId) {
          select.value = prefill.dependentId;
        }
      }
    });

    // Prefill fields
    if (prefill.vaccineName) document.getElementById('rec-vac-input').value = prefill.vaccineName;
    if (prefill.doseNumber) document.getElementById('rec-dose-input').value = prefill.doseNumber;
    if (prefill.clinic) document.getElementById('rec-clinic-input').value = prefill.clinic;
    document.getElementById('rec-date-input').value = prefill.dateGiven || new Date().toISOString().slice(0, 10);

    // Close handlers
    modal.querySelectorAll('.close-rec-modal-btn').forEach(b => {
      b.onclick = () => modal.classList.add('hidden');
    });

    // Form submit
    const form = modal.querySelector('#record-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const depId = document.getElementById('rec-person-select').value;
      const vacName = document.getElementById('rec-vac-input').value.trim();
      const doseNum = document.getElementById('rec-dose-input').value;
      const dateGiven = document.getElementById('rec-date-input').value;
      const clinic = document.getElementById('rec-clinic-input').value.trim();
      const doctor = document.getElementById('rec-doctor-input').value.trim();
      const batch = document.getElementById('rec-batch-input').value.trim();
      const notes = document.getElementById('rec-notes-input').value.trim();
      const fileInput = document.getElementById('rec-cert-file');
      const saveBtn = document.getElementById('save-rec-btn');

      if (!depId) {
        Toast.warning('Please select a member.');
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const formData = new FormData();
        formData.append('dependentId', depId);
        formData.append('vaccineName', vacName);
        formData.append('doseNumber', doseNum);
        formData.append('administeredAt', dateGiven);
        formData.append('clinic', clinic);
        if (doctor) formData.append('healthcareProfessional', doctor);
        if (batch) formData.append('batchNumber', batch);
        if (notes) formData.append('notes', notes);
        if (fileInput.files[0]) formData.append('certificate', fileInput.files[0]);

        const res = await API.post('/records', formData);
        Toast.success('Vaccination record saved successfully!');
        modal.classList.add('hidden');
        form.reset();

        if (typeof onSuccessCallback === 'function') {
          onSuccessCallback(res.data);
        } else {
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        Toast.error(err.message || 'Failed to save record.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Record';
      }
    };
  }
};

window.Components = Components;
