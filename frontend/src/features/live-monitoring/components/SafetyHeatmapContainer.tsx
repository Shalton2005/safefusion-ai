import { useState } from 'react';
import { Card, CardHeader, Badge, Skeleton, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { capitalise } from '@/utils/format';
import type { SeverityLevel } from '@/constants';
import type { MapOverlaysData } from '@/types';
import { AlertTriangle, HardHat, FileText, Camera, Flame, Info } from 'lucide-react';

export interface SafetyHeatmapContainerProps {
  overlays?: MapOverlaysData;
}

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 800;

const RISK_LEGEND: { level: SeverityLevel; label: string }[] = [
  { level: 'low',      label: 'Low' },
  { level: 'medium',   label: 'Medium' },
  { level: 'high',     label: 'High' },
  { level: 'critical', label: 'Critical' },
];

const riskDotClass: Record<SeverityLevel, string> = {
  low:      'bg-safe-500',
  medium:   'bg-primary-500',
  high:     'bg-caution-500',
  critical: 'bg-danger-500',
};

export function SafetyHeatmapContainer({ overlays }: SafetyHeatmapContainerProps) {
  const [activeTooltip, setActiveTooltip] = useState<{ x: number, y: number, content: React.ReactNode } | null>(null);

  // Group overlays that share positions or nearby (simplified logic, mainly rendering them directly)
  
  return (
    <Card padding="none" className="h-full flex flex-col border-[var(--sf-border-default)] relative">
      <CardHeader
        title="Incident Intelligence Map"
        description="Live industrial facility visualization with active telemetry."
        className="px-6 pt-5 pb-0 flex-shrink-0"
        action={<Badge variant="ghost" size="sm">Live SVG Map</Badge>}
      />

      <div className="p-4 flex flex-col gap-4 flex-1 min-h-[400px]">
        {/* Legends */}
        <div className="flex flex-col gap-2 px-2">
          <div className="flex flex-wrap items-center gap-4">
            {RISK_LEGEND.map((entry) => (
              <div key={entry.level} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', riskDotClass[entry.level])} aria-hidden="true" />
                <span className="text-xs text-[var(--sf-text-tertiary)]">{entry.label} Incident</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /></div>
              <span className="text-xs text-[var(--sf-text-tertiary)]">Worker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Permit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Camera</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Gas Sensor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Evacuation Path</span>
            </div>
          </div>
        </div>

        {!overlays ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <>
              <svg 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
                className="w-full h-full object-contain"
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--sf-border-default)" strokeWidth="0.5" strokeOpacity="0.5"/>
                  </pattern>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Render Facility Zones */}
                {overlays?.facility_zones?.map(zone => (
                  <g key={zone.id}>
                    <rect 
                      x={zone.x} 
                      y={zone.y} 
                      width={zone.width} 
                      height={zone.height} 
                      fill={zone.color} 
                      fillOpacity={zone.opacity || 1}
                      stroke="var(--sf-border-strong)" 
                      strokeWidth="2" 
                      rx="8"
                    />
                    <text 
                      x={zone.x + 16} 
                      y={zone.y + 24} 
                      fill="var(--sf-text-tertiary)" 
                      className="text-xs font-semibold uppercase tracking-widest font-mono"
                    >
                      {zone.name}
                    </text>
                  </g>
                ))}

                {/* Evacuation Path */}
                {overlays?.evacuation_path && (
                  <polyline 
                    points={overlays.evacuation_path.map(p => `${p[0]},${p[1]}`).join(' ')}
                    fill="none" 
                    stroke="var(--color-safe-500)" 
                    strokeWidth="4" 
                    strokeDasharray="8 8" 
                    className="animate-[dash_2s_linear_infinite]"
                  />
                )}

                {/* Danger Zones */}
                {overlays?.danger_zones?.map(zone => {
                  const x = zone.center[0];
                  const y = zone.center[1];
                  const r = zone.radius;
                  return (
                    <g 
                      key={zone.id} 
                      onMouseEnter={() => setActiveTooltip({
                        x, y: y - r - 10,
                        content: (
                          <div className="flex flex-col gap-1.5 text-xs">
                            <span className="font-bold text-sm border-b border-slate-700 pb-1 mb-1">{zone.zone} (Danger Zone)</span>
                            <span className="flex justify-between gap-4">Incidents: <strong className="text-danger-500">{zone.incidentCount}</strong></span>
                            <span className="flex justify-between gap-4">Highest Risk: <strong className="text-danger-500">{zone.highestRisk}</strong></span>
                            <span className="flex justify-between gap-4">AI Confidence: <strong>{zone.confidence}</strong></span>
                          </div>
                        )
                      })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <circle cx={x} cy={y} r={r} fill={zone.color} fillOpacity="0.2" className="animate-pulse" />
                      <circle cx={x} cy={y} r={r} fill="none" stroke={zone.color} strokeWidth="2" strokeDasharray="6 4" />
                    </g>
                  );
                })}

                {/* Restricted Zones */}
                {overlays?.restricted_zones?.map(zone => {
                  const x = zone.center[0];
                  const y = zone.center[1];
                  const r = zone.radius;
                  return (
                    <g 
                      key={zone.id} 
                      onMouseEnter={() => setActiveTooltip({
                        x, y: y - r - 10,
                        content: (
                          <div className="flex flex-col gap-1.5 text-xs">
                            <span className="font-bold text-sm border-b border-slate-700 pb-1 mb-1">{zone.zone} (Restricted)</span>
                            <span className="flex justify-between gap-4">Incidents: <strong className="text-caution-500">{zone.incidentCount}</strong></span>
                            <span className="flex justify-between gap-4">Highest Risk: <strong className="text-caution-500">{zone.highestRisk}</strong></span>
                            <span className="flex justify-between gap-4">AI Confidence: <strong>{zone.confidence}</strong></span>
                          </div>
                        )
                      })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <circle cx={x} cy={y} r={r} fill={zone.color} fillOpacity="0.15" />
                      <circle cx={x} cy={y} r={r} fill="none" stroke={zone.color} strokeWidth="2" strokeDasharray="10 5" />
                    </g>
                  );
                })}

                {/* Permits */}
                {overlays?.permits?.map(p => {
                  const x = p.pos[0];
                  const y = p.pos[1];
                  return (
                    <g 
                      key={p.id}
                      transform={`translate(${x - 12}, ${y - 12})`}
                      onMouseEnter={() => setActiveTooltip({ x, y: y - 16, content: <div className="font-semibold">{p.label} (Permit)</div> })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <rect width="24" height="24" rx="4" fill="var(--color-caution-500)" fillOpacity="0.2" stroke="var(--color-caution-500)" strokeWidth="2" />
                      <foreignObject width="24" height="24">
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-caution-500)]">
                          <FileText size={14} />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Cameras */}
                {overlays?.cameras?.map(c => {
                  const x = c.pos[0];
                  const y = c.pos[1];
                  return (
                    <g 
                      key={c.id}
                      transform={`translate(${x - 12}, ${y - 12})`}
                      onMouseEnter={() => setActiveTooltip({ x, y: y - 16, content: <div className="font-semibold">{c.label} (Active)</div> })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <circle cx="12" cy="12" r="12" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="2" />
                      <foreignObject width="24" height="24">
                        <div className="w-full h-full flex items-center justify-center text-[#8b5cf6]">
                          <Camera size={12} />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Gas Sensors */}
                {overlays?.gas_sensors?.map(g => {
                  const x = g.pos[0];
                  const y = g.pos[1];
                  return (
                    <g 
                      key={g.id}
                      transform={`translate(${x - 12}, ${y - 12})`}
                      onMouseEnter={() => setActiveTooltip({ x, y: y - 16, content: <div className="font-semibold">{g.label} (Normal)</div> })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <rect width="24" height="24" rx="2" fill="var(--color-safe-500)" fillOpacity="0.2" stroke="var(--color-safe-500)" strokeWidth="2" />
                      <foreignObject width="24" height="24">
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-safe-500)]">
                          <Flame size={12} />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Workers (Animated pulses) */}
                {overlays?.workers?.map(w => {
                  const x = w.pos[0];
                  const y = w.pos[1];
                  return (
                    <g 
                      key={w.id}
                      transform={`translate(${x - 14}, ${y - 14})`}
                      onMouseEnter={() => setActiveTooltip({ x, y: y - 18, content: <div className="font-semibold">{w.name} (Worker)</div> })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer"
                    >
                      <circle cx="14" cy="14" r="14" fill="var(--color-primary-500)" fillOpacity="0.2" className="animate-ping" />
                      <circle cx="14" cy="14" r="12" fill="var(--color-primary-500)" fillOpacity="0.3" stroke="var(--color-primary-500)" strokeWidth="2" />
                      <foreignObject width="28" height="28">
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-primary-500)]">
                          <HardHat size={14} />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Incidents (Markers) */}
                {overlays?.incidents?.map(inc => {
                  const x = inc.x;
                  const y = inc.y;
                  const colorMap: Record<string, string> = {
                    low: 'var(--color-safe-500)',
                    medium: 'var(--color-primary-500)',
                    high: 'var(--color-caution-500)',
                    critical: 'var(--color-danger-500)'
                  };
                  const color = colorMap[inc.severity] || colorMap['low'];
                  return (
                    <g 
                      key={inc.id}
                      transform={`translate(${x - 12}, ${y - 24})`}
                      onMouseEnter={() => setActiveTooltip({
                        x, y: y - 28,
                        content: (
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{inc.zone}</span>
                              <Badge variant={SEVERITY_BADGE_VARIANT[inc.severity as SeverityLevel]} size="sm">{capitalise(inc.severity)}</Badge>
                            </div>
                            <span className="text-xs text-slate-400 font-mono mb-1">{new Date(inc.occurred_at).toLocaleString()}</span>
                            <p className="text-xs leading-relaxed text-slate-200">{inc.description}</p>
                          </div>
                        )
                      })}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="cursor-pointer drop-shadow-md hover:drop-shadow-xl transition-all"
                    >
                      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 4.5 12 4.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" fill={color} />
                    </g>
                  );
                })}
              </svg>

              {/* Absolute positioned HTML Tooltip floating over the SVG */}
              {activeTooltip && (
                <div 
                  className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(activeTooltip.x / SVG_WIDTH) * 100}%`,
                    top: `calc(${(activeTooltip.y / SVG_HEIGHT) * 100}% - 4px)`
                  }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 text-slate-100 rounded-lg p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap">
                    {activeTooltip.content}
                    {/* Tooltip arrow */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -16; }
        }
      `}</style>
    </Card>
  );
}
