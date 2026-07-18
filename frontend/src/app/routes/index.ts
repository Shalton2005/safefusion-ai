/**
 * Route Registry – central barrel for route config
 *
 * Everything the app needs for routing is exported from here:
 *   - Route definitions (for the router builder)
 *   - Nav routes (for the Sidebar)
 *   - Flat lookup map (for hooks / breadcrumbs)
 *   - Type re-exports
 */

export type {
  NavRouteItem,
} from './types';

export { appRouteDefinitions }  from './appRoutes';
export { authRouteDefinitions } from './authRoutes';

// ─── Combined flat list ───────────────────────────────────────────
// Used by useRouteConfig and breadcrumb utilities.

import { appRouteDefinitions }  from './appRoutes';
import { authRouteDefinitions } from './authRoutes';
import type { AppRouteDefinition, NavRouteItem } from './types';

export const allRouteDefinitions: AppRouteDefinition[] = [
  ...appRouteDefinitions,
  ...authRouteDefinitions,
];

// ─── Navigation items (sidebar) ───────────────────────────────────
// Slim subset: only the fields the Sidebar needs.
// Automatically stays in sync when routes are added/removed.

export const navRoutes: NavRouteItem[] = appRouteDefinitions
  .filter((r) => r.showInNav)
  .map(({ id, path, label, icon, showInNav, badge, section }) => ({
    id,
    path,
    label,
    icon,
    showInNav,
    badge,
    section,
  }));

// ─── Path → metadata lookup map ──────────────────────────────────

export const routeMap = new Map<string, AppRouteDefinition>(
  allRouteDefinitions.map((r) => [r.path, r]),
);

// ─── Partition helper ─────────────────────────────────────────────

export const routePartitions = {
  protected: appRouteDefinitions.filter((r) => r.isProtected),
  public:    authRouteDefinitions.filter((r) => !r.isProtected),
} as const;
