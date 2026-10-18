/**
 * VaxaGuard Dashboard Logic
 * Loads aggregated real data, populates metrics, renders SVG progress ring, and binds actions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize shared sidebar & topbar
  Components.initCommon('dashboard');

  const user = API.getUser();
  if (user && user.name) {
    const firstName = user.name.split(' ')[0];
    const greetingEl = document.getElementById('greeting-name');
    if (greetingEl) greetingEl.textContent = firstName;
  }

  // Quick Log Vaccine button in header
  const quickLogBtn = document.getElementById('quick-add-record-btn');
  if (quickLogBtn) {
    quickLogBtn.addEventListener('click', () => {
      Components.openRecordModal();
    });
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const res = await API.get('/dashboard/summary');
    const data = res.data;

    // 1. Populate 4 Summary Cards
    document.getElementById('stat-members').textContent = data.totalMembers || 0;
    document.getElementById('stat-upcoming').textContent = (data.upcomingCount + data.dueSoonCount) || 0;
    document.getElementById('stat-completed').textContent = data.completedCount || 0;
    document.getElementById('stat-overdue').textContent = data.overdueCount || 0;

    // 2. Animate Circular Donut Chart
    const percentage = data.completionPercentage || 0;
    document.getElementById('chart-percentage').textContent = `${percentage}%`;

    const ring = document.getElementById('status-ring-circle');
    if (ring) {
      const radius = 50;
      const circumference = 2 * Math.PI * radius; // 314.159
      const offset = circumference - (percentage / 100) * circumference;
      ring.style.strokeDashoffset = offset;
    }

    // 3. Legend Counts
    document.getElementById('legend-completed').textContent = data.completedCount || 0;
    document.getElementById('legend-upcoming').textContent = (data.upcomingCount + data.dueSoonCount) || 0;
    document.getElementById('legend-overdue').textContent = data.overdueCount || 0;

    // 4. Render Upcoming Vaccinations List (Matching Panel 3)
    const upcomingContainer = document.getElementById('upcoming-vaccinations-list');
    if (upcomingContainer) {
      if (!data.upcomingList || data.upcomingList.length === 0) {
        upcomingContainer.innerHTML = `
          <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto"></i>
            <p class="text-sm font-bold text-slate-800">All Vaccinations Up To Date!</p>
            <p class="text-xs text-slate-500">No overdue or pending vaccinations scheduled in the near future.</p>
          </div>
        `;
      } else {
        upcomingContainer.innerHTML = data.upcomingList.map(item => {
          let badgeClass = 'badge-upcoming';
          if (item.status === 'due_soon') badgeClass = 'badge-duesoon';
          if (item.status === 'overdue') badgeClass = 'badge-overdue';

          const formattedDate = new Date(item.dueDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          return `
            <div class="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                  ${item.dependentName ? item.dependentName.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-slate-900">${item.vaccineName}</h4>
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">${item.dueText}</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">
                    ${item.dependentName} (${item.relationship || 'Member'}) • Due: ${formattedDate}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center">
                <button onclick="handleMarkAsDone('${item.dependentId}', '${item.vaccineName}', ${item.doseNumber})"
                  class="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all">
                  Mark as Done
                </button>
                <a href="schedule.html?dependent=${item.dependentId}"
                  class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-all">
                  View
                </a>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Render Recent Records List
    const recordsContainer = document.getElementById('recent-records-list');
    if (recordsContainer) {
      if (!data.recentRecords || data.recentRecords.length === 0) {
        recordsContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs">No vaccination history recorded yet.</div>
        `;
      } else {
        recordsContainer.innerHTML = data.recentRecords.map(rec => {
          const formattedDate = new Date(rec.administeredAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          return `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>
                </div>
                <div>
                  <h4 class="font-bold text-slate-900">${rec.vaccineName} (Dose ${rec.doseNumber})</h4>
                  <p class="text-[11px] text-slate-500">${rec.dependentId?.name || 'Member'} • ${rec.clinic}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[11px] text-slate-500">${formattedDate}</span>
                <span class="block text-[10px] text-emerald-600 font-semibold">Completed</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    Toast.error('Could not load dashboard statistics.');
  }
}

// Global handler for "Mark as Done" from upcoming list
window.handleMarkAsDone = function(dependentId, vaccineName, doseNumber) {
  Components.openRecordModal({
    dependentId,
    vaccineName,
    doseNumber,
    dateGiven: new Date().toISOString().slice(0, 10)
  }, () => {
    loadDashboardData();
  });
};
