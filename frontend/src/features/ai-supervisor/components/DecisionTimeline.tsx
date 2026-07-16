/**
 * DecisionTimeline
 *
 * Chronological list of decisions surfaced by the supervised agents
 * (most recent first). Selecting a decision fires `onSelect` so a
 * parent can drive `ExplainDecisionPanel`.
 *
 * @example
 * <DecisionTimeline decisions={snapshot.decisions} onSelect={setSelected} />
 */

import { Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelativeTime, capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { AIDecision } from '../types';

export interface DecisionTimelineProps {
  decisions: AIDecision[];
  selectedId?: string | null;
  onSelect?: (decision: AIDecision) => void;
  className?: string;
}

export function DecisionTimeline({ decisions, selectedId, onSelect, className }: DecisionTimelineProps) {
  if (decisions.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No decisions yet"
        description="Agent decisions will appear here as they are made."
        size="sm"
        className={className}
      />
    );
  }

  return (
    <ol className={cn('flex flex-col gap-1', className)}>
      {decisions.map((decision) => {
        const isSelected = decision.id === selectedId;
        return (
          <li key={decision.id}>
            <button
              type="button"
              onClick={() => onSelect?.(decision)}
              aria-current={isSelected ? 'true' : undefined}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left',
                'border transition-colors duration-150',
                isSelected
                  ? 'bg-primary-600/10 border-primary-600/40'
                  : 'bg-[var(--sf-surface-raised)] border-[var(--sf-border-default)] hover:border-[var(--sf-border-strong)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              )}
            >
              <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    decision.severity === 'critical' && 'bg-danger-500',
                    decision.severity === 'high' && 'bg-caution-500',
                    decision.severity === 'medium' && 'bg-primary-400',
                    decision.severity === 'low' && 'bg-safe-500',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">
                    {capitalise(decision.title)}
                  </p>
                  <Badge variant={SEVERITY_BADGE_VARIANT[decision.severity]} size="sm">
                    {capitalise(decision.severity)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--sf-text-tertiary)] truncate">
                  {decision.agentLabel}
                  {decision.zone ? ` · ${decision.zone}` : ''}
                  {' · '}
                  {decision.isTimeApproximate ? 'as of ' : ''}
                  {formatRelativeTime(decision.timestamp)}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
