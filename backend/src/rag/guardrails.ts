/**
 * Guardrails Service for PET AI
 * Input validation, output validation, and topic classification
 */

export type AllowedTopic =
  | 'measurement_explanation'
  | 'health_summary'
  | 'warning_identification'
  | 'followup_recommendation'
  | 'monitoring_suggestion'
  | 'clarification'
  | 'context_reference'
  | 'scope_redirect'
  | 'disallowed';

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  topic?: AllowedTopic;
}

// Medical/health keywords that indicate allowed topics
const ALLOWED_KEYWORDS = {
  measurement_explanation: [
    'what is', 'what does', 'explain', 'meaning', 'mean', 'value', 'level',
    'hemoglobin', 'wbc', 'rbc', 'platelet', 'hematocrit', 'glucose',
    'heart rate', 'blood pressure', 'spo2', 'oxygen', 'temperature',
    'respiratory', 'hrv', 'neutrophil', 'lymphocyte', 'monocyte',
    'eosinophil', 'basophil', 'crp', 'ferritin', 'il6', 'tnf', 'cortisol',
    'troponin', 'sodium', 'potassium', 'radiation', 'dose', 'gamma-h2ax',
    'dicentric', 'micronuclei', 'dna repair',
    // Spaceflight hazard keywords (for knowledge base queries)
    'hazard', 'hazards', 'spaceflight', 'space flight', 'space',
    'radiation risk', 'radiation exposure', 'space radiation',
    'isolation', 'confinement', 'distance from earth', 'gravity',
    'microgravity', 'partial gravity', 'hostile environment',
    'nasa', 'human research program', 'hrp', 'mars', 'moon',
    'artemis', 'iss', 'mission', 'countermeasures', 'shielding'
  ],
  health_summary: [
    'summarize', 'summary', 'overview', 'health status', 'condition',
    'how am i', 'my health', 'overall', 'big picture'
  ],
  warning_identification: [
    'warning', 'alert', 'abnormal', 'critical', 'high', 'low', 'out of range',
    'concern', 'worried', 'bad', 'dangerous', 'flag', 'anomaly'
  ],
  followup_recommendation: [
    'test', 'next', 'follow up', 'follow-up', 'recommend', 'suggest',
    'should i', 'what test', 'mission', 'checklist', 'iron panel',
    'reticulocyte', 'blood smear', 'repeat'
  ],
  monitoring_suggestion: [
    'monitor', 'track', 'watch', 'daily', 'log', 'record', 'measure',
    'hydration', 'sleep', 'routine', 'habit'
  ],
  // Conversational topics (NEW)
  clarification: [
    'clarify', 'rephrase', 'simpler', 'simplify', 'explain again', 'what do you mean',
    'did not understand', 'confusing', 'elaborate', 'more detail', 'less technical',
    'in plain english', 'break it down', 'what does that mean'
  ],
  context_reference: [
    'you said', 'you mentioned', 'earlier', 'previous', 'before', 'last time',
    'we discussed', 'as you said', 'building on', 'following up', 'what about',
    'then what', 'also', 'and', 'what else'
  ],
  scope_redirect: [
    'can you help', 'help me', 'what can you do', 'scope', 'capabilities',
    'what else can', 'anything else', 'other questions', 'redirect', 'guide'
  ]
};

// Disallowed patterns
const DISALLOWED_PATTERNS = [
  /diagnose/i,
  /prescribe/i,
  /treatment/i,
  /medication/i,
  /drug/i,
  /therapy/i,
  /cure/i,
  /what.*disease/i,
  /what.*condition/i,
  /am i.*sick/i,
  /do i have/i,
  /is it.*cancer/i,
  /is it.*serious/i,
  /prognosis/i,
  /life expectancy/i,
  /will i die/i,
  /weather/i,
  /news/i,
  /politics/i,
  /recipe/i,
  /cooking/i,
  /sports/i,
  /movie/i,
  /music/i,
  /joke/i,
  /password/i,
  /secret/i,
  /personal.*info/i,
  /ssn/i,
  /social security/i,
  /credit card/i
];

/**
 * Classify the query topic
 */
export function classifyQuery(query: string): AllowedTopic {
  const lowerQuery = query.toLowerCase();

  // Check for disallowed patterns first
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return 'disallowed';
    }
  }

  // Score each allowed topic
  const scores: Record<AllowedTopic, number> = {
    measurement_explanation: 0,
    health_summary: 0,
    warning_identification: 0,
    followup_recommendation: 0,
    monitoring_suggestion: 0,
    clarification: 0,
    context_reference: 0,
    scope_redirect: 0,
    disallowed: 0
  };

  for (const [topic, keywords] of Object.entries(ALLOWED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        scores[topic as AllowedTopic] += 1;
      }
    }
  }

  // Find highest scoring topic
  let bestTopic: AllowedTopic = 'disallowed';
  let bestScore = 0;

  for (const [topic, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic as AllowedTopic;
    }
  }

  // Require minimum score to allow
  if (bestScore === 0) {
    return 'disallowed';
  }

  return bestTopic;
}

/**
 * Validate input query
 */
export function validateQuery(query: string): ValidationResult {
  const topic = classifyQuery(query);

  if (topic === 'disallowed') {
    return {
      allowed: false,
      reason: 'This question is outside my scope as a crew health monitoring assistant. I can only help explain your recorded health measurements, identify warnings, summarize your health status, recommend follow-up tests from the mission checklist, or suggest monitoring tasks.',
      topic
    };
  }

  // Additional checks
  if (query.length < 3) {
    return {
      allowed: false,
      reason: 'Please ask a more specific question.',
      topic
    };
  }

  if (query.length > 2000) {
    return {
      allowed: false,
      reason: 'Question is too long. Please shorten it.',
      topic
    };
  }

  return { allowed: true, topic };
}

/**
 * Validate output response for grounding and safety
 */
export function validateResponse(
  response: string,
  context: string,
  topic: AllowedTopic
): ValidationResult {
  // Check for medical disclaimer - more permissive regex to catch variations
  const hasDisclaimer = /medical professional|flight surgeon|care team|qualified medical|not a diagnosis|informational only|consult.*professional|educational purposes|does not constitute medical advice|reviewed with.*medical team/i.test(response);

  if (!hasDisclaimer && topic !== 'disallowed') {
    return {
      allowed: false,
      reason: 'Response missing required medical disclaimer',
      topic
    };
  }

  // Check for hallucination markers (definitive statements without grounding)
  const hallucinationPatterns = [
    /you have/i,
    /you are/i,
    /your condition is/i,
    /diagnosis is/i,
    /you should take/i,
    /prescribe/i,
    /medication.*is/i
  ];

  for (const pattern of hallucinationPatterns) {
    if (pattern.test(response)) {
      return {
        allowed: false,
        reason: 'Response contains potentially ungrounded medical claims',
        topic
      };
    }
  }

  // Check if response references context (grounding)
  const contextMetrics = extractMetricsFromContext(context);
  const responseMetrics = extractMetricsFromText(response);

  // Debug: log metrics being extracted
  console.log('[guardrails] Context metrics:', contextMetrics);
  console.log('[guardrails] Response metrics:', responseMetrics);
  console.log('[guardrails] Missing metrics:', responseMetrics.filter(m => !contextMetrics.includes(m)));

  // If response mentions specific metrics, they should be in context
  // Both contextMetrics and responseMetrics are now normalized to canonical forms
  for (const metric of responseMetrics) {
    if (!contextMetrics.includes(metric)) {
      // Allow if it's a general reference, but flag specific values
      if (/\d+(\.\d+)?/.test(response)) {
        return {
          allowed: false,
          reason: 'Response references metrics not in retrieved context',
          topic
        };
      }
    }
  }

  return { allowed: true, topic };
}

// Metric abbreviation to canonical name mapping
const METRIC_ALIASES: Record<string, string> = {
  'bp': 'blood pressure',
  'na': 'sodium',
  'k': 'potassium',
  'hgb': 'hemoglobin',
  'hct': 'hematocrit',
  'plt': 'platelet',
  'spo₂': 'spo2',
  'o2': 'oxygen saturation',
  'o2 sat': 'oxygen saturation',
  'rr': 'respiratory rate',
  'hr': 'heart rate',
  'temp': 'temperature',
  'heart_rate': 'heart rate',
  'respiratory_rate': 'respiratory rate',
  'cumulative_dose': 'cumulative dose',
  'dose_rate': 'dose rate',
  'chromosomal_aberrations': 'chromosomal aberrations',
  'white blood cell': 'wbc',
  'red blood cell': 'rbc',
  'platelets': 'platelet',
};

/**
 * Normalize a metric name to its canonical form
 */
function normalizeMetricName(metric: string): string {
  return METRIC_ALIASES[metric.toLowerCase()] || metric.toLowerCase();
}

/**
 * Extract metric names from context using word-boundary-aware matching
 */
function extractMetricsFromContext(context: string): string[] {
  const metrics = [
    'hemoglobin', 'hgb', 'wbc', 'white blood cell', 'rbc', 'red blood cell', 'platelet', 'platelets', 'plt', 'hematocrit', 'hct', 'glucose',
    'heart rate', 'heart_rate', 'hr', 'blood pressure', 'bp', 'spo2', 'spo₂', 'o2', 'oxygen saturation', 'o2 sat', 'temperature', 'temp',
    'respiratory rate', 'respiratory_rate', 'rr', 'hrv', 'neutrophil', 'lymphocyte', 'monocyte',
    'eosinophil', 'basophil', 'crp', 'ferritin', 'il6', 'il-6', 'tnf', 'tnf-alpha', 'cortisol',
    'troponin', 'sodium', 'na', 'potassium', 'k', 'radiation', 'dose', 'gamma-h2ax', 'gamma h2ax',
    'dicentric', 'micronuclei', 'dna repair', 'mcv', 'mch', 'mchc', 'rdw',
    'cumulative dose', 'cumulative_dose', 'dose rate', 'dose_rate', 'chromosomal aberrations', 'chromosomal_aberrations',
    // Common medical abbreviations
    'bp', 'na', 'k', 'hgb', 'hct', 'plt', 'spo2', 'spo₂', 'o2', 'o2 sat', 'rr', 'hr', 'temp'
  ];

  // Normalize context: replace underscores with spaces, lowercase
  const normalizedContext = context.toLowerCase().replace(/_/g, ' ');
  // Use word-boundary-aware matching to avoid partial matches
  const found = metrics.filter(m => {
    const metric = m.toLowerCase();
    const escapedMetric = metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\W)${escapedMetric}(\\W|$)`);
    return regex.test(normalizedContext);
  });
  // Normalize to canonical forms
  return [...new Set(found.map(normalizeMetricName))];
}

/**
 * Extract metric names from response text using word-boundary-aware matching
 */
function extractMetricsFromText(text: string): string[] {
  const metrics = [
    'hemoglobin', 'hgb', 'wbc', 'white blood cell', 'rbc', 'red blood cell', 'platelet', 'platelets', 'plt', 'hematocrit', 'hct', 'glucose',
    'heart rate', 'heart_rate', 'hr', 'blood pressure', 'bp', 'spo2', 'spo₂', 'o2', 'oxygen saturation', 'o2 sat', 'temperature', 'temp',
    'respiratory rate', 'respiratory_rate', 'rr', 'hrv', 'neutrophil', 'lymphocyte', 'monocyte',
    'eosinophil', 'basophil', 'crp', 'ferritin', 'il6', 'il-6', 'tnf', 'tnf-alpha', 'cortisol',
    'troponin', 'sodium', 'na', 'potassium', 'k', 'radiation', 'dose', 'gamma-h2ax', 'gamma h2ax',
    'dicentric', 'micronuclei', 'dna repair', 'mcv', 'mch', 'mchc', 'rdw',
    'cumulative dose', 'cumulative_dose', 'dose rate', 'dose_rate', 'chromosomal aberrations', 'chromosomal_aberrations',
    // Common medical abbreviations
    'bp', 'na', 'k', 'hgb', 'hct', 'plt', 'spo2', 'spo₂', 'o2', 'o2 sat', 'rr', 'hr', 'temp'
  ];

  // Normalize text: replace special chars with ascii equivalents, underscores with spaces
  const normalizedText = text
    .toLowerCase()
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/[₂]/g, '2')  // Subscript 2
    .replace(/[₃]/g, '3')
    .replace(/[₄]/g, '4')
    .replace(/[₉]/g, '9')
    .replace(/[⁸]/g, '8')
    .replace(/[⁷]/g, '7')
    .replace(/[⁶]/g, '6')
    .replace(/[⁵]/g, '5')
    .replace(/[⁴]/g, '4')
    .replace(/[³]/g, '3')
    .replace(/[²]/g, '2')
    .replace(/[¹]/g, '1')
    .replace(/[⁰]/g, '0')
    .replace(/[×]/g, 'x'); // Multiplication sign

  // Use word-boundary-aware matching to avoid partial matches (e.g., "work" -> "k", "educational" -> "na")
  const found = metrics.filter(m => {
    const metric = m.toLowerCase();
    // Create regex that matches the metric as a whole word/token
    // Handle multi-word metrics (e.g., "heart rate", "white blood cell")
    const escapedMetric = metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match at word boundaries: start of string, end of string, or non-word characters around
    const regex = new RegExp(`(^|\\W)${escapedMetric}(\\W|$)`);
    return regex.test(normalizedText);
  });
  // Normalize to canonical forms
  return [...new Set(found.map(normalizeMetricName))];
}

/**
 * Get the standard medical disclaimer
 */
export function getMedicalDisclaimer(): string {
  return 'This information is for educational purposes only and does not constitute medical advice. All health decisions should be reviewed with your flight surgeon or qualified medical team.';
}

/**
 * Get topic-specific guidance for the LLM
 */
export function getTopicGuidance(topic: AllowedTopic): string {
  switch (topic) {
    case 'measurement_explanation':
      return 'Explain the specific measurement value, its reference range, and how it compares to the astronaut\'s baseline. Use the format: "Metric: value unit. Status: [Normal/Warning/Critical]. Reference range: X-Y unit. Baseline: Z unit."';
    case 'health_summary':
      return 'Provide a concise summary across all record types (vitals, blood, radiation). Highlight any values outside reference ranges. Compare current readings to pre-flight baselines where available.';
    case 'warning_identification':
      return 'Identify all measurements that are outside their configured reference ranges. Classify as Warning or Critical based on thresholds. Explain what each flagged value means.';
    case 'followup_recommendation':
      return 'Suggest follow-up tests ONLY from the predefined mission checklist in the context. Do not invent new tests. Explain why each suggested test is relevant based on the current readings.';
    case 'monitoring_suggestion':
      return 'Suggest practical daily monitoring tasks based on the astronaut\'s current readings. Focus on actionable items like hydration logging, sleep tracking, or specific metric re-measurement.';
    // Conversational topics guidance (NEW)
    case 'clarification':
      return 'The user wants you to rephrase or simplify your previous answer. Re-explain the same medical information more clearly without losing accuracy. Keep it grounded in the health data.';
    case 'context_reference':
      return 'The user is referencing something from earlier in the conversation. Acknowledge the context and build on it. Reference the specific previous topic/metric and connect it to the current question using the health data.';
    case 'scope_redirect':
      return 'The user is asking about your capabilities or wants guidance. Explain what you can help with (health data explanations, summaries, warnings, follow-ups, monitoring). Gently redirect to medical topics if they ask about non-medical things.';
    default:
      return '';
  }
}