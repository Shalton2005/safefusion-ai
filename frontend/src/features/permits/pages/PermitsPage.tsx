import { FileCheck2, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';

interface Permit {
  id: string;
  title: string;
  type: string;
  zone: string;
  requestedBy: string;
  status: 'approved' | 'pending' | 'rejected' | 'expired';
  expiresAt: string;
}

const PLACEHOLDER_PERMITS: Permit[] = [
  { id: '1', title: 'Hot Work – Zone A',        type: 'Hot Work',    zone: 'Zone A', requestedBy: 'Tom Hardwick', status: 'approved', expiresAt: '2026-07-15' },
  { id: '2', title: 'Confined Space Entry',     type: 'Confined Space', zone: 'Zone D', requestedBy: 'Priya Nair', status: 'pending',  expiresAt: '2026-07-10' },
  { id: '3', title: 'Working at Height',        type: 'Height',      zone: 'Zone B', requestedBy: 'Jane Cooper',  status: 'approved', expiresAt: '2026-07-20' },
  { id: '4', title: 'Excavation Permit',        type: 'Excavation',  zone: 'Zone C', requestedBy: 'Ana Delgado',  status: 'rejected', expiresAt: '—' },
  { id: '5', title: 'Electrical Isolation',     type: 'Electrical',  zone: 'Zone A', requestedBy: 'Marcus Lee',   status: 'expired',  expiresAt: '2026-06-30' },
];

const statusVariant: Record<Permit['status'], 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending:  'warning',
  rejected: 'danger',
  expired:  'default',
};

const columns: TableColumn<Permit>[] = [
  {
    key: 'title',
    header: 'Permit',
    accessor: 'title',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  { key: 'type',        header: 'Type',         accessor: 'type' },
  { key: 'zone',        header: 'Zone',         accessor: 'zone' },
  { key: 'requestedBy', header: 'Requested By', accessor: 'requestedBy' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as Permit['status']]} size="sm" dot>
        {v as string}
      </Badge>
    ),
  },
  { key: 'expiresAt', header: 'Expires', accessor: 'expiresAt' },
];

export function PermitsPage() {
  const pending = PLACEHOLDER_PERMITS.filter((p) => p.status === 'pending').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Permits"
        description="Review and track work permits across all active sites."
        border={false}
        className="px-0 pt-0"
        badge={
          pending > 0 ? (
            <Badge variant="warning" size="sm" dot>
              {pending} pending
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <FileCheck2 className="w-5 h-5 mx-auto text-safe-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {PLACEHOLDER_PERMITS.filter((p) => p.status === 'approved').length}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Approved</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Clock className="w-5 h-5 mx-auto text-caution-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">{pending}</p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Pending Review</p>
        </Card>
        <Card padding="sm" className="text-center">
          <XCircle className="w-5 h-5 mx-auto text-danger-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {PLACEHOLDER_PERMITS.filter((p) => p.status === 'rejected' || p.status === 'expired').length}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Rejected / Expired</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Permit Requests" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<Permit>
            columns={columns}
            data={PLACEHOLDER_PERMITS}
            keyExtractor={(r) => r.id}
            caption="List of work permit requests"
          />
        </div>
      </Card>
    </div>
  );
}
