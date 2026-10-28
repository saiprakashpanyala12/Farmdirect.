import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        primary: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d', 950: '#052e16',
        },
        accent: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        cream: { 50: '#fdfaf5', 100: '#faf5eb', 200: '#f5ecd6' },
      },
      boxShadow: {
        'card-sm': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card':    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-md': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
        'card-lg': '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
        'glow':    '0 0 20px rgba(34,197,94,0.25)',
      },
      animation: {
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideDown: { from: { opacity:'0', transform:'translateY(-8px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        fadeIn:    { from: { opacity:'0' }, to: { opacity:'1' } },
      },
    },
  },
  plugins: [],
}
export default config
