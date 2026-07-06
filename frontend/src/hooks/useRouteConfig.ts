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

import { useLocation } from 'react-router-dom';
import { routeMap } from '@/app/routes';
import type { AppRouteDefinition } from '@/app/routes/types';

export function useRouteConfig(): AppRouteDefinition | null {
  const { pathname } = useLocation();
  return routeMap.get(pathname) ?? null;
}
