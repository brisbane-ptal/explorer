/* =========================================================
   Brisbane PTAL Explorer — map.js (v0.9.1)
   ========================================================= */

const APP_VERSION = "v0.9.1";  // ← Increment this after running pipeline
const PTAL_THRESHOLDS_TEXT = "PTAL: 1 <10 · 2 ≥10 · 3 ≥50 · 4A ≥120 · 4B ≥240";

// Current (localhost):
//const PTAL_GZ_URL = `brisbane_ptal_final.geojson.gz`;
//const PTAL_JSON_URL = `brisbane_ptal_final.geojson`;

// Change to (production):
const PTAL_GZ_URL = `https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson.gz?v=${APP_VERSION}`;
const PTAL_JSON_URL = `https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson?v=${APP_VERSION}`;

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

      console.log("✓ Loaded PTAL (gz):", data?.features?.length ?? 0, "features");

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
          ptalLayer.clearLayers();
          ptalLayer.addData(ptalData);
          createSVGPatterns();
          ptalLayer.setStyle(style);
        }

        setTimeout(loadNextBatch, 120);
      }

      setTimeout(loadNextBatch, 600);
      return;
    }

  } catch (err) {
  console.error("❌ Failed to load PTAL .gz file", err);
  alert("PTAL data failed to load. Please refresh the page.");
  return;
}

  // Fallback .json
  try {
    const resJson = await fetch(PTAL_JSON_URL, {
        cache: "no-store",
        headers: { "Accept": "application/json" }
    });
     
    if (resJson.ok) {
      data = await resJson.json();
      console.log("✓ Loaded PTAL (json):", data?.features?.length ?? 0, "features");
      addPTALLayer(data);
      return;
    }

    throw new Error(`HTTP ${resJson.status}`);
  } catch (err) {
    console.error("❌ Failed to load PTAL data:", err);
    alert("Failed to load map data. Please refresh the page.");
  }
}

const NOMINATIM_EMAIL = "brisbaneptal@gmail.com";

let ptalLayer = null;
let ptalData = null;
let fullData = null;
let innerDataLoaded = false;
let showMismatchesOnly = false;
let showFloodOverlay = false;
let showParkingOverlay = false;
let hideGreenSpace = false;
let searchMarker = null;

const map = L.map("map").setView([-27.4650, 153.0242], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

L.control.scale({
  position: 'bottomleft',
  imperial: false,
  metric: true
}).addTo(map);

// PTAL color palette
const PTAL_COLORS = {
  '4b': '#006837',
  '4a': '#1a9850',
  '3': '#a6d96a',
  '2': '#fee08b',
  '1': '#d73027'
};

// Create SVG patterns for overlays
function createSVGPatterns() {
  const mapPane = map.getPanes().overlayPane;
  let svg = mapPane.querySelector('svg');
  
  // If no SVG exists yet, patterns will be created after layer loads
  if (!svg) {
    console.warn('⚠️  SVG not ready, will retry after layer load');
    return false;
  }
  
  // Don't recreate if patterns already exist
  if (svg.querySelector('defs')) {
    console.log('✓ SVG patterns already exist');
    return true;
  }
  
  console.log('Creating SVG patterns...');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
  // 0. Flood-only clear pattern (for PTAL-null flood cells)
    const floodClear = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    floodClear.setAttribute('id', 'flood-clear');
    floodClear.setAttribute('patternUnits', 'userSpaceOnUse');
    floodClear.setAttribute('width', '10');
    floodClear.setAttribute('height', '10');

    const clearRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    clearRect.setAttribute('width', '10');
    clearRect.setAttribute('height', '10');
    clearRect.setAttribute('fill', 'rgba(255,255,255,0.05)'); // basically clear

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

  // Create 15 patterns: 5 PTAL levels × 3 overlay states
  Object.entries(PTAL_COLORS).forEach(([band, color]) => {  
  
    // 1. Flood only (blue diagonal)
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
    
    // 2. Parking only (orange diagonal)
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
    
    // 3. Both overlays (crosshatch)
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
  return "🚌";
}

function getModeLabel(mode) {
  if (mode === "rail" || mode === "train") return "Train";
  if (mode === "ferry") return "Ferry";
  if (mode === "busway") return "Busway";
  return "Bus";
}

function hasPlanningMismatch(props) {
  const band = getPTALBand(props.ptal, props.total_capacity);
  const zone = props.Zone_code;
  const maxStoreys = Number(props.max_storeys);
  
  // Only check 4A/4B
  if (band !== "4A" && band !== "4B") return false;
  
  // Define recommended minimums
  const minStoreys = band === "4B" ? 30 : 16;
  
  // Flag if current max is below recommended minimum
  return Number.isFinite(maxStoreys) && maxStoreys < minStoreys;
}

function hasFloodConstraint(props) {
  const flood = props.flood_constraint;
  return flood === "FPA1" || flood === "FPA2A" || flood === "FPA2B" || flood === "FPA3";
}

function hasParkingMismatch(props) {
  const ptal = Number(props.ptal);
  const parkingZone = String(props.parking_zone);
  
  // Only show for PTAL 3+ (good transit supports lower parking)
  if (ptal < 3) return false;
  
  // Exclude city core, but INCLUDE city frame
  const isCityCore = parkingZone === "334" || parkingZone === "334.0";
  
  return props.parking_mismatch === true && !isCityCore;
}

function hasTransitGap(props) {
  const ptal = Number(props.ptal);
  // Only show PTAL 1 cells with transit gap
  return ptal === 1 && props.transit_gap === true;
}

function isGreenSpace(props) {
  const z = String(props.Zone_code || "").trim().toUpperCase();
  return z === "CN" || z === "OS" || z === "SR";
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
  
  // Hide if OS/CN/SR Zoning
  if (hideGreenSpace && isGreenSpace(props)) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }
  // Hide only if PTAL invalid AND not a flood constraint
  const ptalValid = Number.isFinite(ptalNum) && ptalNum > 0;
  if (!ptalValid && !flood) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }
  const ptalNullFlood = !ptalValid && flood;
  
  // When mismatch filter active, hide non-mismatch cells
  if (showMismatchesOnly && !planningMismatch && !transitGap) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }

  // Default border
  let borderColor = "white";
  let borderWeight = 1;

  if (planningMismatch) {
    borderColor = "#ff0000";
    borderWeight = 2;
  } else if (transitGap) {
    borderColor = "#9932CC";
    borderWeight = 2;
  }

  // Band + safe fallbacks for PTAL-null flood cells
  const bandStr = getPTALBand(ptalNum, capNum);
  const bandKey = bandStr ? bandStr.toLowerCase() : "1";

  // Base fill: safe even when PTAL null
  let fillColor = ptalNullFlood
  ? "rgba(255,255,255,0.05)"      // clear-ish base for PTAL-null flood cells
  : ((bandStr && PTAL_COLORS[bandKey]) ? PTAL_COLORS[bandKey] : PTAL_COLORS["1"]);
  
  // Overlay patterns override base fill
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
      `PTAL ${band} (${label})<br>Click for details`,
      { sticky: true, opacity: 0.9 }
    );
  } else if (flood) {
    layer.bindTooltip(
      `Flood constraint (${props.flood_constraint})<br>Click for details`,
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

  // Allow clicks on flood-only (PTAL null) cells so panel opens
  if (!hasValidPTAL && !flood) return;

  const band = getPTALBand(ptal, total_capacity);
  const gridId = props.id || "Unknown";
  const capacity = props.total_capacity;
  
  // Format grid ID
  const gridMatch = gridId.match(/r([+-]?\d+)_c([+-]?\d+)/);
  let displayId = gridId;
  
  if (gridMatch) {
    const row = parseInt(gridMatch[1]);
    const col = parseInt(gridMatch[2]);
    const letter = String.fromCharCode(65 + Math.abs(row));
    const number = Math.abs(col);
    displayId = `${letter}${number}`;
  }
  
  // Set PTAL with capacity
  if (hasValidPTAL) {
    setText("ptal-score", `${band} · ${capacity ? Math.round(capacity) : '0'} units/hr`);
    setText("category-label", getPTALLabel(ptal, total_capacity));
  } else {
    setText("ptal-score", "not assessed - River / Creek");
    setText("category-label", "Flood constrained area");
  }
  // Set grid link
  const gridLink = $("grid-id-link");
  if (gridLink) {
    setText("grid-id-link", displayId);
    gridLink.href = `?cell=${gridId}`;
  }
  
  setText("zone-code", props.Zone_code || "Unknown");
  setHTML("recommended-height", getRecommendedHeight(ptal, total_capacity));
  
  const maxStoreys = Number(props.max_storeys);
  const heightDisplay =
    Number.isFinite(maxStoreys) && maxStoreys >= 90
      ? "Unlimited*<br><small style='color:#666;'"
      : Number.isFinite(maxStoreys)
        ? `${maxStoreys} storeys`
        : "Unknown";
  setHTML("max-height", heightDisplay);

  // Show parking rates with defaults for Unknown zones in city core/frame
  let bccParking = props.bcc_parking;
  const ptalParking = props.ptal_parking;
  
    // Show parking zone
  const parkingZone = props.parking_zone;
  let zoneLabel = "General"; // default
  
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
  
  showEl("planning-controls", !(props.flood_constraint === "FPA1"));
  showEl("planning-mismatch-warning", planningMismatch);
  showEl("transit-gap-warning", transitGap);
  showEl("flood-explainer", flood);
  showEl("parking-explainer", parking);
  showEl("flood-badge", flood);
  showEl("parking-badge", false);

  if (flood) {
    setText("flood-badge", `🌊 ${props.flood_constraint}`);
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

  // CRITICAL: Create patterns AFTER layer is added
  createSVGPatterns();

  try { if (!innerDataLoaded) { map.fitBounds(ptalLayer.getBounds()); } } catch (_) {}
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
