import sharp from 'sharp';
import exifReader from 'exif-reader';
import fs from 'fs';
import path from 'path';

const rootFolder = process.argv[2];

if (!rootFolder) {
  console.error('❌ Error: Please provide a folder path.');
  process.exit(1);
}

const maxDimension = 1600;
let stats = { processed: 0, errors: 0 };

function formatExifDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yyyy = String(value.getFullYear()).padStart(4, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    const hh = String(value.getHours()).padStart(2, '0');
    const min = String(value.getMinutes()).padStart(2, '0');
    const sec = String(value.getSeconds()).padStart(2, '0');
    return `${yyyy}:${mm}:${dd} ${hh}:${min}:${sec}`;
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildSelectedExif(metadata) {
  if (!metadata.exif) return null;

  let parsed;
  try {
    parsed = exifReader(metadata.exif);
  } catch {
    return null;
  }

  const image = parsed?.Image ?? parsed?.image;
  const photo = parsed?.Photo ?? parsed?.photo ?? parsed?.Exif ?? parsed?.exif;

  const ifd0 = {};
  const ifd2 = {};

  if (typeof image?.Make === 'string' && image.Make.trim()) {
    ifd0.Make = image.Make.trim();
  }
  if (typeof image?.Model === 'string' && image.Model.trim()) {
    ifd0.Model = image.Model.trim();
  }

  const dateTimeOriginal = formatExifDate(photo?.DateTimeOriginal);
  if (dateTimeOriginal) {
    ifd2.DateTimeOriginal = dateTimeOriginal;
  }

  const exif = {};
  if (Object.keys(ifd0).length > 0) exif.IFD0 = ifd0;
  if (Object.keys(ifd2).length > 0) exif.IFD2 = ifd2;
  return Object.keys(exif).length > 0 ? exif : null;
}

async function walkAndProcess(currentDir) {
  let items;
  try {
    items = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch (error) {
    console.error(`   ❌ Cannot read directory ${currentDir}:`, error.message);
    return;
  }

  for (const item of items) {
    const fullPath = path.join(currentDir, item.name);

    if (item.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.astro'].includes(item.name)) {
        await walkAndProcess(fullPath);
      }
    } else if (item.isFile() && item.name.match(/\.(jpg|jpeg|png)$/i)) {
      try {
        const image = sharp(fullPath);
        const metadata = await image.metadata();
        const ext = path.extname(item.name).toLowerCase();
        const needsResize = metadata.width > maxDimension || metadata.height > maxDimension;

        // Always bake orientation and strip GPS. Resize only if over the limit.
        let pipeline = image.rotate();

        if (needsResize) {
          pipeline = pipeline.resize({
            width: maxDimension,
            height: maxDimension,
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        const selectedExif = buildSelectedExif(metadata);
        if (selectedExif) {
          pipeline = pipeline.withExif(selectedExif);
        }

        if (ext === '.png') {
          pipeline = pipeline.png({ compressionLevel: 6 });
        } else {
          pipeline = pipeline.jpeg({ quality: 95 });
        }

        const tempPath = fullPath + '.tmp';
        await pipeline.toFile(tempPath);

        const originalSize = fs.statSync(fullPath).size;
        const newSize = fs.statSync(tempPath).size;

        fs.unlinkSync(fullPath);
        fs.renameSync(tempPath, fullPath);

        const action = needsResize ? 'resized + GPS stripped' : 'GPS stripped';
        console.log(`   ✅ ${item.name}: ${action} (${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(newSize / 1024 / 1024).toFixed(1)}MB)`);
        stats.processed++;

      } catch (error) {
        console.error(`   ❌ Error on ${item.name}:`, error.message);
        if (fs.existsSync(fullPath + '.tmp')) fs.unlinkSync(fullPath + '.tmp');
        stats.errors++;
      }
    }
  }
}

await walkAndProcess(rootFolder);
console.log(`\nDone: ${stats.processed} processed, ${stats.errors} errors`);
