window.VITAL_DATA = {
  sections: [
    { id: 'vitals', title: 'Vital Signs Overview', description: 'Latest available measurements compared with configured reference ranges.' },
    { id: 'blood', title: 'Blood Analysis Summary', description: 'CBC, differential, inflammatory markers, cardiac marker, and electrolytes.' },
    { id: 'radiation', title: 'Radiation Monitoring', description: 'Physical exposure and biological response measurements.' }
  ],
  metrics: [
    { id: 'heartRate', section: 'vitals', group: 'Vital Signs', name: 'Heart Rate', abbreviation: 'HR', unit: 'bpm', range: 'Heart Rate', decimals: 1 },
    { id: 'systolic', section: 'vitals', group: 'Blood Pressure', name: 'Systolic Blood Pressure', abbreviation: 'SBP', unit: 'mmHg', range: 'Systolic Blood Pressure', decimals: 1 },
    { id: 'diastolic', section: 'vitals', group: 'Blood Pressure', name: 'Diastolic Blood Pressure', abbreviation: 'DBP', unit: 'mmHg', range: 'Diastolic Blood Pressure', decimals: 1 },
    { id: 'spo2', section: 'vitals', group: 'Vital Signs', name: 'Oxygen Saturation', abbreviation: 'SpO₂', unit: '%', range: 'SpO2 Oxygen Saturation', decimals: 1 },
    { id: 'temperature', section: 'vitals', group: 'Vital Signs', name: 'Body Temperature', abbreviation: 'Temp', unit: '°C', range: 'Body Temperature', decimals: 2 },
    { id: 'respiratoryRate', section: 'vitals', group: 'Vital Signs', name: 'Respiratory Rate', abbreviation: 'RR', unit: 'breaths/min', range: null, decimals: 1 },
    { id: 'hrv', section: 'vitals', group: 'Vital Signs', name: 'Heart Rate Variability', abbreviation: 'HRV', unit: 'ms', range: 'Heart Rate Variability (HRV)', decimals: 1 },

    { id: 'rbc', section: 'blood', group: 'Blood Cell Counts', name: 'Red Blood Cell Count', abbreviation: 'RBC', unit: 'M/µL', range: 'Red Blood Cell Count (RBC)', decimals: 2 },
    { id: 'wbc', section: 'blood', group: 'Blood Cell Counts', name: 'White Blood Cell Count', abbreviation: 'WBC', unit: 'K/µL', range: 'White Blood Cell Count (WBC)', decimals: 2 },
    { id: 'hemoglobin', section: 'blood', group: 'Blood Cell Counts', name: 'Hemoglobin', abbreviation: 'HGB', unit: 'g/dL', range: 'Hemoglobin', decimals: 2 },
    { id: 'hematocrit', section: 'blood', group: 'Blood Cell Counts', name: 'Hematocrit', abbreviation: 'HCT', unit: '%', range: 'Hematocrit', decimals: 1 },
    { id: 'platelets', section: 'blood', group: 'Blood Cell Counts', name: 'Platelet Count', abbreviation: 'PLT', unit: 'K/µL', range: 'Platelet Count', decimals: 1 },
    { id: 'neutrophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Neutrophils', abbreviation: 'NEUT%', unit: '%', range: 'Neutrophils', decimals: 1 },
    { id: 'lymphocytes', section: 'blood', group: 'White Blood Cell Differential', name: 'Lymphocytes', abbreviation: 'LYMPH%', unit: '%', range: 'Lymphocytes', decimals: 1 },
    { id: 'monocytes', section: 'blood', group: 'White Blood Cell Differential', name: 'Monocytes', abbreviation: 'MONO%', unit: '%', range: 'Monocytes', decimals: 1 },
    { id: 'eosinophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Eosinophils', abbreviation: 'EOS%', unit: '%', range: 'Eosinophils', decimals: 1 },
    { id: 'basophils', section: 'blood', group: 'White Blood Cell Differential', name: 'Basophils', abbreviation: 'BASO%', unit: '%', range: 'Basophils', decimals: 1 },
    { id: 'immatureGranulocytes', section: 'blood', group: 'White Blood Cell Differential', name: 'Immature Granulocytes', abbreviation: 'IG%', unit: '%', range: 'Immature Granulocytes', decimals: 2 },
    { id: 'crp', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'C-Reactive Protein', abbreviation: 'CRP', unit: 'mg/L', range: 'C-Reactive Protein (CRP)', decimals: 2 },
    { id: 'ferritin', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Ferritin', abbreviation: 'Ferritin', unit: 'ng/mL', range: 'Ferritin', decimals: 1 },
    { id: 'il6', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Interleukin-6', abbreviation: 'IL-6', unit: 'pg/mL', range: 'Interleukin-6 (IL-6)', decimals: 2 },
    { id: 'tnfAlpha', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Tumor Necrosis Factor-alpha', abbreviation: 'TNF-α', unit: 'pg/mL', range: null, decimals: 2 },
    { id: 'cortisol', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Cortisol', abbreviation: 'Cortisol', unit: 'µg/dL', range: 'Cortisol', decimals: 2 },
    { id: 'troponin', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Troponin-I', abbreviation: 'Troponin-I', unit: 'ng/mL', range: null, decimals: 4 },
    { id: 'sodium', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Sodium', abbreviation: 'Na', unit: 'mEq/L', range: null, decimals: 1 },
    { id: 'potassium', section: 'blood', group: 'Biomarkers & Electrolytes', name: 'Potassium', abbreviation: 'K', unit: 'mEq/L', range: null, decimals: 1 },

    { id: 'dailyDose', section: 'radiation', group: 'Radiation Exposure', name: 'Daily Radiation Dose', abbreviation: 'Daily Dose', unit: 'mSv', range: null, baselineUnit: 'mSv/day', compareBaseline: false, decimals: 5 },
    { id: 'cumulativeDose', section: 'radiation', group: 'Radiation Exposure', name: 'Cumulative Radiation Dose', abbreviation: 'Cumulative Dose', unit: 'mSv', range: null, baselineUnit: 'mSv/year', compareBaseline: false, decimals: 2 },
    { id: 'background', section: 'radiation', group: 'Radiation Exposure', name: 'Space Radiation Background', abbreviation: 'Background', unit: 'mGy', range: null, decimals: 4 },
    { id: 'gammaH2ax', section: 'radiation', group: 'Biological Response', name: 'Gamma-H2AX Indicator', abbreviation: 'γ-H2AX', unit: 'foci/cell', range: 'Gamma-H2AX Foci per Cell', decimals: 3 },
    { id: 'dicentrics', section: 'radiation', group: 'Biological Response', name: 'Dicentric Chromosome Assay', abbreviation: 'Dicentrics', unit: '/1000 cells', range: 'Dicentric Chromosomes', decimals: 2 },
    { id: 'micronuclei', section: 'radiation', group: 'Biological Response', name: 'Micronuclei Indicator', abbreviation: 'Micronuclei', unit: '/1000 cells', range: 'Micronuclei Frequency', decimals: 2 },
    { id: 'dnaRepair', section: 'radiation', group: 'Biological Response', name: 'DNA Repair Capacity', abbreviation: 'DNA Repair', unit: '%', range: null, decimals: 1 }
  ]
};
