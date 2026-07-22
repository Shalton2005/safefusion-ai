/**
 * IncidentReportViewer
 *
 * Reusable, presentational six-section incident report — Summary,
 * Timeline, Detected Risks, Emergency Actions, and Compliance Notes
 * (plus Triggered Rules, part of the same backend payload), each in a
 * collapsible section. Props-in only, no fetching. Printable: expanding
 * sections is a screen-only convenience — printing always renders every
 * section's content in full via `Collapsible`'s `print:` override.
 *
 * @example
 * <IncidentReportViewer report={report} />
 */

import { Badge, Card, Collapsible } from '@/components/ui';
import {
  SEVERITY_BADGE_VARIANT,
  INCIDENT_TYPE_LABEL,
  EMERGENCY_ACTION_LABEL,
  COMPLIANCE_FRAMEWORK_BADGE_VARIANT,
  COMPLIANCE_FRAMEWORK_LABEL,
  COMPLIANCE_STATUS_BADGE_VARIANT,
  COMPLIANCE_STATUS_LABEL,
} from '@/utils/severity';
import { capitalise, formatDateTime } from '@/utils/format';
import type { IncidentReportData } from '@/types';

export interface IncidentReportViewerProps {
  report: IncidentReportData;
  className?: string;
}

export function IncidentReportViewer({ report, className }: IncidentReportViewerProps) {
  const { summary, timeline, detected_risks, triggered_rules, emergency_actions, compliance_notes, compliance_status } = report;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:flex print:flex-col print:gap-3">
        {/* Left Column */}
        <div className="flex flex-col gap-4 print:gap-3">
          {/* Summary */}
          <Collapsible
            title="Summary"
            defaultOpen
            action={
              <Badge variant={SEVERITY_BADGE_VARIANT[summary.severity]} size="sm" dot pulsing={summary.severity === 'critical'}>
                {capitalise(summary.severity)}
              </Badge>
            }
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Incident ID</dt>
                <dd className="text-[var(--sf-text-primary)] font-mono text-xs mt-0.5">{summary.incident_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Zone</dt>
                <dd className="text-[var(--sf-text-primary)] mt-0.5">{summary.zone}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Incident Type</dt>
                <dd className="text-[var(--sf-text-primary)] mt-0.5">{INCIDENT_TYPE_LABEL[summary.incident_type]}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Root Cause</dt>
                <dd className="text-[var(--sf-text-primary)] mt-0.5">{summary.root_cause ?? 'Not yet determined'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Description</dt>
                <dd className="text-[var(--sf-text-primary)] leading-relaxed mt-0.5">{summary.description}</dd>
              </div>
            </dl>
          </Collapsible>

          {/* Timeline */}
          <Collapsible title="Timeline" description={`${timeline.length} event${timeline.length === 1 ? '' : 's'}`} defaultOpen>
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--sf-text-tertiary)]">No timeline events recorded.</p>
            ) : (
              <ol className="flex flex-col gap-3 border-l border-[var(--sf-border-default)] pl-4 print:border-l-0 print:pl-0 print:gap-2">
                {timeline.map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.375rem] top-1 w-2 h-2 rounded-full bg-primary-500 print:hidden" aria-hidden="true" />
                    <p className="text-sm font-medium text-[var(--sf-text-primary)]">{event.label}</p>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">{formatDateTime(event.timestamp)}</p>
                    <p className="text-sm text-[var(--sf-text-secondary)] mt-0.5">{event.description}</p>
                  </li>
                ))}
              </ol>
            )}
          </Collapsible>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 print:gap-3">
          {/* Detected Risks */}
          <Collapsible title="Detected Risks" description={`${detected_risks.length} zone${detected_risks.length === 1 ? '' : 's'} evaluated`} defaultOpen>
            {detected_risks.length === 0 ? (
              <p className="text-sm text-[var(--sf-text-tertiary)]">No risks detected.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {detected_risks.map((risk, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--sf-surface-sunken)] print:bg-transparent print:p-0 print:border-b print:border-[var(--sf-border-default)] print:rounded-none">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">{risk.zone}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={SEVERITY_BADGE_VARIANT[risk.risk_level]} size="sm">
                          {capitalise(risk.risk_level)}
                        </Badge>
                        <span className="text-xs text-[var(--sf-text-tertiary)]">{risk.risk_score.toFixed(1)} / 100</span>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--sf-text-secondary)]">{risk.explanation}</p>
                  </div>
                ))}
                {triggered_rules.length > 0 && (
                  <div className="mt-1 flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--sf-text-tertiary)]">Triggered Rules</span>
                    {triggered_rules.map((rule, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm">
                        <span className="text-[var(--sf-text-secondary)]">{rule.explanation}</span>
                        <span className="text-xs text-[var(--sf-text-tertiary)] flex-shrink-0">+{rule.points.toFixed(0)} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Collapsible>

          {/* Emergency Actions */}
          <Collapsible title="Emergency Actions" description={`${emergency_actions.length} action${emergency_actions.length === 1 ? '' : 's'} dispatched`} defaultOpen>
            {emergency_actions.length === 0 ? (
              <p className="text-sm text-[var(--sf-text-tertiary)]">No emergency actions were dispatched for this incident.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {emergency_actions.map((entry, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--sf-surface-sunken)] print:bg-transparent print:p-0 print:border-b print:border-[var(--sf-border-default)] print:rounded-none">
                    <span className="text-sm font-medium text-[var(--sf-text-primary)]">{EMERGENCY_ACTION_LABEL[entry.action]}</span>
                    <p className="text-sm text-[var(--sf-text-secondary)]">{entry.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Collapsible>

          {/* Compliance Notes */}
          <Collapsible
            title="Compliance Notes"
            description={`${compliance_notes.length} note${compliance_notes.length === 1 ? '' : 's'}`}
            defaultOpen
            action={
              compliance_status && (
                <Badge variant={COMPLIANCE_STATUS_BADGE_VARIANT[compliance_status]} size="sm">
                  {COMPLIANCE_STATUS_LABEL[compliance_status]}
                </Badge>
              )
            }
          >
            {compliance_notes.length === 0 ? (
              <p className="text-sm text-[var(--sf-text-tertiary)]">No compliance notes for this incident.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {compliance_notes.map((note) => (
                  <Card key={note.rule_code} padding="sm" className="print:border-0 print:p-0 print:shadow-none print:border-b print:rounded-none print:border-[var(--sf-border-default)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">{note.title}</span>
                      <Badge variant={COMPLIANCE_FRAMEWORK_BADGE_VARIANT[note.framework]} size="sm">
                        {COMPLIANCE_FRAMEWORK_LABEL[note.framework]}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--sf-text-secondary)] mt-1">{note.description}</p>
                    <p className="text-xs text-[var(--sf-text-tertiary)] mt-2">
                      <span className="font-medium">Recommendation: </span>
                      {note.recommendation}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
