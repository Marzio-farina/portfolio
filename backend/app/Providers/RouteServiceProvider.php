<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        RateLimiter::for('contact', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perHour(20)->by($request->ip()),
            ];
        });

        $apiGroup = Route::middleware('api');
        $apiDomain = env('API_DOMAIN');

        if (!empty($apiDomain)) {
            // Produzione: API solo sul sottodominio, nessun prefisso
            $apiGroup = $apiGroup->domain($apiDomain);
        } else {
            // Locale: nessun dominio -> aggiungo prefisso /api per continuare a usare /api/...
            $apiGroup = $apiGroup->prefix('api');
        }

        $apiGroup->group(base_path('routes/api.php'));

        // ✅ Registra le rotte API
        Route::middleware('web')->group(base_path('routes/web.php'));
    }
}