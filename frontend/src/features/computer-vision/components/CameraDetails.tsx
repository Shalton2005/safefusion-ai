/**
 * CameraDetails
 *
 * Modal detail panel for a single selected camera — full-size stream
 * preview with `DetectionOverlay` bounding boxes, status,
 * resolution/fps, and zone metadata. Opened from
 * `LiveCameraGrid`/`CameraTile`.
 */

import { useState } from 'react';
import { LoaderCircle, Video, VideoOff } from 'lucide-react';
import { Badge, Modal } from '@/components/ui';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import { useFrameDetections } from '../hooks';
import { DetectionOverlay } from './DetectionOverlay';
import { CAMERA_STATUS_BADGE_VARIANT, CAMERA_STATUS_LABEL } from '../utils/cameraStatus';
import type { Camera } from '../types';

export interface CameraDetailsProps {
  camera: Camera | null;
  onClose: () => void;
}

export function CameraDetails({ camera, onClose }: CameraDetailsProps) {
  const { detections, loading: detectionsLoading } = useFrameDetections(camera?.id);

  const [videoFailed, setVideoFailed] = useState(false);
  if (!camera) return null;
  const isLive = camera.status === 'online' && Boolean(camera.streamUrl) && !videoFailed;
  const isOffline = camera.status === 'offline';

  return (
    <Modal
      open={Boolean(camera)}
      onClose={onClose}
      title={camera.name}
      description={`${camera.zone} — ${camera.location}`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--sf-surface-sunken)] flex items-center justify-center">
          {isLive ? (
            <video
              src={camera.streamUrl!}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              onError={() => setVideoFailed(true)}
              ref={(el) => { if (el) el.playbackRate = 0.85; }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--sf-text-tertiary)]">
              <VideoOff className="w-8 h-8" aria-hidden="true" />
              <span className="text-sm">{isOffline ? 'Camera offline' : 'No signal'}</span>
            </div>
          )}

          <Badge
            variant={CAMERA_STATUS_BADGE_VARIANT[camera.status]}
            size="sm"
            dot
            pulsing={camera.status === 'online'}
            className="absolute top-3 left-3 backdrop-blur-sm"
          >
            {CAMERA_STATUS_LABEL[camera.status]}
          </Badge>

          {isLive && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <Video className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              {camera.fps && <span className="text-xs font-medium text-white">{camera.fps} fps</span>}
            </div>
          )}

          {isLive && detectionsLoading && (
            <div
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-xs"
              role="status"
              aria-label="Loading detections"
            >
              <LoaderCircle className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
              Analyzing frame…
            </div>
          )}

          {isLive && <DetectionOverlay detections={detections} />}
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">Zone</dt>
            <dd className="text-sm text-[var(--sf-text-primary)] mt-0.5">{camera.zone}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">Location</dt>
            <dd className="text-sm text-[var(--sf-text-primary)] mt-0.5">{camera.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">Resolution</dt>
            <dd className="text-sm text-[var(--sf-text-primary)] mt-0.5">{camera.resolution}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">Last Frame</dt>
            <dd className="text-sm text-[var(--sf-text-primary)] mt-0.5" title={camera.lastFrameAt ? formatDateTime(camera.lastFrameAt) : undefined}>
              {camera.lastFrameAt ? formatRelativeTime(camera.lastFrameAt) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
