import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Button, QueryState, Skeleton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useIncidentReport } from '@/features/incidents/hooks/useIncidentReport';
import { IncidentReportViewer } from '@/features/incidents/components/IncidentReportViewer';

export function IncidentReportPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { report, loading, error, refresh } = useIncidentReport(incidentId);

  return (
    <div className="page-container print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Incident Report"
          description={report ? report.summary.zone : 'Structured safety incident report.'}
          backHref={ROUTES.ALERTS}
          actions={
            report && (
              <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                Print
              </Button>
            )
          }
        />
      </div>

      {/* Print-only masthead — the on-screen PageHeader is hidden when printing. */}
      {report && (
        <div className="hidden print:block print:mb-4">
          <h1 className="text-xl font-semibold text-black">Incident Report — {report.summary.zone}</h1>
          <p className="text-sm text-gray-600">{report.summary.incident_id}</p>
        </div>
      )}

      <QueryState
        loading={loading}
        error={error}
        data={report}
        onRetry={refresh}
        errorTitle="Failed to load incident report"
        loadingFallback={
          <Card padding="lg">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-1/3 rounded" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </Card>
        }
      >
        {(reportData) => <IncidentReportViewer report={reportData} />}
      </QueryState>
    </div>
  );
}
