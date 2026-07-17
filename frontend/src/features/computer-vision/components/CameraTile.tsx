/**
 * CameraTile
 *
 * Single camera preview card for the Live Camera Grid — shows the live
 * stream frame (or an offline placeholder), status badge, and zone
 * label. Clicking a tile opens `CameraDetails` for that camera.
 */

import { Video, VideoOff } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
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

export interface CameraTileProps {
  camera: Camera;
  onSelect?: (camera: Camera) => void;
  className?: string;
}

export function CameraTile({ camera, onSelect, className }: CameraTileProps) {
  const isLive = camera.status === 'online' && Boolean(camera.streamUrl);

  return (
    <Card
      padding="none"
      hoverable={Boolean(onSelect)}
      className={cn('overflow-hidden flex flex-col', className)}
      onClick={onSelect ? () => onSelect(camera) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="relative aspect-video bg-[var(--sf-surface-sunken)] flex items-center justify-center">
        {isLive ? (
          <img
            src={camera.streamUrl ?? undefined}
            alt={`Live feed from ${camera.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--sf-text-tertiary)]">
            <VideoOff className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs">No signal</span>
          </div>
        )}

        <Badge
          variant={STATUS_BADGE_VARIANT[camera.status]}
          size="sm"
          dot
          pulsing={camera.status === 'online'}
          className="absolute top-2 left-2 backdrop-blur-sm"
        >
          {STATUS_LABEL[camera.status]}
        </Badge>

        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
            <Video className="w-3 h-3 text-white" aria-hidden="true" />
            {camera.fps && <span className="text-2xs font-medium text-white">{camera.fps} fps</span>}
          </div>
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{camera.name}</p>
        <p className="text-xs text-[var(--sf-text-tertiary)] truncate">{camera.zone} — {camera.location}</p>
      </div>
    </Card>
  );
}
