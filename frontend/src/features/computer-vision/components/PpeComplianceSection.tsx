/**
 * PpeComplianceSection
 *
 * PPE Compliance Panel — helmet compliance, vest compliance,
 * non-compliant worker count, and overall compliance percentage as
 * `StatCard`s (reusing the shared dashboard KPI card, same pattern as
 * `DetectionSummarySection`), plus a list of currently-open violations.
 */

import { AlertTriangle, HardHat, ShieldCheck, Users } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, EmptyState, QueryState, Skeleton, StatCard } from '@/components/ui';
import { formatLabel, formatDateTime, formatRelativeTime } from '@/utils/format';
import { usePpeCompliance, usePpeViolations } from '../hooks';
import type { PpeComplianceSummary, PpeItemType, PpeViolation } from '../types';

export interface PpeComplianceSectionProps {
  zone?: string;
}

function itemRate(itemComplianceRates: { item: PpeItemType; complianceRate: number }[], item: PpeItemType): number | null {
  return itemComplianceRates.find((r) => r.item === item)?.complianceRate ?? null;
}

export function PpeComplianceSection({ zone }: PpeComplianceSectionProps) {
  const { summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = usePpeCompliance(zone);
  const { violations, loading: violationsLoading, error: violationsError, refetch: refetchViolations } = usePpeViolations(zone);

  const helmetRate = summary ? itemRate(summary.itemComplianceRates, 'helmet') : null;
  const vestRate = summary ? itemRate(summary.itemComplianceRates, 'vest') : null;

  const refetch = () => {
    refetchSummary();
    refetchViolations();
  };

  return (
    <Card padding="none">
      <CardHeader
        title="PPE Compliance"
        description="Helmet, vest, and required-equipment detection across all monitored zones."
        className="px-6 pt-5 pb-0"
        action={
          !summaryLoading && !summaryError && summary && (
            <Badge variant={summary.complianceRate >= 90 ? 'success' : 'warning'} size="sm" dot>
              {summary.complianceRate}% compliant
            </Badge>
          )
        }
      />

      <CardContent className="p-4">
        <QueryState<PpeComplianceSummary>
          loading={summaryLoading}
          error={summaryError}
          data={summary}
          onRetry={refetch}
          errorTitle="Failed to load PPE compliance"
          isEmpty={(d) => d.compliantCount + d.nonCompliantCount === 0}
          emptyState={
            <EmptyState
              icon={HardHat}
              title="No PPE compliance data"
              description="No workers have been observed in this zone yet."
            />
          }
          loadingFallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading PPE compliance">
              <StatCard label="Helmet Compliance" value="" icon={HardHat} iconVariant="warning" loading />
              <StatCard label="Vest Compliance" value="" icon={ShieldCheck} iconVariant="warning" loading />
              <StatCard label="Non-Compliant Workers" value="" icon={Users} iconVariant="danger" loading />
              <StatCard label="Compliance Percentage" value="" icon={AlertTriangle} iconVariant="warning" loading />
            </div>
          }
        >
          {() => (
            <div className="flex flex-col gap-5">
              {/* ── Stat cards ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Helmet Compliance"
                  value={helmetRate === null ? '' : `${helmetRate}%`}
                  icon={HardHat}
                  iconVariant={helmetRate !== null && helmetRate < 90 ? 'warning' : 'success'}
                />
                <StatCard
                  label="Vest Compliance"
                  value={vestRate === null ? '' : `${vestRate}%`}
                  icon={ShieldCheck}
                  iconVariant={vestRate !== null && vestRate < 90 ? 'warning' : 'success'}
                />
                <StatCard
                  label="Non-Compliant Workers"
                  value={summary ? summary.nonCompliantCount : ''}
                  icon={Users}
                  iconVariant={summary && summary.nonCompliantCount > 0 ? 'danger' : 'success'}
                />
                <StatCard
                  label="Compliance Percentage"
                  value={summary ? `${summary.complianceRate}%` : ''}
                  icon={AlertTriangle}
                  iconVariant={summary && summary.complianceRate < 90 ? 'warning' : 'success'}
                />
              </div>

              {/* ── Current violations ─────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] mb-2">
                  Current Violations
                </p>

                <QueryState<PpeViolation[]>
                  loading={violationsLoading}
                  error={violationsError}
                  data={violations}
                  onRetry={refetchViolations}
                  errorTitle="Failed to load violations"
                  isEmpty={(d) => d.length === 0}
                  emptyState={
                    <EmptyState
                      size="sm"
                      icon={ShieldCheck}
                      title="No active violations"
                      description="Every detected worker currently meets PPE requirements."
                    />
                  }
                  loadingFallback={
                    <div className="space-y-2" aria-busy="true" aria-label="Loading violations">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  }
                >
                  {(violationsData) => (
                    <ul className="flex flex-col gap-2">
                      {violationsData.map((violation) => (
                        <li
                          key={violation.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] motion-safe:animate-fade-in"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--sf-text-primary)]">
                              {violation.workerId ? `Worker ${violation.workerId}` : 'Unidentified worker'}
                              <span className="text-[var(--sf-text-tertiary)] font-normal"> — {violation.zone}</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {violation.missingItems.map((item) => (
                                <Badge key={item} variant="danger" size="sm">
                                  Missing {formatLabel(item)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <span
                            className="text-xs text-[var(--sf-text-tertiary)] flex-shrink-0"
                            title={formatDateTime(violation.detectedAt)}
                          >
                            {formatRelativeTime(violation.detectedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryState>
              </div>
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
