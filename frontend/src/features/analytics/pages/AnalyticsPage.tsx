import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, BrainCircuit, Download, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Skeleton, Alert, Button } from '@/components/ui';
import { useShallow } from 'zustand/react/shallow';
import {
  useAnalyticsStore,
  selectKPIs,
  selectIncidentTrend,
  selectHighestRiskZones,
  selectAISummary,
  selectPredictiveTimeline,
  selectAIRecommendations,
} from '@/store/useAnalyticsStore';
import { ChartCard } from '@/components/charts';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';
import { LineChart, Line, ReferenceLine, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { usePolling } from '@/hooks/usePolling';
import { FAST_REFRESH_INTERVAL } from '@/constants';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trendDir?: 'up' | 'down';
  positive?: boolean;
  onClick?: () => void;
}

function MetricCard({ label, value, change, trendDir, positive = true, onClick }: MetricCardProps) {
  return (
    <Card 
      className={onClick ? 'relative group cursor-pointer hover:border-[var(--sf-brand)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300' : ''}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-[var(--sf-text-tertiary)] uppercase tracking-wider truncate" title={label}>{label}</p>
        {onClick && (
          <div className="flex items-center gap-0.5 text-[var(--sf-brand)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] uppercase font-bold tracking-wider">Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <p className="text-4xl font-extrabold text-[var(--sf-text-primary)] mt-5 tracking-tight">{value}</p>
      {change && (
        <p className={`text-xs mt-3 flex items-center gap-1.5 font-medium ${positive ? 'text-safe-500 bg-safe-500/10' : 'text-danger-500 bg-danger-500/10'} w-fit px-2 py-0.5 rounded-full`}>
          {trendDir === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          <span>{change}</span>
          <span className="text-[var(--sf-text-tertiary)] font-normal bg-transparent">vs 30d</span>
        </p>
      )}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-[0_8px_32px_rgb(0,0,0,0.3)] min-w-[180px] transition-all duration-200 ease-out">
        <p className="font-bold text-slate-100 mb-3 border-b border-slate-700/50 pb-2 tracking-wide">{label}</p>
        {data.value !== undefined && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-400">Historical</span>
            <span className="text-sm text-[var(--sf-brand)] font-bold">{data.value}</span>
          </div>
        )}
        {data.forecastValue !== undefined && data.isForecast && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-400">AI Forecast</span>
            <span className="text-sm text-[var(--sf-caution)] font-bold">{data.forecastValue}</span>
          </div>
        )}
        
        {(data.critical !== undefined || data.resolved !== undefined) && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-1.5">
            {data.critical !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Critical</span>
                <span className="text-xs font-bold text-[var(--sf-danger)]">{data.critical}</span>
              </div>
            )}
            {data.resolved !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Resolved</span>
                <span className="text-xs font-bold text-[var(--sf-safe)]">{data.resolved}</span>
              </div>
            )}
          </div>
        )}
        {data.confidence && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-right">Confidence: <span className="text-slate-300">{data.confidence}</span></p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const DonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-[0_8px_32px_rgb(0,0,0,0.3)] min-w-[180px] transition-all duration-200 ease-out">
        <p className="font-bold text-slate-100 mb-3 border-b border-slate-700/50 pb-2 tracking-wide truncate">{data.zone}</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
             <span className="text-sm text-slate-400">Risk Level</span>
             <span className="text-sm font-bold text-[var(--sf-danger)]">{data.riskPercentage}%</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-sm text-slate-400">Active</span>
             <span className="text-sm font-bold text-[var(--sf-brand)]">{data.activeIncidents}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-sm text-slate-400">Critical</span>
             <span className="text-sm font-bold text-[var(--sf-danger)]">{data.criticalIncidents}</span>
          </div>
          <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-700/50">
             <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Trend</span>
             <span className={`flex items-center text-xs font-bold ${data.trend === 'up' ? 'text-[var(--sf-danger)]' : data.trend === 'down' ? 'text-[var(--sf-safe)]' : 'text-[var(--sf-caution)]'}`}>
               {data.trend === 'up' ? <><TrendingUp className="w-3 h-3 mr-1" /> Rising</> : data.trend === 'down' ? <><TrendingDown className="w-3 h-3 mr-1" /> Falling</> : <span className="text-slate-400">Stable</span>}
             </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const DONUT_COLORS = [
  'var(--sf-danger)', 
  'var(--sf-caution)', 
  'var(--sf-brand)', 
  'var(--sf-safe)', 
  'var(--sf-text-tertiary)'
];

export function AnalyticsPage() {
  const {
    fetchData, loading, error, lastUpdated, baseState,
    backendAISummary, backendPredictiveTimeline, backendAIRecommendations,
  } = useAnalyticsStore(
    useShallow(state => ({
      fetchData: state.fetchData,
      loading: state.loading,
      error: state.error,
      lastUpdated: state.lastUpdated,
      baseState: state.baseState,
      backendAISummary: state.backendAISummary,
      backendPredictiveTimeline: state.backendPredictiveTimeline,
      backendAIRecommendations: state.backendAIRecommendations,
    }))
  );

  const kpis = useMemo(() => selectKPIs({ baseState }), [baseState]);
  const incidentTrend = useMemo(() => selectIncidentTrend({ baseState }), [baseState]);
  const highestRiskZones = useMemo(() => selectHighestRiskZones({ baseState }), [baseState]);
  const aiSummary = useMemo(() => selectAISummary({ backendAISummary }), [backendAISummary]);
  const predictiveTimeline = useMemo(() => selectPredictiveTimeline({ backendPredictiveTimeline }), [backendPredictiveTimeline]);
  const aiRecommendations = useMemo(() => selectAIRecommendations({ backendAIRecommendations }), [backendAIRecommendations]);

  const [hoveredZoneIndex, setHoveredZoneIndex] = useState<number | null>(null);

  const { refresh } = usePolling(async (signal) => {
    await fetchData(signal);
  }, FAST_REFRESH_INTERVAL);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] p-3 rounded-lg shadow-sm overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3">
          <select className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--sf-text-primary)] focus:outline-none focus:ring-2 focus:border-[var(--sf-border-focus)] cursor-pointer">
            <option>Today</option>
            <option>7 Days</option>
            <option>30 Days</option>
            <option>90 Days</option>
          </select>

          <select className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--sf-text-primary)] focus:outline-none focus:ring-2 focus:border-[var(--sf-border-focus)] cursor-pointer">
            <option>Morning</option>
            <option>Evening</option>
            <option>Night</option>
          </select>

          <select className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--sf-text-primary)] focus:outline-none focus:ring-2 focus:border-[var(--sf-border-focus)] cursor-pointer">
            <option>All Zones</option>
          </select>

          <select className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--sf-text-primary)] focus:outline-none focus:ring-2 focus:border-[var(--sf-border-focus)] cursor-pointer">
            <option>All Facilities</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--sf-text-tertiary)] flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)]" />
            Last updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-[var(--sf-surface-sunken)] text-[var(--sf-text-primary)] border-[var(--sf-border-default)] hover:bg-[var(--sf-surface-hover)]" onClick={() => window.print()}>
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-[var(--sf-surface-sunken)] text-[var(--sf-text-primary)] border-[var(--sf-border-default)] hover:bg-[var(--sf-surface-hover)]" onClick={() => alert('CSV export is being generated...')}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !baseState ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex flex-col justify-between h-[120px]">
              <Skeleton className="w-1/2 h-4 rounded-md" />
              <Skeleton className="w-1/3 h-8 rounded-md mt-4" />
              <Skeleton className="w-1/4 h-3 rounded-md mt-auto" />
            </Card>
          ))
        ) : (
          <>
            <MetricCard label="TRIR" value={kpis.trir.value} change={kpis.trir.change} trendDir={kpis.trir.trendDir as 'up'|'down'} positive={kpis.trir.positive} onClick={() => scrollTo('incidents-chart')} />
            <MetricCard label="LTIFR" value={kpis.ltifr.value} change={kpis.ltifr.change} trendDir={kpis.ltifr.trendDir as 'up'|'down'} positive={kpis.ltifr.positive} onClick={() => scrollTo('incidents-chart')} />
            <MetricCard label="Active Critical Risks" value={kpis.activeCriticalRisks.value} change={kpis.activeCriticalRisks.change} trendDir={kpis.activeCriticalRisks.trendDir as 'up'|'down'} positive={kpis.activeCriticalRisks.positive} onClick={() => scrollTo('risk-zones-chart')} />
            <MetricCard label="Permit Compliance" value={kpis.permitCompliance.value} change={kpis.permitCompliance.change} trendDir={kpis.permitCompliance.trendDir as 'up'|'down'} positive={kpis.permitCompliance.positive} onClick={() => scrollTo('heatmap')} />
          </>
        )}
      </div>

      {/* AI Safety Intelligence Summary */}
      {!loading && baseState && (
        <Card className="mt-4 border-l-4 border-l-warning-500 shadow-md">
          <CardHeader
            title="AI Safety Intelligence Summary"
            description="Generated from live plant telemetry, CCTV analytics and IoT sensors."
            className="pb-2"
            action={
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--sf-text-tertiary)] font-medium uppercase tracking-wider">Generated live</span>
                <Badge variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  AI Model
                </Badge>
              </div>
            }
          />
          <div className="px-6 pb-6 pt-2 flex flex-col gap-6 text-sm text-[var(--sf-text-secondary)]">
            <p className="text-lg text-[var(--sf-text-primary)] font-medium leading-relaxed">
              AI has detected a <span className="text-danger-500 font-bold bg-danger-500/10 px-2 py-0.5 rounded-md inline-flex items-center mx-1">{aiSummary.increase_percentage}% increase</span> in compound safety risk over the previous shift.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)]">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[var(--sf-text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[var(--sf-brand)] rounded-full"></span>
                  Primary Contributors
                </h4>
                <ul className="list-disc pl-5 flex flex-col gap-2.5 text-[var(--sf-text-secondary)] marker:text-[var(--sf-brand)]">
                  {aiSummary.primary_contributors.map((contrib, idx) => (
                    <li key={idx} className="leading-snug">{contrib}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)]">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[var(--sf-text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-danger-500 rounded-full animate-pulse"></span>
                  Predicted Impact
                </h4>
                <p className="text-danger-500 font-semibold leading-relaxed bg-danger-500/5 p-3 rounded-lg border border-danger-500/10">
                  {aiSummary.predicted_impact}
                </p>
              </div>
              
              <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)]">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[var(--sf-text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[var(--sf-safe)] rounded-full"></span>
                  Recommended Actions
                </h4>
                <ol className="list-decimal pl-5 flex flex-col gap-2.5 text-[var(--sf-text-secondary)] font-medium">
                  {aiSummary.recommended_actions.map((action, idx) => (
                    <li key={idx} className="leading-snug">{action}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Card>
      )}



      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div id="incidents-chart" className="scroll-mt-6">
          <ChartCard
            title="Incidents Over Time"
            action={<Badge variant="primary" size="sm">30d</Badge>}
          >
          {loading || !baseState ? (
            <Skeleton className="w-full h-full min-h-[220px]" />
          ) : incidentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={incidentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sf-border-default)" strokeOpacity={0.5} />
                <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--sf-text-tertiary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--sf-text-tertiary)' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--sf-border-strong)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={(props: any) => {
                    return (
                      <ul className="flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--sf-text-secondary)] mt-2 font-medium">
                        <li className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)]">
                          <span className="w-3 h-3 bg-[var(--sf-brand)] rounded-full shadow-[0_0_8px_var(--sf-brand)]"></span>
                          Historical
                        </li>
                        <li className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)]">
                          <span className="w-4 h-0 border-t-2 border-dashed border-[var(--sf-caution)]"></span>
                          AI Forecast
                        </li>
                        <li className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)]">
                          <span className="w-4 h-0 border-t-2 border-dashed border-danger-500"></span>
                          Critical Threshold
                        </li>
                      </ul>
                    );
                  }}
                />
                <ReferenceLine y={6} stroke="var(--sf-danger)" strokeDasharray="4 4" strokeWidth={1.5} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Historical" 
                  stroke="var(--sf-brand)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--sf-brand)', strokeWidth: 0 }} 
                  activeDot={{ r: 6, fill: 'var(--sf-brand)', strokeWidth: 0, filter: 'drop-shadow(0 0 6px var(--sf-brand))' }} 
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
                <Line 
                  type="monotone" 
                  dataKey="forecastValue" 
                  name="AI Forecast" 
                  stroke="var(--sf-caution)" 
                  strokeWidth={3} 
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: 'var(--sf-caution)', strokeWidth: 0 }} 
                  activeDot={{ r: 6, fill: 'var(--sf-caution)', strokeWidth: 0, filter: 'drop-shadow(0 0 6px var(--sf-caution))' }} 
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[var(--sf-text-tertiary)]">
              No incidents recorded in this period
            </div>
          )}
        </ChartCard>
        </div>

        <div id="risk-zones-chart" className="scroll-mt-6">
          <ChartCard
            title="Highest Risk Zones"
            action={<Badge variant="secondary" size="sm">Live</Badge>}
          >
          {loading || !baseState ? (
            <Skeleton className="w-full h-full min-h-[220px]" />
          ) : highestRiskZones.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 h-[260px]">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={highestRiskZones}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="riskPercentage"
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      onMouseEnter={(_, index) => setHoveredZoneIndex(index)}
                      onMouseLeave={() => setHoveredZoneIndex(null)}
                      onClick={() => scrollTo('heatmap')}
                    >
                      {highestRiskZones.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]} 
                          stroke="var(--sf-surface-card)" 
                          strokeWidth={3} 
                          style={{
                            cursor: 'pointer',
                            opacity: hoveredZoneIndex === null || hoveredZoneIndex === index ? 1 : 0.4,
                            transition: 'opacity 0.2s',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 flex flex-col gap-2 overflow-y-auto pr-2 max-h-[260px]">
                {highestRiskZones.map((zone, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                      hoveredZoneIndex === index 
                        ? 'bg-[var(--sf-surface-sunken)] border-[var(--sf-brand)] shadow-md -translate-y-[1px]' 
                        : 'border-[var(--sf-border-default)] hover:bg-[var(--sf-surface-hover)]'
                    }`}
                    onMouseEnter={() => setHoveredZoneIndex(index)}
                    onMouseLeave={() => setHoveredZoneIndex(null)}
                    onClick={() => scrollTo('heatmap')}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}></span>
                      <span className="font-semibold text-sm text-[var(--sf-text-primary)] truncate max-w-[120px]" title={zone.zone}>{zone.zone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[var(--sf-text-primary)]">{zone.riskPercentage}%</span>
                      <Badge 
                        variant={zone.riskPercentage > 80 ? 'danger' : zone.riskPercentage > 60 ? 'warning' : 'primary'}
                        size="sm"
                        className="w-20 justify-center flex items-center gap-1"
                      >
                        {zone.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : zone.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                        {zone.riskPercentage > 80 ? 'High' : zone.riskPercentage > 60 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-sm text-[var(--sf-text-tertiary)] gap-2">
              <AlertTriangle className="w-6 h-6" />
              No risk data available
            </div>
          )}
        </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 mb-4">
        <div className="lg:col-span-2">
          {/* Predictive Risk Timeline */}
          <Card className="h-full flex flex-col">
          <CardHeader
            title="Predictive Risk Timeline"
            description="AI-forecasted safety risks over the next 24 hours."
            className="pb-2 flex-shrink-0"
            action={<Badge variant="warning" size="sm">24h Forecast</Badge>}
          />
          <div className="px-6 pb-6 pt-4 flex-1 overflow-y-auto">
            <div className="relative border-l-2 border-[var(--sf-border-default)] ml-3 space-y-6">
              {predictiveTimeline.map((item, index) => (
              <div key={index} className="relative pl-6">
                <div className={`absolute w-3 h-3 rounded-full top-1.5 -left-[7px] border-2 border-[var(--sf-surface-card)] ${
                  item.severity === 'Critical' ? 'bg-danger-500' : 
                  item.severity === 'High' ? 'bg-caution-500' : 
                  'bg-warning-500'
                }`} />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-[var(--sf-text-primary)]">{item.time}</span>
                    <h4 className="text-base font-semibold text-[var(--sf-text-primary)]">{item.title}</h4>
                    <Badge variant={
                      item.severity === 'Critical' ? 'danger' : 
                      item.severity === 'High' ? 'warning' : 'primary'
                    } size="sm">{item.severity}</Badge>
                  </div>
                  <span className="text-xs font-medium text-[var(--sf-text-tertiary)] bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] px-2 py-1 rounded-md">
                    Confidence: {item.confidence}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)] hover:border-[var(--sf-border-strong)] transition-colors">
                    <p className="text-[10px] font-bold text-[var(--sf-text-tertiary)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--sf-text-tertiary)]"></span>
                      Reason
                    </p>
                    <p className="text-sm text-[var(--sf-text-primary)] leading-relaxed font-medium">{item.reason}</p>
                  </div>
                  <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)] hover:border-[var(--sf-brand)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--sf-brand)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--sf-brand)]"></span>
                      Recommended Action
                    </p>
                    <p className="text-sm text-[var(--sf-text-primary)] leading-relaxed font-medium">{item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>
      <div>
        {/* AI Recommended Actions */}
        <Card className="h-full flex flex-col">
          <CardHeader
            title="AI Recommended Actions"
            description="Priority response recommendations."
            className="pb-2 flex-shrink-0"
            action={<Badge variant="primary" size="sm" className="flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5"/> AI</Badge>}
          />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-4">
            {aiRecommendations.map((action) => (
              <div key={action.priority} className="bg-[var(--sf-surface-sunken)] p-5 rounded-xl border border-[var(--sf-border-default)] hover:border-[var(--sf-brand)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-danger-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-danger-500 bg-danger-500/10 px-2 py-1 rounded-md">Priority {action.priority}</span>
                  <Badge variant={action.status === 'In Progress' ? 'warning' : action.status === 'Action Required' ? 'danger' : 'secondary'} size="sm" className="shadow-sm">{action.status}</Badge>
                </div>
                <h4 className="text-base font-bold text-[var(--sf-text-primary)] mb-4 group-hover:text-[var(--sf-brand)] transition-colors">{action.title}</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-[var(--sf-text-secondary)] bg-[var(--sf-surface-card)] p-3 rounded-lg border border-[var(--sf-border-default)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--sf-text-tertiary)]">Confidence</span>
                    <span className="font-bold text-[var(--sf-text-primary)]">{action.confidence}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--sf-text-tertiary)]">ETA</span>
                    <span className="font-bold text-[var(--sf-text-primary)]">{action.eta}</span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-[var(--sf-border-default)]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--sf-text-tertiary)]">Estimated Impact</span>
                    <span className={action.impact === 'High' ? 'font-bold text-danger-500' : 'font-bold text-warning-500'}>{action.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      </div>

      {/* Heatmap */}
      <div id="heatmap" className="scroll-mt-6">
        <Card className="mt-4">
          <CardHeader
            title="Incident Intelligence Map"
            description="Live spatial monitoring of active incidents and risk clusters."
            action={<Badge variant="danger" size="sm" className="animate-pulse">Live</Badge>}
          />
          <div className="px-6 pb-6">
            <div className="h-[500px] rounded-lg overflow-hidden border border-[var(--sf-border-default)]">
              <SafetyHeatmapContainer overlays={baseState || undefined} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
