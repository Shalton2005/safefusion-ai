/**
 * useVideoObjectDetection
 *
 * Polls `GET /demo/video-detections` (see `backend/src/routes/demo.py`)
 * for the scenario video's *currently playing* frame — a stock, pretrained
 * COCO YOLO model, run purely for the visual bounding-box overlay. This
 * has no bearing on risk/alerts/compliance: those are driven entirely by
 * the scripted scenario timeline, independent of this hook.
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

const POLL_INTERVAL_MS = 1500;

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
