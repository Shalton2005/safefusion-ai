import { Activity } from 'lucide-react';
import { PageHeader, Badge } from '@/components/ui';
import { OverallRiskScoreSection } from '@/features/live-monitoring/components/OverallRiskScoreSection';
import { SensorStatusSection } from '@/features/live-monitoring/components/SensorStatusSection';
import { WorkerStatusSection } from '@/features/live-monitoring/components/WorkerStatusSection';
import { PermitStatusSection } from '@/features/live-monitoring/components/PermitStatusSection';
import { AlertsSection } from '@/features/live-monitoring/components/AlertsSection';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';

export function LiveMonitoringPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Live Monitoring"
        description="Real-time overview of sensors, workers, permits, and safety alerts."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="danger" size="sm" dot pulsing>
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        }
      />

      {/* Overall risk score */}
      <div className="max-w-xs">
        <OverallRiskScoreSection />
      </div>

      {/* Sensor & worker status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorStatusSection />
        <WorkerStatusSection />
      </div>

      {/* Permit status & alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PermitStatusSection />
        <AlertsSection />
      </div>

      {/* Safety heatmap */}
      <SafetyHeatmapContainer />
    </div>
  );
}
