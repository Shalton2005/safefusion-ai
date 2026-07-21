import { cn } from '@/lib/cn';

export interface SidebarBrandProps {
  /** Hides the wordmark and centers the logo mark. */
  collapsed?: boolean;
}

export function SidebarBrand({ collapsed = false }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-0 py-4',
      )}
    >
      <div className={cn('flex items-center justify-center overflow-hidden', collapsed ? 'w-10' : 'w-full px-2')}>
        <img 
          src="/logo.png" 
          alt="SafeFusion Logo" 
          className={cn('object-contain', collapsed ? 'w-10 h-10' : 'w-full h-auto max-h-12')} 
        />
      </div>
    </div>
  );
}
