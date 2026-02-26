# South East Queensland Public Enhanced Transport Accessibility Level (PETAL) Methodology

**Version 0.9 | February 2026**

-----

## Table of Contents

1. [Purpose](#purpose)
1. [What PTAL measures (and what it doesn’t)](#what-ptal-measures-and-what-it-doesnt)
1. [Methodology overview](#methodology-overview)
   1. [Capacity weighting by vehicle type](#1-capacity-weighting-by-vehicle-type)
   1. [Reliability adjustments](#2-reliability-adjustments)
   1. [Route dominance decay](#3-route-dominance-decay)
   1. [Bidirectional counting](#4-bidirectional-counting)
   1. [Mode-specific catchments with distance estimation](#5-mode-specific-catchments-with-distance-estimation)
   1. [PETAL band thresholds](#6-petal-band-thresholds)
   1. [Parking rate analysis](#7-parking-rate-analysis)
   1. [Flood planning area overlays](#8-flood-planning-area-overlays)
1. [Calculation process](#calculation-process)
1. [Data sources](#data-sources)
1. [Limitations and assumptions](#limitations-and-assumptions)
   1. [Known limitations](#known-limitations)
   1. [Assumptions requiring validation](#assumptions-requiring-validation)
1. [Comparison to other PTAL methodologies](#comparison-to-other-ptal-methodologies)
   1. [Departures from Transport for London PTAL](#departures-from-transport-for-london-ptal)
   1. [Alignment with Australian practice](#alignment-with-australian-practice)
1. [Future development](#future-development)
1. [Technical implementation](#technical-implementation)
1. [Attribution and contact](#attribution-and-contact)
1. [Version history](#version-history)
1. [Licence](#licence)

-----

## Purpose

This tool maps public transport accessibility across inner Brisbane using a modified Public Transport Accessibility Level (PTAL) methodology. It measures how easily residents can access frequent, reliable public transport during peak periods. The tool currently covers Brisbane (15km radius from CBD) and Gold Coast (LGA boundaries).

The analysis is designed to inform discussions about:

- Where housing density could be supported by existing transport infrastructure
- Which areas would benefit from transport investment to enable growth
- How planning policies align (or don’t) with actual accessibility
- Where parking requirements could be reduced based on transit access
- How flood planning constraints interact with transit-rich locations

This is an independent analytical tool, not an official planning instrument. It aims to make transport accessibility legible and comparable across South East Queensland.

## What PETAL measures (and what it doesn’t)

**PETAL assesses:**

- Service frequency during peak periods (7-9am weekday)
- Walking distance to stops and stations (estimated pedestrian network distance)
- Vehicle capacity and mode quality (train vs bus vs ferry)
- Service reliability based on published on-time performance

**PETAL does not assess:**

- Off-peak or weekend service quality
- Fare affordability or ticketing integration
- Destinations served or journey time to specific locations
- Crowding or passenger experience beyond capacity
- Cycling infrastructure or other transport modes
- Future planned infrastructure (only existing services)

A high PETAL score means “turn-up-and-go accessibility exists”, not “this location is perfect for car-free living” (which depends on many other factors).

## Methodology overview

This analysis adapts the Transport for London PTAL methodology for South East Queensland’s context, with modifications for climate, network structure, and vehicle capacity.

### Key methodological choices

**1. Capacity weighting by vehicle type**

Not all services deliver equivalent accessibility. A six-car train carries 9× the seated passengers of a standard bus. The methodology weights services by actual capacity:

|Vehicle type                |Effective Capacity|Weight         |
|----------------------------|---------------|---------------|
|6-car train (NGR)                |450            |9.0×           |
|Light rail (G:link)          |250            |5.0×           |
|Bi-articulated bus (Brisbane Metro)              |150            |3.0×           |
|Articulated bus (CityGlider)|75             |1.5×           |
|Standard bus                |50             |1.0× (baseline)|
|CityCat                     |170            |3.4×           |
|KittyCat                    |60             |1.2×           |

*Source: Published vehicle specifications from TransLink and manufacturers.*

**Rationale:** A location served by 10 buses per hour is not equivalent to one served by 10 trains per hour. Capacity weighting reflects actual people-moving capability. Metro-style light rail receives partial standing credit due to smooth dedicated infrastructure and short trip distances, and the total proportion of seated vs standing spaces included by the manufacturer reflects this. Buses, ferries and suburban trains use seated capacity only.

**2. Reliability adjustments**

Service frequency is adjusted by mode-specific on-time performance:

|Mode               |Reliability factor|Basis                                                              |
|-------------------|------------------|-------------------------------------------------------------------|
|Heavy rail         |0.95              |~95% on-time (TransLink performance data)                          |
|Light rail (G:link)|0.98              |~98% on-time (dedicated corridor)                                  |
|Busway             |0.90              |~90% on-time (dedicated infrastructure, some traffic interaction)  |
|Bus                |0.85              |~85% on-time (mixed traffic)                                       |
|Ferry              |0.95              |Similar to rail (dedicated corridor, weather impacts minor in peak)|

*Source: TransLink monthly performance reports, 2023-2025 averages.*

**Rationale:** Scheduled frequency overstates accessibility if services are frequently delayed. A route at 85% reliability effectively operates at 85% of its scheduled frequency.

**3. Route dominance decay**

Multiple routes serving the same location provide redundancy but with diminishing returns. The methodology applies declining weight to additional routes:

|Route rank      |Weight|
|----------------|------|
|1st (best route)|1.00  |
|2nd             |0.50  |
|3rd             |0.30  |
|4th             |0.20  |
|5th             |0.15  |
|6th+            |0.10  |

**Rationale:** Passengers gravitate toward the most frequent service. A second route provides backup value (weighted 50%), but ten mediocre routes do not equal one excellent route. This prevents artificial inflation where many infrequent services overlap.

**4. Bidirectional counting**

Inbound and outbound services are counted separately, as they serve different trip purposes. A location with 12 inbound and 12 outbound services per hour has genuinely better accessibility than one with 12 services in a single direction (no return journey option).

Route decay is applied separately within each direction - the best inbound route and best outbound route each receive 1.0× decay multiplier, with subsequent routes in each direction receiving declining weights.

**5. Mode-specific catchments with distance estimation**

Walking catchment distances reflect infrastructure permanence and observed passenger behaviour:

|Mode             |Catchment|
|-----------------|---------|
|Heavy rail       |800m     |
|Busway stations  |800m     |
|CityCat terminals|800m     |
|Bus stops        |400m     |
|KittyCat stops   |400m     |

**Distance calculation methodology:**

- Distances are calculated using Euclidean (straight-line) distance with a network multiplier
- Standard pedestrian routes: Euclidean distance × 1.3 (accounts for indirect paths, crossings, corners)
- River crossings: Euclidean distance × 3.0 (penalizes routes crossing the Brisbane River where bridges are not directly accessible)
- River crossing detection: Uses Brisbane City Council service catchment boundaries; paths that exit and re-enter the catchment are assumed to cross the river

**Rationale for 800m rail/busway/ferry catchments:**

- International PTAL methodologies use 800-960m for rail (London: 960m, Melbourne: 800m, Auckland: 800m)
- Brisbane development guidelines recognise 800m station catchments for Transit Oriented Development
- Research demonstrates passengers walk approximately twice as far for high-quality service
- Rail and busway stations, ferry terminals represent permanent infrastructure worth walking to
- This methodology uses 800m (not 960m) to account for Brisbane’s subtropical climate
- Network distance multiplier (1.3×) adds further conservatism
- Hard cutoff at 801m means locations just beyond the catchment receive no credit


**6. PETAL band thresholds**

|Band    |Threshold              |Interpretation                                                                              |
|--------|-----------------------|--------------------------------------------------------------------------------------------|
|PETAL 4B|≥240 effective units/hr|Excellent accessibility; trunk infrastructure with high frequency; turn-up-and-go service   |
|PETAL 4A|≥120 effective units/hr|Very good accessibility; trunk infrastructure with medium frequency; timetable not essential|
|PETAL 3 |≥50 effective units/hr |Good accessibility; either lower-frequency trunk OR excellent bus network                   |
|PETAL 2 |≥10 effective units/hr |Basic service; single decent route or multiple infrequent routes; check timetable           |
|PETAL 1 |<10 effective units/hr |Poor connectivity; car-dependent location                                                   |

Thresholds calibrated to Brisbane conditions based on sample locations with known accessibility characteristics.

**Capacity validation through bedroom density analysis:**

PETAL thresholds are calibrated to residential demand within 800m catchments (2.01 km² total, 1.51 km² developable at 75%). Per 1,000m² site: 50% site cover = 500m² floor plate, 80% efficiency = 400m² usable, 4× 2-bedroom apartments at 2.5 people per apartment = 10 people per storey. Assuming 50% redevelopment rate and 5.6% peak hour travel rate:

|Height    |Catchment population|Transit users          |Capacity needed|PETAL band|PETAL range|
|----------|--------------------|-----------------------|---------------|----------|-----------|
|3 storeys |22,600              |253 (20% mode share)   |5              |PETAL 1   |<10        |
|8 storeys |60,300              |1,351 (40% mode share) |27             |PETAL 2   |10-49      |
|15 storeys|113,000             |3,164 (50% mode share) |63             |PETAL 3   |50-119     |
|30 storeys|226,000             |6,328 (50% mode share) |127            |PETAL 4A  |120-239    |
|60 storeys|452,000             |12,656 (50% mode share)|253            |PETAL 4B  |≥240       |

Mode share assumptions reflect urban context: 20% suburban, 40% inner-ring mixed-use (2-5km from CBD), 50% plateau for walkable TOD where trip reduction dominates.

**7. Parking rate analysis**

The tool compares Brisbane City Council’s current parking minimums against PETAL-informed rates used in comparable cities.

(Gold Coast parking overlay mapping not yet implemented; recommendations apply but spatial analysis is Brisbane-only.)

**Current Brisbane City Council parking minimums (including visitor parking):**

|Location type                    |1-bed|2-bed|3-bed|4+ bed|
|---------------------------------|-----|-----|-----|------|
|General residential              |1.75 |2.25 |2.75 |3.25  |
|Within 400m of major interchange*|1.0  |1.2  |1.6  |2.0   |

*Major public transport interchange or bus routes with 20-minute peak frequency

**PETAL-recommended parking rates (spaces per dwelling):**

|PETAL Band                 |2-bed rate  |Rationale                                                                                                                   |
|---------------------------|------------|----------------------------------------------------------------------------------------------------------------------------|
|4B/4A (Excellent/Very Good)|1.05 maximum|Metro-level accessibility enables car-optional living. Comparable to Melbourne CBD (1.0 max), Sydney City Core (0.5-1.0 max)|
|3 (Good)                   |1.25        |Good transit supports reduced parking. Comparable to Melbourne inner suburbs, Sydney City Frame                             |
|2 (Moderate)               |1.5         |Basic service requires some car ownership. BCC’s proposed rate for major interchanges                                       |
|1 (Poor)                   |2.25        |Car-dependent location. Higher than BCC general rate to reflect true accessibility constraint                               |

**Comparison to Victorian Government PTAL reforms (December 2025):**

- PTAL 3-4 areas (train/tram within 400m or <4km from CBD): 2 spaces maximum
- PTAL 2 areas (serviced by public transport): 1 space minimum
- PTAL 1 areas (little/no service): 1.2 spaces minimum

Brisbane’s rates are more conservative than Victoria’s, maintaining higher minimums in transit-rich areas.

**Parking cost impact:**

- At-grade parking: ~$40,000 per space
- Basement parking: ~$80,000-$100,000 per space

Reducing parking from 2.25 to 1.25 spaces per 2-bed unit saves approximately $80,000-$100,000 per dwelling in construction costs in areas requiring basement parking.

**8. Flood planning area overlays**

The tool maps flood constrained areas to show where flood constraints intersect with high-accessibility locations, and important constraint for SEQ specific analysis.

**Flood Planning Area categories:**

|FPA Category|Flood probability                |Development constraints                                 |
|------------|---------------------------------|--------------------------------------------------------|
|FPA1        |<1% annual chance (1-in-100 year)|Severe restrictions; residential generally prohibited   |
|FPA2A       |1-5% annual chance               |Significant constraints; habitable floor levels elevated|
|FPA2B       |5-10% annual chance              |Moderate constraints; some elevation requirements       |
|FPA3        |10-39% annual chance             |Minor constraints; flooding likely but manageable       |

**Source:** Brisbane City Plan 2014, Flood Overlay Code

**City of Gold Coast uses a different flood hazard schema:**

- Very High Hazard
- High Hazard
- Moderate Hazard
- Low Hazard (excluded - not a development constraint)

**Source:** City of Gold Coast Planning Scheme, Natural Hazards Overlay

**Methodology:**
Flood planning areas are spatially joined to PETAL grid cells. A cell is flagged as flood-constrained if its centroid intersects with any mapped flood constraint (Brisbane: FPA1-3; Gold Coast: Very High/High/Moderate). The tool does not differentiate between constraint severity levels. Given the 100m grid, it is not a site specfific analysis tool, and offers only a high level overview of areas with likely flood constraints. 

**Grid filtering:**
Cells with centroids in rivers, waterways, oceans or canals are excluded from the analysis entirely. These represent the River and creek corridors, other areas that are primarily water bodies rather than developable land.

**Interpretation:**
Flood constraints don’t necessarily eliminate development potential, but they add cost and reduce feasibility:

- Elevated habitable floors increase construction costs
- Basement parking becomes impractical in flood-prone areas
- Some sites may be excluded from insurance markets

The overlay shows where SEQ’s best-serviced locations face competing planning constraints. This is relevant for two reasons:

1. **Policy sequencing:** Areas with excellent transit but significant flood risk may need infrastructure investment (flood mitigation, elevated access) before density targets are realistic
1. **Relative prioritisation:** Where PTAL 4A/4B locations have minimal flood constraints, these should be prioritised for near-term densification over flood-affected sites requiring additional engineering

The tool does not assess future flood risk under climate change scenarios, which may expand affected areas.

## Calculation process

For each 100m × 100m grid cell:

1. Filter grid to exclude cells outside LGA catchments
2. Filter grid to exclude waterways (no developable land)
3. Filter grid to flag flood affected and open space zones (unsuitable for development)
4. Identify all stops within mode-specific catchment distance using Euclidean distance with network multiplier:
- Rail/busway/CityCat stops: within 800m (Euclidean × 1.3, or × 3.0 if crossing river)
- Bus/KittyCat stops: within 400m (Euclidean × 1.3, or × 3.0 if crossing river)
5. For each stop within catchment, extract 7-9am weekday services from GTFS data
6. Calculate services per hour per route-direction
7. Apply capacity weighting based on vehicle type
8. Apply reliability adjustment based on mode
9. Calculate effective frequency for each route-direction serving the cell
10. Sort routes by effective frequency (descending)
11. Apply route dominance decay to calculate total effective capacity
12. Assign PETAL band based on threshold

**Formula:**

```
Total Effective Capacity = Σ(Services/hr × Capacity Weight × Reliability Factor × Decay Factor)
```

Where decay factor depends on route rank (1st route: 1.0, 2nd: 0.5, 3rd: 0.3, etc.)

**Example calculation:**

For a cell served by Dutton Park station and Logan Road buses:

```
Route 1 - Train inbound: 8 services/hr × 9.0 capacity × 0.95 reliability × 1.00 decay = 68.4 units
Route 2 - Train outbound: 8 services/hr × 9.0 capacity × 0.95 reliability × 1.00 decay = 68.4 units
Route 3 - Bus 160 inbound: 4 services/hr × 1.0 capacity × 0.85 reliability × 0.50 decay = 2.0 units
Route 4 - Bus 160 outbound: 4 services/hr × 1.0 capacity × 0.85 reliability × 0.3 decay = 1.0 units

Total Effective Capacity = 139.8 units → PETAL 4A
```

**Example calculation (Gold Coast):**

For a cell served by Broadbeach South G:link station:

```
Route 1 - G:link inbound: 8 services/hr × 5.0 capacity × 0.98 reliability × 1.00 decay = 39.2 units
Route 2 - G:link outbound: 8 services/hr × 5.0 capacity × 0.98 reliability × 1.00 decay = 39.2 units

Total Effective Capacity = 78.4 units → PETAL 3
```

## Data sources

- **GTFS schedule data:** TMR TransLink South East Queensland, current timetables (February 2026)
- **Vehicle capacity specifications:** Published by TransLink and manufacturers
- **On-time performance:** TransLink monthly punctuality and reliability performance reports (2023-2025)
- **Service catchment boundaries:** Brisbane City Council GIS data (used for river crossing detection)
- **Parking rates:** Brisbane City Plan 2014, Transport, Access, Parking and Servicing Code; Victorian Government Activity Centre Zone Schedule 2024
- **Flood planning areas:** Brisbane City Plan 2014, Flood Overlay mapping (Council GIS data)
- **City of Gold Coast:** LGA boundaries, flood hazard mapping, planning scheme zones
- **Zoning and height limits:** Brisbane City Plan 2014, Zone Code overlays
- **Grid geometry:** 100m × 100m cells 
- **Grid filtering:** Brisbane excludes FPA1/CN/OS/SR; Gold Coast excludes ocean/waterways/rural/conservation

All data sources are publicly available or derived from open government data.

## Limitations and assumptions

**Known limitations:**

1. **Peak-period only:** Analysis uses 7-9am weekday services. Off-peak and weekend accessibility may differ substantially.
1. **Scheduled service, not crowding:** Methodology uses scheduled capacity, not actual spare capacity. Services running at crush load provide lower effective accessibility than the calculation suggests.
1. **No destination assessment:** PETAL measures frequency and capacity, not whether services go to useful destinations. A location with frequent service to limited destinations scores higher than one with less-frequent service to many destinations.
1. **Estimated network distance:** Walking distances use Euclidean distance × 1.3 multiplier (or × 3.0 for river crossings), not actual pedestrian routing. This is a simplified approximation that may:
- Underestimate distances where paths are particularly indirect
- Overestimate distances where direct paths exist
- Not perfectly capture bridge locations and accessibility
1. **Walking surface quality not assessed:** Distance calculation treats all paths as equivalent. The methodology does not account for:
- **Gradient and topography:** Brisbane’s hilly terrain means some 400m walks involve significant elevation change (e.g., Red Hill, Highgate Hill, Kangaroo Point)
- **Surface quality:** Footpath condition, width, lighting, and weather protection vary substantially
- **Accessibility barriers:** Stairs, steep ramps, missing kerb cuts, or narrow paths restrict access for people with mobility constraints, parents with prams, elderly residents, and wheelchair users
- **Pedestrian amenity:** Shade, weather protection, traffic exposure, and personal safety perceptions affect actual willingness to walk
   
   A 400m walk on flat, shaded, well-maintained footpaths is not equivalent to a 400m walk up a steep hill on narrow, exposed paths. PETAL scores may overstate accessibility for locations with challenging pedestrian environments.
1. **Static analysis:** Results reflect current timetables and infrastructure only. Planned expansions (e.g., Cross River Rail stations) are not included.
2. **No mode interchange assessment:** Locations requiring transfers to reach destinations are not penalised compared to direct services.
3. **Weather and seasonal variation:** Analysis doesn’t account for Brisbane’s climate impacts on walking distances (heat, humidity, afternoon storms) or ferry service weather cancellations.
4. **15km radius constraint:** Current analysis covers inner and middle-ring Brisbane. Outer suburban areas not yet assessed.
5. **River crossing approximation:** River crossings are penalised (3× distance multiplier) based on service catchment boundaries, but actual bridge locations and accessibility are not mapped. This may:
- Under-penalise locations with convenient bridge access
- Over-penalise locations where bridges exist but catchment boundaries suggest river crossing
6. **Parking analysis limitations:**
- Analysis assumes standard dwelling mix (predominantly 2-bed units) for comparison purposes
- Does not account for unbundled parking (where parking spaces are sold separately from units)
- Market demand for parking may differ from minimum requirements in specific locations
- Does not assess on-street parking availability or residential parking permit schemes
7. **Flood overlay limitations:**
- Uses current flood mapping; does not incorporate climate change projections
- Binary classification (flood-affected or not) doesn’t capture severity gradient
- Does not assess flood mitigation measures (levees, pump stations, elevated access) that may reduce practical impact
- Some flood-affected sites may still be developable with appropriate engineering; overlay flags constraint, not prohibition
8. **Environmental overlay limitations:**
- Does not consider other mapped environmental conservation values beyond CN/OS/SR zoning
- Development is not proposed where contrary to conservation values; the tool excludes these areas for completeness

**Assumptions requiring validation:**

- CityCat terminals treated equivalently to train stations for catchment purposes (800m) based on infrastructure permanence and market behaviour; this may overstate ferry accessibility relative to rail
- Route dominance decay coefficients (0.50, 0.30, 0.20…) are informed estimates, not empirically derived
- Distance multipliers (1.3× for standard paths, 3.0× for river crossings) are simplified; actual network distances vary by location
- Busway station identification in GTFS data may be incomplete, affecting catchment assignments

## Comparison to other PTAL methodologies

**Departures from Transport for London PTAL:**

- **Capacity weighting:** TfL counts services only; this methodology weights by vehicle capacity
- **Reliability adjustment:** TfL uses scheduled service; this methodology discounts by on-time performance
- **Route decay:** TfL uses simpler accessibility index; this methodology applies aggressive decay to prevent route-piling artifacts
- **Climate context:** TfL 960m rail catchment; this methodology uses 800m acknowledging Brisbane’s subtropical climate
- **Distance calculation:** TfL uses network routing; this methodology uses Euclidean distance with multiplier
- **Environmental filtering:** This methodology excludes waterways and flags flood affected grids

**Alignment with Australian practice:**

- Melbourne PTAL (used for Planning Scheme Amendment C309) uses 800m rail catchments
- This methodology’s thresholds and definitions aim for consistency with Australian TOD policy settings
- Victorian Government PTAL reforms provide comparison framework for parking recommendations

## Map overlay system

The tool provides four optional overlays that can be toggled independently:

**Height mismatch (red borders):**

- Shows PTAL 4A/4B cells where current maximum heights are below recommended minimums
- PTAL 4B cells with <16 storeys maximum (unlimited height recommended)
- PTAL 4A cells with <16 storeys maximum (16-30 storeys recommended)
- Indicates locations where planning rules prevent density despite excellent transit
  
  **Transit gaps (purple borders):**
- Shows PTAL 1-2 cells zoned for medium-density or higher
- Indicates car-dependent high-density zoning that generates traffic congestion
- Flags locations where transit should be upgraded or zoning reduced

**Parking mismatch (gold diagonal hatch):**

- Shows cells where PTAL-recommended parking rates are lower than current BCC requirements
- Indicates where excessive parking requirements inflate housing costs despite good transit access
- Intensity reflects magnitude of excess parking requirement

**Flood constraints (blue diagonal hatch):**

- Shows cells intersecting with likely flood affected areas
- Indicates where flood risk adds development complexity
- Does not mean development is impossible, but flags additional constraints

**Green open space (no fill):**

- Excludes cells zoned for conservation, open space, sports and recreation, rural

Overlays can be combined to identify compound constraints (e.g., high-PETAL locations with both height restrictions and flood planning areas).

## Future development

Improvements under consideration:

- **Bridge-aware routing:** Map pedestrian bridge locations for accurate river crossing accessibility
- **Expanded coverage:** Extend radius to cover whole of Brisbane LGA
- **Off-peak analysis:** Separate PETAL scores for interpeak, evening, and weekend service
- **Destination-based assessment:** Weight services by employment/education accessibility
- **Crowding adjustments:** Incorporate passenger load data where available
- **Scenario testing:** Model accessibility impacts of proposed infrastructure (e.g., Brisbane Metro, Cross River Rail, G:link extensions)
- **Active transport:** Overlay accessibility of active transport corridors
- **Usability enhancements:** Improve accessibility for vision impaired and colourblind users

## Technical implementation

**Backend processing:**

- **Language:** Python 3.9+
- **Core libraries:**
  - `geopandas` - Spatial data operations and geometric processing
  - `pandas` - GTFS data processing and tabular analysis
  - `shapely` - Geometric operations (Point, Polygon, LineString)
  - `pyproj` - Coordinate system transformations (WGS84 ↔ GDA2020/MGA56)
- **Data sources:** Direct GTFS CSV parsing (no specialized transit libraries)
- **Grid generation:** True 100m × 100m squares using projected CRS (EPSG:7856), transformed to geographic CRS (EPSG:4326) for web delivery
- **Distance calculation:** Euclidean distance with network multipliers (1.3× standard, 3.0× river crossing)
- **Output format:** Single GeoJSON file (~40MB uncompressed, ~4.5MB gzipped)

**Frontend:**

- **Hosting:** GitHub Pages (static hosting)
- **Map library:** Leaflet 1.9.4 with efficient GeoJSON rendering
- **Data delivery:** Single compressed GeoJSON (no tiling required for current dataset size)
- **Interactivity:** Client-side filtering and overlay toggling

**Code availability:**

- Full methodology and calculation scripts available in the project repository
- Repository: https://github.com/brisbane-ptal/explorer

**Performance characteristics:**

- Grid cells: ~65,000 (after filtering to LGA catchments)
- Processing time: ~20 minutes on standard hardware
- Browser loading: <2 seconds for initial map render
- Memory footprint: ~60MB uncompressed, ~5MB compressed

## Attribution and contact

This analysis was developed by a Brisbane-based designer and urban planning analyst as an independent research project.

The methodology is offered for public use and critique. Corrections, suggestions, and data quality feedback are welcomed.

For methodology questions, data corrections, or collaboration inquiries: brisbanepetal@gmail.com with subject line ‘PTAL Explorer’

## Acknowledgements

- Transport for London for original PTAL methodology development
- TransLink Queensland for open GTFS data
- Brisbane City Council, City of Gold Coast for GIS data availability
- OpenStreetMap contributors (service catchment geometry based on OSM-derived boundaries)

-----

## Version history

- **v0.9 (February 2026):**
  - Multi-region support (Brisbane + Gold Coast), G:link capacity calibrated (5.0× with standing credit), separate directional decay
  - Expanded coverage to 15km radius
  - Added FPA1 river zone filtering (pure water, no land)
  - Added Green Space (CN/OS/SR Zones) filtering
  - Improved height mismatch detection using PETAL bands
  - Added parking mismatch boolean field
  - Amended faulty logic which was supressing 800m catchments for busway stations
  - ~65,000 cells after filtering (vs ~30,000 at 10km)
- **v0.8 (January 2026):**
  - Expanded coverage to 10km radius
  - Added parking rate analysis and recommendations
  - Added flood planning area overlays (FPA1-3)
  - Refined PETAL 4A/4B threshold (capacity-based split)
  - Implemented true 100m × 100m grid squares using projected CRS
- **v0.1 (January 2026):** Initial methodology documentation

## Licence

CC-BY-4.0
