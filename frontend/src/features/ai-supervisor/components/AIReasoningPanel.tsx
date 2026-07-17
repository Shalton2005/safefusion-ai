/**
 * AIReasoningPanel
 *
 * Displays why the AI reached a conclusion: a narrative summary,
 * confidence, risk level, triggered rules, evidence sources, retrieved
 * regulations, and knowledge graph references. Purely presentational —
 * every value is rendered exactly as received from the API; this
 * component never generates, summarises, or infers reasoning itself.
 *
 * Explicit `loading` / `error` / empty-`data` states are handled here so
 * callers only need to pass through whatever their fetch hook reports.
 *
 * @example
 * <AIReasoningPanel data={reasoning} loading={loading} error={error} />
 */

import {
  AlertTriangle,
  BrainCircuit,
  FileText,
  Gauge,
  ListChecks,
  Waypoints,
} from 'lucide-react';
import { Badge, Collapsible, EmptyState, Loader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, CONFIDENCE_TIER_TEXT_CLASS, CONFIDENCE_TIER_BAR_CLASS, confidenceTier } from '@/utils/severity';
import type { AIReasoningData } from '../types';

export interface AIReasoningPanelProps {
  data: AIReasoningData | null;
  /** True while the reasoning is being fetched. Takes precedence over `error` and `data`. */
  loading?: boolean;
  /** Error message to display, or `null` when the last fetch succeeded. */
  error?: string | null;
  className?: string;
}

function SectionHeading({ icon: Icon, children }: { icon: typeof ListChecks; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

export function AIReasoningPanel({ data, loading = false, error = null, className }: AIReasoningPanelProps) {
  const containerClass = cn(
    'flex flex-col gap-3 p-5 rounded-xl',
    'bg-[var(--sf-surface-card)]',
    'border border-[var(--sf-border-default)]',
    'shadow-sf-card',
    className,
  );

  if (loading) {
    return (
      <div className={containerClass}>
        <Loader size="lg" label="Generating reasoning…" className="py-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load reasoning"
          description={error}
          size="sm"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={containerClass}>
        <EmptyState
          icon={BrainCircuit}
          title="No reasoning available"
          description="Select an AI-generated conclusion to see the reasoning behind it."
          size="sm"
        />
      </div>
    );
  }

  const {
    summary,
    confidence,
    riskLevel,
    triggeredRules,
    evidenceSources,
    retrievedRegulations,
    knowledgeGraphReferences,
  } = data;
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  return (
    <div className={containerClass}>
      {/* Header: Risk Level + Confidence */}
      <div className="flex items-start justify-between gap-3">
        <SectionHeading icon={BrainCircuit}>AI Reasoning</SectionHeading>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={SEVERITY_BADGE_VARIANT[riskLevel]} size="sm" dot pulsing={riskLevel === 'critical'}>
            {capitalise(riskLevel)} risk
          </Badge>
        </div>
      </div>

      {/* AI Summary */}
      <p className="text-sm text-[var(--sf-text-primary)] leading-relaxed">{summary}</p>

      {/* Confidence */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            <Gauge className="w-3 h-3" aria-hidden="true" />
            Confidence
          </span>
          <span className={cn('text-sm font-bold font-mono', CONFIDENCE_TIER_TEXT_CLASS[confidenceTier(clampedConfidence)])}>
            {clampedConfidence}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clampedConfidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reasoning confidence"
          className="w-full h-2 rounded-full bg-[var(--sf-surface-sunken)] overflow-hidden"
        >
          <div
            className={cn('h-full rounded-full transition-all duration-300', CONFIDENCE_TIER_BAR_CLASS[confidenceTier(clampedConfidence)])}
            style={{ width: `${clampedConfidence}%` }}
          />
        </div>
      </div>

      {/* Triggered Rules */}
      <Collapsible title="Triggered Rules" description={`${triggeredRules.length} rule${triggeredRules.length === 1 ? '' : 's'}`}>
        {triggeredRules.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No rules were triggered.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {triggeredRules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)]">
                  <ListChecks className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                  {rule.name}
                </span>
                <span className="text-xs text-[var(--sf-text-tertiary)]">{rule.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Evidence Sources */}
      <Collapsible
        title="Evidence Sources"
        description={`${evidenceSources.length} item${evidenceSources.length === 1 ? '' : 's'}`}
      >
        {evidenceSources.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No supporting evidence recorded.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {evidenceSources.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">{item.type}</span>
                  <span className="text-sm text-[var(--sf-text-primary)]">{item.label}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
                  <span className="text-sm font-mono font-medium text-[var(--sf-text-primary)]">{item.value}</span>
                  {item.timestamp && (
                    <span className="text-2xs text-[var(--sf-text-tertiary)]">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Retrieved Regulations */}
      <Collapsible
        title="Retrieved Regulations"
        description={`${retrievedRegulations.length} document${retrievedRegulations.length === 1 ? '' : 's'}`}
      >
        {retrievedRegulations.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No supporting regulatory text was retrieved.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {retrievedRegulations.map((reg) => (
              <li
                key={reg.id}
                className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--sf-text-primary)] min-w-0">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                    <span className="truncate">{reg.title ?? reg.source}</span>
                  </span>
                  {reg.similarity !== null && (
                    <Badge variant="ghost" size="sm" className="flex-shrink-0">
                      {Math.round(reg.similarity * 100)}% match
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed">{reg.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Knowledge Graph References */}
      <Collapsible
        title="Knowledge Graph References"
        description={`${knowledgeGraphReferences.length} entit${knowledgeGraphReferences.length === 1 ? 'y' : 'ies'}`}
      >
        {knowledgeGraphReferences.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No knowledge graph entities referenced.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {knowledgeGraphReferences.map((ref) => (
              <li
                key={ref.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <Waypoints className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                <span className="text-sm text-[var(--sf-text-primary)]">{ref.name}</span>
                <Badge variant="outline" size="sm">{ref.label}</Badge>
                {ref.relationship && (
                  <span className="text-2xs text-[var(--sf-text-tertiary)]">{ref.relationship}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </div>
  );
}
