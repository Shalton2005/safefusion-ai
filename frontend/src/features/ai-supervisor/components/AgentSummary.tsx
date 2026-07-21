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

import { Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AIStatusBadge } from './AIStatusBadge';
import type { AIAgentSummary } from '../types';

export interface AgentSummaryProps {
  agent: AIAgentSummary;
  className?: string;
}

function getFindingLabel(agentId: string, count: number) {
  const plural = count === 1 ? '' : 's';
  switch (agentId) {
    case 'compound_risk': return `Finding${plural}`;
    case 'emergency_response': return `Action${plural}`;
    case 'recommendation': return `Recommendation${plural}`;
    case 'compliance': return `Violation${plural}`;
    default: return `Finding${plural}`;
  }
}

export function AgentSummary({ agent, className }: AgentSummaryProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-xl',
        'bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)]',
        'hover:border-[var(--sf-border-strong)] transition-colors',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600/15 text-primary-400">
            <Bot className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[var(--sf-text-primary)]">{agent.label}</p>
        </div>
        <AIStatusBadge kind="agent" value={agent.status} />
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xl font-bold text-[var(--sf-text-primary)]">
          {agent.findingCount} <span className="text-sm font-normal text-[var(--sf-text-tertiary)]">{getFindingLabel(agent.id, agent.findingCount)}</span>
        </span>
        
        <button type="button" className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
          View Details
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
