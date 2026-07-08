import { useEffect, useState } from 'react';
import { Bell, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, Alert as AlertBanner, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { incidentsService } from '@/services';
import { ApiError } from '@/api/errors';
import { capitalise, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, INCIDENT_TYPE_LABEL } from '@/utils/severity';
import type { Incident, IncidentType } from '@/types';
import type { SeverityLevel } from '@/constants';

const columns: TableColumn<Incident>[] = [
  {
    key: 'severity',
    header: 'Alert Severity',
    accessor: 'severity',
    render: (v) => (
      <Badge variant={SEVERITY_BADGE_VARIANT[v as SeverityLevel]} size="sm" dot pulsing={v === 'critical'}>
        {capitalise(v as string)}
      </Badge>
    ),
  },
  {
    key: 'incident_type',
    header: 'Alert Type',
    accessor: 'incident_type',
    render: (v) => <span className="text-[var(--sf-text-secondary)]">{INCIDENT_TYPE_LABEL[v as IncidentType]}</span>,
  },
  {
    key: 'zone',
    header: 'Location',
    accessor: 'zone',
  },
  {
    key: 'occurred_at',
    header: 'Timestamp',
    accessor: 'occurred_at',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">
        {formatRelativeTime(v as string)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: () => (
      <Badge variant="outline" size="sm">
        Reported
      </Badge>
    ),
  },
];

export function AlertsPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await incidentsService.getIncidents({ skip: 0, limit: 100 });
      setIncidents(data);
    } catch (err) {
      setError(ApiError.from(err).toUserMessage());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Alerts"
        description="Safety alerts by severity, type, and location."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && incidents.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              <Bell className="w-3 h-3 mr-1" />
              {incidents.length} alert{incidents.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />
      <div className="p-4">
        {error ? (
          <AlertBanner
            variant="danger"
            title="Failed to load alerts"
            actions={
              <Button size="sm" variant="outline" onClick={fetchIncidents} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </AlertBanner>
        ) : !loading && incidents.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alerts"
            description="No safety alerts have been reported."
          />
        ) : (
          <Table<Incident>
            columns={columns}
            data={incidents}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="Safety alerts by severity, type, and location"
            emptyMessage="No alerts found."
          />
        )}
      </div>
    </Card>
  );
}
