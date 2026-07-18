/**
 * PageHeader
 *
 * Standardised page-level header rendered at the top of every main view.
 * Handles: optional back navigation, breadcrumb trail, page title,
 * badge label, description, and a right-aligned actions slot.
 *
 * @example
 * // Minimal
 * <PageHeader title="Dashboard" description="System overview" />
 *
 * // With breadcrumbs + badge + action
 * <PageHeader
 *   title="Alert Detail"
 *   breadcrumbs={[
 *     { label: 'Alerts', href: '/alerts' },
 *     { label: 'ALT-00042' },
 *   ]}
 *   badge={<Badge variant="danger" dot>Critical</Badge>}
 *   actions={<Button variant="outline" size="sm">Export</Button>}
 * />
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────

interface BreadcrumbItem {
  /** Human-readable label. */
  label: string;
  /**
   * When provided, the breadcrumb renders as a link.
   * The last item should have no href (current page).
   */
  href?: string;
}

// ─── Props ────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /** Page title — primary h1. */
  title: string;
  /** Short description rendered below the title. */
  description?: string;
  /**
   * Ordered breadcrumb trail.
   * The last item represents the current page and should have no `href`.
   */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * When provided, renders a ← back arrow button that navigates to this href.
   */
  backHref?: string;
  /**
   * Node rendered beside the title (e.g. a `<Badge>` status label).
   */
  badge?: ReactNode;
  /**
   * Nodes anchored to the right side of the header (buttons, dropdowns, etc.).
   */
  actions?: ReactNode;
  /**
   * Renders a bottom border divider.
   * @default true
   */
  border?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  badge,
  actions,
  border    = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-2 px-6 pt-6 pb-4',
        border && 'border-b border-[var(--sf-border-default)]',
        'bg-[var(--sf-surface-base)]',
        className,
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 flex-wrap">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight
                      className="w-3 h-3 text-[var(--sf-text-tertiary)] flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="text-xs text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-secondary)] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={cn(
                        'text-xs',
                        isLast
                          ? 'text-[var(--sf-text-secondary)] font-medium'
                          : 'text-[var(--sf-text-tertiary)]',
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          {backHref && (
            <Link
              to={backHref}
              aria-label="Go back"
              className={cn(
                'flex-shrink-0 flex items-center justify-center',
                'w-8 h-8 rounded-lg',
                'text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)]',
                'bg-[var(--sf-surface-raised)] hover:bg-[var(--sf-surface-overlay)]',
                'border border-[var(--sf-border-default)]',
                'transition-colors duration-150',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          {/* Title + badge */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--sf-text-primary)] leading-tight tracking-tight truncate">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--sf-text-tertiary)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
