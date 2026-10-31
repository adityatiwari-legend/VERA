/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      colors: {
        /* === VERA editorial design system (docs/design-system.md) === */
        paper: '#FFFFFF',
        mist: '#F8FAFC',
        ink: '#111111',
        mute: '#737373',
        faint: '#A3A3A3',
        line: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
        },
        accent: {
          DEFAULT: '#2563EB',
          deep: '#1E40AF',
          soft: '#DBEAFE',
          faint: '#EFF6FF',
        },
        lav: {
          DEFAULT: '#C4B5FD',
          deep: '#7C3AED',
          soft: '#F5F3FF',
        },
        night: {
          DEFAULT: '#0B0B10',
          surface: '#14141B',
          raised: '#1A1A23',
          mute: '#A3A3A3',
          dim: '#737373',
          line: 'rgba(255,255,255,0.08)',
        },
        ok: {
          DEFAULT: '#15803D',
          soft: '#DCFCE7',
        },
        warn: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        bad: {
          DEFAULT: '#B91C1C',
          soft: '#FEE2E2',
        },

        /* === Legacy aliases (recast in the new palette; do not use in new code) === */
        background: '#FFFFFF',
        foreground: '#111111',
        mint: '#2563EB',
        surface: '#F8FAFC',
        'surface-elevated': '#FFFFFF',
        'surface-base': '#FFFFFF',
        'surface-card-dark': '#14141B',
        'surface-card-light': '#FFFFFF',
        'cyber-cyan': {
          DEFAULT: '#2563EB',
          400: '#3B82F6',
          500: '#2563EB',
          600: '#1D4ED8',
        },
        'trust-indigo': {
          DEFAULT: '#2563EB',
          400: '#3B82F6',
          500: '#2563EB',
          600: '#1D4ED8',
        },
        'alert-amber': {
          DEFAULT: '#B45309',
          400: '#D97706',
          500: '#B45309',
          600: '#92400E',
        },
        'danger-rose': {
          DEFAULT: '#B91C1C',
          400: '#DC2626',
          500: '#B91C1C',
          600: '#991B1B',
        },
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#15803D',
          600: '#15803D',
          700: '#166534',
          800: '#14532D',
          900: '#052E16',
          'emerald-500': '#15803D',
          'emerald-600': '#15803D',
          'emerald-glow': 'rgba(21, 128, 61, 0.18)',
        },
        navy: {
          800: '#14141B',
          900: '#0B0B10',
          950: '#070709',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        lift: '0 12px 32px -12px rgba(16, 24, 40, 0.18), 0 2px 6px rgba(16, 24, 40, 0.05)',
        feature: '0 24px 64px -24px rgba(37, 99, 235, 0.25), 0 4px 12px rgba(16, 24, 40, 0.06)',
        'glow-mint': 'none',
        'glow-emerald': 'none',
        'glow-cyan': 'none',
        'glow-indigo': 'none',
      },
    },
  },
  plugins: [],
};
