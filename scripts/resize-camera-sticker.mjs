import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function getArg(name, fallback) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const input = getArg('in', '');
const outputArg = getArg('out', '');
const width = Number(getArg('width', '128'));
const quality = Number(getArg('quality', '70'));
const effort = Number(getArg('effort', '5'));

if (!input) {
  console.error('Usage: node scripts/resize-camera-sticker.mjs --in <file.webp> [--out <file.webp>] [--width 128] [--quality 70] [--effort 5]');
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}

const finalOut = outputArg || input;
const tempOut = path.join(path.dirname(finalOut), `${path.basename(finalOut, path.extname(finalOut))}.tmp${path.extname(finalOut)}`);

const beforeSize = fs.statSync(input).size;
const image = sharp(input, { animated: true });
const metadata = await image.metadata();

const frameHeight = metadata.pageHeight || Math.floor((metadata.height || 0) / (metadata.pages || 1));
const frameWidth = metadata.width || 0;

const pipeline = image
  .resize({
    width,
    fit: 'inside',
    withoutEnlargement: true,
  })
  .webp({
    quality,
    effort,
  });

if (outputArg && finalOut !== input) {
  if (fs.existsSync(finalOut)) fs.rmSync(finalOut, { force: true });
  await pipeline.toFile(finalOut);
} else {
  await pipeline.toFile(tempOut);

  try {
    if (fs.existsSync(finalOut)) fs.rmSync(finalOut, { force: true });
    fs.renameSync(tempOut, finalOut);
  } catch (error) {
    try {
      fs.copyFileSync(tempOut, finalOut);
      fs.rmSync(tempOut, { force: true });
    } catch (copyError) {
      console.error(`Failed to write output to ${finalOut}`);
      console.error(error);
      console.error(copyError);
      console.error(`Temporary file kept at: ${tempOut}`);
      process.exit(1);
    }
  }
}

const afterMeta = await sharp(finalOut, { animated: true }).metadata();
const afterSize = fs.statSync(finalOut).size;

const outFrameHeight = afterMeta.pageHeight || Math.floor((afterMeta.height || 0) / (afterMeta.pages || 1));

console.log(JSON.stringify({
  input,
  output: finalOut,
  before: {
    bytes: beforeSize,
    kb: Number((beforeSize / 1024).toFixed(1)),
    frameWidth,
    frameHeight,
    frames: metadata.pages || 1,
  },
  after: {
    bytes: afterSize,
    kb: Number((afterSize / 1024).toFixed(1)),
    frameWidth: afterMeta.width || 0,
    frameHeight: outFrameHeight,
    frames: afterMeta.pages || 1,
  },
  savedBytes: beforeSize - afterSize,
  savedPercent: Number((((beforeSize - afterSize) / beforeSize) * 100).toFixed(1)),
}, null, 2));
