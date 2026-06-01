// Generates PWA icons from public/icon.svg using sharp.
// Run: node scripts/generate-icons.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '../public/icon.svg');
const OUT = path.join(__dirname, '../public');

async function generate() {
  // Standard icon (rounded corners in SVG, browser clips as needed)
  await sharp(SRC).resize(192, 192).png().toFile(path.join(OUT, 'pwa-192x192.png'));
  console.log('  pwa-192x192.png');

  await sharp(SRC).resize(512, 512).png().toFile(path.join(OUT, 'pwa-512x512.png'));
  console.log('  pwa-512x512.png');

  // Maskable: full bleed (no rounded corners) — SVG already fills the square
  const maskableSvg = fs.readFileSync(SRC, 'utf8')
    .replace(/rx="96"/, 'rx="0"');
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png()
    .toFile(path.join(OUT, 'pwa-maskable-512x512.png'));
  console.log('  pwa-maskable-512x512.png');

  await sharp(Buffer.from(maskableSvg)).resize(192, 192).png()
    .toFile(path.join(OUT, 'pwa-maskable-192x192.png'));
  console.log('  pwa-maskable-192x192.png');

  // Also favicon
  await sharp(SRC).resize(64, 64).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('  favicon.png');

  console.log('Icons generated.');
}

generate().catch((err) => { console.error(err); process.exit(1); });
