/* =========================================================
   PETAL Explorer — map.js (v0.9.4)
   ========================================================= */

const APP_VERSION = "v0.9.4";

const PTAL_THRESHOLDS_TEXT = "PETAL: 1 <10 · 2 ≥10 · 3 ≥50 · 4A ≥120 · 4B ≥240";
   
const REGIONS = {
  brisbane: {
    name: 'Brisbane PETAL Explorer',
    tagline: 'Mapping public transport accessibility in Brisbane',
    council: 'Brisbane City Council',
    center: [-27.4650, 153.0242],
    zoom: 15,
    dataFile: 'brisbane_ptal_final.geojson.gz',
  },
  goldcoast: {
    name: 'Gold Coast PETAL Explorer',
    tagline: 'Mapping public transport accessibility on the Gold Coast',
    council: 'City of Gold Coast',
    center: [-28.0023, 153.4145],
    zoom: 12, 
    dataFile: "goldcoast_ptal_final.geojson.gz",
    fields: {
      zone: "zone_code",
      flood: "flood_constraint",
      floodValues: ["Very High", "High", "Medium"]
    },
    colors: {
      primary: "#00A8B5",
      header: "#00A8B5"
    },
  },
  logan: {
    name: 'Logan PETAL Explorer',
    tagline: 'Mapping public transport accessibility across Logan City',
    council: 'Logan City Council',
    center: [-27.6394, 153.1079],
    zoom: 12, 
    dataFile: 'logan_ptal_final.geojson.gz',
  },
  ipswich: {
    name: 'Ipswich PETAL Explorer',
    tagline: 'Mapping public transport accessibility in Ipswich',
    council: 'Ipswich City Council',
    center: [-27.6122, 152.7612],
    zoom: 12, 
    dataFile: 'ipswich_ptal_final.geojson.gz',
  },
  moreton: {
    name: 'Moreton Bay PETAL Explorer',
    tagline: 'Mapping public transport accessibility in Moreton Bay Region',
    council: 'Moreton Bay Regional Council',
    center: [-27.3036, 152.9614],
    zoom: 12,  
    dataFile: 'moreton_ptal_final.geojson.gz',
  },
  redland: {
    name: 'Redland PETAL Explorer',
    tagline: 'Mapping public transport accessibility in Redland',
    council: 'Redland City Council',
    center: [-27.5294, 153.2528],
    zoom: 12,  
    dataFile: 'redland_ptal_final.geojson.gz',
  },
  sunshinecoast: {
    name: 'Sunshine Coast PETAL Explorer',
    tagline: 'Mapping public transport accessibility on the Sunshine Coast',
    council: 'Sunshine Coast Council',
    center: [-26.6566, 153.0897],
    zoom: 12,  
    dataFile: 'sunshinecoast_ptal_final.geojson.gz',
  }
};

function detectRegion() {
  const params = new URLSearchParams(window.location.search);
  const lga = params.get('lga');
  if (lga && REGIONS[lga]) return lga;
  return 'brisbane';
}

const lga = detectRegion();
const CONFIG = REGIONS[lga] || REGIONS.brisbane;

function updateRegionUI() {
  document.body.setAttribute('data-region', lga);
  
  const councilNameEl = document.getElementById('council-name');
  if (councilNameEl && CONFIG.council) {
    councilNameEl.textContent = CONFIG.council;
  }
  
  // Update links
  const links = {
    'brisbane': document.getElementById('link-brisbane-header'),
    'goldcoast': document.getElementById('link-goldcoast-header')
  };
  
  Object.keys(links).forEach(key => {
    const link = links[key];
    if (link) {
      if (key === lga) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.title = `${CONFIG.name} - Public Transport Accessibility`;
  const h1 = document.querySelector('header h1');
  const tagline = document.querySelector('header p');
  if (h1) h1.textContent = CONFIG.name;
  if (CONFIG.colors) {
    document.documentElement.style.setProperty("--header-color", CONFIG.colors.header);
    document.documentElement.style.setProperty("--primary-color", CONFIG.colors.primary);
  }
  const faviconEl = document.getElementById("favicon");
  if (faviconEl) {
    if (lga === "goldcoast") {
      faviconEl.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2300A8B5'/><text x='50' y='65' font-size='40' font-weight='bold' text-anchor='middle' fill='white'>GC</text></svg>";
    } else {
      faviconEl.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230052A5'/><text x='50' y='65' font-size='50' font-weight='bold' text-anchor='middle' fill='%23FDB913'>B</text></svg>";
    }
  }
  if (tagline) tagline.textContent = CONFIG.tagline;
  
  updateRegionUI();
});

const PTAL_GZ_URL = `${CONFIG.dataFile}?v=${APP_VERSION}`;
const PTAL_JSON_URL = `${CONFIG.dataFile.replace('.gz', '')}?v=${APP_VERSION}`;
const IS_EMBED = new URLSearchParams(window.location.search).get("embed") === "1";

async function loadPTAL() {
  let data = null;

  try {
    const resGz = await fetch(PTAL_GZ_URL, {
        cache: "no-store",
        headers: { "Accept": "application/octet-stream" }
    });
     
    if (resGz.ok) {
      const buffer = await resGz.arrayBuffer();
      const decompressed = pako.ungzip(new Uint8Array(buffer), { to: "string" });
      data = JSON.parse(decompressed);

      console.log("✓ Loaded PETAL (gz):", data?.features?.length ?? 0, "features");

      fullData = data;

      const all = Array.isArray(data.features) ? data.features : [];

      const inner = all.filter(f => {
        const dist = f?.properties?.distance_from_center_km;
        return dist != null && dist <= 5;
      });

      const outer = all
        .filter(f => {
          const dist = f?.properties?.distance_from_center_km;
          return dist != null && dist > 5;
        })
        .sort((a, b) => {
          const da = a?.properties?.distance_from_center_km ?? 999;
          const db = b?.properties?.distance_from_center_km ?? 999;
          return da - db;
        });

      console.log(`✓ Inner 5km: ${inner.length} | Outer: ${outer.length}`);

      ptalData = { type: "FeatureCollection", features: inner };
      addPTALLayer(ptalData);

      const batchSize = 8000;
      let loaded = 0;

      function loadNextBatch() {
        if (loaded >= outer.length) {
          console.log("✓ All outer cells loaded");
          return;
        }

        const batch = outer.slice(loaded, loaded + batchSize);
        ptalData.features.push(...batch);
        loaded += batch.length;

        console.log(`⏳ Loading outer batch: ${loaded}/${outer.length}`);

        if (ptalLayer) {
          ptalLayer.addData({ type: "FeatureCollection", features: batch });
        }

        requestAnimationFrame(() => setTimeout(loadNextBatch, 100));
      }

      setTimeout(loadNextBatch, 600);
      return;
    }

  } catch (err) {
  console.error("❌ Failed to load PETAL .gz file", err);
  alert("PETAL data failed to load. Please refresh the page.");
  return;
}

  try {
    const resJson = await fetch(PTAL_JSON_URL, {
        cache: "no-store",
        headers: { "Accept": "application/json" }
    });
     
    if (resJson.ok) {
      data = await resJson.json();
      console.log("✓ Loaded PETAL (json):", data?.features?.length ?? 0, "features");
      addPTALLayer(data);
      return;
    }

    throw new Error(`HTTP ${resJson.status}`);
  } catch (err) {
    console.error("❌ Failed to load PETAL data:", err);
    alert("Failed to load map data. Please refresh the page.");
  }
}

const NOMINATIM_EMAIL = ["brisbaneptal", "gmail.com"].join("@");

let ptalLayer = null;
let ptalData = null;
let fullData = null;
let innerDataLoaded = false;
let showMismatchesOnly = false;
let showFloodOverlay = false;
let showParkingOverlay = false;
let hideGreenSpace = false;
let searchMarker = null;

const map = L.map("map").setView(CONFIG.center, CONFIG.zoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

L.control.scale({
  position: 'bottomleft',
  imperial: false,
  metric: true
}).addTo(map);

if (IS_EMBED) {
  document.body.classList.add("embed");
}

const PTAL_COLORS = {
  '4b': '#006837',
  '4a': '#1a9850',
  '3': '#a6d96a',
  '2': '#fee08b',
  '1': '#d73027'
};

function createSVGPatterns() {
  const mapPane = map.getPanes().overlayPane;
  let svg = mapPane.querySelector('svg');
  
  if (!svg) {
    console.warn('⚠️  SVG not ready, will retry after layer load');
    return false;
  }
  
  if (svg.querySelector('defs')) {
    console.log('✓ SVG patterns already exist');
    return true;
  }
  
  console.log('Creating SVG patterns...');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
  const floodClear = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  floodClear.setAttribute('id', 'flood-clear');
  floodClear.setAttribute('patternUnits', 'userSpaceOnUse');
  floodClear.setAttribute('width', '10');
  floodClear.setAttribute('height', '10');

  const clearRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  clearRect.setAttribute('width', '10');
  clearRect.setAttribute('height', '10');
  clearRect.setAttribute('fill', 'rgba(255,255,255,0.05)');

  const clearLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  clearLine.setAttribute('x1', '0');
  clearLine.setAttribute('y1', '10');
  clearLine.setAttribute('x2', '10');
  clearLine.setAttribute('y2', '0');
  clearLine.setAttribute('stroke', 'rgba(0, 80, 150, 0.8)');
  clearLine.setAttribute('stroke-width', '3');

  floodClear.appendChild(clearRect);
  floodClear.appendChild(clearLine);
  defs.appendChild(floodClear);

  Object.entries(PTAL_COLORS).forEach(([band, color]) => {  
  
    const floodPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    floodPattern.setAttribute('id', `flood-ptal${band}`);
    floodPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    floodPattern.setAttribute('width', '10');
    floodPattern.setAttribute('height', '10');
    
    const floodRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    floodRect.setAttribute('width', '10');
    floodRect.setAttribute('height', '10');
    floodRect.setAttribute('fill', color);
    
    const floodLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    floodLine.setAttribute('x1', '0');
    floodLine.setAttribute('y1', '10');
    floodLine.setAttribute('x2', '10');
    floodLine.setAttribute('y2', '0');
    floodLine.setAttribute('stroke', 'rgba(0, 80, 150, 0.8)');
    floodLine.setAttribute('stroke-width', '3');
    
    floodPattern.appendChild(floodRect);
    floodPattern.appendChild(floodLine);
    defs.appendChild(floodPattern);
    
    const parkingPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    parkingPattern.setAttribute('id', `parking-ptal${band}`);
    parkingPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    parkingPattern.setAttribute('width', '10');
    parkingPattern.setAttribute('height', '10');
    
    const parkingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    parkingRect.setAttribute('width', '10');
    parkingRect.setAttribute('height', '10');
    parkingRect.setAttribute('fill', color);
    
    const parkingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    parkingLine.setAttribute('x1', '0');
    parkingLine.setAttribute('y1', '0');
    parkingLine.setAttribute('x2', '10');
    parkingLine.setAttribute('y2', '10');
    parkingLine.setAttribute('stroke', 'rgba(220, 120, 0, 0.8)');
    parkingLine.setAttribute('stroke-width', '3');
    
    parkingPattern.appendChild(parkingRect);
    parkingPattern.appendChild(parkingLine);
    defs.appendChild(parkingPattern);
    
    const bothPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    bothPattern.setAttribute('id', `flood-parking-ptal${band}`);
    bothPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    bothPattern.setAttribute('width', '10');
    bothPattern.setAttribute('height', '10');
    
    const bothRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bothRect.setAttribute('width', '10');
    bothRect.setAttribute('height', '10');
    bothRect.setAttribute('fill', color);
    
    const bothLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bothLine1.setAttribute('x1', '0');
    bothLine1.setAttribute('y1', '10');
    bothLine1.setAttribute('x2', '10');
    bothLine1.setAttribute('y2', '0');
    bothLine1.setAttribute('stroke', 'rgba(0, 119, 190, 0.6)');
    bothLine1.setAttribute('stroke-width', '2');
    
    const bothLine2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bothLine2.setAttribute('x1', '0');
    bothLine2.setAttribute('y1', '0');
    bothLine2.setAttribute('x2', '10');
    bothLine2.setAttribute('y2', '10');
    bothLine2.setAttribute('stroke', 'rgba(255, 165, 0, 0.6)');
    bothLine2.setAttribute('stroke-width', '2');
    
    bothPattern.appendChild(bothRect);
    bothPattern.appendChild(bothLine1);
    bothPattern.appendChild(bothLine2);
    defs.appendChild(bothPattern);
  });
  
  svg.insertBefore(defs, svg.firstChild);
  console.log('✓ SVG patterns created');
  return true;
}

function getPTALColor(ptal, total_capacity) {
  const band = getPTALBand(ptal, total_capacity);
  if (!band) return PTAL_COLORS["1"];
  return PTAL_COLORS[band.toLowerCase()] || "#cccccc";
}

function getPTALBand(ptal, total_capacity) {
  const p = Number(ptal);
  if (!Number.isFinite(p) || p <= 0) return null;

  const cap = Number(total_capacity);

  if (p === 4) {
    if (Number.isFinite(cap) && cap >= 240) return "4B";
    if (Number.isFinite(cap) && cap >= 120) return "4A";
    return "4";
  }

  return String(p);
}

function getPTALLabel(ptal, total_capacity) {
  const band = getPTALBand(ptal, total_capacity);
  if (band === "4B") return "Excellent";
  if (band === "4A") return "Very Good";
  const labels = { '3': "Good", '2': "Moderate", '1': "Poor" };
  return labels[band] || "Unknown";
}

function getRecommendedHeight(ptal, total_capacity) {
  const band = getPTALBand(ptal, total_capacity);
  if (band === "4B") return "30+ storeys";
  if (band === "4A") return "16–30 storeys";
  if (band === "3") return "9–15 storeys";
  if (band === "2") return "4–8 storeys";
  if (band === "1") return "Up to 3 storeys";
  return "N/A";
}

function getModeIcon(mode) {
  if (mode === "rail" || mode === "train") return "🚆";
  if (mode === "ferry") return "⛴️";
  if (mode === "busway") return "🚌";
  if (mode === "tram") return "🚊"; 
  return "🚌";
}

function getModeLabel(mode) {
  if (mode === "rail" || mode === "train") return "Train";
  if (mode === "ferry") return "Ferry";
  if (mode === "busway") return "Busway";
  if (mode === "tram") return "Light Rail";
  return "Bus";
}

function hasPlanningMismatch(props) {
  const band = getPTALBand(props.ptal, props.total_capacity);
  const zone = props[CONFIG.fields && CONFIG.fields.zone || "Zone_code"];
  const maxStoreys = Number(props.max_storeys);
  
  if (band !== "4A" && band !== "4B") return false;
  
  const minStoreys = band === "4B" ? 30 : 16;
  
  return Number.isFinite(maxStoreys) && maxStoreys < minStoreys;
}

function hasFloodConstraint(props) {
  const flood = props[CONFIG.fields && CONFIG.fields.flood || "fpa_code"];
  return (CONFIG.fields && CONFIG.fields.floodValues || ["FPA1", "FPA2A", "FPA2B", "FPA3"]).includes(flood);
}

function hasParkingMismatch(props) {
  const ptal = Number(props.ptal);
  const parkingZone = String(props.parking_zone);
  
  if (ptal < 3) return false;
  
  const isCityCore = parkingZone === "334" || parkingZone === "334.0";
  
  return props.parking_mismatch === true && !isCityCore;
}

function hasTransitGap(props) {
  const ptal = Number(props.ptal);
  return ptal === 1 && props.transit_gap === true;
}

function isGreenSpace(props) {
  const z = String(props[CONFIG.fields && CONFIG.fields.zone || "Zone_code"] || "").trim().toUpperCase();
  return z === "CN" || z === "OS" || z === "SR" || z === "RU" || z === "RR" || z === "SP";
}

function $(id) { return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text ?? ""; }
function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html ?? ""; }
function showEl(id, show) { const el = $(id); if (el) el.style.display = show ? "block" : "none"; }

function style(feature) {
  const props = feature.properties || {};
  const ptalNum = Number(props.ptal);
  const capNum = Number(props.total_capacity);
  const flood = hasFloodConstraint(props);
  const parking = hasParkingMismatch(props);
  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);
  
  if (hideGreenSpace && isGreenSpace(props)) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }

  const ptalValid = Number.isFinite(ptalNum) && ptalNum > 0;
  if (!ptalValid && !flood) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }
  const ptalNullFlood = !ptalValid && flood;
  
  if (showMismatchesOnly && !planningMismatch && !transitGap) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }

  let borderColor = "white";
  const zoom = map.getZoom();
  let borderWeight = zoom >= 13 ? 1 : 0.5;

  if (planningMismatch) {
    borderColor = "#ff0000";
    borderWeight = 2;
  } else if (transitGap) {
    borderColor = "#9932CC";
    borderWeight = 2;
  }

  const bandStr = getPTALBand(ptalNum, capNum);
  const bandKey = bandStr ? bandStr.toLowerCase() : "1";

  let fillColor = ptalNullFlood
  ? "rgba(255,255,255,0.05)"
  : ((bandStr && PTAL_COLORS[bandKey]) ? PTAL_COLORS[bandKey] : PTAL_COLORS["1"]);
  
  if (showFloodOverlay && flood && showParkingOverlay && parking) {
    fillColor = `url(#flood-parking-ptal${bandKey})`;
  } else if (showFloodOverlay && flood) {
    fillColor = ptalNullFlood ? `url(#flood-clear)` : `url(#flood-ptal${bandKey})`;
  } else if (showParkingOverlay && parking) {
    fillColor = `url(#parking-ptal${bandKey})`;
  }

  return {
    fillColor,
    weight: borderWeight,
    color: borderColor,
    opacity: 0.8,
    fillOpacity: 0.6
  };
}

function highlightFeature(e) {
  const layer = e.target;
  const props = layer.feature?.properties || {};
  
  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);
  
  if (showMismatchesOnly && !planningMismatch && !transitGap) return;

  layer.setStyle({ weight: 3, opacity: 1, fillOpacity: 0.8 });
  if (!L.Browser.ie && !L.Browser.opera) {
    try { layer.bringToFront(); } catch (_) {}
  }
}

function resetHighlight(e) {
  if (ptalLayer) ptalLayer.resetStyle(e.target);
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: showInfo,
  });

  const props = feature.properties || {};
  const ptal = Number(props.ptal);
  const hasValidPTAL = Number.isFinite(ptal) && ptal > 0;
  const total_capacity = Number(props.total_capacity);
  const band = getPTALBand(ptal, total_capacity);
  const flood = hasFloodConstraint(props); 
  
  if (hasValidPTAL) {
    const label = getPTALLabel(ptal, total_capacity);
    layer.bindTooltip(
      `PETAL ${band} (${label})<br>Click for details`,
      { sticky: true, opacity: 0.9 }
    );
  } else if (flood) {
    layer.bindTooltip(
      `Flood constraint (${props[CONFIG.fields && CONFIG.fields.flood || "fpa_code"]})<br>Click for details`,
      { sticky: true, opacity: 0.9 }
    );
  }
}

const infoPanel = $("info-panel");
const closeBtn = $("close-panel");

function openInfoPanel() {
  if (!infoPanel) return;
  infoPanel.classList.remove("hidden");
  infoPanel.classList.add("show");
}

function closeInfoPanel() {
  if (!infoPanel) return;
  infoPanel.classList.remove("show");
  infoPanel.classList.add("hidden");
}

if (closeBtn) {
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeInfoPanel();
  });
}

function showInfo(e) {
  const props = e.target?.feature?.properties || {};
  const ptal = Number(props.ptal);
  const total_capacity = Number(props.total_capacity);

  const flood = hasFloodConstraint(props);
  const hasValidPTAL = Number.isFinite(ptal) && ptal > 0;

  if (!hasValidPTAL && !flood) return;

  const band = getPTALBand(ptal, total_capacity);
  const gridId = props.id || "Unknown";
  const capacity = props.total_capacity;
  
  const gridMatch = gridId.match(/r([+-]?\d+)_c([+-]?\d+)/);
  let displayId = gridId;

  if (gridMatch) {
    const row = parseInt(gridMatch[1]);
    const col = parseInt(gridMatch[2]);
  
    const letterIndex = Math.abs(row);
    const letter = String.fromCharCode(65 + letterIndex);
    const number = Math.abs(col);
  
    const rowPrefix = row < 0 ? 'S' : 'N';
    const colPrefix = col < 0 ? 'W' : 'E';
  
    displayId = `${rowPrefix}${letter}${colPrefix}${number}`;
  }
  
  const categoryEl = document.getElementById("category-label");

  if (hasValidPTAL) {
    setText("ptal-score", `${band} · ${capacity ? Math.round(capacity) : '0'} units/hr`);
    const label = getPTALLabel(ptal, total_capacity);
    setText("category-label", label);
  
    if (categoryEl) {
      const colors = {
        'Excellent': { bg: '#006837', text: '#fff' },
        'Very Good': { bg: '#1a9850', text: '#fff' },
        'Good': { bg: '#a6d96a', text: '#333' },
        'Moderate': { bg: '#fee08b', text: '#333' },
        'Poor': { bg: '#d73027', text: '#fff' }
      };
    
      const style = colors[label] || { bg: '#ddd', text: '#333' };
      categoryEl.style.background = style.bg;
      categoryEl.style.color = style.text;
      categoryEl.style.padding = '4px 12px';
      categoryEl.style.borderRadius = '6px';
      categoryEl.style.display = 'inline-block';
      categoryEl.style.fontWeight = '600';
      categoryEl.style.fontSize = '0.9em';
      categoryEl.style.marginTop = '4px';
    }
  } else {
    setText("ptal-score", "not assessed - River / Creek");
    setText("category-label", "Flood constrained area");
  
    if (categoryEl) {
      categoryEl.style.background = '#e0e0e0';
      categoryEl.style.color = '#666';
      categoryEl.style.padding = '4px 12px';
      categoryEl.style.borderRadius = '6px';
      categoryEl.style.display = 'inline-block';
      categoryEl.style.fontWeight = '600';
      categoryEl.style.fontSize = '0.9em';
      categoryEl.style.marginTop = '4px';
    }
  }
   
  const gridLink = $("grid-id-link");
  if (gridLink) {
    gridLink.innerHTML = `${displayId} <span style="font-size:0.8em;">🔗</span>`;
    gridLink.href = `?cell=${gridId}`;
    gridLink.title = "Shareable link to this cell";
}
  
  setText("zone-code", (props[CONFIG.fields && CONFIG.fields.zone || "Zone_code"] === "UNK" ? "Unknown" : props[CONFIG.fields && CONFIG.fields.zone || "Zone_code"]) || "Unknown");
  setHTML("recommended-height", getRecommendedHeight(ptal, total_capacity));
  
  const maxStoreys = Number(props.max_storeys);
  const heightDisplay =
    Number.isFinite(maxStoreys) && maxStoreys >= 90
      ? "Unlimited*<br><small style='color:#666;'"
      : Number.isFinite(maxStoreys)
        ? `${maxStoreys} storeys`
        : "Unknown";
  setHTML("max-height", heightDisplay);

  let bccParking = props.bcc_parking;
  const ptalParking = props.ptal_parking;
  
  const parkingZone = props.parking_zone;
  let zoneLabel = "General";
  
  if (parkingZone === "334" || parkingZone === "334.0") {
    zoneLabel = "City Core";
  } else if (parkingZone === "335" || parkingZone === "335.0") {
    zoneLabel = "City Frame";
  } else if (!parkingZone || parkingZone === "null" || parkingZone === "undefined") {
    zoneLabel = "General";
  }
  
  setText("parking-zone", zoneLabel);
  
  setText("current-parking", bccParking ? `${bccParking} spaces/2-bed` : "Unknown");
  setText("recommended-parking", ptalParking ? `${ptalParking} spaces/2-bed` : "Unknown");

  
  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);
  const parking = hasParkingMismatch(props);
  
  showEl("planning-controls", !(props[CONFIG.fields && CONFIG.fields.flood || "fpa_code"] === "FPA1"));
  showEl("planning-mismatch-warning", planningMismatch);
  showEl("transit-gap-warning", transitGap);
  showEl("flood-explainer", flood);
  showEl("parking-explainer", parking);
  showEl("flood-badge", flood);
  showEl("parking-badge", false);

  if (flood) {
    setText("flood-badge", `🌊 ${props[CONFIG.fields && CONFIG.fields.flood || "fpa_code"]}`);
  }

  const stopsList = $("nearby-stops");
  if (stopsList) {
    stopsList.innerHTML = "";
    try {
      const stops =
        typeof props.nearby_stops === "string"
          ? JSON.parse(props.nearby_stops)
          : (props.nearby_stops || []);

      if (!Array.isArray(stops) || stops.length === 0) {
        stopsList.innerHTML = "<li style='color:#999;'>No stops within catchment</li>";
      } else {
        const modeRank = { train: 1, ferry: 2, busway: 3, bus: 4 };
        
        const sortedStops = stops
          .sort((a, b) => {
            const rankDiff = (modeRank[a.mode] || 99) - (modeRank[b.mode] || 99);
            return rankDiff !== 0 ? rankDiff : (a.distance_m || 999) - (b.distance_m || 999);
          })
          .slice(0, 3);

        sortedStops.forEach((stop) => {
          const li = document.createElement("li");
          const mode = stop.mode || "bus";
          const name = stop.stop_name || "Stop";
          const stopId = stop.stop_id || "";
          const dist = stop.distance_m ?? "?";
          const walkTime = stop.walk_time_min ?? "?";
          const modeLabel = getModeLabel(mode);

          li.innerHTML = `
            ${getModeIcon(mode)} <strong>${name}</strong> ${stopId ? `(${stopId})` : ''}<br>
            <span style="color:#666;font-size:0.85em;">
              ${modeLabel} • ${dist}m • ${walkTime} min walk
            </span>`;
          stopsList.appendChild(li);
        });
      }
    } catch (err) {
      stopsList.innerHTML = "<li style='color:#999;'>Error loading stops</li>";
      console.warn("nearby_stops parse error:", err);
    }
  }

  openInfoPanel();

  if (window.innerWidth <= 768) {
    const lg = $("legend");
    if (lg) lg.classList.remove("open");
  }
}

function addPTALLayer(data) {
  if (ptalLayer) {
    try { ptalLayer.remove(); } catch (_) {}
    ptalLayer = null;
  }

  ptalData = data;
  ptalLayer = L.geoJSON(data, { style, onEachFeature }).addTo(map);

  createSVGPatterns();

const urlParams = new URLSearchParams(window.location.search);
const cellId = urlParams.get('cell');
if (cellId && ptalLayer) {
  const attemptZoom = () => {
    let found = false;
    ptalLayer.eachLayer(layer => {
      if (layer.feature?.properties?.id === cellId) {
        found = true;
        
        const bounds = layer.getBounds();
        map.fitBounds(bounds, {
          padding: [150, 150],
          maxZoom: 17
        });
        
        highlightFeature({ target: layer });
        
        layer.openTooltip();
        setTimeout(() => showInfo({ target: layer }), 300);
      }
    });
    if (!found) setTimeout(attemptZoom, 1000);
  };
  attemptZoom();
} else {
  try { if (!innerDataLoaded) { map.fitBounds(ptalLayer.getBounds()); } } catch (_) {}
}
}

const legend = $("legend");
const burger = $("legend-burger");
const legendToggle = $("legend-toggle");
const legendContent = $("legend-content");

if (burger && legend) {
  burger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    legend.classList.toggle("open");
  });

  map.on("click", () => {
    if (window.innerWidth <= 768) legend.classList.remove("open");
  });
}

if (legendToggle && legendContent && legend) {
  if (window.innerWidth > 768) {
    legendToggle.style.display = "block";
  }

  legendToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (legendContent.style.display === "none") {
      legendContent.style.display = "block";
      legendToggle.textContent = "−";
      legend.classList.remove("collapsed");
    } else {
      legendContent.style.display = "none";
      legendToggle.textContent = "+";
      legend.classList.add("collapsed");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      legendToggle.style.display = "block";
    } else {
      legendToggle.style.display = "none";
      legendContent.style.display = "block";
      legend.classList.remove("collapsed");
    }
  });
}

const mismatchToggle = $("mismatch-toggle");
const heightToggle = $("height-toggle");
const transitToggle = $("transit-toggle");
const floodToggle = $("flood-toggle");
const parkingToggle = $("parking-toggle");
const greenSpaceToggle = $("greenspace-toggle");

function applyFilter() {
  showMismatchesOnly = mismatchToggle ? mismatchToggle.checked : false;
  showFloodOverlay = floodToggle ? floodToggle.checked : false;
  showParkingOverlay = parkingToggle ? parkingToggle.checked : false;
  hideGreenSpace = greenSpaceToggle ? greenSpaceToggle.checked : false;
  if (ptalLayer) ptalLayer.setStyle(style);
}

if (mismatchToggle) mismatchToggle.addEventListener("change", applyFilter);
if (heightToggle) heightToggle.addEventListener("change", applyFilter);
if (transitToggle) transitToggle.addEventListener("change", applyFilter);
if (floodToggle) floodToggle.addEventListener("change", applyFilter);
if (parkingToggle) parkingToggle.addEventListener("change", applyFilter);
if (greenSpaceToggle) greenSpaceToggle.addEventListener("change", applyFilter);

const searchBtn = $("search-btn");
const searchInput = $("address-input");

if (searchBtn) searchBtn.addEventListener("click", searchAddress);
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAddress();
  });
}

async function searchAddress() {
  const address = (searchInput?.value || "").trim();
  if (!address) return;

  const searchQuery = address.toLowerCase().includes("brisbane")
    ? address
    : `${address}, Brisbane, Queensland, Australia`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("limit", "1");

  if (NOMINATIM_EMAIL) url.searchParams.set("email", NOMINATIM_EMAIL);

  try {
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = "Searching…";
    }

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Bad geocode result");

      map.setView([lat, lon], 17);

      if (searchMarker) {
        try { map.removeLayer(searchMarker); } catch (_) {}
      }

      searchMarker = L.marker([lat, lon]).addTo(map);
      searchMarker.bindPopup(`📍 ${data[0].display_name}`).openPopup();
    } else {
      alert("No results found. Try a more specific address.");
    }
  } catch (err) {
    console.error("Search error:", err);
    alert("Search failed. Please try again.");
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  }
}

setText("version", APP_VERSION);
setText("ptal-thresholds", PTAL_THRESHOLDS_TEXT);

if (infoPanel) {
  infoPanel.classList.add("hidden");
  infoPanel.classList.remove("show");
}

loadPTAL();

(function () {
  const user = "brisbaneptal";
  const domain = "gmail.com";
  const el = document.getElementById("email-link");
  if (el) {
    el.href = `mailto:${user}@${domain}`;
    el.textContent = `${user}@${domain}`;
  }
})();
