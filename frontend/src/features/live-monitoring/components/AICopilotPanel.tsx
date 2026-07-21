import { useState, useEffect } from 'react';
import { BrainCircuit, ShieldAlert, Zap, AlertTriangle, Eye, Bell, Activity, FileWarning, HardHat, Wind, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@/components/ui';

export interface CopilotState {
  incidentType: string;
  confidence: number;
  estimatedResponseTime: string;
  potentialOutcome: string;
  reasoning: Array<{
    type: 'gas' | 'permit' | 'ppe' | 'weather';
    description: string;
  }>;
  actions: string[];
}

export interface AICopilotPanelProps {
  onExecuteResponse?: () => void;
  onNotifyTeam?: () => void;
  onViewCctv?: () => void;
}

export function AICopilotPanel({ onExecuteResponse, onNotifyTeam, onViewCctv }: AICopilotPanelProps) {
  const [copilotData, setCopilotData] = useState<CopilotState | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate backend integration for live copilot streaming inference
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopilotData({
        incidentType: 'Critical Compound Risk',
        confidence: 98.4,
        estimatedResponseTime: '2m 45s',
        potentialOutcome: 'Flash fire in Tank Farm A due to simultaneous gas accumulation and active spark source.',
        reasoning: [
          { type: 'gas', description: 'Gas Leak Detected' },
          { type: 'permit', description: 'Active Hot Work' },
          { type: 'ppe', description: 'Missing PPE (Worker)' },
          { type: 'weather', description: 'Wind Direction (Towards Unit)' },
        ],
        actions: [
          'Suspend Hot Work permit PTW-2026-014 immediately.',
          'Evacuate Tank Farm A personnel (2 workers).',
          'Notify on-duty Safety Officer.'
        ]
      });
      setLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !copilotData) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="text-lg font-bold text-[var(--sf-text-primary)] flex items-center gap-2.5">
              <BrainCircuit className="w-5 h-5 text-primary-500" />
              AI Copilot
            </h2>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-32 rounded-xl flex-shrink-0" />
          <div className="flex flex-col gap-3 flex-shrink-0">
            <Skeleton className="h-3 w-40 rounded" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0">
            <Skeleton className="h-3 w-36 rounded" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
        <div className="flex-shrink-0 p-6 pt-4 border-t border-[var(--sf-border-default)] bg-[var(--sf-surface-base)]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderReasoningIcon = (type: string) => {
    switch (type) {
      case 'gas': return <Activity className="w-4 h-4 text-danger-500" />;
      case 'permit': return <FileWarning className="w-4 h-4 text-caution-500" />;
      case 'ppe': return <HardHat className="w-4 h-4 text-warning-500" />;
      case 'weather': return <Wind className="w-4 h-4 text-info-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-primary-500" />;
    }
  };

  const renderReasoningBg = (type: string) => {
    switch (type) {
      case 'gas': return 'bg-danger-500/15';
      case 'permit': return 'bg-caution-500/15';
      case 'ppe': return 'bg-warning-500/15';
      case 'weather': return 'bg-info-500/15';
      default: return 'bg-primary-500/15';
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin min-h-0">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h2 className="text-lg font-bold text-[var(--sf-text-primary)] flex items-center gap-2.5">
            <BrainCircuit className="w-5 h-5 text-primary-500" />
            AI Copilot
          </h2>
          <Badge variant="primary" size="sm" dot pulsing>Active</Badge>
        </div>

        {/* Incident Summary Card */}
        <Card padding="none" className="border-danger-500/30 bg-danger-500/5 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.05)] flex-shrink-0">
          <div className="bg-danger-500/10 px-4 py-3 border-b border-danger-500/20 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-danger-500" />
              <span className="text-sm font-bold text-danger-500 uppercase tracking-widest">{copilotData.incidentType}</span>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xs uppercase tracking-widest font-bold text-[var(--sf-text-tertiary)]">Confidence</span>
                <span className="text-sm font-bold text-[var(--sf-text-primary)]">{copilotData.confidence}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xs uppercase tracking-widest font-bold text-[var(--sf-text-tertiary)]">Est. Response</span>
                <span className="text-sm font-bold text-[var(--sf-text-primary)]">{copilotData.estimatedResponseTime}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-2xs uppercase tracking-widest font-bold text-[var(--sf-text-tertiary)]">Potential Outcome</span>
              <span className="text-sm font-medium text-[var(--sf-text-secondary)] leading-relaxed">{copilotData.potentialOutcome}</span>
            </div>
          </div>
        </Card>

        {/* Reasoning Section */}
        <div className="flex flex-col gap-3 flex-shrink-0">
          <h3 className="text-3xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] px-1">Why this recommendation?</h3>
          <Card padding="sm" className="bg-[var(--sf-surface-sunken)] border-[var(--sf-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              {copilotData.reasoning.map((reason, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-3 py-2">
                    <div className={`w-8 h-8 rounded-full ${renderReasoningBg(reason.type)} flex items-center justify-center flex-shrink-0`}>
                      {renderReasoningIcon(reason.type)}
                    </div>
                    <span className="text-xs font-semibold text-[var(--sf-text-secondary)]">{reason.description}</span>
                  </div>
                  {idx < copilotData.reasoning.length - 1 && (
                    <div className="pl-4 border-l-2 border-dashed border-[var(--sf-border-default)] py-1.5 ml-4 flex items-center text-3xs text-[var(--sf-text-tertiary)] font-bold tracking-widest">
                      PLUS
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-4 pt-3 border-t border-[var(--sf-border-default)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--sf-text-primary)] uppercase tracking-wide">Conclusion</span>
                <Badge variant="danger" size="sm">{copilotData.incidentType}</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Recommended Actions */}
        <div className="flex flex-col gap-3 flex-shrink-0">
          <h3 className="text-3xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] px-1">Recommended Actions</h3>
          <Card padding="sm" className="border-primary-500/20 bg-primary-500/5">
            <ul className="flex flex-col gap-3">
              {copilotData.actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[var(--sf-text-secondary)] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                  {action}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Buttons - Fixed at bottom */}
      <div className="flex-shrink-0 p-6 pt-4 border-t border-[var(--sf-border-default)] bg-[var(--sf-surface-base)]">
        <div className="flex flex-col gap-3">
          <Button
            variant="danger"
            className="w-full justify-center shadow-lg shadow-danger-500/25 py-3 h-auto text-sm font-bold uppercase tracking-wide"
            onClick={onExecuteResponse}
          >
            <Zap className="w-4.5 h-4.5 mr-2" />
            Execute Response
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full justify-center text-xs font-bold bg-[var(--sf-surface-card)]"
              onClick={onNotifyTeam}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify Team
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center text-xs font-bold bg-[var(--sf-surface-card)]"
              onClick={onViewCctv}
            >
              <Eye className="w-4 h-4 mr-2" />
              View CCTV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
