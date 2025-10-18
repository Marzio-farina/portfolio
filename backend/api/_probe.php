<?php
// sonda: non bootstrappo Laravel, controllo solo i file deployati
chdir(dirname(__DIR__));
header('Content-Type: application/json');

$root = getcwd();
$routesPath = $root . '/routes/api.php';
$bootstrapPath = $root . '/bootstrap/app.php';

echo json_encode([
  'cwd' => $root,
  'exists_routes_api' => file_exists($routesPath),
  'exists_bootstrap_app' => file_exists($bootstrapPath),
  'routes_api_sha1' => file_exists($routesPath) ? sha1_file($routesPath) : null,
  'bootstrap_app_sha1' => file_exists($bootstrapPath) ? sha1_file($bootstrapPath) : null,
  // prime ~400 chars giusto per vedere se dentro c'è 'ping'
  'routes_api_head' => file_exists($routesPath) ? substr(file_get_contents($routesPath), 0, 400) : null,
], JSON_UNESCAPED_UNICODE);