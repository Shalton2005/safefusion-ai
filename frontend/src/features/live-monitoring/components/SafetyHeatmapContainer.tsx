import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Card, CardHeader, Badge, Skeleton, Alert } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/lib/cn';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
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
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

export function SafetyHeatmapContainer() {
  const { incidents, loading, error } = useIncidentMapData();

  return (
    <Card padding="none">
      <CardHeader
        title="Safety Heatmap"
        description="Live incident cluster mapping across zones."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-3">
            <Badge variant="ghost" size="sm">
              Live Map
            </Badge>
            <CardHeaderLink to={ROUTES.LIVE_MONITORING} label="View Live Monitoring" />
          </div>
        }
      />

      <div className="p-4 flex flex-col gap-4">
        {/* Risk legend */}
        <div className="flex flex-wrap items-center gap-4 px-2">
          {RISK_LEGEND.map((entry) => (
            <div key={entry.level} className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', riskDotClass[entry.level])} aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">{entry.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="danger" title="Failed to load map data">
            {error}
          </Alert>
        )}

        {/* Interactive Map */}
        <div
          className={cn(
            'relative w-full aspect-video sm:aspect-[16/7] rounded-xl overflow-hidden',
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
              
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={40}
              >
                {incidents.map((incident) => (
                  <Marker 
                    key={incident.id} 
                    position={[incident.lat, incident.lng]}
                    icon={createSeverityIcon(incident.severity)}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <span className="font-medium text-xs">{incident.incident_type}</span>
                    </Tooltip>
                    <Popup className="incident-popup">
                      <div className="flex flex-col gap-1 min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[var(--sf-text-primary)]">{incident.zone}</span>
                          <Badge variant={SEVERITY_BADGE_VARIANT[incident.severity]} size="sm">{incident.severity}</Badge>
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
