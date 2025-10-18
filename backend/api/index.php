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

// rimuovi cache stale in runtime serverless
$cacheDir = __DIR__.'/../bootstrap/cache';
@unlink($cacheDir.'/routes-v7.php');
@unlink($cacheDir.'/routes.php');
@unlink($cacheDir.'/config.php');
@unlink($cacheDir.'/events.php');
@unlink($cacheDir.'/packages.php');
@unlink($cacheDir.'/services.php');

// Avvia Laravel dal front controller ufficiale
require __DIR__.'/../public/index.php';