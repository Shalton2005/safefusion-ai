import { Bell } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui';

export function AlertsSection() {
  return (
    <Card padding="none">
      <CardHeader
        title="Alerts"
        description="Safety alerts by severity, type, and location."
        className="px-6 pt-5 pb-0"
        action={
          <Badge variant="ghost" size="sm">
            Awaiting data
          </Badge>
        }
      />
      <div className="p-4">
        <EmptyState
          icon={Bell}
          size="sm"
          title="Alert feed not yet connected"
          description="Active safety alerts will appear here as they are reported."
        />
      </div>
    </Card>
  );
}
