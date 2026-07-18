/**
 * Route Type Definitions
 *
 * Separates route metadata from React Router's RouteObject so the
 * same data can drive: the router config, sidebar navigation,
 * breadcrumbs, page titles, and analytics tracking.
 */

import type { LazyExoticComponent, ComponentType, ElementType } from 'react';

// ─── Route Metadata ───────────────────────────────────────────────

/**
 * Pure metadata about a route.
 * No React components – safe to import in any module.
 */
interface RouteMetadata {
  /** Stable unique identifier (used for active-state detection, testing) */
  readonly id: string;
  /** URL path (e.g. '/dashboard') */
  readonly path: string;
  /** Human-readable label used in nav, breadcrumbs, and page headers */
  readonly label: string;
  /** Short description shown in page sub-headers */
  readonly description?: string;
  /** Lucide icon component for sidebar navigation */
  readonly icon?: ElementType;
  /** Whether this route appears in the sidebar navigation */
  readonly showInNav: boolean;
  /** Whether this route requires authentication */
  readonly isProtected: boolean;
  /**
   * Optional badge value shown next to the nav item.
   * Typically a live count (e.g. active alert count).
   */
  readonly badge?: string | number;
  /**
   * Sidebar section heading this route is grouped under (e.g. 'Overview').
   * Routes with the same `section`, in declaration order, render together.
   * Omit for routes that shouldn't be grouped under a heading.
   */
  readonly section?: string;
}

// ─── Full Route Definition ────────────────────────────────────────

/**
 * Full route definition: metadata + lazy-loaded component.
 * Used by the router builder to construct RouteObjects.
 */
export interface AppRouteDefinition extends RouteMetadata {
  /**
   * Lazy-loaded page component.
   * Created with `React.lazy(() => import(...))`.
   */
  readonly component: LazyExoticComponent<ComponentType>;
}

// ─── Navigation Types ─────────────────────────────────────────────

/**
 * Slim nav-item shape derived from route metadata.
 * The Sidebar consumes this instead of its own hardcoded list.
 */
export type NavRouteItem = Pick<
  RouteMetadata,
  'id' | 'path' | 'label' | 'icon' | 'showInNav' | 'badge' | 'section'
>;

// ─── Router Builder Helpers ───────────────────────────────────────

/**
 * Groups of routes partitioned by access level.
 * Used by `buildRouter()` to wrap in the correct layout.
 */
