/**
 * EmergencyStatusBanner
 *
 * Reusable, color-coded plant status banner — Current Plant Status,
 * Risk Level, Emergency Mode, and Last Updated. Props-in only, no
 * fetching, so it can be mounted anywhere a status snapshot is
 * available. Use `EmergencyStatusBannerContainer` for a
 * self-fetching, drop-in version (e.g. mounted once in the app shell
 * so every page gets it for free).
 *
 * @example
 * <EmergencyStatusBanner
 *   status="critical"
 *   riskLevel="high"
 *   inEmergency={false}
 *   lastUpdated={lastUpdated}
 * />
 */

import { ShieldAlert, ShieldCheck, TriangleAlert, Siren } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LastUpdated } from '@/components/common/LastUpdated';
import { PLANT_STATUS_LABEL, PLANT_STATUS_BANNER_CLASSES } from '@/utils/severity';
import { capitalise } from '@/utils/format';
import type { PlantStatus } from '@/types';
import type { SeverityLevel } from '@/constants';

const STATUS_ICON: Record<PlantStatus, React.ElementType> = {
  normal:    ShieldCheck,
  warning:   TriangleAlert,
  critical:  ShieldAlert,
  emergency: Siren,
};

export interface EmergencyStatusBannerProps {
  status: PlantStatus;
  riskLevel: SeverityLevel;
  inEmergency: boolean;
  lastUpdated: Date | null;
  className?: string;
}

export function EmergencyStatusBanner({ status, riskLevel, inEmergency, lastUpdated, className }: EmergencyStatusBannerProps) {
  const Icon = STATUS_ICON[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 rounded-xl border',
        'print:hidden',
        PLANT_STATUS_BANNER_CLASSES[status],
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('w-5 h-5 flex-shrink-0', status === 'emergency' && 'animate-pulse')} aria-hidden="true" />
        <span className="text-sm font-semibold">Plant Status: {PLANT_STATUS_LABEL[status]}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="opacity-70">Risk Level:</span>
        <span className="font-medium">{capitalise(riskLevel)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="opacity-70">Emergency Mode:</span>
        <span className="font-medium">{inEmergency ? 'Active' : 'Inactive'}</span>
      </div>

      <LastUpdated timestamp={lastUpdated} className="ml-auto opacity-80" />
    </div>
  );
}
