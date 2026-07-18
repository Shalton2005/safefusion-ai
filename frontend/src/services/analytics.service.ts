import { dashboardService } from './dashboard.service';
import { incidentsService } from './incidents.service';
import { compoundRiskService } from './compoundRisk.service';
import { complianceService } from './compliance.service';
import { visionService } from './vision.service';
import type { RequestOptions } from '@/api/types';
import type { AnalyticsSummary, TimeSeriesPoint } from '@/types';
import type { AlertDistributionSlice } from '@/components/charts';

export const analyticsService = {
  getSummary: async (options?: RequestOptions): Promise<{ data: AnalyticsSummary }> => {
    const [dashboardRes, complianceRes, visionRes, incidentsRes] = await Promise.all([
      dashboardService.getSummary(options).catch(() => ({ data: { data: { overall_risk_score: null } } } as unknown as { data: { data: { overall_risk_score: null } } })),
      complianceService.evaluateAll({ limit: 100 }, options).catch(() => ({ results: [] })),
      visionService.getCameraSummary(options).catch(() => ({ data: { counts: {} } })),
      incidentsService.getIncidents({ limit: 100 }, options).catch(() => ({ data: [] })),
    ]);

    const dashboardSummary = dashboardRes.data?.data;
    const riskScore = dashboardSummary?.overall_risk_score ?? null;

    const safetyScore = riskScore !== null 
      ? Math.max(0, 100 - (riskScore as number))
      : 100;

    const complianceRate = complianceRes.results && complianceRes.results.length > 0
      ? Math.round((complianceRes.results.filter(r => r.status === 'compliant').length / complianceRes.results.length) * 100)
      : 100;

    const ppeEvents = ((visionRes.data as Record<string, unknown>)?.counts as Record<string, number>)?.[ 'missing_helmet'] || 0 + (((visionRes.data as Record<string, unknown>)?.counts as Record<string, number>)?.[ 'missing_safety_vest'] || 0);

    const incidents = incidentsRes.data || [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentIncidentsCount = incidents.filter(i => new Date(i.created_at).getTime() >= thirtyDaysAgo.getTime()).length;

    return {
      data: {
        totalAlerts: recentIncidentsCount,
        activeAlerts: ppeEvents,
        devicesOnline: complianceRate,
        devicesTotal: ppeEvents,
        incidentRate: recentIncidentsCount,
        safetyScore: safetyScore,
        trend: 'stable'
      }
    };
  },

  getIncidentTrend: async (options?: RequestOptions): Promise<TimeSeriesPoint[]> => {
    try {
      const res = await incidentsService.getIncidents({ limit: 500 }, options);
      const incidents = res.data || [];
      const grouped: Record<string, number> = {};
      
      incidents.forEach(inc => {
        const date = new Date(inc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grouped[date] = (grouped[date] || 0) + 1;
      });

      const data = Object.entries(grouped)
        .map(([timestamp, value]) => ({ timestamp, value }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
      return data;
    } catch {
      return [];
    }
  },

  getRiskTrendByZone: async (options?: RequestOptions): Promise<AlertDistributionSlice[]> => {
    try {
      const res = await compoundRiskService.getRecent({ limit: 500 }, options);
      const scores = res.data || [];
      const zoneLatest: Record<string, string> = {};
      
      // Get the latest severity per zone
      scores.sort((a, b) => new Date(a.analyzed_at || a.updated_at).getTime() - new Date(b.analyzed_at || b.updated_at).getTime());
      scores.forEach(s => {
        if (s.zone) {
          zoneLatest[s.zone] = s.risk_level;
        }
      });

      const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      Object.values(zoneLatest).forEach(severity => {
        const key = severity.charAt(0).toUpperCase() + severity.slice(1);
        if (counts[key] !== undefined) counts[key]++;
      });

      return Object.entries(counts)
        .map(([severity, count]) => ({ severity: severity as 'Critical' | 'High' | 'Medium' | 'Low', count }))
        .filter(d => d.count > 0);
    } catch {
      return [];
    }
  }
};
