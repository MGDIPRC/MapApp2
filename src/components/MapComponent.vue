<template>
  <!-- Skip link for keyboard users to make things accessible -->
  <a class="skip-link" href="#results-heading">Skip to results</a>

  <div id="container">

    <div id="map"></div>

    <div id="filters">
      <!-- Search section (moved to top) -->
      <h3 class="filters-title" style="margin-top: 0;">
        Find a specific clinic
      </h3>

      <!-- Name search -->
      <label class="field">
        <span class="label">Clinic name</span>
        <input
          class="input"
          type="text"
          v-model.trim="nameQuery"
          placeholder="Type part of a clinic name…"
        />
      </label>

      <!-- Postal + radius -->
      <div class="row">
        <label class="field grow">
          <span class="label">Postal code (Canada)</span>
          <input
            class="input"
            type="text"
            v-model.trim="postalQuery"
            placeholder="e.g., L8H 2A3"
          />
        </label>

        <label class="field small">
          <span class="label">Radius (km)</span>
          <select class="input" v-model.number="radiusKm">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>

      <div class="row">
        <button class="btn" @click="runSearch" :disabled="isGeocoding">
          {{ isGeocoding ? 'Searching…' : 'Search' }}
        </button>

        <button class="btn secondary" @click="clearSearch">
          Clear search
        </button>
      </div>

      <p v-if="postalError" class="error">{{ postalError }}</p>
      <p v-if="isPostalActive && activePostalCenter" class="hint">
        Using center: {{ activePostalLabel }} (offline FSA centroid)
      </p>
      <p v-if="postalNoResultsNotice" class="hint" role="status" aria-live="polite">
  {{ postalNoResultsNotice }}
</p>

      <hr />

      <!-- Filters section -->
      <h3 class="filters-title" style="margin-top: 0;">
        Or filter clinics by:
      </h3>

      <!-- Province dropdown with checkboxes -->
      <h4 class="subhead">Province / Territory</h4>

      <div class="dropdown-wrap" ref="provinceDropdown">

        <button
          ref="provinceButton"
          class="input dropdown-button"
          type="button"
          @click="toggleProvinceDropdown"
          @keydown.escape.prevent="closeProvinceDropdown"
          :aria-expanded="String(isProvinceDropdownOpen)"
          aria-controls="province-menu"
        >
          <span>
            Provinces:
            <span v-if="selectedProvinces.length">{{ selectedProvinces.length }} selected</span>
            <span v-else>All</span>
          </span>
          <span class="caret">▾</span>
        </button>

        <div
          v-if="isProvinceDropdownOpen"
          id="province-menu"
          class="dropdown-menu"
          role="menu"
          @keydown.escape.prevent="closeProvinceDropdown"
        >
          <label class="check" v-for="prov in provinces" :key="prov">
            <input
              type="checkbox"
              :checked="selectedProvinces.includes(prov)"
              @change="toggleProvince(prov)"
            />
            <span>{{ prov }}</span>
          </label>

          <div class="dropdown-actions">
            <button class="btn secondary smallbtn" type="button" @click="clearProvincesOnly">
              Clear provinces
            </button>
            <button class="btn smallbtn" type="button" @click="closeProvinceDropdown">
              Done
            </button>
          </div>
        </div>
      </div>

      <hr />

      <!-- Population dropdown -->
      <h4 class="subhead">Population</h4>

      <div class="dropdown-wrap" ref="populationDropdown">
        <button
          ref="populationButton"
          class="input dropdown-button"
          type="button"
          @click="togglePopulationDropdown"
          @keydown.escape.prevent="closePopulationDropdown"
          :disabled="!availablePopulations.length"
          :aria-expanded="String(isPopulationDropdownOpen)"
          aria-controls="population-menu"
        >
          <span>
            Populations:
            <span v-if="selectedPopulations.length">{{ selectedPopulations.length }} selected</span>
            <span v-else>All</span>
          </span>
          <span class="caret">▾</span>
        </button>

        <div
          v-if="isPopulationDropdownOpen"
          id="population-menu"
          class="dropdown-menu"
          role="menu"
          @keydown.escape.prevent="closePopulationDropdown"
        >
          <!-- All toggle -->
          <label class="check">
            <input
              type="checkbox"
              :checked="isAllPopulationsSelected"
              @change="toggleAllPopulations($event)"
            />
            <span><strong>All</strong></span>
          </label>

          <div v-if="availablePopulations.length">
            <label class="check" v-for="p in availablePopulations" :key="p">
              <input
                type="checkbox"
                :checked="selectedPopulations.includes(normalizePopulationKey(p))"
                @change="togglePopulation(p)"
              />
              <span>{{ formatPopulationLabel(p) }}</span>
            </label>
          </div>

          <p v-else class="hint">No populations found yet.</p>

          <div class="dropdown-actions">
            <button
              class="btn secondary smallbtn"
              type="button"
              @click="clearPopulationsOnly"
              :disabled="!selectedPopulations.length"
            >
              Clear populations
            </button>
            <button class="btn smallbtn" type="button" @click="closePopulationDropdown">
              Done
            </button>
          </div>
        </div>
      </div>

      <hr />

      <!-- Services -->
      <h4 class="subhead">Services</h4>

      <label class="field">
        <span class="label">Match mode</span>
        <select class="input" v-model="serviceMatchMode">
          <option value="ANY">Match ANY selected</option>
          <option value="ALL">Match ALL selected</option>
        </select>
      </label>

      <div class="dropdown-wrap" ref="servicesDropdown">
        <button
          ref="servicesButton"
          class="input dropdown-button"
          type="button"
          @click="toggleServicesDropdown"
          @keydown.escape.prevent="closeServicesDropdown"
          :disabled="!availableServices.length"
          :aria-expanded="String(isServicesDropdownOpen)"
          aria-controls="services-menu"
        >
          <span>
            Services:
            <span v-if="selectedServices.length">{{ selectedServices.length }} selected</span>
            <span v-else>All</span>
          </span>
          <span class="caret">▾</span>
        </button>

        <div
          v-if="isServicesDropdownOpen"
          id="services-menu"
          class="dropdown-menu"
          role="menu"
          @keydown.escape.prevent="closeServicesDropdown"
        >
          <div v-if="availableServices.length">
            <label class="check" v-for="s in availableServices" :key="s">
              <input
                type="checkbox"
                :checked="selectedServices.includes(normalizeServiceKey(s))"
                @change="toggleService(s)"
              />
              <span>{{ formatService(s) }}</span>

            </label>
          </div>
          <p v-else class="hint">No services found yet.</p>

          <div class="dropdown-actions">
            <button class="btn secondary smallbtn" type="button" @click="clearServicesOnly" :disabled="!selectedServices.length">
              Clear services
            </button>
            <button class="btn smallbtn" type="button" @click="closeServicesDropdown">
              Done
            </button>
          </div>
        </div>
      </div>

      <hr />

      <!-- Referral -->
      <h4 class="subhead">Referral</h4>
      <label class="field">
        <span class="label">Referral required</span>
        <select class="input" v-model="referralFilter">
          <option value="any">Any</option>
          <option value="required">Required</option>
          <option value="notRequired">Not required</option>
        </select>
      </label>

      <!-- Clear filters button -->
      <div class="row" style="margin-top: 10px;">
        <button class="btn secondary" @click="clearFilters">
          Clear filters
        </button>
      </div>

      <hr />

      <h4 class="subhead">Results</h4>

      <p class="hint" aria-hidden="true">
        Showing {{ displayClinics.length }} clinic<span v-if="displayClinics.length !== 1">s</span>
      </p>

      <!-- Screen-reader live region: announces result updates -->
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ resultsAnnouncement }}
      </div>
    </div>
  </div>


  <!-- RESULTS WRAPPED TO MATCH MAP WIDTH ONLY -->
  <div class="results-wrap">
    <h2 id="results-heading" class="results-title" tabindex="-1">Clinic List</h2>

    <div class="scrollable-container">
      <div id="clinic-list">
        <ul v-if="displayClinics.length > 0" class="filtered-clinic-list">
          <li v-for="clinic in displayClinics" :key="clinic.id" class="filtered-clinic-item">
            <div class="filtered-line clinic-name-maroon">
              {{ displayName(clinic) }}
            </div>

            <div class="filtered-line">
              {{ displayAddressLine(clinic) }}
              <span v-if="!isSmallScreen"> {{ displayProvincePostal(clinic) }}</span>
              <div v-else>{{ displayProvincePostal(clinic) }}</div>
            </div>

            <div class="filtered-line">
              <strong>Telephone:</strong> {{ displayPhone(clinic) }}
            </div>
<!-- Services (3 columns). Hidden if no services exist. -->
            <div
              v-if="Array.isArray(clinic.services) && clinic.services.length"
              class="clinic-services-grid"
              aria-label="Clinic services"
            >
              <div v-for="service in clinic.services" :key="service" class="clinic-service-item">
                <span class="clinic-service-check" aria-hidden="true">✓</span>
                <span class="clinic-service-text">{{ formatService(service) }}</span>
              </div>
            </div>

            <div v-if="isReferralRequired(clinic)" class="filtered-line referral-note">
              Referral required
            </div>

            <div v-if="clinic.website" class="filtered-line website-line">
              <a :href="clinic.website" target="_blank" rel="noopener">
                Click here to visit website
              </a>
            </div>

            <div class="filtered-line button-line">
              <button class="download-vcard-button" @click="downloadVCard(clinic)">
                Download Contact
              </button>

              <button class="view-map-button" type="button" @click="viewOnMap(clinic)">
                View on map
              </button>
            </div>
          </li>
        </ul>

        <p v-else>
          We do not have any clinics listed that match your filters/search.
        </p>
      </div>
    </div>
  </div>
</template>


<script>
import L from 'leaflet';
import clinicIconUrl from '/clinicicon.png';

export default {
  name: 'MapComponent',

  data() {
    return {
      isSmallScreen: false,

      map: null,
      markerLayer: null,
      searchCircle: null,

      // Performance: keep marker instances so we don't rebuild everything on every change
      markersById: new Map(),

      // Performance: debounce marker redraws so rapid changes don't rebuild markers repeatedly
      debouncedUpdateMapMarkers: null,

      // Performance: cache icons so we don't recreate Leaflet icon objects every redraw
      clinicIconCache: {},

      // Province dropdown open state
      isProvinceDropdownOpen: false,

      // Services dropdown open state
      isServicesDropdownOpen: false,

      // ✅ NEW: Population dropdown open state
      isPopulationDropdownOpen: false,

      // Province options (UI labels)
      provinces: [
        'Ontario','Quebec','Manitoba','Saskatchewan','Alberta','British Columbia',
        'Yukon','Northwest Territories','Nunavut','Nova Scotia','New Brunswick','Newfoundland','PEI',
      ],

      // Map views
      initialView: { center: [54.1304, -95.3468], zoom: 4.25 },
      provinceViews: {
        Ontario: { center: [47, -85], zoom: 4.25, smallScreenZoom: 4 },
        Quebec: { center: [50, -71], zoom: 4.25, smallScreenZoom: 4 },
        Manitoba: { center: [53, -97], zoom: 4.25, smallScreenZoom: 4 },
        Saskatchewan: { center: [53, -105], zoom: 4.25, smallScreenZoom: 4 },
        Alberta: { center: [52, -115], zoom: 4.25, smallScreenZoom: 4 },
        'British Columbia': { center: [53, -125], zoom: 4.25, smallScreenZoom: 4 },
        Yukon: { center: [64, -135], zoom: 4.25, smallScreenZoom: 4 },
        'Northwest Territories': { center: [64, -115], zoom: 4.25, smallScreenZoom: 4 },
        Nunavut: { center: [67, -100], zoom: 4.25, smallScreenZoom: 4 },
        'Nova Scotia': { center: [45, -63], zoom: 5, smallScreenZoom: 4 },
        'New Brunswick': { center: [47, -66], zoom: 5, smallScreenZoom: 4 },
        Newfoundland: { center: [49, -56], zoom: 5, smallScreenZoom: 4 },
        PEI: { center: [46.5, -63.5], zoom: 7, smallScreenZoom: 4 },
      },

      // Postal lookup (offline FSA centroids)
      fsaCentroids: null,
      fsaCentroidsLoaded: false,
      postalError: '',
      isGeocoding: false,
      activePostalLabel: '',
    };
  },

  computed: {
    availableServices() {
      return this.$store?.getters?.availableServices || [];
    },

    // populations list comes from store
    availablePopulations() {
      return this.$store?.getters?.availablePopulations || [];
    },

    resultsAnnouncement() {
      const n = this.displayClinics.length;
      return `Showing ${n} clinic${n === 1 ? '' : 's'}.`;
    },

    displayClinics() {
      return this.$store?.getters?.displayClinics || [];
    },

    // FILTERS
    selectedProvinces() {
      return this.$store.state.filters.selectedProvinces;
    },

    selectedServices() {
      return this.$store.state.filters.selectedServices;
    },

    serviceMatchMode: {
      get() {
        return this.$store.state.filters.serviceMatchMode;
      },
      set(val) {
        this.$store.commit('SET_SERVICE_MATCH_MODE', val);
      }
    },

    selectedPopulations() {
      return this.$store.state.filters.selectedPopulations || [];
    },

    // "All" checkbox state for populations
    isAllPopulationsSelected() {
      const opts = (this.availablePopulations || []).map((p) => this.normalizePopulationKey(p));
      if (!opts.length) return false;

      const selected = this.selectedPopulations || [];
      return selected.length === opts.length;
    },

    referralFilter: {
      get() {
        return this.$store.state.filters.referralFilter;
      },
      set(val) {
        this.$store.commit('SET_REFERRAL_FILTER', val);
      }
    },

    // SEARCH INPUTS
    nameQuery: {
      get() {
        return this.$store.state.searchInputs.nameQuery;
      },
      set(val) {
        this.$store.commit('SET_NAME_QUERY', val);
      }
    },

    postalQuery: {
      get() {
        return this.$store.state.searchInputs.postalQuery;
      },
      set(val) {
        this.$store.commit('SET_POSTAL_QUERY', val);
      }
    },

    radiusKm: {
      get() {
        return this.$store.state.searchInputs.radiusKm;
      },
      set(val) {
        this.$store.commit('SET_RADIUS_KM', val);

        this.safeMapAction(() => {
          if (this.isPostalActive && this.activePostalCenter) {
            this.fitMapToRadiusMath(this.activePostalCenter, this.radiusKm);
            this.drawSearchCircleSafe(this.activePostalCenter, this.radiusKm);
          }
        });
      }
    },

    // Active search state
    activeSearchMode() {
      return this.$store.state.searchActive.activeSearchMode;
    },

    activePostalCenter() {
      return this.$store.state.searchActive.activePostalCenter;
    },

    isPostalActive() {
      return this.activeSearchMode === 'postal';
    },
  
    postalNoResultsNotice() {
  // Making this so it only shows up when a postal search is active AND no results meet the criteria
  if (!this.isPostalActive) return '';
  if (!this.activePostalCenter) return '';
  if (this.isGeocoding) return '';
  if (this.postalError) return '';

  const n = Array.isArray(this.displayClinics) ? this.displayClinics.length : 0;
  if (n > 0) return '';

  const km = Number(this.radiusKm || 0);
  const label = this.activePostalLabel ? this.activePostalLabel : 'your postal code';

  return `No clinics meeting your selected criteria were found within ${km} km of ${label}. Try increasing the search distance or adjusting your filters.`;
},

  },

  watch: {
    displayClinics() {
      if (this.debouncedUpdateMapMarkers) this.debouncedUpdateMapMarkers();
      else this.updateMapMarkers();
    },

    activePostalCenter() {
      this.safeMapAction(() => {
        if (this.isPostalActive && this.activePostalCenter) {
          this.fitMapToRadiusMath(this.activePostalCenter, this.radiusKm);
          this.drawSearchCircleSafe(this.activePostalCenter, this.radiusKm);
        } else {
          this.removeSearchCircle();
        }
      });
    }
  },

  mounted() {
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize);

    // click-outside to close dropdowns
    document.addEventListener('click', this.onDocClick);

    this.initMap();

    // Performance: create a debounced redraw function once
    this.debouncedUpdateMapMarkers = this.debounce(() => {
      this.updateMapMarkers();
    }, 50);

    // Leaflet: recalc size after layout settles
    this.$nextTick(() => {
      if (this.map) this.map.invalidateSize(true);
    });
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkScreenSize);
    document.removeEventListener('click', this.onDocClick);

    try {
      if (this.map) {
        this.map.off();
        this.map.remove();
      }
    } catch (_) {}

    this.map = null;
    this.markerLayer = null;
    this.searchCircle = null;
    this.markersById = new Map();
    this.clinicIconCache = {};
    this.debouncedUpdateMapMarkers = null;
  },

  methods: {
    getClinicIconSizeForZoom(z) {
      if (z < 5) return 30;
      if (z < 7) return 45;
      if (z < 9) return 55;
      return 65;
    },

    getClinicIconForZoom(z) {
      const size = this.getClinicIconSizeForZoom(z);
      const key = String(size);

      if (this.clinicIconCache[key]) return this.clinicIconCache[key];

      const aspect = 470 / 356;
      const w = size;
      const h = Math.round(size * aspect);

      const icon = L.icon({
        iconUrl: clinicIconUrl,
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
        popupAnchor: [0, -h],
      });

      this.clinicIconCache[key] = icon;
      return icon;
    },

    debounce(fn, wait = 120) {
      let t = null;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    },

    // normalize + labels for populations
    normalizePopulationKey(v) {
      return String(v ?? '').trim().toLowerCase();
    },

    formatPopulationLabel(v) {
      const s = String(v ?? '').trim();
      if (!s) return '';
      return s.replace(/\b\w/g, (c) => c.toUpperCase());
    },

    // population dropdown open/close
    togglePopulationDropdown() {
      this.isPopulationDropdownOpen = !this.isPopulationDropdownOpen;

      if (this.isPopulationDropdownOpen) {
        this.focusFirstCheckbox('populationDropdown');
      }
    },

    closePopulationDropdown() {
      this.isPopulationDropdownOpen = false;

      this.$nextTick(() => {
        const btn = this.$refs.populationButton;
        if (btn) btn.focus();
      });
    },

    clearPopulationsOnly() {
      this.$store.commit('SET_SELECTED_POPULATIONS', []);
    },

    toggleAllPopulations(e) {
      const checked = !!e?.target?.checked;
      const opts = (this.availablePopulations || []).map((p) => this.normalizePopulationKey(p));

      if (!opts.length) {
        this.$store.commit('SET_SELECTED_POPULATIONS', []);
        return;
      }

      if (checked) {
        this.$store.commit('SET_SELECTED_POPULATIONS', opts);
      } else {
        this.$store.commit('SET_SELECTED_POPULATIONS', []);
      }
    },

    togglePopulation(pop) {
      const key = this.normalizePopulationKey(pop);
      const current = this.selectedPopulations || [];
      const next = current.slice();
      const i = next.indexOf(key);

      if (i >= 0) next.splice(i, 1);
      else next.push(key);

      this.$store.commit('SET_SELECTED_POPULATIONS', next);
    },

    isReferralRequired(clinic) {
      const raw = clinic?.referralRequired ?? clinic?.ReferralRequired ?? clinic?.referral ?? '';
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).trim().toLowerCase();
      return ['true', 'yes', 'y', '1', 'required'].includes(s);
    },

    focusFirstCheckbox(menuRefName) {
      this.$nextTick(() => {
        const root = this.$refs[menuRefName];
        if (!root) return;
        const firstInput = root.querySelector('input[type="checkbox"]');
        if (firstInput) firstInput.focus();
      });
    },

    // Close dropdown when clicking outside
    onDocClick(e) {
      if (this.isProvinceDropdownOpen) {
        const pRoot = this.$refs.provinceDropdown;
        if (pRoot && !pRoot.contains(e.target)) this.isProvinceDropdownOpen = false;
      }

      if (this.isServicesDropdownOpen) {
        const sRoot = this.$refs.servicesDropdown;
        if (sRoot && !sRoot.contains(e.target)) this.isServicesDropdownOpen = false;
      }

      if (this.isPopulationDropdownOpen) {
        const popRoot = this.$refs.populationDropdown;
        if (popRoot && !popRoot.contains(e.target)) this.isPopulationDropdownOpen = false;
      }
    },

    toggleProvinceDropdown() {
      this.isProvinceDropdownOpen = !this.isProvinceDropdownOpen;

      if (this.isProvinceDropdownOpen) {
        this.focusFirstCheckbox('provinceDropdown');
      }
    },

    closeProvinceDropdown() {
      this.isProvinceDropdownOpen = false;

      this.$nextTick(() => {
        const btn = this.$refs.provinceButton;
        if (btn) btn.focus();
      });
    },

    clearProvincesOnly() {
      this.$store.commit('SET_SELECTED_PROVINCES', []);
      this.updateMapView();
    },

    toggleServicesDropdown() {
      this.isServicesDropdownOpen = !this.isServicesDropdownOpen;

      if (this.isServicesDropdownOpen) {
        this.focusFirstCheckbox('servicesDropdown');
      }
    },

    closeServicesDropdown() {
      this.isServicesDropdownOpen = false;

      this.$nextTick(() => {
        const btn = this.$refs.servicesButton;
        if (btn) btn.focus();
      });
    },

    clearServicesOnly() {
      this.$store.commit('SET_SELECTED_SERVICES', []);
    },

    toggleProvince(prov) {
      const current = this.$store.state.filters.selectedProvinces || [];
      const next = current.slice();
      const i = next.indexOf(prov);
      if (i >= 0) next.splice(i, 1);
      else next.push(prov);

      this.$store.commit('SET_SELECTED_PROVINCES', next);
      this.updateMapView();
    },

    normalizeServiceKey(service) {
      return String(service ?? '').toLowerCase().trim();
    },

    toggleService(service) {
      const key = this.normalizeServiceKey(service);
      const current = this.$store.state.filters.selectedServices || [];
      const next = current.slice();
      const i = next.indexOf(key);
      if (i >= 0) next.splice(i, 1);
      else next.push(key);
      this.$store.commit('SET_SELECTED_SERVICES', next);
    },

    clearFilters() {
      this.$store.commit('RESET_FILTERS');
      this.updateMapView();
    },

    async runSearch() {
      this.postalError = '';

      const postalRaw = String(this.postalQuery ?? '').trim();
      const nameRaw = String(this.nameQuery ?? '').trim();

      if (postalRaw || nameRaw) {
        this.$store.commit('SET_SELECTED_PROVINCES', []);
        this.updateMapView();
      }

      if (postalRaw) {
        await this.applyPostalSearch(postalRaw);
        return;
      }

      if (nameRaw) {
        this.$store.commit('APPLY_NAME_SEARCH');
        return;
      }

      this.postalError = 'Enter a clinic name or a postal code to search.';
    },

    clearSearch() {
      this.postalError = '';
      this.activePostalLabel = '';
      this.$store.commit('CLEAR_SEARCH');

      this.safeMapAction(() => {
        this.removeSearchCircle();
        this.updateMapView();
        this.updateMapMarkers();
      });
    },

    async loadFsaCentroids() {
  if (this.fsaCentroidsLoaded) return;

  const candidates = [];

  try {
    candidates.push(new URL('canada_fsa_centroids.json', import.meta.env.BASE_URL).toString());
  } catch (e) {
    // ignore
  }


  candidates.push('canada_fsa_centroids.json');
  candidates.push('./canada_fsa_centroids.json');


  try {
    const baseDir = window.location.href.replace(/[#?].*$/, '').replace(/\/[^/]*$/, '/');
    candidates.push(new URL('canada_fsa_centroids.json', baseDir).toString());
  } catch (e) {
    // ignore
  }

  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      this.fsaCentroids = await res.json();
      this.fsaCentroidsLoaded = true;
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(
    `Missing canada_fsa_centroids.json. Tried: ${candidates.join(', ')}. Last error: ${lastErr?.message || 'unknown'}`
  );
},

    normalizeCanadianPostal(postal) {
      const p = String(postal || '').toUpperCase().replace(/\s+/g, '').trim();
      if (p.length === 6) return `${p.slice(0, 3)} ${p.slice(3)}`;
      return String(postal || '').trim();
    },

    async applyPostalSearch(postalRaw) {
      this.isGeocoding = true;

      try {
        await this.loadFsaCentroids();

        const normalized = this.normalizeCanadianPostal(postalRaw);
        const postalNoSpace = normalized.toUpperCase().replace(/\s+/g, '');
        const fsa = postalNoSpace.slice(0, 3);

        if (!/^[A-Z]\d[A-Z]$/.test(fsa)) {
          this.postalError = 'That does not look like a Canadian postal code (expected A1A 1A1).';
          return;
        }

        const hit = this.fsaCentroids?.[fsa];
        if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) {
          this.postalError = `Postal area not found for FSA ${fsa}.`;
          return;
        }

        this.activePostalLabel = fsa;

        this.$store.commit('APPLY_POSTAL_SEARCH', { lat: hit.lat, lng: hit.lon });

        await this.safeMapAction(() => {
          this.fitMapToRadiusMath({ lat: hit.lat, lng: hit.lon }, this.radiusKm);
          this.drawSearchCircleSafe([hit.lat, hit.lon], this.radiusKm);
        });
      } catch (e) {
        this.postalError = `Postal lookup failed: ${e.message}`;
      } finally {
        this.isGeocoding = false;
      }
    },

    async safeMapAction(fn) {
      await this.$nextTick();
      if (!this.map) return;

      try {
        this.map.invalidateSize(true);
      } catch (_) {
        return;
      }

      try {
        fn();
      } catch (e) {
        this.postalError = `Map action failed: ${e.message}`;
      }
    },

    clean(v) { return String(v ?? '').trim(); },

    displayName(c) { return this.clean(c.name || c.Name || ''); },
    displayAddressLine(c) {
      const addr = this.clean(c.address || c.Address || '');
      const city = this.clean(c.city || c.City || '');
      return [addr, city].filter(Boolean).join(', ');
    },
    displayProvincePostal(c) {
      const prov = this.clean(c.province || c.Province || '');
      const postal = this.clean(c.postal || c.Postal || '');
      return [prov, postal].filter(Boolean).join(', ');
    },
    displayPhone(c) { return this.clean(c.telephone || c.Telephone || c.phone || ''); },

    checkScreenSize() {
      this.isSmallScreen = window.innerWidth <= 480;
      if (this.map) this.map.invalidateSize();
    },

    getZoomLevel(baseZoom) {
      return this.isSmallScreen ? baseZoom - 1 : baseZoom;
    },

    initMap() {
      if (this.map) return;

      this.map = L.map('map').setView(this.initialView.center, this.getZoomLevel(this.initialView.zoom));

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);

      this.map.on('zoomend', () => {
        if (this.debouncedUpdateMapMarkers) this.debouncedUpdateMapMarkers();
        else this.updateMapMarkers();
      });

      this.safeMapAction(() => {
        this.updateMapMarkers();
      });
    },

    updateMapView() {
      if (!this.map) return;
      if (this.isPostalActive && this.activePostalCenter) return;

      const selected = this.selectedProvinces || [];

      if (!selected.length) {
        this.map.setView(this.initialView.center, this.getZoomLevel(this.initialView.zoom));
      } else if (selected.length === 1) {
        const prov = selected[0];
        const view = this.provinceViews[prov];
        if (view) {
          const z = this.isSmallScreen ? view.smallScreenZoom : view.zoom;
          this.map.setView(view.center, z + 1);
        }
      } else {
        this.map.setView(this.initialView.center, this.getZoomLevel(this.initialView.zoom));
      }
    },

    removeSearchCircle() {
      if (!this.map) return;
      if (this.searchCircle) {
        try { this.map.removeLayer(this.searchCircle); } catch (_) {}
        this.searchCircle = null;
      }
    },

    drawSearchCircleSafe(latlng, radiusKm) {
      if (!this.map) return;

      this.removeSearchCircle();
      if (!latlng) return;

      try {
        const meters = Number(radiusKm || 10) * 1000;
        this.searchCircle = L.circle(latlng, { radius: meters });
        this.searchCircle.addTo(this.map);
      } catch (_) {
        this.searchCircle = null;
      }
    },

    fitMapToRadiusMath(center, km) {
      if (!this.map || !center) return;

      const lat = center.lat ?? center[0];
      const lng = center.lng ?? center[1];
      const radiusKm = Number(km || 10);

      const latDelta = radiusKm / 110.574;
      const lngDelta = radiusKm / (111.320 * Math.cos((lat * Math.PI) / 180));

      const south = lat - latDelta;
      const north = lat + latDelta;
      const west = lng - lngDelta;
      const east = lng + lngDelta;

      const bounds = L.latLngBounds([south, west], [north, east]);
      this.map.fitBounds(bounds, { padding: [20, 20] });
    },

    getClinicId(clinic) {
      const id = clinic?.id ?? clinic?.ID ?? clinic?._id;
      if (id !== undefined && id !== null && String(id).trim() !== '') return String(id);

      const loc = Array.isArray(clinic?.location) ? clinic.location : [];
      const lat = loc[0] ?? '';
      const lng = loc[1] ?? '';
      const name = this.displayName(clinic) || '';
      return `${name}|${lat}|${lng}`;
    },

    buildPopupContent(clinic) {
      const name = this.displayName(clinic);
      const addr = this.displayAddressLine(clinic);
      const provPostal = this.displayProvincePostal(clinic);
      const phone = this.displayPhone(clinic);

      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div>
          <b>${name}</b><br/>
          ${addr}<br/>
          ${provPostal}<br/>
          <strong>Telephone:</strong> ${phone}<br/>
           ${Array.isArray(clinic.services) && clinic.services.some(s => String(s).trim()) ? `<div style="height:1px;"></div>` : ''}

           <span style="font-weight:700;">Services:</span>
          ${(() => {
            const services = Array.isArray(clinic.services) ? clinic.services.filter(Boolean) : [];
            if (!services.length) return '';
                          const items = services.map(s => {
              const label = this.formatService(s);
              if (!label) return '';
                const safe = this.escapeHtmlBasic(label);

              return `<div style="display:flex;gap:4px;align-items:flex-start;line-height:1.2;font-size:12px;"><span style="color:#7A003C;font-weight:800;">✓</span><span>${safe}</span></div>`;
            }).join('');

            return `<div style="margin-top:2px; display:grid; grid-template-columns:repeat(3, max-content); justify-content:start; column-gap:5px; row-gap:4px; font-size:12px;">${items}</div>`;
          })()}
          

          ${(() => {
            const raw = clinic?.populationServed ?? clinic?.PopulationServed ?? clinic?.population ?? '';
            if (!raw) return '';

            let parts = [];
            if (Array.isArray(raw)) {
              parts = raw.map(x => String(x).trim()).filter(Boolean);
            } else {
              const t = String(raw).trim();
              if (!t) return '';
              parts = t.split(/[,/|;]/).map(x => x.trim()).filter(Boolean);
              if (parts.length === 1 && String(parts[0]).toLowerCase() === 'both') parts = ['Adult', 'Pediatric'];
            }

            const safeParts = parts.map(p => this.escapeHtmlBasic(this.formatPopulationLabel(p)));
            return `<div style="margin-top:6px;"><span style="font-weight:700;">Populations Served:</span> ${safeParts.join(' • ')}</div>`;
          })()}

          ${this.isReferralRequired(clinic)
            ? `<div style="margin-top:6px;font-size:12px;color:#7A003C;opacity:.85;">Referral required</div>`
            : ''}<br/>

          ${clinic.website ? `<a href="${clinic.website}" target="_blank" rel="noopener">Click here to visit website</a>` : ''} <br/>
          <br/>
          <button
            class="download-vcard-button"
            style="padding:8px 10px;border-radius:6px;cursor:pointer;background:#09A4AC;color:white;font-weight:800;border:none;"
          >
            Download Contact
          </button>
        </div>
      `;

      return popupContent;
    },

    updateMapMarkers() {
      if (!this.map || !this.markerLayer) return;

      const zoom = this.map.getZoom();
      const icon = this.getClinicIconForZoom(zoom);

      const nextIds = new Set();

      for (const clinic of this.displayClinics) {
        const loc = clinic.location;
        if (!loc || !Array.isArray(loc) || loc.length !== 2) continue;

        const clat = Number(loc[0]);
        const clng = Number(loc[1]);
        if (!Number.isFinite(clat) || !Number.isFinite(clng)) continue;

        const id = this.getClinicId(clinic);
        nextIds.add(id);

        const existing = this.markersById.get(id);

        if (!existing) {
          const popupContent = this.buildPopupContent(clinic);
          const marker = L.marker([clat, clng], { icon }).addTo(this.markerLayer);
          marker.bindPopup(popupContent);

          const btn = popupContent.querySelector('.download-vcard-button');
          if (btn) btn.onclick = () => this.downloadVCard(clinic);

          this.markersById.set(id, { marker, lat: clat, lng: clng });
          continue;
        }

        if (existing.lat !== clat || existing.lng !== clng) {
          existing.marker.setLatLng([clat, clng]);
          existing.lat = clat;
          existing.lng = clng;
        }

        existing.marker.setIcon(icon);
      }

      for (const [id, entry] of this.markersById.entries()) {
        if (!nextIds.has(id)) {
          try {
            this.markerLayer.removeLayer(entry.marker);
          } catch (_) {}
          this.markersById.delete(id);
        }
      }

      if (this.isPostalActive && this.activePostalCenter) {
        this.drawSearchCircleSafe([this.activePostalCenter.lat, this.activePostalCenter.lng], this.radiusKm);
      }
    },

    escapeHtmlBasic(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },

    formatService(service) {
      const s = String(service ?? '').trim();
      if (!s) return '';
      return s.replace(/\b\w/g, (c) => c.toUpperCase());
    },

    viewOnMap(clinic) {
      if (!this.map) return;

      if (this.isProvinceDropdownOpen) this.closeProvinceDropdown();
      if (this.isServicesDropdownOpen) this.closeServicesDropdown();
      if (this.isPopulationDropdownOpen) this.closePopulationDropdown();

      try { this.map.closePopup(); } catch (_) {}

      const mapEl = document.getElementById('map');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const id = this.getClinicId(clinic);
      const entry = this.markersById?.get(id);

      if (entry?.marker) {
        const prevCenter = this.map.getCenter();
        const prevZoom = this.map.getZoom();

        const ll = entry.marker.getLatLng();
        const targetZoom = Math.max(prevZoom, 12);

        this.map.setView(ll, targetZoom, { animate: true });
        entry.marker.openPopup();

        entry.marker.once('popupclose', () => {
          this.map.setView(prevCenter, prevZoom, { animate: true });
        });

        return;
      }

      const loc = clinic?.location;
      if (Array.isArray(loc) && loc.length === 2) {
        const clat = Number(loc[0]);
        const clng = Number(loc[1]);
        if (Number.isFinite(clat) && Number.isFinite(clng)) {
          const prevCenter = this.map.getCenter();
          const prevZoom = this.map.getZoom();

          this.map.setView([clat, clng], Math.max(prevZoom, 12), { animate: true });

          this.map.once('popupclose', () => {
            this.map.setView(prevCenter, prevZoom, { animate: true });
          });
        }
      }
    },

    createVCard(clinic) {
      const name = this.displayName(clinic);
      const phone = this.displayPhone(clinic);
      const email = this.clean(clinic.email || clinic.Email || '');
      const url = this.clean(clinic.website || '');
      const addr = this.clean(clinic.address || '');
      const city = this.clean(clinic.city || '');
      const prov = this.clean(clinic.province || clinic.Province || '');
      const postal = this.clean(clinic.postal || clinic.Postal || '');

      return `BEGIN:VCARD
VERSION:3.0
FN:${name}
N:;${name};;;
ORG:${name}
TEL;TYPE=WORK,VOICE:${phone}
EMAIL;TYPE=WORK:${email}
URL:${url}
ADR;TYPE=WORK:;;${addr};${city};${prov};${postal};
UID:${clinic.id || new Date().toISOString()}@mapapp
REV:${new Date().toISOString()}
END:VCARD`;
    },

    downloadVCard(clinic) {
      const vCardContent = this.createVCard(clinic);
      const blob = new Blob([vCardContent], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const filename = `${this.displayName(clinic).replace(/\s+/g, '_') || 'clinic'}.vcf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(url);
    },
  }
};
</script>

<style scoped>
#container {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

/* Skip link (visible on keyboard focus) */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 10px;
  background: #7A003C;
  color: white;
  padding: 8px 10px;
  border-radius: 6px;
  font-weight: 800;
  z-index: 10000;
}

.skip-link:focus {
  left: 10px;
}

/* Screen-reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Visible focus for keyboard users */
:focus-visible {
  outline: 3px solid #09A4AC;
  outline-offset: 2px;
}

.view-map-button {
  margin-left: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: #09A4AC;
  color: white;
  font-weight: 800;
  border: none;
}

#map {
  width: 75%;
  min-height: 560px;
  border-radius: 6px;
}

#filters {
  width: 25%;
  min-height: 560px;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  height: auto;
}

.results-wrap {
  width: 75%;
  margin-top: 10px;
  padding-left: 26px;
  box-sizing: border-box;
}

.results-title {
  color: #7A003C;
  font-weight: 800;
  margin: 0 0 5px 0;
}

/* Filtered results list styles ONLY (do not affect anything else) */
.filtered-clinic-list {
  list-style: none;
  padding: 8px 0 6px 0;
  margin: 0;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
}

.filtered-clinic-item {
  padding: 0px 0 12px 0;
}

.filtered-clinic-item:not(:last-child)::after {
  content: "";
  display: block;
  width: 192px;
  border-bottom: 1px dotted #c7c7c7;
  margin: 8px 0;
}

.filtered-clinic-item .download-vcard-button {
  margin-top: 2px;
  margin-bottom: 12px;

  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: #09A4AC;
  color: white;
  font-weight: 800;
  border: none;
}

.filtered-clinic-item .download-vcard-button:hover {
  filter: brightness(0.95);
}

.filtered-clinic-item .download-vcard-button:active {
  transform: translateY(1px);
}

.filtered-line {
  margin: 5px;
}

.clinic-name-maroon {
  color: #7A003C;
  font-weight: 800;
  margin-bottom: 4px;
}

.referral-note {
  color: #7A003C;
  opacity: 0.85;
  margin-top: 10px;
  font-size: 15px;
  font-weight: 500;
  margin-left: 13px;
}

.website-line {
  margin-top: 10px;
  margin-left: 13px;
}

.website-line a {
  font-size: 15px;
}

.button-line {
  margin-top: 10px;
}

.clinic-services-grid {
  display: grid;
  grid-template-columns: repeat(4, max-content);
  justify-content: start;
  column-gap: 12px;
  row-gap: 4px;
  margin-top: 6px;
}

.clinic-service-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 2px;
  line-height: 1.2;
  font-size: 15px;
}

.clinic-service-check {
  color: #7A003C;
  font-weight: 800;
}

.clinic-service-text {
  word-break: break-word;
}

.filters-title {
  margin: 0 0 10px 0;
  color: #7A003C;
  font-weight: 800;
}

.subhead {
  margin: 10px 0 6px;
  color: #333;
  font-weight: 800;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  color: #333;
  font-weight: 700;
}

.input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
}

.row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.grow { flex: 1; }
.small { width: 120px; }

.btn {
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #7A003C;
  color: white;
  font-weight: 700;
}

.btn.secondary {
  background: #e9e9e9;
  color: #333;
  border: 1px solid #ccc;
}

.btn.smallbtn {
  padding: 6px 10px;
  font-weight: 800;
}

.check {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 4px 0;
}

.hint {
  font-size: 12px;
  color: #666;
  margin: 6px 0 0;
}

.error {
  color: #b00020;
  font-weight: 700;
}

/* Province/Services/Population popover dropdown */
.dropdown-wrap {
  position: relative;
}

.dropdown-button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.caret {
  margin-left: 8px;
  opacity: 0.8;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 9999;

  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  padding: 10px;

  max-height: 240px;
  overflow: auto;

  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
}

.dropdown-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.scrollable-container {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
}

@media (max-width: 900px) {
  #container {
    flex-direction: column;
  }

  #map, #filters, .results-wrap {
    width: 100%;
  }

  #map {
    min-height: 360px;
  }
}
</style>
