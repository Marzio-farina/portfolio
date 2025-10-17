<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://marziofarina.it',
        'https://www.marziofarina.it',
    ],
    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.vercel\.app$/'
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];