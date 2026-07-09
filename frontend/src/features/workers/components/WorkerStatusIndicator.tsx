/**
 * WorkerStatusIndicator
 *
 * Reusable, presentational card showing a single worker's name, assigned
 * zone, shift, permit status, and PPE status. Purely props-driven — no
 * data fetching — so it can be reused in dashboards, grids, or detail views.
 *
 * Permit status has no backend field yet. When `permitStatus` is not
 * supplied, the badge is omitted rather than showing misleading
 * placeholder data.
 *
 * @example
 * <WorkerStatusIndicator
 *   name="Jane Doe"
 *   zone="Zone A – Floor 1"
 *   shift="Morning"
 *   ppeCompliant={true}
 * />
 */

import { Badge } from '@/components/ui';
import type { PermitStatus } from '@/types';

export interface WorkerStatusIndicatorProps {
  /** Worker's full name. */
  name: string;
  /** Currently assigned zone, or `null` if unassigned. */
  zone: string | null;
  /** Current shift. */
  shift: 'Morning' | 'Afternoon' | 'Night';
  /** PPE compliance — placeholder until live PPE detection is wired up. */
  ppeCompliant: boolean;
  /** Worker's permit status, when known. Omitted if not yet linked to a permit record. */
  permitStatus?: PermitStatus;
  className?: string;
}

export function WorkerStatusIndicator({
  name,
  zone,
  shift,
  ppeCompliant,
  permitStatus,
  className,
}: WorkerStatusIndicatorProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] p-3.5 ${className ?? ''}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{name}</p>
        <p className="text-xs text-[var(--sf-text-tertiary)]">{zone ?? 'Unassigned'} · {shift} shift</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="ghost" size="sm">
          Permit: {permitStatus ? permitStatus.charAt(0).toUpperCase() + permitStatus.slice(1) : 'Unknown'}
        </Badge>
        <Badge variant={ppeCompliant ? 'success' : 'danger'} size="sm" dot>
          {ppeCompliant ? 'PPE Compliant' : 'PPE Non-Compliant'}
        </Badge>
      </div>
    </div>
  );
}
