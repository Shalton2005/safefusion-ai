import { useNavigate } from 'react-router-dom';
import { Shield, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--sf-surface-base)] px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-danger-600/15 mb-6">
        <TriangleAlert className="w-8 h-8 text-danger-500" />
      </div>

      <h1 className="text-6xl font-black text-[var(--sf-text-primary)] tracking-tight">404</h1>
      <p className="mt-2 text-lg font-medium text-[var(--sf-text-primary)]">Page not found</p>
      <p className="mt-1 text-sm text-[var(--sf-text-tertiary)] max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button
          leftIcon={<Shield className="w-4 h-4" />}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
}
