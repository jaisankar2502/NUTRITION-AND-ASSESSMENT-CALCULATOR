import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svg = readFileSync(path.join(__dirname, 'icon-source.svg'));

const maskableSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0d9488"/>
  <g transform="translate(76.8 76.8) scale(0.7)">
    ${readFileSync(path.join(__dirname, 'icon-source.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`);

const targets = [
  { file: 'pwa-64x64.png', size: 64, src: svg },
  { file: 'pwa-192x192.png', size: 192, src: svg },
  { file: 'pwa-512x512.png', size: 512, src: svg },
  { file: 'maskable-icon-512x512.png', size: 512, src: maskableSvg },
  { file: 'apple-touch-icon.png', size: 180, src: svg },
  { file: 'favicon.png', size: 48, src: svg },
];

for (const t of targets) {
  await sharp(t.src).resize(t.size, t.size).png().toFile(path.join(root, 'public', t.file));
  console.log('wrote', t.file);
}

// favicon.ico (multi-size) via png fallback is fine for modern browsers; write a 32px favicon too
await sharp(svg).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon-32x32.png'));
console.log('done');
