/**
 * VaxaGuard Orphanage & NGO Management Logic
 * Handles cohort beneficiaries, care handover with audit logging, and aggregate status reports.
 */

let allBeneficiaries = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('organizations');

  // Tab switching
  document.querySelectorAll('.ngo-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ngo-tab').forEach(t => {
        t.classList.remove('bg-white', 'text-slate-900', 'shadow-xs', 'font-bold');
        t.classList.add('text-slate-600', 'font-semibold');
      });
      tab.classList.add('bg-white', 'text-slate-900', 'shadow-xs', 'font-bold');
      tab.classList.remove('text-slate-600', 'font-semibold');

      currentFilter = tab.getAttribute('data-status');
      renderBeneficiariesTable();
    });
  });

  // Search input
  const searchInput = document.getElementById('beneficiary-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderBeneficiariesTable();
    });
  }

  // Add Child Button
  const addChildBtn = document.getElementById('add-child-btn');
  const addModal = document.getElementById('add-beneficiary-modal');
  if (addChildBtn && addModal) {
    addChildBtn.addEventListener('click', () => {
      addModal.classList.remove('hidden');
    });
  }

  // Add Beneficiary Form Submit
  const addForm = document.getElementById('add-beneficiary-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('ben-name').value.trim();
      const dob = document.getElementById('ben-dob').value;
      const gender = document.getElementById('ben-gender').value;
      const code = document.getElementById('ben-code').value.trim();
      const saveBtn = document.getElementById('save-beneficiary-btn');

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Admitting Child...';

        await API.post('/organizations/beneficiaries', {
          name,
          dateOfBirth: dob,
          gender,
          beneficiaryCode: code
        });

        Toast.success(`Admitted ${name} and generated immunization schedule!`);
        addModal.classList.add('hidden');
        addForm.reset();
        await loadOrganizationData();
      } catch (err) {
        Toast.error(err.message || 'Failed to admit child.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Admit & Generate Schedule';
      }
    });
  }

  // Care Handover Form Submit
  const handoverForm = document.getElementById('handover-form');
  const handoverModal = document.getElementById('handover-modal');
  if (handoverForm && handoverModal) {
    handoverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const childId = document.getElementById('handover-child-id').value;
      const reason = document.getElementById('handover-reason').value;
      const guardian = document.getElementById('handover-guardian').value.trim();
      const notes = document.getElementById('handover-notes').value.trim();
      const btn = document.getElementById('confirm-handover-btn');

      try {
        btn.disabled = true;
        btn.textContent = 'Processing Handover...';

        await API.post(`/organizations/beneficiaries/${childId}/handover`, {
          handoverReason: reason,
          adoptiveParentName: guardian,
          transferNotes: notes
        });

        Toast.success('Care handover completed & audit log recorded.');
        handoverModal.classList.add('hidden');
        handoverForm.reset();
        await loadOrganizationData();
      } catch (err) {
        Toast.error(err.message || 'Failed to complete handover.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Handover & Log Audit';
      }
    });
  }

  // Aggregate Report Button
  const reportBtn = document.getElementById('download-org-report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      try {
        const res = await API.get('/organizations/report');
        const d = res.data;
        alert(
          `VaxaGuard Institution Aggregate Report\n` +
          `----------------------------------------\n` +
          `Organization: ${d.organizationName}\n` +
          `Total Registered Children: ${d.totalChildren}\n` +
          `Total Vaccine Doses: ${d.totalDoses}\n` +
          `Completed Doses: ${d.completedDoses}\n` +
          `Upcoming / Due Soon: ${d.dueSoonDoses}\n` +
          `Overdue Doses: ${d.overdueDoses}\n` +
          `Overall Cohort Coverage: ${d.coveragePercentage}%\n` +
          `Timestamp: ${new Date(d.generatedAt).toLocaleString()}`
        );
      } catch (err) {
        Toast.error('Could not generate aggregate report.');
      }
    });
  }

  await loadOrganizationData();
});

async function loadOrganizationData() {
  try {
    // 1. Fetch Organization Profile
    const orgRes = await API.get('/organizations/current');
    if (orgRes.data) {
      document.getElementById('org-name-title').textContent = orgRes.data.name;
    }

    // 2. Fetch Beneficiaries
    const benRes = await API.get('/organizations/beneficiaries');
    allBeneficiaries = benRes.data || [];

    // Update counts
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    allBeneficiaries.forEach(b => {
      const st = b.status?.toLowerCase();
      if (st === 'completed') completedCount++;
      else if (st === 'overdue') overdueCount++;
      else upcomingCount++;
    });

    document.getElementById('org-registered-count').textContent = allBeneficiaries.length;
    document.getElementById('ngo-count-all').textContent = allBeneficiaries.length;
    document.getElementById('ngo-count-upcoming').textContent = upcomingCount;
    document.getElementById('ngo-count-overdue').textContent = overdueCount;
    document.getElementById('ngo-count-completed').textContent = completedCount;

    // Calculate coverage
    const coverage = allBeneficiaries.length > 0
      ? Math.round(((allBeneficiaries.length - overdueCount) / allBeneficiaries.length) * 100)
      : 100;
    document.getElementById('org-coverage-pct').textContent = `${coverage}%`;

    renderBeneficiariesTable();
  } catch (err) {
    console.error('Failed to load organization data:', err);
    Toast.error('Could not load institution records.');
  }
}

function renderBeneficiariesTable() {
  const tbody = document.getElementById('beneficiaries-table-body');
  if (!tbody) return;

  const searchQuery = document.getElementById('beneficiary-search')?.value.toLowerCase().trim() || '';

  const filtered = allBeneficiaries.filter(item => {
    // Status check
    if (currentFilter !== 'all') {
      const st = item.status.toLowerCase().replace(/\s+/g, '');
      if (currentFilter === 'upcoming' && (st !== 'upcoming' && st !== 'duesoon')) return false;
      if (currentFilter === 'overdue' && st !== 'overdue') return false;
      if (currentFilter === 'completed' && st !== 'completed') return false;
    }
    // Search check
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery) ||
             (item.beneficiaryCode && item.beneficiaryCode.toLowerCase().includes(searchQuery));
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400">
          No children records found matching criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(child => {
    let badgeClass = 'badge-upcoming';
    if (child.status === 'Due Soon') badgeClass = 'badge-duesoon';
    if (child.status === 'Overdue') badgeClass = 'badge-overdue';
    if (child.status === 'Completed') badgeClass = 'badge-completed';

    const dueDateStr = child.dueDate
      ? new Date(child.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'All Doses Complete';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 px-4 font-bold text-slate-900">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
              ${child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span>${child.name}</span>
              <span class="block text-[10px] text-slate-400 font-mono">${child.beneficiaryCode || 'BEN'}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-3 font-medium text-slate-600">
          ${child.ageInYears} years
        </td>
        <td class="py-3.5 px-3 font-semibold text-slate-800">
          ${child.nextVaccine || 'Routine Follow-up'}
        </td>
        <td class="py-3.5 px-3 font-medium ${child.status === 'Overdue' ? 'text-rose-600 font-bold' : 'text-slate-700'}">
          ${dueDateStr}
        </td>
        <td class="py-3.5 px-3">
          <span class="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}">
            ${child.status}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="inline-flex items-center gap-1.5">
            <a href="schedule.html?dependent=${child._id}"
              class="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all">
              View
            </a>
            <button onclick="handleOpenHandoverModal('${child._id}', '${child.name}')" title="Care Handover / Adoption Transfer"
              class="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all flex items-center gap-1">
              <i data-lucide="repeat" class="w-3.5 h-3.5"></i> Handover
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: tbody });
  }
}

// Handover Modal trigger
window.handleOpenHandoverModal = function(childId, childName) {
  const modal = document.getElementById('handover-modal');
  if (modal) {
    document.getElementById('handover-child-id').value = childId;
    document.getElementById('handover-child-name').textContent = `Transfer medical records for ${childName}`;
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: modal });
  }
};
