/**
 * VaxaGuard Reports & Analytics Logic
 * Aggregates cohort immunization metrics, calculates compliance rates, and generates audit reports.
 */

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('reports');
  await loadReportsData();
});

async function loadReportsData() {
  try {
    // 1. Fetch dashboard summary
    const sumRes = await API.get('/dashboard/summary');
    const summary = sumRes.data;

    document.getElementById('rep-total-members').textContent = summary.totalMembers || 0;
    document.getElementById('rep-completed-doses').textContent = summary.completedCount || 0;
    document.getElementById('rep-due-doses').textContent = (summary.upcomingCount + summary.dueSoonCount) || 0;
    document.getElementById('rep-overdue-doses').textContent = summary.overdueCount || 0;

    // 2. Fetch dependents with stats
    const depRes = await API.get('/dependents');
    const members = depRes.data || [];

    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    if (members.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-400">No member records available for audit.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = members.map(m => {
      const stats = m.stats || { total: 0, completed: 0, percentage: 0 };
      const ageCategory = m.ageCategory || 'Child';

      let cohortBadge = 'badge-child';
      if (ageCategory === 'Adult') cohortBadge = 'badge-adult';
      if (ageCategory === 'Senior') cohortBadge = 'badge-senior';

      let statusBadge = 'badge-completed';
      let statusText = 'Fully Protected';

      if (stats.percentage === 0) {
        statusBadge = 'badge-overdue';
        statusText = 'Needs Attention';
      } else if (stats.percentage < 60) {
        statusBadge = 'badge-duesoon';
        statusText = 'Partially Immunized';
      } else if (stats.percentage < 100) {
        statusBadge = 'badge-upcoming';
        statusText = 'On Track';
      }

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-3.5 px-4 font-bold text-slate-900">
            ${m.name}
          </td>
          <td class="py-3.5 px-3">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${cohortBadge}">
              ${ageCategory}
            </span>
          </td>
          <td class="py-3.5 px-3 text-slate-600">
            ${m.ageInYears} years
          </td>
          <td class="py-3.5 px-3 font-semibold text-slate-700">
            ${stats.completed} / ${stats.total} Doses
          </td>
          <td class="py-3.5 px-3">
            <div class="flex items-center gap-2">
              <div class="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full bg-sky-600 rounded-full" style="width: ${stats.percentage}%"></div>
              </div>
              <span class="font-extrabold text-slate-900">${stats.percentage}%</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-right">
            <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusBadge}">
              ${statusText}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load reports:', err);
    Toast.error('Could not load report metrics.');
  }
}
