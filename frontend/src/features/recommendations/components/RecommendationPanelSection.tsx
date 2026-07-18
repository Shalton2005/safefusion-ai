import { ClipboardList } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { RecommendationPanel } from './RecommendationPanel';
import type { Recommendation } from '@/types';

export interface RecommendationPanelSectionViewProps {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational recommendations section — accepts already-fetched
 * recommendations so a parent can share a single `useRecommendations()`
 * call across sibling sections instead of each one polling
 * `GET /recommendations` independently. Use `RecommendationPanelSection`
 * below for standalone, self-fetching usage.
 */
export function RecommendationPanelSectionView({
  recommendations,
  loading,
  error,
  lastUpdated,
  refresh,
  className,
}: RecommendationPanelSectionViewProps) {
  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Recommendations"
        description="Ordered operator recommendations from the Compound Risk, Emergency Response, and Compliance engines."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && recommendations.length > 0 && (
            <Badge variant="primary" size="sm" dot>
              {recommendations.length} recommendation{recommendations.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />
      <div className="p-4 flex flex-col gap-2">
        <QueryState
          loading={loading}
          error={error}
          data={recommendations}
          onRetry={refresh}
          errorTitle="Failed to load recommendations"
          isEmpty={(r) => r.length === 0}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No recommendations"
              description="No operator recommendations are currently outstanding."
            />
          }
        >
          {(recommendationData) => <RecommendationPanel recommendations={recommendationData} />}
        </QueryState>
        {!error && <LastUpdated timestamp={lastUpdated} className="px-1" />}
      </div>
    </Card>
  );
}
