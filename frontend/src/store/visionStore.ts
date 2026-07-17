/**
 * useVisionStore
 *
 * Global Zustand store for the Computer Vision (CCTV Monitoring)
 * feature — the single source of truth for camera status, frame
 * detections, hazards, PPE status, the AI timeline, and the currently
 * selected camera. Same shape as `useAISupervisorStore`/`useCopilotStore`:
 * a request-id staleness guard per fetch action, `ApiError.toUserMessage()`
 * for error text, and a `reset()` back to initial state.
 *
 * Every network action goes through the real, already-built service
 * layer (`visionService`) — this store adds no request logic of its
 * own, only orchestrates calls that already exist. None of the backing
 * `/vision/*` routes exist yet (see `src/services/vision.service.ts`'s
 * doc comment), so these actions resolve to a real `ApiError` today,
 * handled the same way as any other failed request.
 *
 * Each data domain (cameras, detections, hazards, PPE, timeline) has
 * its own `loading`/`error` pair rather than one shared flag, so
 * concurrent fetches (e.g. `fetchCameras()` and `fetchHazards()` firing
 * from different sections of the same page) don't clobber each other —
 * same rationale as `useCopilotStore`'s per-action loading state.
 *
 * This store is the reusable alternative to the feature's per-section
 * fetch hooks (`useCameras`, `useHazardDetections`, etc.) — reach for
 * it when CV state needs to be shared across routes/components outside
 * a single page tree, or driven imperatively (e.g. a background
 * refresh). The `useCameras`-style hooks remain fine for a single
 * self-contained section that doesn't need to share state elsewhere.
 *
 * @example
 * const { cameras, hazards, selectedCamera, selectCamera } = useVisionStore();
 * useEffect(() => { useVisionStore.getState().fetchCameras(); }, []);
 *
 * // Imperative, outside a component:
 * useVisionStore.getState().refreshAll('Zone-A');
 */

import { create } from 'zustand';
import { ApiError } from '@/api/errors';
import { visionService } from '@/services';
import type {
  Camera,
  BoundingBoxDetection,
  HazardDetection,
  PpeComplianceSummary,
  PpeViolation,
  CvTimelineEvent,
} from '@/features/computer-vision/types';

/**
 * Guards against a slower, earlier fetch's response overwriting state
 * after a faster, later fetch of the same kind already resolved —
 * same pattern as `aiSupervisorStore`'s `latestRequestId`. Shared
 * across all fetch actions (not one counter per domain) since that's
 * sufficient to discard any stale response and keeps the guard simple.
 */
let latestRequestId = 0;

interface VisionStoreState {
  // ── Camera status ────────────────────────────────────────────────
  cameras: Camera[];
  camerasLoading: boolean;
  camerasError: string | null;

  // ── Detections (bounding boxes for the selected camera's frame) ──
  detections: BoundingBoxDetection[];
  detectionsLoading: boolean;
  detectionsError: string | null;

  // ── Hazards ───────────────────────────────────────────────────────
  hazards: HazardDetection[];
  hazardsLoading: boolean;
  hazardsError: string | null;

  // ── PPE status ────────────────────────────────────────────────────
  ppeCompliance: PpeComplianceSummary | null;
  ppeViolations: PpeViolation[];
  ppeLoading: boolean;
  ppeError: string | null;

  // ── Timeline ──────────────────────────────────────────────────────
  timeline: CvTimelineEvent[];
  timelineLoading: boolean;
  timelineError: string | null;

  // ── Selected camera ───────────────────────────────────────────────
  /** Camera currently selected for the detail panel/overlay, or `null` when none is selected. */
  selectedCamera: Camera | null;

  // ── Actions ───────────────────────────────────────────────────────
  /** Fetches every registered camera and its live status via `GET /vision/cameras`. */
  fetchCameras: (zone?: string) => Promise<void>;
  /** Fetches bounding-box detections for a camera's current frame via `GET /vision/cameras/{id}/detections`. */
  fetchFrameDetections: (cameraId: string) => Promise<void>;
  /** Fetches recent hazard detections via `GET /vision/hazards`. */
  fetchHazards: (zone?: string) => Promise<void>;
  /** Fetches aggregated PPE compliance and current violations via `GET /vision/ppe` + `GET /vision/ppe/violations`. */
  fetchPpeStatus: (zone?: string) => Promise<void>;
  /** Fetches the chronological CV event feed via `GET /vision/timeline`. */
  fetchTimeline: (zone?: string) => Promise<void>;
  /** Selects a camera (by object, looked up from `cameras` if only an id is available) for the detail panel. Also fetches its frame detections. */
  selectCamera: (camera: Camera | null) => void;
  /** Selects a camera by id (looked up in the current `cameras` list) and fetches its frame detections. No-op if the id isn't found. */
  selectCameraById: (cameraId: string) => void;
  /** Clears the selected camera and its detections. */
  clearSelectedCamera: () => void;
  /** Fetches every domain (cameras, hazards, PPE status, timeline), optionally scoped to a zone. Does not fetch frame detections — that requires a selected camera. */
  refreshAll: (zone?: string) => Promise<void>;
  /** Resets the store back to its initial state. */
  reset: () => void;
}

const initialState = {
  cameras: [] as Camera[],
  camerasLoading: false,
  camerasError: null as string | null,

  detections: [] as BoundingBoxDetection[],
  detectionsLoading: false,
  detectionsError: null as string | null,

  hazards: [] as HazardDetection[],
  hazardsLoading: false,
  hazardsError: null as string | null,

  ppeCompliance: null as PpeComplianceSummary | null,
  ppeViolations: [] as PpeViolation[],
  ppeLoading: false,
  ppeError: null as string | null,

  timeline: [] as CvTimelineEvent[],
  timelineLoading: false,
  timelineError: null as string | null,

  selectedCamera: null as Camera | null,
};

export const useVisionStore = create<VisionStoreState>()((set, get) => ({
  ...initialState,

  fetchCameras: async (zone) => {
    const requestId = ++latestRequestId;
    set({ camerasLoading: true, camerasError: null });
    try {
      const { data } = await visionService.getCameras(zone ? { zone } : undefined);
      if (requestId !== latestRequestId) return;
      set({ cameras: data, camerasLoading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ cameras: [], camerasError: ApiError.from(err).toUserMessage(), camerasLoading: false });
    }
  },

  fetchFrameDetections: async (cameraId) => {
    const requestId = ++latestRequestId;
    set({ detectionsLoading: true, detectionsError: null });
    try {
      const { data } = await visionService.getFrameDetections(cameraId);
      if (requestId !== latestRequestId) return;
      set({ detections: data, detectionsLoading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ detections: [], detectionsError: ApiError.from(err).toUserMessage(), detectionsLoading: false });
    }
  },

  fetchHazards: async (zone) => {
    const requestId = ++latestRequestId;
    set({ hazardsLoading: true, hazardsError: null });
    try {
      const { data } = await visionService.getHazards(zone ? { zone } : undefined);
      if (requestId !== latestRequestId) return;
      set({ hazards: data, hazardsLoading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ hazards: [], hazardsError: ApiError.from(err).toUserMessage(), hazardsLoading: false });
    }
  },

  fetchPpeStatus: async (zone) => {
    const requestId = ++latestRequestId;
    set({ ppeLoading: true, ppeError: null });
    try {
      const [complianceRes, violationsRes] = await Promise.all([
        visionService.getPpeComplianceSummary(zone ? { zone } : undefined),
        visionService.getPpeViolations(zone ? { zone } : undefined),
      ]);
      if (requestId !== latestRequestId) return;
      set({ ppeCompliance: complianceRes.data, ppeViolations: violationsRes.data, ppeLoading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({
        ppeCompliance: null,
        ppeViolations: [],
        ppeError: ApiError.from(err).toUserMessage(),
        ppeLoading: false,
      });
    }
  },

  fetchTimeline: async (zone) => {
    const requestId = ++latestRequestId;
    set({ timelineLoading: true, timelineError: null });
    try {
      const { data } = await visionService.getTimeline(zone ? { zone } : undefined);
      if (requestId !== latestRequestId) return;
      set({ timeline: data, timelineLoading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ timeline: [], timelineError: ApiError.from(err).toUserMessage(), timelineLoading: false });
    }
  },

  selectCamera: (camera) => {
    set({ selectedCamera: camera, detections: [], detectionsError: null });
    if (camera) get().fetchFrameDetections(camera.id);
  },

  selectCameraById: (cameraId) => {
    const camera = get().cameras.find((c) => c.id === cameraId);
    if (camera) get().selectCamera(camera);
  },

  clearSelectedCamera: () => {
    set({ selectedCamera: null, detections: [], detectionsError: null });
  },

  refreshAll: async (zone) => {
    await Promise.all([
      get().fetchCameras(zone),
      get().fetchHazards(zone),
      get().fetchPpeStatus(zone),
      get().fetchTimeline(zone),
    ]);
  },

  reset: () => set({ ...initialState }),
}));
