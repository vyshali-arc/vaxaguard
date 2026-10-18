/**
 * VaxaGuard Vaccination Schedule View Logic
 * Displays individual schedule timelines, handles status filtering, PDF downloads, and dose recording.
 */

let currentDependentId = null;
let currentDependent = null;
let scheduleEntries = [];

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('schedule');

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('dependent');
  const targetStatus = urlParams.get('status');

  if (targetStatus) {
    const filterSelect = document.getElementById('filter-status-select');
    if (filterSelect) filterSelect.value = targetStatus;
  }

  // Populate person dropdown and select active
  await loadPersonsDropdown(targetId);

  // Status filter dropdown
  const statusSelect = document.getElementById('filter-status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      renderScheduleTable();
    });
  }

  // Download PDF Button
  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (currentDependentId) {
        handleDownloadPdf(currentDependentId);
      }
    });
  }

  // Log Dose Button
  const addDoseBtn = document.getElementById('add-dose-btn');
  if (addDoseBtn) {
    addDoseBtn.addEventListener('click', () => {
      if (currentDependentId) {
        Components.openRecordModal({ dependentId: currentDependentId }, () => {
          loadScheduleData(currentDependentId);
        });
      }
    });
  }
});

async function loadPersonsDropdown(preferredId = null) {
  try {
    const res = await API.get('/dependents');
    const members = res.data || [];

    const select = document.getElementById('switch-person-select');
    if (!select || members.length === 0) return;

    select.innerHTML = members.map(m => `
      <option value="${m._id}">${m.name} (${m.relationship || 'Member'})</option>
    `).join('');

    // Determine which member to display
    let activeId = preferredId;
    if (!activeId || !members.some(m => m._id === activeId)) {
      activeId = members[0]._id;
    }

    select.value = activeId;
    currentDependentId = activeId;

    select.addEventListener('change', (e) => {
      currentDependentId = e.target.value;
      loadScheduleData(currentDependentId);
    });

    await loadScheduleData(currentDependentId);
  } catch (err) {
    console.error('Failed to load persons:', err);
  }
}

async function loadScheduleData(depId) {
  try {
    // 1. Fetch dependent details
    const depRes = await API.get(`/dependents/${depId}`);
    currentDependent = depRes.data;

    // Update Header Banner
    document.getElementById('member-name-title').textContent = currentDependent.name;
    document.getElementById('member-avatar').textContent = currentDependent.name.charAt(0).toUpperCase();

    const dobStr = currentDependent.dateOfBirth
      ? new Date(currentDependent.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    document.getElementById('member-meta-details').textContent =
      `${currentDependent.gender || 'Not specified'} • ${currentDependent.ageInYears} years • DOB: ${dobStr}`;

    const badge = document.getElementById('member-category-badge');
    if (badge) {
      badge.textContent = `${currentDependent.ageCategory || 'Child'} (${currentDependent.ageCategory === 'Senior' ? '60+' : currentDependent.ageCategory === 'Adult' ? '18–59' : '0–17'})`;
      badge.className = `text-xs font-bold px-2.5 py-0.5 rounded-full ${
        currentDependent.ageCategory === 'Senior' ? 'badge-senior' : currentDependent.ageCategory === 'Adult' ? 'badge-adult' : 'badge-child'
      }`;
    }

    // 2. Fetch schedule entries
    const schedRes = await API.get(`/schedules/dependent/${depId}`);
    scheduleEntries = schedRes.data || [];

    renderScheduleTable();
  } catch (err) {
    console.error('Failed to load schedule:', err);
    Toast.error('Could not load vaccination schedule.');
  }
}

function renderScheduleTable() {
  const tbody = document.getElementById('schedule-table-body');
  if (!tbody) return;

  const filterStatus = document.getElementById('filter-status-select')?.value || 'all';

  const filtered = scheduleEntries.filter(entry => {
    if (filterStatus === 'all') return true;
    return entry.status === filterStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400">
          No vaccination schedule entries found matching "${filterStatus}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    let badgeClass = 'badge-upcoming';
    let statusText = 'Upcoming';

    if (item.status === 'completed') {
      badgeClass = 'badge-completed';
      statusText = 'Completed';
    } else if (item.status === 'due_soon') {
      badgeClass = 'badge-duesoon';
      statusText = 'Due Soon';
    } else if (item.status === 'overdue') {
      badgeClass = 'badge-overdue';
      statusText = 'Overdue';
    }

    const dueDateStr = item.dueDate
      ? new Date(item.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 px-4 font-bold text-slate-900">
          ${item.vaccineName}
        </td>
        <td class="py-3.5 px-3 font-medium text-slate-600">
          Dose ${item.doseNumber}
        </td>
        <td class="py-3.5 px-3 text-slate-600">
          ${item.recommendedTiming || 'Routine'}
        </td>
        <td class="py-3.5 px-3 font-medium ${item.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-700'}">
          ${dueDateStr}
        </td>
        <td class="py-3.5 px-3">
          <span class="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}">
            ${statusText}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right">
          ${item.status === 'completed'
            ? `<a href="records.html" class="text-xs font-semibold text-slate-600 hover:text-sky-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white transition-all">View</a>`
            : `<button onclick="handleMarkDoseDone('${item.dependentId}', '${item.vaccineName}', ${item.doseNumber})"
                 class="text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-xl shadow-xs transition-all">
                 Mark Done
               </button>`
          }
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: tbody });
  }
}

// Prefill and record dose
window.handleMarkDoseDone = function(depId, vaccineName, doseNumber) {
  Components.openRecordModal({
    dependentId: depId,
    vaccineName,
    doseNumber,
    dateGiven: new Date().toISOString().slice(0, 10)
  }, () => {
    loadScheduleData(depId);
  });
};

// Automatic PDF download handler
async function handleDownloadPdf(depId) {
  try {
    Toast.info('Generating official Immunization PDF card...');
    const blob = await API.get(`/records/dependent/${depId}/pdf`);

    // Create browser download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const name = currentDependent?.name || 'Member';
    a.download = `VaxaGuard-Immunization-Card-${name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    Toast.success('PDF card downloaded successfully!');
  } catch (err) {
    console.error('PDF download error:', err);
    Toast.error('Could not download PDF. Verify server connection.');
  }
}
