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
    const levelStr = riskLevel.toUpperCase();
    const zone = explanation?.zone || 'the facility';
    let s1 = `Anomalous telemetry detected in ${zone} indicates a ${levelStr} safety deviation.`;
    if (riskLevel === 'low') {
      s1 = `Continuous monitoring across ${zone} indicates nominal operational parameters.`;
    } else if (riskLevel === 'medium') {
      s1 = `Elevated operational risk detected within ${zone}.`;
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
         s2 = `Minor deviations (e.g., ${factors}) remain well within acceptable safety thresholds (Risk Index: ${riskScore}/100).`;
      } else {
         s2 = `The convergence of ${factors} has accelerated the compound risk index to ${riskScore}/100.`;
      }
    } else if (alerts.length > 0) {
       s2 = `Correlated sensor alerts have increased the compound risk index to ${riskScore}/100.`;
    } else if (riskLevel === 'low') {
       s2 = `All safety metrics are stable (Risk Index: ${riskScore}/100).`;
    }

    // 3. Actions / Recommendations & 4. Confidence
    let s3 = '';
    if (['critical', 'high'].includes(riskLevel) && emergencyActions.length > 0) {
      const dispatched = emergencyActions.length;
      s3 = `Automated emergency protocols have been engaged, dispatching ${dispatched} mitigation directive${dispatched === 1 ? '' : 's'} with ${Math.round(confidence)}% diagnostic confidence.`;
    } else if (recommendations.length > 0) {
      const rec = recommendations[0].message;
      s3 = `Recommended operator intervention: ${rec} (Diagnostic confidence: ${Math.round(confidence)}%).`;
    } else if (riskLevel === 'low') {
      s3 = `Standard operational procedures govern current state (Diagnostic confidence: ${Math.round(confidence)}%).`;
    }

    return [s1, s2, s3].filter(Boolean).join(' ');
  }, [assessment, explanation, alerts, recommendations, emergencyActions, supervisorSnapshot]);

  return (
    <p className={cn("text-sm text-[var(--sf-text-secondary)] leading-relaxed", className)}>
      {report}
    </p>
  );
}
