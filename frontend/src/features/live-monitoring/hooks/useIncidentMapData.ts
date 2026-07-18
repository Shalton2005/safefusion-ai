import { useState, useRef, useCallback } from 'react';
import { incidentsService } from '@/services/incidents.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Incident } from '@/types';
import { ZONE_COORDINATES } from '../components/zoneCoordinates';

export interface MapIncident extends Incident {
  lat: number;
  lng: number;
}

// Pseudo-random deterministic generator based on string to jitter coordinates
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export function useIncidentMapData() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchIncidents = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await incidentsService.getIncidents({ limit: 500 }, { signal });
      
      const mapped: MapIncident[] = data.map(inc => {
        const baseCoords = ZONE_COORDINATES[inc.zone] || [29.7535, -95.3625]; // Default to center if unknown zone
        
        // Jitter by ~10 meters maximum so markers in same zone cluster instead of stacking perfectly
        const jitterLat = (hashString(inc.id + 'lat') % 1000) / 1000000;
        const jitterLng = (hashString(inc.id + 'lng') % 1000) / 1000000;

        return {
          ...inc,
          lat: baseCoords[0] + jitterLat,
          lng: baseCoords[1] + jitterLng
        };
      });

      setIncidents(mapped);
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
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchIncidents, DASHBOARD_REFRESH_INTERVAL);

  return { incidents, loading, error, lastUpdated, refresh };
}
