/**
 * useVideoObjectDetection
 *
 * Polls `GET /demo/video-detections` (see `backend/src/routes/demo.py`)
 * for the scenario video's *currently playing* frame — real dual-model
 * (PPE + fire/smoke) YOLO inference, run purely for the visual
 * bounding-box overlay on every poll (uncached, unlike the background
 * camera-detection pass in `camera_bridge.py` that feeds the real
 * `/cameras/*` panels on its own throttled cadence). This overlay has no
 * bearing on risk/alerts/compliance itself.
 */

import { useEffect, useRef, useState } from 'react';
import apiClient from '@/api/client';
import { ApiError } from '@/api/errors';

export interface VideoDetection {
  label: string;
  confidence: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

// CPU-only dual-model inference takes ~1.7s/frame (see
// `video_detection.py`) — polling faster than that (the previous 1500ms)
// meant a new request could fire before the last one's inference finished,
// so requests piled up and detection boxes visibly lagged behind the
// video. 4000ms keeps every poll comfortably clear of that, matching the
// ~3s cadence the background camera-detection pass also uses.
const POLL_INTERVAL_MS = 4000;

export function useVideoObjectDetection(
  videoFilename: string | null,
  getCurrentTime: () => number | null,
  active: boolean,
): VideoDetection[] {
  const [detections, setDetections] = useState<VideoDetection[]>([]);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!active || !videoFilename) {
      setDetections([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      if (inFlightRef.current) return;
      const currentTime = getCurrentTime();
      if (currentTime === null) return;

      inFlightRef.current = true;
      try {
        const { data } = await apiClient.get<{ detections: VideoDetection[] }>('/demo/video-detections', {
          params: { video: videoFilename, t: currentTime },
          signal: controller.signal,
        });
        if (!cancelled) setDetections(data.detections);
      } catch (err) {
        if (!ApiError.from(err).isCancelledError && !cancelled) setDetections([]);
      } finally {
        inFlightRef.current = false;
      }
    };

    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [active, videoFilename, getCurrentTime]);

  return detections;
}
