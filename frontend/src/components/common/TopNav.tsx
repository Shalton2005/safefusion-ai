import { Bell, Sun, Moon, User, Menu } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouteConfig } from '@/hooks/useRouteConfig';
import { useSidebarStore, useThemeStore } from '@/store';
import { APP_NAME } from '@/constants';
import { RightPanelToggle } from '@/components/common/RightPanel';
import { TopNavSearch } from '@/components/common/TopNavSearch';

export function TopNav() {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const notifications = [] // useNotificationStore deleted
  const currentRoute = useRouteConfig();
  const unreadCount = notifications.length;

  const pageTitle = currentRoute?.label ?? APP_NAME;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleMobile}
          aria-label="Toggle sidebar"
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base font-semibold text-[var(--color-text-primary)] hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Center: search */}
      <div className="hidden md:block w-full max-w-xs">
        <TopNavSearch />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications bell */}
        <button
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute top-1 right-1 flex items-center justify-center',
                'min-w-[1rem] h-4 px-1 rounded-full',
                'bg-danger-600 text-white text-2xs font-bold leading-none',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar placeholder */}
        <button
          aria-label="User menu"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-200" />
          </div>
          <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)] max-w-[8rem] truncate">
            {APP_NAME}
          </span>
        </button>

        {/* Right panel toggle */}
        <RightPanelToggle />
      </div>
    </header>
  );
}
