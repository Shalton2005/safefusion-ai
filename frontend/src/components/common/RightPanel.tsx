import { useId } from 'react';
import { PanelRightClose, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRightPanelStore, toast } from '@/store';
import { ActivityPanel } from '@/components/common/activity-panel';
import { Button } from '@/components/ui';

import { formatRelativeTime } from '@/utils/format';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import type { ActivityFeedItem } from '@/components/common/activity-panel/types';
import { alertsService } from '@/services/alerts.service';

export function RightPanel() {
  const open = useRightPanelStore((s) => s.open);
  const setOpen = useRightPanelStore((s) => s.setOpen);
  const headingId = useId();

  const alertsData = useRecentAlerts({ limit: 10 });
  
  const alertsFeed = alertsData.alerts
    .map((a): ActivityFeedItem => ({
      id: a.id,
      title: a.alert_type,
      description: a.message,
      time: formatRelativeTime(a.generated_at),
      badgeLabel: a.zone,
      tone: a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'primary',
    }));

  const handleClearAll = async () => {
    try {
      await alertsService.clearAllAlerts();
      toast.success('All alerts cleared globally.');
      alertsData.refresh();
    } catch (e) {
      toast.error('Failed to clear alerts.');
    }
  };

  if (!open) return null;

  return (
    <aside
      aria-labelledby={headingId}
      className={cn(
        'hidden xl:flex flex-col w-80 flex-shrink-0 h-screen overflow-hidden',
        'bg-[var(--sf-surface-card)] border-l border-[var(--sf-border-default)]',
      )}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sf-border-default)]">
        <h2 id={headingId} className="text-sm font-semibold text-[var(--sf-text-primary)]">Alerts &amp; Activity</h2>
        <div className="flex items-center gap-2">
          {alertsFeed.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)]" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ActivityPanel alerts={alertsFeed} className="flex-1" maxHeight="none" />
    </aside>
  );
}

export function RightPanelToggle() {
  const open = useRightPanelStore((s) => s.open);
  const toggle = useRightPanelStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      aria-label={open ? 'Hide alerts panel' : 'Show alerts panel'}
      aria-pressed={open}
      className={cn(
        'hidden xl:inline-flex p-2 rounded-lg transition-colors',
        'text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)]',
      )}
    >
      {open ? <X className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
    </button>
  );
}
