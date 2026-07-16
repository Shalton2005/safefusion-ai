/**
 * ExplainDecisionPanel
 *
 * Detail panel explaining a single selected `AIDecision` — which
 * agent made it, the zone/severity, and the backend-authored
 * explanation text. Shows an empty state until a decision is
 * selected (see `DecisionTimeline`'s `onSelect`).
 *
 * @example
 * <ExplainDecisionPanel decision={selectedDecision} />
 */

import { MessageSquareText } from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { AIDecision } from '../types';

export interface ExplainDecisionPanelProps {
  decision: AIDecision | null;
  className?: string;
}

export function ExplainDecisionPanel({ decision, className }: ExplainDecisionPanelProps) {
  if (!decision) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No decision selected"
        description="Select a decision from the timeline to see why the AI Supervisor made it."
        size="sm"
        className={className}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            {decision.agentLabel}
            {decision.zone ? ` · ${decision.zone}` : ''}
          </p>
          <h4 className="mt-0.5 text-base font-semibold text-[var(--sf-text-primary)]">
            {capitalise(decision.title)}
          </h4>
        </div>
        <Badge variant={SEVERITY_BADGE_VARIANT[decision.severity]} size="sm" dot pulsing={decision.severity === 'critical'}>
          {capitalise(decision.severity)}
        </Badge>
      </div>

      <div className="rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)] p-3">
        <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">{decision.explanation}</p>
      </div>

      <p className="text-2xs text-[var(--sf-text-tertiary)]">
        {decision.isTimeApproximate ? 'As of ' : 'Recorded '}
        {formatRelativeTime(decision.timestamp)}
      </p>
    </div>
  );
}
