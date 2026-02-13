import sharp from 'sharp';

const jobs = [
  { input: 'public/favicon.svg', output: 'public/favicon-16x16.png', size: 16 },
  { input: 'public/favicon.svg', output: 'public/favicon-32x32.png', size: 32 },
  { input: 'public/favicon.svg', output: 'public/favicon.png', size: 32 },
  { input: 'public/favicon-dark.svg', output: 'public/favicon-dark.png', size: 32 },
  { input: 'public/favicon.svg', output: 'public/apple-touch-icon.png', size: 180 },
  { input: 'public/favicon.svg', output: 'public/android-chrome-192x192.png', size: 192 },
  { input: 'public/favicon.svg', output: 'public/android-chrome-512x512.png', size: 512 },
  { input: 'public/favicon.svg', output: 'public/favicon_512.png', size: 512 }
];

for (const job of jobs) {
  await sharp(job.input, { density: 1024 })
    .resize(job.size, job.size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toFile(job.output);
}

console.log(`Generated ${jobs.length} favicon files.`);
