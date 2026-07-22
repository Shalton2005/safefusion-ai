import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Activity } from 'lucide-react';
import { PageHeader, Badge } from '@/components/ui';
import { AIIncidentSummary } from '@/features/live-monitoring/components/AIIncidentSummary';
import { PermitStatusSection } from '@/features/live-monitoring/components/PermitStatusSection';
import { AlertsSection } from '@/features/live-monitoring/components/AlertsSection';
import { SafetyHeatmapContainer } from '@/features/live-monitoring/components/SafetyHeatmapContainer';
import { AIDecisionTimeline } from '@/features/live-monitoring/components/AIDecisionTimeline';
import { AICopilotPanel } from '@/features/live-monitoring/components/AICopilotPanel';
import { IncidentActionModals, useIncidentActions } from '@/features/live-monitoring/components/IncidentActionModals';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';

/**
 * Live Monitoring answers one question: "what is happening right now?"
 * Every section is a summary with a "View All" link to its dedicated page —
 * detailed browsing (full permit/alert/worker/sensor lists) lives there, not here.
 *
 * Grid is the single source of truth for sizing. Row tracks are fixed
 * (`minmax(0, Npx)`), so cards never stretch to content and never cause
 * layout shift; each card scrolls internally instead. `<main>` in
 * DashboardLayout is the only scrolling ancestor on the page — the copilot
 * rail relies on that for `sticky`, no `100vh` math needed.
 */
export function LiveMonitoringPage() {
  const { onExecuteResponse, onViewIncident, onNotifyTeam, onViewCctv, modalProps } = useIncidentActions();

  // SafetyHeatmapContainer ("Incident Intelligence Map") needs `overlays` to
  // render — without it, it's permanently stuck on its loading skeleton
  // (the prop is optional and there is no other default). Reuses the same
  // analytics store AnalyticsPage already populates via GET
  // /analytics/overview, rather than adding a second data source for the
  // same map shape.
  const { mapOverlays, fetchMapOverlays } = useAnalyticsStore(
    useShallow((state) => ({ mapOverlays: state.baseState, fetchMapOverlays: state.fetchData })),
  );

  const { syncTick, assessment, explanation } = useDashboardStore(
    useShallow((state) => ({
      syncTick: state.syncTick,
      assessment: state.assessment,
      explanation: state.explanation,
    })),
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMapOverlays(controller.signal);
    return () => controller.abort();
  }, [fetchMapOverlays]);

  usePolling(syncTick, DASHBOARD_REFRESH_INTERVAL);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] items-stretch">
      {/* Main content column */}
      <div className="min-w-0 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader
          title="Live Monitoring"
          description="What's happening right now across the plant."
          border={false}
          className="px-0 pt-0"
          badge={
            <Badge variant="danger" size="sm" dot pulsing>
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          }
        />

        {/* Dashboard grid: explicit rows, equal-height by construction */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 grid-rows-[auto_minmax(0,380px)_minmax(0,420px)] xl:grid-rows-[auto_minmax(0,400px)_minmax(0,440px)]">
          <div className="xl:col-span-3">
            <AIIncidentSummary 
              assessment={assessment}
              explanation={explanation}
              onExecuteResponse={onExecuteResponse} 
              onViewIncident={onViewIncident} 
            />
          </div>

          <div className="xl:col-span-2 h-full grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6 min-h-0">
            <PermitStatusSection />
            <AlertsSection />
          </div>

          <div className="xl:col-span-1 h-full min-h-0">
            <AIDecisionTimeline />
          </div>

          <div className="xl:col-span-3 h-full min-h-0">
            <SafetyHeatmapContainer overlays={mapOverlays ?? undefined} />
          </div>
        </div>
      </div>

      {/* Sticky AI Copilot rail — column stretches to the grid row's height (items-stretch),
          then sticky pins it within DashboardLayout's <main>, the page's only scroll container */}
      <div className="hidden xl:block h-full border-l border-[var(--sf-border-default)] bg-[var(--sf-surface-base)] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="sticky top-0 max-h-screen h-full flex flex-col">
          <AICopilotPanel
            onExecuteResponse={onExecuteResponse}
            onNotifyTeam={onNotifyTeam}
            onViewCctv={onViewCctv}
          />
        </div>
      </div>

      <IncidentActionModals {...modalProps} />
    </div>
  );
}
