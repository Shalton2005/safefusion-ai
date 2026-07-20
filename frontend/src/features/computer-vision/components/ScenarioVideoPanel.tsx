/**
 * ScenarioVideoPanel
 *
 * Illustrative CCTV clip for the Demo Scenario Playback Engine
 * (`backend/src/services/scenario_playback`), shown alongside the real
 * `LiveCameraGrid`. The dashboard's risk/alerts/compliance data has no
 * bearing on this video (and vice versa) — the engine drives real
 * sensor/worker/permit/incident rows independently on a 1-second tick,
 * and every other panel on this page reflects that purely by polling its
 * own real endpoint.
 *
 * The bounding boxes drawn over the video ARE real object detections
 * (`useVideoObjectDetection`, a stock pretrained COCO YOLO model run
 * per-frame server-side) — genuine computer vision, but visual only: a
 * COCO checkpoint has no PPE classes, so it cannot feed the real PPE
 * Compliance Engine and intentionally doesn't.
 *
 * `<video>` cannot send an Authorization header, so `video_url` is served
 * from the public, unauthenticated `/media/cctv` static mount (see
 * `server.py`) — never through `apiClient`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, Video } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useDemoPlayback, useVideoObjectDetection } from '../hooks';
import { VideoObjectOverlay } from './VideoObjectOverlay';
import env from '@/config/env';

/** `env.apiBaseUrl` is `.../api/v1`; the media mount lives one level up, at the API host root. */
function toAbsoluteMediaUrl(path: string): string {
  const apiRoot = new URL(env.apiBaseUrl);
  return `${apiRoot.origin}${path}`;
}

const DEFAULT_SCENARIO = 'factory_incident';

export function ScenarioVideoPanel() {
  const { status, error, starting, start, stop } = useDemoPlayback();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const isRunning = status?.running ?? false;
  const videoUrl = status?.video_url ? toAbsoluteMediaUrl(status.video_url) : null;

  // Load the clip once per scenario run (not on every 1s status poll) —
  // swapping `<video src>` on every re-render would restart playback.
  useEffect(() => {
    if (videoUrl && videoUrl !== videoSrc) setVideoSrc(videoUrl);
    if (!isRunning) setVideoSrc(null);
  }, [videoUrl, isRunning, videoSrc]);

  // Correct only large drift (e.g. the tab was backgrounded and the
  // browser throttled/paused the video), not every 1s poll tick — forcing
  // `currentTime` every second fights the browser's own buffering on a
  // ~95MB file and previously caused visible stutter/looping near
  // whatever had actually downloaded so far. A few seconds of drift from
  // normal network/decode variance is left alone.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !status || !isRunning) return;
    const drift = Math.abs(video.currentTime - status.elapsed_seconds);
    if (drift > 10) video.currentTime = status.elapsed_seconds;
  }, [status, isRunning]);

  const progressPct = status && status.total_seconds > 0
    ? Math.min(100, (status.elapsed_seconds / status.total_seconds) * 100)
    : 0;

  const getCurrentTime = useCallback(() => videoRef.current?.currentTime ?? null, []);
  const videoFilename = status?.video_url ? status.video_url.split('/').pop() ?? null : null;
  const detections = useVideoObjectDetection(videoFilename, getCurrentTime, isRunning && Boolean(videoSrc));

  return (
    <Card padding="none">
      <CardHeader
        title="Scenario Playback"
        description="Replays a scripted incident timeline into the live system, driving real risk/emergency/compliance/alert data once per second."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button size="sm" variant="secondary" onClick={() => void stop()}>
                <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => void start(DEFAULT_SCENARIO)} disabled={starting}>
                <Play className="w-3.5 h-3.5 mr-1.5" /> {starting ? 'Starting…' : 'Play Scenario'}
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 flex flex-col gap-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--sf-surface-sunken)] flex items-center justify-center">
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--sf-text-tertiary)]">
              <Video className="w-8 h-8" aria-hidden="true" />
              <span className="text-sm">No scenario playing</span>
            </div>
          )}

          {isRunning && (
            <Badge variant="danger" size="sm" dot pulsing className="absolute top-3 left-3 backdrop-blur-sm">
              Live Playback
            </Badge>
          )}

          {videoSrc && <VideoObjectOverlay detections={detections} />}
        </div>

        {isRunning && status && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--sf-text-secondary)]">
              <span>{status.current_row_label ?? '—'}</span>
              <span>{Math.round(status.elapsed_seconds)}s / {Math.round(status.total_seconds)}s</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--sf-surface-sunken)] overflow-hidden">
              <div
                className="h-full bg-[var(--sf-text-accent)] transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>}
      </div>
    </Card>
  );
}
