/**
 * Script per scaricare i font Three.js localmente
 * Evita chiamate esterne e riduce cached egress
 * 
 * Uso: node scripts/download-threejs-fonts.js
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const FONTS = [
  {
    name: 'droid_sans_bold',
    url: 'https://threejs.org/examples/fonts/droid/droid_sans_bold.typeface.json'
  },
  {
    name: 'gentilis_bold',
    url: 'https://threejs.org/examples/fonts/gentilis_bold.typeface.json'
  }
];

const OUTPUT_DIR = path.join(__dirname, '../public/assets/fonts');

/**
 * Download file con progress
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Download: ${url}`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      let data = '';
      let size = 0;
      
      response.on('data', (chunk) => {
        data += chunk;
        size += chunk.length;
        process.stdout.write(`\r   Progress: ${(size / 1024).toFixed(2)} KB`);
      });
      
      response.on('end', async () => {
        try {
          await fs.writeFile(outputPath, data);
          console.log(`\n   ✅ Salvato: ${path.basename(outputPath)} (${(size / 1024).toFixed(2)} KB)`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
    }).on('error', reject);
  });
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Download font Three.js...\n');
  
  // Crea directory se non esiste
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Directory creata: ${OUTPUT_DIR}\n`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  
  // Download fonts
  for (const font of FONTS) {
    const outputPath = path.join(OUTPUT_DIR, `${font.name}.typeface.json`);
    
    try {
      // Check se già esiste
      await fs.access(outputPath);
      console.log(`⏭️  Skip: ${font.name} (già esistente)\n`);
    } catch {
      await downloadFile(font.url, outputPath);
      console.log('');
    }
  }
  
  console.log('✨ Download completato!');
  console.log('\n📝 Prossimi step:');
  console.log('   1. Aggiorna three-text-3d.component.ts per usare i font locali');
  console.log('   2. Cambia URL da https://threejs.org/... a /assets/fonts/...');
}

main().catch(error => {
  console.error('💥 Errore:', error.message);
  process.exit(1);
});

