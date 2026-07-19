import { useState } from 'react';
import { BrainCircuit, ListChecks, SlidersHorizontal, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { ConfidenceMeter } from '@/features/ai-supervisor/components/ConfidenceMeter';
import { AIStatusBadge } from '@/features/ai-supervisor/components/AIStatusBadge';
import type { CompoundRiskAssessment, RiskExplanation } from '@/types';
import type { AISupervisorSnapshot } from '@/features/ai-supervisor/types';

export interface AIExplainabilityCardProps {
  assessment: CompoundRiskAssessment | null;
  explanation: RiskExplanation | null;
  supervisorSnapshot: AISupervisorSnapshot | null;
  className?: string;
}

export function AIExplainabilityCard({
  assessment,
  explanation,
  supervisorSnapshot,
  className,
}: AIExplainabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const riskLevel = assessment?.risk_level ?? 'low';
  const triggeredRules = explanation?.triggered_rules ?? [];
  const contributingFactors = explanation?.contributing_factors ?? [];
  const textExplanation = explanation?.explanation ?? 'AI is continuously monitoring telemetry across all zones. No significant anomalies detected.';

  return (
    <Card className={cn("flex flex-col overflow-hidden bg-[var(--sf-surface-card)] border-[var(--sf-border-default)] shadow-sm", className)}>
      {/* Header / Summary State */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--sf-border-default)] bg-[var(--sf-surface-base)]/50">
        
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--sf-text-secondary)]">AI Explainability</h2>
            <Badge variant={SEVERITY_BADGE_VARIANT[riskLevel]} size="sm" dot pulsing={riskLevel === 'critical'}>
              {capitalise(riskLevel)} Risk
            </Badge>
          </div>
          <p className="text-base font-medium text-[var(--sf-text-primary)] leading-relaxed">
            {textExplanation}
          </p>
        </div>

        <div className="flex items-center gap-6 md:min-w-[280px]">
          {supervisorSnapshot && (
            <div className="flex-1 hidden md:block">
              <ConfidenceMeter confidence={supervisorSnapshot.overallConfidence} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--sf-text-primary)] bg-[var(--sf-surface-hover)] hover:bg-[var(--sf-surface-active)] transition-colors border border-[var(--sf-border-default)]"
          >
            {isExpanded ? 'Hide Technical Details' : 'View Technical Details'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visible Content: Key Contributing Factors (Always Visible) */}
      {contributingFactors.length > 0 && (
        <div className="p-5 flex flex-col gap-3 bg-[var(--sf-surface-card)] animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--sf-text-tertiary)]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Key Contributing Factors
          </div>
          <div className="flex flex-wrap gap-2">
            {contributingFactors.map((factor) => (
              <div key={factor.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)] text-sm">
                <span className="font-medium text-[var(--sf-text-primary)]">{factor.name.replace(/_/g, ' ')}</span>
                <span className={cn("font-mono font-bold text-xs", factor.points > 20 ? "text-danger-400" : factor.points > 10 ? "text-caution-400" : "text-[var(--sf-text-secondary)]")}>
                  +{factor.points.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Reasoning Details */}
      {isExpanded && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[var(--sf-surface-card)] animate-in slide-in-from-top-4 duration-300">
          
          {/* Left Column: Rules & Logic */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] border-b border-[var(--sf-border-default)] pb-2">
              <ListChecks className="w-4 h-4" />
              Triggered Rules ({triggeredRules.length})
            </div>
            {triggeredRules.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-[var(--sf-text-tertiary)] p-4 rounded-xl bg-[var(--sf-surface-base)]/50 border border-dashed border-[var(--sf-border-default)] shadow-none">
                <AlertCircle className="w-4 h-4 opacity-50" /> No rules triggered.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {triggeredRules.map((rule) => (
                  <li key={rule.name} className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]">
                    <span className="text-sm font-medium text-[var(--sf-text-primary)] capitalize">{rule.name.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-[var(--sf-text-tertiary)] leading-relaxed">{rule.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Column: Weights & AI State */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--sf-border-default)] pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">
                <SlidersHorizontal className="w-4 h-4" />
                Evidence & Telemetry ({contributingFactors.length})
              </div>
              {supervisorSnapshot && (
                <AIStatusBadge kind="processing" value={supervisorSnapshot.processingState} size="sm" />
              )}
            </div>

            {contributingFactors.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-[var(--sf-text-tertiary)] p-4 rounded-xl bg-[var(--sf-surface-base)]/50 border border-dashed border-[var(--sf-border-default)] shadow-none">
                <AlertCircle className="w-4 h-4 opacity-50" /> No factors contributed.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {contributingFactors.map((factor) => (
                  <li key={factor.name} className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--sf-text-primary)] capitalize">{factor.name.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-[var(--sf-text-tertiary)] leading-relaxed">{factor.detail}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right bg-[var(--sf-surface-base)] px-2 py-1 rounded-md border border-[var(--sf-border-default)]">
                      <span className={cn("text-sm font-mono font-bold", factor.points > 20 ? "text-danger-400" : factor.points > 10 ? "text-caution-400" : "text-[var(--sf-text-primary)]")}>
                        +{factor.points.toFixed(1)} pts
                      </span>
                      <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">wt {factor.weight}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </Card>
  );
}
