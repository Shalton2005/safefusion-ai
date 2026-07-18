import { HardHat, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { WorkerMonitoringPanel } from '@/features/workers/components/WorkerMonitoringPanel';
import type { Worker } from '@/types';
import { useWorkers } from '../hooks/useWorkers';

const statusVariant: Record<Worker['status'], 'success' | 'default' | 'warning' | 'danger'> = {
  'working': 'success',
  'idle': 'warning',
  'emergency': 'danger',
};

const columns: TableColumn<Worker>[] = [
  {
    key: 'name',
    header: 'Worker',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  { key: 'role', header: 'Role', accessor: 'role' },
  { key: 'zone', header: 'Zone', accessor: 'current_zone', render: (v) => (v as string) || 'Off-site' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as Worker['status']] || 'default'} size="sm" dot>
        {(v as string).replace('-', ' ')}
      </Badge>
    ),
  },
  {
    key: 'ppe_status',
    header: 'PPE Compliance',
    accessor: 'ppe_status',
    render: (v) => (
      <Badge variant={v ? 'success' : 'danger'} size="sm">
        {v ? 'Compliant' : 'Violation'}
      </Badge>
    ),
  },
];

export function WorkersPage() {
  const { workers, loading, error } = useWorkers();

  const activeWorkers = workers.filter((w) => w.status === 'working').length;
  const compliantCount = workers.filter((w) => w.ppe_status).length;
  const violationCount = workers.filter((w) => !w.ppe_status).length;

  return (
    <div className="page-container">
      <PageHeader
        title="Workers"
        description="Track worker attendance, zones, and safety certifications."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="primary" size="sm" dot>
            {activeWorkers} active
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <HardHat className="w-5 h-5 mx-auto text-primary-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : workers.length}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Total Workers</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldCheck className="w-5 h-5 mx-auto text-safe-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : compliantCount}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">PPE Compliant</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldAlert className="w-5 h-5 mx-auto text-danger-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : violationCount}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">PPE Violations</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Worker Roster" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load workers" className="mb-4">
              {error}
            </Alert>
          )}
          <Table<Worker>
            columns={columns}
            data={workers}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="List of workers and their site status"
            emptyMessage="No workers found."
          />
        </div>
      </Card>

      <WorkerMonitoringPanel />
    </div>
  );
}
