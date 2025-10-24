<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== VERIFICA DATI AGGIORNATI ===" . PHP_EOL;

$user = App\Models\User::where('email', 'marziofarina@icloud.com')->first();
if ($user) {
    echo "✅ User: " . $user->name . " " . $user->surname . PHP_EOL;
    echo "✅ Phone: " . $user->profile->phone . PHP_EOL;
    echo "✅ Location: " . $user->profile->location . PHP_EOL;
    echo "✅ Bio length: " . strlen($user->profile->bio) . " caratteri" . PHP_EOL;
    echo "✅ Social accounts: " . $user->socialAccounts->count() . PHP_EOL;
} else {
    echo "❌ User not found" . PHP_EOL;
}

echo "=== FINE VERIFICA ===" . PHP_EOL;
