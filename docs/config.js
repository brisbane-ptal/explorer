// Region configuration - auto-detected from loaded data
const REGIONS = {
  brisbane: {
    name: 'Brisbane',
    dataFile: 'brisbane_ptal_final.geojson.gz',
    center: [-27.4698, 153.0251],
    zoom: 12,
    colors: {
      primary: '#0052A5',
      secondary: '#FDB913',
      header: '#0052A5'
    },
    fields: {
      zone: 'Zone_code',
      flood: 'fpa_code', // FPA1, FPA2A, FPA2B, FPA3
      floodValues: ['FPA1', 'FPA2A', 'FPA2B', 'FPA3'],
      parkingZone: 'parking_zone' // City Core, City Frame, General
    },
    terminology: {
      transitGap: 'Transit Gap',
      floodLabel: 'Flood Planning Area'
    },
    council: 'Brisbane City Council'
  },
  goldcoast: {
    name: 'Gold Coast',
    dataFile: 'goldcoast_ptal_final.geojson.gz',
    center: [-28.0023, 153.4145],
    zoom: 11,
    colors: {
      primary: '#00A8B5',
      secondary: '#FFFFFF',
      header: '#00A8B5'
    },
    fields: {
      zone: 'zone_code',
      flood: 'flood_constraint', // Very High, High, Medium
      floodValues: ['Very High', 'High', 'Medium'],
      parkingZone: null // GC doesn't have parking zones
    },
    terminology: {
      transitGap: 'Infrastructure Deficit',
      floodLabel: 'Flood Risk'
    },
    council: 'Gold Coast City Council'
  }
};

// Detect region from URL or default to Brisbane
function detectRegion() {
  const params = new URLSearchParams(window.location.search);
  const region = params.get('region');
  return REGIONS[region] || REGIONS.brisbane;
}

const CURRENT_REGION = detectRegion();
