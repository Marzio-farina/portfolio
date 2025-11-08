/**
 * Script di compressione automatica degli asset
 * Riduce drasticamente il cached egress comprimendo immagini e video
 * 
 * Uso: node scripts/compress-assets.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configurazione
const CONFIG = {
  images: {
    webp: { quality: 80 },
    png: { compressionLevel: 9 },
    jpg: { quality: 85, progressive: true }
  },
  paths: {
    assets: path.join(__dirname, '../public/assets'),
    backend: path.join(__dirname, '../../backend/storage/app/public')
  }
};

// Statistiche globali
const stats = {
  processed: 0,
  errors: 0,
  originalSize: 0,
  compressedSize: 0,
  files: []
};

/**
 * Formatta bytes in formato leggibile
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calcola percentuale di risparmio
 */
function calculateSavings(original, compressed) {
  const savings = ((original - compressed) / original * 100).toFixed(1);
  return savings;
}

/**
 * Comprimi immagine PNG → WebP
 */
async function compressPngToWebp(inputPath) {
  const dir = path.dirname(inputPath);
  const filename = path.basename(inputPath, '.png');
  const outputPath = path.join(dir, `${filename}.webp`);
  
  console.log(`📸 Compressione: ${path.basename(inputPath)} → ${filename}.webp`);
  
  try {
    const originalStats = await fs.stat(inputPath);
    
    await sharp(inputPath)
      .webp(CONFIG.images.webp)
      .toFile(outputPath);
    
    const compressedStats = await fs.stat(outputPath);
    
    const savings = calculateSavings(originalStats.size, compressedStats.size);
    
    stats.processed++;
    stats.originalSize += originalStats.size;
    stats.compressedSize += compressedStats.size;
    stats.files.push({
      original: path.basename(inputPath),
      compressed: path.basename(outputPath),
      originalSize: formatBytes(originalStats.size),
      compressedSize: formatBytes(compressedStats.size),
      savings: `${savings}%`
    });
    
    console.log(`   ✅ ${formatBytes(originalStats.size)} → ${formatBytes(compressedStats.size)} (${savings}% risparmio)`);
    
    return outputPath;
  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}`);
    stats.errors++;
    return null;
  }
}

/**
 * Comprimi immagine JPG → WebP
 */
async function compressJpgToWebp(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const filename = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${filename}.webp`);
  
  console.log(`📸 Compressione: ${path.basename(inputPath)} → ${filename}.webp`);
  
  try {
    const originalStats = await fs.stat(inputPath);
    
    await sharp(inputPath)
      .webp(CONFIG.images.webp)
      .toFile(outputPath);
    
    const compressedStats = await fs.stat(outputPath);
    
    const savings = calculateSavings(originalStats.size, compressedStats.size);
    
    stats.processed++;
    stats.originalSize += originalStats.size;
    stats.compressedSize += compressedStats.size;
    stats.files.push({
      original: path.basename(inputPath),
      compressed: path.basename(outputPath),
      originalSize: formatBytes(originalStats.size),
      compressedSize: formatBytes(compressedStats.size),
      savings: `${savings}%`
    });
    
    console.log(`   ✅ ${formatBytes(originalStats.size)} → ${formatBytes(compressedStats.size)} (${savings}% risparmio)`);
    
    return outputPath;
  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}`);
    stats.errors++;
    return null;
  }
}

/**
 * Ottimizza WebP esistenti (ricompressione)
 */
async function optimizeWebp(inputPath) {
  const tempPath = inputPath + '.tmp';
  
  console.log(`🔧 Ottimizzazione: ${path.basename(inputPath)}`);
  
  try {
    const originalStats = await fs.stat(inputPath);
    
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(tempPath);
    
    const compressedStats = await fs.stat(tempPath);
    
    // Solo se effettivamente più piccolo
    if (compressedStats.size < originalStats.size) {
      await fs.rename(tempPath, inputPath);
      
      const savings = calculateSavings(originalStats.size, compressedStats.size);
      
      stats.processed++;
      stats.originalSize += originalStats.size;
      stats.compressedSize += compressedStats.size;
      stats.files.push({
        original: path.basename(inputPath),
        compressed: path.basename(inputPath) + ' (ottimizzato)',
        originalSize: formatBytes(originalStats.size),
        compressedSize: formatBytes(compressedStats.size),
        savings: `${savings}%`
      });
      
      console.log(`   ✅ ${formatBytes(originalStats.size)} → ${formatBytes(compressedStats.size)} (${savings}% risparmio)`);
    } else {
      await fs.unlink(tempPath);
      console.log(`   ℹ️  Già ottimizzato`);
    }
    
    return inputPath;
  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}`);
    stats.errors++;
    // Cleanup
    try { await fs.unlink(tempPath); } catch {}
    return null;
  }
}

/**
 * Scansiona directory ricorsivamente
 */
async function scanDirectory(dir, extensions) {
  const files = [];
  
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        const subFiles = await scanDirectory(fullPath, extensions);
        files.push(...subFiles);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`⚠️  Errore scansione ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Avvio compressione asset...\n');
  
  // 1. Comprimi PNG → WebP (frontend)
  console.log('📁 Frontend Assets - PNG → WebP');
  const frontendPngs = await scanDirectory(CONFIG.paths.assets, ['.png']);
  for (const png of frontendPngs) {
    // Skip se esiste già webp
    const webpPath = png.replace('.png', '.webp');
    try {
      await fs.access(webpPath);
      console.log(`   ⏭️  Skip ${path.basename(png)} (WebP già esistente)`);
    } catch {
      await compressPngToWebp(png);
    }
  }
  
  console.log('');
  
  // 2. Comprimi JPG → WebP (backend)
  console.log('📁 Backend Storage - JPG → WebP');
  const backendJpgs = await scanDirectory(CONFIG.paths.backend, ['.jpg', '.jpeg']);
  for (const jpg of backendJpgs) {
    const webpPath = jpg.replace(/\.jpe?g$/i, '.webp');
    try {
      await fs.access(webpPath);
      console.log(`   ⏭️  Skip ${path.basename(jpg)} (WebP già esistente)`);
    } catch {
      await compressJpgToWebp(jpg);
    }
  }
  
  console.log('');
  
  // 3. Ottimizza WebP esistenti (backend)
  console.log('📁 Backend Storage - Ottimizzazione WebP');
  const backendWebps = await scanDirectory(CONFIG.paths.backend, ['.webp']);
  for (const webp of backendWebps) {
    await optimizeWebp(webp);
  }
  
  console.log('');
  
  // Report finale
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 REPORT COMPRESSIONE ASSET');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ File processati:     ${stats.processed}`);
  console.log(`❌ Errori:              ${stats.errors}`);
  console.log(`📦 Dimensione originale: ${formatBytes(stats.originalSize)}`);
  console.log(`📦 Dimensione compressa: ${formatBytes(stats.compressedSize)}`);
  console.log(`💾 Risparmio totale:     ${formatBytes(stats.originalSize - stats.compressedSize)} (${calculateSavings(stats.originalSize, stats.compressedSize)}%)`);
  console.log('═══════════════════════════════════════════════════');
  
  if (stats.files.length > 0) {
    console.log('\n📋 Dettaglio file processati:');
    console.table(stats.files);
  }
  
  // Salva report JSON
  const reportPath = path.join(__dirname, '../compression-report.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: {
        processed: stats.processed,
        errors: stats.errors,
        originalSize: stats.originalSize,
        compressedSize: stats.compressedSize,
        savings: calculateSavings(stats.originalSize, stats.compressedSize)
      },
      files: stats.files
    }, null, 2)
  );
  
  console.log(`\n💾 Report salvato in: ${reportPath}`);
  console.log('\n✨ Compressione completata!');
}

// Esegui
main().catch(error => {
  console.error('💥 Errore fatale:', error);
  process.exit(1);
});

