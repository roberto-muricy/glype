/**
 * Gera o gráfico de destaque (feature graphic) 1024x500 do Glype para o Google Play.
 * Uso: node feature-graphic.cjs <outputPath>
 */
const sharp = require('sharp');

const W = 1024;
const H = 500;

// Brand tokens (src/theme/tokens.ts)
const INK        = '#0A0A0F';
const BLUE       = '#0066FF';
const BLUE_LIGHT = '#2A82FF';
const BLUE_DARK  = '#0044CC';
const WHITE      = '#FFFFFF';
const BONE       = '#E7E7EE';

// A marca do Glype: círculo com stroke + disco deslocado (viewBox 0 0 100 100).
function mark(x, y, size, color = WHITE, strokeW = 6) {
  const scale = size / 100;
  return `<g transform="translate(${x}, ${y}) scale(${scale})">
    <circle cx="50" cy="50" r="38" stroke="${color}" stroke-width="${strokeW}" fill="none"/>
    <circle cx="61.3" cy="38.7" r="18" fill="${color}"/>
  </g>`;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${INK}"/>
      <stop offset="55%"  stop-color="#0B1030"/>
      <stop offset="100%" stop-color="${BLUE_DARK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.5" r="0.62">
      <stop offset="0%"   stop-color="${BLUE_LIGHT}" stop-opacity="0.55"/>
      <stop offset="60%"  stop-color="${BLUE}"       stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${BLUE}"       stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${BLUE_LIGHT}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${BLUE_LIGHT}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Marca d'água: marca gigante, recortada na borda direita -->
  <g opacity="0.07">
    ${mark(700, 40, 420, WHITE, 5)}
  </g>

  <!-- Lockup principal -->
  ${mark(96, 150, 132, WHITE, 6.5)}

  <text x="262" y="252"
        font-family="Space Grotesk, Avenir Next, Helvetica Neue, sans-serif"
        font-weight="600" font-size="104" fill="${WHITE}" letter-spacing="-2">Glype</text>

  <rect x="264" y="284" width="150" height="3" rx="1.5" fill="url(#rule)"/>

  <text x="264" y="336"
        font-family="Space Grotesk, Avenir Next, Helvetica Neue, sans-serif"
        font-weight="500" font-size="30" fill="${BONE}" letter-spacing="0.2">Reviews de jogos PlayStation</text>

  <text x="264" y="378"
        font-family="Space Grotesk, Avenir Next, Helvetica Neue, sans-serif"
        font-weight="400" font-size="22" fill="#9A9AA8" letter-spacing="0.4">Avalie · Organize sua biblioteca · Siga jogadores</text>
</svg>`;

const out = process.argv[2];
if (!out) {
  console.error('uso: node feature-graphic.cjs <outputPath>');
  process.exit(1);
}

sharp(Buffer.from(svg))
  .png()
  .toFile(out)
  .then(() => console.log(`✓ ${out}`))
  .catch((e) => { console.error(e); process.exit(1); });
