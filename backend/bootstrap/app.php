<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->use([
            HandleCors::class,
        ]);
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ✅ Forza sempre la risposta in JSON
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // ✅ Se qualcosa va storto prima di avere un handler, ritorna JSON grezzo
        $exceptions->render(function (Throwable $e, $request) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'trace' => app()->hasDebugModeEnabled() ? $e->getTrace() : null,
            ], 500);
        });
    })->create();
