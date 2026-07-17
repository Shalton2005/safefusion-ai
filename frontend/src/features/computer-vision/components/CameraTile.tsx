/**
 * CameraTile
 *
 * Reusable camera card for the Live Camera Grid (and any future
 * single-camera context) — live stream placeholder, status badge,
 * detection count, risk indicator, and last-updated time.
 *
 * Three explicit states beyond the normal online/offline/degraded
 * camera data:
 *   - `loading`  — this specific card's data hasn't arrived yet (skeleton)
 *   - `error`    — this specific card failed to load (retryable)
 *   - `camera.status === 'offline'` — data loaded, but the feed itself
 *     has no signal (distinct from the fetch-level `loading`/`error`)
 *
 * Clicking a loaded, non-error tile opens `CameraDetails` for that camera.
 */

import { AlertTriangle, RotateCw, ScanEye, Video, VideoOff } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { capitalise, formatDateTime, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
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
  /** Camera data. Omit (or leave undefined) while `loading` is true. */
  camera?: Camera;
  /** Renders a skeleton placeholder in place of the card content. @default false */
  loading?: boolean;
  /** Error message for this specific card (e.g. its own feed/metadata fetch failed). */
  error?: string | null;
  /** Retry callback shown alongside the error state. */
  onRetry?: () => void;
  onSelect?: (camera: Camera) => void;
  className?: string;
}

export function CameraTile({ camera, loading = false, error, onRetry, onSelect, className }: CameraTileProps) {
  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <Card padding="none" className={cn('overflow-hidden flex flex-col', className)}>
        <Skeleton className="aspect-video rounded-none" />
        <div className="px-3 py-2.5 space-y-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </Card>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
  if (error) {
    return (
      <Card padding="none" className={cn('overflow-hidden flex flex-col', className)}>
        <div className="aspect-video bg-[var(--sf-surface-sunken)] flex flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertTriangle className="w-6 h-6 text-danger-500" aria-hidden="true" />
          <p className="text-xs text-[var(--sf-text-tertiary)]">{error}</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!camera) return null;

  const isLive = camera.status === 'online' && Boolean(camera.streamUrl);
  const isOffline = camera.status === 'offline';

  return (
    <Card
      padding="none"
      hoverable={Boolean(onSelect)}
      className={cn('overflow-hidden flex flex-col', className)}
      onClick={onSelect ? () => onSelect(camera) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* ── Stream placeholder ──────────────────────────────────── */}
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
            <span className="text-xs">{isOffline ? 'Camera offline' : 'No signal'}</span>
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

        {camera.riskLevel && (
          <Badge
            variant={SEVERITY_BADGE_VARIANT[camera.riskLevel]}
            size="sm"
            className="absolute top-2 right-2 backdrop-blur-sm"
          >
            {capitalise(camera.riskLevel)} risk
          </Badge>
        )}

        {isLive && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
            <Video className="w-3 h-3 text-white" aria-hidden="true" />
            {camera.fps && <span className="text-2xs font-medium text-white">{camera.fps} fps</span>}
          </div>
        )}
      </div>

      {/* ── Meta ─────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <div>
          <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{camera.name}</p>
          <p className="text-xs text-[var(--sf-text-tertiary)] truncate">{camera.zone} — {camera.location}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--sf-border-default)]">
          <div className="flex items-center gap-1 text-xs text-[var(--sf-text-secondary)]">
            <ScanEye className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
            <span>{camera.detectionCount} detection{camera.detectionCount === 1 ? '' : 's'}</span>
          </div>
          <span
            className="text-2xs text-[var(--sf-text-tertiary)]"
            title={camera.lastFrameAt ? formatDateTime(camera.lastFrameAt) : undefined}
          >
            {camera.lastFrameAt ? formatRelativeTime(camera.lastFrameAt) : 'Never updated'}
          </span>
        </div>
      </div>
    </Card>
  );
}
