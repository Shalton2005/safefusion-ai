import { ShieldQuestion } from 'lucide-react';
import { Card, CardHeader, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
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
        <QueryState
          loading={loading}
          error={error}
          data={snapshot}
          onRetry={refresh}
          errorTitle="Failed to load compliance status"
          isEmpty={(s) => s.incident_count === 0}
          emptyState={
            <EmptyState
              icon={ShieldQuestion}
              title="No incidents evaluated"
              description="No detected incidents are available for compliance evaluation yet."
            />
          }
          loadingFallback={<Skeleton className="h-[7.5rem] rounded-xl" />}
        >
          {(snapshotData) => <ComplianceDashboard snapshot={snapshotData} />}
        </QueryState>
        {!error && <LastUpdated timestamp={lastUpdated} className="px-1" />}
      </div>
    </Card>
  );
}
