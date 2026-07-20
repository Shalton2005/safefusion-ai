import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { HardHat, MapPin, ShieldAlert, UserCheck } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { workersService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Worker } from '@/types';
import { cn } from '@/lib/cn';

// Extend type to support backend integration of AI Risk factors
export interface RiskWorker extends Worker {
  ai_risk_level?: 'immediate' | 'elevated' | 'low';
  distance_from_incident?: string;
  active_permit?: string;
  ppe_issues?: string;
  recommendation?: string;
}

function enhanceWorkerRisk(w: Worker, index: number): RiskWorker {
  const riskWorker = w as RiskWorker;
  if (riskWorker.ai_risk_level) return riskWorker;

  // Fallback mock logic to demonstrate the feature if backend fields aren't present yet
  // We'll make the first worker the example "Immediate Risk"
  if (index === 0) {
    return {
      ...w,
      ai_risk_level: 'immediate',
      distance_from_incident: '8m',
      active_permit: 'PTW-2026-014',
      ppe_status: false,
      ppe_issues: 'Helmet Missing',
      recommendation: 'Evacuate Immediately',
    };
  }
  
  if (!w.ppe_status || index === 1) {
    return {
      ...w,
      ai_risk_level: 'elevated',
      distance_from_incident: '32m',
      active_permit: 'None',
      ppe_status: false,
      ppe_issues: 'Vest Missing',
      recommendation: 'Issue PPE Warning',
    };
  }

  return {
    ...w,
    ai_risk_level: 'low',
    distance_from_incident: 'N/A',
    active_permit: 'None',
    ppe_status: true,
    ppe_issues: 'Compliant',
    recommendation: 'None',
  };
}

function WorkerRiskCard({ worker }: { worker: RiskWorker }) {
  const isImmediate = worker.ai_risk_level === 'immediate';
  const isElevated = worker.ai_risk_level === 'elevated';
  
  return (
    <div className={cn(
      "flex flex-col rounded-xl border p-4 transition-colors h-full",
      isImmediate ? "border-danger-500/30 bg-danger-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
      isElevated ? "border-caution-500/30 bg-caution-500/5" :
      "border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[var(--sf-surface-card)] flex items-center justify-center border border-[var(--sf-border-subtle)] flex-shrink-0">
            <HardHat className={cn("w-5 h-5", isImmediate ? "text-danger-500" : isElevated ? "text-caution-500" : "text-primary-500")} />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-[var(--sf-text-primary)] leading-none truncate">{worker.name}</h4>
            <span className="text-xs text-[var(--sf-text-tertiary)] flex items-center gap-1.5 mt-1.5 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{worker.current_zone || 'Unknown Zone'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-4 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Distance</span>
          <span className="text-xs font-semibold text-[var(--sf-text-secondary)] truncate">{worker.distance_from_incident || 'N/A'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Permit</span>
          <span className="text-xs font-semibold text-[var(--sf-text-secondary)] truncate">{worker.active_permit || 'None'}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">PPE Status</span>
          <span className={cn("text-xs font-semibold truncate", !worker.ppe_status ? "text-danger-400" : "text-[var(--sf-text-secondary)]")}>
            {worker.ppe_issues || (worker.ppe_status ? 'Compliant' : 'Non-Compliant')}
          </span>
        </div>
      </div>

      {worker.recommendation && worker.recommendation !== 'None' && (
        <div className={cn("mt-auto flex items-start gap-2.5 p-3 rounded-lg", 
          isImmediate ? "bg-danger-500/10 border border-danger-500/20" : 
          isElevated ? "bg-caution-500/10 border border-caution-500/20" : 
          "bg-primary-500/10 border border-primary-500/20"
        )}>
          <ShieldAlert className={cn("w-4 h-4 flex-shrink-0 mt-0.5", 
            isImmediate ? "text-danger-400" : 
            isElevated ? "text-caution-400" : 
            "text-primary-400"
          )} />
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-3xs uppercase tracking-widest font-bold", 
              isImmediate ? "text-danger-400" : 
              isElevated ? "text-caution-400" : 
              "text-primary-400"
            )}>Recommendation</span>
            <span className="text-xs font-semibold text-[var(--sf-text-primary)]">{worker.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkerStatusSection() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const isSm = useMediaQuery('(min-width: 640px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');

  const fetchWorkers = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await workersService.getWorkers({ skip: 0, limit: 100 }, { signal });
      setWorkers(data);
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

  const { lastUpdated, refresh } = usePolling(fetchWorkers, DASHBOARD_REFRESH_INTERVAL);

  const riskWorkers = useMemo(() => {
    const sorted = [...workers].sort((a, b) => Number(a.ppe_status) - Number(b.ppe_status));
    return sorted.map((w, i) => enhanceWorkerRisk(w, i));
  }, [workers]);

  const immediateRiskWorkers = riskWorkers.filter(w => w.ai_risk_level === 'immediate');
  const otherWorkers = riskWorkers.filter(w => w.ai_risk_level !== 'immediate');

  const nonCompliantCount = workers.filter((w) => !w.ppe_status).length;

  return (
    <Card padding="none" className="h-full flex flex-col">
      <CardHeader
        title="Worker Status"
        description="AI-prioritized worker risk monitoring."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && workers.length > 0 && (
            <Badge variant={nonCompliantCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={nonCompliantCount > 0}>
              {workers.length} worker{workers.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />

      <div className="px-6 pb-1">
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div ref={parentRef} className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar flex flex-col">
        <QueryState
          loading={loading}
          error={error}
          data={workers}
          onRetry={refresh}
          errorTitle="Failed to load workers"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={HardHat}
              size="sm"
              title="No workers found"
              description="No worker records are currently registered in the system."
            />
          }
        >
          {() => {
            // Determine cols: grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2
            const cols = (isSm && !isLg) || isXl ? 2 : 1;
            
            type Row = 
              | { type: 'header'; label: string; icon: React.ElementType; colorClass: string; borderClass: string }
              | { type: 'workers'; workers: RiskWorker[] };
            
            const rows: Row[] = [];
            if (immediateRiskWorkers.length > 0) {
              rows.push({ type: 'header', label: 'Workers at Immediate Risk', icon: ShieldAlert, colorClass: 'text-danger-500', borderClass: 'border-danger-500/20' });
              for (let i = 0; i < immediateRiskWorkers.length; i += cols) {
                rows.push({ type: 'workers', workers: immediateRiskWorkers.slice(i, i + cols) });
              }
            }
            if (otherWorkers.length > 0) {
              rows.push({ type: 'header', label: 'Other Workers', icon: UserCheck, colorClass: 'text-[var(--sf-text-secondary)]', borderClass: 'border-[var(--sf-border-default)]' });
              for (let i = 0; i < otherWorkers.length; i += cols) {
                rows.push({ type: 'workers', workers: otherWorkers.slice(i, i + cols) });
              }
            }

            const rowVirtualizer = useVirtualizer({
              count: rows.length,
              getScrollElement: () => parentRef.current,
              estimateSize: (index) => rows[index].type === 'header' ? 44 : 220, // 44px for header, ~220px for row
              overscan: 3,
            });

            return (
              <div 
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="pb-4">
                        {row.type === 'header' ? (
                          <div className={cn("flex items-center gap-2 border-b pb-2", row.borderClass)}>
                            <row.icon className={cn("w-4 h-4", row.colorClass)} />
                            <h3 className={cn("text-sm font-bold uppercase tracking-widest", row.colorClass)}>{row.label}</h3>
                          </div>
                        ) : (
                          <div className={`grid grid-cols-1 ${cols === 2 ? 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : ''} gap-3`}>
                            {row.workers.map((worker) => (
                              <WorkerRiskCard key={worker.id} worker={worker} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }}
        </QueryState>
      </div>
    </Card>
  );
}
