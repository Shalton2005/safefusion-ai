import { useRef, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { LastUpdated } from '@/components/common/LastUpdated';
import { permitsService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import { ROUTES } from '@/constants/routes';
import type { Permit, PermitType } from '@/types';
import { PermitStatusIndicator } from '@/features/permits/components/PermitStatusIndicator';

const SUMMARY_LIMIT = 3;

const permitTypeLabel: Record<PermitType, string> = {
  hot_work:             'Hot Work',
  confined_space:       'Confined Space',
  electrical_isolation: 'Electrical Isolation',
  working_at_height:    'Working at Height',
  excavation:           'Excavation',
  pressure_testing:     'Pressure Testing',
  line_breaking:        'Line Breaking',
  loto:                 'LOTO',
  chemical_transfer:    'Chemical Transfer',
};

function isPermitExpired(permit: Permit): boolean {
  // A suspended permit is never displayed as "Expired" — Suspended takes priority.
  return (
    permit.status === 'active' &&
    new Date(permit.end_time).getTime() < Date.now()
  );
}

// Priority for sorting: Suspended > Expired > Active > Closed.
function permitPriority(permit: Permit): number {
  if (permit.status === 'suspended') return 3;
  if (isPermitExpired(permit)) return 2;
  if (permit.status === 'active') return 1;
  return 0; // closed
}

export function PermitStatusSection() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchPermits = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await permitsService.getPermits({ skip: 0, limit: 100 }, { signal });
      setPermits(data);
      hasLoadedOnce.current = true;
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) {
        setError(apiError.toUserMessage());
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const { lastUpdated, refresh } = usePolling(fetchPermits, DASHBOARD_REFRESH_INTERVAL);

  const expiredCount = permits.filter(isPermitExpired).length;
  const activeCount = permits.filter((p) => p.status === 'active' && !isPermitExpired(p)).length;
  const suspendedCount = permits.filter((p) => p.status === 'suspended').length;
  const closedCount = permits.filter((p) => p.status === 'closed').length;

  const [isExpanded, setIsExpanded] = useState(false);
  const sorted = [...permits].sort((a, b) => permitPriority(b) - permitPriority(a));
  const displayPermits = isExpanded ? sorted : sorted.slice(0, SUMMARY_LIMIT);
  const hasMore = sorted.length > SUMMARY_LIMIT;

  return (
    <Card padding="none" className="h-full flex flex-col">
      <CardHeader
        title="Permit Summary"
        description="Status overview of Permit-to-Work records."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-3">
            {!loading && !error && permits.length > 0 && (
              <Badge variant={expiredCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={expiredCount > 0}>
                {expiredCount > 0 ? `${expiredCount} expired` : `${permits.length} permit${permits.length === 1 ? '' : 's'}`}
              </Badge>
            )}
            <CardHeaderLink to={ROUTES.PERMITS} label="View All" />
          </div>
        }
      />

      <div className="px-6 pb-1 flex-shrink-0">
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar flex flex-col">
        <QueryState
          loading={loading}
          error={error}
          data={permits}
          onRetry={refresh}
          errorTitle="Failed to load permits"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[3.25rem] rounded-lg" />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: SUMMARY_LIMIT }).map((_, i) => (
                  <Skeleton key={i} className="h-[4.25rem] rounded-lg" />
                ))}
              </div>
            </div>
          }
          emptyState={
            <EmptyState
              icon={FileCheck2}
              size="sm"
              title="No permits found"
              description="No Permit-to-Work records are currently registered in the system."
            />
          }
        >
          {() => (
            <div className="flex flex-col gap-4">
              {/* Status counts */}
              <div className="grid grid-cols-4 gap-2 flex-shrink-0">
                <div className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <span className="text-lg font-bold text-primary-500">{activeCount}</span>
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">Active</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-danger-500/10 border border-danger-500/20">
                  <span className="text-lg font-bold text-danger-500">{expiredCount}</span>
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">Expired</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-caution-500/10 border border-caution-500/20">
                  <span className="text-lg font-bold text-caution-500">{suspendedCount}</span>
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">Suspended</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]">
                  <span className="text-lg font-bold text-[var(--sf-text-secondary)]">{closedCount}</span>
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">Closed</span>
                </div>
              </div>

              {/* Most urgent permits */}
              <div className="flex flex-col gap-2">
                {displayPermits.map((permit) => (
                  <PermitStatusIndicator
                    key={permit.id}
                    permitId={permit.id}
                    permitType={permitTypeLabel[permit.permit_type]}
                    worker={permit.assigned_team}
                    status={permit.status}
                    expiryTime={permit.end_time}
                    isExpired={isPermitExpired(permit)}
                  />
                ))}
              </div>
              
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full py-2 mt-2 text-xs font-medium text-primary-400 hover:text-primary-300 border border-transparent hover:border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] rounded-lg transition-colors flex-shrink-0"
                >
                  {isExpanded ? 'Collapse Permits' : 'View Full List'}
                </button>
              )}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
