/**
 * Collapsible
 *
 * Reusable expand/collapse section with an accessible toggle header.
 * Controlled or uncontrolled. When printed, content always renders
 * expanded regardless of on-screen state — collapsed sections must
 * still appear on a printed page.
 *
 * @example
 * // Uncontrolled
 * <Collapsible title="Timeline" defaultOpen>
 *   <p>…</p>
 * </Collapsible>
 *
 * // Controlled
 * <Collapsible title="Summary" open={open} onOpenChange={setOpen} />
 */

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CollapsibleProps {
  /** Section heading rendered in the toggle header. */
  title: ReactNode;
  /** Optional supporting text rendered below the title. */
  description?: string;
  /** Node rendered on the right side of the header (e.g. a count `Badge`). */
  action?: ReactNode;
  /** Section body. */
  children: ReactNode;
  /** Initial open state for uncontrolled usage. @default true */
  defaultOpen?: boolean;
  /** Controlled open state. Pass with `onOpenChange` to control externally. */
  open?: boolean;
  /** Called with the next open state when the header is toggled. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Collapsible({
  title,
  description,
  action,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const contentId = useId();

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] print:border-0 print:bg-transparent',
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl',
          'print:px-0 print:py-1.5',
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-[var(--sf-text-primary)]">{title}</span>
          {description && (
            <span className="text-xs text-[var(--sf-text-tertiary)]">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[var(--sf-text-tertiary)] transition-transform duration-150 print:hidden',
              isOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>
      </button>
      <div
        id={contentId}
        className={cn(
          'px-4 pb-4 print:px-0 print:pb-2 print:!block',
          !isOpen && 'hidden',
        )}
      >
        {children}
      </div>
    </div>
  );
}
