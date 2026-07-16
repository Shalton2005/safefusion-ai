/**
 * EvidenceViewer
 *
 * Displays the backend evidence behind a conclusion, grouped into five
 * expandable cards: Sensor Evidence, Permit Evidence, Worker Evidence,
 * Graph Relationships, and Retrieved Documents. Purely presentational
 * and reusable — pass any `EvidenceViewerData`; the component never
 * fetches or generates data itself, only renders what it's given.
 *
 * Sensor/Permit/Worker rows reuse this app's existing domain types
 * (`SensorReading`, `Permit`, `Worker` from `@/types`) so any screen
 * that already has that data (a live-monitoring panel, an incident
 * report, an AI decision) can hand it to this component unmodified.
 *
 * @example
 * <EvidenceViewer
 *   data={{
 *     sensorEvidence: [reading],
 *     permitEvidence: [permit],
 *     workerEvidence: [worker],
 *     graphRelationships: [rel],
 *     retrievedDocuments: [doc],
 *   }}
 * />
 */

import { FileText, Flame, Waypoints } from 'lucide-react';
import { Badge, Collapsible, EmptyState, Loader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/utils/format';
import { PermitStatusIndicator } from '@/features/permits/components/PermitStatusIndicator';
import { WorkerStatusIndicator } from '@/features/workers/components/WorkerStatusIndicator';
import type { PermitType, SensorStatus } from '@/types';
import type { EvidenceViewerData } from './types';

export interface EvidenceViewerProps {
  data: EvidenceViewerData | null;
  /** True while evidence is being fetched. Takes precedence over `error`/`data`. */
  loading?: boolean;
  /** Error message to display, or `null` when the last fetch succeeded. */
  error?: string | null;
  className?: string;
}

const SENSOR_STATUS_VARIANT: Record<SensorStatus, 'success' | 'warning' | 'danger'> = {
  normal: 'success',
  warning: 'warning',
  critical: 'danger',
};

/** Mirrors the label map in `PermitDashboardPanel`/`PermitStatusSection` — kept local rather than centralised to avoid touching unrelated features for this component. */
const PERMIT_TYPE_LABEL: Record<PermitType, string> = {
  hot_work: 'Hot Work',
  confined_space: 'Confined Space',
  electrical: 'Electrical',
};

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function EvidenceViewer({ data, loading = false, error = null, className }: EvidenceViewerProps) {
  const containerClass = cn('flex flex-col gap-3', className);

  if (loading) {
    return (
      <div className={containerClass}>
        <Loader size="lg" label="Loading evidence…" className="py-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <EmptyState icon={FileText} title="Couldn't load evidence" description={error} size="sm" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={containerClass}>
        <EmptyState
          icon={FileText}
          title="No evidence available"
          description="Select a conclusion to see the evidence behind it."
          size="sm"
        />
      </div>
    );
  }

  const { sensorEvidence, permitEvidence, workerEvidence, graphRelationships, retrievedDocuments } = data;

  return (
    <div className={containerClass}>
      {/* Sensor Evidence */}
      <Collapsible title="Sensor Evidence" description={countLabel(sensorEvidence.length, 'reading')}>
        {sensorEvidence.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No sensor readings cited as evidence.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sensorEvidence.map((reading) => (
              <li
                key={reading.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Flame className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--sf-text-primary)] capitalize">
                      {reading.sensor_type} — {reading.zone}
                    </p>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">{formatDateTime(reading.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-mono font-semibold text-[var(--sf-text-primary)]">
                    {reading.value}{reading.unit}
                  </span>
                  <Badge variant={SENSOR_STATUS_VARIANT[reading.status]} size="sm" dot pulsing={reading.status === 'critical'}>
                    {reading.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Permit Evidence */}
      <Collapsible title="Permit Evidence" description={countLabel(permitEvidence.length, 'permit')}>
        {permitEvidence.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No permits cited as evidence.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {permitEvidence.map((permit) => (
              <PermitStatusIndicator
                key={permit.id}
                permitId={permit.id}
                permitType={PERMIT_TYPE_LABEL[permit.permit_type]}
                worker={permit.assigned_team}
                status={permit.status}
                expiryTime={permit.end_time}
                isExpired={permit.status !== 'closed' && new Date(permit.end_time).getTime() < Date.now()}
              />
            ))}
          </div>
        )}
      </Collapsible>

      {/* Worker Evidence */}
      <Collapsible title="Worker Evidence" description={countLabel(workerEvidence.length, 'worker')}>
        {workerEvidence.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No workers cited as evidence.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workerEvidence.map((worker) => (
              <WorkerStatusIndicator
                key={worker.id}
                name={worker.name}
                zone={worker.current_zone}
                shift={worker.shift}
                ppeCompliant={worker.ppe_status}
              />
            ))}
          </div>
        )}
      </Collapsible>

      {/* Graph Relationships */}
      <Collapsible title="Graph Relationships" description={countLabel(graphRelationships.length, 'relationship')}>
        {graphRelationships.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No knowledge graph relationships cited as evidence.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {graphRelationships.map((rel) => (
              <li
                key={rel.id}
                className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)] text-sm"
              >
                <Waypoints className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                <span className="font-medium text-[var(--sf-text-primary)]">{rel.sourceLabel}</span>
                <Badge variant="outline" size="sm">{rel.sourceType}</Badge>
                <Badge variant="ghost" size="sm" className="font-mono">{rel.type}</Badge>
                <span className="font-medium text-[var(--sf-text-primary)]">{rel.targetLabel}</span>
                <Badge variant="outline" size="sm">{rel.targetType}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Retrieved Documents */}
      <Collapsible title="Retrieved Documents" description={countLabel(retrievedDocuments.length, 'document')}>
        {retrievedDocuments.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No supporting documents were retrieved.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {retrievedDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)] min-w-0">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                    <span className="truncate">{doc.title ?? doc.source}</span>
                  </span>
                  {doc.similarity !== null && (
                    <Badge variant="ghost" size="sm" className="flex-shrink-0">
                      {Math.round(doc.similarity * 100)}% match
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed">{doc.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </div>
  );
}
