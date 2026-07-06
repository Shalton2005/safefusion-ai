/**
 * Public / Auth Route Definitions
 *
 * Routes that do NOT require authentication.
 * Rendered inside AuthLayout (centred card, no sidebar).
 *
 * To add a new public page (e.g. forgot-password, register):
 *   1. Create the page in src/features/authentication/pages/
 *   2. Add the path to src/constants/routes.ts
 *   3. Add an entry to this array
 */

import { lazy } from 'react';
import { ROUTES } from '@/constants/routes';
import type { AppRouteDefinition } from './types';

export const authRouteDefinitions: AppRouteDefinition[] = [
  // ── Login ──────────────────────────────────────────────────────
  {
    id:          'login',
    path:        ROUTES.LOGIN,
    label:       'Sign In',
    description: 'Sign in to your SafeFusion AI account.',
    showInNav:   false,
    isProtected: false,
    component: lazy(() =>
      import('@/features/authentication/pages/LoginPage').then((m) => ({
        default: m.LoginPage,
      })),
    ),
  },
];
