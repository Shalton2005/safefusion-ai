/**
 * AIAgentStatusBoard
 *
 * Responsive grid of every supervised agent (Risk, Emergency,
 * Recommendation, Compliance, Knowledge Graph, and the Supervisor
 * itself), each rendered via `AIAgentStatusCard`. Handles loading and
 * empty states directly; a fetch error is surfaced per-card through
 * each agent's own `failed` status rather than a full-board error state,
 * since a single engine failing shouldn't hide the others that are
 * still healthy.
 *
 * @example
 * const { agents, loading } = useAgentStatusBoard();
 * <AIAgentStatusBoard agents={agents} loading={loading} />
 */

import { BotOff } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { AIAgentStatusCard } from './AIAgentStatusCard';
import type { AIAgentSummary } from '../types';

export interface AIAgentStatusBoardProps {
  agents: AIAgentSummary[];
  /** True until every agent has reported at least once. Renders skeleton cards. */
  loading?: boolean;
  className?: string;
}

function AgentStatusCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)]">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-12 rounded ml-auto" />
      </div>
      <Skeleton className="h-3 w-28 rounded" />
    </div>
  );
}

export function AIAgentStatusBoard({ agents, loading = false, className }: AIAgentStatusBoardProps) {
  if (loading && agents.length === 0) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <AgentStatusCardSkeleton key={i} />
        ))}
      </div>
    );
  }

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
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
      {agents.map((agent) => (
        <AIAgentStatusCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
