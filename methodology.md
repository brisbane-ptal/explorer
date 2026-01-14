# Brisbane Public Transport Accessibility Level (PTAL) Methodology

**Version 0.1 | January 2026**

## Purpose

This tool maps public transport accessibility across inner Brisbane using a modified Public Transport Accessibility Level (PTAL) methodology. It measures how easily residents can access frequent, reliable public transport during peak periods.

The analysis is designed to inform discussions about:
- Where housing density could be supported by existing transport infrastructure
- Which areas would benefit from transport investment to enable growth
- How planning policies align (or don't) with actual accessibility

This is an independent analytical tool, not an official planning instrument. It aims to make transport accessibility legible and comparable across Brisbane.

## What PTAL measures (and what it doesn't)

**PTAL assesses:**
- Service frequency during peak periods (7-9am weekday)
- Walking distance to stops and stations (via pedestrian network)
- Vehicle capacity and mode quality (train vs bus vs ferry)
- Service reliability based on published on-time performance

**PTAL does not assess:**
- Off-peak or weekend service quality
- Fare affordability or ticketing integration
- Destinations served or journey time to specific locations
- Crowding or passenger experience beyond capacity
- Cycling infrastructure or other transport modes
- Future planned infrastructure (only existing services)

A high PTAL score means "turn-up-and-go accessibility exists", not "this location is perfect for car-free living" (which depends on many other factors).

## Methodology overview

This analysis adapts the Transport for London PTAL methodology for Brisbane's context, with modifications for climate, network structure, and vehicle capacity.

### Key methodological choices

**1. Capacity weighting by vehicle type**

Not all services deliver equivalent accessibility. A six-car train carries 9× the seated passengers of a standard bus. The methodology weights services by actual capacity:

| Vehicle type | Seated capacity | Weight |
|--------------|-----------------|---------|
| 6-car train | 450 | 9.0× |
| Brisbane Metro | 150 | 3.0× |
| Articulated bus (CityGlider) | 75 | 1.5× |
| Standard bus | 50 | 1.0× (baseline) |
| CityCat | 170 | 3.4× |
| KittyCat | 60 | 1.2× |

*Source: Published vehicle specifications from TransLink and manufacturers.*

**Rationale:** A location served by 10 buses per hour is not equivalent to one served by 10 trains per hour. Capacity weighting reflects actual people-moving capability.

**2. Reliability adjustments**

Service frequency is adjusted by mode-specific on-time performance:

| Mode | Reliability factor | Basis |
|------|-------------------|--------|
| Heavy rail | 0.95 | ~95% on-time (TransLink performance data) |
| Busway | 0.90 | ~90% on-time (dedicated infrastructure, some traffic interaction) |
| Bus | 0.85 | ~85% on-time (mixed traffic) |
| Ferry | 0.95 | Similar to rail (dedicated corridor, weather impacts minor in peak) |

*Source: TransLink quarterly performance reports, 2023-2024 averages.*

**Rationale:** Scheduled frequency overstates accessibility if services are frequently delayed. A route at 85% reliability effectively operates at 85% of its scheduled frequency.

**3. Route dominance decay**

Multiple routes serving the same location provide redundancy but with diminishing returns. The methodology applies declining weight to additional routes:

| Route rank | Weight |
|------------|--------|
| 1st (best route) | 1.00 |
| 2nd | 0.50 |
| 3rd | 0.30 |
| 4th | 0.20 |
| 5th | 0.15 |
| 6th+ | 0.10 |

**Rationale:** Passengers gravitate toward the most frequent service. A second route provides backup value (weighted 50%), but ten mediocre routes do not equal one excellent route. This prevents artificial inflation where many infrequent services overlap.

**4. Bidirectional counting**

Inbound and outbound services are counted separately, as they serve different trip purposes. A location with 12 inbound and 12 outbound services per hour has genuinely better accessibility than one with 12 services in a single direction (no return journey option).

**5. Mode-specific catchments with distance decay**

Walking catchment distances reflect infrastructure permanence and observed passenger behaviour:

| Mode | Catchment | Distance decay |
|------|-----------|----------------|
| Heavy rail | 0-800m | Full credit 0-400m, declining to 30% at 800m |
| Busway stations | 0-800m | Full credit 0-400m, declining to 30% at 800m |
| CityCat terminals | 0-800m | Full credit 0-400m, declining to 30% at 800m |
| Bus stops | 0-400m | Full credit throughout |
| KittyCat stops | 0-400m | Full credit throughout |

**Rationale for 800m rail/busway catchments:**
- International PTAL methodologies consistently use larger catchments for rail (London: 960m, Melbourne: 800m, Auckland: 800m)
- Research demonstrates passengers walk approximately twice as far for high-quality service
- Brisbane development guidelines recognise 800m station catchments for Transit-Oriented Development
- Rail and busway represent permanent infrastructure with substantial passenger facilities
- Distance decay (declining to 30% at 800m) ensures proximity still matters—remote locations don't receive full credit

**Rationale for CityCat 800m catchment:**
- Ferry terminals are permanent landmarks with substantial infrastructure investment
- Cross-river accessibility is structurally valuable in a river-divided city
- CityCat terminals feature prominently in real estate marketing, demonstrating market recognition of their value
- Service operates independent of road traffic

**Network distance calculation:**
All catchments use pedestrian network distance (actual walkable paths via footpaths, crossings, and bridges) rather than straight-line distance. This accounts for barriers such as rivers, highways, and parks.

**6. PTAL band thresholds**

| Band | Threshold | Interpretation |
|------|-----------|----------------|
| PTAL 4 | ≥100 effective units/hr | Excellent accessibility; trunk infrastructure with high frequency; turn-up-and-go service |
| PTAL 3 | ≥40 effective units/hr | Good accessibility; either lower-frequency trunk OR excellent bus network |
| PTAL 2 | ≥15 effective units/hr | Basic service; single decent route or multiple infrequent routes; check timetable |
| PTAL 1 | <15 effective units/hr | Poor connectivity; car-dependent location |

Thresholds calibrated to Brisbane conditions based on sample locations with known accessibility characteristics.

## Calculation process

For each 100m × 100m grid cell:

1. Identify all stops within catchment distance (mode-specific, network distance)
2. For each stop, extract 7-9am weekday services from GTFS data
3. Calculate services per hour per route-direction
4. Apply capacity weighting based on vehicle type
5. Apply reliability adjustment based on mode
6. Apply distance decay based on walking distance
7. Calculate effective frequency for each route-direction serving the cell
8. Sort routes by effective frequency (descending)
9. Apply route dominance decay to calculate total effective capacity
10. Assign PTAL band based on threshold

**Formula:**

```
Total Effective Capacity = Σ(Services/hr × Capacity Weight × Reliability Factor × Distance Weight × Decay Factor)
```

Where decay factor depends on route rank (1st route: 1.0, 2nd: 0.5, 3rd: 0.3, etc.)

## Data sources

- **GTFS schedule data:** TransLink South East Queensland, current timetables
- **Vehicle capacity specifications:** Published by TransLink and rolling stock manufacturers
- **On-time performance:** TransLink quarterly network performance reports (2023-2024)
- **Walking network:** OpenStreetMap pedestrian network, extracted January 2025
- **Grid geometry:** 100m × 100m cells within 5km of Brisbane CBD

All data sources are publicly available.

## Limitations and assumptions

**Known limitations:**

1. **Peak-period only:** Analysis uses 7-9am weekday services. Off-peak and weekend accessibility may differ substantially.

2. **Scheduled service, not crowding:** Methodology uses scheduled capacity, not actual spare capacity. Services running at crush load provide lower effective accessibility than the calculation suggests.

3. **No destination assessment:** PTAL measures frequency and capacity, not whether services go to useful destinations. A location with frequent service to limited destinations scores higher than one with less-frequent service to many destinations.

4. **Network distance approximation:** Walking distances use OpenStreetMap network, which may not perfectly reflect actual pedestrian routes (e.g., missing informal paths, private access ways, or temporary closures).

5. **Walking surface quality not assessed:** Network distance treats all pedestrian paths as equivalent. The methodology does not account for:
   - **Gradient and topography:** Brisbane's hilly terrain means some 400m walks involve significant elevation change (e.g., Red Hill, Highgate Hill, Kangaroo Point)
   - **Surface quality:** Footpath condition, width, lighting, and weather protection vary substantially
   - **Accessibility barriers:** Stairs, steep ramps, missing kerb cuts, or narrow paths restrict access for people with mobility constraints, parents with prams, elderly residents, and wheelchair users
   - **Pedestrian amenity:** Shade, weather protection, traffic exposure, and personal safety perceptions affect actual willingness to walk

   A 400m walk on flat, shaded, well-maintained footpaths is not equivalent to a 400m walk up a steep hill on narrow, exposed paths. PTAL scores may overstate accessibility for locations with challenging pedestrian environments.

6. **Static analysis:** Results reflect current timetables and infrastructure only. Planned expansions (e.g., Cross River Rail stations) are not included.

7. **No mode interchange assessment:** Locations requiring transfers to reach destinations are not penalised compared to direct services.

8. **Weather and seasonal variation:** Analysis doesn't account for Brisbane's climate impacts on walking distances (heat, humidity, afternoon storms) or ferry service weather cancellations.

9. **5km radius constraint:** Current analysis limited to inner Brisbane. Outer areas not yet assessed.

**Assumptions requiring validation:**

- CityCat terminals treated equivalently to train stations for catchment purposes (800m) based on infrastructure permanence and market behaviour; this may overstate ferry accessibility relative to rail
- Route dominance decay coefficients (0.50, 0.30, 0.20...) are informed estimates, not empirically derived for Brisbane
- Distance decay function (linear from 400-800m) is simplified; actual willingness-to-walk likely varies by individual, weather, topography, and path quality

## Comparison to other PTAL methodologies

**Departures from Transport for London PTAL:**
- **Capacity weighting:** TfL counts services only; this methodology weights by vehicle capacity
- **Reliability adjustment:** TfL uses scheduled service; this methodology discounts by on-time performance  
- **Route decay:** TfL uses simpler accessibility index; this methodology applies aggressive decay to prevent route-piling artifacts
- **Climate context:** TfL 960m rail catchment; this methodology uses 800m acknowledging Brisbane's subtropical climate

**Alignment with Australian practice:**
- Melbourne PTAL (used for Planning Scheme Amendment C309) uses 800m rail catchments
- This methodology's thresholds and definitions aim for consistency with Australian TOD policy settings

## Future development

Potential refinements under consideration:

- **Address-level analysis:** Replace grid with cadastral parcels for planning application relevance
- **Expanded coverage:** Extend beyond 5km radius to cover Greater Brisbane
- **Off-peak analysis:** Separate PTAL scores for interpeak, evening, and weekend service
- **Destination-based assessment:** Weight services by employment/education accessibility
- **Crowding adjustments:** Incorporate passenger load data where available
- **Scenario testing:** Model accessibility impacts of proposed infrastructure (e.g., Brisbane Metro, CRR)

## Technical implementation

- **Calculation:** Python 3.12 with geopandas, pandana/OSMnx for network analysis
- **Hosting:** Static site via GitHub Pages
- **Visualisation:** Leaflet with progressive tile loading
- **Code availability:** Methodology and calculation scripts available on request for peer review

## Attribution and contact

This analysis was developed by a Brisbane-based urban planning analyst as an independent research project.

The methodology is offered for public use and critique. Corrections, suggestions, and data quality feedback are welcomed.

**Feedback:** 

**Acknowledgements:**
- Transport for London for original PTAL methodology development
- TransLink Queensland for open GTFS data
- OpenStreetMap contributors for pedestrian network data

---

**Version history:**
- v0.1 (January 2026): Initial methodology documentation

**Licence:** CC-BY-4.0 
