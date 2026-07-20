import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Card, CardHeader, Badge, Skeleton, Alert } from '@/components/ui';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/lib/cn';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { capitalise } from '@/utils/format';
import type { SeverityLevel } from '@/constants';
import { useIncidentMapData } from '../hooks/useIncidentMapData';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './zoneCoordinates';

// Map tile layers for light and dark modes
const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

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

// Component to dynamically switch tile layers based on theme without remounting the map
function ThemeTileLayer() {
  const { resolvedTheme } = useThemeStore();
  const tileUrl = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;
  
  return (
    <TileLayer
      url={tileUrl}
      attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
    />
  );
}

// Function to create a custom HTML marker icon based on severity
function createSeverityIcon(severity: SeverityLevel) {
  const colorMap = {
    low: '#10b981', // safe-500
    medium: '#3b82f6', // primary-500
    high: '#f59e0b', // caution-500
    critical: '#ef4444' // danger-500
  };
  
  const color = colorMap[severity] || colorMap.low;
  
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="
      background-color: ${color}; 
      width: 14px; 
      height: 14px; 
      border-radius: 50%; 
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.5);
      position: relative;
      z-index: 1000;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

// Custom overlay icons
const workerIcon = L.divIcon({
  className: 'worker-marker',
  html: `<div style="background-color: #3b82f6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const permitIcon = L.divIcon({
  className: 'permit-marker',
  html: `<div style="background-color: #f59e0b; width: 10px; height: 10px; border-radius: 2px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const cameraIcon = L.divIcon({
  className: 'camera-marker',
  html: `<div style="background-color: #8b5cf6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// Mock overlays to demonstrate backend integration readiness
const DANGER_ZONES = [
  { id: 'dz1', center: [29.7565, -95.3620] as [number, number], radius: 60, color: '#ef4444' },
];

const EVACUATION_PATH = [
  [29.7565, -95.3620],
  [29.7555, -95.3630],
  [29.7540, -95.3645],
  [29.7530, -95.3650], // Safe Assembly Point
] as [number, number][];

const WORKERS = [
  { id: 'w1', pos: [29.7568, -95.3615] as [number, number], name: 'Aarav Sharma' },
  { id: 'w2', pos: [29.7562, -95.3622] as [number, number], name: 'Priya Patel' },
  { id: 'w3', pos: [29.7540, -95.3630] as [number, number], name: 'Marcus Reyes' },
];

const PERMITS = [
  { id: 'p1', pos: [29.7565, -95.3628] as [number, number], label: 'Hot Work PTW-2026-014' },
  { id: 'p2', pos: [29.7550, -95.3610] as [number, number], label: 'Confined Space CS-09' },
];

const CAMERAS = [
  { id: 'c1', pos: [29.7570, -95.3610] as [number, number], label: 'CCTV-07' },
  { id: 'c2', pos: [29.7555, -95.3630] as [number, number], label: 'CCTV-12' },
  { id: 'c3', pos: [29.7525, -95.3625] as [number, number], label: 'CCTV-03' },
];


export function SafetyHeatmapContainer() {
  const { incidents, loading, error } = useIncidentMapData();

  return (
    <Card padding="none" className="h-full flex flex-col border-[var(--sf-border-default)]">
      <CardHeader
        title="Incident Intelligence Map"
        description="Live incident cluster mapping across zones with active overlays."
        className="px-6 pt-5 pb-0 flex-shrink-0"
        action={
          <Badge variant="ghost" size="sm">
            Live Map
          </Badge>
        }
      />

      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
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
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Worker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Permit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Camera</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Evacuation Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-danger-500/20 border border-danger-500" aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">Danger Radius</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" title="Failed to load map data">
            {error}
          </Alert>
        )}

        {/* Interactive Map */}
        <div
          className={cn(
            'relative w-full flex-1 min-h-0 rounded-xl overflow-hidden',
            'border-2 border-[var(--sf-border-default)]',
            'bg-[var(--sf-surface-sunken)] z-0'
          )}
        >
          {loading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <MapContainer 
              center={DEFAULT_MAP_CENTER} 
              zoom={DEFAULT_MAP_ZOOM} 
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <ThemeTileLayer />

              {/* Overlays */}
              {DANGER_ZONES.map((zone) => (
                <Circle 
                  key={zone.id}
                  center={zone.center}
                  radius={zone.radius}
                  pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.15, weight: 2 }}
                />
              ))}

              <Polyline 
                positions={EVACUATION_PATH} 
                pathOptions={{ color: '#10b981', weight: 4, dashArray: '8, 8' }} 
              />

              {/* Workers */}
              {WORKERS.map((w) => (
                <Marker key={w.id} position={w.pos} icon={workerIcon}>
                  <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                    <span className="font-medium text-xs">{w.name}</span>
                  </Tooltip>
                </Marker>
              ))}

              {/* Permits */}
              {PERMITS.map((p) => (
                <Marker key={p.id} position={p.pos} icon={permitIcon}>
                  <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                    <span className="font-medium text-xs">{p.label}</span>
                  </Tooltip>
                </Marker>
              ))}

              {/* Cameras */}
              {CAMERAS.map((c) => (
                <Marker key={c.id} position={c.pos} icon={cameraIcon}>
                  <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                    <span className="font-medium text-xs">{c.label}</span>
                  </Tooltip>
                </Marker>
              ))}
              
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={40}
              >
                {/* Dynamic backend incidents */}
                {incidents.map((incident) => (
                  <Marker 
                    key={incident.id} 
                    position={[incident.lat, incident.lng]}
                    icon={createSeverityIcon(incident.severity)}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <span className="font-medium text-xs">{capitalise(incident.incident_type.replace('_', ' '))}</span>
                    </Tooltip>
                    <Popup className="incident-popup">
                      <div className="flex flex-col gap-1 min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[var(--sf-text-primary)]">{incident.zone}</span>
                          <Badge variant={SEVERITY_BADGE_VARIANT[incident.severity]} size="sm">{capitalise(incident.severity)}</Badge>
                        </div>
                        <span className="text-xs text-[var(--sf-text-tertiary)] font-mono">
                          {new Date(incident.occurred_at).toLocaleString()}
                        </span>
                        <p className="text-xs text-[var(--sf-text-secondary)] mt-1 break-words">
                          {incident.description}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>
      </div>
    </Card>
  );
}
