/**
 * AISupervisorCard
 *
 * Reusable, presentational card summarising the AI Supervisor: overall
 * status, risk level, active agent count, processing state, last
 * decision time, and overall confidence. Purely props-driven — no data
 * fetching — pair with `AISupervisorCardSection` for the fetching
 * wrapper.
 *
 * @example
 * <AISupervisorCard snapshot={snapshot} />
 */

import { BrainCircuit } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { AIStatusBadge } from './AIStatusBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import type { AISupervisorSnapshot } from '../types';

export interface AISupervisorCardProps {
  snapshot: AISupervisorSnapshot;
  className?: string;
}

export function AISupervisorCard({ snapshot, className }: AISupervisorCardProps) {
  const {
    processingState,
    overallRiskLevel,
    agents,
    activeAgentCount,
    lastDecisionTime,
    overallConfidence,
  } = snapshot;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-5 rounded-xl',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        'shadow-sf-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
          AI Supervisor
        </p>
        <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600/15 text-primary-400">
          <BrainCircuit className="w-4.5 h-4.5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Status
          </span>
          <AIStatusBadge kind="processing" value={processingState} className="w-fit" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Overall Risk
          </span>
          {overallRiskLevel ? (
            <Badge variant={SEVERITY_BADGE_VARIANT[overallRiskLevel]} size="sm" dot pulsing={overallRiskLevel === 'critical'} className="w-fit">
              {capitalise(overallRiskLevel)}
            </Badge>
          ) : (
            <span className="text-sm text-[var(--sf-text-tertiary)]">—</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Active Agents
          </span>
          <span className="text-2xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
            {activeAgentCount}
            <span className="text-xs font-normal text-[var(--sf-text-tertiary)]"> / {agents.length}</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Last Decision
          </span>
          <span className="text-sm font-medium text-[var(--sf-text-primary)]">
            {lastDecisionTime ? lastDecisionTime.toLocaleTimeString() : 'No decisions yet'}
          </span>
        </div>
      </div>

      <ConfidenceMeter confidence={overallConfidence} />
    </div>
  );
}
