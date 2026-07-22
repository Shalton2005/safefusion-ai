/**
 * DecisionTimeline
 *
 * Chronological list of decisions surfaced by the supervised agents
 * (most recent first). Each item shows its timestamp, decision type,
 * triggering agent (module), severity, confidence, and execution
 * status. Selecting a decision fires `onSelect` so a parent can drive
 * `ExplainableAIPanel`.
 *
 * Supports three explicit states in addition to the populated list:
 *  - `loading`  — skeleton rows, shown while the first fetch is in flight
 *  - `error`    — retryable alert, shown when the underlying fetch failed
 *  - empty      — shown when loading has finished with zero decisions
 *
 * @example
 * <DecisionTimeline
 *   decisions={snapshot.decisions}
 *   loading={loading}
 *   error={error}
 *   onSelect={setSelected}
 *   onRetry={refresh}
 * />
 */

import { Clock3 } from 'lucide-react';
import { Badge, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelativeTime, formatDateTime, capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, BADGE_DOT_CLASS } from '@/utils/severity';
import type { AIDecision, AIDecisionExecutionStatus, AIDecisionType } from '../types';
import { useState } from 'react';

export interface DecisionTimelineProps {
  decisions: AIDecision[];
  /** Shows skeleton rows instead of the list while the first fetch is in flight. */
  loading?: boolean;
  /** Shows a retryable error alert instead of the list when set. */
  error?: string | null;
  selectedId?: string | null;
  onSelect?: (decision: AIDecision) => void;
  /** Called when the user retries after an error. Required to show the retry button. */
  onRetry?: () => void;
  className?: string;
}

const DECISION_TYPE_LABEL: Record<AIDecisionType, string> = {
  risk_assessment: 'Risk Assessment',
  emergency_action: 'Emergency Action',
  recommendation: 'Recommendation',
  compliance_violation: 'Compliance Violation',
};

const EXECUTION_STATUS_LABEL: Record<AIDecisionExecutionStatus, string> = {
  executed: 'Executed',
  pending: 'Pending',
  flagged: 'Flagged',
  logged: 'Logged',
};

const EXECUTION_STATUS_VARIANT: Record<AIDecisionExecutionStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  executed: 'success',
  pending: 'warning',
  flagged: 'danger',
  logged: 'secondary',
};

const SKELETON_ROW_COUNT = 4;

function DecisionTimelineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export function DecisionTimeline({
  decisions,
  loading = false,
  error = null,
  selectedId,
  onSelect,
  onRetry,
  className,
}: DecisionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <QueryState<AIDecision[]>
      loading={loading}
      error={error}
      data={decisions}
      onRetry={onRetry}
      errorTitle="Failed to load decision timeline"
      className={className}
      isEmpty={(d) => d.length === 0}
      emptyState={
        <EmptyState
          icon={Clock3}
          title="No decisions yet"
          description="Agent decisions will appear here as they are made."
          size="sm"
          className={className}
        />
      }
      loadingFallback={<DecisionTimelineSkeleton className={className} />}
    >
      {(data) => {
        // Group similar consecutive events
        const groupedData = data.reduce((acc, current) => {
          if (acc.length === 0) {
            acc.push({ ...current, count: 1 });
            return acc;
          }
          const last = acc[acc.length - 1];
          if (last.title === current.title) {
            last.count += 1;
          } else {
            acc.push({ ...current, count: 1 });
          }
          return acc;
        }, [] as (AIDecision & { count: number })[]);

        const displayData = isExpanded ? groupedData : groupedData.slice(0, 5);
        const hasMore = groupedData.length > 5;

        return (
          <div className={cn("flex flex-col h-full", className)}>
            <ol className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1 min-h-0">
              {displayData.map((decision) => {
                const isSelected = decision.id === selectedId;
                
                let displayTitle = capitalise(decision.title);
                if (decision.count > 1) {
                  const lowerTitle = decision.title.toLowerCase();
                  if (lowerTitle.includes('notify')) {
                    displayTitle = `${decision.count} Teams Notified`;
                  } else if (lowerTitle.includes('generate incident')) {
                    displayTitle = `Incident Report Generated`;
                  } else {
                    displayTitle = `${decision.count}x ${displayTitle}`;
                  }
                }

                return (
                  <li key={decision.id}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(decision)}
                      aria-current={isSelected ? 'true' : undefined}
                      title={formatDateTime(decision.timestamp)}
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
                          className={cn('w-2 h-2 rounded-full', BADGE_DOT_CLASS[SEVERITY_BADGE_VARIANT[decision.severity]])}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">
                            {displayTitle}
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

                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" size="sm">
                            {DECISION_TYPE_LABEL[decision.decisionType]}
                          </Badge>
                          <Badge variant={EXECUTION_STATUS_VARIANT[decision.executionStatus]} size="sm">
                            {EXECUTION_STATUS_LABEL[decision.executionStatus]}
                          </Badge>
                          <span className="text-2xs text-[var(--sf-text-tertiary)] font-mono">
                            {decision.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
            {hasMore && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 py-2 text-xs font-medium text-primary-400 hover:text-primary-300 border border-transparent hover:border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] rounded-lg transition-colors flex-shrink-0"
              >
                {isExpanded ? 'Collapse Timeline' : 'View Full Timeline'}
              </button>
            )}
          </div>
        );
      }}
    </QueryState>
  );
}
