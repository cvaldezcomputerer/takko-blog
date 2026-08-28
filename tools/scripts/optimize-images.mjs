// Prepares blog photos for the build: bakes EXIF orientation, strips GPS,
// resizes anything over 1600px, and converts HEIC (which Astro cannot process)
// to JPEG. Edits files in place.
//
//   node tools/scripts/optimize-images.mjs src/assets/images/blog/<slug>/
//   node tools/scripts/optimize-images.mjs path/to/one.jpg another.png
//
// Accepts any mix of files and folders (folders recurse). A file that is
// already within bounds, GPS-free and upright is left untouched, so re-running
// after adding a few photos only re-encodes the new ones -- JPEG is lossy, and
// reprocessing an unchanged file every run would compound generation loss for
// no gain. This is decided by inspecting each file, so there is no state to go
// stale and folders optimized by earlier versions are correctly skipped.
//
// Flags:
//   --dry-run   report what would change, write nothing
//   --force     re-encode even files that need no changes

import sharp from 'sharp';
import exifReader from 'exif-reader';
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');
const targets = argv.filter((a) => !a.startsWith('--'));

if (targets.length === 0) {
  console.error('❌ Error: Please provide at least one file or folder path.');
  console.error('   node tools/scripts/optimize-images.mjs <file|folder>... [--dry-run] [--force]');
  process.exit(1);
}

const maxDimension = 1600;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.astro']);
const RASTER_RE = /\.(jpe?g|png|webp)$/i;
const HEIC_RE = /\.(heic|heif)$/i;

const stats = { processed: 0, converted: 0, skipped: 0, errors: 0 };

/* ----------------------------------------------------------------- exif */

/**
 * True if the image still carries a GPS block. EXIF hides GPS behind the
 * numeric tag 0x8825 pointing at its own IFD, so the buffer has to be parsed --
 * the ASCII string "GPS" never appears in it.
 */
function hasGps(exifBuffer) {
  if (!exifBuffer) return false;
  try {
    const gps = exifReader(exifBuffer)?.GPSInfo;
    return Boolean(gps && Object.keys(gps).length > 0);
  } catch {
    return false;
  }
}

/**
 * Whether this file would actually change if processed. Re-encoding a photo
 * that is already in bounds, GPS-free and upright only costs a generation of
 * JPEG loss, so the work is decided by inspecting the file rather than by
 * tracking what previous runs did -- no state file to go stale, and folders
 * optimized before this check existed are correctly left alone.
 */
function needsWork(metadata) {
  const oversized = metadata.width > maxDimension || metadata.height > maxDimension;
  const rotated = typeof metadata.orientation === 'number' && metadata.orientation > 1;
  return { oversized, rotated, gps: hasGps(metadata.exif) };
}

function formatExifDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // EXIF DateTimeOriginal is a zone-less wall clock, and exif-reader parses
    // its digits into a Date as if they were UTC. Reading them back with UTC
    // getters round-trips the digits exactly; local getters would silently add
    // the machine's offset (+9h here) every time a file was re-encoded.
    const yyyy = String(value.getUTCFullYear()).padStart(4, '0');
    const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(value.getUTCDate()).padStart(2, '0');
    const hh = String(value.getUTCHours()).padStart(2, '0');
    const min = String(value.getUTCMinutes()).padStart(2, '0');
    const sec = String(value.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}:${mm}:${dd} ${hh}:${min}:${sec}`;
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Rebuild EXIF from scratch with only the tags worth keeping (camera make and
 * model, lens, capture date). Everything else -- crucially the GPS IFD -- is
 * dropped by omission rather than by deletion.
 */
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

  // Lens is only ever present on photos that still carry their original EXIF,
  // so this fills in going forward and cannot recover already-optimized images.
  if (typeof photo?.LensModel === 'string' && photo.LensModel.trim()) {
    ifd2.LensModel = photo.LensModel.trim();
  }
  if (typeof photo?.LensMake === 'string' && photo.LensMake.trim()) {
    ifd2.LensMake = photo.LensMake.trim();
  }

  const exif = {};
  if (Object.keys(ifd0).length > 0) exif.IFD0 = ifd0;
  if (Object.keys(ifd2).length > 0) exif.IFD2 = ifd2;
  return Object.keys(exif).length > 0 ? exif : null;
}

/* ------------------------------------------------------------ processing */

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

/**
 * Decode a HEIC to a temporary JPEG.
 *
 * sharp's prebuilt binaries ship libheif without an HEVC decoder, and iPhone
 * HEICs are HEVC -- `sharp(file).metadata()` still succeeds (it only parses the
 * container header) but any actual decode fails with "Support for this
 * compression format has not been built in". macOS's built-in `sips` decodes
 * HEVC natively, so it is the fallback. sips preserves EXIF, which matters:
 * the JPEG then goes through the normal pipeline and has its GPS stripped.
 */
async function decodeHeic(file, tempJpeg) {
  try {
    await sharp(file).jpeg({ quality: 100 }).toFile(tempJpeg);
    return 'sharp';
  } catch {
    // fall through to sips
  }
  if (process.platform !== 'darwin') {
    throw new Error(
      'cannot decode HEIC (sharp lacks an HEVC decoder and `sips` is macOS-only). ' +
      'Re-export the photo as JPEG.'
    );
  }
  const res = spawnSync('sips', ['-s', 'format', 'jpeg', file, '--out', tempJpeg], { encoding: 'utf-8' });
  if (res.status !== 0 || !fs.existsSync(tempJpeg)) {
    throw new Error(`sips could not decode it: ${(res.stderr || '').trim() || 'unknown error'}`);
  }
  return 'sips';
}

/**
 * HEIC (iPhone's default) cannot be consumed by Astro's image pipeline, so it
 * is transcoded to JPEG beside the original and the original is removed. The
 * post must then reference the new .jpg name -- check-post.mjs will flag the
 * old one as a broken path if it was already referenced.
 */
async function convertHeic(file) {
  const dir = path.dirname(file);
  const base = path.basename(file).replace(HEIC_RE, '');
  let out = path.join(dir, `${base}.jpg`);
  if (fs.existsSync(out)) {
    // Never clobber an existing JPEG that may itself be referenced.
    out = path.join(dir, `${base}-heic.jpg`);
    if (fs.existsSync(out)) {
      console.log(`   ⏭  ${path.basename(file)}: .jpg already exists, skipping`);
      stats.skipped++;
      return;
    }
  }

  if (dryRun) {
    console.log(`   → ${path.basename(file)}: would convert to ${path.basename(out)}`);
    stats.converted++;
    return;
  }

  const tempJpeg = path.join(dir, `.${base}.heic.tmp.jpg`);
  try {
    const decoder = await decodeHeic(file, tempJpeg);

    // Now treat it as a normal photo: bake orientation, resize, rebuild EXIF
    // without the GPS block.
    const image = sharp(tempJpeg);
    const metadata = await image.metadata();
    let pipeline = image.rotate();
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      pipeline = pipeline.resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true });
    }
    const selectedExif = buildSelectedExif(metadata);
    if (selectedExif) pipeline = pipeline.withExif(selectedExif);
    await pipeline.jpeg({ quality: 95 }).toFile(out);

    const originalSize = fs.statSync(file).size;
    const newSize = fs.statSync(out).size;
    fs.unlinkSync(file);
    console.log(
      `   🔄 ${path.basename(file)} → ${path.basename(out)} ` +
      `(${mb(originalSize)}MB → ${mb(newSize)}MB, via ${decoder})`
    );
    console.log(`      ↳ update the post to reference ${path.basename(out)}`);
    stats.converted++;
  } finally {
    if (fs.existsSync(tempJpeg)) fs.unlinkSync(tempJpeg);
  }
}

async function processRaster(file) {
  const name = path.basename(file);
  const ext = path.extname(name).toLowerCase();

  const image = sharp(file);
  const metadata = await image.metadata();
  const { oversized, rotated, gps } = needsWork(metadata);
  const needsResize = oversized;

  if (!force && !oversized && !rotated && !gps) {
    stats.skipped++;
    return;
  }

  if (dryRun) {
    const why = [
      oversized && `resize (${metadata.width}×${metadata.height})`,
      gps && 'strip GPS',
      rotated && 'bake orientation',
    ].filter(Boolean).join(', ');
    console.log(`   → ${name}: would ${why || 're-encode (forced)'}`);
    stats.processed++;
    return;
  }

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
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: 90 });
  } else {
    pipeline = pipeline.jpeg({ quality: 95 });
  }

  const tempPath = file + '.tmp';
  await pipeline.toFile(tempPath);

  const originalSize = fs.statSync(file).size;
  const newSize = fs.statSync(tempPath).size;

  fs.unlinkSync(file);
  fs.renameSync(tempPath, file);

  const action = needsResize ? 'resized + GPS stripped' : 'GPS stripped';
  console.log(`   ✅ ${name}: ${action} (${mb(originalSize)}MB → ${mb(newSize)}MB)`);
  stats.processed++;
}

/** Expand a file or folder argument into a flat list of image paths. */
function collectFiles(target) {
  const found = [];
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (RASTER_RE.test(target) || HEIC_RE.test(target)) found.push(path.resolve(target));
    else console.error(`   ⚠️  Not an image, ignoring: ${target}`);
    return found;
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (RASTER_RE.test(entry.name) || HEIC_RE.test(entry.name)) {
        found.push(path.resolve(full));
      }
    }
  };
  walk(target);
  return found;
}

/* -------------------------------------------------------------------- main */

const files = [];
for (const target of targets) {
  if (!fs.existsSync(target)) {
    console.error(`❌ Not found: ${target}`);
    stats.errors++;
    continue;
  }
  files.push(...collectFiles(target));
}

// Group by folder purely so the output reads as one section per folder.
/** @type {Map<string, string[]>} */
const byDir = new Map();
for (const file of files) {
  const dir = path.dirname(file);
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(file);
}

if (dryRun) console.log('Dry run — no files will be written.\n');

for (const [dir, dirFiles] of byDir) {
  const before = { ...stats };
  console.log(`${path.relative(process.cwd(), dir) || '.'}/`);

  for (const file of dirFiles.sort()) {
    try {
      if (HEIC_RE.test(file)) await convertHeic(file);
      else await processRaster(file);
    } catch (error) {
      console.error(`   ❌ Error on ${path.basename(file)}:`, error.message);
      if (fs.existsSync(file + '.tmp')) fs.unlinkSync(file + '.tmp');
      stats.errors++;
    }
  }

  const touched = stats.processed + stats.converted - before.processed - before.converted;
  const skipped = stats.skipped - before.skipped;
  if (touched === 0) console.log(`   (nothing to do — ${skipped} already optimized)`);
  else if (skipped > 0) console.log(`   (${skipped} already optimized, skipped)`);
}

console.log(
  `\nDone: ${stats.processed} processed, ${stats.converted} converted, ` +
  `${stats.skipped} skipped, ${stats.errors} errors.`
);
process.exit(stats.errors > 0 ? 1 : 0);
