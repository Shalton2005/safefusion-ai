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

      {/* AI Executive Summary */}
      <div className="flex flex-col gap-2 mt-2 p-4 rounded-lg bg-[var(--sf-surface-elevated)] border border-[var(--sf-border-default)] shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary-500" />
          What happened?
        </h3>
        
        <div className="text-sm text-[var(--sf-text-secondary)] space-y-2 leading-relaxed">
          <p>
            <strong className="text-red-400">Emergency detected in Boiler House.</strong><br/>
            The AI Supervisor correlated:
          </p>
          <ul className="list-disc list-inside pl-1 text-[var(--sf-text-tertiary)] text-xs grid grid-cols-2 gap-x-2">
            <li>Smoke Detection</li>
            <li>Temperature Sensors</li>
            <li>Permit Intelligence</li>
            <li>Knowledge Graph</li>
          </ul>
          <p>
            and classified the incident as <strong className="text-red-400">CRITICAL COMPOUND RISK.</strong>
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-xs font-medium text-[var(--sf-text-primary)] mb-1">Actions already executed</p>
              <ul className="text-xs text-green-400 space-y-0.5">
                <li>✓ Stop Work</li>
                <li>✓ Notify Safety Officer</li>
                <li>✓ Notify Control Room</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--sf-text-primary)] mb-1">Pending Human Approval</p>
              <div className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-1 rounded inline-block">
                Review Evacuation Recommendation
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
