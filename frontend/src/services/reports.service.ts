import type { Report } from '@/types';
import type { ListParams, RequestOptions } from '@/api/types';
import { incidentsService } from './incidents.service';
import { compoundRiskService } from './compoundRisk.service';
import { complianceService } from './compliance.service';

export const reportsService = {
  /** Aggregated and paginated report history from incidents, risk scores, and compliance. */
  getReports: async (params?: ListParams, options?: RequestOptions): Promise<{ data: Report[], total: number }> => {
    // In a real system, this aggregation might happen on the backend.
    // Here we fetch from the individual services and merge them.
    const [incidentsRes, riskScoresRes, complianceRes] = await Promise.all([
      incidentsService.getIncidents({ limit: 100 }, options).catch(() => ({ data: [] })),
      compoundRiskService.getRecent({ limit: 100 }, options).catch(() => ({ data: [] })),
      complianceService.evaluateAll({ limit: 100 }, options).catch(() => ({ results: [] })),
    ]);

    const incidents: Report[] = (incidentsRes.data || []).map(i => ({
      id: i.id,
      title: `Incident: ${i.incident_type}`,
      type: 'Incident Report',
      generatedAt: i.occurred_at || new Date().toISOString(),
      generatedBy: 'System',
      status: 'ready',
    }));

    const riskScores: Report[] = (riskScoresRes.data || []).map(r => ({
      id: r.id,
      title: `Risk Assessment - ${r.zone}`,
      type: 'Risk Report',
      generatedAt: r.analyzed_at || new Date().toISOString(),
      generatedBy: 'AI Engine',
      status: 'ready',
    }));

    const compliance: Report[] = (complianceRes.results || []).map((c: Record<string, unknown>) => ({
      id: `comp-${c.incident_id}`,
      title: `Compliance Evaluation`,
      type: 'Compliance Report',
      generatedAt: new Date().toISOString(), // evaluate is real-time
      generatedBy: 'Compliance Engine',
      status: c.status === 'Compliant' ? 'ready' : 'pending',
    }));

    let allReports = [...incidents, ...riskScores, ...compliance];

    // Sort by date descending
    allReports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    // In-memory pagination and searching
    if (params?.search) {
      const q = params.search.toLowerCase();
      allReports = allReports.filter(r => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
    }
    
    // Sort logic
    if (params?.sortField) {
      const field = params.sortField as keyof Report;
      allReports.sort((a, b) => {
        const valA = String(a[field]);
        const valB = String(b[field]);
        return params.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    const skip: number = (params?.skip as number) || 0;
    const limit: number = (params?.limit as number) || 50;
    const total: number = allReports.length;

    return {
      data: allReports.slice(skip, skip + limit),
      total,
    };
  },
};
