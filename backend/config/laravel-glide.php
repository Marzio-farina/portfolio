<?php

return [

    /*
     * The driver that will be used to create images. Can be set to gd or imagick.
     */
    'source' => 'src',   // originale su Supabase
    'cache'  => 'glide',   // cache derivati
    'base_url' => 'i',     // /i/...
    'defaults' => [
        'q' => 82,
        'fit' => 'cover',
        'fm' => 'webp',
    ],
    'driver'   => extension_loaded('imagick') ? 'imagick' : 'gd',
];
