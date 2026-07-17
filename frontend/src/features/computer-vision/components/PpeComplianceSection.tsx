/**
 * PpeComplianceSection
 *
 * PPE compliance rate + top violated equipment items, aggregated
 * plant-wide (or scoped to a zone) from the backend's PPE detection
 * pipeline.
 */

import { HardHat, RotateCw } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, Skeleton } from '@/components/ui';
import { formatLabel } from '@/utils/format';
import { usePpeCompliance } from '../hooks';

export interface PpeComplianceSectionProps {
  zone?: string;
}

export function PpeComplianceSection({ zone }: PpeComplianceSectionProps) {
  const { summary, loading, error, refetch } = usePpeCompliance(zone);

  return (
    <Card padding="none">
      <CardHeader
        title="PPE Compliance"
        description="Helmet, vest, gloves, and other required-equipment detection."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && summary && (
            <Badge variant={summary.complianceRate >= 90 ? 'success' : 'warning'} size="sm" dot>
              {summary.complianceRate}% compliant
            </Badge>
          )
        }
      />

      <CardContent className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load PPE compliance"
            actions={
              <Button size="sm" variant="outline" onClick={refetch} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : !summary ? (
          <EmptyState
            icon={HardHat}
            title="No PPE data"
            description="No PPE compliance data is currently available."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-safe-500/10 border border-safe-500/30">
                <span className="text-2xl font-extrabold text-safe-600 dark:text-safe-400 font-mono">
                  {summary.compliantCount}
                </span>
                <span className="text-xs text-[var(--sf-text-tertiary)]">Compliant workers</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-danger-500/10 border border-danger-500/30">
                <span className="text-2xl font-extrabold text-danger-600 dark:text-danger-400 font-mono">
                  {summary.nonCompliantCount}
                </span>
                <span className="text-xs text-[var(--sf-text-tertiary)]">Non-compliant workers</span>
              </div>
            </div>

            {summary.topViolations.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] mb-2">
                  Top Violations
                </p>
                <div className="flex flex-col gap-2">
                  {summary.topViolations.map((v) => (
                    <div key={v.item} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--sf-text-secondary)]">{formatLabel(v.item)}</span>
                      <Badge variant="warning" size="sm">{v.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
