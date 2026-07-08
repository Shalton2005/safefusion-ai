import { PanelRightClose, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRightPanelStore } from '@/store';
import { ActivityPanel } from '@/components/common/activity-panel';

export function RightPanel() {
  const { open, setOpen } = useRightPanelStore();

  if (!open) return null;

  return (
    <aside
      className={cn(
        'hidden xl:flex flex-col w-80 flex-shrink-0 h-screen overflow-hidden',
        'bg-[var(--sf-surface-card)] border-l border-[var(--sf-border-default)]',
      )}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sf-border-default)]">
        <h2 className="text-sm font-semibold text-[var(--sf-text-primary)]">Alerts &amp; Activity</h2>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close panel"
          className="p-1.5 rounded-lg text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <ActivityPanel className="flex-1" maxHeight="none" />
    </aside>
  );
}

export function RightPanelToggle() {
  const { open, toggle } = useRightPanelStore();

  return (
    <button
      onClick={toggle}
      aria-label={open ? 'Hide alerts panel' : 'Show alerts panel'}
      aria-pressed={open}
      className={cn(
        'hidden xl:inline-flex p-2 rounded-lg transition-colors',
        'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]',
      )}
    >
      {open ? <X className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
    </button>
  );
}
