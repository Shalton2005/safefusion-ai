import { create } from 'zustand';
import { analyticsService } from '@/services/analytics.service';
import type { 
  MapOverlaysData, 
  MapIncidentData, 
  MetricData, 
  TimeSeriesPoint, 
  RiskZoneData, 
  TimelineEventData, 
  AISummaryData, 
  AIRecommendationData 
} from '@/types';

export interface AnalyticsStoreState {
  plantStatus: string;
  baseState: MapOverlaysData | null;
  backendAISummary: AISummaryData | null;
  backendAIRecommendations: AIRecommendationData[] | null;
  backendPredictiveTimeline: TimelineEventData[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  fetchData: (signal?: AbortSignal) => Promise<void>;
  simulateIncident: (incident: MapIncidentData) => void;
  resolveIncident: (id: string) => void;
}

// Selectors
export const selectKPIs = (state: Pick<AnalyticsStoreState, 'baseState'>) => {
  if (!state.baseState) {
    return {
      trir: { value: 0, change: '0%', trendDir: 'down', positive: true },
      ltifr: { value: 0, change: '0%', trendDir: 'down', positive: true },
      activeCriticalRisks: { value: 0, change: '0', trendDir: 'down', positive: true },
      permitCompliance: { value: '0%', change: '0%', trendDir: 'up', positive: true },
    };
  }

  const totalIncidents = state.baseState.incidents.length;
  const critical = state.baseState.incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  
  const trirValue = (totalIncidents * 0.2).toFixed(1);
  const ltifrValue = (critical * 0.1).toFixed(1);
  const compliance = Math.max(0, 100 - critical * 2);

  return {
    trir: { value: parseFloat(trirValue), change: '+2%', trendDir: 'up', positive: false },
    ltifr: { value: parseFloat(ltifrValue), change: '+1%', trendDir: 'up', positive: false },
    activeCriticalRisks: { value: critical, change: critical > 0 ? `+${critical}` : '0', trendDir: critical > 0 ? 'up' : 'down', positive: critical === 0 },
    permitCompliance: { value: `${compliance}%`, change: '-1%', trendDir: 'down', positive: compliance > 90 },
  };
};

export const selectIncidentTrend = (state: Pick<AnalyticsStoreState, 'baseState'>) => {
  if (!state.baseState) return [];

  const critical = state.baseState.incidents.filter(i => i.severity === 'critical').length;
  const baseVal = state.baseState.incidents.length;

  return [
    { timestamp: "Jul 18", value: Math.max(1, baseVal - 3), critical: 0, resolved: 2, isForecast: false },
    { timestamp: "Jul 19", value: Math.max(2, baseVal - 2), critical: 1, resolved: 1, isForecast: false },
    { timestamp: "Jul 20", value: Math.max(1, baseVal - 1), critical: 0, resolved: 3, isForecast: false },
    { timestamp: "Jul 21", value: baseVal, critical, resolved: 1, isForecast: false },
    { timestamp: "Jul 21", forecastValue: baseVal, isForecast: true },
    { timestamp: "Jul 22", forecastValue: baseVal + 2, critical: critical + 1, resolved: 2, confidence: "85%", isForecast: true },
    { timestamp: "Jul 23", forecastValue: baseVal + 4, critical: critical + 2, resolved: 3, confidence: "75%", isForecast: true },
  ];
};

export const selectHighestRiskZones = (state: Pick<AnalyticsStoreState, 'baseState'>) => {
  if (!state.baseState) return [];

  const zoneMap: Record<string, { active: number, critical: number }> = {};
  
  state.baseState.facility_zones.forEach(z => {
    zoneMap[z.name] = { active: 0, critical: 0 };
  });

  state.baseState.incidents.forEach(inc => {
    if (!zoneMap[inc.zone]) zoneMap[inc.zone] = { active: 0, critical: 0 };
    zoneMap[inc.zone].active += 1;
    if (inc.severity === 'critical' || inc.severity === 'high') {
      zoneMap[inc.zone].critical += 1;
    }
  });

  return Object.entries(zoneMap).map(([zone, data]) => {
    const riskPercentage = Math.min(100, (data.critical * 25) + (data.active * 10));
    return {
      zone,
      riskPercentage,
      activeIncidents: data.active,
      criticalIncidents: data.critical,
      trend: data.critical > 0 ? "up" : data.active > 0 ? "stable" : "down"
    };
  }).sort((a, b) => b.riskPercentage - a.riskPercentage).slice(0, 5);
};

export const selectAISummary = (state: Pick<AnalyticsStoreState, 'backendAISummary'>) => {
  if (state.backendAISummary) return state.backendAISummary;
  return { increase_percentage: 0, primary_contributors: [], predicted_impact: '', recommended_actions: [] };
};

export const selectPredictiveTimeline = (state: Pick<AnalyticsStoreState, 'backendPredictiveTimeline'>) => {
  if (state.backendPredictiveTimeline) return state.backendPredictiveTimeline;
  return [];
};

export const selectAIRecommendations = (state: Pick<AnalyticsStoreState, 'backendAIRecommendations'>) => {
  if (state.backendAIRecommendations) return state.backendAIRecommendations;
  return [];
};

export const useAnalyticsStore = create<AnalyticsStoreState>((set, get) => ({
  plantStatus: 'Normal',
  baseState: null,
  backendAISummary: null,
  backendAIRecommendations: null,
  backendPredictiveTimeline: null,
  loading: true,
  error: null,
  lastUpdated: null,

  fetchData: async (signal?: AbortSignal) => {
    try {
      const data = await analyticsService.getOverview({ signal });
      set({ 
        baseState: data.mapOverlays, 
        plantStatus: data.plant_status, 
        backendAISummary: data.aiSummary,
        backendAIRecommendations: data.aiRecommendations,
        backendPredictiveTimeline: data.predictiveTimeline,
        error: null, 
        lastUpdated: new Date() 
      });
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        set({ error: err.message || 'Failed to fetch analytics' });
      }
    } finally {
      if (!signal?.aborted) {
        set({ loading: false });
      }
    }
  },

  simulateIncident: (incident: MapIncidentData) => {
    set(state => {
      if (!state.baseState) return state;
      return {
        baseState: {
          ...state.baseState,
          incidents: [incident, ...state.baseState.incidents]
        }
      };
    });
  },

  resolveIncident: (id: string) => {
    set(state => {
      if (!state.baseState) return state;
      return {
        baseState: {
          ...state.baseState,
          incidents: state.baseState.incidents.filter(inc => inc.id !== id)
        }
      };
    });
  }
}));
