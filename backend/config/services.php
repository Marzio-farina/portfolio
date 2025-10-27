<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'supabase' => [
        // URL della Edge Function per il resize (es. https://<project>.functions.supabase.co/resize-avatar)
        'resize_function_url' => env('SUPABASE_RESIZE_FUNCTION_URL'),
        // Chiave per invocare la funzione (puoi usare ANON KEY o una chiave dedicata)
        'function_auth_key' => env('SUPABASE_FUNCTION_AUTH_KEY', env('SUPABASE_ANON_KEY')),
        // Bucket storage usato per gli avatar
        'bucket' => env('SUPABASE_S3_BUCKET', 'src'),
    ],

];
