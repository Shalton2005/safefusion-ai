/**
 * usePlantStatusStore
 *
 * Cross-tree bridge for the plant-wide risk snapshot that backs the
 * globally-mounted `EmergencyStatusBannerContainer` (rendered in
 * `DashboardLayout`, above every page's `<Outlet />`).
 *
 * `DashboardPage` already fetches this data for its own Compound Risk
 * card via `useCompoundRiskEngine`. Without this store, the banner would
 * have no way to reuse it — React Context can't bridge the banner (a
 * layout sibling rendered *before* the outlet) and the page (a
 * descendant of the outlet) — so it would independently re-call the same
 * non-idempotent `POST /risk-scores/calculate` endpoint every interval.
 *
 * Any page that already has a fresh compound-risk assessment publishes
 * it here; `usePlantStatus` reads it if present and only self-fetches
 * when no page has published anything (which is the common case — most
 * pages don't have this data, and the banner still needs to work there).
 *
 * Usage
 * ─────
 * // DashboardPage.tsx — publish already-fetched data:
 * usePlantStatusStore.getState().publish({ riskLevel, lastUpdated });
 *
 * // usePlantStatus.ts — consume if present and fresh, else self-fetch:
 * const published = usePlantStatusStore(s => s.riskLevel ? s : null);
 */

import { create } from 'zustand';
import type { SeverityLevel } from '@/constants';

interface PlantStatusStoreState {
  /** Highest-risk zone's bucketed severity, or `null` if no page has published one yet. */
  riskLevel: SeverityLevel | null;
  /** When the published `riskLevel` was fetched. */
  lastUpdated: Date | null;

  /** Publishes a freshly-fetched risk assessment for the banner (or any other consumer) to reuse instead of re-fetching. */
  publish: (snapshot: { riskLevel: SeverityLevel; lastUpdated: Date | null }) => void;
  /** Clears the published snapshot — call on unmount of the publishing page so a stale value doesn't outlive it. */
  clear: () => void;
}

export const usePlantStatusStore = create<PlantStatusStoreState>()((set) => ({
  riskLevel: null,
  lastUpdated: null,

  publish: ({ riskLevel, lastUpdated }) => set({ riskLevel, lastUpdated }),
  clear: () => set({ riskLevel: null, lastUpdated: null }),
}));
