<?php
/**
 * Script per copiare storage/app/public in public/storage
 * Eseguire prima del deploy su Vercel
 */

$storagePath = __DIR__ . '/storage/app/public';
$publicStoragePath = __DIR__ . '/public/storage';

if (!is_dir($storagePath)) {
    echo "ERROR: storage/app/public non esiste\n";
    exit(1);
}

// Rimuovi vecchia cartella se esiste
if (is_dir($publicStoragePath)) {
    if (is_link($publicStoragePath)) {
        unlink($publicStoragePath);
    } else {
        removeDir($publicStoragePath);
    }
}

// Crea nuova cartella
mkdir($publicStoragePath, 0777, true);

// Copia i file
echo "Copiando file da storage/app/public a public/storage...\n";
copyDir($storagePath, $publicStoragePath);
echo "Completato!\n";

function copyDir($src, $dest) {
    if (!is_dir($dest)) {
        mkdir($dest, 0777, true);
    }
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    foreach ($iterator as $item) {
        $destPath = $dest . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
        
        if ($item->isDir()) {
            if (!is_dir($destPath)) {
                mkdir($destPath, 0777, true);
            }
        } else {
            copy($item->getPathname(), $destPath);
        }
    }
}

function removeDir($dir) {
    if (!is_dir($dir)) return;
    
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        $path = $dir . '/' . $file;
        is_dir($path) ? removeDir($path) : unlink($path);
    }
    rmdir($dir);
}
