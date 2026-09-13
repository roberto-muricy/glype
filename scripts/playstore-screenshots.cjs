/**
 * Compõe screenshots de iPhone/simulador em canvases válidos para o Google Play.
 *
 * O Google Play exige que o lado maior não passe de 2x o lado menor.
 * Screenshots de iPhone moderno ficam em ~2.17:1, então são rejeitados.
 * Este script encaixa cada print num canvas 1080x1920 (1.78:1) com o
 * fundo/gradiente da marca, mantendo o device art centralizado.
 *
 * Uso:
 *   node scripts/playstore-screenshots.cjs <outDir> <input1.png> [input2.png ...]
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Margem vertical (topo/base) reservada no canvas, em px.
const PAD_Y = 64;
// Raio do canto do print, pra dar aparência de device.
const CORNER_RADIUS = 28;

// Brand tokens (src/theme/tokens.ts)
const INK = '#0A0A0F';
const BLUE_DARK = '#0044CC';
const BLUE_LIGHT = '#2A82FF';
const BLUE = '#0066FF';

function backgroundSvg() {
  return Buffer.from(`<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%"   stop-color="${INK}"/>
        <stop offset="60%"  stop-color="#0B1030"/>
        <stop offset="100%" stop-color="${BLUE_DARK}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.12" r="0.75">
        <stop offset="0%"   stop-color="${BLUE_LIGHT}" stop-opacity="0.34"/>
        <stop offset="55%"  stop-color="${BLUE}"       stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${BLUE}"       stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#glow)"/>
  </svg>`);
}

/** Máscara de cantos arredondados nas dimensões do print redimensionado. */
function roundedMaskSvg(w, h) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#fff"/>
  </svg>`);
}

async function compose(inputPath, outPath) {
  const src = sharp(inputPath);
  const meta = await src.metadata();

  // Escala o print para caber na altura disponível, preservando proporção.
  const availH = CANVAS_H - PAD_Y * 2;
  const scale = availH / meta.height;
  const shotW = Math.round(meta.width * scale);
  const shotH = availH;

  if (shotW > CANVAS_W) {
    throw new Error(
      `${path.basename(inputPath)}: print fica ${shotW}px de largura (>${CANVAS_W}). ` +
      `Aumente PAD_Y ou use um canvas mais largo.`,
    );
  }

  const resized = await src
    .resize(shotW, shotH, { fit: 'fill' })
    .composite([{ input: roundedMaskSvg(shotW, shotH), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(backgroundSvg())
    .composite([
      {
        input: resized,
        top: PAD_Y,
        left: Math.round((CANVAS_W - shotW) / 2),
      },
    ])
    .png()
    .toFile(outPath);

  return { shotW, shotH, src: `${meta.width}x${meta.height}` };
}

async function main() {
  const [outDir, ...inputs] = process.argv.slice(2);
  if (!outDir || inputs.length === 0) {
    console.error('uso: node scripts/playstore-screenshots.cjs <outDir> <input.png> [...]');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  let i = 0;
  for (const input of inputs) {
    i += 1;
    const out = path.join(outDir, `glype-play-${String(i).padStart(2, '0')}.png`);
    const info = await compose(input, out);
    console.log(`✓ ${path.basename(out)}  ${info.src} → ${CANVAS_W}x${CANVAS_H} (print ${info.shotW}x${info.shotH})`);
  }
  console.log(`\n${i} screenshot(s) em ${outDir}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
