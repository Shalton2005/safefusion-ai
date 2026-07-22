import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart2, Clock, Search, Filter, ChevronLeft, ChevronRight, Sparkles, Gauge,
  Camera, Radio, Users, ClipboardList, Share2, MoreVertical, Eye, FileDown, FileSpreadsheet, Wand2,
} from 'lucide-react';
import { Card, CardHeader, Badge, Table, Button, PageHeader, Input, Alert, EmptyState, Modal } from '@/components/ui';
import type { TableColumn, BadgeVariant } from '@/components/ui';
import type { Report, ReportType, ReportStatus } from '@/types';
import { SEVERITY_BADGE_VARIANT, CONFIDENCE_TIER_TEXT_CLASS, confidenceTier } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';
import { formatDateTime, formatRelativeTime, capitalise } from '@/utils/format';
import { useReports } from '@/features/reports/hooks/useReports';
import { usePlantStatus } from '@/features/plant-status/hooks/usePlantStatus';
import { ROUTES, incidentReportPath } from '@/constants/routes';

const SOURCES = [
  { label: 'CCTV', icon: Camera },
  { label: 'IoT', icon: Radio },
  { label: 'Workers', icon: Users },
  { label: 'Permits', icon: ClipboardList },
  { label: 'Knowledge Graph', icon: Share2 },
];

/** Derives an executive summary from the already-fetched report list — never a fabricated/static readout. */
function useAIExecutiveSummary(reports: Report[]) {
  return useMemo(() => {
    const critical = reports.filter((r) => r.severity === 'critical');
    const criticalIncidents = critical.filter((r) => r.type === 'Incident Report');
    const permitViolations = reports.filter((r) => r.type === 'Permit Review' && (r.severity === 'high' || r.severity === 'critical'));
    const cctvEvents = reports.filter((r) => r.type === 'CCTV Investigation' || r.type === 'PPE Violation');
    const complianceReports = reports.filter((r) => r.type === 'Compliance Audit');
    const compliancePassRate = complianceReports.length
      ? Math.round((complianceReports.filter((r) => r.status === 'Approved').length / complianceReports.length) * 100)
      : null;

    const zoneRiskCounts = new Map<string, number>();
    for (const r of reports) {
      if (r.severity === 'critical' || r.severity === 'high') {
        zoneRiskCounts.set(r.zone, (zoneRiskCounts.get(r.zone) ?? 0) + 1);
      }
    }
    let highestRiskZone: string | null = null;
    let highestRiskCount = 0;
    for (const [zone, count] of zoneRiskCounts) {
      if (count > highestRiskCount) {
        highestRiskZone = zone;
        highestRiskCount = count;
      }
    }

    const findings: string[] = [];
    if (criticalIncidents.length) findings.push(`${criticalIncidents.length} Critical Incident Report${criticalIncidents.length === 1 ? '' : 's'}`);
    if (permitViolations.length) findings.push(`${permitViolations.length} Permit Violation${permitViolations.length === 1 ? '' : 's'}`);
    if (cctvEvents.length) findings.push(`${cctvEvents.length} CCTV Safety Event${cctvEvents.length === 1 ? '' : 's'}`);
    if (compliancePassRate !== null) findings.push(`Compliance approval rate at ${compliancePassRate}%`);
    if (highestRiskZone) findings.push(`${highestRiskZone} remains highest risk`);
    if (!findings.length) findings.push('No significant findings across current reports.');

    const recommendations: string[] = [];
    if (highestRiskZone) recommendations.push(`Review ${highestRiskZone} reports`);
    if (permitViolations.length) recommendations.push('Close expired or violated permits');
    if (critical.length) recommendations.push('Dispatch Safety Officer');
    if (!recommendations.length) recommendations.push('Continue routine monitoring.');

    const confidence = reports.length
      ? Math.round(reports.reduce((sum, r) => sum + r.aiConfidence, 0) / reports.length)
      : 0;

    return {
      totalAnalyzed: reports.length,
      findings,
      recommendations,
      confidence,
    };
  }, [reports]);
}

const REPORT_TYPES: ReportType[] = [
  'Incident Report',
  'Compliance Audit',
  'PPE Violation',
  'Permit Review',
  'Safety Inspection',
  'CCTV Investigation',
  'AI Executive Summary',
];

const REPORT_STATUSES: ReportStatus[] = [
  'Drafted by AI',
  'Awaiting Officer Review',
  'Approved',
  'Flagged',
  'Escalated',
  'Closed',
];

const SEVERITIES: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

const STATUS_BADGE_VARIANT: Record<ReportStatus, BadgeVariant> = {
  'Drafted by AI': 'secondary',
  'Awaiting Officer Review': 'warning',
  'Approved': 'success',
  'Flagged': 'warning',
  'Escalated': 'danger',
  'Closed': 'outline',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface ReportRowActions {
  onView: (report: Report) => void;
  onDownloadPdf: (report: Report) => void;
  onDownloadCsv: (report: Report) => void;
  onShare: (report: Report) => void;
  onGenerateAISummary: (report: Report) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}

function buildColumns(actions: ReportRowActions): TableColumn<Report>[] {
  return [
    {
      key: 'title',
      header: 'Report',
      accessor: 'title',
      render: (v) => (
        <div className="flex items-center gap-2">
          <FileBarChart2 className="w-4 h-4 text-[var(--sf-text-tertiary)] flex-shrink-0" />
          <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Type', accessor: 'type' },
    { key: 'zone', header: 'Zone', accessor: 'zone' },
    {
      key: 'severity',
      header: 'Severity',
      accessor: 'severity',
      render: (v) => (
        <Badge variant={SEVERITY_BADGE_VARIANT[v as SeverityLevel]} size="sm" dot>
          {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: 'generatedAt',
      header: 'Generated',
      accessor: 'generatedAt',
      render: (v) => (
        <span className="text-xs text-[var(--sf-text-tertiary)] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateTime(v as string)}
        </span>
      ),
    },
    { key: 'generatedBy', header: 'Generated By', accessor: 'generatedBy' },
    {
      key: 'aiConfidence',
      header: 'AI Confidence',
      accessor: 'aiConfidence',
      render: (v) => (
        <Badge variant={confidenceTier(v as number) === 'safe' ? 'success' : confidenceTier(v as number) === 'caution' ? 'warning' : 'danger'} size="sm">
          {v as number}%
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (v) => (
        <Badge variant={STATUS_BADGE_VARIANT[v as ReportStatus]} size="sm" dot>
          {v as string}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_v, row) => (
        <div className="relative inline-block">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Report actions"
            onClick={(e) => {
              e.stopPropagation();
              actions.setOpenMenuId(actions.openMenuId === row.id ? null : row.id);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {actions.openMenuId === row.id && (
            <div
              className="absolute top-full right-0 mt-1 w-52 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-xl shadow-lg z-50 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-sunken)] text-left"
                onClick={() => { actions.onView(row); actions.setOpenMenuId(null); }}
              >
                <Eye className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> View
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-sunken)] text-left"
                onClick={() => { actions.onDownloadPdf(row); actions.setOpenMenuId(null); }}
              >
                <FileDown className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> Download PDF
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-sunken)] text-left"
                onClick={() => { actions.onDownloadCsv(row); actions.setOpenMenuId(null); }}
              >
                <FileSpreadsheet className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> Download CSV
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-sunken)] text-left"
                onClick={() => { actions.onShare(row); actions.setOpenMenuId(null); }}
              >
                <Share2 className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> Share
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-sunken)] text-left"
                onClick={() => { actions.onGenerateAISummary(row); actions.setOpenMenuId(null); }}
              >
                <Wand2 className="w-4 h-4 text-[var(--sf-text-tertiary)]" /> Generate AI Summary
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];
}

/** Priority rank for emergency-mode sorting — lower sorts first. Everything else falls through to normal recency order. */
const EMERGENCY_TYPE_PRIORITY: Partial<Record<ReportType, number>> = {
  'Incident Report': 0,
  'AI Executive Summary': 2,
};

function emergencySortKey(r: Report): number {
  if (r.status === 'Escalated' || r.severity === 'critical') return 1;
  return EMERGENCY_TYPE_PRIORITY[r.type] ?? 3;
}

/** Builds a CSV file from a single report and triggers a browser download — no backend export endpoint exists yet. */
function downloadReportCsv(report: Report) {
  const header = ['Title', 'Type', 'Zone', 'Severity', 'Generated At', 'Generated By', 'AI Confidence', 'Status'];
  const row = [report.title, report.type, report.zone, report.severity, report.generatedAt, report.generatedBy, `${report.aiConfidence}%`, report.status];
  const csv = [header, row].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { reports, loading, error, lastUpdated } = useReports();
  const { inEmergency } = usePlantStatus();
  const summary = useAIExecutiveSummary(reports);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const handleView = (report: Report) => {
    if (report.type === 'Incident Report' || report.type === 'PPE Violation') {
      navigate(incidentReportPath(report.sourceId));
      return;
    }
    setViewReport(report);
  };

  const handleShare = (report: Report) => {
    const link = `${window.location.origin}${ROUTES.REPORTS}?reportId=${report.id}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setShareNotice(`Link copied for "${report.title}".`);
    window.setTimeout(() => setShareNotice(null), 3000);
  };

  const handleGenerateAISummary = (report: Report) => {
    setViewReport(report);
  };

  const [search, setSearch] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<ReportStatus[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<SeverityLevel[]>([]);
  const [filterTypes, setFilterTypes] = useState<ReportType[]>([]);
  const [filterZone, setFilterZone] = useState('');
  const [filterGeneratedBy, setFilterGeneratedBy] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns = useMemo(
    () => buildColumns({
      onView: handleView,
      onDownloadPdf: () => window.print(),
      onDownloadCsv: downloadReportCsv,
      onShare: handleShare,
      onGenerateAISummary: handleGenerateAISummary,
      openMenuId,
      setOpenMenuId,
    }),
    [openMenuId],
  );

  const zones = useMemo(
    () => Array.from(new Set(reports.map((r) => r.zone))).sort(),
    [reports],
  );
  const generators = useMemo(
    () => Array.from(new Set(reports.map((r) => r.generatedBy))).sort(),
    [reports],
  );

  const activeFilterCount =
    filterStatuses.length +
    filterSeverities.length +
    filterTypes.length +
    (filterZone ? 1 : 0) +
    (filterGeneratedBy ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0);

  const resetFilters = () => {
    setFilterStatuses([]);
    setFilterSeverities([]);
    setFilterTypes([]);
    setFilterZone('');
    setFilterGeneratedBy('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = filterDateFrom ? new Date(filterDateFrom).getTime() : null;
    const to = filterDateTo ? new Date(filterDateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    const result = reports.filter((r) => {
      if (filterStatuses.length && !filterStatuses.includes(r.status)) return false;
      if (filterSeverities.length && !filterSeverities.includes(r.severity)) return false;
      if (filterTypes.length && !filterTypes.includes(r.type)) return false;
      if (filterZone && r.zone !== filterZone) return false;
      if (filterGeneratedBy && r.generatedBy !== filterGeneratedBy) return false;

      if (from || to) {
        const t = new Date(r.generatedAt).getTime();
        if (from && t < from) return false;
        if (to && t > to) return false;
      }

      if (q) {
        const haystack = `${r.title} ${r.type} ${r.zone} ${r.generatedBy} ${r.status}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    if (inEmergency) {
      return [...result].sort((a, b) => {
        const rankDiff = emergencySortKey(a) - emergencySortKey(b);
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      });
    }

    return result;
  }, [reports, search, filterStatuses, filterSeverities, filterTypes, filterZone, filterGeneratedBy, filterDateFrom, filterDateTo, inEmergency]);

  const total = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const skip = (clampedPage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(skip, skip + pageSize);

  return (
    <div className="page-container">
      <PageHeader
        title="Reports"
        description="View and track safety compliance, risks, and incident reports."
        border={false}
        className="px-0 pt-0"
      />

      <Card padding="none" className="mb-6">
        <CardHeader
          title="AI Report Summary"
          className="px-6 pt-5 pb-4 border-b border-[var(--sf-border-default)]"
          action={
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]">
                <Clock className="w-3.5 h-3.5" />
                Generated {lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : '—'}
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <Gauge className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                <span className="text-[var(--sf-text-tertiary)]">Confidence</span>
                <span className={`font-mono font-semibold ${CONFIDENCE_TIER_TEXT_CLASS[confidenceTier(summary.confidence)]}`}>
                  {summary.confidence}%
                </span>
              </span>
            </div>
          }
        />
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--sf-text-secondary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500 flex-shrink-0" />
            AI analyzed {summary.totalAnalyzed} reports.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-[var(--sf-text-secondary)] uppercase tracking-wide mb-2">Findings</h4>
              <ul className="space-y-1.5">
                {summary.findings.map((f, i) => (
                  <li key={i} className="text-sm text-[var(--sf-text-primary)] flex items-start gap-2">
                    <span className="text-[var(--sf-text-tertiary)] mt-0.5">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--sf-text-secondary)] uppercase tracking-wide mb-2">Recommendations</h4>
              <ul className="space-y-1.5">
                {summary.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-[var(--sf-text-primary)] flex items-start gap-2">
                    <span className="text-[var(--sf-text-tertiary)] mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[var(--sf-border-default)]">
            <span className="text-xs font-semibold text-[var(--sf-text-tertiary)]">Generated from:</span>
            {SOURCES.map(({ label, icon: Icon }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-[var(--sf-text-secondary)]">
                <Icon className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        <CardHeader
          title={inEmergency ? 'Emergency Incident Reports' : 'Report History'}
          className="px-6 pt-5 pb-4 border-b border-[var(--sf-border-default)]"
          action={
            <div className="flex items-center gap-2">
              <div className="w-64">
                <Input
                  placeholder="Search by name, type, zone, author, status..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  leftAddon={<Search className="w-4 h-4" />}
                  fieldSize="sm"
                />
              </div>
              <div className="relative inline-block">
                <Button
                  variant={activeFilterCount ? 'primary' : 'outline'}
                  size="sm"
                  leftIcon={<Filter className="w-4 h-4" />}
                  onClick={() => setShowFilterMenu((v) => !v)}
                >
                  Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </Button>
                {showFilterMenu && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-xl shadow-lg z-50 p-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1.5 block">Status</label>
                        <div className="flex flex-wrap gap-1.5">
                          {REPORT_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setFilterStatuses((prev) => toggle(prev, s)); setPage(1); }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                filterStatuses.includes(s)
                                  ? 'bg-primary-500/15 border-primary-500 text-primary-600'
                                  : 'border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1.5 block">Severity</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SEVERITIES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setFilterSeverities((prev) => toggle(prev, s)); setPage(1); }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                                filterSeverities.includes(s)
                                  ? 'bg-primary-500/15 border-primary-500 text-primary-600'
                                  : 'border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1.5 block">Report Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {REPORT_TYPES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { setFilterTypes((prev) => toggle(prev, t)); setPage(1); }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                filterTypes.includes(t)
                                  ? 'bg-primary-500/15 border-primary-500 text-primary-600'
                                  : 'border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Zone</label>
                        <select
                          className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                          value={filterZone}
                          onChange={(e) => { setFilterZone(e.target.value); setPage(1); }}
                        >
                          <option value="">All Zones</option>
                          {zones.map((z) => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Generated By</label>
                        <select
                          className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                          value={filterGeneratedBy}
                          onChange={(e) => { setFilterGeneratedBy(e.target.value); setPage(1); }}
                        >
                          <option value="">Anyone</option>
                          {generators.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                            value={filterDateFrom}
                            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                          />
                          <span className="text-xs text-[var(--sf-text-tertiary)]">to</span>
                          <input
                            type="date"
                            className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                            value={filterDateTo}
                            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[var(--sf-border-default)]">
                        <Button size="sm" onClick={() => setShowFilterMenu(false)} className="flex-1 justify-center">Apply</Button>
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="flex-1 justify-center">Reset</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load reports" className="mb-4">
              {error}
            </Alert>
          )}

          {!loading && total === 0 ? (
            <EmptyState
              icon={Search}
              title={search || activeFilterCount ? 'No reports match your search criteria.' : 'No reports have been generated yet.'}
              description={search || activeFilterCount ? 'Try adjusting your search or filter criteria.' : undefined}
              action={
                (search || activeFilterCount) ? (
                  <Button variant="outline" onClick={() => { setSearch(''); resetFilters(); }}>Reset Filters</Button>
                ) : undefined
              }
            />
          ) : (
            <Table<Report>
              columns={columns}
              data={paginatedReports}
              keyExtractor={(r) => r.id}
              caption="Report history"
              loading={loading}
              onRowClick={handleView}
            />
          )}

          {total > 0 && (
            <div className="flex items-center justify-between mt-4 px-2 flex-wrap gap-3">
              <span className="text-sm text-[var(--sf-text-tertiary)]">
                Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total} Reports
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--sf-text-secondary)]">Rows per page:</span>
                  <select
                    className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-xs text-[var(--sf-text-primary)]"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clampedPage === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clampedPage === totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {shareNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-xl shadow-lg px-4 py-3 text-sm text-[var(--sf-text-primary)]">
          {shareNotice}
        </div>
      )}

      <Modal
        open={viewReport !== null}
        onClose={() => setViewReport(null)}
        title={viewReport?.title}
        description={viewReport ? `${viewReport.type} • ${viewReport.zone}` : undefined}
        size="sm"
      >
        {viewReport && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--sf-text-tertiary)]">Severity</span>
              <Badge variant={SEVERITY_BADGE_VARIANT[viewReport.severity]} size="sm" dot>
                {capitalise(viewReport.severity)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sf-text-tertiary)]">Status</span>
              <Badge variant={STATUS_BADGE_VARIANT[viewReport.status]} size="sm" dot>
                {viewReport.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sf-text-tertiary)]">Generated</span>
              <span className="text-[var(--sf-text-primary)]">{formatDateTime(viewReport.generatedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sf-text-tertiary)]">Generated By</span>
              <span className="text-[var(--sf-text-primary)]">{viewReport.generatedBy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sf-text-tertiary)]">AI Confidence</span>
              <span className={`font-mono font-semibold ${CONFIDENCE_TIER_TEXT_CLASS[confidenceTier(viewReport.aiConfidence)]}`}>
                {viewReport.aiConfidence}%
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
