/**
 * AIRecommendationCardGrid
 *
 * Responsive grid of `AIRecommendationCard`s — 1 column on mobile, 2 on
 * `sm:`, 3 on `xl:`. Handles `loading`/`error`/empty states directly,
 * the same contract as its sibling AI display components
 * (`EvidenceViewer`, `AIReasoningPanel`) so callers don't each need to
 * hand-roll their own loading/error branching around it. Purely
 * presentational otherwise; pass whatever list of `AIRecommendation`s
 * the caller already has (any ordering is preserved as given — this
 * component never re-sorts).
 *
 * @example
 * <AIRecommendationCardGrid recommendations={recommendations} loading={loading} error={error} />
 */

import { AlertTriangle, Sparkles } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { AIRecommendationCard } from './AIRecommendationCard';
import type { AIRecommendation } from './types';

export interface AIRecommendationCardGridProps {
  recommendations: AIRecommendation[];
  /** True while recommendations are being fetched. Takes precedence over `error`. Renders skeleton cards. */
  loading?: boolean;
  /** Error message to display, or `null`/`undefined` when the last fetch succeeded. */
  error?: string | null;
  className?: string;
}

function RecommendationCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)]">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
      <div className="flex items-center gap-4 pt-1">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
  );
}

export function AIRecommendationCardGrid({ recommendations, loading = false, error = null, className }: AIRecommendationCardGridProps) {
  if (loading && recommendations.length === 0) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <RecommendationCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load recommendations"
        description={error}
        size="sm"
        className={className}
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No recommendations"
        description="AI-surfaced recommendations will appear here once available."
        size="sm"
        className={className}
      />
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
      {recommendations.map((recommendation) => (
        <AIRecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </div>
  );
}
