/**
 * RelationshipDetailsPanel
 *
 * Reusable panel that renders node-type-specific fields for the
 * selected knowledge-graph node (Worker, Zone, Permit, Equipment,
 * Incident, Risk) plus the list of relationships connected to it.
 *
 * Pure props-in component — no store/hook coupling, no fetching — so
 * it can be reused anywhere a node + its graph context need to be
 * displayed (e.g. a future node-search result, a modal, etc.).
 * GraphDetailsPanel is the store-connected wrapper used on
 * KnowledgeGraphPage.
 *
 * @example
 * <RelationshipDetailsPanel
 *   node={selectedNode}
 *   nodes={allNodes}
 *   relationships={allRelationships}
 * />
 */

import { ArrowRight, MousePointerClick, Circle } from 'lucide-react';
import { Card, CardHeader, EmptyState, Badge } from '@/components/ui';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { formatLabel, formatDateTime } from '@/utils/format';
import type { SeverityLevel } from '@/constants';
import type { KnowledgeGraphNode, KnowledgeGraphRelationship } from '@/types';
import type { GraphNode } from '@/features/knowledge-graph/components/GraphVisualization';
import { GRAPH_TYPE_META, graphLabelToKind } from '@/features/knowledge-graph/utils/graphTaxonomy';

// ─── Props ────────────────────────────────────────────────────────

export interface RelationshipDetailsPanelProps {
  /** The currently selected node (already adapted for display), or null. */
  node: GraphNode | null;
  /** Full node list from the last graph fetch — used to label connected relationships. */
  nodes: KnowledgeGraphNode[];
  /** Full relationship list from the last graph fetch. */
  relationships: KnowledgeGraphRelationship[];
  className?: string;
}

// ─── Field helpers ─────────────────────────────────────────────────

function field(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}/.test(value);
}

function formatFieldValue(value: unknown): string {
  return isIsoDate(value) ? formatDateTime(value) : field(value);
}

function isSeverityLevel(value: unknown): value is SeverityLevel {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical';
}

/** One label/value row in a details grid. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <dt className="text-[var(--sf-text-tertiary)]">{label}</dt>
      <dd className="text-[var(--sf-text-secondary)] text-right truncate">{value}</dd>
    </div>
  );
}

// ─── Node type field sets ──────────────────────────────────────────
// Each entry lists which properties to surface, in display order, for
// a given graph node label — mirrors the properties actually written
// by backend/src/services/graph_ingestion.py per node type.

const TYPE_FIELDS: Record<string, { key: string; label: string }[]> = {
  Worker: [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'department',  label: 'Department' },
    { key: 'role',        label: 'Role' },
    { key: 'shift',       label: 'Shift' },
    { key: 'ppe_status',  label: 'PPE Compliant' },
    { key: 'status',      label: 'Status' },
  ],
  Zone: [
    { key: 'name', label: 'Name' },
  ],
  Permit: [
    { key: 'permit_type',   label: 'Type' },
    { key: 'status',        label: 'Status' },
    { key: 'issued_by',     label: 'Issued By' },
    { key: 'assigned_team', label: 'Assigned Team' },
    { key: 'start_time',    label: 'Start' },
    { key: 'end_time',      label: 'End' },
  ],
  Equipment: [
    { key: 'name', label: 'Name' },
  ],
  Incident: [
    { key: 'incident_type', label: 'Type' },
    { key: 'severity',      label: 'Severity' },
    { key: 'description',   label: 'Description' },
    { key: 'root_cause',    label: 'Root Cause' },
    { key: 'occurred_at',   label: 'Occurred At' },
  ],
  Risk: [
    { key: 'risk_score',           label: 'Risk Score' },
    { key: 'risk_level',           label: 'Risk Level' },
    { key: 'contributing_factors', label: 'Contributing Factors' },
    { key: 'analyzed_at',          label: 'Analyzed At' },
  ],
};

// ─── Component ────────────────────────────────────────────────────

export function RelationshipDetailsPanel({
  node,
  nodes,
  relationships,
  className,
}: RelationshipDetailsPanelProps) {
  if (!node) {
    return (
      <Card className={className}>
        <CardHeader title="Details" description="Select a node to inspect it." />
        <div className="flex items-center py-4">
          <EmptyState
            size="sm"
            icon={MousePointerClick}
            title="Nothing selected"
            description="Click a node in the graph to view its details here."
          />
        </div>
      </Card>
    );
  }

  const nodeType = typeof node.data?.type === 'string' ? (node.data.type as string) : node.kind ?? 'default';
  const typeMeta = GRAPH_TYPE_META[graphLabelToKind(nodeType)];
  const TypeIcon = typeMeta.kind === 'default' ? Circle : typeMeta.icon;
  const fields = TYPE_FIELDS[nodeType] ?? [];
  const severityValue = node.data?.severity ?? node.data?.risk_level;

  const nodeLabelById = new Map(nodes.map((n) => [n.id, n]));
  const connected = relationships.filter((r) => r.source === node.id || r.target === node.id);

  return (
    <Card className={className}>
      <CardHeader title="Details" description="Details for the selected node." />

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)] flex items-center justify-center">
            <TypeIcon className="w-4 h-4 text-[var(--sf-text-secondary)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">
                {node.label}
              </h4>
              <Badge variant="secondary" size="sm">{nodeType}</Badge>
              {isSeverityLevel(severityValue) && (
                <Badge variant={SEVERITY_BADGE_VARIANT[severityValue]} size="sm">
                  {formatLabel(severityValue)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Type-specific fields */}
        {fields.length > 0 && (
          <dl className="flex flex-col gap-1.5 pt-3 border-t border-[var(--sf-border-default)]">
            {fields.map(({ key, label }) => (
              <DetailRow key={key} label={label} value={formatFieldValue(node.data?.[key])} />
            ))}
          </dl>
        )}

        {/* Connected relationships */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[var(--sf-border-default)]">
          <p className="text-xs font-medium text-[var(--sf-text-tertiary)] uppercase tracking-wide">
            Connected Relationships ({connected.length})
          </p>
          {connected.length === 0 ? (
            <p className="text-sm text-[var(--sf-text-tertiary)]">No relationships found for this node.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {connected.map((rel) => {
                const isOutgoing = rel.source === node.id;
                const neighborId = isOutgoing ? rel.target : rel.source;
                const neighbor = nodeLabelById.get(neighborId);
                const neighborLabel = (neighbor?.properties.name as string | undefined) ?? neighbor?.label ?? neighborId;

                return (
                  <li key={rel.id} className="flex items-center gap-1.5 text-sm min-w-0">
                    {isOutgoing ? (
                      <>
                        <Badge variant="outline" size="sm">{formatLabel(rel.type)}</Badge>
                        <ArrowRight className="w-3 h-3 text-[var(--sf-text-tertiary)] flex-shrink-0" aria-hidden="true" />
                        <span className="text-[var(--sf-text-secondary)] truncate">{neighborLabel}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[var(--sf-text-secondary)] truncate">{neighborLabel}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--sf-text-tertiary)] flex-shrink-0" aria-hidden="true" />
                        <Badge variant="outline" size="sm">{formatLabel(rel.type)}</Badge>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
