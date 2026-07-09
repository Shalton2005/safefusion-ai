/**
 * LastUpdated
 *
 * Small reusable label showing when a panel's data was last refreshed.
 * Pair with `usePolling`'s `lastUpdated` value.
 *
 * @example
 * <LastUpdated timestamp={lastUpdated} />
 */

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface LastUpdatedProps {
  /** Timestamp of the last successful refresh, or `null` before the first one resolves. */
  timestamp: Date | null;
  className?: string;
}

export function LastUpdated({ timestamp, className }: LastUpdatedProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-2xs text-[var(--sf-text-tertiary)]', className)}
    >
      <RefreshCw className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      {timestamp ? `Updated ${timestamp.toLocaleTimeString()}` : 'Updating…'}
    </span>
  );
}
