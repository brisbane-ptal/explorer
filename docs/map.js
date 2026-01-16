/* =========================================================
   Brisbane PTAL Explorer — map.js (v0.7)
   ========================================================= */

/* ==============================
   App metadata
   ============================== */
const APP_VERSION = "v0.7 – Jan 2026";
const PTAL_THRESHOLDS_TEXT =
  "PTAL thresholds (Brisbane calibrated): 1 <5 · 2 ≥5 · 3 ≥25 · 4 ≥60";

/* ==============================
   PTAL URLs
   ============================== */
const PTAL_GZ_URL =
  "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson.gz";
const PTAL_JSON_URL =
  "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson";
const STOPS_LOOKUP_URL =
  "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/stops_lookup.json";

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
let stopsLookup = null; // Stop lookup for optimized display
let searchMarker = null;

/* ==============================
   Map Initialization
   ============================== */
const map = L.map("map").setView([-27.4705, 153.0260], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

// Add scale bar
L.control
  .scale({
    position: "bottomleft",
    imperial: false,
    metric: true,
  })
  .addTo(map);

/* ==============================
   PTAL Helpers
   ============================== */

/**
 * Brisbane-calibrated PTAL thresholds (based on effective units/hr)
 * PTAL 4: >= 60
 * PTAL 3: >= 25
 * PTAL 2: >= 5
 * PTAL 1: <  5
 *
 * We compute PTAL from total_capacity so we can re-band without rerunning Python.
 */
function classifyPTAL(totalCapacity) {
  const c = Number(totalCapacity);
  if (!Number.isFinite(c)) return 1;

  if (c >= 60) return 4;
  if (c >= 25) return 3;
  if (c >= 5) return 2;
  return 1;
}

function getPTALColor(ptal) {
  switch (ptal) {
    case 4:
      return "#1a9850";
    case 3:
      return "#a6d96a";
    case 2:
      return "#fee08b";
    case 1:
      return "#d73027";
    default:
      return "#cccccc";
  }
}

function getPTALLabel(ptal) {
  const labels = { 4: "Excellent", 3: "Good", 2: "Moderate", 1: "Poor" };
  return labels[ptal] || "Unknown";
}

function getRecommendedHeight(ptal) {
  switch (ptal) {
    case 4:
      return "15+ storeys";
    case 3:
      return "8–15 storeys";
    case 2:
      return "3–8 storeys";
    case 1:
      return "2–3 storeys";
    default:
      return "N/A";
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
   Mismatch Detection
   ============================== */
function hasPlanningMismatch(props) {
  const ptal = classifyPTAL(props.total_capacity);
  const maxStoreys = Number(props.max_storeys);
  const zone = props.Zone_code;

  if (!zone || zone === "Unknown" || zone === "Mixed") return false;

  return Number.isFinite(maxStoreys) && ptal === 4 && maxStoreys <= 3;
}

function hasTransitGap(props) {
  const ptal = classifyPTAL(props.total_capacity);
  const maxStoreys = Number(props.max_storeys);
  const zone = props.Zone_code;

  if (!zone || zone === "Unknown" || zone === "Mixed") return false;

  return Number.isFinite(maxStoreys) && ptal <= 1 && maxStoreys >= 4;
}

/* ==============================
   Safe DOM helpers
   ============================== */
function $(id) {
  return document.getElementById(id);
}
function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text ?? "";
}
function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html ?? "";
}
function showEl(id, show) {
  const el = $(id);
  if (el) el.style.display = show ? "block" : "none";
}

/* ==============================
   Styling & Interaction
   ============================== */
function style(feature) {
  const props = feature.properties || {};
  const ptal = classifyPTAL(props.total_capacity);

  const planningMismatch = hasPlanningMismatch(props);
  const transitGap = hasTransitGap(props);

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

  return {
    fillColor: getPTALColor(ptal),
    weight: borderWeight,
    color: borderColor,
    opacity: 0.7,
    fillOpacity: 0.6,
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
    try {
      layer.bringToFront();
    } catch (_) {}
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
  const ptal = classifyPTAL(props.total_capacity);

  layer.bindTooltip(`PTAL ${ptal} (${getPTALLabel(ptal)})<br>Click for details`, {
    sticky: true,
    opacity: 0.9,
  });
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
  const ptal = classifyPTAL(props.total_capacity);

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

  // Capacity breakdown
  const totalCapacity = props.total_capacity;
  const capacityRail = Number(props.capacity_rail) || 0;
  const capacityFerry = Number(props.capacity_ferry) || 0;
  const capacityBusway = Number(props.capacity_busway) || 0;
  const capacityBus = Number(props.capacity_bus) || 0;

  if (totalCapacity !== undefined && totalCapacity !== null && totalCapacity !== "") {
    showEl("capacity-info", true);
    setText("total-capacity", `${totalCapacity} effective units/hr`);

    // Show breakdown
    let breakdownHTML = "<div style='margin-top:8px; font-size:0.9em;'>";
    if (capacityRail > 0) breakdownHTML += `<div>🚆 Rail: ${capacityRail} units/hr</div>`;
    if (capacityFerry > 0) breakdownHTML += `<div>⛴️ Ferry: ${capacityFerry} units/hr</div>`;
    if (capacityBusway > 0) breakdownHTML += `<div>🚌 Busway: ${capacityBusway} units/hr</div>`;
    if (capacityBus > 0) breakdownHTML += `<div>🚌 Bus: ${capacityBus} units/hr</div>`;
    breakdownHTML += "</div>";

    setHTML("capacity-breakdown", breakdownHTML);
    showEl("capacity-breakdown", true);
  } else {
    showEl("capacity-info", false);
  }

  // Stops list using lookup
  const stopsList = $("nearby-stops");
  if (stopsList) {
    stopsList.innerHTML = "";

    const stopIds = props.nearby_stop_ids ? String(props.nearby_stop_ids).split(",") : [];

    if (stopIds.length === 0 || (stopIds.length === 1 && stopIds[0] === "")) {
      stopsList.innerHTML = "<li style='color:#999;'>No stops within catchment</li>";
    } else if (!stopsLookup) {
      stopsList.innerHTML = "<li style='color:#999;'>Loading stop data...</li>";
    } else {
      stopIds.slice(0, 10).forEach((stopId) => {
        const stop = stopsLookup[stopId.trim()];
        if (!stop) return;

        const li = document.createElement("li");
        const mode = stop.mode || "bus";
        const name = stop.name || "Stop";
        const routes = stop.routes || [];

        let routesText = "";
        if (routes.length > 0) {
          routesText = `<div style="color:#666;font-size:0.85em;margin-top:3px;">Routes: ${routes.join(
            ", "
          )}</div>`;
        }

        li.innerHTML = `
          ${getModeIcon(mode)} <strong>${name}</strong> (${stopId})<br>
          <span style="color:#666;font-size:0.9em;">
            ${getModeLabel(mode)}
          </span>
          ${routesText}`;
        li.style.marginBottom = "12px";
        stopsList.appendChild(li);
      });
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
    try {
      ptalLayer.remove();
    } catch (_) {}
    ptalLayer = null;
  }

  ptalData = data;
  ptalLayer = L.geoJSON(data, { style, onEachFeature }).addTo(map);

  try {
    map.fitBounds(ptalLayer.getBounds());
  } catch (_) {}
}

/* ==============================
   Load Stops Lookup
   ============================== */
async function loadStopsLookup() {
  try {
    console.log("Loading stops lookup...");
    const response = await fetch(STOPS_LOOKUP_URL, { cache: "force-cache" });
    if (response.ok) {
      stopsLookup = await response.json();
      console.log(`Loaded lookup for ${Object.keys(stopsLookup).length} stops`);
    } else {
      console.warn("Stops lookup not available:", response.status);
    }
  } catch (err) {
    console.warn("Failed to load stops lookup:", err);
  }
}

/* ==============================
   PTAL Loader
   ============================== */
async function loadPTAL() {
  let data = null;

  // Try gz
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

  // Fallback json
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
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Bad geocode result");

      map.setView([lat, lon], 17);

      if (searchMarker) {
        try {
          map.removeLayer(searchMarker);
        } catch (_) {}
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

// Load both datasets
loadStopsLookup();
loadPTAL();
