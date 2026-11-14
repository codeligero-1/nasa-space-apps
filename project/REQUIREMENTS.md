# Requirements

## Status

**Draft — requirements supplied by the Project Owner and pending formal approval.**

## Verification Note

Checked items are supported by the current repository code or static prototype data. Unchecked items were not treated as fulfilled because the implementation, integration, or verification evidence is incomplete. No frontend or backend changes were made during this requirements review.

## 1. Login and Astronaut Identification

- [ ] The NFC reader detects the astronaut's NFC card.
- [ ] The system displays the correct astronaut profile after scanning.
- [ ] Astronaut information is displayed correctly.
- [ ] Unregistered NFC cards are rejected.
- [ ] Each astronaut's health records are associated with their correct profile.
- [x] The logout function works properly.

## 2. Main Dashboard

- [x] The dashboard loads successfully.
- [ ] The astronaut's name and profile are displayed.
- [ ] The latest health measurements are displayed.
- [ ] Vital signs are displayed correctly.
- [x] Blood analysis results are accessible.
- [ ] Radiation exposure information is displayed.
- [ ] Health warnings and critical alerts are visible.
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

- [ ] Heart rate measurements are displayed correctly.
- [ ] Blood pressure measurements are displayed correctly.
- [ ] Oxygen saturation (SpO₂) measurements are displayed correctly.
- [ ] Body temperature measurements are displayed correctly.
- [ ] Respiratory rate measurements are displayed correctly.
- [ ] Heart Rate Variability (HRV) data are displayed correctly.
- [ ] New measurements update the dashboard.
- [ ] Abnormal measurements trigger the appropriate alerts.

## 5. Radiation Monitoring Module

- [ ] Physical radiation dose data can be recorded or imported.
- [ ] Cumulative radiation exposure is calculated correctly.
- [ ] Biological radiation indicators can be recorded or imported.
- [ ] Radiation information is associated with the correct astronaut.
- [ ] Radiation exposure trends can be viewed.
- [ ] Warning and critical thresholds trigger appropriate alerts.
- [ ] Physical radiation dose and biological radiation indicators are displayed separately.

## 6. Health Analytics and Baseline Comparison

- [ ] Pre-flight Earth baseline data can be accessed.
- [ ] In-flight health measurements can be compared with baseline data.
- [ ] Changes in health parameters are calculated correctly.
- [ ] Graphs and charts display accurate information.
- [ ] Historical health records can be viewed.
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

- [ ] Warning-level alerts appear correctly.
- [ ] Critical alerts appear correctly.
- [ ] Alerts identify the affected health parameter.
- [ ] Alerts identify the astronaut concerned.
- [ ] Alerts display the relevant measurement and threshold.
- [ ] Alerts are recorded in the system.
- [ ] Reviewed alerts can be marked as acknowledged.
- [ ] Outdated or duplicate alerts are handled appropriately.

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
