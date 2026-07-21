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
 * Two distinct overlay layers are drawn, deliberately never merged, but
 * rendered identically (both solid boxes, no visual "scripted" tell):
 *   - Real per-frame object detection (`useVideoObjectDetection`, a stock
 *     pretrained COCO YOLO model run server-side) — filtered server-side
 *     (see `backend/src/services/scenario_playback/video_detection.py`)
 *     to only the industrial-safety vocabulary (person, helmet worn/not
 *     worn, safety vest/no vest, smoke, fire, restricted zone entry).
 *     COCO itself has no PPE/fire/smoke classes, so only `person` and the
 *     geometrically-computed `restricted_zone_entry` are populated today;
 *     everything else in the vocabulary awaits a PPE-trained checkpoint.
 *     Generic COCO noise (car, chair, bottle, ...) never reaches this
 *     component — it is dropped at the backend's inference/output mapping
 *     stage, not filtered here.
 *   - Scripted CV overlay events (`status.cv_events`,
 *     `helmet_worn`/`helmet_not_worn`/`safety_vest`/`smoke`/`fire`/
 *     `restricted_zone_entry`) hand-authored per scenario row, since no
 *     PPE-trained model checkpoint exists in this project to produce
 *     these classes from real inference.
 *
 * The backend can auto-start and loop a scenario on its own (see
 * `settings.DEMO_AUTOSTART_SCENARIO` / `server.py`'s `_lifespan`) — this
 * panel reflects whatever is currently running via `/demo/status` rather
 * than requiring a manual "Play" click; the button here is for manual
 * override (stop, or restart a specific scenario) only.
 *
 * Video restart is driven by the *scenario* looping back to its first row
 * (detected from `elapsed_seconds` resetting to near zero between polls),
 * not the `<video>` element's native `ended` event — the clip's real
 * duration and the scenario's scripted duration are never guaranteed to
 * match exactly, and syncing off two independent clocks is what caused
 * the earlier "restarts a few seconds early / stutters near the end" bug.
 *
 * `<video>` cannot send an Authorization header, so `video_url` is served
 * from the public, unauthenticated `/media/cctv` route (see
 * `src/routes/media.py`) — never through `apiClient`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCw, Square, Video } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useDemoPlayback, useVideoObjectDetection } from '../hooks';
import { VideoObjectOverlay } from './VideoObjectOverlay';
import env from '@/config/env';

/** `env.apiBaseUrl` is `.../api/v1`; the media route lives one level up, at the API host root. */
function toAbsoluteMediaUrl(path: string): string {
  const apiRoot = new URL(env.apiBaseUrl);
  return `${apiRoot.origin}${path}`;
}

const DEFAULT_SCENARIO = 'factory_incident';

export function ScenarioVideoPanel() {
  const { status, error, starting, start, stop } = useDemoPlayback();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const prevElapsedRef = useRef(0);

  const isRunning = status?.running ?? false;
  const videoUrl = status?.video_url ? toAbsoluteMediaUrl(status.video_url) : null;

  // Load the clip once per scenario run (not on every 1s status poll) —
  // swapping `<video src>` on every re-render would restart playback.
  useEffect(() => {
    if (videoUrl && videoUrl !== videoSrc) setVideoSrc(videoUrl);
    if (!isRunning) setVideoSrc(null);
  }, [videoUrl, isRunning, videoSrc]);

  // Detect the *scenario* looping (elapsed_seconds drops back near zero
  // between two consecutive 1s polls, which only happens when the backend
  // restarted the timeline — see ScenarioPlaybackRunner._run_loop) and
  // restart the video in lockstep. This is the single source of truth for
  // "when does playback restart" — never the video's own `ended` event —
  // so the video and the scenario's backend state always resync exactly
  // together, per row, rather than drifting apart on two independent
  // clocks (see module docstring).
  useEffect(() => {
    if (!status) return;
    const looped = status.elapsed_seconds < prevElapsedRef.current - 1;
    prevElapsedRef.current = status.elapsed_seconds;
    if (looped && videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
  }, [status]);

  // Correct only large drift (e.g. the tab was backgrounded and the
  // browser throttled/paused the video), not every 1s poll tick — forcing
  // `currentTime` every second fights the browser's own buffering on a
  // large file.
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
  const modelDetections = useVideoObjectDetection(videoFilename, getCurrentTime, isRunning && Boolean(videoSrc));
  const scriptedEvents = status?.cv_events ?? [];

  return (
    <Card padding="none">
      <CardHeader
        title="Scenario Playback"
        description="Replays a scripted incident timeline into the live system, driving real risk/emergency/compliance/alert data once per second. Loops automatically."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button size="sm" variant="secondary" onClick={() => void stop()}>
                <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => void start(DEFAULT_SCENARIO, true)} disabled={starting}>
                {starting ? <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {starting ? 'Starting…' : 'Play Scenario'}
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

          {videoSrc && <VideoObjectOverlay detections={modelDetections} variant="model" />}
          {videoSrc && <VideoObjectOverlay detections={scriptedEvents} variant="scripted" />}
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
