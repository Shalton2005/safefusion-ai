/**
 * useIncidentReport
 *
 * Fetches the structured six-section incident report for a single
 * incident (`GET /incident-reports/{incidentId}`). Unlike the dashboard
 * panels, this is a one-shot fetch (not polled) — a generated report for
 * a specific incident isn't expected to change moment-to-moment.
 *
 * @example
 * const { report, loading, error, refresh } = useIncidentReport(incidentId);
 */

import { useEffect, useState } from 'react';
import { incidentReportService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { IncidentReportData } from '@/types';

export interface UseIncidentReportResult {
  report: IncidentReportData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIncidentReport(incidentId: string | undefined): UseIncidentReportResult {
  const [report, setReport] = useState<IncidentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!incidentId) {
      setLoading(false);
      setError('No incident specified.');
      return;
    }

    const { controller, signal } = createRequestController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await incidentReportService.getReport(incidentId, { signal });
        setReport(result);
      } catch (err) {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) {
          setError(apiError.toUserMessage());
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [incidentId, refreshToken]);

  const refresh = () => setRefreshToken((n) => n + 1);

  return { report, loading, error, refresh };
}
