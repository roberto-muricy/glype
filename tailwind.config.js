/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#0d0d18',
          elevated: '#111118',
          surface: '#15152a',
        },
        brand: {
          primary: '#0066ff',
          light: '#4488ff',
          muted: '#6688cc',
          dark: '#0d1230',
        },
        text: {
          primary: '#ffffff',
          body: '#c0c0d8',
          secondary: '#8888aa',
          tertiary: '#555577',
        },
        semantic: {
          success: '#66cc99',
          warning: '#ffaa44',
          danger: '#ff6688',
        },
        border: {
          DEFAULT: '#2a2a3a',
          subtle: '#1e1e2e',
          accent: '#1a3a6a',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px',
        pill: '20px',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
      },
      fontSize: {
        'display-1': ['32px', { lineHeight: '36px', letterSpacing: '-0.6px', fontWeight: '500' }],
        h1: ['22px', { lineHeight: '26px', letterSpacing: '-0.3px', fontWeight: '500' }],
        h2: ['18px', { lineHeight: '22px', fontWeight: '500' }],
        'body-lg': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        body: ['13px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['11px', { lineHeight: '15px', fontWeight: '400' }],
        section: ['11px', { lineHeight: '14px', letterSpacing: '0.88px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
