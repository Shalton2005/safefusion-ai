import { useEffect, useState } from 'react';
import { Users, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, QueryState } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { workersService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { Worker, WorkerStatus } from '@/types';

const statusConfig: Record<WorkerStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  working:   { label: 'Working',   variant: 'success' },
  idle:      { label: 'Idle',      variant: 'warning' },
  emergency: { label: 'Emergency', variant: 'danger' },
};

const columns: TableColumn<Worker>[] = [
  {
    key: 'name',
    header: 'Worker Name',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  {
    key: 'employee_id',
    header: 'Worker ID',
    accessor: 'employee_id',
    render: (v) => <span className="text-[var(--sf-text-secondary)] font-mono text-xs">{v as string}</span>,
  },
  {
    key: 'current_zone',
    header: 'Zone',
    accessor: 'current_zone',
    render: (v) => <span>{(v as string | null) ?? '—'}</span>,
  },
  {
    key: 'ppe_status',
    header: 'PPE Status',
    accessor: 'ppe_status',
    render: (v) => (
      <Badge variant={v ? 'success' : 'danger'} size="sm" dot>
        {v ? 'Compliant' : 'Non-Compliant'}
      </Badge>
    ),
  },
  { key: 'shift', header: 'Shift', accessor: 'shift' },
  {
    key: 'status',
    header: 'Online Status',
    accessor: 'status',
    render: (v) => {
      const cfg = statusConfig[v as WorkerStatus];
      return (
        <Badge variant={cfg.variant} size="sm" dot pulsing={cfg.variant === 'danger'}>
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    key: 'updated_at',
    header: 'Last Updated',
    accessor: 'updated_at',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">
        {new Date(v as string).toLocaleString()}
      </span>
    ),
  },
];

export function WorkerMonitoringPanel() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await workersService.getWorkers({ skip: 0, limit: 100 }, { signal });
      setWorkers(data);
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

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchWorkers(signal);
    return () => controller.abort();
  }, []);

  const emergencyCount = workers.filter((w) => w.status === 'emergency').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Worker Monitoring"
        description="Live status of registered workers across all zones."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-3">
            {!loading && !error && (
              <Badge variant={emergencyCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={emergencyCount > 0}>
                {workers.length} worker{workers.length === 1 ? '' : 's'}
              </Badge>
            )}
            <CardHeaderLink to={ROUTES.WORKERS} label="View all workers" />
          </div>
        }
      />
      <div className="p-4">
        <QueryState
          loading={loading}
          error={error}
          data={workers}
          onRetry={() => fetchWorkers()}
          errorTitle="Failed to load workers"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <Table<Worker>
              columns={columns}
              data={workers}
              loading
              keyExtractor={(r) => r.id}
              caption="Worker monitoring status by zone, PPE compliance, and shift"
              emptyMessage="No workers found."
            />
          }
          emptyState={
            <EmptyState
              icon={Users}
              title="No workers found"
              description="No worker records are currently registered in the system."
            />
          }
        >
          {(data) => (
            <>
              <Table<Worker>
                columns={columns}
                data={data}
                loading={false}
                keyExtractor={(r) => r.id}
                caption="Worker monitoring status by zone, PPE compliance, and shift"
                emptyMessage="No workers found."
              />
              {emergencyCount > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-danger-600 dark:text-danger-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {emergencyCount} worker{emergencyCount === 1 ? '' : 's'} in emergency status
                </div>
              )}
            </>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
