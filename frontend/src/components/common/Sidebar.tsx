import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { navRoutes } from '@/app/routes';
import type { NavRouteItem } from '@/app/routes/types';
import { useSidebarStore } from '@/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarBrand } from '@/components/common/sidebar/SidebarBrand';
import { SidebarNavItem } from '@/components/common/sidebar/SidebarNavItem';
import { SidebarCollapseToggle } from '@/components/common/sidebar/SidebarCollapseToggle';

/** Groups nav items by `section`, preserving each group's first-seen (declaration) order. */
function groupBySection(items: NavRouteItem[]): { section: string | undefined; items: NavRouteItem[] }[] {
  const groups: { section: string | undefined; items: NavRouteItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.section === item.section);
    if (group) {
      group.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const closeMobile = useSidebarStore((s) => s.closeMobile);
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isNarrow = collapsed && isDesktop;
  const sections = groupBySection(navRoutes);
  const asideRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Mobile drawer: Escape closes it, focus moves in on open and returns
  // to the hamburger button that opened it on close — mirrors Modal's
  // focus-trap-entry/exit pattern for the same reason (WCAG dialog UX).
  useEffect(() => {
    if (isDesktop || !mobileOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLElement>('a[href],button')?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isDesktop, mobileOpen, closeMobile]);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-[var(--sf-surface-sidebar)]',
          'border-r border-[var(--sf-border-default)] transition-all duration-300 ease-in-out overflow-hidden',
          'lg:relative lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ width: isNarrow ? '4.5rem' : '16rem' }}
      >
        <SidebarBrand collapsed={isNarrow} />

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {sections.map((group, i) => (
            <div key={group.section ?? `ungrouped-${i}`} className="space-y-1">
              {group.section && !isNarrow && (
                <p className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));

                return (
                  <SidebarNavItem
                    key={item.path}
                    path={item.path}
                    label={item.label}
                    icon={item.icon}
                    badge={item.badge}
                    isActive={isActive}
                    collapsed={isNarrow}
                    onNavigate={closeMobile}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        <SidebarCollapseToggle
          collapsed={isNarrow}
          label={isDesktop ? 'Collapse' : 'Close'}
          ariaLabel={isDesktop ? 'Collapse sidebar' : 'Close sidebar'}
          onClick={isDesktop ? toggle : closeMobile}
        />
      </aside>
    </>
  );
}
