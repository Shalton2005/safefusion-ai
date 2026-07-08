import { Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/constants';

export interface SidebarBrandProps {
  /** Hides the wordmark and centers the logo mark. */
  collapsed?: boolean;
}

export function SidebarBrand({ collapsed = false }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-0',
      )}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600 shadow-glow-brand">
        <Shield className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-white leading-none truncate">{APP_NAME.split(' ')[0]}</p>
          <p className="text-2xs text-primary-400 font-medium mt-0.5">AI Platform</p>
        </div>
      )}
    </div>
  );
}
