/**
 * RecommendationPanel
 *
 * Reusable, presentational table of ordered operator recommendations.
 * Props-in only, no fetching — renders exactly the order the backend
 * returned (its own priority ranking), never re-sorted or generated here.
 *
 * @example
 * <RecommendationPanel recommendations={recommendations} />
 */

import { Badge, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { RECOMMENDATION_SOURCE_LABEL, RECOMMENDATION_SOURCE_BADGE_VARIANT } from '@/utils/severity';
import type { Recommendation } from '@/types';

const columns: TableColumn<Recommendation>[] = [
  {
    key: 'priority',
    header: 'Priority',
    accessor: 'priority',
    width: '5.5rem',
    align: 'center',
    render: (v) => (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-[var(--sf-surface-sunken)] text-[var(--sf-text-secondary)]">
        {v as number}
      </span>
    ),
  },
  {
    key: 'message',
    header: 'Recommendation',
    accessor: 'message',
    render: (v, row) => (
      <div className="flex flex-col">
        <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>
        {row.zone && <span className="text-xs text-[var(--sf-text-tertiary)]">{row.zone}</span>}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'source',
    render: (v) => (
      <Badge variant={RECOMMENDATION_SOURCE_BADGE_VARIANT[v as Recommendation['source']]} size="sm">
        {RECOMMENDATION_SOURCE_LABEL[v as Recommendation['source']]}
      </Badge>
    ),
  },
];

export interface RecommendationPanelProps {
  recommendations: Recommendation[];
}

export function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  return (
    <Table<Recommendation>
      columns={columns}
      data={recommendations}
      keyExtractor={(row, index) => `${row.source}-${row.zone ?? 'plant'}-${row.priority}-${row.reason}-${index}`}
      caption="Ordered operator recommendations by priority, message, and originating engine"
      emptyMessage="No recommendations available."
    />
  );
}
