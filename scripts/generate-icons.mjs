/**
 * Gera os assets de ícone do Glype a partir das especificações do brand guide.
 *
 * Brand guide (design_handoff_glype_brand/README.md):
 *   - Marca: socket ring cx=50 cy=50 r=38 sw=6 + cap cx=61.3 cy=38.7 r=18
 *   - Mark sized to 60% of tile width
 *   - border-radius: 22% (handled pelo OS no iOS; não pré-arredondamos o PNG)
 *
 * Arquivos gerados:
 *   assets/images/icon.png               — 1024×1024  fundo #0066FF, marca branca (iOS)
 *   assets/images/android-icon-foreground.png — 1024×1024 marca #0066FF, fundo transparente
 *   assets/images/android-icon-background.png — 1024×1024 fundo sólido #0066FF
 *   assets/images/android-icon-monochrome.png — 1024×1024 marca branca, fundo preto
 *   assets/images/favicon.png            — 48×48  marca #0066FF, fundo branco
 *   assets/images/splash-icon.png        — 512×512 marca #0066FF, fundo transparente
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '../assets/images');

// ─── SVG mark builder ────────────────────────────────────────────────────────
// viewBox 100×100 conforme brand guide; escalar via width/height do <svg>.

function markSvg({
  size,          // tamanho total do SVG
  markRatio = 0.6, // marca ocupa 60% do tile (brand guide)
  markColor = '#FFFFFF',
  bgColor = null,   // null = transparente
  bgRounded = false, // pré-arredondar (usado apenas para favicon web)
  roundPct = 22,
}) {
  const markPx = size * markRatio;
  const offset = (size - markPx) / 2;
  const scale  = markPx / 100;

  const bgRect = bgColor
    ? bgRounded
      ? `<rect width="${size}" height="${size}" rx="${size * roundPct / 100}" ry="${size * roundPct / 100}" fill="${bgColor}"/>`
      : `<rect width="${size}" height="${size}" fill="${bgColor}"/>`
    : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <circle cx="50" cy="50" r="38" stroke="${markColor}" stroke-width="6" fill="none"/>
    <circle cx="61.3" cy="38.7" r="18" fill="${markColor}"/>
  </g>
</svg>`;
}

async function gen(svg, outFile) {
  await sharp(Buffer.from(svg)).png().toFile(outFile);
  console.log(`✓ ${path.relative(process.cwd(), outFile)}`);
}

// ─── iOS icon (primary) ──────────────────────────────────────────────────────
// Fundo #0066FF, marca branca — o OS aplica o superellipse.
await gen(
  markSvg({ size: 1024, markColor: '#FFFFFF', bgColor: '#0066FF' }),
  path.join(ASSETS, 'icon.png'),
);

// ─── Android adaptive — foreground ──────────────────────────────────────────
// Marca #0066FF em fundo transparente (camada frontal do adaptive icon).
await gen(
  markSvg({ size: 1024, markColor: '#0066FF', bgColor: null }),
  path.join(ASSETS, 'android-icon-foreground.png'),
);

// ─── Android adaptive — background ──────────────────────────────────────────
// Fundo sólido #0066FF.
await gen(
  markSvg({ size: 1024, markColor: 'none', bgColor: '#0066FF' }),
  path.join(ASSETS, 'android-icon-background.png'),
);

// ─── Android monochrome ──────────────────────────────────────────────────────
// Marca branca sobre fundo preto (Android 13+ themed icons).
await gen(
  markSvg({ size: 1024, markColor: '#FFFFFF', bgColor: '#000000' }),
  path.join(ASSETS, 'android-icon-monochrome.png'),
);

// ─── Favicon (web) ───────────────────────────────────────────────────────────
// 48×48, marca #0066FF, fundo branco com cantos arredondados (22%).
await gen(
  markSvg({ size: 48, markColor: '#0066FF', bgColor: '#FFFFFF', bgRounded: true, roundPct: 22 }),
  path.join(ASSETS, 'favicon.png'),
);

// ─── Splash icon ─────────────────────────────────────────────────────────────
// 512×512, marca #0066FF, sem fundo (splash screen define a cor de fundo).
await gen(
  markSvg({ size: 512, markColor: '#0066FF', bgColor: null }),
  path.join(ASSETS, 'splash-icon.png'),
);

console.log('\nTodos os ícones gerados em assets/images/');
