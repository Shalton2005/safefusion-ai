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

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Camera as CameraIcon, HardHat, RotateCw, ScanEye } from 'lucide-react';
import { Alert, Button, Card, CardHeader, StatCard } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useDetectionSummary } from '../hooks';

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
        action={
          <Link
            to={ROUTES.CCTV_MONITORING}
            className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            View CCTV Monitoring
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div className="p-4">
        {error ? (
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
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        )}
      </div>
    </Card>
  );
}
