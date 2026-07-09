import { HardHat } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui';

export function WorkerStatusSection() {
  return (
    <Card padding="none">
      <CardHeader
        title="Worker Status"
        description="Live status of registered workers across all zones."
        className="px-6 pt-5 pb-0"
        action={
          <Badge variant="ghost" size="sm">
            Awaiting data
          </Badge>
        }
      />
      <div className="p-4">
        <EmptyState
          icon={HardHat}
          size="sm"
          title="Worker feed not yet connected"
          description="Live worker location and PPE compliance status will appear here."
        />
      </div>
    </Card>
  );
}
