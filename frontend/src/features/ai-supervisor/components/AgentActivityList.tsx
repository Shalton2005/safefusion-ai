/**
 * AgentActivityList
 *
 * Vertical list of all supervised agents, each rendered via
 * `AgentSummary`. Shows an `EmptyState` when no agents have reported
 * yet.
 *
 * @example
 * <AgentActivityList agents={snapshot.agents} />
 */

import { BotOff } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { AgentSummary } from './AgentSummary';
import type { AIAgentSummary } from '../types';

export interface AgentActivityListProps {
  agents: AIAgentSummary[];
  className?: string;
}

export function AgentActivityList({ agents, className }: AgentActivityListProps) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={BotOff}
        title="No agents reporting"
        description="Supervised agents will appear here once they report their first result."
        size="sm"
        className={className}
      />
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {agents
        .filter((a) => ['compound_risk', 'emergency_response', 'recommendation', 'compliance'].includes(a.id))
        .slice(0, 4)
        .map((agent) => (
          <AgentSummary key={agent.id} agent={agent} />
        ))}
    </div>
  );
}
