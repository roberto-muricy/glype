// Espelho TS dos tokens do tailwind.config.js.
// Use estes valores quando NativeWind não alcança: gradientes em SVG,
// cores passadas para reanimated, props que pedem string hex literal.
// Manter sincronizado manualmente com tailwind.config.js.

export const tokens = {
  color: {
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
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },
  radius: {
    sm: 4,
    md: 6,
    lg: 10,
    xl: 14,
    pill: 20,
    full: 9999,
  },
  fontSize: {
    'display-1': 32,
    h1: 22,
    h2: 18,
    'body-lg': 14,
    body: 13,
    caption: 11,
    section: 11,
  },
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
  },
} as const;

export type Tokens = typeof tokens;
