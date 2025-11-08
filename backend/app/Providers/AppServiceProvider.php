<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use App\Models\User;
use App\Observers\UserObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Registra Observer per assegnare automaticamente card ai nuovi utenti
        User::observe(UserObserver::class);

        // Rate limiting per API generiche
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Troppe richieste. Riprova tra qualche minuto.'
                    ], 429, $headers);
                });
        });

        // Rate limiting STRICT per login/registrazione (protezione brute-force)
        RateLimiter::for('auth', function (Request $request) {
            return [
                // Max 5 tentativi al minuto per IP
                Limit::perMinute(5)->by($request->ip())
                    ->response(function () {
                        return response()->json([
                            'success' => false,
                            'message' => 'Troppi tentativi di accesso. Riprova tra 1 minuto.'
                        ], 429);
                    }),
                // Max 10 tentativi all'ora per IP
                Limit::perHour(10)->by($request->ip())
                    ->response(function () {
                        return response()->json([
                            'success' => false,
                            'message' => 'Account temporaneamente bloccato. Riprova tra 1 ora.'
                        ], 429);
                    }),
            ];
        });

        // Rate limiting per contact form (protezione spam)
        RateLimiter::for('contact', function (Request $request) {
            return [
                // Max 3 messaggi al minuto per IP
                Limit::perMinute(3)->by($request->ip()),
                // Max 10 messaggi all'ora per IP
                Limit::perHour(10)->by($request->ip())
                    ->response(function () {
                        return response()->json([
                            'success' => false,
                            'message' => 'Hai inviato troppi messaggi. Riprova più tardi.'
                        ], 429);
                    }),
            ];
        });

        // Rate limiting per upload file
        RateLimiter::for('uploads', function (Request $request) {
            return [
                // Max 10 upload al minuto
                Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()),
                // Max 50 upload all'ora
                Limit::perHour(50)->by($request->user()?->id ?: $request->ip())
                    ->response(function () {
                        return response()->json([
                            'success' => false,
                            'message' => 'Limite upload raggiunto. Riprova più tardi.'
                        ], 429);
                    }),
            ];
        });

        // Rate limiting per immagini (già esistente, mantengo compatibilità)
        RateLimiter::for('images', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        // Forza HTTPS in produzione
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
