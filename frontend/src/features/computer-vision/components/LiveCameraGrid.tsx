/**
 * LiveCameraGrid
 *
 * Fetching wrapper + grid layout for every registered camera's live
 * preview. Selecting a tile opens `CameraDetails` for that camera.
 */

import { Video } from 'lucide-react';
import { Card, CardHeader, EmptyState, QueryState } from '@/components/ui';
import { useCameras } from '../hooks';
import { CameraTile } from './CameraTile';
import type { Camera } from '../types';

export interface LiveCameraGridProps {
  zone?: string;
  onSelectCamera?: (camera: Camera) => void;
}

export function LiveCameraGrid({ zone, onSelectCamera }: LiveCameraGridProps) {
  const { cameras, loading, error, refetch } = useCameras(zone);
  const onlineCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Live Camera Grid"
        description="Real-time preview of every registered CCTV camera."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && cameras.length > 0 && (
            <span className="text-xs text-[var(--sf-text-tertiary)]" aria-live="polite">
              {onlineCount} / {cameras.length} online
            </span>
          )
        }
      />

      <div className="p-4">
        <QueryState<Camera[]>
          loading={loading}
          error={error}
          data={cameras}
          onRetry={refetch}
          errorTitle="Failed to load cameras"
          isEmpty={(d) => d.length === 0}
          emptyState={
            <EmptyState
              icon={Video}
              title="No cameras registered"
              description="No CCTV cameras have been configured for this plant yet."
            />
          }
          loadingFallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading cameras">
              {Array.from({ length: 6 }).map((_, i) => (
                <CameraTile key={i} loading />
              ))}
            </div>
          }
        >
          {(data) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((camera) => (
                <CameraTile key={camera.id} camera={camera} onSelect={onSelectCamera} />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
