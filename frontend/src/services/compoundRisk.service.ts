import { createService } from './base.service';
import type { CompoundRiskAssessment, RiskExplanation, RiskScoreCalculationResult, RiskStatus, ZoneRiskResult } from '@/types';
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

  return {
    risk_score: worst?.score ?? 0,
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
    explanation: null,
    contributing_factors: worst.contributing_factors,
  };
}

export const compoundRiskService = {
  /** Runs the compound risk engine and reduces it to a single overall assessment. */
  getAssessment: async (options?: RequestOptions): Promise<CompoundRiskAssessment> => {
    const { data } = await base.post<RiskScoreCalculationResult>('calculate', undefined, {
      ...options,
      params: { persist: false },
    });
    return toCompoundRiskAssessment(data);
  },

  /** Runs the compound risk engine and returns the highest-risk zone's triggered rules and contributing factors. */
  getExplanation: async (options?: RequestOptions): Promise<RiskExplanation | null> => {
    const { data } = await base.post<RiskScoreCalculationResult>('calculate', undefined, {
      ...options,
      params: { persist: false },
    });
    return toRiskExplanation(data);
  },
};
