import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { formatLabel } from '@/utils/format';
import type { CompoundRiskAssessment, RiskExplanation, AlertRecord, Recommendation, EmergencyActionItem } from '@/types';
import type { AISupervisorSnapshot } from '@/features/ai-supervisor/types';

export interface AISituationReportProps {
  assessment?: CompoundRiskAssessment | null;
  explanation?: RiskExplanation | null;
  alerts?: AlertRecord[];
  recommendations?: Recommendation[];
  emergencyActions?: EmergencyActionItem[];
  supervisorSnapshot?: AISupervisorSnapshot | null;
  className?: string;
}

export function AISituationReport({
  assessment,
  explanation,
  alerts = [],
  recommendations = [],
  emergencyActions = [],
  supervisorSnapshot,
  className,
}: AISituationReportProps) {
  const report = useMemo(() => {
    const riskLevel = assessment?.risk_level ?? 'low';
    const riskScore = assessment?.risk_score ?? 0;
    /** `null` while the AI Supervisor snapshot hasn't reported yet — never a fabricated placeholder value. */
    const confidence = supervisorSnapshot?.overallConfidence ?? null;

    // 1. Verdict & Location
    const zone = explanation?.zone || 'the facility';
    let s1 = `Critical sensor fusion detected multiple simultaneous safety violations in ${zone}.`;
    if (riskLevel === 'low') {
      s1 = `Continuous monitoring across ${zone} confirms stable operational parameters.`;
    } else if (riskLevel === 'medium') {
      s1 = `Sensor fusion detected elevated operational risk within ${zone}.`;
    } else if (riskLevel === 'high') {
      s1 = `Sensor fusion detected multiple safety violations in ${zone}.`;
    }

    // 2. Contributing Factors
    let s2 = '';
    const rules = explanation?.triggered_rules || [];
    if (rules.length > 0) {
      const ruleNames = rules.map(r => formatLabel(r.name).toLowerCase());
      let factors = '';
      if (ruleNames.length === 1) {
        factors = ruleNames[0];
      } else if (ruleNames.length === 2) {
        factors = `${ruleNames[0]} and ${ruleNames[1]}`;
      } else {
        factors = `${ruleNames.slice(0, -1).join(', ')}, and ${ruleNames[ruleNames.length - 1]}`;
      }
      
      if (riskLevel === 'low') {
         s2 = `Minor deviations (${factors}) remain within acceptable thresholds (Risk Score: ${riskScore}).`;
      } else {
         s2 = `${factors.charAt(0).toUpperCase() + factors.slice(1)} increased the compound risk score to ${riskScore}.`;
      }
    } else if (alerts.length > 0) {
       s2 = `Correlated sensor alerts increased the compound risk score to ${riskScore}.`;
    } else if (riskLevel === 'low') {
       s2 = `All safety metrics are stable (Risk Score: ${riskScore}).`;
    }

    // 3. Actions / Recommendations & Confidence
    let s3 = '';
    const confStr = confidence !== null ? ` with ${Math.round(confidence)}% AI confidence` : '';
    const confStrStandalone = confidence !== null ? ` AI confidence: ${Math.round(confidence)}%.` : '';
    
    if (['critical', 'high'].includes(riskLevel) && emergencyActions.length > 0) {
      s3 = `Emergency response protocols were automatically activated${confStr}.`;
    } else if (recommendations.length > 0) {
      s3 = `Recommended operator intervention generated${confStr}.`;
    } else if (riskLevel === 'low') {
      s3 = `No intervention required.${confStrStandalone}`;
    }

    return [s1, s2, s3].filter(Boolean).join(' ');
  }, [assessment, explanation, alerts, recommendations, emergencyActions, supervisorSnapshot]);

  return (
    <p className={cn("text-sm text-[var(--sf-text-secondary)] leading-relaxed", className)}>
      {report}
    </p>
  );
}
