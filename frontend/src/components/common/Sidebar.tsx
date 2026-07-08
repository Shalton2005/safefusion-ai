import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { navRoutes } from '@/app/routes';
import { useSidebarStore } from '@/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarBrand } from '@/components/common/sidebar/SidebarBrand';
import { SidebarNavItem } from '@/components/common/sidebar/SidebarNavItem';
import { SidebarCollapseToggle } from '@/components/common/sidebar/SidebarCollapseToggle';

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebarStore();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isNarrow = collapsed && isDesktop;

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
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-[var(--color-bg-sidebar)]',
          'border-r border-[var(--color-border)] transition-all duration-300 ease-in-out',
          'lg:relative lg:z-auto',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <SidebarBrand collapsed={isNarrow} />

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navRoutes.map((item) => {
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
