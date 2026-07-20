import { useRef, useState, useMemo } from 'react';
import { Activity, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { LastUpdated } from '@/components/common/LastUpdated';
import { incidentsService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import { ROUTES } from '@/constants/routes';
import type { Incident } from '@/types';
import { cn } from '@/lib/cn';
import { formatRelativeTime, capitalise } from '@/utils/format';

const SUMMARY_LIMIT = 5;

export interface AIIncidentSummary extends Incident {
  title_override?: string;
  icon?: React.ElementType;
}

function groupAndEnhanceIncidents(incidents: Incident[]): AIIncidentSummary[] {
  // Group related events (same incident type in the same zone) to prevent duplicates
  const grouped = new Map<string, Incident>();
  for (const inc of incidents) {
    const key = `${inc.incident_type}-${inc.zone}`;
    if (!grouped.has(key) || new Date(inc.occurred_at) > new Date(grouped.get(key)!.occurred_at)) {
      grouped.set(key, inc);
    }
  }

  const unique = Array.from(grouped.values()).sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  return unique.map((inc) => {
    const isCritical = inc.severity === 'critical';
    const isPPE = inc.incident_type === 'ppe_violation';

    const enhanced: AIIncidentSummary = { ...inc };

    if (isCritical) {
      enhanced.title_override = 'Compound Risk';
      enhanced.icon = ShieldAlert;
    } else if (isPPE) {
      enhanced.title_override = 'PPE Non Compliance';
      enhanced.icon = AlertTriangle;
    } else {
      enhanced.title_override = capitalise(inc.incident_type.replace('_', ' '));
      enhanced.icon = Activity;
    }

    return enhanced;
  });
}

function AIIncidentSummaryRow({ incident }: { incident: AIIncidentSummary }) {
  const isCritical = incident.severity === 'critical';
  const Icon = incident.icon || Activity;

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border p-3.5',
      isCritical ? 'border-danger-500/30 bg-danger-500/5' : 'border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]'
    )}>
      <Icon className={cn('w-4 h-4 flex-shrink-0', isCritical ? 'text-danger-500' : 'text-caution-500')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', isCritical ? 'text-danger-500' : 'text-[var(--sf-text-primary)]')}>
          {incident.title_override || capitalise(incident.incident_type)}
        </p>
        <span className="text-xs text-[var(--sf-text-tertiary)] truncate block">{incident.zone}</span>
      </div>
      <span className="text-2xs font-semibold text-[var(--sf-text-tertiary)] flex items-center gap-1 flex-shrink-0">
        <Clock className="w-3 h-3" />
        {formatRelativeTime(incident.occurred_at)}
      </span>
      <Badge variant={isCritical ? 'danger' : 'warning'} size="sm" dot pulsing={isCritical}>
        {capitalise(incident.severity)}
      </Badge>
    </div>
  );
}

export function AlertsSection() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchIncidents = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await incidentsService.getIncidents({ skip: 0, limit: 100 }, { signal });
      setIncidents(data);
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

  const { lastUpdated, refresh } = usePolling(fetchIncidents, DASHBOARD_REFRESH_INTERVAL);

  const enhancedIncidents = useMemo(() => groupAndEnhanceIncidents(incidents), [incidents]);
  const criticalCount = enhancedIncidents.filter((i) => i.severity === 'critical').length;
  const topIncidents = enhancedIncidents.slice(0, SUMMARY_LIMIT);

  return (
    <Card padding="none" className="h-full flex flex-col">
      <CardHeader
        title="AI Incident Feed"
        description="Most recent safety events across monitored zones."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-3">
            {!loading && !error && enhancedIncidents.length > 0 && (
              <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
                <Activity className="w-3 h-3 mr-1" />
                {enhancedIncidents.length} event{enhancedIncidents.length === 1 ? '' : 's'}
              </Badge>
            )}
            <CardHeaderLink to={ROUTES.ALERTS} label="View All" />
          </div>
        }
      />

      <div className="px-6 pb-1 flex-shrink-0">
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        <QueryState
          loading={loading}
          error={error}
          data={topIncidents}
          onRetry={refresh}
          errorTitle="Failed to load incidents"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={ShieldAlert}
              size="sm"
              title="No incidents detected"
              description="No safety incidents have been reported across monitored zones."
            />
          }
        >
          {(data) => (
            <div className="flex flex-col gap-2">
              {data.map((incident) => (
                <AIIncidentSummaryRow key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
