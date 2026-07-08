/**
 * ActivityFeedSection
 *
 * Renders one titled, badge-counted list of activity items — the building
 * block every section of the ActivityPanel (alerts, incidents, worker
 * activity, permit activity) is made from.
 *
 * @example
 * <ActivityFeedSection
 *   title="Recent Alerts"
 *   icon={AlertTriangle}
 *   iconTone="danger"
 *   items={alerts}
 *   emptyLabel="No recent alerts"
 * />
 */

import { Badge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ActivityFeedItem, ActivityTone } from './types';

export interface ActivityFeedSectionProps {
  title: string;
  icon: React.ElementType;
  iconTone: ActivityTone;
  items: ActivityFeedItem[];
  emptyLabel: string;
}

const toneTextClass: Record<ActivityTone, string> = {
  primary: 'text-primary-500',
  success: 'text-safe-500',
  warning: 'text-caution-500',
  danger:  'text-danger-500',
  default: 'text-[var(--sf-text-tertiary)]',
};

const toneBadgeVariant: Record<ActivityTone, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger:  'danger',
  default: 'default',
};

const toneDotClass: Record<ActivityTone, string> = {
  primary: 'bg-primary-500',
  success: 'bg-safe-500',
  warning: 'bg-caution-500',
  danger:  'bg-danger-500',
  default: 'bg-[var(--sf-text-tertiary)]',
};

export function ActivityFeedSection({
  title,
  icon: Icon,
  iconTone,
  items,
  emptyLabel,
}: ActivityFeedSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', toneTextClass[iconTone])} aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            {title}
          </h3>
        </div>
        {items.length > 0 && (
          <Badge variant={toneBadgeVariant[iconTone]} size="sm">
            {items.length}
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Icon} title={emptyLabel} size="sm" />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] p-3"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', toneDotClass[iconTone])}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--sf-text-primary)] leading-snug">
                      {item.title}
                    </p>
                    {item.badgeLabel && (
                      <Badge variant={toneBadgeVariant[item.tone ?? iconTone]} size="sm">
                        {item.badgeLabel}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-[var(--sf-text-tertiary)] leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-2xs text-[var(--sf-text-tertiary)]">{item.time}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
