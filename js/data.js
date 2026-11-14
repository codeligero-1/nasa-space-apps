window.VITAL_DATA = {
  metrics: [
    [
      "Red blood cells",
      "Carry oxygen around the body",
      [
        ["Hemoglobin", "g/dL", 12.1, 13.5, 17.5, "The protein in red cells that holds oxygen. Below range can mean the blood carries less oxygen."],
        ["Hematocrit", "%", 37.8, 41, 53, "The share of your blood volume taken up by red cells."],
        ["Red cell count", "×10¹²/L", 4.3, 4.5, 5.9, "How many red cells are in a litre of blood."],
        ["MCV", "fL", 88, 80, 100, "Average size of a red cell."],
        ["MCH", "pg", 28.1, 27, 33, "Average hemoglobin inside each red cell."],
        ["MCHC", "g/dL", 32.0, 32, 36, "How concentrated hemoglobin is within red cells."],
        ["RDW", "%", 14.2, 11.5, 14.5, "How much red cell sizes vary."]
      ]
    ],
    [
      "White blood cells",
      "Defend the body against infection",
      [
        ["White cell count", "×10⁹/L", 10.6, 4.5, 11, "Total defence cells. High can follow infection, stress or hard exercise."],
        ["Neutrophils", "%", 58, 40, 70, "First responders to bacteria."],
        ["Lymphocytes", "%", 31, 20, 45, "Fight viruses and build memory."],
        ["Monocytes", "%", 7, 2, 8, "Clean up damaged cells and germs."],
        ["Eosinophils", "%", 3.6, 1, 4, "Respond to allergies and parasites."],
        ["Basophils", "%", 0.4, 0, 1, "Release histamine during allergic reactions."]
      ]
    ],
    [
      "Platelets",
      "Help blood clot",
      [
        ["Platelet count", "×10⁹/L", 148, 150, 450, "Tiny cell fragments that seal wounds. Slightly low here."]
      ]
    ]
  ],

  radiation: {
    physical: [
      {
        label: "Radiation detected today",
        value: "1.2",
        unit: "mSv/day",
        meaning: "The amount of radiation a personal badge detected over one day.",
        observedRange: { min: 0.722, max: 3.2 },
        reference: null
      },
      {
        label: "Radiation detected this mission",
        value: "146",
        unit: "mSv",
        meaning: "The total amount detected by the personal badge since the mission began.",
        observedRange: { min: 5.11, max: 560.42 },
        reference: null
      },
      {
        label: "Radiation measured in the cabin",
        value: "0.03",
        unit: "mGy",
        meaning: "Radiation detected by a sensor in the cabin. This is not a person's personal reading.",
        observedRange: { min: 0.664, max: 2.944 },
        reference: null
      }
    ],
    biological: [
      {
        label: "DNA damage signals",
        value: "0.18",
        unit: "foci/cell",
        meaning: "A lab marker that can appear when a cell's DNA is damaged.",
        observedRange: { min: 0.082, max: 1.26 },
        reference: {
          normalMin: 0.05,
          normalMax: 0.2,
          warningMin: 0.2,
          warningMax: 0.5,
          criticalMin: 0.5,
          criticalMax: 2
        }
      },
      {
        label: "Unusual chromosome shapes",
        value: "1.2",
        unit: "per 1,000 cells",
        meaning: "Counts uncommon chromosome shapes that can be linked to cell damage.",
        observedRange: { min: 0.49, max: 10.25 },
        reference: {
          normalMin: 0.5,
          normalMax: 1.5,
          warningMin: 1.5,
          warningMax: 4,
          criticalMin: 4,
          criticalMax: 10
        }
      },
      {
        label: "Small pieces of cell material",
        value: "8.0",
        unit: "per 1,000 cells",
        meaning: "Counts cells with tiny extra pieces of genetic material.",
        observedRange: { min: 4.26, max: 56.79 },
        reference: {
          normalMin: 2,
          normalMax: 10,
          warningMin: 10,
          warningMax: 20,
          criticalMin: 20,
          criticalMax: 40
        }
      },
      {
        label: "Cell repair result",
        value: "92",
        unit: "%",
        meaning: "A lab estimate of how well cells repaired DNA in this test.",
        observedRange: { min: 70.5, max: 98.2 },
        reference: null
      }
    ]
  },

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

  crew: [
    ["Cmdr. A. Reyes", "•••• 4821", "Today", "ok", 92],
    ["Dr. L. Okafor", "•••• 1190", "Today", "ok", 85],
    ["J. Tanaka", "•••• 7734", "Yesterday", "warn", 77],
    ["M. Santos", "•••• 0562", "Today", "low", 69],
    ["R. Haddad", "•••• 3309", "2 days ago", "ok", 100],
    ["S. Lindqvist", "•••• 9915", "3 days ago", "warn", 85]
  ],

  chatKnowledge: [
    [/hemoglobin|anemi|iron|tired/, "Your hemoglobin is 12.1 g/dL, a bit under the 13.5 floor. Hematocrit and red cell count are slightly low too, so they point the same way. Common reasons include low iron, low B12 or folate, or recent blood loss. An iron panel with ferritin is the best next step, and I put it first in your missions."],
    [/platelet|clot|bruis/, "Platelets are 148, just below 150. Small dips like this are often harmless, but a blood smear can rule out clumping in the sample. Repeating the count in two weeks shows whether it’s a trend."],
    [/white|wbc|infect|neutro|lymph/, "Your white cell count is 10.6, close to the top of range, and the mix of types is balanced. Hard exercise, stress or a mild bug can nudge it up. Nothing stands out in the breakdown."],
    [/score|orbit/, "The Orbit score is the share of your readings that sit in their healthy range. Complete missions and repeat scans to follow how it changes over time."],
    [/test|next|mission|follow/, "I’d start with the iron panel, then a reticulocyte count. Those two explain most low-hemoglobin patterns. Check them off in Missions to earn XP."],
    [/doctor|surgeon|serious|worry|diagnos/, "I can explain the numbers, but I can’t diagnose. Share this report with your flight surgeon, especially because three values are below range together."]
  ]
};
