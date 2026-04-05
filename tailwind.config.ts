import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      colors: {
        /* Semantic tokens mapped to CSS vars */
        border: 'var(--border)',
        input: 'rgba(255,255,255,0.12)',
        ring: '#E85002',
        background: 'var(--bg)',
        foreground: 'var(--text-primary)',
        primary: {
          DEFAULT: '#E85002',
          foreground: '#F9F9F9'
        },
        secondary: {
          DEFAULT: 'var(--bg-card)',
          foreground: '#F9F9F9'
        },
        destructive: {
          DEFAULT: '#C10801',
          foreground: '#F9F9F9'
        },
        muted: {
          DEFAULT: 'var(--bg-card)',
          foreground: '#646464'
        },
        accent: {
          DEFAULT: '#E85002',
          foreground: '#F9F9F9'
        },
        popover: {
          DEFAULT: 'var(--bg-input)',
          foreground: 'var(--text-primary)'
        },
        card: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)'
        },
        sidebar: {
          DEFAULT: 'var(--bg-surface)',
          foreground: 'var(--text-secondary)',
          primary: '#E85002',
          'primary-foreground': '#F9F9F9',
          accent: 'var(--bg-card)',
          'accent-foreground': '#F9F9F9',
          border: 'var(--border)',
          ring: '#E85002'
        },
        surface: {
          1: 'var(--bg)',
          2: 'var(--bg-surface)',
          3: 'var(--bg-card)',
        },
        /* Direct palette access */
        brand: {
          DEFAULT: '#E85002',
          deep: '#C10801',
          mid: '#F16001',
          sand: '#D9C3AB',
        },
      },
      borderRadius: {
        lg: '14px',
        md: '10px',
        sm: '6px',
        '2xl': '1rem',
        '3xl': '1.25rem',
        'xl': '0.875rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'float-xp': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-64px) scale(1.1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(232,80,2,0.15)' },
          '50%': { boxShadow: '0 0 18px rgba(232,80,2,0.35)' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float-xp': 'float-xp 1.6s ease-out forwards',
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.35s ease-out forwards',
        'bounce-in': 'bounce-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        glow: 'glow 2.5s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
