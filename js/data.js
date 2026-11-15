window.VITAL_DATA = {
  sections: [
    { id: 'vitals', title: 'Vital Signs', description: 'Latest available measurements compared with configured ranges.' },
    { id: 'blood', title: 'Blood Analysis', description: 'Source-backed blood counts, differential, biomarkers, and electrolytes.' },
    { id: 'radiation', title: 'Radiation Monitoring', description: 'Physical exposure and biological response measurements.' }
  ],

  metrics: [
    { id: 'heartRate', section: 'vitals', group: 'Vital Signs', name: 'Heart Rate', abbreviation: 'HR', unit: 'bpm', range: 'Heart Rate', decimals: 1 },
    { id: 'systolic', section: 'vitals', group: 'Blood Pressure', name: 'Systolic Blood Pressure', abbreviation: 'SBP', unit: 'mmHg', range: 'Systolic Blood Pressure', decimals: 1 },
    { id: 'diastolic', section: 'vitals', group: 'Blood Pressure', name: 'Diastolic Blood Pressure', abbreviation: 'DBP', unit: 'mmHg', range: 'Diastolic Blood Pressure', decimals: 1 },
    { id: 'spo2', section: 'vitals', group: 'Vital Signs', name: 'Oxygen Saturation', abbreviation: 'SpO₂', unit: '%', range: 'SpO2 Oxygen Saturation', decimals: 1 },
    { id: 'temperature', section: 'vitals', group: 'Vital Signs', name: 'Body Temperature', abbreviation: 'Temp', unit: '°C', range: 'Body Temperature', decimals: 2 },
    { id: 'respiratoryRate', section: 'vitals', group: 'Vital Signs', name: 'Respiratory Rate', abbreviation: 'RR', unit: 'breaths/min', range: 'Respiratory Rate', decimals: 1 },
    { id: 'hrv', section: 'vitals', group: 'Vital Signs', name: 'Heart Rate Variability', abbreviation: 'HRV', unit: 'ms', range: 'Heart Rate Variability (HRV)', decimals: 1 },
    { id: 'rbc', section: 'blood', group: 'Red Blood Cell Analysis', name: 'Red Blood Cell Count', abbreviation: 'RBC', unit: 'M/µL', range: 'Red Blood Cell Count (RBC)', decimals: 2 },
    { id: 'wbc', section: 'blood', group: 'White Blood Cell Analysis', name: 'White Blood Cell Count', abbreviation: 'WBC', unit: 'K/µL', range: 'White Blood Cell Count (WBC)', decimals: 2 },
    { id: 'hemoglobin', section: 'blood', group: 'Red Blood Cell Analysis', name: 'Hemoglobin', abbreviation: 'HGB', unit: 'g/dL', range: 'Hemoglobin', decimals: 2 },
    { id: 'hematocrit', section: 'blood', group: 'Red Blood Cell Analysis', name: 'Hematocrit', abbreviation: 'HCT', unit: '%', range: 'Hematocrit', decimals: 1 },
    { id: 'platelets', section: 'blood', group: 'Platelet Analysis', name: 'Platelet Count', abbreviation: 'PLT', unit: 'K/µL', range: 'Platelet Count', decimals: 1 },
    { id: 'neutrophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Neutrophils', abbreviation: 'NEUT%', unit: '%', range: 'Neutrophils', decimals: 1 },
    { id: 'lymphocytes', section: 'blood', group: 'White Blood Cell Differential', name: 'Lymphocytes', abbreviation: 'LYMPH%', unit: '%', range: 'Lymphocytes', decimals: 1 },
    { id: 'monocytes', section: 'blood', group: 'White Blood Cell Differential', name: 'Monocytes', abbreviation: 'MONO%', unit: '%', range: 'Monocytes', decimals: 1 },
    { id: 'eosinophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Eosinophils', abbreviation: 'EOS%', unit: '%', range: 'Eosinophils', decimals: 1 },
    { id: 'basophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Basophils', abbreviation: 'BASO%', unit: '%', range: 'Basophils', decimals: 1 },
    { id: 'crp', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'C-Reactive Protein', abbreviation: 'CRP', unit: 'mg/L', range: 'C-Reactive Protein (CRP)', decimals: 2 },
    { id: 'ferritin', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Ferritin', abbreviation: 'Ferritin', unit: 'ng/mL', range: 'Ferritin', decimals: 1 },
    { id: 'il6', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Interleukin-6', abbreviation: 'IL-6', unit: 'pg/mL', range: 'Interleukin-6 (IL-6)', decimals: 2 },
    { id: 'cortisol', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Cortisol', abbreviation: 'Cortisol', unit: 'µg/dL', range: 'Cortisol', decimals: 2 },
    { id: 'troponin', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Troponin-I', abbreviation: 'Troponin-I', unit: 'ng/mL', range: 'Troponin-I', decimals: 4 },
    { id: 'sodium', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Sodium', abbreviation: 'Na', unit: 'mEq/L', range: 'Sodium', decimals: 1 },
    { id: 'potassium', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Potassium', abbreviation: 'K', unit: 'mEq/L', range: 'Potassium', decimals: 1 },
    { id: 'dailyDose', section: 'radiation', group: 'Radiation Exposure', name: 'Daily Radiation Dose', abbreviation: 'Daily Dose', unit: 'mSv/day', range: 'Daily Physical Exposure', decimals: 5 },
    { id: 'cumulativeDose', section: 'radiation', group: 'Radiation Exposure', name: 'Cumulative Radiation Dose', abbreviation: 'Cumulative Dose', unit: 'mSv', range: 'Cumulative Mission Dose', decimals: 2 },
    { id: 'background', section: 'radiation', group: 'Radiation Exposure', name: 'Space Radiation Background', abbreviation: 'Background', unit: 'mGy', range: 'Cabin Background Rate', decimals: 4 },
    { id: 'gammaH2ax', section: 'radiation', group: 'Biological Response', name: 'Gamma-H2AX Indicator', abbreviation: 'γ-H2AX', unit: 'foci/cell', range: 'Gamma-H2AX Foci per Cell', decimals: 3 },
    { id: 'dicentrics', section: 'radiation', group: 'Biological Response', name: 'Dicentric Chromosome Assay', abbreviation: 'Dicentrics', unit: '/1000 cells', range: 'Dicentric Chromosomes', decimals: 2 },
    { id: 'micronuclei', section: 'radiation', group: 'Biological Response', name: 'Micronuclei Indicator', abbreviation: 'Micronuclei', unit: '/1000 cells', range: 'Micronuclei Frequency', decimals: 2 },
    { id: 'dnaRepair', section: 'radiation', group: 'Biological Response', name: 'DNA Repair Capacity', abbreviation: 'DNA Repair', unit: '%', range: 'DNA Repair Capacity', decimals: 1 }
  ],

  missions: [
    ["Iron panel with ferritin", "Checks whether low hemoglobin comes from low iron stores", 120, [
      "Ask your flight surgeon or care team whether an iron panel with ferritin is appropriate.",
      "If they order it, follow their instructions for the blood draw and any preparation.",
      "Review the results with your care team and record the date and follow-up plan.",
      "Do not start iron supplements unless your care team recommends them."
    ]],
    ["Reticulocyte count", "Shows how fast bone marrow is making new red cells", 90, [
      "Ask your care team whether a reticulocyte count should be added to your blood work.",
      "If ordered, have the sample collected according to the clinic’s instructions.",
      "Record the result and discuss what it means alongside your other blood counts."
    ]],
    ["Blood smear review", "A lab tech inspects cell shape and platelet clumping", 90, [
      "Ask your care team whether a peripheral blood smear review is appropriate.",
      "The laboratory examines a blood sample under a microscope; your care team arranges the test.",
      "Ask the clinician to explain any findings, including whether platelet clumping affected the sample."
    ]],
    ["Repeat blood count in 2 weeks", "Confirms whether the changes persist", 60, [
      "Coordinate the repeat blood count date with your care team, aiming for about two weeks if they agree.",
      "Follow the clinic’s instructions for sample collection.",
      "Compare the new result with this scan with your clinician and note any recommended follow-up."
    ]],
    ["Log hydration and sleep for 3 days", "Context that helps explain this week’s numbers", 30, [
      "For three days, record your sleep and fluid intake using the format recommended by your care team.",
      "Note the time, amount, and any relevant changes in routine or symptoms.",
      "Share the log with your care team; follow their guidance on hydration rather than changing intake based on this log alone."
    ]]
  ],

  chatKnowledge: [
    [/score|orbit/, "The dashboard score reflects only readings with configured reference ranges. Missing or unrated values are not counted as normal."],
    [/baseline|trend|history|change/, "Open Measurement History to select a category, metric, and test date, then compare it with the latest available pre-flight baseline."],
    [/test|next|mission|follow/, "I cannot prescribe or order tests. Review any follow-up plans with your qualified medical team; the mission checklist is informational."],
    [/doctor|surgeon|serious|worry|diagnos/, "I can explain recorded values and configured ranges, but I cannot diagnose. Ask a qualified medical professional to interpret real results."]
  ]
};
