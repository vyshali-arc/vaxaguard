/**
 * VaxaGuard Family Members Logic
 * Filters by age category, calculates real completion percentage, renders member cards.
 */

let allMembers = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('family');

  // Tab switching
  document.querySelectorAll('.family-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.family-tab').forEach(t => {
        t.classList.remove('bg-sky-50', 'text-sky-700', 'font-bold');
        t.classList.add('text-slate-600', 'font-semibold');
      });
      tab.classList.add('bg-sky-50', 'text-sky-700', 'font-bold');
      tab.classList.remove('text-slate-600', 'font-semibold');

      currentCategory = tab.getAttribute('data-category');
      renderMembers();
    });
  });

  // Search input
  const searchInput = document.getElementById('member-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderMembers();
    });
  }

  await loadFamilyMembers();
});

async function loadFamilyMembers() {
  try {
    const res = await API.get('/dependents');
    allMembers = res.data || [];

    // Calculate category counts
    let childCount = 0;
    let adultCount = 0;
    let seniorCount = 0;

    allMembers.forEach(m => {
      const cat = m.ageCategory?.toLowerCase();
      if (cat === 'child') childCount++;
      else if (cat === 'senior') seniorCount++;
      else adultCount++;
    });

    document.getElementById('count-all').textContent = allMembers.length;
    document.getElementById('count-child').textContent = childCount;
    document.getElementById('count-adult').textContent = adultCount;
    document.getElementById('count-senior').textContent = seniorCount;

    renderMembers();
  } catch (err) {
    console.error('Error loading family members:', err);
    Toast.error('Could not load family members.');
  }
}

function renderMembers() {
  const container = document.getElementById('family-members-grid');
  if (!container) return;

  const searchQuery = document.getElementById('member-search-input')?.value.toLowerCase().trim() || '';

  // Filter members
  const filtered = allMembers.filter(m => {
    // Category check
    if (currentCategory !== 'all') {
      const cat = m.ageCategory?.toLowerCase();
      if (currentCategory === 'child' && cat !== 'child') return false;
      if (currentCategory === 'adult' && cat !== 'adult') return false;
      if (currentCategory === 'senior' && cat !== 'senior') return false;
    }
    // Search query check
    if (searchQuery) {
      return m.name.toLowerCase().includes(searchQuery) || (m.relationship || '').toLowerCase().includes(searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center bg-white rounded-3xl card-shadow border border-slate-100 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <i data-lucide="users" class="w-6 h-6"></i>
        </div>
        <h3 class="text-base font-bold text-slate-800">No members found</h3>
        <p class="text-xs text-slate-500">No family members match the selected filter criteria.</p>
        <button onclick="Components.openAddMemberModal(() => loadFamilyMembers())"
          class="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl mt-2">
          <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
          <span>Add New Member</span>
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  container.innerHTML = filtered.map(member => {
    const stats = member.stats || { total: 0, completed: 0, percentage: 0 };
    const ageCategory = member.ageCategory || 'Child';

    let badgeClass = 'badge-child';
    let ageRangeText = 'Child (0–17)';
    let avatarGradient = 'from-emerald-400 to-teal-500';

    if (ageCategory === 'Adult') {
      badgeClass = 'badge-adult';
      ageRangeText = 'Adult (18–59)';
      avatarGradient = 'from-sky-400 to-blue-600';
    } else if (ageCategory === 'Senior') {
      badgeClass = 'badge-senior';
      ageRangeText = 'Senior (60+)';
      avatarGradient = 'from-purple-400 to-indigo-600';
    }

    return `
      <div class="bg-white rounded-3xl p-6 card-shadow border border-slate-100 card-hover flex flex-col justify-between space-y-5">
        <!-- Top row: Avatar, Info, and 3-dots -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3.5">
            <div class="w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-tr ${avatarGradient} text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
              ${member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900">${member.name}</h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">
                  ${ageRangeText}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                ${member.gender || 'Not specified'} • ${member.ageInYears} years • ${member.relationship || 'Dependent'}
              </p>
            </div>
          </div>

          <!-- Actions Dropdown / Menu -->
          <div class="relative">
            <button onclick="handleDeleteMember('${member._id}', '${member.name}')" title="Archive Profile"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Progress Bar (Matching Mockup Panel 4: e.g. 9/12 Completed - 75%) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-600 font-medium">${stats.completed}/${stats.total} Completed</span>
            <span class="font-extrabold text-slate-900">${stats.percentage}%</span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-700"
              style="width: ${stats.percentage}%;"></div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="Components.openRecordModal({ dependentId: '${member._id}' }, () => loadFamilyMembers())"
            class="text-xs font-semibold text-slate-600 hover:text-sky-600 flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
            <i data-lucide="plus-circle" class="w-4 h-4 text-sky-600"></i>
            <span>Log Vaccine</span>
          </button>

          <a href="schedule.html?dependent=${member._id}"
            class="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all">
            View Schedule
          </a>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}

// Global handler to archive / delete member
window.handleDeleteMember = async function(id, name) {
  if (confirm(`Are you sure you want to archive ${name}'s immunization profile?`)) {
    try {
      await API.delete(`/dependents/${id}`);
      Toast.success(`Archived ${name}'s profile.`);
      await loadFamilyMembers();
    } catch (err) {
      Toast.error('Failed to archive member.');
    }
  }
};
