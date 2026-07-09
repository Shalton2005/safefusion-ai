import { Radio } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui';

export function SensorStatusSection() {
  return (
    <Card padding="none">
      <CardHeader
        title="Sensor Status"
        description="Live gas, temperature, pressure, and humidity readings by zone."
        className="px-6 pt-5 pb-0"
        action={
          <Badge variant="ghost" size="sm">
            Awaiting data
          </Badge>
        }
      />
      <div className="p-4">
        <EmptyState
          icon={Radio}
          size="sm"
          title="Sensor feed not yet connected"
          description="Live sensor readings will appear here once the monitoring feed is wired up."
        />
      </div>
    </Card>
  );
}
