/** @type {import('tailwindcss').Config} */
// Colors aligned to Glype Brand Package (design_handoff_glype_brand/README.md)
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:  '#0A0A0F',   // ink
          secondary: '#0D0D14',
          elevated: '#111118',   // bg2
          surface:  '#15151D',   // bg3
        },
        brand: {
          primary: '#0066FF',   // blue
          light:   '#2A82FF',
          muted:   '#6B6B7A',   // slate
          dark:    '#0044CC',
        },
        text: {
          primary:   '#FFFFFF',
          body:      '#E7E7EE',  // bone
          secondary: '#6B6B7A',  // slate
          tertiary:  '#4A4A56',
        },
        semantic: {
          success: '#66cc99',
          warning: '#ffaa44',
          danger:  '#ff6688',
        },
        border: {
          DEFAULT: '#25252F', // line2
          subtle:  '#1C1C26', // line
          accent:  '#0044CC',
        },
      },
      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '14px',
        xl:   '20px',
        pill: '999px',
      },
      fontFamily: {
        // Space Grotesk — body / UI text
        sans:       ['SpaceGrotesk_500Medium'],
        medium:     ['SpaceGrotesk_600SemiBold'],
        // JetBrains Mono — scores, numbers, meta
        mono:       ['JetBrainsMono_400Regular'],
        'mono-md':  ['JetBrainsMono_500Medium'],
      },
      fontSize: {
        'display-1': ['32px', { lineHeight: '38px', letterSpacing: '-0.8px',  fontWeight: '600' }],
        'display-2': ['24px', { lineHeight: '30px', letterSpacing: '-0.5px',  fontWeight: '600' }],
        h1:          ['22px', { lineHeight: '28px', letterSpacing: '-0.55px', fontWeight: '600' }],
        h2:          ['18px', { lineHeight: '24px', letterSpacing: '-0.27px', fontWeight: '600' }],
        'body-lg':   ['15px', { lineHeight: '23px', letterSpacing: '-0.08px', fontWeight: '500' }],
        body:        ['14px', { lineHeight: '21px', letterSpacing: '-0.05px', fontWeight: '400' }],
        caption:     ['12px', { lineHeight: '16px', letterSpacing: '0px',     fontWeight: '400' }],
        section:     ['11px', { lineHeight: '14px', letterSpacing: '0.88px',  fontWeight: '500' }],
        mono:        ['13px', { lineHeight: '18px', letterSpacing: '0.78px',  fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
