import { useEffect, useState } from 'react';
import { HardHat, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { workersService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { Worker } from '@/types';
import { WorkerStatusIndicator } from '@/features/workers/components/WorkerStatusIndicator';

export function WorkerStatusSection() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await workersService.getWorkers({ skip: 0, limit: 100 }, { signal });
      setWorkers(data);
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
    fetchWorkers(signal);
    return () => controller.abort();
  }, []);

  const nonCompliantCount = workers.filter((w) => !w.ppe_status).length;

  return (
    <Card padding="none">
      <CardHeader
        title="Worker Status"
        description="Live status of registered workers across all zones."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && workers.length > 0 && (
            <Badge variant={nonCompliantCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={nonCompliantCount > 0}>
              {workers.length} worker{workers.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />

      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load workers"
            actions={
              <Button size="sm" variant="outline" onClick={() => fetchWorkers()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
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
        ) : workers.length === 0 ? (
          <EmptyState
            icon={HardHat}
            size="sm"
            title="No workers found"
            description="No worker records are currently registered in the system."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workers.map((worker) => (
              <WorkerStatusIndicator
                key={worker.id}
                name={worker.name}
                zone={worker.current_zone}
                shift={worker.shift}
                ppeCompliant={worker.ppe_status}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
