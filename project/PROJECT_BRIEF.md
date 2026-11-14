# Project Brief

## Status

**Prototype — the current demo includes vital signs, blood analysis, radiation monitoring, and historical comparison.**

## Project

**VITAL — Astronaut Health Monitoring.** The frontend presents vital signs, blood analysis, and radiation-monitoring measurements for a single demo profile.

## Objective

Provide crew members and flight-support personnel with an understandable view of current and historical vital signs, blood measurements, radiation indicators, and configured reference ranges.

**Evidence:** `html/index.html`, `js/app.js`, and `js/data.js`.

## Target Users

- Crew members viewing the AST-001 demo profile through the tap-to-open entry screen.
- Flight surgeons or medical personnel reviewing health results.
- Administrators monitoring enrolled crew, analyzers, samples, and flagged results.

These user groups are observed from the frontend screens and are not yet approved product requirements.

## Problem Statement

Crew health measurements need to be presented clearly without implying that the prototype diagnoses medical conditions. The dashboard emphasizes source values, configured ranges, historical comparisons, and review with a flight surgeon.

## Proposed Solution

A VITAL workflow that opens the AST-001 demo profile and presents available data from the supplied Earth-baseline database and in-flight workbook. The browser bundle contains only this profile, with no profile selector or other crew records. This is demo behavior, not a production authentication or per-user authorization system. Orbit remains available as an explanatory assistant.

## NASA Space Apps Challenge Alignment

- Challenge or prompt: _To be supplied._
- Observed domain datasets: `astronaut-earth-baseline-1.db`, `astronaut_earth_baseline_data.xlsx`, and `astronaut_space_flight_data.xlsx`.
- Dataset contents observed: astronaut profiles, CBC blood data, biomarkers, vitals, dosimetry/biodosimetry, reference ranges, and clinical decision rules.
- Current integration status: a single AST-001 demo profile with five baseline and five in-flight snapshots is bundled for the frontend; other astronaut records are not included.
- Required attribution or usage constraints: _To be supplied._

## Scope

### Observed Frontend Scope

- Tap-to-open AST-001 demo profile.
- Vital signs with configured thresholds and status indicators.
- Blood analysis summary, counts, biomarkers, differential, and reference-range status.
- Radiation exposure and biodosimetry measurements.
- Pre-flight baseline comparison, mission-day history, and trend chart.
- Orbit assistant explanations and quick questions.
- Responsive browser interface with light and dark themes.
- Responsive, accessible browser interface with reduced-motion support and light/dark themes.

The demo data is date-only; sample IDs and measurement times are not present in the supplied files. Production identity and per-user authorization are not connected.

### In Scope

- _To be agreed and recorded in `REQUIREMENTS.md`._

### Out of Scope

- _To be agreed and recorded in `REQUIREMENTS.md`._

## Milestones

| Milestone | Owner | Acceptance evidence | Status |
|---|---|---|---|
| Requirements baseline | Project Owner / Agent 2 | Approved `REQUIREMENTS.md` | Pending |
| Architecture baseline | Agent 2 | Approved `ARCHITECTURE.md` | Pending |
| Implementation | Agent 2 | Working code and tests | Pending |
| Independent review | Agent 1 | Completed `REVIEW_REPORT.md` | Pending |
| Final readiness decision | Project Owner | Completed `FINAL_REPORT.md` | Pending |

## Open Questions

1. Which NASA Space Apps challenge is being implemented?
2. Should the observed VITAL frontend behavior become the approved product scope?
3. Should `astronaut-earth-baseline-1.db` become the product data source?
4. How should the frontend connect to the current backend, which currently uses a separate judging-platform schema?
5. Which platform, framework, and deployment target are required?
6. What external APIs or datasets are authorized?
7. What is the submission deadline and definition of done?

## Evidence Policy

No requirement or implementation claim is considered approved until it is recorded in the relevant project document and supported by verifiable evidence.
