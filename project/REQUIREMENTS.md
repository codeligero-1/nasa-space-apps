# Requirements

## Status

**Draft — requirements supplied by the Project Owner and pending formal approval.**

## Verification Note

Checked items are implemented in the static prototype and were verified in the browser; this is not formal acceptance or evidence of live sensor integration. Blood values are a static AST-001 snapshot copied from the supplied Earth-baseline and space-flight SQLite databases; the frontend does not query those files at runtime. Range and alert thresholds for parameters listed in the README's verified medical parameter table are configured in the dashboard. Tumor Necrosis Factor Alpha (TNF-α) appears in the app data but has no reference row in that README table, so it remains Not Rated. NASA long-duration astronaut hematology research supports comparison with each astronaut's own preflight baseline, but does not independently validate the project's cutoffs. Analytics compares the static AST-001 flight records with the latest available pre-flight record and charts dated measurements against elapsed calendar time; heart-rate history includes 10 records across the baseline and flight periods. Dynamic per-astronaut data and rules for unusual baseline-to-flight changes are not wired into the dashboard; alerts use configured per-metric ranges. The alert log and acknowledgements are stored only in the current browser's local storage and are not shared with mission control or a backend. Alert behavior reflects configured demo ranges, which are not clinically validated; radiation thresholds in particular remain unverified. The latest flight record has no body-temperature value, so the dashboard displays it as Not Available, and unavailable results are flagged for a new sample and re-analysis. Spreadsheet upload supports blood results, but recording or importing new vital and radiation measurements and runtime database integration remain unimplemented. Cumulative dose is displayed from source data, not calculated by the app. The README table heading says 27 parameters, while its rows list 33; confirm the intended scope of that count.

## 1. Login and Astronaut Identification

- [x] The NFC reader detects the astronaut's NFC card.
- [x] New crew credentials can be registered with a name and card, then continue to onboarding.
- [x] The system displays the correct astronaut profile after scanning.
- [x] Astronaut information is displayed correctly.
- [x] Unregistered NFC cards are rejected.
- [x] Each astronaut's health records are associated with their correct profile.
- [x] The logout function works properly.

## 2. Main Dashboard

- [x] The dashboard loads successfully.
- [x] The astronaut's name and profile are displayed.
- [x] The latest available health measurements are displayed.
- [x] Available vital signs are displayed correctly.
- [x] Blood analysis results are accessible.
- [x] Available radiation exposure information is displayed.
- [x] Health warnings and critical alerts are visible for measurements with configured thresholds.
- [ ] The dashboard updates when new data is recorded.

## 3. Blood Analysis Module

- [ ] Blood test data can be received from the blood analyzer or entered manually.
- [x] Complete Blood Count (CBC) results are displayed correctly.
- [ ] Biomarker results are displayed correctly.
- [x] Measurement units are indicated correctly.
- [ ] Results are saved under the correct astronaut profile.
- [ ] Invalid or missing data are detected.
- [ ] Previous blood test results can be retrieved.
- [ ] Blood test history can be viewed.

## 4. Vital Signs Monitoring

- [x] Heart rate measurements are displayed correctly.
- [x] Blood pressure measurements are displayed correctly.
- [x] Oxygen saturation (SpO₂) measurements are displayed correctly.
- [ ] Body temperature measurements are displayed correctly.
- [x] Respiratory rate measurements are displayed correctly.
- [x] Heart Rate Variability (HRV) data are displayed correctly.
- [ ] New measurements update the dashboard.
- [x] Abnormal measurements trigger alerts when configured thresholds are available.

## 5. Radiation Monitoring Module

- [ ] Physical radiation dose data can be recorded or imported.
- [ ] Cumulative radiation exposure is calculated correctly.
- [ ] Biological radiation indicators can be recorded or imported.
- [ ] Radiation information is associated with the correct astronaut.
- [x] Radiation exposure trends can be viewed.
- [ ] Warning and critical thresholds trigger appropriate alerts.
- [x] Physical radiation dose and biological radiation indicators are displayed separately.

## 6. Health Analytics and Baseline Comparison

- [x] Pre-flight Earth baseline data can be accessed.
- [x] In-flight health measurements can be compared with baseline data.
- [x] Changes in health parameters are calculated correctly.
- [x] Graphs and charts display accurate information.
- [x] Historical health records can be viewed.
- [ ] Unusual changes are identified based on configured rules.
- [ ] Comparison results are associated with the correct astronaut.

## 7. PET AI Medical Assistant

- [ ] PET AI assistant opens successfully.
- [ ] PET can explain recorded health measurements.
- [ ] PET can summarize an astronaut's health condition based on available data.
- [ ] PET can identify configured warning indicators.
- [ ] PET can recommend appropriate follow-up tests.
- [ ] PET can suggest health-monitoring tasks.
- [ ] PET recommendations are based on recorded information.
- [ ] PET does not generate unsupported medical results.
- [ ] PET reminds users that medical decisions require appropriate professional review.

## 8. Alerts and Notifications

- [x] Warning-level alerts appear for measurements outside configured demo ranges (thresholds are not clinically validated).
- [x] Critical alerts appear when configured critical thresholds are crossed (radiation thresholds remain unverified).
- [x] Alerts identify the affected health parameter.
- [x] Alerts identify the astronaut concerned, based on the associated demo record.
- [x] Alerts display the relevant measurement and configured threshold details.
- [x] Alerts are recorded in the browser-local prototype log; they are not saved to a shared backend.
- [x] Reviewed alerts can be marked as acknowledged, with the acknowledgement stored locally in the browser.
- [x] Superseded alerts are retained as outdated history, and duplicate records are de-duplicated by astronaut, record, and metric.

## 9. Mission Control and Data Management

- [ ] Mission control can access authorized astronaut records.
- [ ] Mission control can view the overall astronaut health status.
- [ ] Health alerts are accessible to authorized personnel.
- [ ] Individual astronaut records remain separated.
- [ ] Data can synchronize when communication is available.
- [ ] Data remains accessible during temporary network disconnection.
- [ ] Updated records are not accidentally duplicated.
- [ ] Unauthorized users cannot access protected health information.

## 10. System Reliability and Security

- [ ] The software opens without errors.
- [x] Navigation between modules works correctly.
- [ ] Data are saved after closing and reopening the software.
- [ ] Invalid inputs are handled properly.
- [ ] Error messages are understandable.
- [ ] Sensitive health information is protected.
- [ ] The software handles temporary connection loss.
- [ ] The system does not lose or mix astronaut records.
- [x] The interface is readable and easy to navigate.
- [ ] All buttons, menus, and interactive elements work correctly.
- [ ] Security testing includes OWASP ZAP.

## Acceptance Gate

Requirements are ready for implementation approval when the Project Owner confirms the scope and the acceptance status of each requirement above. No checklist item is considered complete until implementation evidence and validation results are recorded.
