import { Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { APP_NAME } from '@/constants';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-primary)] px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-glow">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-[var(--color-text-primary)]">{APP_NAME}</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card p-8 animate-slide-in">
        <Outlet />
      </div>

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        Enterprise Safety Monitoring Platform
      </p>
    </div>
  );
}
