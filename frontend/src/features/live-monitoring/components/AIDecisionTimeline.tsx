import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BrainCircuit, Activity, Eye, AlertTriangle, UserCheck, Siren, ArrowDown, Network } from 'lucide-react';
import { Card, CardHeader, Badge, QueryState, EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';

export type AIDecisionType = 'sensor' | 'correlation' | 'vision' | 'risk' | 'notification' | 'action';

export interface AIDecisionStep {
  id: string;
  timestamp: string;
  message: string;
  type: AIDecisionType;
}

// Simulated backend call for the AI reasoning engine feed
async function fetchAIDecisions(signal?: AbortSignal): Promise<AIDecisionStep[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (signal?.aborted) return reject(new Error('Aborted'));
      resolve([
        { id: '1', timestamp: '2026-07-21T11:21:00Z', message: 'Gas reached warning level', type: 'sensor' },
        { id: '2', timestamp: '2026-07-21T11:22:00Z', message: 'AI correlated active Hot Work permit', type: 'correlation' },
        { id: '3', timestamp: '2026-07-21T11:22:30Z', message: 'Computer Vision detected missing PPE', type: 'vision' },
        { id: '4', timestamp: '2026-07-21T11:23:00Z', message: 'Compound Risk exceeded threshold', type: 'risk' },
        { id: '5', timestamp: '2026-07-21T11:24:00Z', message: 'Safety Officer notified', type: 'notification' },
        { id: '6', timestamp: '2026-07-21T11:25:00Z', message: 'Evacuation initiated', type: 'action' },
      ]);
    }, 900);
    
    signal?.addEventListener('abort', () => clearTimeout(timeout));
  });
}

const STEP_STYLES: Record<AIDecisionType, { icon: React.ElementType, colorClass: string, textClass: string }> = {
  sensor: { icon: Activity, colorClass: 'text-caution-500 bg-caution-500/10 border-caution-500/20', textClass: 'text-[var(--sf-text-primary)]' },
  correlation: { icon: BrainCircuit, colorClass: 'text-primary-500 bg-primary-500/10 border-primary-500/20', textClass: 'text-[var(--sf-text-primary)]' },
  vision: { icon: Eye, colorClass: 'text-primary-500 bg-primary-500/10 border-primary-500/20', textClass: 'text-[var(--sf-text-primary)]' },
  risk: { icon: AlertTriangle, colorClass: 'text-danger-500 bg-danger-500/10 border-danger-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]', textClass: 'text-danger-400' },
  notification: { icon: UserCheck, colorClass: 'text-safe-500 bg-safe-500/10 border-safe-500/20', textClass: 'text-safe-400' },
  action: { icon: Siren, colorClass: 'text-danger-500 bg-danger-500/10 border-danger-500/20', textClass: 'text-danger-500' },
};

function formatTimeOnly(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(iso));
}

export function AIDecisionTimeline() {
  const [steps, setSteps] = useState<AIDecisionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const fetchSteps = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchAIDecisions(signal);
      setSteps(data);
      hasLoadedOnce.current = true;
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) {
        setError(apiError.toUserMessage());
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const { refresh } = usePolling(fetchSteps, 15000); // 15s refresh for live timeline

  return (
    <Card padding="none" className="h-full flex flex-col border-[var(--sf-border-default)]">
      <CardHeader
        title="AI Decision Timeline"
        description="Real-time reasoning behind compound risk and emergency actions."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && steps.length > 0 && (
            <Badge variant="primary" size="sm" dot pulsing>
              <Network className="w-3 h-3 mr-1" />
              Live Inference
            </Badge>
          )
        }
      />

      <div ref={parentRef} className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        <QueryState
          loading={loading}
          error={error}
          data={steps}
          onRetry={refresh}
          errorTitle="Failed to load AI timeline"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-4 rounded" />
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={BrainCircuit}
              size="sm"
              title="No active reasoning"
              description="The AI is currently monitoring the environment. No compound risks detected."
            />
          }
        >
          {(data) => {
            const rowVirtualizer = useVirtualizer({
              count: data.length,
              getScrollElement: () => parentRef.current,
              estimateSize: () => 70,
              overscan: 3,
            });

            return (
              <ol 
                className="relative flex flex-col text-[var(--sf-text-primary)] w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const index = virtualRow.index;
                  const step = data[index];
                  const isLast = index === data.length - 1;
                  const style = STEP_STYLES[step.type];
                  const Icon = style.icon;

                  return (
                    <li 
                      key={step.id} 
                      data-index={index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full flex gap-4"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Time */}
                      <div className="flex flex-col items-end pt-1 w-11 flex-shrink-0">
                        <span className="text-xs font-bold text-[var(--sf-text-tertiary)] font-mono">
                          {formatTimeOnly(step.timestamp)}
                        </span>
                      </div>

                      {/* Marker & Down Arrow Connector */}
                      <div className="relative flex flex-col items-center flex-shrink-0">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-500",
                          style.colorClass
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        
                        {!isLast && (
                          <div className="w-px flex-1 my-1.5 bg-gradient-to-b from-[var(--sf-border-default)] to-[var(--sf-border-subtle)] relative min-h-[30px]">
                            <ArrowDown className="w-3 h-3 text-[var(--sf-text-tertiary)]/70 absolute top-1/2 -left-1.5 transform -translate-y-1/2" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className={cn("flex flex-col pt-1.5 flex-1 min-w-0", !isLast ? "pb-6" : "pb-0")}>
                        <span className={cn("text-sm font-bold leading-snug", style.textClass)}>
                          {step.message}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          }}
        </QueryState>
      </div>
    </Card>
  );
}
