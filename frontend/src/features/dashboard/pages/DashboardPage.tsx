import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatLabel } from '@/utils/format';
import { MessageSquareText, List, Radio, ShieldAlert, MapPin, BrainCircuit, AlertTriangle, FileCheck2, FileBarChart2, Settings } from 'lucide-react';
import { Card } from '@/components/ui';
import { QuickLinkCard } from '@/components/common/QuickLinkCard';
import { ROUTES } from '@/constants/routes';
import { KpiCardGrid } from '@/features/dashboard/components/KpiCardGrid';
import { ZoneOverviewSectionView } from '@/features/dashboard/components/ZoneOverviewSection';
import { SafetyTimelineSectionView } from '@/features/dashboard/components/SafetyTimelineSection';
import { SensorReadingsChart } from '@/components/charts';
import { LiveCCTVPreview } from '../components/LiveCCTVPreview';
import { RecommendationPanelSectionView } from '@/features/recommendations/components/RecommendationPanelSection';
import { EmergencyResponsePanelSectionView } from '@/features/emergency/components/EmergencyResponsePanelSection';
import { CriticalHazardBanner } from '@/features/computer-vision/components';
import { AICommandCenter } from '@/features/dashboard/components/AICommandCenter';
import { AIExplainabilityCard } from '@/features/dashboard/components/AIExplainabilityCard';
import { useAISupervisor } from '@/features/ai-supervisor/hooks/useAISupervisor';
import { usePlantStatusStore, useDashboardStore } from '@/store';
import { usePolling } from '@/hooks/usePolling';
import { FAST_REFRESH_INTERVAL } from '@/constants';
import { safetyTimelineService } from '@/services';
import { cn } from '@/lib/cn';

const TIMELINE_LIMIT = 20;

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'sensors'>('timeline');

  const navigate = useNavigate();

  // Unified Dashboard State
  const store = useDashboardStore();
  const { refresh } = usePolling(store.syncTick, FAST_REFRESH_INTERVAL);

  // Map unified state to existing component prop shapes
  const dashboardSummaryData = { summary: store.summary, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const zoneOverviewData = { zones: store.zones, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const riskEngineData = { assessment: store.assessment, explanation: store.explanation, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const emergencyData = { actions: store.emergencyActions, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const recommendationsData = { recommendations: store.recommendations, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const complianceData = { snapshot: store.compliance, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const alertsData = { alerts: store.alerts, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const riskScoresData = { riskScores: store.riskScores, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const recentSensorsData = { sensors: store.sensors, loading: store.loading, error: store.error, lastUpdated: store.lastUpdated, refresh };
  const aiSupervisor = useAISupervisor({
    compoundRisk: riskEngineData,
    emergencyResponse: emergencyData,
    recommendation: recommendationsData,
    compliance: complianceData,
  });

  useEffect(() => {
    // The banner normally represents the GLOBAL plant status, but for a synchronized 
    // user experience on the dashboard, we publish the currently viewed dashboard risk level.
    if (riskEngineData.assessment) {
      const currentRisk = riskEngineData.assessment.risk_level;
      usePlantStatusStore.getState().publish({
        riskLevel: currentRisk,
        // Only show emergency active if the current zone actually warrants it
        inEmergency: (emergencyData.actions.length > 0 && (currentRisk === 'critical' || currentRisk === 'high')),
        lastUpdated: riskEngineData.lastUpdated,
      });
    }
    return () => usePlantStatusStore.getState().clear();
  }, [riskEngineData.assessment, emergencyData.actions, riskEngineData.lastUpdated]);

  const timelineEvents = useMemo(
    () =>
      safetyTimelineService.mergeTimeline(
        alertsData.alerts,
        riskScoresData.riskScores,
        emergencyData.actions,
        recommendationsData.recommendations,
        TIMELINE_LIMIT,
        (emergencyData.lastUpdated ?? recommendationsData.lastUpdated ?? new Date()).toISOString(),
      ),
    [alertsData.alerts, riskScoresData.riskScores, emergencyData.actions, emergencyData.lastUpdated, recommendationsData.recommendations, recommendationsData.lastUpdated],
  );
  
  const timelineLoading = alertsData.loading || riskScoresData.loading || emergencyData.loading || recommendationsData.loading;
  const timelineError = alertsData.error ?? riskScoresData.error ?? emergencyData.error ?? recommendationsData.error;
  
  const refreshTimeline = useCallback(() => {
    alertsData.refresh();
    riskScoresData.refresh();
    emergencyData.refresh();
    recommendationsData.refresh();
  }, [alertsData, riskScoresData, emergencyData, recommendationsData]);

  const sensorReadingsData = useMemo(() => {
    const points: Record<string, { gas: number[], temperature: number[], pressure: number[] }> = {};
    recentSensorsData.sensors.forEach(sensor => {
      const timeStr = new Date(sensor.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      if (!points[timeStr]) points[timeStr] = { gas: [], temperature: [], pressure: [] };
      if (sensor.sensor_type === 'gas') points[timeStr].gas.push(sensor.value);
      else if (sensor.sensor_type === 'temperature') points[timeStr].temperature.push(sensor.value);
      else if (sensor.sensor_type === 'pressure') points[timeStr].pressure.push(sensor.value);
    });
    
    return Object.entries(points).map(([time, values]) => {
      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      return { time, gas: avg(values.gas), temperature: avg(values.temperature), pressure: avg(values.pressure) };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [recentSensorsData.sensors]);

  const riskLevel = riskEngineData.assessment?.risk_level ?? 'low';
  const isCriticalMode = riskLevel === 'critical';
  const isEmergencyMode = riskLevel === 'high';
  const isWarningMode = riskLevel === 'medium';

  const renderContextualLinks = () => {
    if (isCriticalMode || isEmergencyMode) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <QuickLinkCard to={ROUTES.ALERTS} icon={ShieldAlert} title="View Emergency Plan" description="Active incident response procedures" />
          <QuickLinkCard to={`/live-monitoring?zone=${encodeURIComponent(riskEngineData.explanation?.zone || '')}`} icon={MapPin} title="Affected Zone" description="Live CCTV and sensors" />
          <QuickLinkCard to={ROUTES.AI_SUPERVISOR} icon={BrainCircuit} title="AI Reasoning" description="Understand this risk score" />
        </div>
      );
    }
    if (isWarningMode) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <QuickLinkCard to={ROUTES.AI_SUPERVISOR} icon={AlertTriangle} title="Recommendations" description="Review active AI recommendations" />
          <QuickLinkCard to={ROUTES.PERMITS} icon={FileCheck2} title="Permits" description="Check active high-risk permits" />
          <QuickLinkCard to={ROUTES.COPILOT} icon={MessageSquareText} title="AI Copilot" description="Ask about safety procedures" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <QuickLinkCard to={ROUTES.REPORTS} icon={FileBarChart2} title="Weekly Report" description="Download latest safety summary" />
        <QuickLinkCard to={ROUTES.PERMITS} icon={FileCheck2} title="Permit Renewals" description="Review upcoming expirations" />
        <QuickLinkCard to={ROUTES.SETTINGS} icon={Settings} title="Settings" description="System and threshold config" />
      </div>
    );
  };

  return (
    <div className="page-container flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* SECTION 1: Emergency Banner */}
      <CriticalHazardBanner />

      {/* SECTION 2: AI Command Center (Hero) */}
      <AICommandCenter
        assessment={riskEngineData.assessment}
        explanation={riskEngineData.explanation}
        recommendations={recommendationsData.recommendations}
        alerts={alertsData.alerts}
        emergencyActions={emergencyData.actions}
        supervisorSnapshot={aiSupervisor.snapshot}
        lastUpdated={riskEngineData.lastUpdated}
        onDispatchEmergency={() => navigate(ROUTES.ALERTS)}
        onViewReasoning={() => navigate(ROUTES.AI_SUPERVISOR)}
        onOpenLiveMonitoring={() => navigate(ROUTES.LIVE_MONITORING)}
      />

      {/* SECTION 3: Critical KPI Cards */}
      {!isCriticalMode && (
        <KpiCardGrid
          dashboardSummary={dashboardSummaryData.summary}
          complianceSnapshot={complianceData.snapshot}
          riskAssessment={riskEngineData.assessment}
          loading={dashboardSummaryData.loading || complianceData.loading}
          lastUpdated={dashboardSummaryData.lastUpdated}
        />
      )}


      {/* SECTION 5: Top Emergency Actions (Dynamic) */}
      {(isEmergencyMode || isCriticalMode) && (
        <EmergencyResponsePanelSectionView
          actions={emergencyData.actions}
          loading={emergencyData.loading}
          error={emergencyData.error}
          lastUpdated={emergencyData.lastUpdated}
          refresh={emergencyData.refresh}
        />
      )}
      {isWarningMode && (
        <RecommendationPanelSectionView
          recommendations={recommendationsData.recommendations.slice(0, 3)}
          loading={recommendationsData.loading}
          error={recommendationsData.error}
          lastUpdated={recommendationsData.lastUpdated}
          refresh={recommendationsData.refresh}
        />
      )}

      {/* SECTION 6: Investigation Hub */}
      <Card className="flex flex-col overflow-hidden bg-[var(--sf-surface-card)] border-[var(--sf-border-default)]">
        <div className="flex flex-col gap-3 px-8 pt-6 pb-5 bg-[var(--sf-surface-base)]/50 border-b border-[var(--sf-border-default)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--sf-text-primary)]">Investigation Hub</h2>
              <p className="text-sm text-[var(--sf-text-tertiary)] mt-2">
                Showing telemetry for: <span className="font-semibold text-[var(--sf-text-secondary)]">{riskEngineData.explanation?.zone || 'All Zones'}</span>
                {riskEngineData.explanation?.triggered_rules?.[0] && (
                  <> &bull; Primary Trigger: <span className="font-medium text-[var(--sf-text-secondary)]">{formatLabel(riskEngineData.explanation.triggered_rules[0].name)}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[var(--sf-surface-base)] p-1 rounded-lg border border-[var(--sf-border-default)]">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ease-in-out",
                  activeTab === 'timeline' 
                    ? "bg-[var(--sf-surface-card)] text-[var(--sf-text-primary)] shadow-sm border border-[var(--sf-border-default)]" 
                    : "text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] border border-transparent"
                )}
                onClick={() => setActiveTab('timeline')}
              >
                <List className="w-4 h-4" />
                Timeline
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ease-in-out",
                  activeTab === 'sensors'
                    ? "bg-[var(--sf-surface-card)] text-[var(--sf-text-primary)] shadow-sm border border-[var(--sf-border-default)]" 
                    : "text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] border border-transparent"
                )}
                onClick={() => setActiveTab('sensors')}
              >
                <Radio className="w-4 h-4" />
                Sensor Trends
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'timeline' && (
            <SafetyTimelineSectionView
              events={timelineEvents}
              loading={timelineLoading}
              error={timelineError}
              refresh={refreshTimeline}
            />
          )}
          {activeTab === 'sensors' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[300px]">
              <div className="lg:col-span-2 min-h-[300px] lg:min-h-0 h-full">
                <SensorReadingsChart data={sensorReadingsData} />
              </div>
              <div className="lg:col-span-1 min-h-[300px] lg:min-h-0 h-full">
                <LiveCCTVPreview />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* SECTION 4: AI Reasoning (Explainability) */}
      {!isCriticalMode && (
        <AIExplainabilityCard
          assessment={riskEngineData.assessment}
          explanation={riskEngineData.explanation}
          supervisorSnapshot={aiSupervisor.snapshot}
        />
      )}

      {/* SECTION 7: Zone Overview */}
      {!isCriticalMode && (
        <div className="flex flex-col gap-8">
          <ZoneOverviewSectionView
            zones={zoneOverviewData.zones}
            loading={zoneOverviewData.loading}
            error={zoneOverviewData.error}
            lastUpdated={zoneOverviewData.lastUpdated}
            refresh={zoneOverviewData.refresh}
          />
        </div>
      )}

      {/* SECTION 9: Contextual Intelligence Strip */}
      {renderContextualLinks()}
    </div>
  );
}
