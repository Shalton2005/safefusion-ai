import { MessageSquareText, Waypoints } from 'lucide-react';
import { Badge, PageHeader } from '@/components/ui';
import { QuickLinkCard } from '@/components/common/QuickLinkCard';
import { ROUTES } from '@/constants/routes';
import { KpiCardGrid } from '@/features/dashboard/components/KpiCardGrid';
import { PlantSafetyOverviewSectionView } from '@/features/dashboard/components/PlantSafetyOverviewSection';
import { ZoneOverviewSectionView } from '@/features/dashboard/components/ZoneOverviewSection';
import { SafetyTimelineSectionView } from '@/features/dashboard/components/SafetyTimelineSection';
import { ChartCard, RiskTrendChart, SensorReadingsChart, AlertDistributionChart } from '@/components/charts';
// Removed chartDummyData import
import { WorkerMonitoringPanel } from '@/features/workers/components/WorkerMonitoringPanel';
import { SensorMonitoringPanel } from '@/features/sensors/components/SensorMonitoringPanel';
import { AlertsPanelView } from '@/features/alerts/components/AlertsPanel';
import { RecentIncidentsPanel } from '@/features/alerts/components/RecentIncidentsPanel';
import { PermitDashboardPanel } from '@/features/permits/components/PermitDashboardPanel';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';
import { CompoundRiskCardSectionView } from '@/features/risk/components/CompoundRiskCardSection';
import { AISupervisorCardSection } from '@/features/ai-supervisor/components/AISupervisorCardSection';
import { RiskExplanationPanelSectionView } from '@/features/risk/components/RiskExplanationPanelSection';
import { EmergencyResponsePanelSectionView } from '@/features/emergency/components/EmergencyResponsePanelSection';
import { ComplianceDashboardSectionView } from '@/features/compliance/components/ComplianceDashboardSection';
import { RecommendationPanelSectionView } from '@/features/recommendations/components/RecommendationPanelSection';
import { CameraShortcutCard, VisionSummaryWidget, CriticalHazardBanner } from '@/features/computer-vision/components';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { useRecentRiskScores } from '@/features/dashboard/hooks/useRecentRiskScores';
import { usePlantSafetyOverview } from '@/features/dashboard/hooks/usePlantSafetyOverview';
import { useZoneOverview } from '@/features/dashboard/hooks/useZoneOverview';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboardSummary';
import { useAnalyticsSummary } from '@/features/analytics/hooks/useAnalyticsSummary';
import { useRecentSensors } from '@/features/sensors/hooks/useRecentSensors';
import { usePlantStatusStore } from '@/store';
import { safetyTimelineService } from '@/services';
import { useEffect, useMemo, useCallback } from 'react';

/** How many recent alerts / risk-score records feed the timeline + incident summary. */
const TIMELINE_LIMIT = 20;

export function DashboardPage() {
  const alertsData = useRecentAlerts({ limit: 100 });
  const riskScoresData = useRecentRiskScores({ limit: TIMELINE_LIMIT });
  const plantSafetyOverviewData = usePlantSafetyOverview();
  const zoneOverviewData = useZoneOverview();
  const riskEngineData = useCompoundRiskEngine();
  const emergencyData = useEmergencyResponse();
  const recommendationsData = useRecommendations();
  const complianceData = useComplianceStatus();
  
  // New API Hooks
  const dashboardSummaryData = useDashboardSummary();
  const analyticsSummaryData = useAnalyticsSummary({ knownOverallRiskScore: dashboardSummaryData.summary?.overall_risk_score });
  const recentSensorsData = useRecentSensors({ limit: 100 });

  useEffect(() => {
    if (riskEngineData.assessment) {
      usePlantStatusStore.getState().publish({
        riskLevel: riskEngineData.assessment.risk_level,
        lastUpdated: riskEngineData.lastUpdated,
      });
    }
    return () => usePlantStatusStore.getState().clear();
  }, [riskEngineData.assessment, riskEngineData.lastUpdated]);

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

  // Compute Chart Data dynamically
  const riskTrendData = useMemo(() => {
    return [...riskScoresData.riskScores]
      .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime())
      .map(score => ({
        date: new Date(score.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        score: score.risk_score
      }));
  }, [riskScoresData.riskScores]);

  const alertDistributionData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alertsData.alerts.forEach(alert => {
      const key = alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1);
      if (counts[key] !== undefined) counts[key]++;
      else counts[key] = 1;
    });
    return Object.entries(counts).map(([severity, count]) => ({ severity: severity as 'Critical' | 'High' | 'Medium' | 'Low', count })).filter(d => d.count > 0);
  }, [alertsData.alerts]);

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

  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your safety monitoring system."
        border={false}
        className="px-0 pt-0"
      />

      {/* Critical hazard banner (computer vision) */}
      <CriticalHazardBanner />

      {/* KPI cards */}
      <KpiCardGrid
        dashboardSummary={dashboardSummaryData.summary}
        analyticsSummary={analyticsSummaryData.summary}
        plantSafetyOverview={plantSafetyOverviewData.overview}
        loading={dashboardSummaryData.loading || analyticsSummaryData.loading || plantSafetyOverviewData.loading}
      />

      {/* Plant safety overview */}
      <PlantSafetyOverviewSectionView
        overview={plantSafetyOverviewData.overview}
        loading={plantSafetyOverviewData.loading}
        error={plantSafetyOverviewData.error}
        lastUpdated={plantSafetyOverviewData.lastUpdated}
        refresh={plantSafetyOverviewData.refresh}
      />

      {/* Computer vision — detection summary + camera shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <VisionSummaryWidget className="lg:col-span-2" />
        <CameraShortcutCard />
      </div>

      {/* Quick links — AI Safety Copilot, Knowledge Graph */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickLinkCard
          to={ROUTES.COPILOT}
          icon={MessageSquareText}
          title="AI Safety Copilot"
          description="Ask questions grounded in your plant's safety and compliance documents."
        />
        <QuickLinkCard
          to={ROUTES.KNOWLEDGE_GRAPH}
          icon={Waypoints}
          title="Knowledge Graph"
          description="Explore relationships between workers, sensors, zones, permits, and incidents."
        />
      </div>

      {/* Zone overview */}
      <ZoneOverviewSectionView
        zones={zoneOverviewData.zones}
        loading={zoneOverviewData.loading}
        error={zoneOverviewData.error}
        lastUpdated={zoneOverviewData.lastUpdated}
        refresh={zoneOverviewData.refresh}
      />

      {/* Risk trend */}
      <ChartCard
        title="Risk Trend"
        description="Overall risk score — last 30 days"
        action={<Badge variant="danger" size="sm" dot pulsing>Live</Badge>}
      >
        <RiskTrendChart data={riskTrendData} />
      </ChartCard>

      {/* Sensor readings */}
      <ChartCard
        title="Sensor Readings"
        description="Gas, temperature, and pressure — today"
        height={220}
      >
        <SensorReadingsChart data={sensorReadingsData} />
      </ChartCard>

      {/* Alert distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Alert Distribution" description="By severity" className="lg:col-span-1">
          <AlertDistributionChart data={alertDistributionData} />
        </ChartCard>
      </div>

      {/* AI Supervisor */}
      <AISupervisorCardSection
        engines={{
          compoundRisk: riskEngineData,
          emergencyResponse: emergencyData,
          recommendation: recommendationsData,
          compliance: complianceData,
        }}
      />

      {/* Compound risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompoundRiskCardSectionView
          assessment={riskEngineData.assessment}
          loading={riskEngineData.loading}
          error={riskEngineData.error}
          lastUpdated={riskEngineData.lastUpdated}
          refresh={riskEngineData.refresh}
        />
        <RiskExplanationPanelSectionView
          explanation={riskEngineData.explanation}
          loading={riskEngineData.loading}
          error={riskEngineData.error}
          lastUpdated={riskEngineData.lastUpdated}
          refresh={riskEngineData.refresh}
        />
      </div>

      {/* Emergency response */}
      <EmergencyResponsePanelSectionView
        actions={emergencyData.actions}
        loading={emergencyData.loading}
        error={emergencyData.error}
        lastUpdated={emergencyData.lastUpdated}
        refresh={emergencyData.refresh}
      />

      {/* Compliance */}
      <ComplianceDashboardSectionView
        snapshot={complianceData.snapshot}
        loading={complianceData.loading}
        error={complianceData.error}
        lastUpdated={complianceData.lastUpdated}
        refresh={complianceData.refresh}
      />

      {/* Recommendations */}
      <RecommendationPanelSectionView
        recommendations={recommendationsData.recommendations}
        loading={recommendationsData.loading}
        error={recommendationsData.error}
        lastUpdated={recommendationsData.lastUpdated}
        refresh={recommendationsData.refresh}
      />

      {/* Safety timeline */}
      <SafetyTimelineSectionView
        events={timelineEvents}
        loading={timelineLoading}
        error={timelineError}
        refresh={refreshTimeline}
      />

      {/* Safety heatmap */}
      <SafetyHeatmapContainer />

      {/* Worker & sensor monitoring */}
      <WorkerMonitoringPanel />
      <SensorMonitoringPanel />

      {/* Alerts & incidents */}
      <AlertsPanelView
        alerts={alertsData.alerts}
        loading={alertsData.loading}
        error={alertsData.error}
        lastUpdated={alertsData.lastUpdated}
        refresh={alertsData.refresh}
      />
      <RecentIncidentsPanel />

      {/* Permits */}
      <PermitDashboardPanel />
    </div>
  );
}
