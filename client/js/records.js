/**
 * VaxaGuard Records & Certificates Logic
 * Filters records by member, verifies doctor stamps, and triggers PDF downloads.
 */

let allRecords = [];

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('records');

  // Populate Member Dropdown
  await loadMemberFilter();

  // Event Listeners for Filters
  document.getElementById('filter-member-select')?.addEventListener('change', () => loadRecords());
  document.getElementById('filter-verification-select')?.addEventListener('change', () => renderRecordsTable());
  document.getElementById('record-search-input')?.addEventListener('input', () => renderRecordsTable());

  // PDF Download Button
  const pdfBtn = document.getElementById('records-download-pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', async () => {
      const selectedMember = document.getElementById('filter-member-select')?.value;
      if (!selectedMember) {
        Toast.warning('Please select a specific family member to download their immunization card.');
        return;
      }
      try {
        Toast.info('Preparing official Immunization PDF Card...');
        const blob = await API.get(`/records/dependent/${selectedMember}/pdf`);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `VaxaGuard-Immunization-Card.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        Toast.success('PDF Card downloaded successfully!');
      } catch (err) {
        Toast.error('Could not download PDF. Verify server connection.');
      }
    });
  }

  await loadRecords();
});

async function loadMemberFilter() {
  try {
    const res = await API.get('/dependents');
    const select = document.getElementById('filter-member-select');
    if (!select || !res.data) return;

    select.innerHTML = '<option value="">All Members</option>' +
      res.data.map(d => `<option value="${d._id}">${d.name} (${d.relationship || 'Member'})</option>`).join('');
  } catch (err) {
    console.error('Failed to load member filter:', err);
  }
}

async function loadRecords() {
  try {
    const selectedMember = document.getElementById('filter-member-select')?.value;
    const params = {};
    if (selectedMember) params.dependentId = selectedMember;

    const res = await API.get('/records', params);
    allRecords = res.data || [];
    renderRecordsTable();
  } catch (err) {
    console.error('Failed to load records:', err);
    Toast.error('Could not load vaccination records.');
  }
}

function renderRecordsTable() {
  const tbody = document.getElementById('records-table-body');
  if (!tbody) return;

  const verificationFilter = document.getElementById('filter-verification-select')?.value || 'all';
  const searchQuery = document.getElementById('record-search-input')?.value.toLowerCase().trim() || '';

  const filtered = allRecords.filter(rec => {
    // Verification filter
    if (verificationFilter !== 'all') {
      if (rec.verificationStatus !== verificationFilter) return false;
    }
    // Search filter
    if (searchQuery) {
      const matchVac = (rec.vaccineName || '').toLowerCase().includes(searchQuery);
      const matchClinic = (rec.clinic || '').toLowerCase().includes(searchQuery);
      const matchDr = (rec.healthcareProfessional || '').toLowerCase().includes(searchQuery);
      const matchName = (rec.dependentId?.name || '').toLowerCase().includes(searchQuery);
      if (!matchVac && !matchClinic && !matchDr && !matchName) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400">
          No vaccination records found matching your filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(rec => {
    const isDoctorVerified = rec.verificationStatus === 'verified_by_doctor';
    const statusBadge = isDoctorVerified
      ? `<span class="badge-completed px-2 py-0.5 rounded-full text-[10px] font-bold">Doctor Verified</span>`
      : `<span class="badge-upcoming px-2 py-0.5 rounded-full text-[10px] font-semibold">Self Reported</span>`;

    const formattedDate = rec.administeredAt
      ? new Date(rec.administeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    const certLink = rec.certificateUrl
      ? `<a href="${rec.certificateUrl}" target="_blank" class="text-xs font-semibold text-sky-600 hover:underline flex items-center justify-end gap-1"><i data-lucide="file-text" class="w-3.5 h-3.5"></i> View</a>`
      : `<span class="text-slate-300 font-mono">—</span>`;

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 px-4 font-bold text-slate-900">
          ${rec.vaccineName}
        </td>
        <td class="py-3.5 px-3 font-medium text-slate-600">
          Dose ${rec.doseNumber}
        </td>
        <td class="py-3.5 px-3 text-slate-700 font-medium">
          ${formattedDate}
        </td>
        <td class="py-3.5 px-3 text-slate-600">
          <span class="font-medium text-slate-800 block">${rec.clinic}</span>
          ${rec.healthcareProfessional ? `<span class="text-[10px] text-slate-400">${rec.healthcareProfessional}</span>` : ''}
        </td>
        <td class="py-3.5 px-3 font-semibold text-slate-800">
          ${rec.dependentId?.name || 'Member'}
        </td>
        <td class="py-3.5 px-3">
          ${statusBadge}
        </td>
        <td class="py-3.5 px-4 text-right">
          ${certLink}
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: tbody });
  }
}
