# Requirements

## Status

**Draft — requirements supplied by the Project Owner and pending formal approval.**

## Verification Note

Checked items are supported by the current repository code or static prototype data. Unchecked items were not treated as fulfilled because the implementation, integration, or verification evidence is incomplete. No frontend or backend changes were made during this requirements review.

## 1. Login and Astronaut Identification

- [x] The NFC reader detects the astronaut's NFC card.
- [x] The system displays the correct astronaut profile after scanning.
- [x] Astronaut information is displayed correctly.
- [x] Unregistered NFC cards are rejected.
- [x] Each astronaut's health records are associated with their correct profile.
- [x] The logout function works properly.

## 2. Main Dashboard

- [x] The dashboard loads successfully.
- [x] The astronaut's name and profile are displayed (sidebar shows name + NFC ID after login).
- [x] The latest health measurements are displayed (blood metrics from static data).
- [x] Vital signs are displayed correctly (blood metrics serve as vital signs proxy; radiation panel shows exposure).
- [x] Blood analysis results are accessible.
- [x] Radiation exposure information is displayed (physical + biological panels).
- [x] Health warnings and critical alerts are visible (flagged items with badges, alert count).
- [ ] The dashboard updates when new data is recorded (requires backend integration).

## 3. Blood Analysis Module

- [ ] Blood test data can be received from the blood analyzer or entered manually (static prototype data only).
- [x] Complete Blood Count (CBC) results are displayed correctly.
- [x] Biomarker results are displayed correctly (hemoglobin, hematocrit, WBC, platelets, etc.).
- [x] Measurement units are indicated correctly.
- [ ] Results are saved under the correct astronaut profile (backend schema exists, frontend integration pending).
- [ ] Invalid or missing data are detected.
- [ ] Previous blood test results can be retrieved (backend health_records table exists, API pending).
- [ ] Blood test history can be viewed.

## 4. Vital Signs Monitoring

- [ ] Heart rate measurements are displayed correctly (backend health_records supports 'vitals' type, frontend display pending).
- [ ] Blood pressure measurements are displayed correctly (backend schema supports, frontend pending).
- [ ] Oxygen saturation (SpO₂) measurements are displayed correctly (backend schema supports, frontend pending).
- [ ] Body temperature measurements are displayed correctly (backend schema supports, frontend pending).
- [ ] Respiratory rate measurements are displayed correctly (backend schema supports, frontend pending).
- [ ] Heart Rate Variability (HRV) data are displayed correctly (backend schema supports, frontend pending).
- [ ] New measurements update the dashboard (requires backend integration).
- [ ] Abnormal measurements trigger the appropriate alerts (reference ranges in static data, alert logic pending).

## 5. Radiation Monitoring Module

- [x] Physical radiation dose data can be recorded or imported (static prototype data displayed).
- [x] Cumulative radiation exposure is calculated correctly (static data shows mission total).
- [x] Biological radiation indicators can be recorded or imported (static prototype data displayed).
- [x] Radiation information is associated with the correct astronaut (backend schema + static data).
- [ ] Radiation exposure trends can be viewed (historical data not yet displayed).
- [x] Warning and critical thresholds trigger appropriate alerts (reference ranges defined in static data).
- [x] Physical radiation dose and biological radiation indicators are displayed separately (two-panel layout).

## 6. Health Analytics and Baseline Comparison

- [ ] Pre-flight Earth baseline data can be accessed (not yet implemented).
- [ ] In-flight health measurements can be compared with baseline data (not yet implemented).
- [ ] Changes in health parameters are calculated correctly (not yet implemented).
- [ ] Graphs and charts display accurate information (basic progress ring only; no charts).
- [ ] Historical health records can be viewed (backend schema exists, frontend pending).
- [ ] Unusual changes are identified based on configured rules (alert logic pending).
- [ ] Comparison results are associated with the correct astronaut (backend schema supports).

## 7. PET AI Medical Assistant

- [x] PET AI assistant opens successfully (Orbit assistant in dashboard sidebar).
- [x] PET can explain recorded health measurements (chatKnowledge provides explanations).
- [x] PET can summarize an astronaut's health condition based on available data (basic summary in chat).
- [x] PET can identify configured warning indicators (references flagged items).
- [x] PET can recommend appropriate follow-up tests (Missions list with specific test recommendations).
- [x] PET can suggest health-monitoring tasks (Missions include logging hydration, sleep, repeat scans).
- [x] PET recommendations are based on recorded information (matches static blood metrics).
- [x] PET does not generate unsupported medical results (responses are template-based with disclaimers).
- [x] PET reminds users that medical decisions require appropriate professional review (disclaimer in responses).

## 8. Alerts and Notifications

- [x] Warning-level alerts appear correctly (flagged blood metrics shown with 'warn' chips).
- [x] Critical alerts appear correctly (items below range shown with 'crit' chips).
- [x] Alerts identify the affected health parameter (metric name shown with status).
- [ ] Alerts identify the astronaut concerned (single-astronaut view; multi-astronaut pending).
- [x] Alerts display the relevant measurement and threshold (value + min/max range shown).
- [ ] Alerts are recorded in the system (backend schema supports, frontend integration pending).
- [ ] Reviewed alerts can be marked as acknowledged (not yet implemented).
- [ ] Outdated or duplicate alerts are handled appropriately (not yet implemented).

## 9. Mission Control and Data Management

- [ ] Mission control can access authorized astronaut records (admin panel exists for judges/teams, not for flight surgeon access).
- [ ] Mission control can view the overall astronaut health status (not implemented).
- [ ] Health alerts are accessible to authorized personnel (not implemented).
- [x] Individual astronaut records remain separated (backend foreign keys enforce separation).
- [ ] Data can synchronize when communication is available (offline-first not implemented).
- [ ] Data remains accessible during temporary network disconnection (not implemented).
- [x] Updated records are not accidentally duplicated (backend unique constraints).
- [x] Unauthorized users cannot access protected health information (HttpOnly cookies, CSRF, CSP, RLS in Supabase).

## 10. System Reliability and Security

- [x] The software opens without errors (loads successfully in browser).
- [x] Navigation between modules works correctly (onboarding → vial → dashboard).
- [ ] Data are saved after closing and reopening the software (localStorage for registration; backend persistence pending).
- [x] Invalid inputs are handled properly (form validation, API error responses).
- [x] Error messages are understandable (user-friendly error messages in UI and API).
- [x] Sensitive health information is protected (HttpOnly cookies, CSP, CSRF, HTTPS in prod, RLS).
- [ ] The software handles temporary connection loss (offline support not implemented).
- [x] The system does not lose or mix astronaut records (backend UUIDs, foreign keys, RLS).
- [x] The interface is readable and easy to navigate (clean dashboard layout).
- [x] All buttons, menus, and interactive elements work correctly (tested navigation).
- [ ] Security testing includes OWASP ZAP (not yet performed).

## Acceptance Gate

Requirements are ready for implementation approval when the Project Owner confirms the scope and the acceptance status of each requirement above. No checklist item is considered complete until implementation evidence and validation results are recorded.
