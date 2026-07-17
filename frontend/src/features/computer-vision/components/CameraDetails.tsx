/**
 * CameraDetails
 *
 * Modal detail panel for a single selected camera — full-size stream
 * preview with `DetectionOverlay` bounding boxes, status,
 * resolution/fps, and zone metadata. Opened from
 * `LiveCameraGrid`/`CameraTile`.
 */

import { Video, VideoOff } from 'lucide-react';
import { Badge, Modal } from '@/components/ui';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import { useFrameDetections } from '../hooks';
import { DetectionOverlay } from './DetectionOverlay';
import type { Camera, CameraStatus } from '../types';

const STATUS_BADGE_VARIANT: Record<CameraStatus, 'success' | 'default' | 'warning'> = {
  online:   'success',
  offline:  'default',
  degraded: 'warning',
};

const STATUS_LABEL: Record<CameraStatus, string> = {
  online:   'Live',
  offline:  'Offline',
  degraded: 'Degraded',
};

export interface CameraDetailsProps {
  camera: Camera | null;
  onClose: () => void;
}

export function CameraDetails({ camera, onClose }: CameraDetailsProps) {
  const { detections } = useFrameDetections(camera?.id);

  if (!camera) return null;
  const isLive = camera.status === 'online' && Boolean(camera.streamUrl);

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
            <img
              src={camera.streamUrl ?? undefined}
              alt={`Live feed from ${camera.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--sf-text-tertiary)]">
              <VideoOff className="w-8 h-8" aria-hidden="true" />
              <span className="text-sm">No signal</span>
            </div>
          )}

          <Badge
            variant={STATUS_BADGE_VARIANT[camera.status]}
            size="sm"
            dot
            pulsing={camera.status === 'online'}
            className="absolute top-3 left-3 backdrop-blur-sm"
          >
            {STATUS_LABEL[camera.status]}
          </Badge>

          {isLive && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <Video className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              {camera.fps && <span className="text-xs font-medium text-white">{camera.fps} fps</span>}
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
