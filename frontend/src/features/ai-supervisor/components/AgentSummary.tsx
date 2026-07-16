/**
 * AgentSummary
 *
 * Single supervised-agent row: name, status badge, last update, and
 * confidence. Purely presentational — pass an `AIAgentSummary` from
 * `useAISupervisor`.
 *
 * @example
 * <AgentSummary agent={snapshot.agents[0]} />
 */

import { Bot } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LastUpdated } from '@/components/common/LastUpdated';
import { AIStatusBadge } from './AIStatusBadge';
import type { AIAgentSummary } from '../types';

export interface AgentSummaryProps {
  agent: AIAgentSummary;
  className?: string;
}

export function AgentSummary({ agent, className }: AgentSummaryProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg',
        'bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)]',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600/15 text-primary-400">
          <Bot className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{agent.label}</p>
          <LastUpdated timestamp={agent.lastUpdated} />
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-[var(--sf-text-tertiary)] font-mono" title="Confidence">
          {agent.confidence}%
        </span>
        <span className="text-xs text-[var(--sf-text-tertiary)] font-mono">
          {agent.findingCount} finding{agent.findingCount === 1 ? '' : 's'}
        </span>
        <AIStatusBadge kind="agent" value={agent.status} />
      </div>
    </div>
  );
}
