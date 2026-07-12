import { ClipboardList, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
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
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load recommendations"
            actions={
              <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : !loading && recommendations.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No recommendations"
            description="No operator recommendations are currently outstanding."
          />
        ) : (
          <RecommendationPanel recommendations={recommendations} />
        )}
        {!error && <LastUpdated timestamp={lastUpdated} className="px-1" />}
      </div>
    </Card>
  );
}

export interface RecommendationPanelSectionProps {
  className?: string;
}

/** Standalone, self-fetching `RecommendationPanelSection` — fetches its own `GET /recommendations` data. Use `RecommendationPanelSectionView` instead when the data is already fetched elsewhere on the page. */
export function RecommendationPanelSection({ className }: RecommendationPanelSectionProps) {
  const { recommendations, loading, error, lastUpdated, refresh } = useRecommendations();
  return (
    <RecommendationPanelSectionView
      recommendations={recommendations}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
