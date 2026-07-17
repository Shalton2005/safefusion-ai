/**
 * LiveCameraGrid
 *
 * Fetching wrapper + grid layout for every registered camera's live
 * preview. Selecting a tile opens `CameraDetails` for that camera.
 */

import { RotateCw, Video } from 'lucide-react';
import { Alert, Button, Card, CardHeader, EmptyState } from '@/components/ui';
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
            <span className="text-xs text-[var(--sf-text-tertiary)]">
              {onlineCount} / {cameras.length} online
            </span>
          )
        }
      />

      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load cameras"
            actions={
              <Button size="sm" variant="outline" onClick={refetch} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CameraTile key={i} loading />
            ))}
          </div>
        ) : cameras.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No cameras registered"
            description="No CCTV cameras have been configured for this plant yet."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => (
              <CameraTile key={camera.id} camera={camera} onSelect={onSelectCamera} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
