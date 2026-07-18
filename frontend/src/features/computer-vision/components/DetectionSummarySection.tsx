/**
 * DetectionSummarySection
 *
 * Plant-wide (or zone-scoped) KPI rollup for the CCTV Monitoring page —
 * active cameras, detections in the last 24h, open hazards, and PPE
 * compliance rate. Same `StatCard` grid pattern as `KpiCardGrid`.
 */

import { AlertTriangle, Camera as CameraIcon, Gauge, HardHat, ScanEye } from 'lucide-react';
import { EmptyState, QueryState, StatCard } from '@/components/ui';
import { useDetectionSummary } from '../hooks';
import type { DetectionSummary } from '../types';

export interface DetectionSummarySectionProps {
  zone?: string;
}

export function DetectionSummarySection({ zone }: DetectionSummarySectionProps) {
  const { summary, loading, error, refetch } = useDetectionSummary(zone);

  return (
    <QueryState<DetectionSummary>
      loading={loading}
      error={error}
      data={summary}
      onRetry={refetch}
      errorTitle="Failed to load detection summary"
      isEmpty={(d) => d.totalCameras === 0}
      emptyState={
        <EmptyState
          icon={Gauge}
          title="No summary data"
          description="No cameras have been configured for this zone yet."
        />
      }
      loadingFallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading detection summary">
          <StatCard label="Active Cameras" value="" icon={CameraIcon} iconVariant="primary" loading />
          <StatCard label="Detections (24h)" value="" icon={ScanEye} iconVariant="primary" loading />
          <StatCard label="Open Hazards" value="" icon={AlertTriangle} iconVariant="danger" loading />
          <StatCard label="PPE Compliance" value="" icon={HardHat} iconVariant="warning" loading />
        </div>
      }
    >
      {(data) => (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Detection summary">
          <StatCard
            label="Active Cameras"
            value={`${data.activeCameras}/${data.totalCameras}`}
            icon={CameraIcon}
            iconVariant="primary"
          />
          <StatCard
            label="Detections (24h)"
            value={data.detectionsLast24h}
            icon={ScanEye}
            iconVariant="primary"
          />
          <StatCard
            label="Open Hazards"
            value={data.openHazards}
            icon={AlertTriangle}
            iconVariant={data.openHazards > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label="PPE Compliance"
            value={`${data.ppeComplianceRate}%`}
            icon={HardHat}
            iconVariant={data.ppeComplianceRate < 90 ? 'warning' : 'success'}
          />
        </div>
      )}
    </QueryState>
  );
}
