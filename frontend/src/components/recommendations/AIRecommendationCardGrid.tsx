/**
 * AIRecommendationCardGrid
 *
 * Responsive grid of `AIRecommendationCard`s — 1 column on mobile, 2 on
 * `sm:`, 3 on `xl:`. Shows an `EmptyState` when there are no
 * recommendations. Purely presentational; pass whatever list of
 * `AIRecommendation`s the caller already has (any ordering is
 * preserved as given — this component never re-sorts).
 *
 * @example
 * <AIRecommendationCardGrid recommendations={recommendations} />
 */

import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { AIRecommendationCard } from './AIRecommendationCard';
import type { AIRecommendation } from './types';

export interface AIRecommendationCardGridProps {
  recommendations: AIRecommendation[];
  className?: string;
}

export function AIRecommendationCardGrid({ recommendations, className }: AIRecommendationCardGridProps) {
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
