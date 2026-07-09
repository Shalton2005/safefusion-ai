import { Gauge } from 'lucide-react';
import { StatCard } from '@/components/ui';

export function OverallRiskScoreSection() {
  return (
    <StatCard
      label="Overall Risk Score"
      value="—"
      subLabel="/ 100"
      icon={Gauge}
      iconVariant="neutral"
      className="h-full"
    />
  );
}
