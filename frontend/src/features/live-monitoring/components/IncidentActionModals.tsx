import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Activity, AlertTriangle, Clock, CheckCircle2, Loader2,
  FlameKindling, Users, PhoneCall, Radio, Bell, UserCheck,
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { toast } from '@/store/useNotificationStore';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants/routes';

/**
 * The active compound-risk incident these three dialogs act on. Mirrors the
 * mock data already hardcoded in AIIncidentSummary / AICopilotPanel — there's
 * one live incident driving the whole demo, not per-component fixtures.
 */
export const ACTIVE_INCIDENT = {
  id: 'INC-2026-0714',
  zone: 'Tank Farm',
  severity: 'critical' as const,
  verdict: 'Compound Risk Detected',
  incidentType: 'Compound Risk — Gas Leak + Active Hot Work',
  confidence: 98.4,
  description: 'Gas leak detected near Tank Farm while active Hot Work permit PTW-2026-014 remains open. Wind direction is carrying vapor toward the active spark source.',
  factors: ['Gas Leak', 'Active Hot Work', 'PPE Non Compliance', 'Wind Direction'],
  escalation: { threat: 'Flash Fire', timeframe: 'within 4-7 minutes' },
  camera: 'CCTV-07',
  workersExposed: 2,
  occurredAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  permitId: 'PTW-2026-014',
};

interface ResponseStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ElementType;
}

const RESPONSE_STEPS: ResponseStep[] = [
  { id: 'suspend', label: 'Suspend Hot Work Permit', detail: `PTW-2026-014 suspended in Permit-to-Work system`, icon: FlameKindling },
  { id: 'evacuate', label: 'Evacuate Zone Personnel', detail: `${ACTIVE_INCIDENT.workersExposed} workers directed to assembly point`, icon: Users },
  { id: 'notify', label: 'Notify Safety Officer', detail: 'On-duty officer paged via emergency dispatch', icon: PhoneCall },
  { id: 'shutdown', label: 'Shutdown Fuel Valve', detail: 'Remote shutoff signal sent to Zone control', icon: Radio },
];

type StepStatus = 'pending' | 'running' | 'done';

// ─── Execute Response ─────────────────────────────────────────────

export function ExecuteResponseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!open) {
      setStatuses({});
      setComplete(false);
      return;
    }

    let cancelled = false;
    const runSteps = async () => {
      for (const step of RESPONSE_STEPS) {
        if (cancelled) return;
        setStatuses((prev) => ({ ...prev, [step.id]: 'running' }));
        await new Promise((r) => setTimeout(r, 900));
        if (cancelled) return;
        setStatuses((prev) => ({ ...prev, [step.id]: 'done' }));
      }
      if (!cancelled) setComplete(true);
    };
    runSteps();

    return () => { cancelled = true; };
  }, [open]);

  const allDone = RESPONSE_STEPS.every((s) => statuses[s.id] === 'done');

  const handleClose = () => {
    if (allDone) {
      toast.success('Emergency response executed', `All ${RESPONSE_STEPS.length} response actions completed for ${ACTIVE_INCIDENT.zone}.`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Execute Emergency Response"
      description={`${ACTIVE_INCIDENT.zone} — ${ACTIVE_INCIDENT.verdict}`}
      size="lg"
      disableBackdropClose={!allDone}
      disableEscapeClose={!allDone}
      footer={
        <Button variant={allDone ? 'primary' : 'ghost'} onClick={handleClose} disabled={!allDone}>
          {allDone ? 'Done' : 'Executing…'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-danger-500/30 bg-danger-500/10">
          <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger-300">{ACTIVE_INCIDENT.escalation.threat} risk {ACTIVE_INCIDENT.escalation.timeframe}</p>
            <p className="text-xs text-danger-400/80 mt-0.5">Automated response workflow will execute the following actions in sequence.</p>
          </div>
        </div>

        <ol className="flex flex-col gap-2">
          {RESPONSE_STEPS.map((step) => {
            const status = statuses[step.id] ?? 'pending';
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  status === 'done' && 'border-safe-500/30 bg-safe-500/5',
                  status === 'running' && 'border-primary-500/30 bg-primary-500/5',
                  status === 'pending' && 'border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  status === 'done' && 'bg-safe-500/15 text-safe-500',
                  status === 'running' && 'bg-primary-500/15 text-primary-500',
                  status === 'pending' && 'bg-[var(--sf-surface-sunken)] text-[var(--sf-text-tertiary)]',
                )}>
                  {status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : status === 'running' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--sf-text-primary)]">{step.label}</p>
                  <p className="text-xs text-[var(--sf-text-tertiary)]">{step.detail}</p>
                </div>
                {status === 'done' && (
                  <Badge variant="success" size="sm">Complete</Badge>
                )}
                {status === 'running' && (
                  <Badge variant="primary" size="sm" dot pulsing>Running</Badge>
                )}
              </li>
            );
          })}
        </ol>

        {complete && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-safe-500/30 bg-safe-500/10">
            <CheckCircle2 className="w-5 h-5 text-safe-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-safe-500">Response workflow complete. All zone personnel and systems have been secured.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── View Incident ─────────────────────────────────────────────────

export function ViewIncidentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ACTIVE_INCIDENT.id}
      description={ACTIVE_INCIDENT.incidentType}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Zone</span>
            <span className="text-sm font-semibold text-[var(--sf-text-primary)] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--sf-text-secondary)]" />
              {ACTIVE_INCIDENT.zone}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Severity</span>
            <Badge variant="danger" size="sm" dot pulsing>{ACTIVE_INCIDENT.severity.toUpperCase()}</Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">AI Confidence</span>
            <span className="text-sm font-mono text-[var(--sf-text-primary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary-400" />
              {ACTIVE_INCIDENT.confidence.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Description</span>
          <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">{ACTIVE_INCIDENT.description}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Detected Factors</span>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVE_INCIDENT.factors.map((factor) => (
              <div key={factor} className="flex items-center gap-2 text-sm text-[var(--sf-text-secondary)] bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)] rounded-md px-2.5 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-danger-400 flex-shrink-0" />
                <span className="font-medium">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Related Permit</span>
            <span className="text-sm font-mono text-[var(--sf-text-primary)]">{ACTIVE_INCIDENT.permitId}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Source Camera</span>
            <span className="text-sm font-mono text-[var(--sf-text-primary)]">{ACTIVE_INCIDENT.camera}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--sf-text-tertiary)] pt-1 border-t border-[var(--sf-border-subtle)]">
          <Clock className="w-3.5 h-3.5" />
          Detected {new Date(ACTIVE_INCIDENT.occurredAt).toLocaleString()}
        </div>
      </div>
    </Modal>
  );
}

// ─── Notify Team ───────────────────────────────────────────────────

const NOTIFY_RECIPIENTS = [
  { name: 'Safety Officer (On-Duty)', role: 'safety_officer' },
  { name: 'Tank Farm Response Team', role: 'response_team' },
  { name: 'Plant Shift Supervisor', role: 'supervisor' },
];

export function NotifyTeamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sending, setSending] = useState(true);

  useEffect(() => {
    if (!open) {
      setSending(true);
      return;
    }
    const timer = setTimeout(() => {
      setSending(false);
      toast.success('Team notified', `${NOTIFY_RECIPIENTS.length} recipients alerted for ${ACTIVE_INCIDENT.zone}.`);
    }, 900);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notify Team"
      description={`Dispatch alert for ${ACTIVE_INCIDENT.zone} — ${ACTIVE_INCIDENT.verdict}`}
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose} disabled={sending}>
          {sending ? 'Sending…' : 'Done'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {NOTIFY_RECIPIENTS.map((recipient) => (
          <div
            key={recipient.role}
            className="flex items-center gap-3 p-3 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]"
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              sending ? 'bg-primary-500/15 text-primary-500' : 'bg-safe-500/15 text-safe-500',
            )}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <span className="text-sm font-semibold text-[var(--sf-text-primary)] flex-1">{recipient.name}</span>
            <Badge variant={sending ? 'primary' : 'success'} size="sm">
              {sending ? 'Sending' : 'Notified'}
            </Badge>
          </div>
        ))}
        {!sending && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-safe-500/30 bg-safe-500/10">
            <Bell className="w-4 h-4 text-safe-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-safe-500">All recipients acknowledged dispatch.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export interface IncidentActionModalsProps {
  executeResponseOpen: boolean;
  onCloseExecuteResponse: () => void;
  viewIncidentOpen: boolean;
  onCloseViewIncident: () => void;
  notifyTeamOpen: boolean;
  onCloseNotifyTeam: () => void;
}

/** Renders all three incident action dialogs; state is owned by the page so
 * both AIIncidentSummary and AICopilotPanel can trigger the same modals. */
export function IncidentActionModals({
  executeResponseOpen,
  onCloseExecuteResponse,
  viewIncidentOpen,
  onCloseViewIncident,
  notifyTeamOpen,
  onCloseNotifyTeam,
}: IncidentActionModalsProps) {
  return (
    <>
      <ExecuteResponseModal open={executeResponseOpen} onClose={onCloseExecuteResponse} />
      <ViewIncidentModal open={viewIncidentOpen} onClose={onCloseViewIncident} />
      <NotifyTeamModal open={notifyTeamOpen} onClose={onCloseNotifyTeam} />
    </>
  );
}

/**
 * Owns open/close state for the three modals plus the CCTV deep-link
 * navigation, so AIIncidentSummary and AICopilotPanel — two separate
 * surfaces referencing the same active incident — share one set of handlers
 * and never render duplicate modals.
 */
export function useIncidentActions() {
  const navigate = useNavigate();
  const [executeResponseOpen, setExecuteResponseOpen] = useState(false);
  const [viewIncidentOpen, setViewIncidentOpen] = useState(false);
  const [notifyTeamOpen, setNotifyTeamOpen] = useState(false);

  return {
    onExecuteResponse: () => setExecuteResponseOpen(true),
    onViewIncident: () => setViewIncidentOpen(true),
    onNotifyTeam: () => setNotifyTeamOpen(true),
    onViewCctv: () => navigate(`${ROUTES.CCTV_MONITORING}?cameraId=${encodeURIComponent(ACTIVE_INCIDENT.camera)}`),
    modalProps: {
      executeResponseOpen,
      onCloseExecuteResponse: () => setExecuteResponseOpen(false),
      viewIncidentOpen,
      onCloseViewIncident: () => setViewIncidentOpen(false),
      notifyTeamOpen,
      onCloseNotifyTeam: () => setNotifyTeamOpen(false),
    } satisfies IncidentActionModalsProps,
  };
}
