/**
 * DetectionSummarySection
 *
 * Plant-wide (or zone-scoped) KPI rollup for the CCTV Monitoring page —
 * active cameras, detections in the last 24h, open hazards, and PPE
 * compliance rate. Same `StatCard` grid pattern as `KpiCardGrid`.
 */

import { AlertTriangle, Camera as CameraIcon, HardHat, RotateCw, ScanEye } from 'lucide-react';
import { Alert, Button, StatCard } from '@/components/ui';
import { useDetectionSummary } from '../hooks';

export interface DetectionSummarySectionProps {
  zone?: string;
}

export function DetectionSummarySection({ zone }: DetectionSummarySectionProps) {
  const { summary, loading, error, refetch } = useDetectionSummary(zone);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load detection summary"
        actions={
          <Button size="sm" variant="outline" onClick={refetch} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Cameras"
        value={loading || !summary ? '' : `${summary.activeCameras}/${summary.totalCameras}`}
        icon={CameraIcon}
        iconVariant="primary"
        loading={loading}
      />
      <StatCard
        label="Detections (24h)"
        value={loading || !summary ? '' : summary.detectionsLast24h}
        icon={ScanEye}
        iconVariant="primary"
        loading={loading}
      />
      <StatCard
        label="Open Hazards"
        value={loading || !summary ? '' : summary.openHazards}
        icon={AlertTriangle}
        iconVariant={summary && summary.openHazards > 0 ? 'danger' : 'success'}
        loading={loading}
      />
      <StatCard
        label="PPE Compliance"
        value={loading || !summary ? '' : `${summary.ppeComplianceRate}%`}
        icon={HardHat}
        iconVariant={summary && summary.ppeComplianceRate < 90 ? 'warning' : 'success'}
        loading={loading}
      />
    </div>
  );
}
