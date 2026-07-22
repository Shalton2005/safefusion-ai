import { useState } from 'react';
import { Card, CardHeader, Badge, Skeleton, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { capitalise } from '@/utils/format';
import type { SeverityLevel } from '@/constants';
import type { MapOverlaysData } from '@/types';
import { AlertTriangle, HardHat, FileText, Camera, Flame, Info, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui';

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

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layer visibility state
  const [layers, setLayers] = useState({
    incidents: true,
    workers: true,
    permits: true,
    cameras: true,
    sensors: true,
    evacuation: true,
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Zoom sensitivity
    const delta = e.deltaY * -0.002;
    const newScale = Math.min(Math.max(0.25, scale + delta), 4);
    setScale(newScale);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.25));
  const resetZoom = () => { setScale(1); setPan({ x: 0, y: 0 }); };

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
        {/* The legend will be moved inside the map container */}

        {!overlays ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <>
              <div className="relative w-full h-full overflow-hidden border border-[var(--sf-border-default)] rounded-xl bg-slate-950">
                {/* Floating Legends */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[70%]">
                  <button onClick={() => toggleLayer('incidents')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.incidents ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <span className="w-2 h-2 rounded-full mr-2 bg-danger-500 shadow-[0_0_8px_var(--sf-danger)]" /> Incidents
                  </button>
                  <button onClick={() => toggleLayer('workers')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.workers ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center mr-2"><div className="w-1 h-1 bg-blue-500 rounded-full" /></div> Workers
                  </button>
                  <button onClick={() => toggleLayer('permits')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.permits ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <div className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500 mr-2" /> Permits
                  </button>
                  <button onClick={() => toggleLayer('cameras')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.cameras ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <div className="w-3 h-3 rounded-full bg-purple-500/20 border border-purple-500 mr-2" /> Cameras
                  </button>
                  <button onClick={() => toggleLayer('sensors')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.sensors ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500 mr-2" /> Gas Sensors
                  </button>
                  <button onClick={() => toggleLayer('evacuation')} className={cn("flex items-center h-8 rounded-full backdrop-blur-md border border-slate-700/50 text-xs px-3 shadow-lg transition-all", layers.evacuation ? "bg-slate-800/90 text-white" : "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70")}>
                    <span className="w-3 h-1 rounded-full bg-safe-500 mr-2" /> Evacuation Path
                  </button>
                </div>

                {/* Map Controls */}
                <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50 p-1.5 overflow-hidden">
                  <Button variant="ghost" size="sm" className="px-2 hover:bg-slate-800 text-slate-300" onClick={zoomIn} title="Zoom In"><ZoomIn className="w-4.5 h-4.5" /></Button>
                  <div className="w-full h-px bg-slate-700/50" />
                  <Button variant="ghost" size="sm" className="px-2 hover:bg-slate-800 text-slate-300" onClick={zoomOut} title="Zoom Out"><ZoomOut className="w-4.5 h-4.5" /></Button>
                  <div className="w-full h-px bg-slate-700/50" />
                  <Button variant="ghost" size="sm" className="px-2 hover:bg-slate-800 text-slate-300" onClick={resetZoom} title="Reset"><Maximize className="w-4.5 h-4.5" /></Button>
                </div>
              <svg 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1"/>
                  </pattern>
                  <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--sf-primary-500)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--sf-primary-900)" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#radarGlow)" />
                <rect width="100%" height="100%" fill="url(#grid)" />
                <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>

                {/* Render Facility Zones */}
                {overlays?.facility_zones?.map(zone => (
                  <g key={zone.id}>
                    <rect 
                      x={zone.x} 
                      y={zone.y} 
                      width={zone.width} 
                      height={zone.height} 
                      fill={zone.color} 
                      fillOpacity={zone.opacity ? zone.opacity * 0.5 : 0.04}
                      stroke={zone.color} 
                      strokeWidth="1.5" 
                      strokeDasharray="6 4"
                      rx="12"
                    />
                    <text 
                      x={zone.x + 16} 
                      y={zone.y + 28} 
                      fill="var(--sf-text-secondary)" 
                      className="text-sm font-bold uppercase tracking-widest font-mono drop-shadow-sm"
                    >
                      {zone.name}
                    </text>
                  </g>
                ))}

                {/* Evacuation Path */}
                {layers.evacuation && overlays?.evacuation_path && (
                  <polyline 
                    points={overlays.evacuation_path.map(p => `${p[0]},${p[1]}`).join(' ')}
                    fill="none" 
                    stroke="var(--sf-safe)" 
                    strokeWidth="4" 
                    strokeDasharray="8 8" 
                    className="animate-[dash_2s_linear_infinite]"
                  />
                )}

                {/* Danger Zones */}
                {layers.incidents && overlays?.danger_zones?.map(zone => {
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
                {layers.incidents && overlays?.restricted_zones?.map(zone => {
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
                {layers.permits && overlays?.permits?.map(p => {
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
                      <rect width="24" height="24" rx="4" fill="var(--sf-caution)" fillOpacity="0.2" stroke="var(--sf-caution)" strokeWidth="2" />
                      <foreignObject width="24" height="24">
                        <div className="w-full h-full flex items-center justify-center text-[var(--sf-caution)]">
                          <FileText size={14} />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Cameras */}
                {layers.cameras && overlays?.cameras?.map(c => {
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
                      <rect width="24" height="24" rx="2" fill="var(--sf-safe)" fillOpacity="0.2" stroke="var(--sf-safe)" strokeWidth="2" />
                      <foreignObject width="24" height="24">
                        <div className="w-full h-full flex items-center justify-center text-[var(--sf-safe)]">
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
                      <circle cx="14" cy="14" r="14" fill="var(--sf-brand)" fillOpacity="0.2" className="animate-ping" />
                      <circle cx="14" cy="14" r="12" fill="var(--sf-brand)" fillOpacity="0.3" stroke="var(--sf-brand)" strokeWidth="2" />
                      <foreignObject width="28" height="28">
                        <div className="w-full h-full flex items-center justify-center text-[var(--sf-brand)]">
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
                    low: 'var(--sf-safe)',
                    medium: 'var(--sf-brand)',
                    high: 'var(--sf-caution)',
                    critical: 'var(--sf-danger)'
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
                </g>
              </svg>
              </div>

              {/* Absolute positioned HTML Tooltip floating over the SVG */}
              {activeTooltip && (
                <div 
                  className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${((activeTooltip.x * scale + pan.x) / SVG_WIDTH) * 100}%`,
                    top: `calc(${((activeTooltip.y * scale + pan.y) / SVG_HEIGHT) * 100}% - 4px)`
                  }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 rounded-xl p-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap min-w-[220px]">
                    {activeTooltip.content}
                    {/* Tooltip arrow */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80" />
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
