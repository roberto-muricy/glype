/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Tema dark base — placeholder. Tokens reais virão na Fase 3.
        background: '#0D1117',
        surface: '#161B22',
        border: '#30363D',
        primary: '#0070D1',
        accent: '#00D4AA',
        text: '#F0F6FC',
        muted: '#8B949E',
        danger: '#F85149',
      },
    },
  },
  plugins: [],
};
