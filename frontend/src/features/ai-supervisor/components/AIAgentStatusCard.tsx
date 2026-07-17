/**
 * AIAgentStatusCard
 *
 * Single agent's status card: name, current status, execution time,
 * confidence, and last run. Reuses `AIStatusBadge` for status (the
 * existing `Badge`-based status colour coding — no new colour styles
 * introduced) and `LastUpdated` for the last-run timestamp.
 *
 * @example
 * <AIAgentStatusCard agent={agents[0]} />
 */

import { Bot, BrainCircuit, ClipboardCheck, ListChecks, ShieldAlert, Waypoints } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LastUpdated } from '@/components/common/LastUpdated';
import { CONFIDENCE_TIER_TEXT_CLASS, confidenceTier } from '@/utils/severity';
import { AIStatusBadge } from './AIStatusBadge';
import type { AIAgentId, AIAgentSummary } from '../types';

export interface AIAgentStatusCardProps {
  agent: AIAgentSummary;
  className?: string;
}

const AGENT_ICON: Record<AIAgentId, typeof Bot> = {
  compound_risk: ShieldAlert,
  emergency_response: Bot,
  recommendation: ListChecks,
  compliance: ClipboardCheck,
  knowledge_graph: Waypoints,
  supervisor: BrainCircuit,
};

/** Formats a millisecond duration as "412ms" below 1s, otherwise "1.2s". */
function formatExecutionTime(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function AIAgentStatusCard({ agent, className }: AIAgentStatusCardProps) {
  const Icon = AGENT_ICON[agent.id];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-xl',
        'bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] shadow-sf-card',
        className,
      )}
    >
      {/* Header: icon, name, status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg bg-primary-600/15 text-primary-400">
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug pt-1.5">{agent.label}</p>
        </div>
        <AIStatusBadge kind="agent" value={agent.status} className="flex-shrink-0" />
      </div>

      {/* Metrics: Execution Time + Confidence */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">Execution Time</span>
          <span className="text-sm font-mono font-medium text-[var(--sf-text-primary)]">
            {agent.executionTimeMs !== null ? formatExecutionTime(agent.executionTimeMs) : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end text-right">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">Confidence</span>
          <span className={cn('text-sm font-mono font-semibold', CONFIDENCE_TIER_TEXT_CLASS[confidenceTier(agent.confidence)])}>
            {agent.confidence}%
          </span>
        </div>
      </div>

      {/* Last Run */}
      <div className="pt-2 border-t border-[var(--sf-border-subtle)]">
        <LastUpdated timestamp={agent.lastUpdated} />
      </div>
    </div>
  );
}
