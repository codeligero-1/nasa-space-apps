# Project Brief

## Status

**Draft — frontend context captured; project scope and product-owner confirmation are still pending.**

## Project

**VITAL — Crew Blood Analysis.** The frontend presents a prototype for astronaut and crew health monitoring through blood-sample analysis.

## Objective

Provide crew members and flight-support personnel with an understandable view of blood-sample indicators, healthy ranges, follow-up tasks, and results that may need closer review.

**Evidence:** `html/index.html`, `js/app.js`, and `js/data.js`.

## Target Users

- Crew members using an NFC card and blood-sample analyzer.
- Flight surgeons or medical personnel reviewing health results.
- Administrators monitoring enrolled crew, analyzers, samples, and flagged results.

These user groups are observed from the frontend screens and are not yet approved product requirements.

## Problem Statement

Crew blood-analysis results need to be presented in a clear, actionable way without implying that the prototype diagnoses medical conditions. The frontend emphasizes understandable explanations, healthy ranges, follow-up missions, and confirmation with a flight surgeon.

## Proposed Solution

A VITAL workflow that supports NFC sign-in or registration, blood-sample reading, a health dashboard, an overall Orbit score, follow-up missions, and the Orbi explanatory assistant. The current frontend simulates readings and uses static data.

## NASA Space Apps Challenge Alignment

- Challenge or prompt: _To be supplied._
- Observed domain dataset: `astronaut-earth-baseline-1.db`.
- Dataset contents observed: astronaut profiles, CBC blood data, biomarkers, vitals, dosimetry/biodosimetry, reference ranges, and clinical decision rules.
- Current integration status: the dataset is present but is not connected to the current backend or frontend.
- Required attribution or usage constraints: _To be supplied._

## Scope

### Observed Frontend Scope

- NFC card sign-in and crew-card registration.
- Simulated blood-sample analyzer workflow.
- Blood metric groups for red blood cells, white blood cells, and platelets.
- Healthy-range indicators and an overall Orbit score.
- Follow-up missions with XP progression.
- Orbi assistant explanations and quick questions.
- Admin overview of crew, analyzers, samples, and flagged results.
- Responsive, accessible browser interface with reduced-motion support and light/dark themes.

These items describe the existing prototype behavior; they are not yet approved requirements.

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
