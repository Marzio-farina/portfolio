#!/usr/bin/env node

/**
 * Script per copiare storage/app/public in public/storage
 * Eseguito durante il build di Vercel (Node.js disponibile)
 * Usa ES modules (compatibile con package.json "type": "module")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'storage', 'app', 'public');
const targetDir = path.join(__dirname, 'public', 'storage');

function copyDir(src, dest) {
  // Crea la cartella di destinazione se non esiste
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Leggi i file nella cartella sorgente
  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      // Se è una cartella, copia ricorsivamente
      copyDir(srcPath, destPath);
    } else {
      // Se è un file, copialo
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  if (!fs.existsSync(sourceDir)) {
    console.log('⚠️  storage/app/public non esiste, niente da copiare');
    process.exit(0);
  }

  console.log('📋 Copiando file da storage/app/public a public/storage...');
  copyDir(sourceDir, targetDir);
  console.log('✅ Copia completata!');
} catch (error) {
  console.error('❌ Errore durante la copia:', error.message);
  process.exit(1);
}
