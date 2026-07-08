import { HardHat, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';

interface Worker {
  id: string;
  name: string;
  role: string;
  zone: string;
  status: 'on-site' | 'off-site' | 'on-break';
  certification: 'valid' | 'expiring' | 'expired';
}

const PLACEHOLDER_WORKERS: Worker[] = [
  { id: '1', name: 'Marcus Lee',    role: 'Site Supervisor', zone: 'Zone A', status: 'on-site',  certification: 'valid' },
  { id: '2', name: 'Jane Cooper',   role: 'Electrician',     zone: 'Zone B', status: 'on-site',  certification: 'valid' },
  { id: '3', name: 'Ana Delgado',   role: 'Crane Operator',  zone: 'Zone C', status: 'on-break', certification: 'expiring' },
  { id: '4', name: 'Tom Hardwick',  role: 'Welder',          zone: 'Zone A', status: 'off-site', certification: 'valid' },
  { id: '5', name: 'Priya Nair',    role: 'Safety Officer',  zone: 'Zone D', status: 'on-site',  certification: 'expired' },
];

const statusVariant: Record<Worker['status'], 'success' | 'default' | 'warning'> = {
  'on-site':  'success',
  'off-site': 'default',
  'on-break': 'warning',
};

const certVariant: Record<Worker['certification'], 'success' | 'warning' | 'danger'> = {
  valid:    'success',
  expiring: 'warning',
  expired:  'danger',
};

const columns: TableColumn<Worker>[] = [
  {
    key: 'name',
    header: 'Worker',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  { key: 'role', header: 'Role', accessor: 'role' },
  { key: 'zone', header: 'Zone', accessor: 'zone' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as Worker['status']]} size="sm" dot>
        {(v as string).replace('-', ' ')}
      </Badge>
    ),
  },
  {
    key: 'certification',
    header: 'Certification',
    accessor: 'certification',
    render: (v) => (
      <Badge variant={certVariant[v as Worker['certification']]} size="sm">
        {v as string}
      </Badge>
    ),
  },
];

export function WorkersPage() {
  const onSite = PLACEHOLDER_WORKERS.filter((w) => w.status === 'on-site').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Workers"
        description="Track worker attendance, zones, and safety certifications."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="primary" size="sm" dot>
            {onSite} on-site
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <HardHat className="w-5 h-5 mx-auto text-primary-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">{PLACEHOLDER_WORKERS.length}</p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Total Workers</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldCheck className="w-5 h-5 mx-auto text-safe-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {PLACEHOLDER_WORKERS.filter((w) => w.certification === 'valid').length}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Valid Certifications</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldCheck className="w-5 h-5 mx-auto text-danger-500" />
          <p className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {PLACEHOLDER_WORKERS.filter((w) => w.certification !== 'valid').length}
          </p>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Needs Attention</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Worker Roster" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<Worker>
            columns={columns}
            data={PLACEHOLDER_WORKERS}
            keyExtractor={(r) => r.id}
            caption="List of workers and their site status"
          />
        </div>
      </Card>
    </div>
  );
}
