import { Outlet } from 'react-router-dom';
import { APP_NAME } from '@/constants';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--sf-surface-base)] px-4">
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="SafeFusion AI Logo" className="h-12 w-auto object-contain" />
        <span className="text-xl font-bold text-[var(--sf-text-primary)]">{APP_NAME}</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card p-8 animate-slide-in">
        <Outlet />
      </div>

      <p className="mt-6 text-xs text-[var(--sf-text-secondary)] text-center">
        AI-Powered Industrial Safety Intelligence Platform
      </p>
    </div>
  );
}
