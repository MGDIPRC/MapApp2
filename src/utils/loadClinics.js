import * as XLSX from 'xlsx';

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toCleanLower(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseServiceList(value) {
  // supports: "A, B, C" OR "A | B | C"
  return String(value ?? '')
    .split(/[,|]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());
}

export async function loadClinicData() {
  try {
    const url = `${import.meta.env.BASE_URL}clinics.xlsx`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    const clinics = data.map((clinic, idx) => {
      const lat = toNumberOrNull(clinic.Latitude);
      const lng = toNumberOrNull(clinic.Longitude);

      const services = parseServiceList(clinic.Services);

      const pop = toCleanLower(clinic.Population);
      const population =
        pop === 'adult' ? 'adult'
          : pop === 'pediatric' ? 'pediatric'
            : pop === 'both' ? 'both'
              : 'unknown';

      const name = String(clinic.name ?? '').trim();
      const postal = String(clinic.postal ?? '').trim().toUpperCase().replace(/\s+/g, '');

      const referralRequired = toCleanLower(clinic.ReferralRequired) === 'yes';

      const id =
        clinic.ClinicID && String(clinic.ClinicID).trim()
          ? String(clinic.ClinicID).trim()
          : `clinic-${idx + 1}`;

      return {
        ...clinic,
        id,
        Latitude: lat,
        Longitude: lng,
        location: lat !== null && lng !== null ? [lat, lng] : null,
        services,
        population,
        referralRequired,
        name,
        postal
      };
    });

    // DEV sanity checks (keep while building; remove later if you want)
    if (import.meta.env.DEV) {
      console.log('Clinics sample:', clinics.slice(0, 3));

      const provinces = [...new Set(clinics.map(c => c.province).filter(Boolean))].sort();
      console.log('Unique provinces:', provinces);

      const badServices = clinics.filter(c => !Array.isArray(c.services));
      const badReferral = clinics.filter(
        c => !(c.referralRequired === true || c.referralRequired === false || c.referralRequired === null)
      );

      const allowedPop = new Set(['adult', 'pediatric', 'both', 'unknown']);
      const badPop = clinics.filter(c => !allowedPop.has(c.population ?? 'unknown'));

      console.log('Bad services (not array):', badServices.length, badServices.slice(0, 3));
      console.log('Bad referralRequired (not boolean/null):', badReferral.length, badReferral.slice(0, 3));
      console.log('Bad population (not adult/pediatric/both/unknown):', badPop.length, badPop.slice(0, 3));
    }

    return clinics;
  } catch (error) {
    console.error(`Error loading clinic data: ${error.message}`);
    throw error;
  }
}
