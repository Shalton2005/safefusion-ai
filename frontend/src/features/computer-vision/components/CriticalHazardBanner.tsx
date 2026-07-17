/**
 * CriticalHazardBanner
 *
 * Dashboard-level banner that surfaces active, critical-severity
 * hazards from the CV pipeline (fire, smoke, gas leak, unsafe worker
 * behaviour, restricted area entry). Renders nothing while loading, on
 * error, or when there are no active critical hazards — same
 * "ambient, non-blocking" convention as `EmergencyStatusBannerContainer`;
 * a missing banner should never read as "system is fine" when it might
 * just be loading, but it also shouldn't demand attention with a
 * skeleton/error state for a secondary widget.
 */

import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatLabel } from '@/utils/format';
import { useHazardDetections } from '../hooks';

export interface CriticalHazardBannerProps {
  className?: string;
}

export function CriticalHazardBanner({ className }: CriticalHazardBannerProps) {
  const { hazards, loading, error } = useHazardDetections();

  if (loading || error) return null;

  const criticalHazards = hazards.filter((h) => h.severity === 'critical' && h.status === 'active');
  if (criticalHazards.length === 0) return null;

  const [first] = criticalHazards;
  const message =
    criticalHazards.length === 1
      ? `${formatLabel(first.type)} detected at ${first.location}.`
      : `${criticalHazards.length} critical hazards detected across ${new Set(criticalHazards.map((h) => h.zone)).size} zone(s), including ${formatLabel(first.type)} at ${first.location}.`;

  return (
    <Alert
      variant="danger"
      mode="accent"
      title="Critical Hazard Detected"
      className={className}
      actions={
        <Link to={ROUTES.CCTV_MONITORING}>
          <Button size="sm" variant="danger" leftIcon={<Flame className="w-3.5 h-3.5" />}>
            View Hazard Detection
          </Button>
        </Link>
      }
    >
      {message}
    </Alert>
  );
}
