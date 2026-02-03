import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const rootFolder = process.argv[2];

if (!rootFolder) {
  console.error('❌ Error: Please provide a folder path.');
  process.exit(1);
}

const maxDimension = 1600;
const jpegQuality = 90;
const pngCompressionLevel = 9;
let stats = { processed: 0, skipped: 0, errors: 0 };

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
    } 
    // WARNING: This still ignores HEIC. Export as JPEG from iPhone first!
    else if (item.isFile() && item.name.match(/\.(jpg|jpeg|png)$/i)) {
      try {
        const image = sharp(fullPath);
        const metadata = await image.metadata();
        const ext = path.extname(item.name).toLowerCase();
        
        // 1. Check size logic remains the same
        if (metadata.width <= maxDimension && metadata.height <= maxDimension) {
          stats.skipped++;
          continue;
        }

        // 2. CRITICAL FIX: .rotate() 
        // This ensures iPhone portrait photos don't turn sideways 
        // when we strip the metadata later.
        let pipeline = image.rotate().resize({ 
          width: maxDimension, 
          height: maxDimension, 
          fit: 'inside',
          withoutEnlargement: true 
        });

        if (ext === '.png') {
          pipeline = pipeline.png({ compressionLevel: pngCompressionLevel });
        } else {
          // mozjpeg is great, but ensure .rotate() happened first!
          pipeline = pipeline.jpeg({ quality: jpegQuality, mozjpeg: true });
        }

        // 3. Save to temp
        const tempPath = fullPath + '.tmp';
        await pipeline.toFile(tempPath);
        
        const originalSize = fs.statSync(fullPath).size;
        const newSize = fs.statSync(tempPath).size;
        
        // 4. Overwrite (Safe because temp file was successfully created)
        fs.unlinkSync(fullPath);
        fs.renameSync(tempPath, fullPath);
        
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        console.log(`   ✅ ${item.name}: ${metadata.width}x${metadata.height} → ≤${maxDimension}px (${savings}% smaller)`);
        stats.processed++;

      } catch (error) {
        console.error(`   ❌ Error on ${item.name}:`, error.message);
        // Clean up temp file if it exists so we don't leave garbage
        if (fs.existsSync(fullPath + '.tmp')) fs.unlinkSync(fullPath + '.tmp');
        stats.errors++;
      }
    }
  }
}

walkAndProcess(rootFolder);
