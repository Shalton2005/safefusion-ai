import { FileCheck2, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { PermitDashboardPanel } from '@/features/permits/components/PermitDashboardPanel';
import type { Permit } from '@/types';
import { usePermits } from '../hooks/usePermits';

const statusVariant: Record<Permit['status'], 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  suspended: 'warning',
  closed: 'default',
};

const columns: TableColumn<Permit>[] = [
  {
    key: 'permit_type',
    header: 'Type',
    accessor: 'permit_type',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{(v as string).replace('_', ' ')}</span>,
  },
  { key: 'zone',        header: 'Zone',         accessor: 'zone' },
  { key: 'issued_by', header: 'Issued By', accessor: 'issued_by' },
  { key: 'assigned_team', header: 'Team', accessor: 'assigned_team' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as Permit['status']] || 'default'} size="sm" dot>
        {v as string}
      </Badge>
    ),
  },
  { 
    key: 'end_time', 
    header: 'Expires', 
    accessor: 'end_time',
    render: (v) => <span className="text-[var(--sf-text-tertiary)] text-xs">{new Date(v as string).toLocaleDateString()}</span>
  },
];

export function PermitsPage() {
  const { permits, loading, error } = usePermits();

  const activeCount = permits.filter((p) => p.status === 'active').length;
  const suspendedCount = permits.filter((p) => p.status === 'suspended').length;
  const closedCount = permits.filter((p) => p.status === 'closed').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Permits"
        description="Review and track work permits across all active sites."
        border={false}
        className="px-0 pt-0"
        badge={
          activeCount > 0 ? (
            <Badge variant="primary" size="sm" dot>
              {activeCount} active
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <FileCheck2 className="w-5 h-5 mx-auto text-safe-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : activeCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Active Permits</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Clock className="w-5 h-5 mx-auto text-caution-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : suspendedCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Suspended</p>
        </Card>
        <Card padding="sm" className="text-center">
          <XCircle className="w-5 h-5 mx-auto text-danger-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : closedCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Closed</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Permit Records" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load permits" className="mb-4">
              {error}
            </Alert>
          )}
          <Table<Permit>
            columns={columns}
            data={permits}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="List of work permit records"
            emptyMessage="No permits found."
          />
        </div>
      </Card>

      <PermitDashboardPanel />
    </div>
  );
}
