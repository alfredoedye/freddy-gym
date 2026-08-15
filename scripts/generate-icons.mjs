/**
 * Genera los íconos PWA (favicon, apple-touch-icon, manifest icons, maskable)
 * a partir de un único glifo SVG: el rayo volt sobre fondo ink.
 * Ejecutar: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const INK = '#0E0F0C';
const VOLT = '#D4FF3D';

// Rayo (bolt) centrado en un viewBox 512x512, trazado a mano para verse
// nítido en tamaños chicos (favicon) y grandes (512) por igual.
const boltPath =
  'M 268 48 L 120 296 L 224 296 L 200 464 L 392 208 L 280 208 Z';

function iconSvg({ size, padding, background, boltFill, cornerRadius }) {
  const scale = (size - padding * 2) / 512;
  const translate = padding;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${background}" />
  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <path d="${boltPath}" fill="${boltFill}" />
  </g>
</svg>`;
}

const targets = [
  // Íconos "any" — sin relleno extra, el propio OS puede recortarlos.
  { file: 'icon-192x192.png', size: 192, padding: 24, cornerRadius: 0 },
  { file: 'icon-512x512.png', size: 512, padding: 64, cornerRadius: 0 },
  // Maskable — zona segura ampliada para que Android no corte el rayo al enmascarar.
  { file: 'icon-maskable-192x192.png', size: 192, padding: 46, cornerRadius: 0 },
  { file: 'icon-maskable-512x512.png', size: 512, padding: 122, cornerRadius: 0 },
  // Apple touch icon — iOS aplica su propio redondeo, fondo debe ser opaco y sin padding extra.
  { file: 'apple-touch-icon.png', size: 180, padding: 22, cornerRadius: 0 },
  // Favicon
  { file: 'favicon-32x32.png', size: 32, padding: 3, cornerRadius: 0 },
  { file: 'favicon-16x16.png', size: 16, padding: 1, cornerRadius: 0 },
];

for (const t of targets) {
  const svg = iconSvg({
    size: t.size,
    padding: t.padding,
    background: INK,
    boltFill: VOLT,
    cornerRadius: t.cornerRadius,
  });
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, t.file));
  console.log(`✅ ${t.file}`);
}

console.log('\n🎉 Íconos generados en public/icons/');
