/**
 * Modal
 *
 * Accessible dialog overlay rendered in a React portal.
 *
 * Features:
 *  - Focus trap: keyboard focus is contained inside the modal while open
 *  - Escape key closes (unless `disableEscapeClose` is true)
 *  - Backdrop click closes (unless `disableBackdropClose` is true)
 *  - Body scroll is locked while open
 *  - aria-modal, aria-labelledby, aria-describedby are set automatically
 *
 * @example
 * const [open, setOpen] = useState(false);
 *
 * <Modal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="Acknowledge Alert"
 *   description="This will notify all operators."
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
 *       <Button variant="danger">Confirm</Button>
 *     </>
 *   }
 * >
 *   <p>Are you sure you want to acknowledge this alert?</p>
 * </Modal>
 */

import {
  useEffect,
  useRef,
  useCallback,
  useId,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

// ─── Types ────────────────────────────────────────────────────────

type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

// ─── Props ────────────────────────────────────────────────────────

export interface ModalProps {
  /** Controls visibility. */
  open: boolean;
  /** Called when the modal should close (Escape, backdrop click, close button). */
  onClose: () => void;
  /** Accessible heading rendered at the top of the modal. */
  title?: string;
  /** Supporting text rendered below the title. */
  description?: string;
  /**
   * Max-width preset.
   * @default 'md'
   */
  size?: ModalSize;
  /** Modal body content. */
  children: ReactNode;
  /**
   * Content rendered in the fixed footer bar (e.g. action buttons).
   * Displayed in a right-aligned flex row.
   */
  footer?: ReactNode;
  /**
   * Prevents closing when the user clicks the backdrop.
   * @default false
   */
  disableBackdropClose?: boolean;
  /**
   * Prevents closing when the user presses Escape.
   * @default false
   */
  disableEscapeClose?: boolean;
  /**
   * Hides the built-in × close button in the header.
   * @default false
   */
  hideCloseButton?: boolean;
}

// ─── Style Maps ───────────────────────────────────────────────────

const sizeMap: Record<ModalSize, string> = {
  xs:   'max-w-xs',
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

// ─── Focus Trap Utility ───────────────────────────────────────────

const FOCUSABLE =
  'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),' +
  'textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[hidden]'),
  );
}

// ─── Component ────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  size                = 'md',
  children,
  footer,
  disableBackdropClose = false,
  disableEscapeClose   = false,
  hideCloseButton      = false,
}: ModalProps) {
  const panelRef  = useRef<HTMLDivElement>(null);
  const titleId   = useId();
  const descId    = useId();

  const hasTitle = Boolean(title);
  const hasDesc  = Boolean(description);

  // ── Body scroll lock ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Focus: move into modal on open, restore to trigger on close ─
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || !panelRef.current) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const first = getFocusable(panelRef.current)[0];
    first?.focus();
    return () => triggerRef.current?.focus();
  }, [open]);

  // ── Keyboard handlers ─────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && !disableEscapeClose) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = getFocusable(panelRef.current);
        if (!focusable.length) { e.preventDefault(); return; }

        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [disableEscapeClose, onClose],
  );

  // ── Backdrop click ────────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!disableBackdropClose && e.target === e.currentTarget) {
        onClose();
      }
    },
    [disableBackdropClose, onClose],
  );

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasTitle ? titleId : undefined}
      aria-describedby={hasDesc ? descId : undefined}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/60 backdrop-blur-sm',
        'animate-fade-in',
      )}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full flex flex-col',
          'bg-[var(--sf-surface-overlay)]',
          'border border-[var(--sf-border-strong)]',
          'rounded-2xl shadow-sf-lg',
          'max-h-[calc(100dvh-2rem)] overflow-hidden',
          'animate-scale-in',
          sizeMap[size],
        )}
      >
        {/* ── Header ────────────────────────────────────────── */}
        {(hasTitle || hasDesc || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--sf-border-default)] flex-shrink-0">
            <div className="min-w-0">
              {hasTitle && (
                <h2
                  id={titleId}
                  className="text-base font-semibold text-[var(--sf-text-primary)] leading-snug"
                >
                  {title}
                </h2>
              )}
              {hasDesc && (
                <p id={descId} className="mt-1 text-sm text-[var(--sf-text-tertiary)] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                aria-label="Close dialog"
                className="flex-shrink-0 -mt-1 -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--sf-border-default)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
