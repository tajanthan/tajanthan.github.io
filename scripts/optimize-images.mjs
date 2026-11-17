import sharp from 'sharp';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'images', 'avatar.jpg');
const output = join(root, 'images', 'portrait.webp');

await sharp(source)
  .rotate()
  .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(output);

console.log('Optimized images/portrait.webp from images/avatar.jpg');
