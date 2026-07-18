/**
 * useDocumentTitle
 *
 * Keeps the browser tab title in sync with the active route.
 * Reuses the same route registry that drives the sidebar and TopNav
 * heading, so a page's title is defined once in `appRoutes.ts`.
 */

import { useEffect } from 'react';
import { useRouteConfig } from '@/hooks/useRouteConfig';
import { APP_NAME } from '@/constants';

export function useDocumentTitle(): void {
  const route = useRouteConfig();

  useEffect(() => {
    document.title = route ? `${route.label} · ${APP_NAME}` : APP_NAME;
  }, [route]);
}
