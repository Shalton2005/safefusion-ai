/**
 * VisionSummaryWidget
 *
 * Compact Computer Vision KPI widget for the main dashboard — active
 * cameras, detections in the last 24h, open hazards, and PPE
 * compliance rate, plus a link into the full CCTV Monitoring page.
 * Reuses `useDetectionSummary` (same hook `DetectionSummarySection`
 * uses on the CCTV page) and the shared `StatCard`, so this widget and
 * the CCTV page's own summary section always report identical numbers
 * from the same `GET /vision/detections` call shape.
 */

import { AlertTriangle, Camera as CameraIcon, Gauge, HardHat, ScanEye } from 'lucide-react';
import { Card, CardHeader, EmptyState, QueryState, StatCard } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { useDetectionSummary } from '../hooks';
import type { DetectionSummary } from '../types';

export interface VisionSummaryWidgetProps {
  className?: string;
}

export function VisionSummaryWidget({ className }: VisionSummaryWidgetProps) {
  const { summary, loading, error, refetch } = useDetectionSummary();

  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Computer Vision"
        description="Live detection summary across every monitored camera."
        className="px-6 pt-5 pb-0"
        action={<CardHeaderLink to={ROUTES.CCTV_MONITORING} label="View CCTV Monitoring" />}
      />

      <div className="p-4">
        <QueryState<DetectionSummary>
          loading={loading}
          error={error}
          data={summary}
          onRetry={refetch}
          errorTitle="Failed to load detection summary"
          isEmpty={(d) => d.totalCameras === 0}
          emptyState={
            <EmptyState
              size="sm"
              icon={Gauge}
              title="No summary data"
              description="No cameras have been configured for this plant yet."
            />
          }
          loadingFallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading computer vision summary">
              <StatCard label="Active Cameras" value="" icon={CameraIcon} iconVariant="primary" loading />
              <StatCard label="Detections (24h)" value="" icon={ScanEye} iconVariant="primary" loading />
              <StatCard label="Open Hazards" value="" icon={AlertTriangle} iconVariant="danger" loading />
              <StatCard label="PPE Compliance" value="" icon={HardHat} iconVariant="warning" loading />
            </div>
          }
        >
          {(data) => (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Computer vision summary">
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
      </div>
    </Card>
  );
}
