import { createStore } from 'vuex';
import { loadClinicData } from '@/utils/loadClinics';

// Helper: safe string compare
function includesText(haystack, needle) {
  if (!needle) return true;
  return String(haystack ?? '')
    .toLowerCase()
    .includes(String(needle).toLowerCase());
}

// Helper: distance in km between two lat/lng points (Haversine)
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const store = createStore({
  state() {
    return {
      // Full, unfiltered dataset
      clinicsAll: [],

      // =========================
      // INSTANT FILTERS (apply immediately)
      // =========================
      filters: {
        selectedProvinces: [],       // array of province values (multi select)
        selectedServices: [],        // array
        serviceMatchMode: 'ANY',     // "ANY" | "ALL"
        selectedPopulations: [],     // array: ["adult","pediatric","both"]
        referralFilter: 'any',       // "any" | "required" | "notRequired"
      },

      // =========================
      // SEARCH INPUTS (button-driven)
      // =========================
      searchInputs: {
        nameQuery: '',
        postalQuery: '',
        radiusKm: 10,
      },

      // =========================
      // ACTIVE SEARCH (currently applied)
      // =========================
      searchActive: {
        activeSearchMode: 'none',    // "none" | "name" | "postal"
        activeNameQuery: '',
        activePostalCenter: null,    // { lat, lng } or null
        activeRadiusKm: 10,
      },

      // Optional (existing)
      selectedClinicId: null,
    };
  },

  mutations: {
    // Data
    SET_CLINICS_ALL(state, clinics) {
      state.clinicsAll = clinics;
    },

    // =========================
    // FILTER mutations
    // =========================
    SET_SELECTED_PROVINCES(state, provinces) {
      state.filters.selectedProvinces = Array.isArray(provinces) ? provinces : [];
    },

    SET_SELECTED_SERVICES(state, services) {
      state.filters.selectedServices = Array.isArray(services) ? services : [];
    },

    SET_SERVICE_MATCH_MODE(state, mode) {
      // accept "ANY" / "ALL" (case-insensitive)
      const m = String(mode ?? '').toUpperCase();
      state.filters.serviceMatchMode = m === 'ALL' ? 'ALL' : 'ANY';
    },

    SET_SELECTED_POPULATIONS(state, populations) {
      state.filters.selectedPopulations = Array.isArray(populations) ? populations : [];
    },

    SET_REFERRAL_FILTER(state, value) {
      const v = String(value ?? 'any');
      // "any" | "required" | "notRequired"
      state.filters.referralFilter =
        v === 'required' ? 'required' : v === 'notRequired' ? 'notRequired' : 'any';
    },

    RESET_FILTERS(state) {
      state.filters.selectedProvinces = [];
      state.filters.selectedServices = [];
      state.filters.serviceMatchMode = 'ANY';
      state.filters.selectedPopulations = [];
      state.filters.referralFilter = 'any';
    },

    // =========================
    // SEARCH INPUT mutations (what the user typed)
    // =========================
    SET_NAME_QUERY(state, value) {
      state.searchInputs.nameQuery = String(value ?? '');
    },

    SET_POSTAL_QUERY(state, value) {
      state.searchInputs.postalQuery = String(value ?? '');
    },

    SET_RADIUS_KM(state, value) {
      const n = Number(value);
      state.searchInputs.radiusKm = Number.isFinite(n) ? n : 10;
    },

    // =========================
    // ACTIVE SEARCH mutations (what is applied)
    // =========================
    SET_ACTIVE_SEARCH_MODE(state, mode) {
      const m = String(mode ?? 'none');
      state.searchActive.activeSearchMode =
        m === 'name' ? 'name' : m === 'postal' ? 'postal' : 'none';
    },

    APPLY_NAME_SEARCH(state) {
      state.searchActive.activeSearchMode = 'name';
      state.searchActive.activeNameQuery = String(state.searchInputs.nameQuery ?? '').trim();

      // Clear postal active search
      state.searchActive.activePostalCenter = null;
      state.searchActive.activeRadiusKm = state.searchInputs.radiusKm;
    },

    APPLY_POSTAL_SEARCH(state, payload) {
      // payload: { lat, lng }
      state.searchActive.activeSearchMode = 'postal';
      state.searchActive.activePostalCenter =
        payload && Number.isFinite(payload.lat) && Number.isFinite(payload.lng)
          ? { lat: payload.lat, lng: payload.lng }
          : null;

      state.searchActive.activeRadiusKm = Number(state.searchInputs.radiusKm) || 10;

      // Clear name active search
      state.searchActive.activeNameQuery = '';
    },

    CLEAR_SEARCH(state) {
      // Clear inputs too (you requested a clear search button later)
      state.searchInputs.nameQuery = '';
      state.searchInputs.postalQuery = '';
      state.searchInputs.radiusKm = 10;

      state.searchActive.activeSearchMode = 'none';
      state.searchActive.activeNameQuery = '';
      state.searchActive.activePostalCenter = null;
      state.searchActive.activeRadiusKm = 10;
    },
  },

  actions: {
    async fetchClinics({ commit }) {
      try {
        const clinics = await loadClinicData();
        console.log('Loaded clinics:', clinics.length, clinics[0]);
        commit('SET_CLINICS_ALL', clinics);
      } catch (error) {
        console.error('Failed to fetch clinics from spreadsheet:', error);
      }
    },
  },

  getters: {
    // IMPORTANT:
    // Your current MapComponent expects "clinics" to be the FULL list,
    // because it does its own filtering locally.
    clinics: (state) => state.clinicsAll,

    // =========================
    // FILTERED ONLY (instant filters)
    // =========================
    filteredClinics: (state) => {
      const clinics = state.clinicsAll;
      const f = state.filters;

      return clinics.filter((clinic) => {
        // Province (multi)
        if (f.selectedProvinces.length) {
          if (!f.selectedProvinces.includes(clinic.province)) return false;
        }

        // Services
        if (f.selectedServices.length) {
          const clinicServices = Array.isArray(clinic.services) ? clinic.services : [];

          if (f.serviceMatchMode === 'ALL') {
            // must include every selected service
            const ok = f.selectedServices.every((s) => clinicServices.includes(String(s).toLowerCase()));
            if (!ok) return false;
          } else {
            // ANY: include at least one
            const ok = f.selectedServices.some((s) => clinicServices.includes(String(s).toLowerCase()));
            if (!ok) return false;
          }
        }

        // Population
        if (f.selectedPopulations.length) {
          if (!f.selectedPopulations.includes(clinic.population)) return false;
        }

        // Referral filter
        if (f.referralFilter === 'required') {
          if (clinic.referralRequired !== true) return false;
        }
        if (f.referralFilter === 'notRequired') {
          if (clinic.referralRequired !== false) return false;
        }

        return true;
      });
    },

    // =========================
    // DISPLAY CLINICS (filters + active search)
    // =========================
    displayClinics: (state, getters) => {
      const base = getters.filteredClinics;
      const s = state.searchActive;

      // no active search
      if (s.activeSearchMode === 'none') return base;

      // name search applied
      if (s.activeSearchMode === 'name') {
        const q = String(s.activeNameQuery ?? '').trim();
        if (!q) return base;

        return base.filter((clinic) => includesText(clinic.name, q));
      }

      // postal radius applied
      if (s.activeSearchMode === 'postal') {
        if (!s.activePostalCenter) return base;

        const center = s.activePostalCenter;
        const radius = Number(s.activeRadiusKm) || 10;

        return base.filter((clinic) => {
          const loc = clinic.location;
          if (!loc || !Array.isArray(loc) || loc.length !== 2) return false;

          const [lat, lng] = loc;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

          const d = haversineKm(center.lat, center.lng, lat, lng);
          return d <= radius;
        });
      }

      return base;
    },

    // Optional: dynamic services list for later UI (auto generated)
    availableServices: (state) => {
      const set = new Set();
      state.clinicsAll.forEach((c) => {
        (c.services || []).forEach((s) => set.add(String(s).toLowerCase()));
      });
      return [...set].sort();
    },

    // Optional: province list for later UI
    availableProvinces: (state) => {
      const set = new Set();
      state.clinicsAll.forEach((c) => {
        if (c.province) set.add(c.province);
      });
      return [...set].sort();
    },
  },
});

export default store;
