/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ocean deep navy backgrounds
        abyss: {
          950: '#060a16',
          900: '#0a1122',
          850: '#0d1528',
          800: '#101a30',
          700: '#182340',
          600: '#22304f',
        },
        // Brand accents
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        ice: '#bfe3ff',
        status: {
          ok: '#34d399',
          warn: '#fbbf24',
          crit: '#f87171',
          off: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(6, 182, 212, 0.25)',
        'glow-soft': '0 0 16px rgba(45, 212, 191, 0.18)',
      },
      backgroundImage: {
        'ocean-gradient': 'radial-gradient(1200px 800px at 80% -10%, rgba(6,182,212,0.10), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(20,184,166,0.08), transparent 55%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.45s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};