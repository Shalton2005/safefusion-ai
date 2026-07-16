/**
 * ExplainableAIPanel
 *
 * Expandable, five-section explainability panel for a single AI
 * Supervisor decision: Decision Summary, Evidence, Detected Hazards,
 * Applicable Safety Rules, and Recommended Actions. Each section is a
 * `Collapsible` (mirrors `IncidentReportViewer`'s pattern).
 *
 * Purely props-driven — accepts `ExplainableAIData` from any source,
 * not just this feature's own `AIDecision` type, so it can be dropped
 * in against a real explainability API once one exists. Today, feed
 * it via `aiSupervisorService.toExplainableAIData(decision)`.
 *
 * @example
 * <ExplainableAIPanel data={aiSupervisorService.toExplainableAIData(decision)} />
 */

import { FileSearch2, ShieldAlert, ClipboardCheck, ListChecks } from 'lucide-react';
import { Badge, Collapsible, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise, formatDateTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { ExplainableAIData } from '../types';

export interface ExplainableAIPanelProps {
  data: ExplainableAIData | null;
  className?: string;
}

export function ExplainableAIPanel({ data, className }: ExplainableAIPanelProps) {
  if (!data) {
    return (
      <EmptyState
        icon={FileSearch2}
        title="No decision selected"
        description="Select a decision to see its full explainability breakdown."
        size="sm"
        className={className}
      />
    );
  }

  const { summary, evidence, detectedHazards, applicableRules, recommendedActions } = data;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Decision Summary */}
      <Collapsible
        title="Decision Summary"
        defaultOpen
        action={
          <Badge variant={SEVERITY_BADGE_VARIANT[summary.severity]} size="sm" dot pulsing={summary.severity === 'critical'}>
            {capitalise(summary.severity)}
          </Badge>
        }
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Decision</dt>
            <dd className="text-[var(--sf-text-primary)] leading-relaxed mt-0.5">{capitalise(summary.title)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Zone</dt>
            <dd className="text-[var(--sf-text-primary)] mt-0.5">{summary.zone ?? 'Plant-wide'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Confidence</dt>
            <dd className="text-[var(--sf-text-primary)] font-mono mt-0.5">{summary.confidence}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Timestamp</dt>
            <dd className="text-[var(--sf-text-primary)] mt-0.5">{formatDateTime(summary.timestamp)}</dd>
          </div>
        </dl>
      </Collapsible>

      {/* Evidence */}
      <Collapsible title="Evidence" description={`${evidence.length} item${evidence.length === 1 ? '' : 's'}`}>
        {evidence.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No supporting evidence recorded.</p>
        ) : (
          <dl className="flex flex-col gap-2">
            {evidence.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-[var(--sf-text-tertiary)]">{item.label}</dt>
                <dd className="text-[var(--sf-text-primary)] text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Collapsible>

      {/* Detected Hazards */}
      <Collapsible
        title="Detected Hazards"
        description={`${detectedHazards.length} hazard${detectedHazards.length === 1 ? '' : 's'}`}
      >
        {detectedHazards.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No hazards detected for this decision.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {detectedHazards.map((hazard, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--sf-surface-sunken)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)]">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                    {hazard.label}
                  </span>
                  <Badge variant={SEVERITY_BADGE_VARIANT[hazard.severity]} size="sm">
                    {capitalise(hazard.severity)}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--sf-text-secondary)]">{hazard.description}</p>
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {/* Applicable Safety Rules */}
      <Collapsible
        title="Applicable Safety Rules"
        description={`${applicableRules.length} rule${applicableRules.length === 1 ? '' : 's'}`}
      >
        {applicableRules.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No safety rules applied to this decision.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {applicableRules.map((rule, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--sf-surface-sunken)]">
                <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)]">
                  <ClipboardCheck className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                  {rule.code}
                </span>
                <p className="text-sm text-[var(--sf-text-secondary)]">{rule.description}</p>
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {/* Recommended Actions */}
      <Collapsible
        title="Recommended Actions"
        description={`${recommendedActions.length} action${recommendedActions.length === 1 ? '' : 's'}`}
      >
        {recommendedActions.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No actions recommended for this decision.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendedActions.map((action, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--sf-surface-sunken)]">
                <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)]">
                  <ListChecks className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                  {capitalise(action.label)}
                </span>
                <p className="text-sm text-[var(--sf-text-secondary)]">{action.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </Collapsible>
    </div>
  );
}
