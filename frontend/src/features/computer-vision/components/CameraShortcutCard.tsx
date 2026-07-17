/**
 * CameraShortcutCard
 *
 * Dashboard shortcut into the CCTV Monitoring page — shows how many
 * cameras are currently online and links straight to `LiveCameraGrid`.
 * Reuses `ROUTES.CCTV_MONITORING` (the same route the sidebar nav item
 * points at) rather than a hardcoded path, so navigation stays in sync
 * if the route ever changes.
 */

import { Link } from 'react-router-dom';
import { ChevronRight, Video } from 'lucide-react';
import { Badge, Card, Skeleton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useCameras } from '../hooks';

export interface CameraShortcutCardProps {
  className?: string;
}

export function CameraShortcutCard({ className }: CameraShortcutCardProps) {
  const { cameras, loading } = useCameras();
  const onlineCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <Link
      to={ROUTES.CCTV_MONITORING}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
    >
      <Card padding="sm" hoverable className={className}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-primary-600/15 text-primary-400">
            <Video className="w-4.5 h-4.5" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--sf-text-primary)]">CCTV Monitoring</p>
            {loading ? (
              <Skeleton className="h-3 w-24 rounded mt-1" />
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={onlineCount > 0 ? 'success' : 'default'} size="sm" dot pulsing={onlineCount > 0}>
                  {onlineCount} / {cameras.length} online
                </Badge>
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}
