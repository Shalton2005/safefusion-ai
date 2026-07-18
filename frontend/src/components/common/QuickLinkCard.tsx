/**
 * QuickLinkCard
 *
 * Static dashboard shortcut into a full page — icon, title, optional
 * description, and a chevron. Same visual shape as
 * `CameraShortcutCard` (icon chip + label + chevron), generalised for
 * pages with no dashboard-relevant live stat to show (e.g. AI Copilot,
 * Knowledge Graph) instead of each one hand-rolling its own shortcut
 * card layout.
 *
 * @example
 * <QuickLinkCard to={ROUTES.COPILOT} icon={MessageSquareText} title="AI Safety Copilot" description="Ask a question" />
 */

import { Link } from 'react-router-dom';
import { type ElementType } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface QuickLinkCardProps {
  to: string;
  icon: ElementType;
  title: string;
  description: string;
  className?: string;
}

export function QuickLinkCard({ to, icon: Icon, title, description, className }: QuickLinkCardProps) {
  return (
    <Link
      to={to}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
    >
      <Card padding="sm" hoverable className={cn('motion-safe:animate-fade-in', className)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-primary-600/15 text-primary-400">
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--sf-text-primary)]">{title}</p>
            <p className="text-xs text-[var(--sf-text-tertiary)] truncate mt-0.5">{description}</p>
          </div>

          <ChevronRight className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}
