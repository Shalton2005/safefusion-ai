import { ShieldAlert, MapPin, Activity, AlertTriangle, AlertOctagon, Check } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface AIIncidentSummaryProps {
  title?: string;
  verdict?: string;
  zone?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  factors?: string[];
  escalation?: { threat: string; timeframe: string };
  recommendations?: string[];
  onExecuteResponse?: () => void;
  onViewIncident?: () => void;
  className?: string;
}

const severityColor = {
  low: 'text-safe-500',
  medium: 'text-primary-400',
  high: 'text-caution-500',
  critical: 'text-danger-500',
};

export function AIIncidentSummary({
  title = 'AI Incident Summary',
  verdict = 'Compound Risk Detected',
  zone = 'Tank Farm',
  severity = 'critical',
  confidence = 98.4,
  factors = ['Gas Leak', 'Active Hot Work', 'PPE Non Compliance', 'Wind Direction'],
  escalation = { threat: 'Flash Fire', timeframe: 'within 4-7 minutes' },
  recommendations = ['Evacuate Zone', 'Suspend PTW', 'Notify Safety Officer', 'Shutdown Fuel Valve'],
  onExecuteResponse,
  onViewIncident,
  className
}: AIIncidentSummaryProps) {
  const isCritical = severity === 'critical';

  return (
    <Card className={cn("overflow-hidden border-[var(--sf-border-default)] shadow-2xl", className)}>
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-danger-900/30 to-transparent border-b border-[var(--sf-border-default)]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-danger-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-danger-300 uppercase tracking-widest">{title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left: Core Info */}
        <div className="lg:col-span-4 p-6 border-b lg:border-b-0 lg:border-r border-[var(--sf-border-default)] flex flex-col justify-center bg-[var(--sf-surface-card)]">
          <h3 className={cn("text-xl font-bold mb-6", severityColor[severity])}>
            {verdict}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Zone</span>
              <span className="text-sm font-semibold text-[var(--sf-text-primary)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--sf-text-secondary)]" />
                {zone}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Severity</span>
              <Badge variant={isCritical ? 'danger' : 'warning'} size="sm" dot pulsing={isCritical}>{severity.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[var(--sf-text-tertiary)]">Confidence</span>
              <span className="text-sm font-mono text-[var(--sf-text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-400" />
                {confidence.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Factors & Escalation */}
        <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-[var(--sf-border-default)] bg-gradient-to-b from-transparent to-[var(--sf-surface-card)] flex flex-col justify-center">
          <div className="mb-6">
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-3 block">Detected Factors</span>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {factors.map((factor, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-[var(--sf-text-secondary)]">
                  <Check className="w-4 h-4 text-danger-400 flex-shrink-0" />
                  <span className="font-medium">{factor}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-3 block">Potential Escalation</span>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-danger-500/30 bg-danger-500/10">
              <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-danger-300">{escalation.threat}</p>
                <p className="text-xs text-danger-400/80 mt-1">{escalation.timeframe}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="lg:col-span-3 p-6 flex flex-col gap-4 justify-between bg-[var(--sf-surface-card)]">
          <div>
            <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-3 block">Recommended Actions</span>
            <ul className="space-y-2.5">
              {recommendations.map((action, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-[var(--sf-text-secondary)] font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col gap-3 mt-auto">
            <Button
              variant="danger"
              className="w-full justify-center py-5"
              onClick={onExecuteResponse}
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Execute Response
            </Button>
            
            <Button 
              variant="secondary" 
              className="w-full justify-center py-5"
              onClick={onViewIncident}
            >
              <AlertOctagon className="w-4 h-4 mr-2" />
              View Incident
            </Button>
          </div>
        </div>

      </div>
    </Card>
  );
}
