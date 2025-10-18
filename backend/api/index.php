<?php

chdir(dirname(__DIR__));

// --- DIAGNOSTICA: https://api.marziofarina.it/?diag=1 ---
if (isset($_GET['diag'])) {
    header('Content-Type: application/json');
    $root  = getcwd();
    $cache = $root . '/bootstrap/cache';
    $routesFileV7 = $cache . '/routes-v7.php';
    $routesFile   = $cache . '/routes.php';
    $configFile   = $cache . '/config.php';
    echo json_encode([
        'cwd' => $root,
        'exists_routes_api'      => file_exists($root . '/routes/api.php'),
        'exists_web_php'         => file_exists($root . '/routes/web.php'),
        'exists_bootstrap_app'   => file_exists($root . '/bootstrap/app.php'),
        'cache_routes_v7_exists' => file_exists($routesFileV7),
        'cache_routes_exists'    => file_exists($routesFile),
        'cache_config_exists'    => file_exists($configFile),
        'routes_api_head' => file_exists($root . '/routes/api.php')
            ? substr(file_get_contents($root . '/routes/api.php'), 0, 400)
            : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- NO CACHE: rimuovi eventuali cache stale incluse nell'artifact ---
$cacheDir = __DIR__ . '/../bootstrap/cache';
@unlink($cacheDir . '/routes-v7.php');
@unlink($cacheDir . '/routes.php');
@unlink($cacheDir . '/config.php');
@unlink($cacheDir . '/events.php');
@unlink($cacheDir . '/packages.php');
@unlink($cacheDir . '/services.php');

// Avvia Laravel dal front controller ufficiale
require __DIR__.'/../public/index.php';