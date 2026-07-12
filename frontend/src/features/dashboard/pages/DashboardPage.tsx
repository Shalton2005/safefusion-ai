import { Badge, PageHeader } from '@/components/ui';
import { KpiCardGrid } from '@/features/dashboard/components/KpiCardGrid';
import { PlantSafetyOverviewSection } from '@/features/dashboard/components/PlantSafetyOverviewSection';
import { SafetyTimelineSectionView } from '@/features/dashboard/components/SafetyTimelineSection';
import { ChartCard, RiskTrendChart, SensorReadingsChart, AlertDistributionChart } from '@/components/charts';
import {
  RISK_TREND_DATA,
  SENSOR_READINGS_DATA,
  ALERT_DISTRIBUTION_DATA,
} from '@/features/dashboard/data/chartDummyData';
import { WorkerMonitoringPanel } from '@/features/workers/components/WorkerMonitoringPanel';
import { SensorMonitoringPanel } from '@/features/sensors/components/SensorMonitoringPanel';
import { AlertsPanelView } from '@/features/alerts/components/AlertsPanel';
import { IncidentSummarySectionView } from '@/features/alerts/components/IncidentSummarySection';
import { RecentIncidentsPanel } from '@/features/alerts/components/RecentIncidentsPanel';
import { PermitDashboardPanel } from '@/features/permits/components/PermitDashboardPanel';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';
import { CompoundRiskCardSectionView } from '@/features/risk/components/CompoundRiskCardSection';
import { RiskExplanationPanelSectionView } from '@/features/risk/components/RiskExplanationPanelSection';
import { EmergencyResponsePanelSectionView } from '@/features/emergency/components/EmergencyResponsePanelSection';
import { ComplianceDashboardSectionView } from '@/features/compliance/components/ComplianceDashboardSection';
import { RecommendationPanelSectionView } from '@/features/recommendations/components/RecommendationPanelSection';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { useRecentRiskScores } from '@/features/dashboard/hooks/useRecentRiskScores';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { usePlantStatusStore } from '@/store';
import { safetyTimelineService } from '@/services';
import { useEffect, useMemo } from 'react';

/** How many recent alerts / risk-score records feed the timeline + incident summary. */
const TIMELINE_LIMIT = 20;

export function DashboardPage() {
  // Shared fetches — each backend endpoint is called exactly once per
  // interval here, and the results are passed down as props to every
  // section that needs them, instead of each section fetching on its own.
  const alertsData = useRecentAlerts({ limit: 100 });
  const riskScoresData = useRecentRiskScores({ limit: TIMELINE_LIMIT });
  const riskEngineData = useCompoundRiskEngine();
  const emergencyData = useEmergencyResponse();
  const recommendationsData = useRecommendations();
  const complianceData = useComplianceStatus();

  // Publishes the already-fetched compound risk assessment for the
  // globally-mounted EmergencyStatusBannerContainer (in DashboardLayout,
  // above this page's <Outlet />) to reuse via usePlantStatusStore,
  // instead of it independently re-calling the same non-idempotent
  // POST /risk-scores/calculate endpoint. Cleared on unmount so a stale
  // value doesn't leak to other pages after navigating away.
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
  const refreshTimeline = () => {
    alertsData.refresh();
    riskScoresData.refresh();
    emergencyData.refresh();
    recommendationsData.refresh();
  };

  const incidentSummaryItems = useMemo(
    () =>
      [...alertsData.alerts]
        .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
        .slice(0, 5)
        .map((record) => ({
          id: record.id,
          message: record.message,
          severity: record.severity,
          status: record.status,
          timestamp: record.generated_at,
          zone: record.zone,
        })),
    [alertsData.alerts],
  );

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

      {/* Plant safety overview */}
      <PlantSafetyOverviewSection />

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
        refresh={alertsData.refresh}
      />
      <IncidentSummarySectionView
        incidents={incidentSummaryItems}
        loading={alertsData.loading}
        error={alertsData.error}
        refresh={alertsData.refresh}
      />
      <RecentIncidentsPanel />

      {/* Permits */}
      <PermitDashboardPanel />
    </div>
  );
}
