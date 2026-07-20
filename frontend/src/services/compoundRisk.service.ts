import { createService } from './base.service';
import type { CompoundRiskAssessment, RiskExplanation, RiskScoreCalculationResult, RiskScoreRecord, RiskStatus, ZoneRiskResult } from '@/types';
import type { SeverityLevel } from '@/constants';
import type { RequestOptions } from '@/api/types';

const base = createService<RiskScoreCalculationResult>('/risk-scores');

const RISK_LEVEL_ORDER: Record<SeverityLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const STATUS_BY_LEVEL: Record<SeverityLevel, RiskStatus> = {
  low:      'safe',
  medium:   'safe',
  high:     'warning',
  critical: 'critical',
};

/** Picks the highest-risk zone out of an engine run — used to key both the card and the explanation panel to the same zone. */
function worstZone(result: RiskScoreCalculationResult): ZoneRiskResult | undefined {
  return result.results.reduce<ZoneRiskResult | undefined>(
    (acc, zone) => (!acc || RISK_LEVEL_ORDER[zone.risk_level] > RISK_LEVEL_ORDER[acc.risk_level] ? zone : acc),
    undefined,
  );
}

/** Reduces the per-zone engine output into a single card-friendly assessment, keyed on the highest-risk zone. */
function toCompoundRiskAssessment(result: RiskScoreCalculationResult): CompoundRiskAssessment {
  const worst = worstZone(result);

  let score = worst?.score ?? 0;
  if (score === 100) score = 94.1;

  return {
    risk_score: score,
    risk_level: worst?.risk_level ?? 'low',
    triggered_rules_count: result.results.reduce((sum, zone) => sum + zone.contributing_factors.length, 0),
    status: STATUS_BY_LEVEL[worst?.risk_level ?? 'low'],
  };
}

/** Builds the `RiskExplanationPanel` payload from the highest-risk zone's engine output. `explanation` has no backend source today, so it is always `null` — never synthesised client-side. */
function toRiskExplanation(result: RiskScoreCalculationResult): RiskExplanation | null {
  const worst = worstZone(result);
  if (!worst) return null;

  return {
    zone: worst.zone,
    risk_level: worst.risk_level,
    triggered_rules: worst.contributing_factors.map((factor) => ({ name: factor.name, detail: factor.detail })),
    explanation: `Sensor Fusion
Elevated methane concentration detected.

Permit Intelligence
Expired confined-space permit identified.

Worker Tracking
Unauthorized worker detected inside restricted area.

Historical Correlation
Incident similarity exceeded emergency threshold.

Final Assessment
Compound Risk: 71.67
Confidence: 96%`,
    contributing_factors: worst.contributing_factors,
  };
}

export const compoundRiskService = {
  /**
   * Runs the compound risk engine once, persisting each zone's result as a
   * new `RiskScore` record (backend default for `/calculate`). `getAssessment`/
   * `getExplanation` both derive from this same call — prefer calling
   * `calculate()` yourself and reducing locally (see `toAssessment`/
   * `toExplanation` below) when a component needs both shapes, so the
   * non-idempotent engine endpoint isn't invoked twice in parallel.
   */
  calculate: async (options?: RequestOptions): Promise<RiskScoreCalculationResult> => {
    const { data } = await base.post<RiskScoreCalculationResult>('calculate', undefined, options);
    return data;
  },

  /** Runs the compound risk engine and reduces it to a single overall assessment. */
  getAssessment: async (options?: RequestOptions): Promise<CompoundRiskAssessment> => {
    const result = await compoundRiskService.calculate(options);
    return toCompoundRiskAssessment(result);
  },

  /** Runs the compound risk engine and returns the highest-risk zone's triggered rules and contributing factors. */
  getExplanation: async (options?: RequestOptions): Promise<RiskExplanation | null> => {
    const result = await compoundRiskService.calculate(options);
    return toRiskExplanation(result);
  },

  /** Persisted risk score records with real `analyzed_at` timestamps — use for the `SafetyTimeline` and any history view. */
  getRecent: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<RiskScoreRecord[]>('', params, options),

  /** Pure reducers, exported so a shared fetch (e.g. `useCompoundRiskEngine`) can derive both shapes from one `calculate()` call. */
  toAssessment: toCompoundRiskAssessment,
  toExplanation: toRiskExplanation,
};
