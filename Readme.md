# Brisbane PTAL Explorer

A lightweight, map-based prototype for exploring public transport accessibility in inner Brisbane using a PTAL-style methodology.

This project is an **experimental MVP** intended to test how service frequency, walk access, and mode reliability can be combined into a legible accessibility index for planning and policy discussion.

---

## Overview

The map visualises Public Transport Accessibility Levels (PTAL) across inner Brisbane using a regular grid. Each cell is assigned a PTAL score based on proximity to public transport stops and peak-period service availability.

The tool is designed to:
- Explore spatial patterns of public transport accessibility
- Explore the relationship between transport accessibility and planning controls
- Test methodological adaptations of the Victorian PTAL framework in a Brisbane context

---

## Methodology (Summary)

The current implementation is based on the Victorian PTAL framework, with local calibration:

- Equivalent Doorstep Frequency (EDF) formulation
- GTFS-derived service frequencies (AM peak, 7–9am)
- Mode-specific reliability adjustments
- Reduced walking speed and catchment distance to reflect local climate and urban conditions

This is a **work in progress** and should not be interpreted as an official or authoritative PTAL assessment.

---

## Status

- Prototype / MVP
- Read-only visualisation
- Methodology under active refinement

Future work may include:
- Expanded geographic coverage
- Finer spatial resolution (e.g. parcel-level analysis)
- Improved treatment of service reliability and route quality

---

## Data Sources

- General Transit Feed Specification (GTFS)
- Publicly available transport and planning datasets from Queensland and local government sources

All data is used for exploratory and illustrative purposes only.

---

## Disclaimer

This project is an independent exploratory tool.  
It does **not** represent the views of any government agency, authority, or organisation, and should not be used for statutory planning decisions.
Feedback and critique are welcome.

---


