window.HEMODECK_DATA = {
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

  missions: [
    ["Iron panel with ferritin", "Checks whether low hemoglobin comes from low iron stores", 120],
    ["Reticulocyte count", "Shows how fast bone marrow is making new red cells", 90],
    ["Blood smear review", "A lab tech inspects cell shape and platelet clumping", 90],
    ["Repeat blood count in 2 weeks", "Confirms whether the changes persist", 60],
    ["Log hydration and sleep for 3 days", "Context that helps explain this week’s numbers", 30]
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
