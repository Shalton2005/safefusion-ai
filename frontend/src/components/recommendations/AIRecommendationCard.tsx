/**
 * AIRecommendationCard
 *
 * Displays a single AI-surfaced recommendation: priority, title,
 * description, affected area, confidence, and action type. Built on
 * the shared `Card`/`CardHeader`/`CardContent` components — no bespoke
 * card styling — and the existing `SEVERITY_BADGE_VARIANT` map so
 * priority colours always match the rest of the app (Alerts, AI
 * Supervisor, Risk panels, etc.).
 *
 * Purely presentational — pass an `AIRecommendation`; nothing here is
 * generated or inferred.
 *
 * @example
 * <AIRecommendationCard
 *   recommendation={{
 *     id: 'r1',
 *     priority: 'high',
 *     title: 'Re-inspect Zone-A gas sensors',
 *     description: 'Two sensors reported readings inconsistent with the zone average over the last hour.',
 *     affectedArea: 'Zone-A',
 *     confidence: 82,
 *     actionType: 'Inspection',
 *   }}
 * />
 */

import { Gauge, MapPin, Wrench } from 'lucide-react';
import { Badge, Card, CardHeader, CardContent } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { AIRecommendation } from './types';

export interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  className?: string;
}

const CONFIDENCE_TEXT_CLASS: Record<'safe' | 'caution' | 'danger', string> = {
  safe: 'text-safe-600 dark:text-safe-400',
  caution: 'text-caution-600 dark:text-caution-400',
  danger: 'text-danger-600 dark:text-danger-400',
};

function confidenceTier(value: number): 'safe' | 'caution' | 'danger' {
  if (value >= 75) return 'safe';
  if (value >= 40) return 'caution';
  return 'danger';
}

export function AIRecommendationCard({ recommendation, className }: AIRecommendationCardProps) {
  const { priority, title, description, affectedArea, confidence, actionType } = recommendation;
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  return (
    <Card variant="default" padding="md" className={cn('flex flex-col gap-3', className)}>
      <CardHeader
        title={title}
        action={
          <Badge variant={SEVERITY_BADGE_VARIANT[priority]} size="sm" dot pulsing={priority === 'critical'}>
            {capitalise(priority)}
          </Badge>
        }
      />

      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">{description}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <span className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {affectedArea}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]">
            <Wrench className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {actionType}
          </span>
          <span className="flex items-center gap-1.5 text-xs ml-auto">
            <Gauge className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
            <span className="text-[var(--sf-text-tertiary)]">Confidence</span>
            <span className={cn('font-mono font-semibold', CONFIDENCE_TEXT_CLASS[confidenceTier(clampedConfidence)])}>
              {clampedConfidence}%
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
