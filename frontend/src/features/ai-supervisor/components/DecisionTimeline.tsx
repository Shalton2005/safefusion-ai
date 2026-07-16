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

import { Clock3, RotateCw } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelativeTime, formatDateTime, capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { AIDecision, AIDecisionExecutionStatus, AIDecisionType } from '../types';

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
  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load decision timeline"
        actions={
          onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          )
        }
        className={className}
      >
        {error}
      </Alert>
    );
  }

  if (loading) {
    return <DecisionTimelineSkeleton className={className} />;
  }

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
  );
}
