/**
 * EmergencyStatusBannerContainer
 *
 * Standalone, self-fetching wrapper around `EmergencyStatusBanner` —
 * polls `usePlantStatus()` itself. Mount once in the app shell (e.g.
 * `DashboardLayout`) to surface the banner on every page without each
 * page fetching its own status.
 *
 * Renders nothing while loading or on error — the banner is a
 * secondary, ambient status indicator, not a page's primary content,
 * so it shouldn't show a skeleton or block the page with an error
 * alert. A silent gap is preferable to a persistent chrome-level error
 * banner across every page in the app.
 */

import { usePlantStatus } from '@/features/plant-status/hooks/usePlantStatus';
import { EmergencyStatusBanner } from './EmergencyStatusBanner';

export interface EmergencyStatusBannerContainerProps {
  className?: string;
}

export function EmergencyStatusBannerContainer({ className }: EmergencyStatusBannerContainerProps) {
  const { status, riskLevel, inEmergency, lastUpdated, loading, error } = usePlantStatus();

  if (loading || error || status === null || riskLevel === null || inEmergency === null) {
    return null;
  }

  return (
    <EmergencyStatusBanner
      status={status}
      riskLevel={riskLevel}
      inEmergency={inEmergency}
      lastUpdated={lastUpdated}
      className={className}
    />
  );
}
