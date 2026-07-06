import {
  LayoutDashboard,
  Activity,
  Bell,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardHeader, Badge, Skeleton } from '@/components/ui';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  icon: React.ElementType;
  iconColor: string;
}

function StatCard({ label, value, trend, trendLabel, icon: Icon, iconColor }: StatCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-safe-500' : trend === 'down' ? 'text-danger-500' : 'text-[var(--color-text-muted)]';

  return (
    <Card className="flex items-start gap-4">
      <div className={`flex-shrink-0 p-3 rounded-xl ${iconColor}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-muted)] truncate">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">{value}</p>
        {trend && trendLabel && (
          <p className={`flex items-center gap-1 text-xs mt-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </p>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <div className="page-container">
      {/* Page heading */}
      <div>
        <h1 className="text-[var(--color-text-primary)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Real-time overview of your safety monitoring system.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Safety Score"
          value="94%"
          trend="up"
          trendLabel="+2% from last week"
          icon={CheckCircle2}
          iconColor="bg-safe-600"
        />
        <StatCard
          label="Active Alerts"
          value="7"
          trend="down"
          trendLabel="-3 from yesterday"
          icon={Bell}
          iconColor="bg-danger-600"
        />
        <StatCard
          label="Devices Online"
          value="142 / 148"
          trend="stable"
          trendLabel="4 in maintenance"
          icon={Activity}
          iconColor="bg-primary-600"
        />
        <StatCard
          label="Incidents (30d)"
          value="12"
          trend="down"
          trendLabel="-25% vs last month"
          icon={LayoutDashboard}
          iconColor="bg-caution-600"
        />
      </div>

      {/* Placeholder chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Alert Trend — Last 30 Days"
            action={<Badge variant="primary" size="sm">Live</Badge>}
          />
          <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">Chart will render here</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Severity Breakdown" />
          <div className="space-y-3 mt-2">
            {[
              { label: 'Critical', value: 2, color: 'bg-danger-600',  width: '15%' },
              { label: 'High',     value: 5, color: 'bg-caution-500', width: '38%' },
              { label: 'Medium',   value: 8, color: 'bg-primary-500', width: '62%' },
              { label: 'Low',      value: 3, color: 'bg-safe-500',    width: '23%' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-bg-secondary)]">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Skeleton placeholder for recent activity */}
      <Card>
        <CardHeader title="Recent Activity" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
