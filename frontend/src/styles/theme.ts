/**
 * SafeFusion AI – Design Token Registry (TypeScript)
 *
 * Single source of truth for all design tokens expressed as typed
 * TypeScript constants.  Use this module wherever CSS is unavailable:
 * charting libraries (Chart.js, Recharts, ECharts), canvas/WebGL
 * rendering, conditional inline styles, testing utilities, etc.
 *
 * CSS variables (src/styles/globals.css) are the runtime authority.
 * This file mirrors their values so editors and type-checkers can
 * validate usage.
 */

// ─── Color Primitives ─────────────────────────────────────────────
// Raw palette – avoid using these directly in components.
// Prefer semantic tokens below.

export const colorPrimitives = {
  // ── Blue (primary brand) ──
  blue: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // ── Sky (info / link) ──
  sky: {
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // ── Slate (neutral surfaces) ──
  slate: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172032',
    900: '#0f172a',
    925: '#0a1020',
    950: '#020617',
  },

  // ── Gray (cool text / borders) ──
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // ── Zinc (warm dark surfaces) ──
  zinc: {
    750: '#2a2a2e',
    800: '#27272a',
    850: '#1e1e21',
    900: '#18181b',
    925: '#111113',
    950: '#09090b',
  },

  // ── Accent: Orange (caution / warning) ──
  orange: {
    50:  '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  // ── Accent: Red (danger / critical) ──
  red: {
    50:  '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // ── Accent: Green (safe / online / ok) ──
  green: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // ── Amber (medium warning) ──
  amber: {
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // ── Absolute ──
  white:       '#ffffff',
  black:       '#000000',
  transparent: 'transparent',
} as const;

// ─── Semantic Color Tokens ────────────────────────────────────────
// Mode-sensitive values. `light` and `dark` must be kept in sync
// with globals.css `:root` and `.dark` blocks respectively.

export const semanticColors = {
  light: {
    // Surfaces
    surfaceBase:    '#f8fafc',
    surfaceRaised:  '#ffffff',
    surfaceCard:    '#ffffff',
    surfaceOverlay: '#ffffff',
    surfaceSunken:  '#f1f5f9',
    surfaceSidebar: '#1e293b',
    surfaceTopnav:  '#ffffff',

    // Borders
    borderSubtle:   '#f1f5f9',
    borderDefault:  '#e2e8f0',
    borderStrong:   '#cbd5e1',
    borderFocus:    '#3b82f6',
    borderDanger:   '#dc2626',

    // Text
    textPrimary:    '#0f172a',
    textSecondary:  '#475569',
    textTertiary:   '#94a3b8',
    textDisabled:   '#cbd5e1',
    textInverse:    '#f8fafc',
    textAccent:     '#2563eb',
    textLink:       '#2563eb',

    // Brand
    brand:          '#2563eb',
    brandHover:     '#1d4ed8',
    brandMuted:     '#dbeafe',
    brandSubtle:    '#eff6ff',

    // Status
    safe:           '#16a34a',
    safeMuted:      '#dcfce7',
    safeSubtle:     '#f0fdf4',
    safeFg:         '#15803d',

    caution:        '#ea580c',
    cautionMuted:   '#ffedd5',
    cautionSubtle:  '#fff7ed',
    cautionFg:      '#c2410c',

    danger:         '#dc2626',
    dangerMuted:    '#fee2e2',
    dangerSubtle:   '#fef2f2',
    dangerFg:       '#b91c1c',

    info:           '#0284c7',
    infoMuted:      '#e0f2fe',
    infoSubtle:     '#f0f9ff',
    infoFg:         '#0369a1',

    warning:        '#d97706',
    warningMuted:   '#fef3c7',
    warningSubtle:  '#fffbeb',
    warningFg:      '#b45309',
  },

  dark: {
    // Surfaces
    surfaceBase:    '#090d14',
    surfaceRaised:  '#0f1520',
    surfaceCard:    '#141c2b',
    surfaceOverlay: '#1a2236',
    surfaceSunken:  '#080c12',
    surfaceSidebar: '#080c12',
    surfaceTopnav:  '#0f1520',

    // Borders
    borderSubtle:   '#141c2b',
    borderDefault:  '#1e2d42',
    borderStrong:   '#2d4160',
    borderFocus:    '#3b82f6',
    borderDanger:   '#ef4444',

    // Text
    textPrimary:    '#e8edf5',
    textSecondary:  '#8a9bb5',
    textTertiary:   '#4d6080',
    textDisabled:   '#2d3f55',
    textInverse:    '#090d14',
    textAccent:     '#60a5fa',
    textLink:       '#60a5fa',

    // Brand
    brand:          '#3b82f6',
    brandHover:     '#60a5fa',
    brandMuted:     'rgba(59,130,246,0.12)',
    brandSubtle:    'rgba(59,130,246,0.06)',

    // Status
    safe:           '#22c55e',
    safeMuted:      'rgba(34,197,94,0.12)',
    safeSubtle:     'rgba(34,197,94,0.06)',
    safeFg:         '#4ade80',

    caution:        '#f97316',
    cautionMuted:   'rgba(249,115,22,0.12)',
    cautionSubtle:  'rgba(249,115,22,0.06)',
    cautionFg:      '#fb923c',

    danger:         '#ef4444',
    dangerMuted:    'rgba(239,68,68,0.12)',
    dangerSubtle:   'rgba(239,68,68,0.06)',
    dangerFg:       '#f87171',

    info:           '#0ea5e9',
    infoMuted:      'rgba(14,165,233,0.12)',
    infoSubtle:     'rgba(14,165,233,0.06)',
    infoFg:         '#38bdf8',

    warning:        '#f59e0b',
    warningMuted:   'rgba(245,158,11,0.12)',
    warningSubtle:  'rgba(245,158,11,0.06)',
    warningFg:      '#fbbf24',
  },
} as const;

// ─── Chart Color Palette ─────────────────────────────────────────
// Ordered sequences for use in charting libraries.

export const chartColors = {
  // Primary data series
  series: [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#f97316', // orange-500
    '#0ea5e9', // sky-500
    '#f59e0b', // amber-500
    '#a855f7', // purple-500
    '#ef4444', // red-500
    '#14b8a6', // teal-500
    '#ec4899', // pink-500
    '#64748b', // slate-500
  ],

  // Status colours
  safe:    '#22c55e',
  caution: '#f97316',
  danger:  '#ef4444',
  info:    '#0ea5e9',
  neutral: '#64748b',

  // Heatmap gradient (cool → hot)
  heatmap: {
    low:      '#1e3a8a', // blue-900
    medium:   '#f59e0b', // amber-500
    high:     '#ea580c', // orange-600
    critical: '#dc2626', // red-600
  },

  // Dark chart backgrounds
  darkGrid:  '#1e2d42',
  darkAxis:  '#2d4160',
  darkLabel: '#4d6080',
} as const;

// ─── Typography ───────────────────────────────────────────────────

export const typography = {
  fonts: {
    sans:    "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    display: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', ui-monospace, Consolas, monospace",
    data:    "'JetBrains Mono', ui-monospace, monospace",
  },

  sizes: {
    '3xs': '0.5rem',    // 8px
    '2xs': '0.625rem',  // 10px
    xs:    '0.75rem',   // 12px
    sm:    '0.875rem',  // 14px
    base:  '1rem',      // 16px
    lg:    '1.125rem',  // 18px
    xl:    '1.25rem',   // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    // Data readouts
    dataSm: '1.5rem',
    dataMd: '2rem',
    dataLg: '2.75rem',
    dataXl: '3.5rem',
  },

  weights: {
    thin:       100,
    extralight: 200,
    light:      300,
    normal:     400,
    medium:     500,
    semibold:   600,
    bold:       700,
    extrabold:  800,
    black:      900,
  },

  lineHeights: {
    none:    '1',
    tighter: '1.15',
    tight:   '1.25',
    snug:    '1.375',
    normal:  '1.5',
    relaxed: '1.625',
    loose:   '2',
  },

  letterSpacings: {
    tighter: '-0.05em',
    tight:   '-0.025em',
    normal:  '0em',
    wide:    '0.025em',
    wider:   '0.05em',
    widest:  '0.1em',
    caps:    '0.08em',
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────
// Values in rem (base 16px).

export const spacing = {
  px:    '1px',
  0:     '0',
  0.5:   '0.125rem',
  1:     '0.25rem',
  1.5:   '0.375rem',
  2:     '0.5rem',
  2.5:   '0.625rem',
  3:     '0.75rem',
  3.5:   '0.875rem',
  4:     '1rem',
  5:     '1.25rem',
  6:     '1.5rem',
  7:     '1.75rem',
  8:     '2rem',
  9:     '2.25rem',
  10:    '2.5rem',
  11:    '2.75rem',
  12:    '3rem',
  14:    '3.5rem',
  16:    '4rem',
  20:    '5rem',
  24:    '6rem',
  28:    '7rem',
  32:    '8rem',
  36:    '9rem',
  40:    '10rem',
  48:    '12rem',
  56:    '14rem',
  64:    '16rem',
  72:    '18rem',
  80:    '20rem',
  96:    '24rem',
  // Layout
  sidebar:           '16rem',
  sidebarSm:         '13.5rem',
  sidebarCollapsed:  '4.5rem',
  topnav:            '4rem',
  footer:            '3rem',
  pageX:             '1.5rem',
  pageY:             '1.5rem',
  cardPad:           '1.5rem',
  cardPadSm:         '1rem',
  cardPadLg:         '2rem',
  sectionGap:        '1.5rem',
  widgetGap:         '1rem',
} as const;

// ─── Border Radius ────────────────────────────────────────────────

export const radii = {
  none:  '0',
  xs:    '0.125rem',    // 2px
  sm:    '0.25rem',     // 4px
  md:    '0.5rem',      // 8px
  lg:    '0.75rem',     // 12px  ← cards
  xl:    '1rem',        // 16px  ← modals
  '2xl': '1.25rem',     // 20px
  full:  '9999px',
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────

export const breakpoints = {
  xs:    480,   // px – extra small phones
  sm:    640,   // small tablets / large phones
  md:    768,   // tablets
  lg:    1024,  // small laptops
  xl:    1280,  // desktops
  '2xl': 1536,  // large monitors
  '3xl': 1920,  // ultra-wide / 4K
} as const;

/** Convert a breakpoint name to a CSS media query string. */
export function mq(bp: keyof typeof breakpoints): string {
  return `@media (min-width: ${breakpoints[bp]}px)`;
}

// ─── Elevation / Shadows ──────────────────────────────────────────

export const shadows = {
  xs:   '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  sm:   '0 1px 3px 0 rgb(0 0 0 / 0.08),  0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md:   '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg:   '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
  xl:   '0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  none: 'none',
  // Glow
  glowBrand:   '0 0 18px 3px rgba(59,130,246,0.35)',
  glowSafe:    '0 0 18px 3px rgba(34,197,94,0.35)',
  glowCaution: '0 0 18px 3px rgba(249,115,22,0.35)',
  glowDanger:  '0 0 18px 3px rgba(239,68,68,0.35)',
} as const;

// ─── Z-index Layers ───────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,
  sticky:  20,
  overlay: 30,
  modal:   40,
  toast:   50,
  tip:     60,
  max:     9999,
} as const;

// ─── Transitions ─────────────────────────────────────────────────

export const transitions = {
  duration: {
    fast:   100,
    base:   200,
    slow:   300,
    slower: 500,
  },
  easing: {
    linear:   'linear',
    easeIn:   'cubic-bezier(0.4,0,1,1)',
    easeOut:  'cubic-bezier(0,0,0.2,1)',
    easeInOut:'cubic-bezier(0.4,0,0.2,1)',
    spring:   'cubic-bezier(0.16,1,0.3,1)',
    bounce:   'cubic-bezier(0.34,1.56,0.64,1)',
    easeOutExpo: 'cubic-bezier(0.16,1,0.3,1)',
  },
} as const;

// ─── Layout Structure ─────────────────────────────────────────────

export const layout = {
  sidebar: {
    width:          256,  // px
    widthSm:        216,  // px
    widthCollapsed: 72,   // px
  },
  topnav: {
    height: 64,   // px
  },
  footer: {
    height: 48,   // px
  },
  page: {
    paddingX: '1.5rem',
    paddingY: '1.5rem',
    maxWidth: '80rem',
  },
} as const;

// ─── Composite Theme Object ───────────────────────────────────────
// Convenience export that bundles everything for consumer code.

export const theme = {
  colors:      colorPrimitives,
  semantic:    semanticColors,
  chart:       chartColors,
  typography,
  spacing,
  radii,
  breakpoints,
  shadows,
  zIndex,
  transitions,
  layout,
} as const;

export type ColorPrimitives  = typeof colorPrimitives;
export type SemanticColors   = typeof semanticColors;
export type ChartColors      = typeof chartColors;
export type Typography       = typeof typography;
export type Spacing          = typeof spacing;
export type Radii            = typeof radii;
export type Breakpoints      = typeof breakpoints;
export type Shadows          = typeof shadows;
export type ZIndex           = typeof zIndex;
export type Transitions      = typeof transitions;
export type Layout           = typeof layout;
export type Theme            = typeof theme;

export default theme;
