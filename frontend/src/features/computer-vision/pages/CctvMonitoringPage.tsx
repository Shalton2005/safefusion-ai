/**
 * CctvMonitoringPage
 *
 * Computer Vision module's primary view — visualizes results from the
 * backend's YOLO/OpenCV detection pipeline (`backend/src/ai/detection/`,
 * not yet built). This page only renders detection output; no CV
 * inference happens client-side.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScanEye } from 'lucide-react';
import { Badge, PageHeader } from '@/components/ui';
import {
  LiveCameraGrid,
  DetectionSummarySection,
  PpeComplianceSection,
  HazardDetectionSection,
  AiTimelineSection,
  CameraDetails,
  ScenarioVideoPanel,
} from '@/features/computer-vision/components';
import { useCameras } from '@/features/computer-vision/hooks/useCameras';
import type { Camera } from '@/features/computer-vision/types';

export function CctvMonitoringPage() {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { cameras } = useCameras();

  // Deep-link support: ?cameraId=CCTV-07 opens that camera's detail modal on load,
  // e.g. from the Live Monitoring page's "View CCTV" action.
  useEffect(() => {
    const cameraId = searchParams.get('cameraId');
    if (!cameraId || cameras.length === 0) return;
    const match = cameras.find((c) => c.id === cameraId);
    if (match) {
      setSelectedCamera(match);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('cameraId');
        return next;
      }, { replace: true });
    }
  }, [cameras, searchParams, setSearchParams]);

  return (
    <div className="page-container">
      <PageHeader
        title="CCTV Monitoring"
        description="Real-time hazard detection, PPE compliance, and camera status across all monitored zones."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="primary" size="sm" dot>
            <ScanEye className="w-3 h-3 mr-1" />
            AI Vision
          </Badge>
        }
      />

      <ScenarioVideoPanel />

      <DetectionSummarySection />

      <LiveCameraGrid onSelectCamera={setSelectedCamera} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PpeComplianceSection />
        <HazardDetectionSection />
      </div>

      <AiTimelineSection />

      <CameraDetails camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
    </div>
  );
}
