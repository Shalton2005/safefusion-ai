import { useMemo } from 'react';
import { cn } from '@/lib/cn';
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
    const zone = explanation?.zone || 'plant-wide';
    let s1 = `SafeFusion AI has detected a ${levelStr} risk incident in the ${zone} area.`;
    if (riskLevel === 'low') {
      s1 = `SafeFusion AI is actively monitoring the ${zone} area with no significant risk detected.`;
    } else if (riskLevel === 'medium') {
      s1 = `SafeFusion AI has detected an ELEVATED risk in the ${zone} area.`;
    }

    // 2. Contributing Factors
    let s2 = '';
    const rules = explanation?.triggered_rules || [];
    if (rules.length > 0) {
      const ruleNames = rules.map(r => r.name.toLowerCase().replace(/_/g, ' '));
      let factors = '';
      if (ruleNames.length === 1) {
        factors = ruleNames[0];
      } else if (ruleNames.length === 2) {
        factors = `${ruleNames[0]} and ${ruleNames[1]}`;
      } else {
        factors = `${ruleNames.slice(0, -1).join(', ')}, and ${ruleNames[ruleNames.length - 1]}`;
      }
      
      if (riskLevel === 'low') {
         s2 = `Minor deviations including ${factors} are being tracked but remain within safe thresholds (score: ${riskScore}/100).`;
      } else {
         s2 = `Factors including ${factors} have increased the compound risk score to ${riskScore}/100.`;
      }
    } else if (alerts.length > 0) {
       s2 = `Recent alerts indicate potential issues, bringing the compound risk score to ${riskScore}/100.`;
    } else if (riskLevel === 'low') {
       s2 = `All telemetry is nominal and the current risk score is ${riskScore}/100.`;
    }

    // 3. Actions / Recommendations
    let s3 = '';
    if (['critical', 'high'].includes(riskLevel) && emergencyActions.length > 0) {
      const dispatched = emergencyActions.length;
      s3 = `Emergency Response has dispatched ${dispatched} automated action${dispatched === 1 ? '' : 's'}.`;
    } else if (recommendations.length > 0) {
      const rec = recommendations[0].message;
      s3 = `Immediate action recommended: ${rec}.`;
    } else if (riskLevel === 'low') {
      s3 = 'Standard operational procedures should be maintained.';
    }

    // 4. Confidence
    const s4 = confidence === null ? '' : `AI confidence is ${Math.round(confidence)}%.`;

    return [s1, s2, s3, s4].filter(Boolean).join(' ');
  }, [assessment, explanation, alerts, recommendations, emergencyActions, supervisorSnapshot]);

  return (
    <p className={cn("text-sm text-[var(--sf-text-secondary)] leading-relaxed", className)}>
      {report}
    </p>
  );
}
