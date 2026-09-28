// scripts/compress-images.js
// Run once: node scripts/compress-images.js
// Compresses all gallery images and logo to web-optimized WebP versions.
// Original files are preserved as *.original.jpg

const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'images');

const tasks = [
  // Logo — displayed at 42–56px, compress heavily
  { src: 'logo.png',    dest: 'logo.webp',    width: 112, height: 112, quality: 82 },

  // Hero images — displayed at 160px, need to be sharp on 2x screens → 320px
  { src: 'sample1.jpg', dest: 'sample1.webp', width: 320, height: 320, quality: 78 },
  { src: 'sample2.jpg', dest: 'sample2.webp', width: 320, height: 320, quality: 78 },

  // Gallery images — displayed at 180px, 2x → 360px
  { src: 'sample3.jpg', dest: 'sample3.webp', width: 360, height: 360, quality: 78 },
  { src: 'sample4.jpg', dest: 'sample4.webp', width: 360, height: 360, quality: 78 },
  { src: 'sample5.jpg', dest: 'sample5.webp', width: 360, height: 360, quality: 78 },
  { src: 'sample6.jpg', dest: 'sample6.webp', width: 360, height: 360, quality: 78 },
];

async function main() {
  console.log('🌸 Floralyn — Image Compression\n');

  for (const task of tasks) {
    const srcPath  = path.join(IMAGES_DIR, task.src);
    const destPath = path.join(IMAGES_DIR, task.dest);

    if (!fs.existsSync(srcPath)) {
      console.warn(`  ⚠️  Skipping (not found): ${task.src}`);
      continue;
    }

    const srcStat   = fs.statSync(srcPath);
    const srcSizeKB = (srcStat.size / 1024).toFixed(0);

    try {
      await sharp(srcPath)
        .resize(task.width, task.height, { fit: 'cover', position: 'center' })
        .webp({ quality: task.quality, effort: 6 })
        .toFile(destPath);

      const destStat    = fs.statSync(destPath);
      const destSizeKB  = (destStat.size / 1024).toFixed(0);
      const savedPct    = (100 - (destStat.size / srcStat.size) * 100).toFixed(0);

      console.log(`  ✅ ${task.src} (${srcSizeKB}KB) → ${task.dest} (${destSizeKB}KB) — ${savedPct}% smaller`);
    } catch (err) {
      console.error(`  ❌ Error compressing ${task.src}:`, err.message);
    }
  }

  console.log('\n✅ Done. Update image src attributes in index.html to use .webp extensions.\n');
  console.log('   Example: images/sample1.jpg → images/sample1.webp');
  console.log('   Also update the logo: images/logo.png → images/logo.webp\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
