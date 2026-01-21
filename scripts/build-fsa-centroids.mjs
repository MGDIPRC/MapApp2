import fs from "fs";
import path from "path";

// ✅ Your unzipped GeoNames file is TAB-delimited .txt
const INPUT = path.resolve("scripts/CA_full.txt");
const OUTPUT = path.resolve("public/canada_fsa_centroids.json");

function cleanPostal(v) {
  return String(v || "").toUpperCase().replace(/\s+/g, "").trim();
}

function isValidFsa(fsa) {
  // Canadian FSA: A1A
  return /^[A-Z]\d[A-Z]$/.test(fsa);
}

const text = fs.readFileSync(INPUT, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);

if (!lines.length) {
  throw new Error("Input file is empty.");
}

const delim = "\t"; // ✅ GeoNames format

const sums = new Map(); // fsa -> {sumLat, sumLon, count}
let used = 0;

for (const line of lines) {
  const cols = line.split(delim);

  // GeoNames format (postal):
  // country code, postal code, place name, admin name1, admin code1,
  // admin name2, admin code2, admin name3, admin code3,
  // latitude, longitude, accuracy
  if (cols.length < 11) continue;

  const postal = cleanPostal(cols[1]);
  if (postal.length < 3) continue;

  const fsa = postal.slice(0, 3);
  if (!isValidFsa(fsa)) continue;

  const lat = Number(cols[9]);
  const lon = Number(cols[10]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

  const cur = sums.get(fsa) || { sumLat: 0, sumLon: 0, count: 0 };
  cur.sumLat += lat;
  cur.sumLon += lon;
  cur.count += 1;
  sums.set(fsa, cur);

  used++;
}

const result = {};
for (const [fsa, v] of sums.entries()) {
  result[fsa] = {
    lat: v.sumLat / v.count,
    lon: v.sumLon / v.count,
    n: v.count,
  };
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf8");

console.log(`Lines in file: ${lines.length}`);
console.log(`Parsed lines used: ${used}`);
console.log(`Wrote ${Object.keys(result).length} FSA centroids to: ${OUTPUT}`);
console.log(`Has L8H? ${Object.prototype.hasOwnProperty.call(result, "L8H")}`);
