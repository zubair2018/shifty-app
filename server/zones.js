// server/zones.js
// Zone-based area matching using GPS coordinate boundaries.
// Each zone has a bounding box (lat/lng). Any place inside the box belongs to that zone.
// This means ANY village, road, or landmark Google Maps knows about will match automatically.

export const ZONES = [
  {
    id: "srinagar",
    name: "Srinagar",
    // Covers: Srinagar city, Hazratbal, Nishat, Shalimar, Hyderpora, Bemina, Batmaloo etc.
    bounds: {
      minLat: 33.95,
      maxLat: 34.20,
      minLng: 74.70,
      maxLng: 74.95,
    },
    areas: ["srinagar", "lal chowk", "hazratbal", "nishat", "hyderpora", "batmaloo", "bemina"],
  },
  {
    id: "pulwama",
    name: "Pulwama",
    // Covers: Pulwama, Awantipora, Pampore, Panzgam, Tral, Lassipora, Kakapora etc.
    bounds: {
      minLat: 33.70,
      maxLat: 33.95,
      minLng: 74.80,
      maxLng: 75.15,
    },
    areas: ["pulwama", "awantipora", "pampore", "tral", "lassipora", "kakapora", "panzgam"],
  },
  {
    id: "anantnag",
    name: "Anantnag",
    // Covers: Anantnag, Bijbehara, Sangam, Kokernag, Pahalgam, Verinag, Dooru etc.
    bounds: {
      minLat: 33.40,
      maxLat: 33.75,
      minLng: 74.95,
      maxLng: 75.45,
    },
    areas: ["anantnag", "bijbehara", "sangam", "kokernag", "pahalgam", "verinag", "dooru"],
  },
];

// ---- Coordinate-based zone detection (primary method) ----
// Used when we have GPS coordinates from Google Maps
export function getZoneForCoordinates(lat, lng) {
  if (!lat || !lng) return null;
  for (const zone of ZONES) {
    const { minLat, maxLat, minLng, maxLng } = zone.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return zone;
    }
  }
  return null;
}

// ---- Text-based zone detection (fallback method) ----
// Used as backup when coordinates are not available
export function getZoneForArea(areaName) {
  if (!areaName) return null;
  const normalized = areaName.trim().toLowerCase();
  for (const zone of ZONES) {
    for (const area of zone.areas) {
      if (
        normalized === area ||
        normalized.includes(area) ||
        area.includes(normalized)
      ) {
        return zone;
      }
    }
  }
  return null;
}

// ---- Check if two areas are in the same zone ----
// Supports both coordinate objects { lat, lng } and plain strings
export function areasInSameZone(area1, area2) {
  if (!area1 || !area2) return false;

  let zone1, zone2;

  // If objects with coordinates, use coordinate matching
  if (typeof area1 === "object" && area1.lat) {
    zone1 = getZoneForCoordinates(area1.lat, area1.lng);
  } else {
    zone1 = getZoneForArea(area1);
  }

  if (typeof area2 === "object" && area2.lat) {
    zone2 = getZoneForCoordinates(area2.lat, area2.lng);
  } else {
    zone2 = getZoneForArea(area2);
  }

  if (!zone1 || !zone2) return false;
  return zone1.id === zone2.id;
}

// ---- Get zone name for display ----
export function getZoneName(areaName) {
  const zone = getZoneForArea(areaName);
  return zone ? zone.name : null;
}

// ---- Get all areas in same zone ----
export function getZoneAreas(areaName) {
  const zone = getZoneForArea(areaName);
  if (!zone) return [];
  return zone.areas;
}