import { useEffect, useState } from 'react';
import { FileCheck2, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { permitsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { Permit, PermitType } from '@/types';
import { PermitStatusIndicator } from '@/features/permits/components/PermitStatusIndicator';

const permitTypeLabel: Record<PermitType, string> = {
  hot_work:       'Hot Work',
  confined_space: 'Confined Space',
  electrical:     'Electrical',
};

function isPermitExpired(permit: Permit): boolean {
  return permit.status !== 'closed' && new Date(permit.end_time).getTime() < Date.now();
}

export function PermitStatusSection() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermits = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await permitsService.getPermits({ skip: 0, limit: 100 }, { signal });
      setPermits(data);
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) {
        setError(apiError.toUserMessage());
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchPermits(signal);
    return () => controller.abort();
  }, []);

  const expiredCount = permits.filter(isPermitExpired).length;
  const sorted = [...permits].sort((a, b) => Number(isPermitExpired(b)) - Number(isPermitExpired(a)));

  return (
    <Card padding="none">
      <CardHeader
        title="Permit Status"
        description="Read-only view of Permit-to-Work records across all zones."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && permits.length > 0 && (
            <Badge variant={expiredCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={expiredCount > 0}>
              {expiredCount > 0 ? `${expiredCount} expired` : `${permits.length} permit${permits.length === 1 ? '' : 's'}`}
            </Badge>
          )
        }
      />

      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load permits"
            actions={
              <Button size="sm" variant="outline" onClick={() => fetchPermits()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            size="sm"
            title="No permits found"
            description="No Permit-to-Work records are currently registered in the system."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sorted.map((permit) => (
              <PermitStatusIndicator
                key={permit.id}
                permitId={permit.id}
                permitType={permitTypeLabel[permit.permit_type]}
                worker={permit.assigned_team}
                status={permit.status}
                expiryTime={permit.end_time}
                isExpired={isPermitExpired(permit)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
