export type FraudVector = {
  amount: number;
  time: number;
  v14: number;
  v4: number;
  v12: number;
  v10: number;
};

export type FraudStatus = "Cleared" | "Flagged" | "Blocked";

export type FraudPrediction = {
  riskScore: number;
  probability: number;
  status: FraudStatus;
  hardRuleTriggered: boolean;
  signals: Array<{ label: string; impact: number }>;
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Deterministic, lightweight gradient-boosting simulation. Each term behaves
 * like a shallow decision tree and the combined log-odds are calibrated into
 * a probability. The threshold only controls the review decision boundary.
 */
export function scoreFraudVector(vector: FraudVector, threshold = 0.5): FraudPrediction {
  const rules = [
    { label: "High amount", active: vector.amount > 5000, weight: 2.15 },
    { label: "V14 anomaly", active: vector.v14 < -2.5, weight: 2.6 },
    { label: "V4 anomaly", active: vector.v4 > 2, weight: 1.65 },
    { label: "V12 anomaly", active: vector.v12 < -2, weight: 1.9 },
  ];

  const treeTerms = [
    { label: "Amount intensity", impact: clamp(vector.amount / 6000, 0, 2) * 0.72 },
    { label: "V14 deviation", impact: clamp(Math.max(-vector.v14, 0) / 3, 0, 2.5) * 1.25 },
    { label: "V4 elevation", impact: clamp(Math.max(vector.v4, 0) / 3, 0, 2.5) * 0.62 },
    { label: "V12 deviation", impact: clamp(Math.max(-vector.v12, 0) / 3, 0, 2.5) * 0.84 },
    { label: "V10 deviation", impact: clamp(Math.max(-vector.v10, 0) / 4, 0, 2) * 0.58 },
    { label: "Off-hours timing", impact: vector.time % 86400 < 18000 ? 0.38 : 0 },
  ];

  const ruleBoost = rules.reduce((sum, rule) => sum + (rule.active ? rule.weight : 0), 0);
  const baseLogOdds = -3.75 + treeTerms.reduce((sum, term) => sum + term.impact, 0);
  const amplifiedLogOdds = baseLogOdds + (ruleBoost > 0 ? Math.expm1(ruleBoost * 0.32) : 0);
  const hardRuleTriggered = rules.some((rule) => rule.active);
  const probability = clamp(sigmoid(amplifiedLogOdds), 0.01, 0.99);
  const riskScore = Math.round((hardRuleTriggered ? Math.max(probability, 0.96) : probability) * 100);
  const safeThreshold = clamp(threshold, 0.05, 0.95);
  const status: FraudStatus = hardRuleTriggered ? "Blocked" : probability >= safeThreshold ? "Flagged" : "Cleared";

  const signals = [
    ...rules.filter((rule) => rule.active).map((rule) => ({ label: rule.label, impact: rule.weight })),
    ...treeTerms.filter((term) => term.impact > 0.2),
  ].sort((a, b) => b.impact - a.impact).slice(0, 4);

  return { riskScore, probability, status, hardRuleTriggered, signals };
}

export function calculateClassificationMetrics(
  rows: Array<{ riskScore: number; status: string }>,
  threshold: number,
) {
  const cutoff = clamp(threshold, 0.05, 0.95) * 100;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const row of rows) {
    const predicted = row.riskScore >= cutoff;
    const actual = row.status === "Flagged" || row.status === "Blocked";
    if (predicted && actual) tp += 1;
    else if (predicted) fp += 1;
    else if (actual) fn += 1;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, cutoff, positives: tp + fp };
}
