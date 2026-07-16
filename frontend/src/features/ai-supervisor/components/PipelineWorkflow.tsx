/**
 * PipelineWorkflow
 *
 * Static, presentation-only diagram of the fixed data pipeline that
 * feeds the AI Supervisor:
 *
 *   IoT Sensors → Computer Vision → Risk Engine → Knowledge Base
 *   → AI Supervisor → Emergency Actions
 *
 * Unlike `WorkflowGraph` (which visualises the *live* status of each
 * supervised engine via React Flow), this pipeline is fixed and
 * unconditional — it documents the system's architecture, not runtime
 * state, so it renders as a plain responsive flex layout rather than
 * a graph canvas. Icons are reused from existing usages elsewhere in
 * the app (`Radio` for sensors, `Waypoints` for the knowledge graph,
 * `BrainCircuit` for the AI Supervisor, `Siren` for emergency
 * actions) so the same concept always reads with the same icon.
 *
 * Responsive: a horizontal row with arrow connectors on wide
 * viewports, collapsing to a vertical stack with down-arrows on
 * narrow ones.
 *
 * @example
 * <PipelineWorkflow />
 */

import { type ElementType } from 'react';
import { ArrowRight, ArrowDown, Radio, ScanEye, ShieldAlert, Waypoints, BrainCircuit, Siren } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PipelineStage {
  label: string;
  description: string;
  icon: ElementType;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { label: 'IoT Sensors', description: 'Gas, temperature, pressure, humidity', icon: Radio },
  { label: 'Computer Vision', description: 'PPE & hazard detection from camera feeds', icon: ScanEye },
  { label: 'Risk Engine', description: 'Compound risk scoring per zone', icon: ShieldAlert },
  { label: 'Knowledge Base', description: 'Worker, zone, permit, incident graph', icon: Waypoints },
  { label: 'AI Supervisor', description: 'Synthesises every engine', icon: BrainCircuit },
  { label: 'Emergency Actions', description: 'Dispatched safety responses', icon: Siren },
];

export interface PipelineWorkflowProps {
  className?: string;
}

function StageNode({ stage }: { stage: PipelineStage }) {
  const Icon = stage.icon;
  return (
    <div
      className={cn(
        'flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2',
        'p-3 rounded-xl border border-[var(--sf-border-default)]',
        'bg-[var(--sf-surface-raised)]',
        'w-full md:w-32 flex-shrink-0',
      )}
    >
      <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600/15 text-primary-400">
        <Icon className="w-4.5 h-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--sf-text-primary)] leading-tight">{stage.label}</p>
        <p className="mt-0.5 text-2xs text-[var(--sf-text-tertiary)] leading-snug md:line-clamp-2">
          {stage.description}
        </p>
      </div>
    </div>
  );
}

export function PipelineWorkflow({ className }: PipelineWorkflowProps) {
  return (
    <ol
      aria-label="AI Supervisor data pipeline"
      className={cn(
        'flex flex-col md:flex-row md:items-stretch md:flex-wrap',
        'gap-2 md:gap-3',
        className,
      )}
    >
      {PIPELINE_STAGES.map((stage, index) => {
        const isLast = index === PIPELINE_STAGES.length - 1;
        return (
          <li key={stage.label} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <StageNode stage={stage} />
            {!isLast && (
              <span
                className="flex items-center justify-center flex-shrink-0 text-[var(--sf-text-tertiary)] self-center"
                aria-hidden="true"
              >
                <ArrowDown className="w-4 h-4 md:hidden" />
                <ArrowRight className="w-4 h-4 hidden md:block" />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
