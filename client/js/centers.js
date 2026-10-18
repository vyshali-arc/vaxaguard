/**
 * VaxaGuard Nearby Vaccination Centers
 * Renders accredited clinics, distances, contact info, and directions.
 */

const verifiedCenters = [
  {
    name: 'City Care Hospital',
    type: 'Multi-Specialty & Pediatric Hospital',
    distanceKm: 1.2,
    address: 'Plot 42, Health City Avenue, Madhapur',
    hours: '24 Hours • Emergency & Immunization Wing',
    phone: '+91 40 2345 6789',
    tags: ['All Age Groups', 'Cold-Chain Certified', 'Adult Boosters'],
    rating: 4.8
  },
  {
    name: 'Primary Health Center (PHC)',
    type: 'Government Health Center',
    distanceKm: 2.4,
    address: 'Near Old Bus Depot, Sector 4',
    hours: 'Mon – Sat: 09:00 AM – 04:00 PM',
    phone: '+91 40 2311 0022',
    tags: ['Govt. Free Immunization', 'UIP Standard', 'Polio Drops'],
    rating: 4.5
  },
  {
    name: 'Child Immunization Clinic',
    type: 'Specialized Pediatric Clinic',
    distanceKm: 3.1,
    address: 'Suite 201, Lotus Children Center',
    hours: 'Mon – Sat: 10:00 AM – 07:00 PM',
    phone: '+91 40 2988 4411',
    tags: ['Infant Specialists', 'Painless Injections', 'IAP Certified'],
    rating: 4.9
  },
  {
    name: 'Apollo Clinic & Diagnostic Hub',
    type: 'Community Health Center',
    distanceKm: 4.5,
    address: 'Main Road, Jubilee Hills',
    hours: 'Mon – Sun: 08:00 AM – 08:00 PM',
    phone: '+91 40 6655 8899',
    tags: ['Senior Flu Shots', 'Travel Vaccines', 'Pre-Booking'],
    rating: 4.7
  }
];

document.addEventListener('DOMContentLoaded', () => {
  Components.initCommon('centers');

  const searchInput = document.getElementById('center-search-input');
  const distanceSelect = document.getElementById('distance-filter-select');

  if (searchInput) {
    searchInput.addEventListener('input', renderCentersList);
  }
  if (distanceSelect) {
    distanceSelect.addEventListener('change', renderCentersList);
  }

  renderCentersList();
});

function renderCentersList() {
  const container = document.getElementById('centers-list-container');
  if (!container) return;

  const searchQuery = document.getElementById('center-search-input')?.value.toLowerCase().trim() || '';
  const maxDistance = document.getElementById('distance-filter-select')?.value || 'all';

  const filtered = verifiedCenters.filter(c => {
    // Distance filter
    if (maxDistance !== 'all') {
      const max = parseFloat(maxDistance);
      if (c.distanceKm > max) return false;
    }
    // Search filter
    if (searchQuery) {
      const matchName = c.name.toLowerCase().includes(searchQuery);
      const matchAddr = c.address.toLowerCase().includes(searchQuery);
      const matchType = c.type.toLowerCase().includes(searchQuery);
      if (!matchName && !matchAddr && !matchType) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-3xl card-shadow border border-slate-100 space-y-2">
        <p class="text-xs font-bold text-slate-800">No centers match this search radius</p>
        <p class="text-[11px] text-slate-400">Try widening your search distance or query.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const tagsHtml = c.tags.map(t => `
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
        ${t}
      </span>
    `).join('');

    return `
      <div class="bg-white rounded-3xl p-5 sm:p-6 card-shadow border border-slate-100 card-hover flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900">${c.name}</h3>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  ★ ${c.rating}
                </span>
              </div>
              <p class="text-xs text-sky-600 font-semibold mt-0.5">${c.type}</p>
            </div>

            <!-- Distance Badge -->
            <div class="text-right flex-shrink-0">
              <span class="text-xs font-extrabold text-slate-900 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-100">
                ${c.distanceKm} km
              </span>
            </div>
          </div>

          <p class="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${c.address}
          </p>
          <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i> ${c.hours}
          </p>

          <div class="flex flex-wrap gap-1.5 pt-3">
            ${tagsHtml}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-600 font-medium">${c.phone}</span>
          <button onclick="alert('Navigating to: ${c.name}\\nAddress: ${c.address}');"
            class="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
            <i data-lucide="navigation" class="w-3.5 h-3.5"></i>
            <span>Get Directions</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}
