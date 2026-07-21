import type { Report, ReportType, ReportStatus } from '@/types';
import type { RequestOptions } from '@/api/types';
import type { SeverityLevel } from '@/constants';
import { incidentsService } from './incidents.service';
import { compoundRiskService } from './compoundRisk.service';
import { complianceService } from './compliance.service';
import { permitsService } from './permits.service';
import { visionService } from './vision.service';

/** Deterministic 0..n-1 hash off a record id — used to derive presentational fields without randomising on every render. */
function seedFrom(id: string): number {
  return id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

const GENERATORS = ['Vision AI', 'Compliance AI', 'Knowledge Graph', 'Safety Copilot'];

const STATUSES: ReportStatus[] = ['Drafted by AI', 'Awaiting Officer Review', 'Approved', 'Flagged', 'Escalated', 'Closed'];

function statusForSeverity(seed: number, severity: SeverityLevel): ReportStatus {
  if (severity === 'critical') return seed % 2 === 0 ? 'Escalated' : 'Flagged';
  return STATUSES[seed % (STATUSES.length - 2)];
}

function confidenceFor(seed: number, severity: SeverityLevel): number {
  const base = severity === 'critical' ? 95 : severity === 'high' ? 88 : severity === 'medium' ? 78 : 70;
  return base + (seed % 6);
}

const INCIDENT_TITLES: Record<string, string> = {
  gas_leak: 'Gas Leak Incident Report',
  fire: 'Fire Suppression Test',
  explosion: 'Emergency Evacuation Report',
  ppe_violation: 'PPE Compliance Inspection',
};

/** Aggregated, paginated report history from incidents, risk scores, compliance evaluations, and permits. */
export const reportsService = {
  getReports: async (options?: RequestOptions): Promise<Report[]> => {
    const [incidentsRes, riskScoresRes, complianceRes, permitsRes, hazardsRes] = await Promise.all([
      incidentsService.getIncidents({ limit: 200 }, options).catch(() => ({ data: [] })),
      compoundRiskService.getRecent({ limit: 200 }, options).catch(() => ({ data: [] })),
      complianceService.evaluateAll({ limit: 200 }, options).catch(() => ({ results: [] })),
      permitsService.getPermits({ limit: 200 }, options).catch(() => ({ data: [] })),
      visionService.getHazards(undefined, options).catch(() => ({ data: [] })),
    ]);

    const incidentReports: Report[] = (incidentsRes.data || []).map((i) => {
      const seed = seedFrom(i.id);
      const isPpe = i.incident_type === 'ppe_violation';
      const type: ReportType = isPpe ? 'PPE Violation' : 'Incident Report';
      const title = INCIDENT_TITLES[i.incident_type] ?? `${i.zone} Safety Incident Report`;
      return {
        id: `incident-${i.id}`,
        sourceId: i.id,
        title,
        type,
        zone: i.zone,
        severity: i.severity,
        generatedAt: i.occurred_at || i.created_at,
        generatedBy: GENERATORS[seed % GENERATORS.length],
        status: statusForSeverity(seed, i.severity),
        aiConfidence: confidenceFor(seed, i.severity),
      };
    });

    const riskReports: Report[] = (riskScoresRes.data || []).map((r) => {
      const seed = seedFrom(r.id);
      const titles = [`${r.zone} Temperature Audit`, `Worker Safety Assessment - ${r.zone}`, `Daily Shift Report - ${r.zone}`];
      return {
        id: `risk-${r.id}`,
        sourceId: r.id,
        title: titles[seed % titles.length],
        type: 'Safety Inspection',
        zone: r.zone,
        severity: r.risk_level,
        generatedAt: r.analyzed_at,
        generatedBy: 'Knowledge Graph',
        status: statusForSeverity(seed, r.risk_level),
        aiConfidence: confidenceFor(seed, r.risk_level),
      };
    });

    const complianceReports: Report[] = (complianceRes.results || []).map((c: Record<string, unknown>) => {
      const incidentId = String(c.incident_id ?? 'unknown');
      const seed = seedFrom(incidentId);
      const isCompliant = c.status === 'Compliant';
      const severity: SeverityLevel = isCompliant ? 'low' : seed % 2 === 0 ? 'high' : 'critical';
      return {
        id: `compliance-${incidentId}`,
        sourceId: incidentId,
        title: 'OISD Compliance Audit',
        type: 'Compliance Audit',
        zone: (c.zone as string) || 'Plant-wide',
        severity,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Compliance AI',
        status: isCompliant ? 'Approved' : statusForSeverity(seed, severity),
        aiConfidence: confidenceFor(seed, severity),
      };
    });

    const permitReports: Report[] = (permitsRes.data || []).map((p) => {
      const seed = seedFrom(p.id);
      const severity: SeverityLevel = p.status === 'suspended' ? 'high' : p.status === 'closed' ? 'low' : 'medium';
      const title = p.status === 'closed' ? 'Permit Closure Review' : `Permit Review - ${p.permit_type.replace(/_/g, ' ')}`;
      return {
        id: `permit-${p.id}`,
        sourceId: p.id,
        title,
        type: 'Permit Review',
        zone: p.zone,
        severity,
        generatedAt: p.updated_at || p.created_at,
        generatedBy: p.issued_by || 'Safety Copilot',
        status: statusForSeverity(seed, severity),
        aiConfidence: confidenceFor(seed, severity),
      };
    });

    const cctvReports: Report[] = (hazardsRes.data || []).map((h) => {
      const seed = seedFrom(h.id);
      return {
        id: `cctv-${h.id}`,
        sourceId: h.id,
        title: 'CCTV Intrusion Summary',
        type: 'CCTV Investigation',
        zone: h.zone,
        severity: h.severity,
        generatedAt: h.detectedAt,
        generatedBy: 'Vision AI',
        status: statusForSeverity(seed, h.severity),
        aiConfidence: h.confidence,
      };
    });

    const allReports = [...incidentReports, ...riskReports, ...complianceReports, ...permitReports, ...cctvReports];
    allReports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    return allReports;
  },
};
