/* =========================================================
   Brisbane PTAL Explorer — map.js (updated v0.6 - Week 1)
   ========================================================= */

/* ==============================
   App metadata
   ============================== */
const APP_VERSION = "v0.6 – Jan 2026";
const PTAL_THRESHOLDS_TEXT = "PTAL thresholds: 1 <10 · 2 ≥10 · 3 ≥50 · 4 ≥120";

/* ==============================
   PTAL URLs
   ============================== */
const PTAL_GZ_URL =
  "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson.gz";
const PTAL_JSON_URL =
  "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson";

/* ==============================
   Nominatim config
   ============================== */
const NOMINATIM_EMAIL = "";

/* ==============================
   Globals
   ============================== */
let ptalLayer = null;
let ptalData = null;
let showMismatchesOnly = false;
let searchMarker = null;

/* ==============================
   Map Initialization
   ============================== */
const map = L.map("map").setView([-27.4705, 153.0260], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

L.control.scale({
  position: 'bottomleft',
  imperial: false,
  metric: true
}).addTo(map);

/* ==============================
   PTAL Helpers
   ============================== */
function getPTALColor(ptal) {
  switch (ptal) {
    case 4: return "#1a9850";
    case 3: return "#a6d96a";
    case 2: return "#fee08b";
    case 1: return "#d73027";
    default: return "#cccccc";
  }
}

function getPTALLabel(ptal) {
  const labels = { 4: "Excellent", 3: "Good", 2: "Moderate", 1: "Poor" };
  return labels[ptal] || "Unknown";
}

function getRecommendedHeight(ptal) {
  switch (ptal) {
    case 4: return "15+ storeys";
    case 3: return "8–15 storeys";
    case 2: return "3–8 storeys";
    case 1: return "2–3 storeys";
    default: return "N/A";
  }
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

/* ==============================
   Overlay Detection (Week 1)
   ============================== */
function hasPlanningMismatch(props) {
  const heightMismatch = props.height_mismatch;
  const zone = props.Zone_code;
  
  if (!zone || zone === "Unknown" || zone === "Mixed") return false;
  
  return heightMismatch === "under" || heightMismatch === "over";
}

function hasFloodConstraint(props) {
  const flood = props.flood_constraint;
  return flood === "FPA1" || flood === "FPA2A" || flood === "FPA2B" || flood === "FPA3";
}

function hasParkingMismatch(props) {
  return props.parking_mismatch === true;
}

function hasTransitGap(props) {
  const ptal = Number(props.ptal);
  const maxStoreys = Number(props.max_storeys);
  const zone = props.Zone_code;
  
  if (!zone || zone === "Unknown" || zone === "Mixed") return false;
  
  return Number.isFinite(ptal) && Number.isFinite(maxStoreys) && ptal <= 1 && maxStoreys >= 4;
}

/* ==============================
   Safe DOM helpers
   ============================== */
function $(id) { return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text ?? ""; }
function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html ?? ""; }
function showEl(id, show) { const el = $(id); if (el) el.style.display = show ? "block" : "none"; }

/* ==============================
   Styling & Interaction
   ============================== */
function style(feature) {
  const props = feature.properties || {};
  const ptal = Number(props.ptal);

  if (!Number.isFinite(ptal)) return { fillOpacity: 0, opacity: 0, stroke: false };
  
  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);
  const flood = hasFloodConstraint(props);
  const parking = hasParkingMismatch(props);

  if (showMismatchesOnly && !planningMismatch && !transitGap) {
    return { fillOpacity: 0, opacity: 0, stroke: false };
  }

  let borderColor = "white";
  let borderWeight = 1;
  
  if (planningMismatch) {
    borderColor = "#ff0000";
    borderWeight = 2;
  } else if (transitGap) {
    borderColor = "#9932CC";
    borderWeight = 2;
  }

  const className = [
    flood ? 'flood-hatch' : '',
    parking ? 'parking-hatch' : ''
  ].filter(Boolean).join(' ');

  return {
    fillColor: getPTALColor(ptal),
    weight: borderWeight,
    color: borderColor,
    opacity: 0.7,
    fillOpacity: 0.6,
    className: className || undefined
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

  const ptal = Number(feature.properties?.ptal);
  if (Number.isFinite(ptal)) {
    layer.bindTooltip(
      `PTAL ${ptal} (${getPTALLabel(ptal)})<br>Click for details`,
      { sticky: true, opacity: 0.9 }
    );
  }
}

/* ==============================
   Info Panel
   ============================== */
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
  if (!Number.isFinite(ptal)) return;

  setText("ptal-score", ptal);
  setText("category-label", getPTALLabel(ptal));
  setText("zone-code", props.Zone_code || "Unknown");
  setText("recommended-height", getRecommendedHeight(ptal));

  const maxStoreys = Number(props.max_storeys);
  const heightDisplay =
    Number.isFinite(maxStoreys) && maxStoreys >= 90
      ? "Unlimited*<br><small style='color:#666;'>*Airport height limits apply</small>"
      : Number.isFinite(maxStoreys)
        ? `${maxStoreys} storeys`
        : "Unknown";
  setHTML("max-height", heightDisplay);

  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);
  
  showEl("planning-mismatch-warning", planningMismatch);
  showEl("transit-gap-warning", transitGap);

  if (props.total_capacity !== undefined && props.total_capacity !== null && props.total_capacity !== "") {
    showEl("capacity-info", true);
    setText("total-capacity", `${props.total_capacity} effective units/hr`);
  } else {
    showEl("capacity-info", false);
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
        stops.slice(0, 10).forEach((stop) => {
          const li = document.createElement("li");
          const mode = stop.mode || "bus";
          const name = stop.stop_name || "Stop";
          const stopCode = stop.stop_id ? ` (${stop.stop_id})` : '';
          const dist = stop.distance_m ?? "?";
          const walk = stop.walk_time_min ?? "?";
          const modeLabel = getModeLabel(mode);

          li.innerHTML = `
            ${getModeIcon(mode)} <strong>${name}</strong>${stopCode}<br>
            <span style="color:#666;font-size:0.9em;">
              ${modeLabel} • ${dist} m • ${walk} min walk
            </span>`;
          li.style.marginBottom = "10px";
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

/* ==============================
   Add PTAL Layer
   ============================== */
function addPTALLayer(data) {
  if (ptalLayer) {
    try { ptalLayer.remove(); } catch (_) {}
    ptalLayer = null;
  }

  ptalData = data;
  ptalLayer = L.geoJSON(data, { style, onEachFeature }).addTo(map);

  try { map.fitBounds(ptalLayer.getBounds()); } catch (_) {}
}

/* ==============================
   PTAL Loader
   ============================== */
async function loadPTAL() {
  let data = null;

  try {
    const resGz = await fetch(PTAL_GZ_URL, { cache: "no-store" });
    if (resGz.ok) {
      const buffer = await resGz.arrayBuffer();
      const decompressed = pako.ungzip(new Uint8Array(buffer), { to: "string" });
      data = JSON.parse(decompressed);
      console.log("PTAL features (gz):", data?.features?.length ?? 0);
    } else {
      console.warn("PTAL gz fetch not ok:", resGz.status);
    }
  } catch (err) {
    console.warn("PTAL gz load failed, falling back to JSON:", err);
  }

  if (!data) {
    try {
      const resJson = await fetch(PTAL_JSON_URL, { cache: "no-store" });
      if (resJson.ok) {
        data = await resJson.json();
        console.log("PTAL features (json):", data?.features?.length ?? 0);
      } else {
        console.error("PTAL json fetch not ok:", resJson.status);
      }
    } catch (err) {
      console.error("Failed to load PTAL entirely:", err);
    }
  }

  if (data) addPTALLayer(data);
}

/* ==============================
   Legend controls
   ============================== */
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

/* ==============================
   Mismatch toggle
   ============================== */
const mismatchToggle = $("mismatch-toggle");

function applyFilter() {
  showMismatchesOnly = mismatchToggle ? mismatchToggle.checked : false;
  if (ptalLayer) ptalLayer.setStyle(style);
}

if (mismatchToggle) {
  mismatchToggle.addEventListener("change", applyFilter);
}

/* ==============================
   Address search
   ============================== */
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

/* ==============================
   Footer metadata
   ============================== */
setText("version", APP_VERSION);
setText("ptal-thresholds", PTAL_THRESHOLDS_TEXT);

/* ==============================
   Initial state
   ============================== */
if (infoPanel) {
  infoPanel.classList.add("hidden");
  infoPanel.classList.remove("show");
}

loadPTAL();
