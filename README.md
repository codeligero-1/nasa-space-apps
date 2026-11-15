# VITAL

## 🚀 Quick Start / Deployment Status

### Current Live Deployment
- **Frontend (GitHub Pages)**: https://ohnathani.github.io/vitals-app/
- **Backend API (Supabase Edge Functions)**
- **Database**: Supabase (PostgreSQL)

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla ES Modules (HTML/CSS/JS), deployed to GitHub Pages |
| **Backend** | Supabase Edge Functions (Deno runtime) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Auth** | Supabase Auth (email/password, magic links) |
| **AI** | Hardcoded responses (offline-first) + NVIDIA NIM ready |

### Local Development
```bash
# Clone & install
cd backend
npm install

# Start dev server (serves backend/public/)
npm run dev

# Or serve static files directly
npx serve backend/public -p 3000
```

### Deploy Frontend (GitHub Pages)
```bash
# Auto-deploys on push to main via GitHub Actions
# Workflow: .github/workflows/deploy-pages.yml
# Copies backend/public/ → GitHub Pages
```

### Deploy Backend (Supabase Edge Functions)
```bash
# Install Supabase CLI
npm i -g supabase

# Login & link (one-time)
supabase login
supabase link --project-ref bkfhlqdlzcifsccjubvy

# Set secrets
supabase secrets set NVIDIA_API_KEY=xxx NVIDIA_NIM_API_URL=https://integrate.api.nvidia.com/v1

# Deploy function
supabase functions deploy ai-chat
```

### AI Chat (PET AI)
- **Mode**: Hardcoded responses (works 100% offline, no API keys needed)
- **Triggers**: Exact match on 5 suggested queries + keyword fallback + metric name lookup
- **Suggested queries**:
  1. "Explain my hemoglobin"
  2. "Summarize my health"
  3. "Any warnings?"
  4. "What tests next?"
  5. "What should I monitor?"

---

## Repository Guide

- [`agents/`](agents/README.md) — role-specific identity documents for Agent 1 and Agent 2.
- [`project/`](project/README.md) — shared requirements, architecture, planning, review, and decision records.

Application source and tests will be added under a dedicated source/test structure after the project requirements are approved.

# Astronaut Health Monitoring and Radiation Analysis System
## System Architecture, Relational Database Schema, and Operational Plan

**Document Status:** Version 2.0 (Aligned with System Database Schema & Data Dictionary)  
**System Lead:** None
**Working Concept:** A robotics-assisted spaceflight health monitoring and radiation analysis platform that acquires blood telemetry, vital signs, physical dosimetry, and biological damage markers; validates data against personalized preflight Earth baselines; flags critical clinical anomalies; and synchronizes edge-processed telemetry with central mission control databases.

---

## 1. Project Overview and System Boundaries

### 1.1 Purpose and Scope
The Astronaut Health Monitoring and Radiation Analysis System is an offline-first, edge-deployable software platform designed to monitor long-duration spaceflight crews during deep-space operations. The platform integrates autonomous robotic blood sample processing, continuous bio-telemetry ingestion, physical radiation dosimeter logging, and cytogenetic biodosimetry.

The primary operational capabilities of the system include:
1. Ingesting multi-channel telemetry from calibrated laboratory hardware, wearable physiological sensors, and personal physical radiation dosimeters.
2. Normalizing and validating collected data streams against clinical unit standards and hardware calibration constraints.
3. Maintaining a strict separation between physical radiation exposure readings and biological cellular damage indicators.
4. Comparing real-time in-flight metrics against an astronaut's personalized preflight Earth baseline across 5 longitudinal checkpoints ($T-365$ days through $T-7$ days prior to launch).
5. Executing an automated clinical decision engine to detect multi-parameter physiological anomalies and radiation breaches.
6. Triggering emergency countermeasures, clinical isolation protocols, and specialized follow-up diagnostic workflows.
7. Generating structured medical summary reports and serializing encrypted data payloads for local SQLite storage and remote Mission Control database synchronization.

### 1.2 Core Scientific Principle: Evidence Stream Separation
A foundational requirement of the system architecture is the strict isolation of physical exposure measurement from biological response assessment:
* **Physical Dosimetry:** Represents direct physical energy deposition measured in millisieverts ($\text{mSv}$) or milligray ($\text{mGy}$) by calibrated hardware dosimeters (such as personal active dosimeters or cabin background monitors).
* **Biological Biodosimetry:** Represents biological cellular damage and genetic stress response resulting from ionizing radiation, measured via blood cytogenetic markers (such as Gamma-H2AX chromatin foci, dicentric chromosome aberrations, and micronuclei frequencies).

Physical exposure levels and biological cellular damage provide complementary, non-interchangeable clinical evidence vectors. The system database stores physical readings and biological assays in separate relational tables to prevent unvalidated blood parameters from being incorrectly stored as direct physical dosimeter values.

### 1.3 Intended Use and Safety Boundaries
The software functions as a clinical decision-support system and autonomous health monitoring pipeline. While the rules-based engine automates threshold detection, critical clinical actions (such as radioprotective drug administration, medical isolation, or mission abort recommendations) require verification by the mission Flight Surgeon or authorized medical personnel when communication latency permits.

---

## 2. System Architecture and Data Pipeline

The platform uses a modular, edge-to-cloud architecture designed to operate reliably in bandwidth-constrained or disconnected deep-space flight environments.

### 2.1 End-to-End Data Flow Sequence
1. **Robotic & Hardware Acquisition:** Microfluidic blood handling hardware, wearable vitals sensors, and physical dosimeters capture physical samples and raw telemetry.
2. **Device Gateway & Validation Layer:** Incoming telemetry streams are verified for units, sensor bounds, and active calibration status.
3. **Local Edge Database Storage:** Validated records are logged directly into an offline-first SQLite database (`astronaut-space-anomalies.db`) on spacecraft hardware.
4. **Analytical Comparison Engine:** The local processor computes deltas between in-flight telemetry and preflight Earth baselines.
5. **Clinical Decision Engine:** Algorithms evaluate 27 medical parameters against warning and critical thresholds, as well as 6 emergency rules.
6. **Local Event Logging & Alerts:** Detected breaches are written to an encrypted audit log and surfaced on local crew dashboards.
7. **Payload Synchronization:** Formatted JSON data packages sync to central Mission Control databases (such as PostgreSQL) when communication links are online.

### 2.2 Hardware Interface Layer
* **Robotic Sample Processing Unit:** Ingests capillary or venous blood micro-samples, executing automated microfluidic preparation and differential cell counting.
* **Bio-Telemetry Gateway:** Ingests continuous vital signs (Heart Rate, Dual-Channel Blood Pressure, $\text{SpO}_2$, Core Temperature, Heart Rate Variability) via low-power local wireless protocols.
* **Dosimeter Adapter Module:** Reads personal active dosimeters and environmental cabin sensors, recording physical dose rate ($\text{mSv/day}$) and integrated cumulative dose ($\text{mSv}$).

### 2.3 Dual-Database Synchronization Architecture
To guarantee data availability during communication blackouts, the system implements a multi-tier database structure:
* **Local Edge Database (SQLite):** An embedded, zero-configuration database (`astronaut-space-anomalies.db`) residing directly on spacecraft hardware. It logs continuous high-frequency telemetry, local patient histories, and emergency flags without requiring internet or external network connectivity.
* **Payload Serialization Service:** Formats verified telemetry, clinical flags, and diagnostic reports into lightweight, encrypted JSON data packets.
* **Central Mission Control Database:** A server-class relational database (such as PostgreSQL) situated at Mission Control. It receives synchronized JSON payloads during active telemetry windows to update terrestrial mission dashboards and crew health archives.

---

## 3. Verified Medical Parameter Taxonomy

The system monitors 27 clinical parameters grouped into 5 functional categories. Each parameter is bound to clinical reference intervals established during preflight Earth baseline evaluations.

The table below details the 27 validated parameters, their standardized clinical units, reference bounds, and clinical significance.

| Category | Parameter Name | Standard Unit | Normal Range | Warning Band | Critical Threshold | Clinical Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vital Signs** | Heart Rate | $\text{bpm}$ | $60.0 - 100.0$ | $<50.0 \text{ or } >110.0$ | $<40.0 \text{ or } >130.0$ | Resting cardiac frequency under nominal gravity. |
| **Vital Signs** | Systolic Blood Pressure | $\text{mmHg}$ | $90.0 - 120.0$ | $<85.0 \text{ or } >135.0$ | $<75.0 \text{ or } >160.0$ | Peak arterial pressure during ventricular contraction. |
| **Vital Signs** | Diastolic Blood Pressure | $\text{mmHg}$ | $60.0 - 80.0$ | $<55.0 \text{ or } >90.0$ | $<45.0 \text{ or } >105.0$ | Resting arterial pressure between contractions. |
| **Vital Signs** | $\text{SpO}_2$ Oxygen Saturation | $\%$ | $95.0 - 100.0$ | $<92.0$ | $<88.0$ | Peripheral capillary hemoglobin oxygen saturation. |
| **Vital Signs** | Core Body Temperature | $^\circ\text{C}$ | $36.1 - 37.2$ | $<35.5 \text{ or } >37.8$ | $<35.0 \text{ or } >39.0$ | Systemic thermal equilibrium state. |
| **Vital Signs** | Heart Rate Variability (HRV) | $\text{ms}$ | $40.0 - 100.0$ | $<25.0 \text{ or } >120.0$ | $<15.0 \text{ or } >150.0$ | Autonomic nervous system balance (RMSSD metric). |
| **Vital Signs** | Respiratory Rate | $\text{bpm}$ | $12.0 - 20.0$ | $<10.0 \text{ or } >24.0$ | $<8.0 \text{ or } >30.0$ | Ventilatory cycle frequency. |
| **Blood Analysis** | Red Blood Cell Count (RBC) | $10^6/\mu\text{L}$ | $4.30 - 5.90$ | $<3.80 \text{ or } >6.30$ | $<3.20 \text{ or } >7.00$ | Erythrocyte density for systemic oxygen transport. |
| **Blood Analysis** | White Blood Cell Count (WBC) | $10^3/\mu\text{L}$ | $4.50 - 11.00$ | $<3.50 \text{ or } >13.00$ | $<2.50 \text{ or } >18.00$ | Leukocyte density for systemic immune defense. |
| **Blood Analysis** | Hemoglobin (HGB) | $\text{g/dL}$ | $13.8 - 17.2$ | $<12.0 \text{ or } >18.0$ | $<10.0 \text{ or } >20.0$ | Metalloprotein oxygen-carrying capacity. |
| **Blood Analysis** | Hematocrit (HCT) | $\%$ | $40.0 - 50.0$ | $<36.0 \text{ or } >54.0$ | $<30.0 \text{ or } >60.0$ | Volumetric proportion of red blood cells. |
| **Blood Analysis** | Platelet Count (PLT) | $10^3/\mu\text{L}$ | $150.0 - 450.0$ | $<100.0 \text{ or } >500.0$ | $<50.0 \text{ or } >700.0$ | Thrombocyte density for coagulation and hemostasis. |
| **Blood Analysis** | Neutrophils | $\%$ | $40.0 - 70.0$ | $<30.0 \text{ or } >75.0$ | $<20.0 \text{ or } >85.0$ | Primary phagocytic granulocyte line. |
| **Blood Analysis** | Lymphocytes | $\%$ | $20.0 - 40.0$ | $<15.0 \text{ or } >45.0$ | $<10.0 \text{ or } >55.0$ | Adaptive immune T/B cell population. |
| **Blood Analysis** | Monocytes | $\%$ | $2.0 - 8.0$ | $<1.0 \text{ or } >11.0$ | $<0.5 \text{ or } >15.0$ | Macrophage precursor cell population. |
| **Blood Analysis** | Eosinophils | $\%$ | $1.0 - 4.0$ | $<0.5 \text{ or } >6.0$ | $<0.0 \text{ or } >10.0$ | Granulocyte line for parasitic/allergic response. |
| **Blood Analysis** | Basophils | $\%$ | $0.5 - 1.0$ | $<0.2 \text{ or } >2.0$ | $<0.0 \text{ or } >4.0$ | Histamine-releasing inflammatory leukocyte subclass. |
| **Blood Analysis** | Immature Granulocytes | $\%$ | $0.0 - 0.5$ | $>1.5$ | $>4.0$ | Promyelocyte, myelocyte, metamyelocyte precursors. |
| **Blood Analysis** | Erythroblasts | $\%$ | $0.0 - 0.1$ | $>0.5$ | $>2.0$ | Nucleated RBC precursors (abnormal in peripheral blood). |
| **Biomarkers** | C-Reactive Protein (CRP) | $\text{mg/L}$ | $0.00 - 3.00$ | $>3.00$ | $>10.00$ | Acute-phase hepatic inflammatory protein. |
| **Biomarkers** | Ferritin | $\text{ng/mL}$ | $30.0 - 300.0$ | $<15.0 \text{ or } >400.0$ | $<10.0 \text{ or } >800.0$ | Intracellular iron storage reserve biomarker. |
| **Biomarkers** | Interleukin-6 (IL-6) | $\text{pg/mL}$ | $0.00 - 5.00$ | $>5.00$ | $>15.00$ | Pro-inflammatory cytokine cascade indicator. |
| **Biomarkers** | Cortisol | $\mu\text{g/dL}$ | $6.0 - 23.0$ | $<4.0 \text{ or } >28.0$ | $<2.0 \text{ or } >40.0$ | Glucocorticoid stress response marker. |
| **Biomarkers** | Troponin-I | $\text{ng/mL}$ | $0.000 - 0.040$ | $>0.040$ | $>0.150$ | High-sensitivity myocardial injury biomarker. |
| **Biomarkers** | Serum Sodium ($\text{Na}^+$) | $\text{mEq/L}$ | $135.0 - 145.0$ | $<130.0 \text{ or } >150.0$ | $<125.0 \text{ or } >155.0$ | Extracellular fluid electrolyte balance. |
| **Biomarkers** | Serum Potassium ($\text{K}^+$) | $\text{mEq/L}$ | $3.50 - 5.00$ | $<3.20 \text{ or } >5.30$ | $<2.80 \text{ or } >6.00$ | Cardiac intracellular electrolyte balance. |
| **Physical Dosimetry** | Daily Physical Exposure | $\text{mSv/day}$ | $0.50 - 2.00$ | $>5.00$ | $>50.00$ | Active hardware radiation dosimeter exposure rate. |
| **Physical Dosimetry** | Cumulative Mission Dose | $\text{mSv}$ | $0.0 - 200.0$ | $>300.0$ | $>500.0$ | Integrated total physical ionizing radiation dose. |
| **Physical Dosimetry** | Cabin Background Rate | $\text{mGy}$ | $0.01 - 0.05$ | $>0.20$ | $>1.00$ | Ambient environmental radiation rate. |
| **Biodosimetry** | Gamma-H2AX Foci | $\text{foci/cell}$ | $0.05 - 0.20$ | $>0.50$ | $>2.00$ | Double-strand DNA break chromatin foci count. |
| **Biodosimetry** | Dicentric Chromosomes | $/1000\text{ cells}$ | $0.50 - 1.50$ | $>4.00$ | $>10.00$ | Cytogenetic radiation-specific chromosome aberrations. |
| **Biodosimetry** | Micronuclei Frequency | $/1000\text{ cells}$ | $2.00 - 10.00$ | $>20.00$ | $>40.00$ | Chromosomal loss/breakage event frequency. |
| **Biodosimetry** | DNA Repair Capacity | $\%$ | $80.0 - 100.0$ | $<65.0$ | $<50.0$ | Enzymatic DNA repair functional efficiency. |

---

## 4. Relational Database Schema Specification

The software database layout consists of 7 relational tables implemented in SQLite (`astronaut-space-anomalies.db`).

### Table 1: `astronauts` (Crew Demographics & Baseline Metadata)
Stores astronaut profile records, mission assignments, and baseline facility references.

```sql
CREATE TABLE IF NOT EXISTS astronauts (
    astronaut_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female')),
    role TEXT NOT NULL,
    mission_code TEXT NOT NULL,
    assigned_spacecraft TEXT NOT NULL,
    preflight_status TEXT NOT NULL,
    earth_baseline_facility TEXT NOT NULL,
    blood_type TEXT NOT NULL
);
```

### Table 2: `reference_parameter_ranges` (Clinical Threshold Definitions)
Defines the authoritative reference bounds and safety limits for all 27 parameters.

```sql
CREATE TABLE IF NOT EXISTS reference_parameter_ranges (
    parameter_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    parameter_name TEXT NOT NULL UNIQUE,
    standard_unit TEXT NOT NULL,
    min_normal REAL NOT NULL,
    max_normal REAL NOT NULL,
    warning_low REAL,
    warning_high REAL,
    critical_low REAL,
    critical_high REAL,
    clinical_description TEXT NOT NULL
);
```

### Table 3: `space_vitals` (In-Flight Physiological Telemetry)
Logs physiological vital signs across in-flight mission checkpoints.

```sql
CREATE TABLE IF NOT EXISTS space_vitals (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronaut_id TEXT NOT NULL,
    flight_day TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    heart_rate_bpm REAL NOT NULL,
    blood_pressure_sys_mmHg REAL NOT NULL,
    blood_pressure_dia_mmHg REAL NOT NULL,
    spo2_percent REAL NOT NULL,
    body_temp_celsius REAL NOT NULL,
    hrv_ms REAL NOT NULL,
    respiratory_rate_bpm REAL NOT NULL,
    health_status_flag TEXT NOT NULL DEFAULT 'NOMINAL',
    FOREIGN KEY (astronaut_id) REFERENCES astronauts (astronaut_id)
);
```

### Table 4: `space_blood` (CBC & 8-Part Differential Panel)
Stores complete blood counts and differential blood cell fractions.

```sql
CREATE TABLE IF NOT EXISTS space_blood (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronaut_id TEXT NOT NULL,
    flight_day TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    rbc_count_m_ul REAL NOT NULL,
    wbc_count_k_ul REAL NOT NULL,
    hemoglobin_g_dl REAL NOT NULL,
    hematocrit_percent REAL NOT NULL,
    platelet_count_k_ul REAL NOT NULL,
    neutrophils_percent REAL NOT NULL,
    eosinophils_percent REAL NOT NULL,
    basophils_percent REAL NOT NULL,
    lymphocytes_percent REAL NOT NULL,
    monocytes_percent REAL NOT NULL,
    immature_granulocytes_percent REAL NOT NULL,
    erythroblasts_percent REAL NOT NULL DEFAULT 0.0,
    platelets_morphology_status TEXT NOT NULL DEFAULT 'NORMAL',
    FOREIGN KEY (astronaut_id) REFERENCES astronauts (astronaut_id)
);
```

### Table 5: `space_biomarkers` (Inflammatory & Cardiac Assays)
Tracks inflammatory cytokines, cardiac stress proteins, and electrolyte levels.

```sql
CREATE TABLE IF NOT EXISTS space_biomarkers (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronaut_id TEXT NOT NULL,
    flight_day TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    crp_mg_l REAL NOT NULL,
    ferritin_ng_ml REAL NOT NULL,
    il_6_pg_ml REAL NOT NULL,
    tnf_alpha_pg_ml REAL NOT NULL,
    cortisol_ug_dl REAL NOT NULL,
    troponin_i_ng_ml REAL NOT NULL,
    sodium_mEq_l REAL NOT NULL,
    potassium_mEq_l REAL NOT NULL,
    inflammatory_status TEXT NOT NULL DEFAULT 'NOMINAL',
    FOREIGN KEY (astronaut_id) REFERENCES astronauts (astronaut_id)
);
```

### Table 6: `space_radiation_biodose` (Physical Exposure & Biodosimetry)
Maintains physical dosimeter logs alongside biological chromosome aberration measurements.

```sql
CREATE TABLE IF NOT EXISTS space_radiation_biodose (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronaut_id TEXT NOT NULL,
    flight_day TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    physical_dosimeter_daily_dose_mSv REAL NOT NULL,
    cumulative_mission_dose_mSv REAL NOT NULL,
    background_location_radiation_mGy REAL NOT NULL,
    gamma_h2ax_foci_per_cell REAL NOT NULL,
    dicentric_chromosomes_per_1000_cells REAL NOT NULL,
    micronuclei_frequency_per_1000_cells REAL NOT NULL,
    dna_repair_capacity_percent REAL NOT NULL,
    radiation_risk_level TEXT NOT NULL DEFAULT 'NOMINAL',
    FOREIGN KEY (astronaut_id) REFERENCES astronauts (astronaut_id)
);
```

### Table 7: `clinical_anomaly_events` (Emergency Event & Trigger Audit Log)
Logs detected threshold breaches, severity classifications, and assigned countermeasures.

```sql
CREATE TABLE IF NOT EXISTS clinical_anomaly_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronaut_id TEXT NOT NULL,
    flight_day TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    anomaly_type TEXT NOT NULL,
    primary_trigger_parameter TEXT NOT NULL,
    observed_value REAL NOT NULL,
    threshold_limit REAL NOT NULL,
    unit TEXT NOT NULL,
    severity_level TEXT NOT NULL CHECK (severity_level IN ('WARNING', 'CRITICAL_ALERT')),
    recommended_action TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'OPEN_UNRESOLVED',
    FOREIGN KEY (astronaut_id) REFERENCES astronauts (astronaut_id)
);
```

---

## 5. Automated Clinical Decision Rules & Emergency Protocols

The decision engine evaluates telemetry streams against 6 clinical anomaly protocols.

### Protocol 1: Acute Solar Particle Event (SPE) Radiation Breach
* **Trigger Conditions:** Physical daily dose $>50.0 \text{ mSv/day}$ AND Gamma-H2AX foci $>2.0 \text{ foci/cell}$ AND Dicentric Chromosomes $>10.0 \text{ per 1,000 cells}$.
* **Secondary Physiological Impact:** Acute leukopenia/lymphopenia ($\text{WBC} <2.5 \times 10^3/\mu\text{L}$).
* **Automated Action:** Triggers immediate solar storm shelter retreat, halts Extravehicular Activities (EVA), orders radioprotective antioxidant administration, and alerts Flight Surgeon.

### Protocol 2: Spaceflight Hypoxic Anemia
* **Trigger Conditions:** Hemoglobin $<10.0 \text{ g/dL}$ AND Hematocrit $<30.0\%$ AND $\text{SpO}_2 <92.0\%$.
* **Secondary Physiological Impact:** Compensatory resting tachycardia ($\text{HR} >110 \text{ bpm}$) and presence of nucleated erythroblasts ($>0.5\%$).
* **Automated Action:** Triggers supplemental oxygen administration, initiates erythropoietin (EPO) and iron therapy protocol, and restricts physical exercise loads.

### Protocol 3: In-Flight Systemic Infection / Septic Alert
* **Trigger Conditions:** Core Body Temperature $>38.5^\circ\text{C}$ AND WBC $>15.0 \times 10^3/\mu\text{L}$ AND CRP $>10.0 \text{ mg/L}$.
* **Secondary Physiological Impact:** Immature granulocyte left-shift ($>1.5\%$) and arterial hypotension ($\text{BP Sys} <85 \text{ mmHg}$).
* **Automated Action:** Initiates crew quarter medical isolation, orders broad-spectrum IV antibiotic therapy, and starts continuous hemodynamic monitoring.

### Protocol 4: Hypertensive Crisis & Myocardial Strain
* **Trigger Conditions:** Systolic Blood Pressure $>160.0 \text{ mmHg}$ AND Troponin-I $>0.150 \text{ ng/mL}$.
* **Secondary Physiological Impact:** HRV degradation ($\text{HRV} <20 \text{ ms}$).
* **Automated Action:** Orders immediate tele-ECG recording, initiates antihypertensive administration, and enforces strict physical rest.

### Protocol 5: Chromosomal Damage & DNA Repair Failure
* **Trigger Conditions:** Dicentric Chromosomes $>7.0 \text{ per 1,000 cells}$ AND DNA Repair Capacity $<55.0\%$.
* **Secondary Physiological Impact:** Elevated Micronuclei frequency ($>25.0 \text{ per 1,000 cells}$).
* **Automated Action:** Administers DNA repair co-factor supplements, updates crew lifetime radiation risk assessments, and flags patient for post-mission oncogenic surveillance.

### Protocol 6: Combined Radiation & Bone Marrow Suppression
* **Trigger Conditions:** Physical daily dose $>20.0 \text{ mSv/day}$ AND WBC $<2.5 \times 10^3/\mu\text{L}$ AND Platelet Count $<90.0 \times 10^3/\mu\text{L}$.
* **Secondary Physiological Impact:** Multi-line bicytopenia and elevated bleeding risk.
* **Automated Action:** Directs crew member to radiation-shielded quarters, initiates granulocyte colony-stimulating factor (G-CSF) protocol, and logs emergency priority escalation.

---

## 6. Longitudinal Evaluation Checkpoints

To track astronaut health adaptations across spaceflight, telemetry is indexed against 10 evaluation milestones divided into two distinct operational phases:

### Phase A: Preflight Earth Baseline Checkpoints
* **$T-365$ Days:** Initial baseline screening establishing non-zero normal physiological reference points.
* **$T-180$ Days:** Mid-training health screening and physical fitness evaluation.
* **$T-90$ Days:** Advanced baseline profiling including comprehensive cytogenetic analysis.
* **$T-30$ Days:** Pre-launch quarantine entry baseline check.
* **$T-7$ Days:** Final pre-launch Earth baseline validation prior to orbital insertion.

### Phase B: In-Flight Mission Checkpoints
* **Flight Day 7 ($\text{FD7}$):** Microgravity acute fluid shift and space motion adaptation assessment.
* **Flight Day 30 ($\text{FD30}$):** Initial monthly in-flight hematology and radiation check.
* **Flight Day 90 ($\text{FD90}$):** Quarterly deep-space radiation accumulation and erythropoiesis check.
* **Flight Day 180 ($\text{FD180}$):** Mid-mission comprehensive health evaluation.
* **Flight Day 365 ($\text{FD365}$):** One-year long-duration mission cumulative evaluation.

---

## 7. Implementation Roadmap & Verification Plan

### Phase 1: Database Setup & Infrastructure (Completed)
* Instantiated SQLite relational schemas (`astronaut-earth-baseline.db`, `astronaut-space-anomalies.db`).
* Built Excel workbooks (`astronaut_space_anomalies_data.xlsx`) containing baseline reference limits and 250 test evaluation records.

### Phase 2: Input Validation Engine
* Develop unit-conversion and boundary-checking modules in Python using `pydantic`.
* Ensure missing units, out-of-range sensor spikes, or uncalibrated readings trigger validation flags before database entry.

### Phase 3: Anomaly Engine Verification
* Implement Python automated testing scripts to process `space_vitals`, `space_blood`, `space_biomarkers`, and `space_radiation_biodose` records against the 6 emergency rules.
* Confirm that simulated SPE breaches and septic events generate entries in `clinical_anomaly_events`.

### Phase 4: Payload Serialization & Remote Sync
* Implement JSON serialization routines to package new local SQLite database records into encrypted payloads.
* Test payload ingestion endpoints against simulated Mission Control database interfaces.
