/**
 * Script per compressione video - riduce dimensioni e bandwidth
 * 
 * Usa ffmpeg per comprimere video MP4 con qualità ottimizzata
 * Uso: node scripts/compress-videos.js
 * 
 * Prerequisiti: ffmpeg installato
 * Windows: choco install ffmpeg
 * Mac: brew install ffmpeg
 * Linux: sudo apt install ffmpeg
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const VIDEO_DIR = path.join(__dirname, '../public/assets/videos');

// Configurazione compressione
const FFMPEG_OPTS = [
  '-c:v libx264',           // Codec H.264
  '-crf 28',                // Quality (18-28: 28=più compresso, 18=alta qualità)
  '-preset slow',           // Preset slow per migliore compressione
  '-profile:v baseline',    // Compatibilità max browser
  '-level 3.0',
  '-movflags +faststart',   // Streaming ottimizzato
  '-pix_fmt yuv420p',       // Compatibilità max
  '-vf scale=1280:-2',      // Max width 1280px (mantiene aspect ratio)
  '-c:a aac',               // Codec audio
  '-b:a 128k',              // Bitrate audio ridotto
  '-ac 2'                   // Stereo
].join(' ');

/**
 * Check se ffmpeg è installato
 */
async function checkFfmpeg() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprimi video
 */
async function compressVideo(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const filename = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${filename}-compressed${ext}`);
  
  console.log(`🎬 Compressione: ${path.basename(inputPath)}`);
  
  try {
    const originalStats = await fs.stat(inputPath);
    
    // Comando ffmpeg
    const cmd = `ffmpeg -i "${inputPath}" ${FFMPEG_OPTS} "${outputPath}" -y`;
    
    console.log(`   ⏳ Compressione in corso...`);
    await execAsync(cmd);
    
    const compressedStats = await fs.stat(outputPath);
    
    const originalSize = originalStats.size;
    const compressedSize = compressedStats.size;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`   ✅ ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savings}% risparmio)`);
    console.log(`   📁 Output: ${path.basename(outputPath)}\n`);
    
    return {
      original: path.basename(inputPath),
      compressed: path.basename(outputPath),
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      savings: `${savings}%`
    };
  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}\n`);
    return null;
  }
}

/**
 * Formatta bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Main
 */
async function main() {
  console.log('🎬 Compressione Video\n');
  
  // Check ffmpeg
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    console.error('❌ ffmpeg non trovato!');
    console.log('\n📦 Installa ffmpeg:');
    console.log('   Windows: choco install ffmpeg');
    console.log('   Mac: brew install ffmpeg');
    console.log('   Linux: sudo apt install ffmpeg\n');
    process.exit(1);
  }
  
  console.log('✅ ffmpeg trovato\n');
  
  // Trova video
  const files = await fs.readdir(VIDEO_DIR);
  const videos = files.filter(f => 
    f.endsWith('.mp4') && 
    !f.includes('-compressed') // Skip già compressi
  );
  
  if (videos.length === 0) {
    console.log('ℹ️  Nessun video da comprimere');
    return;
  }
  
  console.log(`📹 Video trovati: ${videos.length}\n`);
  
  const results = [];
  
  for (const video of videos) {
    const videoPath = path.join(VIDEO_DIR, video);
    const result = await compressVideo(videoPath);
    if (result) results.push(result);
  }
  
  // Report
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 REPORT COMPRESSIONE VIDEO');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Video processati: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n📋 Dettaglio:');
    console.table(results);
    
    console.log('\n📝 Prossimi step:');
    console.log('   1. Verifica qualità video compressi');
    console.log('   2. Se ok, sostituisci originali con compressi');
    console.log('   3. Aggiorna riferimenti nel codice');
  }
  
  console.log('\n✨ Completato!');
}

main().catch(error => {
  console.error('💥 Errore:', error);
  process.exit(1);
});

