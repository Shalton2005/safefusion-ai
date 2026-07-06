import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardHeader, Badge, Skeleton } from '@/components/ui';

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}

function MetricCard({ label, value, change, positive = true }: MetricCardProps) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{value}</p>
      <p className={`text-xs mt-1 flex items-center gap-1 ${positive ? 'text-safe-500' : 'text-danger-500'}`}>
        <TrendingUp className="w-3 h-3" />
        {change}
      </p>
    </Card>
  );
}

export function AnalyticsPage() {
  return (
    <div className="page-container">
      <div>
        <h1 className="text-[var(--color-text-primary)]">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Deep-dive insights into safety performance and trends.
        </p>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Safety Score"       value="94%"   change="+2.1% MoM" positive />
        <MetricCard label="MTTR (avg)"         value="18 min" change="-5 min MoM" positive />
        <MetricCard label="Incidents (30d)"    value="12"    change="-25% MoM"   positive />
        <MetricCard label="False Positive Rate" value="3.2%" change="+0.4% MoM" positive={false} />
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Incidents Over Time"
            action={<Badge variant="primary" size="sm">30d</Badge>}
          />
          <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
              <BarChart3 className="w-8 h-8" />
              <p className="text-sm">Chart will render here</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Alert Distribution by Zone"
            action={<Badge variant="secondary" size="sm">7d</Badge>}
          />
          <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
              <BarChart3 className="w-8 h-8" />
              <p className="text-sm">Chart will render here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Heatmap placeholder */}
      <Card>
        <CardHeader title="Facility Risk Heatmap" />
        <div className="h-72 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
          <div className="space-y-3 text-center text-[var(--color-text-muted)]">
            {/* 10×10 grid — opacity cycles through 5 levels for a heatmap look */}
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 100 }).map((_, i) => {
                const opacityClasses = [
                  'opacity-15', 'opacity-30', 'opacity-50', 'opacity-65', 'opacity-80',
                ];
                return (
                  <Skeleton
                    key={i}
                    className={`w-6 h-6 ${opacityClasses[i % opacityClasses.length]}`}
                  />
                );
              })}
            </div>
            <p className="text-sm">Heatmap will render here</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
