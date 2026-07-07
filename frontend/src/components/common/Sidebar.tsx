import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import { navRoutes } from '@/app/routes';
import { useSidebarStore } from '@/store';
import { Badge } from '@/components/ui';

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-[var(--color-bg-sidebar)]',
        'border-r border-[var(--color-border)] transition-all duration-300 ease-in-out',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-white/10',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600 shadow-glow-brand">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-none truncate">SafeFusion</p>
            <p className="text-2xs text-primary-400 font-medium mt-0.5">AI Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navRoutes.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                isActive ? 'nav-item-active' : 'nav-item',
                collapsed && 'justify-center px-0 py-2.5',
              )}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && (
                <Badge variant="danger" size="sm">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            'text-[var(--color-text-muted)] hover:text-white hover:bg-white/10',
            'transition-colors duration-150',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
