import {
  LayoutDashboard,
  Activity,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, Badge, Skeleton, StatCard, PageHeader } from '@/components/ui';

const SEVERITY_BARS = [
  { label: 'Critical', count: 2,  barClass: 'bg-danger-600  w-[15%]' },
  { label: 'High',     count: 5,  barClass: 'bg-caution-500 w-[38%]' },
  { label: 'Medium',   count: 8,  barClass: 'bg-primary-500 w-[62%]' },
  { label: 'Low',      count: 3,  barClass: 'bg-safe-500    w-[23%]' },
] as const;

export function DashboardPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your safety monitoring system."
        border={false}
        className="px-0 pt-0"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Safety Score"
          value="94%"
          delta="+2%"
          deltaLabel="from last week"
          trend="up"
          trendPositive
          icon={CheckCircle2}
          iconVariant="success"
        />
        <StatCard
          label="Active Alerts"
          value={7}
          delta="-3"
          deltaLabel="from yesterday"
          trend="down"
          trendPositive
          icon={Bell}
          iconVariant="danger"
        />
        <StatCard
          label="Devices Online"
          value="142 / 148"
          delta="4"
          deltaLabel="in maintenance"
          trend="stable"
          icon={Activity}
          iconVariant="primary"
        />
        <StatCard
          label="Incidents (30d)"
          value={12}
          delta="-25%"
          deltaLabel="vs last month"
          trend="down"
          trendPositive
          icon={LayoutDashboard}
          iconVariant="warning"
        />
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Alert Trend — Last 30 Days"
            action={<Badge variant="danger" size="sm" dot pulsing>Live</Badge>}
          />
          <div className="chart-placeholder h-56">
            <p className="text-sm">Chart will render here</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Severity Breakdown" />
          <div className="space-y-3 mt-2">
            {SEVERITY_BARS.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--sf-text-tertiary)]">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="risk-bar">
                  <div className={`risk-bar-fill ${item.barClass}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
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
