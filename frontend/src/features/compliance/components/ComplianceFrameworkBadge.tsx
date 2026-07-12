/**
 * ComplianceFrameworkBadge
 *
 * Reusable badge for a single regulatory framework (Factory Act, OISD,
 * DGMS). Colour and label are centralised in `utils/severity.ts` — reuse
 * this component instead of re-deriving either per call site.
 *
 * @example
 * <ComplianceFrameworkBadge framework="oisd" />
 */

import { Badge } from '@/components/ui';
import { COMPLIANCE_FRAMEWORK_LABEL, COMPLIANCE_FRAMEWORK_BADGE_VARIANT } from '@/utils/severity';
import type { ComplianceFramework } from '@/types';

export interface ComplianceFrameworkBadgeProps {
  framework: ComplianceFramework;
  className?: string;
}

export function ComplianceFrameworkBadge({ framework, className }: ComplianceFrameworkBadgeProps) {
  return (
    <Badge variant={COMPLIANCE_FRAMEWORK_BADGE_VARIANT[framework]} size="sm" className={className}>
      {COMPLIANCE_FRAMEWORK_LABEL[framework]}
    </Badge>
  );
}
