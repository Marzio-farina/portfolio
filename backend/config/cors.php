<?php

return [
    'paths' => ['*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://marziofarina.it',
        'https://www.marziofarina.it',
        'https://api.marziofarina.it',
        'http://localhost:4200'
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];