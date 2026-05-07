// Espelho TS dos tokens do tailwind.config.js.
// Use estes valores quando NativeWind não alcança: gradientes em SVG,
// cores passadas para reanimated, props que pedem string hex literal.
// Manter sincronizado manualmente com tailwind.config.js.
//
// Cores alinhadas ao Glype Brand Package (design_handoff_glype_brand/README.md)

export const tokens = {
  color: {
    bg: {
      primary: '#0A0A0F',   // ink — dark mode surface
      secondary: '#0D0D14', // between ink and bg2
      elevated: '#111118',  // bg2 — card surface
      surface: '#15151D',   // bg3 — elevated surface
    },
    brand: {
      primary: '#0066FF',  // blue — CTAs, highlights
      light: '#2A82FF',    // lighter variant (gradient start)
      muted: '#6B6B7A',    // slate — used on brand-adjacent muted text
      dark: '#0044CC',     // darker blue (gradient end / deep tint)
    },
    text: {
      primary: '#FFFFFF',  // pure white — headings, labels
      body: '#E7E7EE',     // bone — body reading text on dark
      secondary: '#6B6B7A', // slate — meta, captions, muted
      tertiary: '#4A4A56', // dimmer slate — placeholders, ghost text
    },
    semantic: {
      success: '#66cc99',
      warning: '#ffaa44',
      danger: '#ff6688',
    },
    border: {
      DEFAULT: '#25252F', // line2 — standard borders
      subtle: '#1C1C26',  // line — hairline borders
      accent: '#0044CC',  // blue-tinted border for focused/active states
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
    sm: 8,
    md: 12,
    lg: 14,
    xl: 20,
    pill: 999,
    full: 9999,
  },
  fontSize: {
    'display-1': 32,
    h1: 22,
    h2: 18,
    'body-lg': 15,
    body: 14,
    caption: 12,
    section: 11,
    mono: 13,
  },
  fontFamily: {
    // Space Grotesk — headings & body
    regular: 'SpaceGrotesk_500Medium',
    medium: 'SpaceGrotesk_600SemiBold',
    // JetBrains Mono — scores, counters, meta
    mono: 'JetBrainsMono_400Regular',
    monoMedium: 'JetBrainsMono_500Medium',
  },
} as const;

export type Tokens = typeof tokens;
