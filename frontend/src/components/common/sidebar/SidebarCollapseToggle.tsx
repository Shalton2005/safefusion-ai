import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SidebarCollapseToggleProps {
  /** True when the sidebar is in its narrow, icon-only state. */
  collapsed: boolean;
  /** Label shown next to the icon when expanded (e.g. "Collapse" or "Close"). */
  label: string;
  /** Accessible name for the button (e.g. "Collapse sidebar" or "Close sidebar"). */
  ariaLabel: string;
  onClick: () => void;
}

export function SidebarCollapseToggle({ collapsed, label, ariaLabel, onClick }: SidebarCollapseToggleProps) {
  return (
    <div className="p-2 border-t border-white/10">
      <button
        onClick={onClick}
        aria-label={collapsed ? 'Expand sidebar' : ariaLabel}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'text-[var(--sf-text-tertiary)] hover:text-white hover:bg-white/10',
          'transition-colors duration-150',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
