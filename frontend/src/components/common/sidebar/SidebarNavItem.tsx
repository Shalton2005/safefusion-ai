import { NavLink } from 'react-router-dom';
import type { ElementType } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';

export interface SidebarNavItemProps {
  path: string;
  label: string;
  icon?: ElementType;
  badge?: string | number;
  isActive: boolean;
  /** Renders icon-only, centered, with a title tooltip. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNavItem({
  path,
  label,
  icon: Icon,
  badge,
  isActive,
  collapsed = false,
  onNavigate,
}: SidebarNavItemProps) {
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        isActive ? 'nav-item-active' : 'nav-item',
        collapsed && 'justify-center px-0 py-2.5',
      )}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge !== undefined && (
        <Badge variant="danger" size="sm">
          {badge}
        </Badge>
      )}
    </NavLink>
  );
}
