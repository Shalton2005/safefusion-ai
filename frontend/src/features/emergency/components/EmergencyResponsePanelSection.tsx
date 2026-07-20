import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, Badge, EmptyState, QueryState, Button } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { EmergencyResponsePanel } from './EmergencyResponsePanel';
import type { EmergencyActionItem } from '@/types';

export interface EmergencyResponsePanelSectionViewProps {
  actions: EmergencyActionItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational emergency response section — accepts already-fetched
 * actions so a parent (e.g. `DashboardPage` via a shared
 * `useEmergencyResponse()` call) can avoid refetching the same
 * `GET /emergency/actions` endpoint this panel would otherwise call on
 * its own. Use `EmergencyResponsePanelSection` below for standalone,
 * self-fetching usage.
 */
export function EmergencyResponsePanelSectionView({
  actions,
  loading,
  error,
  lastUpdated,
  refresh,
  className,
}: EmergencyResponsePanelSectionViewProps) {
  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Emergency Response"
        description="Actions dispatched by the Emergency Response engine, in recommended order."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && actions.length > 0 && (
            <Badge variant="danger" size="sm" dot pulsing>
              {actions.length > 5 ? `Showing 5 of ${actions.length} Actions` : `${actions.length} Action${actions.length === 1 ? '' : 's'}`}
            </Badge>
          )
        }
      />
      <div className="p-6 flex flex-col gap-6">
        <QueryState
          loading={loading}
          error={error}
          data={actions}
          onRetry={refresh}
          errorTitle="Failed to load emergency actions"
          isEmpty={(a) => a.length === 0}
          emptyState={
            <EmptyState
              icon={ShieldAlert}
              title="No emergency actions"
              description="No emergency actions have been dispatched. All zones are within safe thresholds."
            />
          }
        >
          {(actionData) => (
            <>
              <EmergencyResponsePanel actions={actionData.slice(0, 5)} />
              {actionData.length > 5 && (
                <div className="flex items-center justify-between px-2 pt-2 pb-1 border-t border-[var(--sf-border-default)]">
                  <span className="text-xs text-[var(--sf-text-tertiary)] font-medium">+{actionData.length - 5} more actions dispatched</span>
                </div>
              )}
            </>
          )}
        </QueryState>

        {!error && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--sf-border-default)]">
            <LastUpdated timestamp={lastUpdated} className="px-1" />
            <Link to="/emergency" className="block w-full sm:w-auto">
              <Button variant="outline" className="w-full group bg-[var(--sf-surface-card)] hover:bg-[var(--sf-surface-hover)]">
                View Full Response Plan
                <ArrowRight className="w-4 h-4 ml-2 text-[var(--sf-text-tertiary)] group-hover:text-[var(--sf-text-primary)] transition-colors" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
