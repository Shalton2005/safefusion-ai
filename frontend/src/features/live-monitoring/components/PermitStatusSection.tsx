import { FileCheck2 } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui';

export function PermitStatusSection() {
  return (
    <Card padding="none">
      <CardHeader
        title="Permit Status"
        description="Read-only view of Permit-to-Work records across all zones."
        className="px-6 pt-5 pb-0"
        action={
          <Badge variant="ghost" size="sm">
            Awaiting data
          </Badge>
        }
      />
      <div className="p-4">
        <EmptyState
          icon={FileCheck2}
          size="sm"
          title="Permit feed not yet connected"
          description="Active, closed, and suspended Permit-to-Work records will appear here."
        />
      </div>
    </Card>
  );
}
