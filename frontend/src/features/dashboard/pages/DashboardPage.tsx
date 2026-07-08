import { Card, CardHeader, Badge, Skeleton, PageHeader } from '@/components/ui';
import { KpiCardGrid } from '@/features/dashboard/components/KpiCardGrid';
import { ChartCard, RiskTrendChart, SensorReadingsChart, AlertDistributionChart } from '@/components/charts';
import {
  RISK_TREND_DATA,
  SENSOR_READINGS_DATA,
  ALERT_DISTRIBUTION_DATA,
} from '@/features/dashboard/data/chartDummyData';

export function DashboardPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your safety monitoring system."
        border={false}
        className="px-0 pt-0"
      />

      {/* KPI cards */}
      <KpiCardGrid />

      {/* Risk trend */}
      <ChartCard
        title="Risk Trend"
        description="Overall risk score — last 30 days"
        action={<Badge variant="danger" size="sm" dot pulsing>Live</Badge>}
      >
        <RiskTrendChart data={RISK_TREND_DATA} />
      </ChartCard>

      {/* Sensor readings */}
      <ChartCard
        title="Sensor Readings"
        description="Gas, temperature, and pressure — today"
        height={220}
      >
        <SensorReadingsChart data={SENSOR_READINGS_DATA} />
      </ChartCard>

      {/* Alert distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Alert Distribution" description="By severity" className="lg:col-span-1">
          <AlertDistributionChart data={ALERT_DISTRIBUTION_DATA} />
        </ChartCard>
      </div>

      {/* Recent activity skeleton */}
      <Card>
        <CardHeader title="Recent Activity" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
