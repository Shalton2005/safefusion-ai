import { useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, QueryState, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { permitsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import { capitalise, formatDateTime } from '@/utils/format';
import type { Permit, PermitStatus, PermitType } from '@/types';

const statusVariant: Record<PermitStatus, 'success' | 'default' | 'warning'> = {
  active:    'success',
  closed:    'default',
  suspended: 'warning',
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchPermits = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await permitsService.getPermits({ skip: 0, limit: 100 }, { signal });
      setPermits(data);
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
    fetchPermits(signal);
    return () => controller.abort();
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
        <QueryState
          loading={loading}
          error={error}
          data={permits}
          onRetry={() => fetchPermits()}
          errorTitle="Failed to load permits"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <Table<Permit>
              columns={columns}
              data={permits}
              loading
              keyExtractor={(r) => r.id}
              caption="Permit-to-Work records by zone, team, and status"
              emptyMessage="No permits found."
            />
          }
          emptyState={
            <EmptyState
              icon={FileCheck2}
              title="No permits found"
              description="No Permit-to-Work records are currently registered in the system."
            />
          }
        >
          {(data) => {
            const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <>
                <Table<Permit>
                  columns={columns}
                  data={currentData}
                  loading={false}
                  keyExtractor={(r) => r.id}
                  caption="Permit-to-Work records by zone, team, and status"
                  emptyMessage="No permits found."
                />
                {data.length > 0 && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <div className="text-sm text-[var(--sf-text-secondary)]">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.length)}–{Math.min(currentPage * itemsPerPage, data.length)} of {data.length} permits
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.ceil(data.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={page === currentPage ? 'pointer-events-none' : ''}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === Math.ceil(data.length / itemsPerPage)}
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.length / itemsPerPage), p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          }}
        </QueryState>
      </div>
    </Card>
  );
}
