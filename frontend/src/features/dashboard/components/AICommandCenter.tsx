import { ShieldAlert, Activity, Siren, BrainCircuit, ShieldCheck, AlertTriangle, Info, Clock, Radio, HardHat, FileCheck2 } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRelativeTime, capitalise, formatLabel } from '@/utils/format';
import type { CompoundRiskAssessment, RiskExplanation, Recommendation, AlertRecord, EmergencyActionItem } from '@/types';
import type { AISupervisorSnapshot } from '@/features/ai-supervisor/types';
import { SEVERITY_HEADER_THEME, SEVERITY_TEXT_COLOR, SEVERITY_BG_COLOR } from '@/utils/severity';
import { AISituationReport } from './AISituationReport';

export interface AICommandCenterProps {
  assessment?: CompoundRiskAssessment | null;
  explanation?: RiskExplanation | null;
  recommendations?: Recommendation[];
  alerts?: AlertRecord[];
  emergencyActions?: EmergencyActionItem[];
  supervisorSnapshot?: AISupervisorSnapshot | null;
  lastUpdated?: Date | null;
  onDispatchEmergency?: () => void;
  onViewReasoning?: () => void;
  onOpenLiveMonitoring?: () => void;
}



export function AICommandCenter({
  assessment,
  explanation,
  recommendations = [],
  alerts = [],
  emergencyActions = [],
  supervisorSnapshot,
  lastUpdated,
  onDispatchEmergency,
  onViewReasoning,
  onOpenLiveMonitoring,
}: AICommandCenterProps) {
  const riskScore = assessment?.risk_score ?? 0;
  const riskLevel = assessment?.risk_level ?? 'low';
  
  const isCritical = riskLevel === 'critical';
  const isEmergency = riskLevel === 'high';
  const isWarning = riskLevel === 'medium';

  const isFlashingRed = isCritical || isEmergency;
  /** `null` while the AI Supervisor snapshot hasn't reported yet — never a fabricated placeholder value. */
  const confidence = supervisorSnapshot?.overallConfidence ?? null;
  
  let verdictTitle = 'Systems Nominal';
  if (isCritical) {
    verdictTitle = 'Critical Incident Detected';
  } else if (isEmergency) {
    verdictTitle = 'Emergency Actions Required';
  } else if (isWarning) {
    verdictTitle = 'Elevated Risk Level';
  }

  // Derive findings from triggered rules or alerts
  const findings = explanation?.triggered_rules?.slice(0, 3).map(r => ({ label: r.name, detail: r.detail, type: 'rule' as string })) || [];
  if (findings.length < 3 && alerts.length > 0) {
    alerts.slice(0, 3 - findings.length).forEach(a => {
      findings.push({ label: a.alert_type, detail: a.message, type: 'alert' as string });
    });
  }

  return (
    <Card className="flex flex-col overflow-hidden bg-[var(--sf-surface-card)] border-[var(--sf-border-default)] shadow-2xl">
      {/* Top Banner indicating AI active state */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 bg-gradient-to-r border-b transition-colors duration-500",
        SEVERITY_HEADER_THEME[riskLevel].bgGradient,
        SEVERITY_HEADER_THEME[riskLevel].borderColor
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className={cn("w-4 h-4 animate-pulse transition-colors duration-500", SEVERITY_HEADER_THEME[riskLevel].iconColor)} />
            <span className={cn("text-xs font-mono font-semibold uppercase tracking-widest transition-colors duration-500", SEVERITY_HEADER_THEME[riskLevel].textColor)}>
              SafeFusion Sentinel AI Active
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[var(--sf-text-tertiary)] border-l border-[var(--sf-border-default)] pl-4">
            <span className="text-xs uppercase tracking-widest font-semibold">Monitoring:</span>
            <div className="flex items-center gap-1" title="Active Sensors"><Radio className="w-3.5 h-3.5" /></div>
            <div className="flex items-center gap-1" title="Active Workers"><HardHat className="w-3.5 h-3.5" /></div>
            <div className="flex items-center gap-1" title="Active Permits"><FileCheck2 className="w-3.5 h-3.5" /></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)]" />
          <span className="text-xs font-mono text-[var(--sf-text-tertiary)]">
            {lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : 'Syncing...'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: AI Verdict */}
        <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-[var(--sf-border-default)] flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            {isFlashingRed ? <ShieldAlert className="w-5 h-5 text-danger-500" /> : isWarning ? <AlertTriangle className="w-5 h-5 text-caution-500" /> : <ShieldCheck className="w-5 h-5 text-safe-500" />}
            <h2 className="text-lg font-bold text-[var(--sf-text-primary)] uppercase tracking-wide">AI Verdict</h2>
          </div>
          <h3 className={cn("text-xl font-semibold mb-2 transition-colors duration-500", SEVERITY_TEXT_COLOR[riskLevel])}>
            {verdictTitle}
          </h3>
          <AISituationReport 
            assessment={assessment}
            explanation={explanation}
            alerts={alerts}
            recommendations={recommendations}
            emergencyActions={emergencyActions}
            supervisorSnapshot={supervisorSnapshot}
            className="mb-4"
          />
          <div className="flex flex-wrap gap-2 mt-auto">
            {findings.map((finding, idx) => (
              <Badge key={idx} variant="outline" className={cn("text-2xs font-mono py-1", isFlashingRed ? "border-danger-500/30 text-danger-300 bg-danger-500/10" : isWarning ? "border-caution-500/30 text-caution-300 bg-caution-500/10" : "border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]")}>
                {formatLabel(finding.label)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Middle: Large Gauge */}
        <div className="lg:col-span-4 p-6 border-b lg:border-b-0 lg:border-r border-[var(--sf-border-default)] flex flex-col items-center justify-center relative bg-gradient-to-b from-transparent to-[var(--sf-surface-card)]">
          <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">Overall Risk</span>
          
          <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-4 border-dashed border-[var(--sf-border-default)]">
            <div className={cn("absolute inset-2 rounded-full border-2 transition-colors duration-500", SEVERITY_BG_COLOR[riskLevel])} />
            <div className="flex flex-col items-center z-10">
              <span className={cn("text-5xl font-extrabold font-mono tracking-tighter leading-none transition-colors duration-500", SEVERITY_TEXT_COLOR[riskLevel])}>
                {riskScore}
              </span>
              <span className="text-xs text-[var(--sf-text-tertiary)] mt-1 font-mono">/ 100</span>
            </div>
            {/* Pulsing ring for critical/emergency */}
            {isFlashingRed && (
              <>
                <div className={cn("absolute inset-0 rounded-full border-2 opacity-30", isCritical ? "border-danger-500 animate-ping duration-1000" : "border-danger-400 animate-pulse")} />
                <div className={cn("absolute inset-0 rounded-full border border-danger-500 opacity-10 animate-ping delay-150 duration-1000")} />
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="flex flex-col items-center">
              <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-1">Level</span>
              <Badge variant={isFlashingRed ? 'danger' : isWarning ? 'warning' : 'success'} size="sm" dot pulsing={isCritical}>{capitalise(riskLevel)}</Badge>
            </div>
            <div className="w-px h-6 bg-[var(--sf-border-default)]" />
            <div className="flex flex-col items-center">
              <span className="text-3xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-1">Confidence</span>
              <span className="text-sm font-mono text-[var(--sf-text-primary)]">
                {confidence === null ? 'No data' : `${confidence}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="lg:col-span-3 p-6 flex flex-col gap-3 justify-center bg-[var(--sf-surface-card)]">
          <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-2">Command & Control</span>
          
          <Button 
            variant={isFlashingRed ? 'danger' : 'outline'}
            className="w-full justify-center py-6"
            onClick={onDispatchEmergency}
          >
            <Siren className="w-4 h-4 mr-2" />
            Dispatch Emergency
          </Button>
          
          <Button 
            variant="secondary"
            className="w-full justify-center py-6"
            onClick={onViewReasoning}
          >
            <Info className="w-4 h-4 mr-2" />
            View AI Reasoning
          </Button>
          
          <Button 
            variant="secondary"
            className="w-full justify-center py-6"
            onClick={onOpenLiveMonitoring}
          >
            <Activity className="w-4 h-4 mr-2" />
            Live Monitoring
          </Button>
        </div>
      </div>
    </Card>
  );
}
