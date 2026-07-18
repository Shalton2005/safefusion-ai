import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, Badge, PageHeader, Skeleton, Alert } from '@/components/ui';
import { useAnalyticsSummary } from '@/features/analytics/hooks/useAnalyticsSummary';
import { ChartCard, AlertDistributionChart } from '@/components/charts';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

function MetricCard({ label, value, change, positive = true }: MetricCardProps) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{value}</p>
      {change && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${positive ? 'text-safe-500' : 'text-danger-500'}`}>
          <TrendingUp className="w-3 h-3" />
          {change}
        </p>
      )}
    </Card>
  );
}

export function AnalyticsPage() {
  const { summary, incidentTrend, riskDistribution, loading, error } = useAnalyticsSummary();

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="Analytics" description="Deep-dive insights into safety performance and trends." border={false} className="px-0 pt-0" />
        <Alert variant="danger" title="Failed to load analytics">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Analytics"
        description="Deep-dive insights into safety performance and trends."
        border={false}
        className="px-0 pt-0"
      />

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <MetricCard label="Safety Score" value={`${summary.safetyScore}%`} positive />
            <MetricCard label="Compliance Rate" value={`${summary.devicesOnline}%`} positive />
            <MetricCard label="Incidents (30d)" value={String(summary.totalAlerts)} positive={summary.totalAlerts === 0} />
            <MetricCard label="PPE & Fire Violations" value={String(summary.activeAlerts)} positive={summary.activeAlerts === 0} />
          </>
        )}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Incidents Over Time"
          action={<Badge variant="primary" size="sm">30d</Badge>}
        >
          {loading ? (
            <Skeleton className="w-full h-full min-h-[220px]" />
          ) : incidentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incidentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '0.375rem' }} 
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Bar dataKey="value" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[var(--color-text-muted)]">
              No incidents recorded in this period
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Risk Distribution by Zone"
          action={<Badge variant="secondary" size="sm">Live</Badge>}
        >
          {loading ? (
            <Skeleton className="w-full h-full min-h-[220px]" />
          ) : riskDistribution.length > 0 ? (
            <AlertDistributionChart data={riskDistribution} />
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-sm text-[var(--color-text-muted)] gap-2">
              <AlertTriangle className="w-6 h-6" />
              No risk data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Heatmap */}
      <SafetyHeatmapContainer />
    </div>
  );
}
