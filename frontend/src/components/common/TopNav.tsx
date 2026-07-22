import { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, User, Menu, Activity, LogOut, Settings, Server } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSidebarStore, useThemeStore, useRightPanelStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useNotificationStore';
import { useRouteConfig } from '@/hooks/useRouteConfig';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboardSummary';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { APP_NAME } from '@/constants';
import { Badge } from '@/components/ui';

export function TopNav() {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const toggleRightPanel = useRightPanelStore((s) => s.toggle);
  const currentRoute = useRouteConfig();
  const { summary } = useDashboardSummary();
  const alertsData = useRecentAlerts({ limit: 10 });
  const clearedAt = useRightPanelStore((s) => s.clearedAt);
  const unreadCount = alertsData.alerts.filter(a => new Date(a.generated_at).getTime() > clearedAt || clearedAt === 0).length;

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
    setIsProfileOpen(false);
  };

  const handleSettings = () => {
    navigate(ROUTES.SETTINGS);
    setIsProfileOpen(false);
  };

  const handleSystemStatus = () => {
    toast.info('System Status', 'All AI and telemetry systems are operating nominally.');
    setIsProfileOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitle = currentRoute?.label ?? APP_NAME;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[var(--sf-surface-card)] border-b border-[var(--sf-border-default)] shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleMobile}
          aria-label="Toggle sidebar"
          className="p-2 rounded-lg text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base font-semibold text-[var(--sf-text-primary)] hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Environment Badge */}
      <div className="hidden md:flex w-full max-w-sm items-center justify-center">
        <Badge variant="primary" className="flex items-center gap-2 px-4 py-1.5 shadow-sm border border-primary-500/20 bg-primary-500/10 text-primary-400">
          <Activity className="w-4 h-4 animate-pulse text-primary-400" />
          <div className="flex flex-col">
            <span className="font-medium tracking-wide">Global Manufacturing Facility • Active Shift</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--sf-text-tertiary)] font-bold mt-0.5">Production Line A</span>
          </div>
        </Badge>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications bell */}
        <button
          onClick={toggleRightPanel}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative p-2 rounded-lg text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors"
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

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="User menu"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--sf-surface-raised)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center overflow-hidden">
              <User className="w-4 h-4 text-primary-200" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-[var(--sf-text-primary)] max-w-[8rem] truncate">
              {user?.full_name || APP_NAME}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-[var(--sf-border-default)]">
                <div className="flex items-center justify-between">
                   <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate max-w-[130px]">{user?.full_name || 'Admin'}</p>
                   {user?.role && <Badge variant="default" size="sm">{user.role}</Badge>}
                </div>
                <p className="text-xs text-[var(--sf-text-tertiary)] truncate">{user?.email || 'admin@safefusion.ai'}</p>
              </div>
              <div className="py-1">
                <button onClick={handleSystemStatus} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors">
                  <Server className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> System Status
                </button>
                <button onClick={handleSettings} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors">
                  <Settings className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> Settings
                </button>
              </div>
              <div className="py-1 border-t border-[var(--sf-border-default)]">
                <button 
                  onClick={async () => {
                    setLogoutLoading(true);
                    await new Promise(r => setTimeout(r, 500));
                    handleLogout();
                    setLogoutLoading(false);
                  }} 
                  disabled={logoutLoading}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-500 hover:bg-danger-500/10 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" /> {logoutLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
