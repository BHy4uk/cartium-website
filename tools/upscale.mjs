// Enlarge a small product photo for the site: Lanczos resampling, then a light sharpen, so it stays
// crisp where the browser would otherwise stretch it soft. Alpha is kept.
//
//   node tools/upscale.mjs <in.png> <out.png> [scale]
import sharp from 'sharp';

const [input, output, scaleArg = '3'] = process.argv.slice(2);
if (!input || !output) {
  console.log('usage: node tools/upscale.mjs <in.png> <out.png> [scale]');
  process.exit(1);
}
const scale = Number(scaleArg);
const { width, height } = await sharp(input).metadata();
const info = await sharp(input)
  .resize(Math.round(width * scale), Math.round(height * scale), { kernel: 'lanczos3' })
  .sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`${output}: ${info.width}x${info.height}`);
