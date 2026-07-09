/**
 * PermitStatusIndicator
 *
 * Reusable, presentational card showing a single Permit-to-Work record's
 * ID, type, assigned worker/team, status, and expiry time. Purely
 * props-driven — no data fetching — so it can be reused in dashboards,
 * grids, or detail views.
 *
 * Expired permits (`isExpired`) are highlighted with a danger-tinted
 * border and an "Expired" badge, regardless of their stored status.
 *
 * @example
 * <PermitStatusIndicator
 *   permitId="PMT-1042"
 *   permitType="Hot Work"
 *   worker="Team Alpha"
 *   status="active"
 *   expiryTime="2026-07-09T18:00:00Z"
 *   isExpired={false}
 * />
 */

import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import type { PermitStatus } from '@/types';

const statusVariant: Record<PermitStatus, 'success' | 'default' | 'warning'> = {
  active:    'success',
  closed:    'default',
  suspended: 'warning',
};

export interface PermitStatusIndicatorProps {
  /** Permit record ID (e.g. "PMT-1042"). */
  permitId: string;
  /** Human-readable permit type (e.g. "Hot Work"). */
  permitType: string;
  /** Worker or team the permit is assigned to. */
  worker: string;
  /** Current permit status as stored in the system. */
  status: PermitStatus;
  /** ISO timestamp the permit expires. */
  expiryTime: string;
  /** When `true`, the card is highlighted as expired regardless of `status`. */
  isExpired: boolean;
  className?: string;
}

export function PermitStatusIndicator({
  permitId,
  permitType,
  worker,
  status,
  expiryTime,
  isExpired,
  className,
}: PermitStatusIndicatorProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3.5',
        isExpired
          ? 'border-danger-500/40 bg-danger-500/5'
          : 'border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{permitType}</p>
          <p className="text-xs text-[var(--sf-text-tertiary)] font-mono">{permitId}</p>
        </div>
        {isExpired ? (
          <Badge variant="danger" size="sm" dot pulsing>
            Expired
          </Badge>
        ) : (
          <Badge variant={statusVariant[status]} size="sm" dot>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--sf-text-tertiary)]">
        <span className="truncate">{worker}</span>
        <span className={cn(isExpired && 'text-danger-500 font-medium')}>
          Expires {formatDateTime(expiryTime)}
        </span>
      </div>
    </div>
  );
}
