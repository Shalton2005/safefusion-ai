import { useEffect, useState } from 'react';
import { FileCheck2, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, Alert, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { permitsService } from '@/services';
import { ApiError } from '@/api/errors';
import { capitalise, formatDateTime } from '@/utils/format';
import type { Permit, PermitStatus, PermitType } from '@/types';

const statusVariant: Record<PermitStatus, 'success' | 'default' | 'warning'> = {
  active:    'success',
  closed:    'default',
  suspended: 'warning',
};

const permitTypeLabel: Record<PermitType, string> = {
  hot_work:       'Hot Work',
  confined_space: 'Confined Space',
  electrical:     'Electrical',
};

const columns: TableColumn<Permit>[] = [
  {
    key: 'permit_type',
    header: 'Permit Type',
    accessor: 'permit_type',
    render: (v) => (
      <span className="font-medium text-[var(--sf-text-primary)]">
        {permitTypeLabel[v as PermitType]}
      </span>
    ),
  },
  { key: 'zone', header: 'Zone', accessor: 'zone' },
  { key: 'issued_by', header: 'Issued By', accessor: 'issued_by' },
  { key: 'assigned_team', header: 'Assigned Team', accessor: 'assigned_team' },
  {
    key: 'start_time',
    header: 'Start',
    accessor: 'start_time',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">{formatDateTime(v as string)}</span>
    ),
  },
  {
    key: 'end_time',
    header: 'End',
    accessor: 'end_time',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">{formatDateTime(v as string)}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as PermitStatus]} size="sm" dot>
        {capitalise(v as string)}
      </Badge>
    ),
  },
];

export function PermitDashboardPanel() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermits = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await permitsService.getPermits({ skip: 0, limit: 100 });
      setPermits(data);
    } catch (err) {
      setError(ApiError.from(err).toUserMessage());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermits();
  }, []);

  const activeCount = permits.filter((p) => p.status === 'active').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Permit Dashboard"
        description="Read-only view of Permit-to-Work records across all zones."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && permits.length > 0 && (
            <Badge variant={activeCount > 0 ? 'success' : 'default'} size="sm" dot>
              {activeCount} active
            </Badge>
          )
        }
      />
      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load permits"
            actions={
              <Button size="sm" variant="outline" onClick={fetchPermits} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : !loading && permits.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No permits found"
            description="No Permit-to-Work records are currently registered in the system."
          />
        ) : (
          <Table<Permit>
            columns={columns}
            data={permits}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="Permit-to-Work records by zone, team, and status"
            emptyMessage="No permits found."
          />
        )}
      </div>
    </Card>
  );
}
