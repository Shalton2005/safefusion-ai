/**
 * useRouteConfig
 *
 * Returns the AppRouteDefinition for the currently active route.
 * Use this to access the route's label, description, and icon in
 * any component without prop-drilling or duplicating route data.
 *
 * Example – reading the current page title in TopNav:
 *   const route = useRouteConfig();
 *   <h1>{route?.label ?? 'SafeFusion AI'}</h1>
 */

import { useLocation, matchPath } from 'react-router-dom';
import { allRouteDefinitions, routeMap } from '@/app/routes';
import type { AppRouteDefinition } from '@/app/routes/types';

export function useRouteConfig(): AppRouteDefinition | null {
  const { pathname } = useLocation();

  const exact = routeMap.get(pathname);
  if (exact) return exact;

  // Fall back to pattern matching for dynamic routes (e.g. `/incidents/:incidentId/report`),
  // which aren't present in routeMap's literal path → definition lookup.
  return allRouteDefinitions.find((r) => matchPath(r.path, pathname) !== null) ?? null;
}
