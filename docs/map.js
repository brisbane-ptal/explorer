// ==============================
// App metadata
// ==============================
const APP_VERSION = "v0.3 – Jan 2026";
const PTAL_THRESHOLDS_TEXT = "PTAL thresholds: 1 <10 · 2 ≥10 · 3 ≥50 · 4 ≥120";

// ==============================
// PTAL URLs
// ==============================
const PTAL_GZ_URL = "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson.gz";
const PTAL_JSON_URL = "https://raw.githubusercontent.com/brisbane-ptal/brisbane-ptal-map/main/docs/brisbane_ptal_final.geojson";

let ptalLayer = null;
let showMismatchOnly = false;

// ==============================
// Map Initialization
// ==============================
const map = L.map('map').setView([-27.4705, 153.0260], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// ==============================
// PTAL Styling & Feature Helpers
// ==============================
function getPTALColor(ptal) {
    switch (ptal) {
        case 4: return '#1a9850';
        case 3: return '#a6d96a';
        case 2: return '#fee08b';
        case 1: return '#d73027';
        default: return '#cccccc';
    }
}

function getPTALLabel(ptal) {
    const labels = { 4:'Excellent', 3:'Good', 2:'Moderate', 1:'Poor' };
    return labels[ptal] || 'Unknown';
}

function getRecommendedHeight(ptal) {
    switch (ptal) {
        case 4: return '12–20 storeys';
        case 3: return '8–12 storeys';
        case 2: return '5–8 storeys';
        case 1: return '3–5 storeys';
        default: return 'N/A';
    }
}

function getModeIcon(mode) {
    if (mode === 'rail' || mode === 'train') return '🚆';
    if (mode === 'ferry') return '⛴️';
    if (mode === 'busway') return '🚌';
    return '🚌';
}

// ==============================
// PTAL Feature Styling & Interaction
// ==============================
function style(feature) {
    const ptal = Number(feature.properties?.ptal);
    if (!Number.isFinite(ptal)) return { fillOpacity:0, opacity:0, stroke:false };

    if (showMismatchOnly && !feature.properties?.mismatch) {
        return { fillOpacity:0, opacity:0, stroke:false };
    }

    return {
        fillColor: getPTALColor(ptal),
        weight: 1,
        color: 'white',
        opacity: 0.3,
        fillOpacity: 0.6,
        cursor: 'pointer'
    };
}

function highlightFeature(e) {
    const layer = e.target;
    if (showMismatchOnly && !layer.feature.properties?.mismatch) return;
    layer.setStyle({ weight:3, opacity:1, fillOpacity:0.8 });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
}

function resetHighlight(e) {
    if (ptalLayer) ptalLayer.resetStyle(e.target);
}

function showInfo(e) {
    const props = e.target.feature.properties || {};
    const ptal = Number(props.ptal);
    if (!Number.isFinite(ptal)) return;

    setText('ptal-score', ptal);
    setText('category-label', getPTALLabel(ptal));
    setText('zone-code', props.Zone_code || 'Unknown');
    setText('recommended-height', getRecommendedHeight(ptal));

    const heightDisplay = props.max_storeys >= 90
        ? 'Unlimited*<br><small style="color:#666;">*Airport height limits apply</small>'
        : `${props.max_storeys} storeys`;
    setHTML('max-height', heightDisplay);

    toggleDisplay('mismatch-warning', !!props.mismatch);

    if (props.total_capacity) {
        toggleDisplay('capacity-info', true);
        setText('total-capacity', `${props.total_capacity} effective units/hr`);
    } else {
        toggleDisplay('capacity-info', false);
    }

    const stopsList = document.getElementById('nearby-stops');
    if (stopsList) {
        stopsList.innerHTML = '';
        try {
            const stops = typeof props.nearby_stops === 'string' ? JSON.parse(props.nearby_stops) : (props.nearby_stops || []);
            if (stops.length === 0) stopsList.innerHTML = '<li style="color:#999;">No stops within catchment</li>';
            else stops.forEach(stop => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${getModeIcon(stop.mode)} <strong>${stop.stop_name}</strong><br>
                    <span style="color:#666;font-size:0.9em;">
                        ${stop.mode} • ${stop.distance_m} m • ${stop.walk_time_min} min walk
                    </span>`;
                li.style.marginBottom = '10px';
                stopsList.appendChild(li);
            });
        } catch {
            stopsList.innerHTML = '<li style="color:#999;">Error loading stops</li>';
        }
    }

    toggleClass('info-panel', 'hidden', false);
}

function onEachFeature(feature, layer) {
    layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: showInfo });
    const ptal = Number(feature.properties?.ptal);
    if (Number.isFinite(ptal)) {
        layer.bindTooltip(`PTAL ${ptal} (${getPTALLabel(ptal)})<br>Click for details`, { sticky:true, opacity:0.9 });
    }
}

// ==============================
// Add PTAL Layer
// ==============================
function addPTALLayer(data) {
    if (ptalLayer) ptalLayer.clearLayers();
    ptalLayer = L.geoJSON(data, { style, onEachFeature }).addTo(map);
    map.fitBounds(ptalLayer.getBounds());
}

// ==============================
// PTAL Loader (GZ first, fallback to plain)
// ==============================
async function loadPTAL() {
    let data = null;

    // Try gzipped first
    try {
        const resGz = await fetch(PTAL_GZ_URL);
        if (resGz.ok) {
            const buffer = await resGz.arrayBuffer();
            const decompressed = pako.ungzip(new Uint8Array(buffer), { to:'string' });
            data = JSON.parse(decompressed);
            console.log("PTAL features (gz):", data.features.length);
        }
    } catch (err) {
        console.warn("Failed to load gz, trying plain JSON:", err);
    }

    // Fallback to plain GeoJSON
    if (!data) {
        try {
            const resJson = await fetch(PTAL_JSON_URL);
            if (resJson.ok) {
                data = await resJson.json();
                console.log("PTAL features (json):", data.features.length);
            }
        } catch (err) {
            console.error("Failed to load PTAL entirely:", err);
        }
    }

    // Add layer if we have data
    if (data) addPTALLayer(data);
}

// ==============================
// UI helpers
// ==============================
function setText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }
function setHTML(id, html) { const el=document.getElementById(id); if(el) el.innerHTML=html; }
function toggleDisplay(id, show) { const el=document.getElementById(id); if(el) el.style.display=show?'block':'none'; }
function toggleClass(id, cls, add) { const el=document.getElementById(id); if(el) el.classList.toggle(cls, add); }

// ==============================
// Mismatch Toggle
// ==============================
const mismatchToggle = document.getElementById('mismatch-toggle');
if (mismatchToggle) {
    mismatchToggle.addEventListener('change', e => {
        showMismatchOnly = e.target.checked;
        if (ptalLayer) ptalLayer.setStyle(style);
    });
}
// ==============================
// Legend toggle for mobile
// ==============================
const legend = document.getElementById('legend');
const legendToggle = document.getElementById('legend-toggle');

if (legend && legendToggle) {
    legendToggle.addEventListener('click', () => {
        legend.classList.toggle('expanded');
    });
}

// ==============================
// Info panel slide-up toggle
// ==============================
const infoPanel = document.getElementById('info-panel');
const closeBtn = document.getElementById('close-panel');

if (closeBtn && infoPanel) {
    closeBtn.addEventListener('click', () => {
        infoPanel.classList.remove('show');
    });
}

// Update showInfo to slide up on mobile
function showInfo(e) {
    const props = e.target.feature.properties || {};
    const ptal = Number(props.ptal);
    if (!Number.isFinite(ptal)) return;

    // Populate panel content as before
    setText('ptal-score', ptal);
    setText('category-label', getPTALLabel(ptal));
    setText('zone-code', props.Zone_code || 'Unknown');
    setText('recommended-height', getRecommendedHeight(ptal));

    const heightDisplay = props.max_storeys >= 90
        ? 'Unlimited*<br><small style="color:#666;">*Airport height limits apply</small>'
        : `${props.max_storeys} storeys`;
    setHTML('max-height', heightDisplay);

    toggleDisplay('mismatch-warning', !!props.mismatch);

    if (props.total_capacity) {
        toggleDisplay('capacity-info', true);
        setText('total-capacity', `${props.total_capacity} effective units/hr`);
    } else {
        toggleDisplay('capacity-info', false);
    }

    const stopsList = document.getElementById('nearby-stops');
    if (stopsList) {
        stopsList.innerHTML = '';
        try {
            const stops = typeof props.nearby_stops === 'string' ? JSON.parse(props.nearby_stops) : (props.nearby_stops || []);
            if (stops.length === 0) stopsList.innerHTML = '<li style="color:#999;">No stops within catchment</li>';
            else stops.forEach(stop => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${getModeIcon(stop.mode)} <strong>${stop.stop_name}</strong><br>
                    <span style="color:#666;font-size:0.9em;">
                        ${stop.mode} • ${stop.distance_m} m • ${stop.walk_time_min} min walk
                    </span>`;
                li.style.marginBottom = '10px';
                stopsList.appendChild(li);
            });
        } catch {
            stopsList.innerHTML = '<li style="color:#999;">Error loading stops</li>';
        }
    }

    // Show panel (slide-up on mobile)
    infoPanel.classList.add('show');
}
// ==============================
// Footer metadata
// ==============================
setText('version', APP_VERSION);
setText('ptal-thresholds', PTAL_THRESHOLDS_TEXT);

// ==============================
// Load PTAL Data
// ==============================
loadPTAL();
