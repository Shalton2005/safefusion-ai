/**
 * AIStatusBadge
 *
 * Small badge rendering either an agent status (`active`/`degraded`/`offline`)
 * or the overall supervisor processing state
 * (`idle`/`processing`/`action_required`/`error`) with consistent
 * colour coding and an optional live-pulsing dot.
 *
 * @example
 * <AIStatusBadge kind="agent" value="active" />
 * <AIStatusBadge kind="processing" value="action_required" />
 */

import { Badge, type BadgeSize } from '@/components/ui';
import type { AIAgentStatus, AISupervisorProcessingState } from '../types';

const AGENT_STATUS_LABEL: Record<AIAgentStatus, string> = {
  active: 'Active',
  degraded: 'Degraded',
  offline: 'Offline',
};

const AGENT_STATUS_VARIANT: Record<AIAgentStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  degraded: 'warning',
  offline: 'danger',
};

const PROCESSING_STATE_LABEL: Record<AISupervisorProcessingState, string> = {
  idle: 'Idle',
  processing: 'Processing',
  action_required: 'Action Required',
  error: 'Error',
};

const PROCESSING_STATE_VARIANT: Record<AISupervisorProcessingState, 'success' | 'primary' | 'danger'> = {
  idle: 'success',
  processing: 'primary',
  action_required: 'danger',
  error: 'danger',
};

interface AIStatusBadgeAgentProps {
  kind: 'agent';
  value: AIAgentStatus;
  size?: BadgeSize;
  className?: string;
}

interface AIStatusBadgeProcessingProps {
  kind: 'processing';
  value: AISupervisorProcessingState;
  size?: BadgeSize;
  className?: string;
}

export type AIStatusBadgeProps = AIStatusBadgeAgentProps | AIStatusBadgeProcessingProps;

export function AIStatusBadge(props: AIStatusBadgeProps) {
  const { size = 'sm', className } = props;

  if (props.kind === 'agent') {
    return (
      <Badge variant={AGENT_STATUS_VARIANT[props.value]} size={size} dot pulsing={props.value === 'active'} className={className}>
        {AGENT_STATUS_LABEL[props.value]}
      </Badge>
    );
  }

  return (
    <Badge
      variant={PROCESSING_STATE_VARIANT[props.value]}
      size={size}
      dot
      pulsing={props.value === 'processing' || props.value === 'action_required'}
      className={className}
    >
      {PROCESSING_STATE_LABEL[props.value]}
    </Badge>
  );
}
