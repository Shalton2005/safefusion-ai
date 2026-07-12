/**
 * EmergencyResponsePanel
 *
 * Presentational table of emergency actions dispatched by the backend
 * Emergency Response engine, in the order the backend returned them
 * (its recommended dispatch order) — never re-ordered or generated here.
 */

import { Badge, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { SEVERITY_BADGE_VARIANT, SEVERITY_PRIORITY_LABEL, EMERGENCY_ACTION_LABEL } from '@/utils/severity';
import type { EmergencyActionItem } from '@/types';

const columns: TableColumn<EmergencyActionItem>[] = [
  {
    key: 'order',
    header: 'Order',
    accessor: 'order',
    width: '4.5rem',
    align: 'center',
    render: (v) => (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-[var(--sf-surface-sunken)] text-[var(--sf-text-secondary)]">
        {v as number}
      </span>
    ),
  },
  {
    key: 'action',
    header: 'Action Name',
    accessor: 'action',
    render: (v, row) => (
      <div className="flex flex-col">
        <span className="font-medium text-[var(--sf-text-primary)]">
          {EMERGENCY_ACTION_LABEL[v as EmergencyActionItem['action']]}
        </span>
        <span className="text-xs text-[var(--sf-text-tertiary)]">{row.zone}</span>
      </div>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: 'risk_level',
    render: (v) => (
      <Badge variant={SEVERITY_BADGE_VARIANT[v as EmergencyActionItem['risk_level']]} size="sm" dot pulsing={v === 'critical'}>
        {SEVERITY_PRIORITY_LABEL[v as EmergencyActionItem['risk_level']]}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'action',
    render: () => (
      <Badge variant="danger" size="sm">
        Dispatched
      </Badge>
    ),
  },
];

export interface EmergencyResponsePanelProps {
  actions: EmergencyActionItem[];
}

export function EmergencyResponsePanel({ actions }: EmergencyResponsePanelProps) {
  return (
    <Table<EmergencyActionItem>
      columns={columns}
      data={actions}
      keyExtractor={(row) => `${row.zone}-${row.action}`}
      caption="Emergency actions dispatched by zone, priority, status, and recommended order"
      emptyMessage="No emergency actions dispatched."
    />
  );
}
