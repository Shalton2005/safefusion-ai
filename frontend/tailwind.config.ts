import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    // ─── Screens / Breakpoints ──────────────────────────────────────
    screens: {
      xs:  '480px',
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },

    // ─── Container ─────────────────────────────────────────────────
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm:  '1.5rem',
        lg:  '2rem',
        xl:  '2.5rem',
        '2xl': '3rem',
      },
    },

    extend: {
      // ─── Color Palette ─────────────────────────────────────────────
      colors: {
        // ── Primary Brand – Blue ──
        primary: {
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

        // ── Sky Blue – info / links ──
        sky: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        // ── Slate – neutral surfaces ──
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

        // ── Gray – cool text & borders ──
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

        // ── Zinc – warm dark surfaces (sidebar, panels) ──
        zinc: {
          750: '#2a2a2e',
          800: '#27272a',
          850: '#1e1e21',
          900: '#18181b',
          925: '#111113',
          950: '#09090b',
        },

        // ── Accent Orange – caution / warning ──
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

        // ── Accent Red – danger / critical ──
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

        // ── Accent Green – safe / online / ok ──
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

        // ── Amber – medium caution ──
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },

        // ── Semantic safety aliases ──
        safe: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        caution: {
          50:  '#fff7ed',
          100: '#ffedd5',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fee2e2',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          900: '#7f1d1d',
        },

        // ── Surface semantic tokens (CSS-var backed at runtime) ──
        surface: {
          base:    'var(--sf-surface-base)',
          raised:  'var(--sf-surface-raised)',
          card:    'var(--sf-surface-card)',
          overlay: 'var(--sf-surface-overlay)',
          sunken:  'var(--sf-surface-sunken)',
          sidebar: 'var(--sf-surface-sidebar)',
          border:  'var(--sf-border-default)',
          muted:   'var(--sf-border-subtle)',
        },

        // ── Text semantic tokens ──
        text: {
          primary:   'var(--sf-text-primary)',
          secondary: 'var(--sf-text-secondary)',
          tertiary:  'var(--sf-text-tertiary)',
          disabled:  'var(--sf-text-disabled)',
          inverse:   'var(--sf-text-inverse)',
          accent:    'var(--sf-text-accent)',
        },
      },

      // ─── Typography ────────────────────────────────────────────────
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'Consolas', 'monospace'],
        data:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Sub-xs for badges, labels
        '2xs': ['0.625rem', { lineHeight: '1rem',    letterSpacing: '0.025em' }],
        '3xs': ['0.5rem',   { lineHeight: '0.75rem', letterSpacing: '0.05em'  }],
        // Standard scale (explicit line-heights)
        xs:   ['0.75rem',  { lineHeight: '1rem'    }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem'  }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem'    }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem'  }],
        '5xl':['3rem',     { lineHeight: '1.1'     }],
        // Dashboard data readouts
        'data-sm': ['1.5rem',  { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'data-md': ['2rem',    { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'data-lg': ['2.75rem', { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.03em' }],
        'data-xl': ['3.5rem',  { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.03em' }],
      },

      fontWeight: {
        thin:       '100',
        extralight: '200',
        light:      '300',
        normal:     '400',
        medium:     '500',
        semibold:   '600',
        bold:       '700',
        extrabold:  '800',
        black:      '900',
      },

      lineHeight: {
        none:    '1',
        tighter: '1.15',
        tight:   '1.25',
        snug:    '1.375',
        normal:  '1.5',
        relaxed: '1.625',
        loose:   '2',
      },

      letterSpacing: {
        tighter:  '-0.05em',
        tight:    '-0.025em',
        normal:   '0em',
        wide:     '0.025em',
        wider:    '0.05em',
        widest:   '0.1em',
        caps:     '0.08em',
      },

      // ─── Spacing Scale ─────────────────────────────────────────────
      spacing: {
        // Layout structure
        sidebar:           '16rem',    // 256px
        'sidebar-sm':      '13.5rem',  // 216px
        'sidebar-collapsed':'4.5rem',  // 72px
        topnav:            '4rem',     // 64px
        footer:            '3rem',     // 48px
        // Content padding
        'page-x':          '1.5rem',
        'page-y':          '1.5rem',
        // Component
        'card-pad':        '1.5rem',
        'card-pad-sm':     '1rem',
        'card-pad-lg':     '2rem',
        // Gaps
        'section-gap':     '1.5rem',
        'widget-gap':      '1rem',
      },

      // ─── Border Radius ─────────────────────────────────────────────
      borderRadius: {
        none:  '0',
        xs:    '0.125rem',   // 2px
        sm:    '0.25rem',    // 4px
        md:    '0.375rem',   // 6px
        DEFAULT:'0.5rem',    // 8px
        lg:    '0.625rem',   // 10px
        xl:    '0.75rem',    // 12px – cards
        '2xl': '1rem',       // 16px – modals
        '3xl': '1.25rem',    // 20px – overlays
        card:  '0.75rem',    // alias
        pill:  '624.9375rem',// fully round
        full:  '9999px',
      },

      // ─── Box Shadow / Elevation ────────────────────────────────────
      boxShadow: {
        // Light mode shadows
        'xs':   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm':   '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md':   '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg':   '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl':   '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl':  '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        // Dark mode elevated cards (higher opacity)
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.4), 0 2px 6px -2px rgb(0 0 0 / 0.35)',
        'card-lg':    '0 8px 24px -4px rgb(0 0 0 / 0.45), 0 4px 8px -4px rgb(0 0 0 / 0.35)',
        // Glows for status indicators
        'glow-brand':   '0 0 16px 3px rgba(59, 130, 246, 0.4)',
        'glow-safe':    '0 0 16px 3px rgba(34, 197, 94, 0.4)',
        'glow-caution': '0 0 16px 3px rgba(249, 115, 22, 0.4)',
        'glow-danger':  '0 0 16px 3px rgba(239, 68, 68, 0.4)',
        'glow-sm':      '0 0 8px 1px rgba(59, 130, 246, 0.3)',
        // Inset for pressed / sunken states
        'inset':        'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
        'inset-sm':     'inset 0 1px 2px 0 rgb(0 0 0 / 0.12)',
        // None
        'none':         'none',
      },

      // ─── Animations ────────────────────────────────────────────────
      animation: {
        // Standard UI
        'fade-in':      'fadeIn 0.2s ease-out both',
        'fade-out':     'fadeOut 0.15s ease-in both',
        'slide-in':     'slideInDown 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-up':  'slideInUp 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-left':'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':     'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
        // Status pulses
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-fast':   'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow':    'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        // Data / loading
        'shimmer':      'shimmer 2s linear infinite',
        'spin-slow':    'spin 3s linear infinite',
        // Alert
        'bounce-sm':    'bounceSm 1s ease infinite',
        'blink':        'blink 1.2s step-end infinite',
      },

      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },          '100%': { opacity: '1' } },
        fadeOut: { '0%': { opacity: '1' },          '100%': { opacity: '0' } },
        slideInDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-3px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },

      // ─── Z-index Layers ────────────────────────────────────────────
      zIndex: {
        base:    '0',
        raised:  '10',
        sticky:  '20',
        overlay: '30',
        modal:   '40',
        toast:   '50',
        tip:     '60',
        max:     '9999',
      },

      // ─── Transitions ───────────────────────────────────────────────
      transitionTimingFunction: {
        'spring':       'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-out':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'ease-out-expo':'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionDuration: {
        '75':  '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000':'1000ms',
      },

      // ─── Grid / Layout Helpers ─────────────────────────────────────
      gridTemplateColumns: {
        'dashboard-2':  'repeat(2, minmax(0, 1fr))',
        'dashboard-3':  'repeat(3, minmax(0, 1fr))',
        'dashboard-4':  'repeat(4, minmax(0, 1fr))',
        'sidebar-main': 'var(--sf-sidebar-width) 1fr',
        'stat-cards':   'repeat(auto-fill, minmax(14rem, 1fr))',
        'widget-grid':  'repeat(auto-fill, minmax(18rem, 1fr))',
      },

      // ─── Min / Max Widths ──────────────────────────────────────────
      minWidth: {
        '0':    '0',
        xs:     '20rem',
        sm:     '24rem',
        md:     '28rem',
        lg:     '32rem',
        xl:     '36rem',
        '2xl':  '42rem',
        sidebar:'16rem',
        full:   '100%',
      },

      maxWidth: {
        sidebar: '20rem',
        content: '80rem',
        prose:   '65ch',
      },

      // ─── Opacity ───────────────────────────────────────────────────
      opacity: {
        '2':  '0.02',
        '5':  '0.05',
        '8':  '0.08',
        '12': '0.12',
        '15': '0.15',
        '25': '0.25',
        '35': '0.35',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '75': '0.75',
        '85': '0.85',
        '95': '0.95',
      },

      // ─── Backdrop Blur ─────────────────────────────────────────────
      backdropBlur: {
        xs:  '2px',
        sm:  '4px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl':'24px',
      },

      // ─── Aspect Ratios ─────────────────────────────────────────────
      aspectRatio: {
        'auto': 'auto',
        'square': '1 / 1',
        'video':  '16 / 9',
        'wide':   '21 / 9',
        'chart':  '2 / 1',
        'heatmap':'4 / 3',
      },
    },
  },
  plugins: [],
};
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};
