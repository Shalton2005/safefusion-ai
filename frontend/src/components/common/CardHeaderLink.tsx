/**
 * CardHeaderLink
 *
 * Small "View X →" link for a `CardHeader`'s `action` slot, routing to
 * a full page for a dashboard widget's summarised data. Matches the
 * link style `VisionSummaryWidget` established first — factored out so
 * every dashboard widget links out the same way instead of each one
 * hand-rolling its own `<Link>` + arrow icon.
 *
 * @example
 * <CardHeader
 *   title="Worker Monitoring"
 *   action={<CardHeaderLink to={ROUTES.WORKERS} label="View all workers" />}
 * />
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export interface CardHeaderLinkProps {
  to: string;
  label: string;
  className?: string;
}

export function CardHeaderLink({ to, label, className }: CardHeaderLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded ${className ?? ''}`}
    >
      {label}
      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
    </Link>
  );
}
