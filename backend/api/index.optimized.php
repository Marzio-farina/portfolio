<?php

chdir(dirname(__DIR__));

// diagnostica facoltativa
if (isset($_GET['diag'])) {
    header('Content-Type: application/json');
    $root = getcwd();
    echo json_encode([
        'cwd' => $root,
        'exists_routes_api'    => file_exists($root.'/routes/api.php'),
        'exists_bootstrap_app' => file_exists($root.'/bootstrap/app.php'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Disabilita debug in produzione per migliorare performance
if (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG'] === 'false') {
    error_reporting(E_ERROR | E_WARNING | E_PARSE);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// Ottimizzazione cache per serverless
// Mantiene cache valida per 1 ora invece di rimuoverla sempre
$cacheDir = __DIR__.'/../bootstrap/cache';
$cacheConfigFile = $cacheDir.'/config.php';

// Rimuovi cache solo se:
// 1. Non esiste
// 2. È più vecchia di 1 ora (3600 secondi)
if (file_exists($cacheConfigFile)) {
    $cacheTime = filemtime($cacheConfigFile);
    $cacheAge = time() - $cacheTime;
    
    // Se la cache è valida (< 1 ora), mantienila
    if ($cacheAge < 3600) {
        // Cache valida, mantieni solo file necessari
        // Rimuovi solo cache potenzialmente stale
        $staleFiles = [
            $cacheDir.'/routes-v7.php',
            $cacheDir.'/routes.php',
        ];
        
        foreach ($staleFiles as $file) {
            if (file_exists($file)) {
                $fileTime = filemtime($file);
                // Rimuovi solo se più vecchio di 1 ora
                if (time() - $fileTime > 3600) {
                    @unlink($file);
                }
            }
        }
    } else {
        // Cache troppo vecchia (> 1 ora), rimuovila
        @unlink($cacheConfigFile);
        @unlink($cacheDir.'/routes-v7.php');
        @unlink($cacheDir.'/routes.php');
        @unlink($cacheDir.'/events.php');
        @unlink($cacheDir.'/packages.php');
        @unlink($cacheDir.'/services.php');
    }
} else {
    // Cache non esiste, rimuovi tutte le cache stale
    @unlink($cacheDir.'/routes-v7.php');
    @unlink($cacheDir.'/routes.php');
    @unlink($cacheDir.'/config.php');
    @unlink($cacheDir.'/events.php');
    @unlink($cacheDir.'/packages.php');
    @unlink($cacheDir.'/services.php');
}

// Avvia Laravel dal front controller ufficiale
require __DIR__.'/../public/index.php';

