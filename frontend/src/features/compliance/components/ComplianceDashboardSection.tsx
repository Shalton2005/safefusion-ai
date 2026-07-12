import { ShieldQuestion, RotateCw } from 'lucide-react';
import { Card, CardHeader, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { ComplianceDashboard } from './ComplianceDashboard';
import type { ComplianceStatusSnapshot } from '@/types';

export interface ComplianceDashboardSectionViewProps {
  snapshot: ComplianceStatusSnapshot | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational compliance section — accepts an already-fetched snapshot
 * so a parent can share a single `useComplianceStatus()` call across
 * sibling sections instead of each one polling `GET /compliance/status`
 * independently. Use `ComplianceDashboardSection` below for standalone,
 * self-fetching usage.
 */
export function ComplianceDashboardSectionView({
  snapshot,
  loading,
  error,
  lastUpdated,
  refresh,
  className,
}: ComplianceDashboardSectionViewProps) {
  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Compliance Dashboard"
        description="Plant-wide compliance status against Factory Act, OISD, and DGMS regulations."
        className="px-6 pt-5 pb-0"
      />
      <div className="p-4 flex flex-col gap-2">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load compliance status"
            actions={
              <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading || !snapshot ? (
          <Skeleton className="h-[7.5rem] rounded-xl" />
        ) : snapshot.incident_count === 0 ? (
          <EmptyState
            icon={ShieldQuestion}
            title="No incidents evaluated"
            description="No detected incidents are available for compliance evaluation yet."
          />
        ) : (
          <ComplianceDashboard snapshot={snapshot} />
        )}
        {!error && <LastUpdated timestamp={lastUpdated} className="px-1" />}
      </div>
    </Card>
  );
}

export interface ComplianceDashboardSectionProps {
  className?: string;
}

/** Standalone, self-fetching `ComplianceDashboardSection` — fetches its own `GET /compliance/status` data. Use `ComplianceDashboardSectionView` instead when the data is already fetched elsewhere on the page. */
export function ComplianceDashboardSection({ className }: ComplianceDashboardSectionProps) {
  const { snapshot, loading, error, lastUpdated, refresh } = useComplianceStatus();
  return (
    <ComplianceDashboardSectionView
      snapshot={snapshot}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
