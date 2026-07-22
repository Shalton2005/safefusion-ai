import { create } from 'zustand';
import {
  dashboardService,
  compoundRiskService,
  demoService,
  emergencyResponseService,
  recommendationService,
  complianceService,
  alertsService,
  sensorsService
} from '@/services';
import type {
  DashboardSummary,
  ZoneOverview,
  CompoundRiskAssessment,
  RiskExplanation,
  EmergencyActionItem,
  Recommendation,
  ComplianceStatusSnapshot,
  AlertRecord,
  RiskScoreRecord,
  SensorReading
} from '@/types';
import { ApiError } from '@/api/errors';
import type { SeverityLevel } from '@/constants';

export interface DashboardStoreState {
  summary: DashboardSummary | null;
  zones: ZoneOverview[] | null;
  assessment: CompoundRiskAssessment | null;
  explanation: RiskExplanation | null;
  globalRiskLevel: SeverityLevel;
  emergencyActions: EmergencyActionItem[];
  recommendations: Recommendation[];
  compliance: ComplianceStatusSnapshot | null;
  alerts: AlertRecord[];
  riskScores: RiskScoreRecord[];
  sensors: SensorReading[];
  
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  syncTick: (signal?: AbortSignal) => Promise<void>;
}

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  summary: null,
  zones: [],
  assessment: null,
  explanation: null,
  globalRiskLevel: 'low',
  emergencyActions: [],
  recommendations: [],
  compliance: null,
  alerts: [],
  riskScores: [],
  sensors: [],
  
  loading: true,
  error: null,
  lastUpdated: null,
  
  syncTick: async (signal?: AbortSignal) => {
    // Only set loading to true on the very first fetch
    if (!get().lastUpdated) {
      set({ loading: true, error: null });
    }
    
    try {
      const [
        summaryRes,
        zonesRes,
        demoRes,
        riskRes,
        emergencyRes,
        recRes,
        compRes,
        alertsRes,
        scoresRes,
        sensorsRes
      ] = await Promise.all([
        dashboardService.getSummary({ signal }),
        dashboardService.getZoneOverview({ signal }),
        demoService.getStatus({ signal }),
        // The real, camera-aware Compound Risk Engine (9 rules, including
        // PPE/fire/smoke) — not the legacy v1 weighted scorer
        // (`compoundRiskService.calculate`), which has no camera signal at
        // all and is why the dashboard's "AI Verdict" previously looked
        // static regardless of what the CCTV scene showed. Read-only, so
        // this poll doesn't also write a new risk_scores row every tick.
        compoundRiskService.calculateReal({ signal }),
        emergencyResponseService.getActions({ signal }),
        recommendationService.getRecommendations({ signal }),
        complianceService.getStatus(undefined, { signal }),
        alertsService.getRecentAlerts({ limit: 100 }, { signal }),
        compoundRiskService.getRecent({ limit: 20 }, { signal }),
        sensorsService.getSensors({ limit: 100 }, { signal })
      ]);

      const activeDemoZone = demoRes.running ? demoRes.zone : null;

      if (!signal?.aborted) {
        set({
          summary: summaryRes.data.data,
          zones: zonesRes.data.data.zones,
          assessment: compoundRiskService.toRealAssessment(riskRes, activeDemoZone),
          explanation: compoundRiskService.toRealExplanation(riskRes, activeDemoZone),
          globalRiskLevel: riskRes.results.length > 0 
            ? [...riskRes.results].sort((a, b) => b.risk_score - a.risk_score)[0].risk_level 
            : 'low',
          emergencyActions: emergencyResponseService.toActionItems(emergencyRes),
          recommendations: recRes.recommendations,
          compliance: compRes,
          alerts: alertsRes.data,
          riskScores: scoresRes.data,
          sensors: sensorsRes.data,
          loading: false,
          error: null,
          lastUpdated: new Date()
        });
      }
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError && !signal?.aborted) {
        set({ error: apiError.toUserMessage(), loading: false });
      }
    }
  }
}));
