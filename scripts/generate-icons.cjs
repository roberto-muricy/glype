/**
 * Gera os assets de ícone do Glype (brand guide specs).
 * Executar: node scripts/generate-icons.cjs
 */

const sharp = require('sharp');
const path  = require('path');

const ASSETS = path.join(__dirname, '../assets/images');

// ─── SVG mark builder ────────────────────────────────────────────────────────

function markSvg({ size, markRatio = 0.6, markColor = '#FFFFFF', bgColor = null, bgRounded = false, roundPct = 22 }) {
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

async function main() {
  // iOS icon — fundo #0066FF, marca branca (OS arredonda)
  await gen(
    markSvg({ size: 1024, markColor: '#FFFFFF', bgColor: '#0066FF' }),
    path.join(ASSETS, 'icon.png'),
  );

  // Android adaptive foreground — marca #0066FF, fundo transparente
  await gen(
    markSvg({ size: 1024, markColor: '#0066FF', bgColor: null }),
    path.join(ASSETS, 'android-icon-foreground.png'),
  );

  // Android adaptive background — fundo sólido #0066FF
  await gen(
    markSvg({ size: 1024, markColor: 'none', bgColor: '#0066FF' }),
    path.join(ASSETS, 'android-icon-background.png'),
  );

  // Android monochrome (themed icons Android 13+) — branco sobre preto
  await gen(
    markSvg({ size: 1024, markColor: '#FFFFFF', bgColor: '#000000' }),
    path.join(ASSETS, 'android-icon-monochrome.png'),
  );

  // Favicon web — 48×48, marca #0066FF, fundo branco arredondado
  await gen(
    markSvg({ size: 48, markColor: '#0066FF', bgColor: '#FFFFFF', bgRounded: true, roundPct: 22 }),
    path.join(ASSETS, 'favicon.png'),
  );

  // Splash icon — 512×512, marca #0066FF, sem fundo
  await gen(
    markSvg({ size: 512, markColor: '#0066FF', bgColor: null }),
    path.join(ASSETS, 'splash-icon.png'),
  );

  console.log('\nTodos os ícones gerados em assets/images/');
}

main().catch((err) => { console.error(err); process.exit(1); });
