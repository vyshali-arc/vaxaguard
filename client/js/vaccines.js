/**
 * VaxaGuard Vaccine Directory Logic
 * Search and filter official medical vaccine definitions, dosage timelines, and sources.
 */

let allVaccines = [];
let activeGroup = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('vaccines');

  // Check URL query for pre-filled search
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get('search');
  if (initialSearch) {
    const input = document.getElementById('vac-search-input');
    if (input) input.value = initialSearch;
  }

  // Filter Buttons
  document.querySelectorAll('.vac-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vac-filter-btn').forEach(b => {
        b.classList.remove('bg-white', 'text-slate-900', 'shadow-xs', 'font-bold');
        b.classList.add('text-slate-600', 'font-semibold');
      });
      btn.classList.add('bg-white', 'text-slate-900', 'shadow-xs', 'font-bold');
      btn.classList.remove('text-slate-600', 'font-semibold');

      activeGroup = btn.getAttribute('data-group');
      renderVaccineGrid();
    });
  });

  // Search input
  const searchInput = document.getElementById('vac-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderVaccineGrid();
    });
  }

  await loadVaccines();
});

async function loadVaccines() {
  try {
    const res = await API.get('/vaccines');
    allVaccines = res.data || [];
    renderVaccineGrid();
  } catch (err) {
    console.error('Failed to load vaccines:', err);
    Toast.error('Could not load vaccine directory.');
  }
}

function renderVaccineGrid() {
  const container = document.getElementById('vaccine-cards-grid');
  if (!container) return;

  const searchQuery = document.getElementById('vac-search-input')?.value.toLowerCase().trim() || '';

  const filtered = allVaccines.filter(vac => {
    // Group filter
    if (activeGroup !== 'all') {
      const groups = vac.applicableAgeGroups || [];
      if (!groups.includes(activeGroup) && !groups.includes('all')) return false;
    }
    // Search query
    if (searchQuery) {
      const matchName = (vac.name || '').toLowerCase().includes(searchQuery);
      const matchDisease = (vac.diseaseTarget || '').toLowerCase().includes(searchQuery);
      const matchDesc = (vac.description || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchDisease && !matchDesc) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center bg-white rounded-3xl card-shadow border border-slate-100 space-y-2">
        <i data-lucide="help-circle" class="w-8 h-8 text-slate-300 mx-auto"></i>
        <h4 class="text-sm font-bold text-slate-800">No vaccines match your query</h4>
        <p class="text-xs text-slate-400">Try searching for measles, hepatitis, polio, or influenza.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  container.innerHTML = filtered.map(vac => {
    const dosesListHtml = (vac.doses || []).map(d => `
      <div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0">
        <span class="font-bold text-slate-700">${d.doseLabel}</span>
        <span class="text-slate-500">${d.recommendedAgeText}</span>
      </div>
    `).join('');

    return `
      <div class="bg-white rounded-3xl p-6 card-shadow border border-slate-100 card-hover flex flex-col justify-between space-y-4">
        <div>
          <!-- Header Tag & Name -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
              ${vac.code}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">UIP Approved</span>
          </div>

          <h3 class="text-base font-bold text-slate-900 leading-snug font-['Outfit']">
            ${vac.name}
          </h3>
          <p class="text-xs font-semibold text-sky-600 mt-0.5">
            Prevents: ${vac.diseaseTarget}
          </p>

          <p class="text-xs text-slate-600 mt-2.5 leading-relaxed">
            ${vac.description}
          </p>

          <!-- Doses Schedule Box -->
          <div class="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dose Schedule</p>
            ${dosesListHtml || '<p class="text-xs text-slate-400">Per clinical recommendation</p>'}
          </div>
        </div>

        <!-- Footer Source Citation -->
        <div class="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span class="truncate max-w-[200px]" title="${vac.sourceReference}">Source: ${vac.sourceReference}</span>
          <span class="text-emerald-600 font-bold flex items-center gap-1">
            <i data-lucide="check" class="w-3 h-3"></i> Verified
          </span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}
