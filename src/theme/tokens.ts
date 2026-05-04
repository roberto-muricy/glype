// Placeholder. Os tokens reais vêm na Fase 3 junto com a UI polida.
// Por ora, apenas as cores principais que já estão no tailwind.config.js.
export const tokens = {
  colors: {
    background: '#0D1117',
    surface: '#161B22',
    border: '#30363D',
    primary: '#0070D1',
    accent: '#00D4AA',
    text: '#F0F6FC',
    muted: '#8B949E',
    danger: '#F85149',
  },
} as const;

export type Tokens = typeof tokens;
